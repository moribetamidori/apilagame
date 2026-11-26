// The Apila app's plain planet (meadow, beaches, ocean and its ground cover,
// unpainted), exported from the app (scripts/AvatarExportTests.swift.txt,
// testExportPlanet; packed by scripts/pack-planet.py) and drawn with a port
// of PlanetShaders.metal: planetSurface, with planetCoverSway bending the grass.
// The app's own plants and trees (flora.ts) make one garden on it, kept on
// top and tipped toward you as it turns slowly about the garden; drag sideways
// to spin it, up or down to tip it (it settles back). The garden sprouts from
// its middle outward, fills, then withers away, in a loop.

import {
  BufferAttribute, BufferGeometry, Color, DoubleSide, Group, InstancedBufferAttribute, InstancedMesh, Mesh,
  PerspectiveCamera, Quaternion, Scene, ShaderMaterial, SRGBColorSpace, Vector3, WebGLRenderer,
} from "three";
import { placeFlora, plantGeometry, type PlantsMeta } from "./flora";

type Chunk = { mesh: "ground" | "cover" | "props"; vertexOffset: number; vertexCount: number; indexOffset: number; indexCount: number };
type PlanetMeta = { chunks: Chunk[]; sky: [number, number, number]; maximumRadius: number; fieldOfView: number; positionScale: number };

const noise = /* glsl */ `
  float pHash(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  float pNoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    float n000 = pHash(i), n100 = pHash(i + vec3(1, 0, 0));
    float n010 = pHash(i + vec3(0, 1, 0)), n110 = pHash(i + vec3(1, 1, 0));
    float n001 = pHash(i + vec3(0, 0, 1)), n101 = pHash(i + vec3(1, 0, 1));
    float n011 = pHash(i + vec3(0, 1, 1)), n111 = pHash(i + vec3(1, 1, 1));
    return mix(mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
               mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y), u.z);
  }
  float pFbm(vec3 p) {
    return pNoise(p) * 0.55 + pNoise(p * 2.13 + 5.1) * 0.3 + pNoise(p * 4.7 + 1.7) * 0.15;
  }
`;

const toneCurve = /* glsl */ `
  // RealityKit tone-maps the planet's colours on the phone (the avatar's
  // shader undoes it; the planet's doesn't), so the same curve here makes the
  // planet look as it does in the app. Linear in, linear out.
  float tone(float x) {
    float xin[13] = float[13](0.0, 0.02, 0.05, 0.1, 0.2, 0.3, 0.45, 0.6, 0.8, 1.0, 1.3, 1.7, 2.2);
    float xout[13] = float[13](0.0, 0.0085, 0.028, 0.067, 0.145, 0.223, 0.337, 0.44, 0.552, 0.665, 0.79, 0.93, 1.0);
    for (int i = 1; i < 13; i++) {
      if (x <= xin[i]) return mix(xout[i - 1], xout[i], (x - xin[i - 1]) / (xin[i] - xin[i - 1]));
    }
    return 1.0;
  }
`;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSway;
  attribute vec4 aColor;
  attribute vec3 aAttr;   // water, lava, sway
  varying vec3 vColor;
  varying vec3 vModel;
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying vec2 vWaterLava;
  ${noise}

  void main() {
    vec3 p = position;
    // planetCoverSway: gusts roll round the planet and each tip flutters.
    float weight = aAttr.z * uSway;
    if (weight > 0.0) {
      float t = uTime;
      vec3 up = normalize(p);
      vec3 axis = abs(up.y) < 0.95 ? vec3(0.2, 1.0, 0.35) : vec3(1.0, 0.0, 0.0);
      vec3 wind = normalize(cross(normalize(axis), up));
      vec3 side = cross(up, wind);
      float gust = 0.55 + 0.45 * sin(t * 1.3 - dot(p, wind) * 28.0 + pNoise(p * 9.0) * 3.0);
      float flutter = sin(t * 4.1 + pHash(floor(p * 900.0)) * 6.28);
      float bend = weight * weight;
      vec3 offset = (wind * (gust * 0.0042 + flutter * 0.0008) + side * flutter * 0.0007) * bend;
      offset -= up * gust * 0.0012 * bend;
      p += offset;
    }
    vModel = p;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vColor = aColor.rgb;
    vWaterLava = aAttr.xy;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

// The plants, instanced: each grows out of its foot with a little overshoot,
// spreading outward from uSeed, then shrinks back in the same order. They sway
// as in the app (plantSway in PlantShaders.metal), more the higher up.
const plantVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSway;
  uniform float uCycle;
  uniform vec3 uSeed;
  attribute vec3 aColor;
  attribute float aPlantSeed;
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vWorld;

  void main() {
    vec3 foot = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    float spread = clamp(acos(clamp(dot(normalize(foot), uSeed), -1.0, 1.0)) / 1.3, 0.0, 1.0);
    float birth = spread * 0.3 + aPlantSeed * 0.06;
    float death = 0.62 + spread * 0.24 + aPlantSeed * 0.05;
    float k = clamp((uCycle - birth) / 0.06, 0.0, 1.0) - 1.0;
    float grow = 1.0 + 2.70158 * k * k * k + 1.70158 * k * k;  // ease out, back
    grow *= 1.0 - smoothstep(0.0, 0.05, uCycle - death);

    vec3 p = position;
    float t = uTime * uSway, phase = aPlantSeed * 40.0;
    float bend = max(p.y, 0.0) * max(p.y, 0.0);
    p += vec3(sin(t * 1.1 + phase * 0.3) * 0.022 + sin(t * 2.3 + phase) * 0.006, 0.0,
              cos(t * 0.9 + phase * 0.5) * 0.014) * bend;
    p *= grow;

    vec4 world = modelMatrix * instanceMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    vColor = aColor;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

// plantSurface's light: a soft wrap from the lamp and a warm rim.
const plantFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vWorld;
  ${toneCurve}

  void main() {
    vec3 n = normalize(vNormal);
    vec3 view = normalize(cameraPosition - vWorld);
    if (dot(n, view) < 0.0) n = -n;
    vec3 warmWhite = vec3(1.0, 0.976, 0.89);
    float diffuse = max(dot(n, normalize(vec3(-0.45, 0.8, 0.4))), 0.0);
    float rim = pow(1.0 - max(dot(n, view), 0.0), 3.0);
    vec3 lit = vColor * (0.84 + 0.26 * diffuse) + rim * 0.12 * warmWhite;
    vec3 linear = pow(clamp(lit, 0.0, 1.0), vec3(2.2));
    vec3 shown = vec3(tone(linear.r), tone(linear.g), tone(linear.b));
    gl_FragColor = vec4(pow(shown, vec3(1.0 / 2.2)), 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSky;
  varying vec3 vColor;
  varying vec3 vModel;
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying vec2 vWaterLava;
  ${noise}

  ${toneCurve}

  void main() {
    vec3 mp = vModel;
    vec3 n = normalize(vNormal);
    float t = uTime;
    vec3 c = vColor;
    float water = clamp(vWaterLava.x, 0.0, 1.0);
    float lava = clamp(vWaterLava.y, 0.0, 1.0);

    float dab = pFbm(mp * 7.0);
    c *= 0.93 + 0.14 * dab;
    if (water > 0.01) {
      vec3 q = mp * 22.0 + vec3(t * 0.15, t * 0.05, -t * 0.1);
      float ripple = pFbm(q);
      vec3 lit = mix(c, vec3(0.93, 0.99, 1.0), 0.35);
      vec3 w = mix(c, lit, smoothstep(0.55, 0.8, ripple));
      float glint = smoothstep(0.86, 0.95, pNoise(mp * 60.0 + vec3(0, t * 0.6, t * 0.4)));
      w = mix(w, vec3(1.0), glint * 0.7);
      c = mix(c, w, water);
    }
    if (lava > 0.01) {
      float pulse = 0.5 + 0.5 * sin(t * 1.4 + pFbm(mp * 18.0) * 6.0);
      float crust = smoothstep(0.55, 0.75, pFbm(mp * 48.0 + vec3(0.0, t * 0.03, 0.0)));
      vec3 hot = mix(vec3(0.95, 0.32, 0.07), vec3(1.0, 0.78, 0.3), pulse);
      hot = mix(hot, vec3(0.3, 0.13, 0.09), crust * 0.5);
      c = mix(c, hot, lava);
    }

    // finish(): a soft half-lambert sun and a hazy sky-coloured rim.
    vec3 sun = normalize(vec3(-0.45, 0.8, 0.6));
    float diffuse = dot(n, sun) * 0.5 + 0.5;
    c *= mix(0.58, 1.08, diffuse * diffuse) * (1.0 - lava * 0.4) + lava * 0.4;
    vec3 toCamera = normalize(cameraPosition - vWorld);
    float rim = pow(1.0 - abs(dot(n, toCamera)), 2.5);
    c = mix(c, uSky, rim * 0.45);
    vec3 linear = pow(clamp(c, 0.0, 1.0), vec3(2.2));
    vec3 shown = vec3(tone(linear.r), tone(linear.g), tone(linear.b));
    gl_FragColor = vec4(pow(shown, vec3(1.0 / 2.2)), 1.0);
  }
`;

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return bytes.buffer;
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
}

function geometry(buffer: ArrayBuffer, chunk: Chunk, scale: number): BufferGeometry {
  const n = chunk.vertexCount, stride = 20;
  const view = new DataView(buffer, chunk.vertexOffset, n * stride);
  const position = new Float32Array(n * 3), normal = new Float32Array(n * 3);
  const color = new Float32Array(n * 4), attr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const o = i * stride;
    for (let k = 0; k < 3; k++) {
      position[3 * i + k] = view.getInt16(o + 2 * k, true) * scale;
      normal[3 * i + k] = view.getInt8(o + 8 + k) / 127;
      attr[3 * i + k] = view.getUint8(o + 16 + k) / 255;
    }
    for (let k = 0; k < 4; k++) color[4 * i + k] = view.getUint8(o + 12 + k) / 255;
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(position, 3));
  g.setAttribute("normal", new BufferAttribute(normal, 3));
  g.setAttribute("aColor", new BufferAttribute(color, 4));
  g.setAttribute("aAttr", new BufferAttribute(attr, 3));
  g.setIndex(new BufferAttribute(new Uint16Array(buffer, chunk.indexOffset, chunk.indexCount), 1));
  g.computeBoundingSphere();
  return g;
}

export type PlanetViewer = { dispose: () => void };

export async function createPlanetViewer({ canvas, onReady }: { canvas: HTMLCanvasElement; onReady?: () => void }): Promise<PlanetViewer> {
  const [meta, buffer, plantsMeta, plantsBuffer] = await Promise.all([
    fetch("/models/planet.json").then((r) => r.json() as Promise<PlanetMeta>),
    fetchBytes("/models/planet.bin"),
    fetch("/models/plants.json").then((r) => r.json() as Promise<PlantsMeta>),
    fetchBytes("/models/plants.bin"),
  ]);
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(meta.fieldOfView, 1, 0.05, 20);
  camera.position.set(0, 0, 3.4);
  camera.lookAt(0, 0, 0);

  const uniforms = { uTime: { value: 0 }, uSky: { value: new Color().setRGB(...meta.sky) }, uSway: { value: 1 } };
  const material = new ShaderMaterial({ vertexShader, fragmentShader, uniforms, side: DoubleSide });
  const planet = new Group();
  scene.add(planet);
  let ground: BufferGeometry | undefined;
  for (const chunk of meta.chunks) {
    const g = geometry(buffer, chunk, meta.positionScale);
    if (chunk.mesh === "ground") ground = g;
    planet.add(new Mesh(g, material));
  }
  const flora = { uCycle: { value: 0 }, uSeed: { value: new Vector3(0, 0, 1) } };
  const floraMaterial = new ShaderMaterial({
    vertexShader: plantVertexShader, fragmentShader: plantFragmentShader, uniforms: { ...uniforms, ...flora }, side: DoubleSide,
  });
  const garden = ground ? placeFlora(ground, plantsMeta) : undefined;
  for (const model of plantsMeta.models) {
    const at = garden?.spots.get(model.name);
    if (!at) continue;
    const g = plantGeometry(plantsBuffer, model, plantsMeta.positionScale);
    g.setAttribute("aPlantSeed", new InstancedBufferAttribute(new Float32Array(at.seeds), 1));
    const mesh = new InstancedMesh(g, floraMaterial, at.matrices.length);
    at.matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.frustumCulled = false;
    planet.add(mesh);
  }
  const center = garden?.center ?? new Vector3(0, 1, 0);
  flora.uSeed.value.copy(center);

  // The garden is kept on top, tipped toward the viewer by TILT, and the
  // planet turns about it: orientation = tip (dragged, settling back) · tilt · yaw · align.
  const TILT = 0.5;
  const align = new Quaternion().setFromUnitVectors(center, new Vector3(0, 1, 0));
  const xAxis = new Vector3(1, 0, 0), yAxis = new Vector3(0, 1, 0);
  let yaw = 0, yawSpeed = 0, tip = 0;
  const orientation = new Quaternion();
  const orient = () => orientation.setFromAxisAngle(xAxis, TILT + tip)
    .multiply(new Quaternion().setFromAxisAngle(yAxis, yaw)).multiply(align);

  // Frame the planet and the garden standing on it: the smallest ball round
  // both, its middle moved up toward the garden by `lift`.
  const R = meta.maximumRadius, top = R + (garden?.tallest ?? 0), spreadAngle = 1.0;
  let lift = 0, reach = top;
  for (let s = 0; s <= top - R; s += 0.005) {
    const need = Math.max(R + s, top - s, Math.sqrt(top * top + s * s - 2 * s * top * Math.cos(spreadAngle)));
    if (need < reach) { reach = need; lift = s; }
  }
  const aim = new Vector3(0, Math.cos(TILT), Math.sin(TILT)).multiplyScalar(lift);

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const drift = reduceMotion ? 0 : 0.12;
  if (reduceMotion) uniforms.uSway.value = 0;
  const CYCLE = 30;

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the whole ball in view in a narrow box too.
    camera.fov = w >= h ? meta.fieldOfView : (2 * Math.atan(Math.tan((meta.fieldOfView * Math.PI) / 360) * (h / w)) * 180) / Math.PI;
    camera.updateProjectionMatrix();
    // The narrower of the two view angles is meta.fieldOfView: back off till a ball of `reach` fits in it, with a little air.
    camera.position.copy(aim).add(new Vector3(0, 0, (reach * 1.03) / Math.sin((meta.fieldOfView * Math.PI) / 360)));
    camera.lookAt(aim);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  // Drag sideways to spin it about the garden, with momentum; up or down to tip it, settling back after.
  let dragging = false, last = { x: 0, y: 0 }, pointerId: number | null = null;
  const onDown = (e: PointerEvent) => {
    dragging = true;
    pointerId = e.pointerId;
    last = { x: e.clientX, y: e.clientY };
    yawSpeed = 0;
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging || e.pointerId !== pointerId) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    last = { x: e.clientX, y: e.clientY };
    yaw += dx * 0.008;
    tip = Math.max(-0.6, Math.min(0.6, tip + dy * 0.008));
    yawSpeed = Math.max(-7, Math.min(7, dx * 0.008 * 60));
  };
  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    dragging = false;
    pointerId = null;
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);

  let visible = true, frame = 0, lastTime = performance.now(), ready = false, time = 0;
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !frame) {
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    }
  });
  intersection.observe(canvas);

  function tick(now: number) {
    frame = 0;
    if (!visible || document.hidden) return;
    const seconds = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    if (!reduceMotion) time += seconds;
    uniforms.uTime.value = time;
    if (reduceMotion) flora.uCycle.value = 0.55;
    else flora.uCycle.value = (time / CYCLE) % 1;
    if (!dragging) {
      yaw += (yawSpeed + drift) * seconds;
      yawSpeed *= Math.pow(0.05, seconds);
      tip *= Math.pow(0.12, seconds);
    }
    planet.quaternion.copy(orient());
    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      onReady?.();
    }
    frame = requestAnimationFrame(tick);
  }
  const onVisibility = () => {
    if (!document.hidden && visible && !frame) {
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };
  document.addEventListener("visibilitychange", onVisibility);
  frame = requestAnimationFrame(tick);

  return {
    dispose() {
      cancelAnimationFrame(frame);
      intersection.disconnect();
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      document.removeEventListener("visibilitychange", onVisibility);
      planet.traverse((o) => (o as Mesh).geometry?.dispose());
      material.dispose();
      floraMaterial.dispose();
      renderer.dispose();
    },
  };
}

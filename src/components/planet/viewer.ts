// The Apila app's plain planet (meadow, beaches, ocean and its ground cover,
// unpainted), exported from the app (scripts/AvatarExportTests.swift.txt,
// testExportPlanet; packed by scripts/pack-planet.py) and drawn with a port
// of PlanetShaders.metal: planetSurface, with planetCoverSway bending the grass.
// It turns slowly by itself; drag to spin it any way.

import {
  BufferAttribute, BufferGeometry, Color, DoubleSide, Group, Mesh, PerspectiveCamera, Quaternion, Scene,
  ShaderMaterial, SRGBColorSpace, Vector3, WebGLRenderer,
} from "three";

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

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSky;
  varying vec3 vColor;
  varying vec3 vModel;
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying vec2 vWaterLava;
  ${noise}

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
  const [meta, buffer] = await Promise.all([
    fetch("/models/planet.json").then((r) => r.json() as Promise<PlanetMeta>),
    fetchBytes("/models/planet.bin"),
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
  for (const chunk of meta.chunks) planet.add(new Mesh(geometry(buffer, chunk, meta.positionScale), material));

  // Turned so the shores show, tipped a little toward the viewer, as in the app.
  const orientation = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.5);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const drift = reduceMotion ? 0 : 0.12;
  if (reduceMotion) uniforms.uSway.value = 0;

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the whole ball in view in a narrow box too.
    camera.fov = w >= h ? meta.fieldOfView : (2 * Math.atan(Math.tan((meta.fieldOfView * Math.PI) / 360) * (h / w)) * 180) / Math.PI;
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  // Drag to spin it like a globe (any direction), with momentum.
  const spin = new Vector3();
  let dragging = false, last = { x: 0, y: 0 }, pointerId: number | null = null;
  const turnBy = (dx: number, dy: number) => {
    const angle = Math.hypot(dx, dy) * 0.008;
    if (angle < 1e-6) return;
    const axis = new Vector3(dy, dx, 0).normalize();
    orientation.premultiply(new Quaternion().setFromAxisAngle(axis, angle));
  };
  const onDown = (e: PointerEvent) => {
    dragging = true;
    pointerId = e.pointerId;
    last = { x: e.clientX, y: e.clientY };
    spin.set(0, 0, 0);
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging || e.pointerId !== pointerId) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    last = { x: e.clientX, y: e.clientY };
    turnBy(dx, dy);
    spin.set(dx, dy, 0).multiplyScalar(60).clampLength(0, 900);
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
    if (!dragging) {
      turnBy(spin.x * seconds, spin.y * seconds);
      spin.multiplyScalar(Math.pow(0.05, seconds));
      // The slow turn of its own, about the planet's tipped axis.
      orientation.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), drift * seconds));
    }
    planet.quaternion.copy(orientation);
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
      renderer.dispose();
    },
  };
}

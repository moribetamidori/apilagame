// Draws the Apila app's 3D avatar in the browser with three.js: her real mesh,
// exported from the app (scripts/AvatarExportTests.swift.txt, packed by
// scripts/pack-avatar.py), skinned to the same skeleton on the GPU and shaded
// with a port of AvatarShaders.metal. Motion comes from ./animator.

import {
  BufferAttribute, BufferGeometry, DoubleSide, Group, Matrix3, Matrix4, Mesh, PerspectiveCamera, Scene, ShaderMaterial,
  SRGBColorSpace, Vector3, WebGLRenderer, type Material,
} from "three";
import { Animator, SkeletonInfo, type Skeleton } from "./animator";

type PartMeta = {
  key: string; role: "skin" | "eyesOpen" | "eyesClosed" | "irisLeft" | "irisRight"; glassStart: number;
  vertexOffset: number; vertexCount: number; indexOffset: number; indexCount: number;
};
type ModelMeta = { name: string; armSpread: number; parts: PartMeta[] };

const vertexShader = /* glsl */ `
  #define JOINTS __JOINTS__
  uniform mat3 uBoneR[JOINTS];
  uniform vec3 uBoneO[JOINTS];
  uniform vec3 uShift;
  attribute vec4 aColor;
  attribute vec4 aAttr;    // kind, skin, joint a, joint b
  attribute float aWeight;
  attribute vec2 aUv1;
  varying vec3 vColor;
  varying float vKind;
  varying float vSkin;
  varying float vAlpha;
  varying vec2 vUv1;
  varying vec3 vNormal;
  varying vec3 vWorld;

  void main() {
    int a = int(aAttr.z + 0.5), b = int(aAttr.w + 0.5);
    vec3 p = position + uShift;
    vec3 pa = uBoneR[a] * p + uBoneO[a], pb = uBoneR[b] * p + uBoneO[b];
    vec3 na = uBoneR[a] * normal, nb = uBoneR[b] * normal;
    vec3 skinned = mix(pa, pb, aWeight);
    vec3 n = normalize(mix(na, nb, aWeight));
    vec4 world = modelMatrix * vec4(skinned, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * n);
    vColor = aColor.rgb;
    vAlpha = aColor.a;
    vKind = aAttr.x;
    vSkin = aAttr.y;
    vUv1 = aUv1;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vKind;
  varying float vSkin;
  varying float vAlpha;
  varying vec2 vUv1;
  varying vec3 vNormal;
  varying vec3 vWorld;
  uniform float uGlass;

  const vec3 kLight = vec3(-0.45, 0.8, 0.4);

  vec3 gold(vec3 c, vec3 n, vec3 view) {
    vec3 r = reflect(-view, n);
    float sky = smoothstep(-0.35, 0.75, r.y);
    vec3 env = mix(c * 0.42, c * 1.3, sky);
    float glint = pow(max(dot(r, normalize(kLight)), 0.0), 40.0)
      + 0.6 * pow(max(dot(r, normalize(vec3(0.6, 0.25, 0.75))), 0.0), 120.0);
    float edge = pow(1.0 - max(dot(n, view), 0.0), 2.0);
    return env + c * 0.25 * edge + vec3(1.0, 0.97, 0.86) * glint;
  }

  vec3 malachite(vec2 p, vec3 n, vec3 view) {
    float wobble = 0.09 * sin(p.x * 6.0 + p.y * 2.5) + 0.05 * sin(p.y * 11.0 - p.x * 4.0);
    float d = length(p - vec2(0.45, -0.55)) + wobble;
    float band = fract(d * 4.5);
    vec3 deep = vec3(0.04, 0.3, 0.19), mid = vec3(0.1, 0.5, 0.3), pale = vec3(0.42, 0.76, 0.54);
    vec3 c = band < 0.45 ? mix(deep, mid, band / 0.45)
      : band < 0.75 ? mix(mid, pale, (band - 0.45) / 0.3) : mix(pale, deep, (band - 0.75) / 0.25);
    vec3 r = reflect(-view, n);
    return c + vec3(1.0) * pow(max(dot(r, normalize(kLight)), 0.0), 30.0) * 0.45;
  }

  vec3 morpho(vec3 paint, float outward, vec3 n, vec3 view) {
    vec3 r = reflect(-view, n);
    float shimmer = 0.5 + 0.5 * sin(dot(r, vec3(3.0, 5.0, 2.0)) * 2.2 + outward * 2.0);
    vec3 deep = vec3(0.12, 0.5, 0.98), electric = vec3(0.42, 0.88, 1.0);
    if (distance(paint, vec3(0.949, 0.757, 0.306)) < 0.02) {
      deep = vec3(1.0, 0.56, 0.12);
      electric = vec3(1.0, 0.9, 0.32);
    } else if (distance(paint, vec3(0.227, 0.549, 0.941)) > 0.02) {
      deep = clamp(paint * paint * 1.1, 0.0, 1.0);
      electric = mix(paint, vec3(1.0), 0.45);
    }
    vec3 c = mix(deep, electric, clamp(shimmer * 0.7 + (1.0 - outward) * 0.25, 0.0, 1.0));
    return c + vec3(0.85, 0.95, 1.0) * pow(max(dot(r, normalize(kLight)), 0.0), 24.0) * 0.5;
  }

  vec3 holographic(vec3 paint, float outward, vec3 n, vec3 view) {
    vec3 r = reflect(-view, n);
    float shimmer = sin(dot(r, vec3(3.0, 5.0, 2.0)) * 2.2 + outward * 2.0);
    float angle = shimmer * 0.7;
    vec3 k = vec3(0.57735);
    vec3 c = paint * cos(angle) + cross(k, paint) * sin(angle) + k * dot(k, paint) * (1.0 - cos(angle));
    c = mix(c, vec3(1.0), 0.12 + 0.12 * shimmer);
    return clamp(c, 0.0, 1.0) + vec3(1.0) * pow(max(dot(r, normalize(kLight)), 0.0), 24.0) * 0.45;
  }

  vec3 iridescentGold(vec3 paint, float outward, vec3 n, vec3 view) {
    vec3 r = reflect(-view, n);
    float facing = max(dot(n, view), 0.0);
    float sky = smoothstep(-0.3, 0.8, r.y);
    vec3 base = mix(paint * 0.82, paint * 1.12, sky);
    float phase = facing * 5.0 + dot(r, vec3(3.0, 5.0, 2.0)) * 1.6 + outward * 2.5;
    vec3 film = 0.5 + 0.5 * cos(phase + vec3(0.0, 2.1, 4.2));
    float edge = pow(1.0 - facing, 1.5);
    vec3 c = mix(base, base * mix(vec3(1.0), film * 1.35, 0.45), 0.35 + 0.4 * edge);
    c += film * edge * 0.18;
    return clamp(c, 0.0, 1.0) + vec3(1.0, 0.96, 0.86) * pow(max(dot(r, normalize(kLight)), 0.0), 30.0) * 0.55;
  }

  vec3 velvet(vec3 paint, vec2 p, vec3 n, vec3 view, float diffuse) {
    float facing = max(dot(n, view), 0.0);
    vec3 r = reflect(-view, n);
    vec3 sheenColor = clamp(mix(paint * 1.9, vec3(0.95, 0.92, 1.0), 0.3), 0.0, 1.0);
    float lit = smoothstep(-0.2, 0.8, diffuse);
    vec3 body = paint * mix(0.66, 1.04, lit);
    float crush = 0.78 + 0.22 * sin(p.x * 6.0 + 1.3 * sin(p.y * 5.0)) * sin(p.y * 4.5 - p.x * 3.0 + 1.0);
    float sheen = pow(1.0 - facing, 2.2) * crush;
    vec3 c = mix(body, sheenColor, clamp(sheen * (0.5 + 0.4 * lit), 0.0, 0.8));
    return c + sheenColor * pow(max(dot(r, normalize(kLight)), 0.0), 5.0) * 0.1 * crush;
  }

  void main() {
    vec3 c = vColor;
    vec3 n = normalize(vNormal);
    vec3 view = normalize(cameraPosition - vWorld);
    if (dot(n, view) < 0.0) n = -n;
    float diffuse = max(dot(n, normalize(kLight)), 0.0);
    vec3 shadow = vSkin > 0.5 ? vec3(0.9, 0.86, 0.92) : vec3(0.88);
    vec3 shade = mix(shadow, vec3(1.0), smoothstep(0.0, 0.75, diffuse));
    float rim = pow(1.0 - max(dot(n, view), 0.0), 3.0);
    vec3 lit = c * shade + rim * 0.05;
    float opacity = 1.0;
    float kind = vKind;
    if (kind > 8.5) {
      lit = velvet(c, vUv1, n, view, diffuse);
    } else if (kind > 7.5) {
      lit = iridescentGold(c, vUv1.x, n, view);
    } else if (kind > 6.5) {
      lit = holographic(c, vUv1.x, n, view);
    } else if (kind > 5.5) {
      vec3 r = reflect(-view, n);
      vec3 deep = mix(vec3(0.74), vec3(1.04), smoothstep(-0.2, 0.85, diffuse));
      float sheen = pow(max(dot(r, normalize(kLight)), 0.0), 8.0);
      float glint = pow(max(dot(r, normalize(kLight)), 0.0), 70.0)
        + 0.5 * pow(max(dot(r, normalize(vec3(0.6, 0.25, 0.75))), 0.0), 140.0);
      float edge = pow(1.0 - max(dot(n, view), 0.0), 2.5);
      lit = c * deep + vec3(1.0) * (sheen * 0.12 + glint * 0.85 + edge * 0.12);
    } else if (kind > 4.5) {
      float facet = dot(n, normalize(kLight));
      lit = c * (0.8 + 0.26 * smoothstep(-0.4, 0.9, facet)) + rim * 0.03;
    } else if (kind > 3.5) {
      vec3 r = reflect(-view, n);
      float edge = pow(1.0 - max(dot(n, view), 0.0), 2.0);
      float glint = pow(max(dot(r, normalize(kLight)), 0.0), 60.0)
        + 0.5 * pow(max(dot(r, normalize(vec3(0.5, 0.4, 0.75))), 0.0), 200.0);
      lit = vec3(0.95, 0.98, 1.0);
      opacity = clamp(0.08 + 0.45 * edge + glint, 0.0, 1.0);
    } else if (kind > 2.5) {
      lit = morpho(c, vUv1.x, n, view);
    } else if (kind > 1.5) {
      lit = malachite(vUv1, n, view);
    } else if (kind > 0.5) {
      lit = gold(c, n, view);
    }
    // Vertex colours and the shading above are sRGB, as drawn in the app.
    gl_FragColor = vec4(clamp(lit, 0.0, 1.0), uGlass > 0.5 ? opacity : 1.0);
  }
`;

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  // Gzipped on disk; a server may already have undone that with Content-Encoding.
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return bytes.buffer;
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
}

/** Splits one part's interleaved vertices (see pack-avatar.py) into attributes. */
function geometry(buffer: ArrayBuffer, part: PartMeta): BufferGeometry {
  const n = part.vertexCount, stride = 32;
  const view = new DataView(buffer, part.vertexOffset, n * stride);
  const position = new Float32Array(n * 3), normal = new Float32Array(n * 3), weight = new Float32Array(n);
  const color = new Float32Array(n * 4), attr = new Float32Array(n * 4), uv1 = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const o = i * stride;
    for (let k = 0; k < 3; k++) {
      position[3 * i + k] = view.getFloat32(o + 4 * k, true);
      normal[3 * i + k] = view.getInt8(o + 12 + k) / 127;
    }
    weight[i] = view.getUint8(o + 15) / 255;
    for (let k = 0; k < 4; k++) {
      color[4 * i + k] = view.getUint8(o + 16 + k) / 255;
      attr[4 * i + k] = view.getUint8(o + 20 + k);
    }
    uv1[2 * i] = view.getFloat32(o + 24, true);
    uv1[2 * i + 1] = view.getFloat32(o + 28, true);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(position, 3));
  g.setAttribute("normal", new BufferAttribute(normal, 3));
  g.setAttribute("aWeight", new BufferAttribute(weight, 1));
  g.setAttribute("aColor", new BufferAttribute(color, 4));
  g.setAttribute("aAttr", new BufferAttribute(attr, 4));
  g.setAttribute("aUv1", new BufferAttribute(uv1, 2));
  g.setIndex(new BufferAttribute(new Uint16Array(buffer, part.indexOffset, part.indexCount), 1));
  if (part.glassStart >= 0 && part.glassStart < part.indexCount) {
    g.addGroup(0, part.glassStart, 0);
    g.addGroup(part.glassStart, part.indexCount - part.glassStart, 1);
  }
  // Skinned in the shader, so the rest-pose bounds would cull her wrongly.
  g.boundingSphere = null;
  return g;
}

export type ViewerOptions = {
  canvas: HTMLCanvasElement;
  model: string;
  /** Her turn when left alone, radians (positive turns her to her left). */
  restingYaw?: number;
  onReady?: () => void;
};

export type Viewer = { dispose: () => void };

export async function createViewer({ canvas, model, restingYaw = -0.3, onReady }: ViewerOptions): Promise<Viewer> {
  const [skeletonRaw, meta, buffer] = await Promise.all([
    fetch("/models/skeleton.json").then((r) => r.json() as Promise<Skeleton>),
    fetch(`/models/${model}.json`).then((r) => r.json() as Promise<ModelMeta>),
    fetchBytes(`/models/${model}.bin`),
  ]);
  const skeleton = new SkeletonInfo(skeletonRaw);
  const jointCount = skeleton.names.length;

  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.05, 20);
  const target = new Vector3(0, 0.6, 0);
  camera.position.set(0, 0.65, 2.6);
  camera.lookAt(target);

  const boneR = Array.from({ length: jointCount }, () => new Matrix3());
  const boneO = Array.from({ length: jointCount }, () => new Vector3());
  const makeMaterial = (glass: boolean, shift: Vector3) =>
    new ShaderMaterial({
      vertexShader: vertexShader.replace("__JOINTS__", String(jointCount)),
      fragmentShader,
      uniforms: { uBoneR: { value: boneR }, uBoneO: { value: boneO }, uShift: { value: shift }, uGlass: { value: glass ? 1 : 0 } },
      side: DoubleSide,
      transparent: glass,
      depthWrite: !glass,
    });

  const figure = new Group();
  figure.rotation.y = restingYaw;
  scene.add(figure);
  const eyesOpen: Mesh[] = [], eyesClosed: Mesh[] = [], irises: { mesh: Mesh; side: 0 | 1; shift: Vector3 }[] = [];
  const materials: Material[] = [];
  for (const part of meta.parts) {
    const shift = new Vector3();
    const opaque = makeMaterial(false, shift);
    materials.push(opaque);
    let material: Material | Material[] = opaque;
    if (part.glassStart >= 0 && part.glassStart < part.indexCount) {
      const glass = makeMaterial(true, shift);
      materials.push(glass);
      material = [opaque, glass];
    }
    const mesh = new Mesh(geometry(buffer, part), material);
    mesh.frustumCulled = false;
    // Glass draws after everything it sits over.
    if (Array.isArray(material)) mesh.renderOrder = 1;
    figure.add(mesh);
    if (part.role === "eyesOpen") eyesOpen.push(mesh);
    if (part.role === "eyesClosed") eyesClosed.push(mesh);
    if (part.role === "irisLeft" || part.role === "irisRight") irises.push({ mesh, side: part.role === "irisLeft" ? 0 : 1, shift });
  }

  const animator = new Animator(skeleton);
  animator.armSpread = meta.armSpread;
  const headIndex = skeleton.j.head;

  // ---- Pose → bone uniforms --------------------------------------------------
  // Each joint maps rest-pose points to rotation · p + offset (AvatarBone).
  const scratch = new Matrix4();
  function applyPose(seconds: number) {
    const joints = animator.advance(seconds).worldTransforms();
    for (let i = 0; i < jointCount; i++) {
      const m = boneR[i].setFromMatrix4(scratch.makeRotationFromQuaternion(joints[i].orientation));
      boneO[i].copy(joints[i].position).sub(skeleton.restPosition[i].clone().applyMatrix3(m));
    }
    const closed = animator.eyesClosed;
    eyesOpen.forEach((m) => (m.visible = !closed));
    eyesClosed.forEach((m) => (m.visible = closed));
    for (const iris of irises) {
      iris.mesh.visible = !closed;
      iris.shift.copy(skeleton.irisShift(iris.side, animator.eyeLook[0], animator.eyeLook[1]));
    }
  }

  // ---- Sizing ----------------------------------------------------------------
  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  // ---- Interaction -----------------------------------------------------------
  // Drag sideways to turn her (with a little momentum); she turns back to face
  // you a few seconds after you let go. A tap makes her nod. Her eyes and head
  // follow a mouse pointer anywhere on the page.
  let yaw = restingYaw, spin = 0, dragging = false, lastX = 0, downX = 0, downY = 0, idleFor = 0;
  let pointerId: number | null = null;
  const onDown = (e: PointerEvent) => {
    dragging = true;
    pointerId = e.pointerId;
    lastX = downX = e.clientX;
    downY = e.clientY;
    spin = 0;
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging || e.pointerId !== pointerId) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    yaw += dx * 0.012;
    // Momentum from the last move, capped so a flick spins her once, not ten times.
    spin = Math.max(-8, Math.min(8, dx * 0.012 * 60));
    idleFor = 0;
  };
  const onUp = (e: PointerEvent) => {
    if (!dragging || e.pointerId !== pointerId) return;
    dragging = false;
    pointerId = null;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) < 6) animator.react();
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);

  let pointer: { x: number; y: number } | null = null;
  const onWindowPointer = (e: PointerEvent) => {
    if (e.pointerType === "mouse") pointer = { x: e.clientX, y: e.clientY };
  };
  const onLeave = () => (pointer = null);
  window.addEventListener("pointermove", onWindowPointer, { passive: true });
  document.documentElement.addEventListener("mouseleave", onLeave);

  /** Where the pointer is relative to her face, as a look target. */
  function updateLook() {
    const facing = Math.abs(Math.atan2(Math.sin(yaw), Math.cos(yaw)));
    if (!pointer || facing > 0.9 || dragging) {
      animator.lookTarget = null;
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const head = skeleton.restPosition[headIndex].clone().add(new Vector3(0, 0.12, 0.1)).applyMatrix4(figure.matrixWorld).project(camera);
    const hx = rect.left + ((head.x + 1) / 2) * rect.width, hy = rect.top + ((1 - head.y) / 2) * rect.height;
    const dx = pointer.x - hx, dy = pointer.y - hy;
    // Her own left is the viewer's right when she faces out; undo her turn a little.
    const x = Math.max(-1, Math.min(1, dx / 520)) - yaw * 0.6;
    const y = Math.max(-1, Math.min(1, -dy / 420));
    animator.lookTarget = [Math.max(-1, Math.min(1, x)), y];
  }

  // ---- Loop ------------------------------------------------------------------
  let visible = true, frame = 0, last = performance.now(), ready = false;
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !frame) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  });
  intersection.observe(canvas);

  function tick(now: number) {
    frame = 0;
    if (!visible || document.hidden) return;
    const seconds = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!dragging) {
      yaw += spin * seconds;
      spin *= Math.pow(0.02, seconds);
      if (Math.abs(spin) < 0.3) {
        idleFor += seconds;
        // Back round to face the viewer by the shortest way.
        if (idleFor > 1.5) {
          const off = Math.atan2(Math.sin(yaw - restingYaw), Math.cos(yaw - restingYaw));
          yaw = restingYaw + off * Math.pow(0.08, seconds);
        }
      }
    }
    figure.rotation.y = yaw;
    figure.updateMatrixWorld();
    updateLook();
    // Fixed steps keep the springs steady whatever the frame rate.
    let left = seconds;
    while (left > 1e-4) {
      const step = Math.min(1 / 60, left);
      applyPose(step);
      left -= step;
    }
    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      onReady?.();
    }
    frame = requestAnimationFrame(tick);
  }
  const onVisibility = () => {
    if (!document.hidden && visible && !frame) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };
  document.addEventListener("visibilitychange", onVisibility);
  applyPose(1 / 60);
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
      window.removeEventListener("pointermove", onWindowPointer);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      figure.traverse((o) => (o as Mesh).geometry?.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
    },
  };
}

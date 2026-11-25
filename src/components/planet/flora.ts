// Little low-poly plants scattered over the plain planet's land: round trees,
// pines, blossom trees, bushes, flowers and mushrooms on the meadow, cacti on
// the beaches. All of it is one merged mesh; each vertex carries its plant's
// anchor so the vertex shader (viewer.ts, floraVertexShader) can grow every
// plant out of the ground and shrink it back again, in a spreading loop.

import {
  BufferAttribute, BufferGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, Quaternion,
  SphereGeometry, Vector3,
} from "three";

type RGB = [number, number, number];
type Part = { geometry: BufferGeometry; color: RGB; at: Matrix4; delay: number };
type Kind = { weight: number; spacing: number; ground: "meadow" | "sand"; build: (r: () => number) => Part[] };

// sRGB, like the planet's own vertex colours.
const leaf: RGB[] = [[0.42, 0.66, 0.3], [0.33, 0.57, 0.3], [0.55, 0.73, 0.33], [0.3, 0.52, 0.36]];
const blossom: RGB[] = [[0.98, 0.72, 0.8], [0.99, 0.82, 0.86], [0.96, 0.62, 0.38], [0.98, 0.84, 0.42]];
const petal: RGB[] = [[0.98, 0.56, 0.68], [0.99, 0.86, 0.36], [0.98, 0.97, 0.93], [0.74, 0.62, 0.95], [0.95, 0.38, 0.34]];
const bark: RGB = [0.5, 0.36, 0.25];
const stem: RGB = [0.4, 0.62, 0.3];

const pick = <T,>(r: () => number, list: T[]) => list[Math.floor(r() * list.length)];
const jitter = (r: () => number, c: RGB, amount = 0.06): RGB => {
  const k = 1 + (r() - 0.5) * 2 * amount;
  return [c[0] * k, c[1] * k, c[2] * k];
};
const place = (x: number, y: number, z: number, s: number | [number, number, number] = 1, yaw = 0) => {
  const scale = typeof s === "number" ? new Vector3(s, s, s) : new Vector3(...s);
  return new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw), scale);
};

// Unit shapes, reused (cloned) for every part.
const ball = new IcosahedronGeometry(1, 1);
const pebble = new IcosahedronGeometry(1, 0);
const trunk = new CylinderGeometry(0.75, 1, 1, 6, 1, true).translate(0, 0.5, 0);
const cone = new ConeGeometry(1, 1, 7).translate(0, 0.5, 0);
const dome = new SphereGeometry(1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);

const kinds: Kind[] = [
  { // round tree: a trunk and a few leafy balls
    weight: 5, spacing: 0.055, ground: "meadow",
    build(r) {
      const h = 0.04 + r() * 0.03, c = pick(r, leaf);
      const parts: Part[] = [{ geometry: trunk, color: bark, at: place(0, 0, 0, [0.006, h, 0.006]), delay: 0 }];
      const crown = 0.026 + r() * 0.012;
      parts.push({ geometry: ball, color: jitter(r, c), at: place(0, h + crown * 0.6, 0, crown), delay: 0.25 });
      for (let i = 0, n = 1 + Math.floor(r() * 3); i < n; i++) {
        const a = r() * Math.PI * 2, s = crown * (0.55 + r() * 0.25);
        parts.push({ geometry: ball, color: jitter(r, c), at: place(Math.cos(a) * crown * 0.7, h + crown * (0.2 + r() * 0.6), Math.sin(a) * crown * 0.7, s), delay: 0.35 });
      }
      return parts;
    },
  },
  { // blossom tree: pink, peach or golden crown
    weight: 1.6, spacing: 0.05, ground: "meadow",
    build(r) {
      const h = 0.035 + r() * 0.025, c = pick(r, blossom), crown = 0.024 + r() * 0.01;
      return [
        { geometry: trunk, color: bark, at: place(0, 0, 0, [0.005, h, 0.005]), delay: 0 },
        { geometry: ball, color: jitter(r, c), at: place(0, h + crown * 0.5, 0, crown), delay: 0.3 },
        { geometry: ball, color: jitter(r, c), at: place(crown * 0.6, h + crown * 0.2, 0, crown * 0.6), delay: 0.4 },
      ];
    },
  },
  { // pine: stacked cones
    weight: 2.5, spacing: 0.04, ground: "meadow",
    build(r) {
      const h = 0.015, c = jitter(r, [0.24, 0.46, 0.33], 0.1), w = 0.022 + r() * 0.008, tiers = 2 + Math.floor(r() * 2);
      const parts: Part[] = [{ geometry: trunk, color: bark, at: place(0, 0, 0, [0.004, h, 0.004]), delay: 0 }];
      for (let i = 0; i < tiers; i++) {
        const s = 1 - i * 0.28;
        parts.push({ geometry: cone, color: jitter(r, c, 0.04), at: place(0, h + i * w * 0.85, 0, [w * s, w * 1.5 * s, w * s], r() * 6), delay: 0.2 + i * 0.12 });
      }
      return parts;
    },
  },
  { // bush: a few low blobs
    weight: 3, spacing: 0.03, ground: "meadow",
    build(r) {
      const c = pick(r, leaf), s = 0.012 + r() * 0.008, parts: Part[] = [];
      for (let i = 0, n = 2 + Math.floor(r() * 3); i < n; i++) {
        const a = r() * Math.PI * 2, d = s * 0.8 * r();
        parts.push({ geometry: ball, color: jitter(r, c, 0.1), at: place(Math.cos(a) * d, s * 0.5, Math.sin(a) * d, s * (0.7 + r() * 0.4)), delay: i * 0.08 });
      }
      if (r() < 0.45) { // berries or little blooms
        const b = pick(r, petal);
        for (let i = 0; i < 3; i++) {
          const a = r() * Math.PI * 2;
          parts.push({ geometry: pebble, color: b, at: place(Math.cos(a) * s * 0.9, s * (0.6 + r() * 0.6), Math.sin(a) * s * 0.9, s * 0.22), delay: 0.5 });
        }
      }
      return parts;
    },
  },
  { // flower: a stem, a ring of petals and a golden middle
    weight: 9, spacing: 0.022, ground: "meadow",
    build(r) {
      const h = 0.016 + r() * 0.016, c = pick(r, petal), s = 0.008 + r() * 0.003;
      const parts: Part[] = [
        { geometry: trunk, color: stem, at: place(0, 0, 0, [0.0018, h, 0.0018]), delay: 0 },
        { geometry: pebble, color: [0.98, 0.78, 0.3], at: place(0, h, 0, s * 0.55), delay: 0.45 },
      ];
      const n = 5 + Math.floor(r() * 2), turn = r();
      for (let i = 0; i < n; i++) {
        const a = ((i + turn) / n) * Math.PI * 2;
        parts.push({ geometry: ball, color: jitter(r, c, 0.05), at: place(Math.cos(a) * s, h - s * 0.1, Math.sin(a) * s, [s * 0.75, s * 0.35, s * 0.75]), delay: 0.5 });
      }
      if (r() < 0.6) parts.push({ geometry: ball, color: stem, at: place(0.002, h * 0.35, 0, [0.006, 0.0018, 0.003], r() * 6), delay: 0.2 });
      return parts;
    },
  },
  { // mushroom: red or tan cap on a pale stalk
    weight: 1.2, spacing: 0.022, ground: "meadow",
    build(r) {
      const h = 0.009 + r() * 0.006, s = 0.009 + r() * 0.005;
      const cap: RGB = r() < 0.6 ? [0.88, 0.3, 0.26] : [0.78, 0.6, 0.42];
      return [
        { geometry: trunk, color: [0.96, 0.93, 0.86], at: place(0, 0, 0, [s * 0.35, h, s * 0.35]), delay: 0 },
        { geometry: dome, color: cap, at: place(0, h, 0, [s, s * 0.7, s]), delay: 0.35 },
      ];
    },
  },
  { // cactus, on the beaches
    weight: 1, spacing: 0.03, ground: "sand",
    build(r) {
      const h = 0.022 + r() * 0.014, c = jitter(r, [0.36, 0.6, 0.4], 0.08), w = 0.0045;
      const parts: Part[] = [
        { geometry: trunk, color: c, at: place(0, 0, 0, [w, h, w]), delay: 0 },
        { geometry: ball, color: c, at: place(0, h, 0, [w * 0.8, w * 0.8, w * 0.8]), delay: 0.2 },
      ];
      for (const side of [-1, 1]) {
        if (r() < 0.25) continue;
        const y = h * (0.35 + r() * 0.25), up = h * (0.25 + r() * 0.2), x = side * w * 2.2;
        parts.push({ geometry: trunk, color: c, at: place(x, y, 0, [w * 0.7, up, w * 0.7]), delay: 0.35 });
        parts.push({ geometry: trunk, color: c, at: place(side * w * 0.8, y, 0, [w * 0.6, w * 2, w * 0.6]).multiply(new Matrix4().makeRotationZ(side * -Math.PI / 2)), delay: 0.3 });
        parts.push({ geometry: ball, color: c, at: place(x, y + up, 0, w * 0.6), delay: 0.45 });
      }
      if (r() < 0.5) parts.push({ geometry: pebble, color: [0.98, 0.56, 0.68], at: place(0, h + w * 0.7, 0, w * 0.6), delay: 0.6 });
      return parts;
    },
  },
];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Per vertex: position, normal, aColor (sRGB), aAnchor (the plant's foot, on the
 * ground) and aPlant (a random seed, the part's grow delay, how far up the plant
 * it is for swaying, the plant's height).
 */
export function buildFlora(ground: BufferGeometry, count = 1400): BufferGeometry {
  const r = mulberry32(20261112);
  const gp = ground.getAttribute("position"), gc = ground.getAttribute("aColor"), ga = ground.getAttribute("aAttr");
  const spots: Record<"meadow" | "sand", number[]> = { meadow: [], sand: [] };
  for (let i = 0; i < gp.count; i++) {
    if (ga.getX(i) > 0.01) continue;
    spots[gc.getY(i) > gc.getX(i) + 0.04 ? "meadow" : "sand"].push(i);
  }

  const totalWeight = kinds.reduce((s, k) => s + k.weight, 0);
  const placed: { at: Vector3; spacing: number }[] = [];
  const positions: number[] = [], normals: number[] = [], colors: number[] = [], anchors: number[] = [], plants: number[] = [];
  const up = new Vector3(0, 1, 0), v = new Vector3(), n = new Vector3();

  for (let attempt = 0; attempt < count * 12 && placed.length < count; attempt++) {
    let roll = r() * totalWeight, kind = kinds[0];
    for (const k of kinds) if ((roll -= k.weight) < 0) { kind = k; break; }
    const list = spots[kind.ground];
    if (!list.length) continue;
    const vi = list[Math.floor(r() * list.length)];
    const foot = new Vector3(gp.getX(vi), gp.getY(vi), gp.getZ(vi));
    if (placed.some((p) => p.at.distanceTo(foot) < (p.spacing + kind.spacing) * 0.5)) continue;
    placed.push({ at: foot, spacing: kind.spacing });

    const normal = foot.clone().normalize();
    const base = foot.clone().addScaledVector(normal, -0.002); // sink the foot into the grass a touch
    const turn = new Quaternion().setFromUnitVectors(up, normal).multiply(new Quaternion().setFromAxisAngle(up, r() * Math.PI * 2));
    const size = 0.85 + r() * 0.3;
    const plant = new Matrix4().compose(base, turn, new Vector3(size, size, size));
    const seed = r();
    const parts = kind.build(r);
    let top = 0;
    for (const part of parts) top = Math.max(top, new Vector3().setFromMatrixPosition(part.at).y + part.at.getMaxScaleOnAxis());
    top *= size;

    for (const part of parts) {
      const g = (part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone());
      g.applyMatrix4(part.at).applyMatrix4(plant);
      const p = g.getAttribute("position"), no = g.getAttribute("normal");
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        n.fromBufferAttribute(no, i);
        positions.push(v.x, v.y, v.z);
        normals.push(n.x, n.y, n.z);
        colors.push(...part.color);
        anchors.push(base.x, base.y, base.z);
        plants.push(seed, part.delay, Math.min(1, v.distanceTo(base) / Math.max(top, 1e-4)), top);
      }
      g.dispose();
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
  geometry.setAttribute("aColor", new BufferAttribute(new Float32Array(colors), 3));
  geometry.setAttribute("aAnchor", new BufferAttribute(new Float32Array(anchors), 3));
  geometry.setAttribute("aPlant", new BufferAttribute(new Float32Array(plants), 4));
  geometry.computeBoundingSphere();
  return geometry;
}

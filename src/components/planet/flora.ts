// The app's own plants and friendship trees, laid out as one garden on the
// plain planet (big trees, smaller ones, beds of flowers), with a few wild
// flowers on the meadows beyond and cacti on the nearer beaches. The meshes
// are exported from the app (testExportPlants in
// scripts/PlantExportTests.swift.txt) and packed by scripts/pack-plants.mjs.
// Each model is drawn once, instanced at every spot it grows; viewer.ts grows
// them out of the ground and shrinks them back again, in a spreading loop.

import { BufferAttribute, BufferGeometry, Matrix4, Quaternion, Vector3 } from "three";

export type PlantModel = {
  name: string; displayScale: number; height: number;
  vertexOffset: number; vertexCount: number; indexOffset: number; indexCount: number;
};
export type PlantsMeta = { positionScale: number; models: PlantModel[] };

/** Model units to planet units: the app's sizes, shrunk to suit a whole-planet view. */
export const PLANT_SCALE = 0.055;

type Ground = "meadow" | "sand";

const onSand = /Opuntia|Kroenleinia|Carnegiea|Gymnocalycium|Agave|Echeveria/;
const isTree = (m: PlantModel) => m.name.endsWith("-tree") || m.name.endsWith("-young");

/**
 * How big a model is drawn, before a little random variety. Everything is
 * drawn larger than in the app's proportions, or from this far out the
 * flowers and cacti would be specks.
 */
const sizeOf = (m: PlantModel) => PLANT_SCALE * m.displayScale * (isTree(m) ? 1 : onSand.test(m.name) ? 1.4 : 1.6);

/** The big trees the garden is built round, in order: green, pink, gold, purple. */
const heroes = ["bodhi-tree", "sakura-tree", "ginkgo-tree", "jacaranda-tree", "trumpet-tree"];
/** Red crowns read as blobs from afar: kept out of the garden's middle. */
const loud = ["maple-tree", "maple-young", "kapok-tree"];
/** Too striking to plant in whole beds (fly agarics are a rash of red dots, shamrocks a dark stain): only now and then. */
const accent = /Amanita|Oxalis/;

/** One model's mesh: position, normal and aColor (sRGB). */
export function plantGeometry(buffer: ArrayBuffer, model: PlantModel, scale: number): BufferGeometry {
  const n = model.vertexCount, stride = 16;
  const view = new DataView(buffer, model.vertexOffset, n * stride);
  const position = new Float32Array(n * 3), normal = new Float32Array(n * 3), color = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const o = i * stride;
    for (let k = 0; k < 3; k++) {
      position[3 * i + k] = view.getInt16(o + 2 * k, true) * scale;
      normal[3 * i + k] = view.getInt8(o + 8 + k) / 127;
      color[3 * i + k] = view.getUint8(o + 12 + k) / 255;
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(position, 3));
  g.setAttribute("normal", new BufferAttribute(normal, 3));
  g.setAttribute("aColor", new BufferAttribute(color, 3));
  g.setIndex(new BufferAttribute(new Uint16Array(buffer, model.indexOffset, model.indexCount), 1));
  return g;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Flora = {
  /** Per model name: an instance matrix (standing on the ground, turned and sized) and a random seed for each spot. */
  spots: Map<string, { matrices: Matrix4[]; seeds: number[] }>;
  /** The middle of the garden, a unit direction in the planet's own space. */
  center: Vector3;
  /** The tallest anything stands above the ground, in planet units, for framing the camera. */
  tallest: number;
};

/**
 * Lays out one garden, as in the app: round the patch of meadow with the
 * most land about it, a few big trees in the middle, smaller ones round them,
 * and beds of flowers, each mostly one kind, thinning out toward its edge.
 * Beyond it the planet stays wild: a few flowers on the meadows and cacti on
 * the beaches near the garden.
 */
export function placeFlora(ground: BufferGeometry, meta: PlantsMeta): Flora {
  const r = mulberry32(20261125);
  const gp = ground.getAttribute("position"), gc = ground.getAttribute("aColor"), ga = ground.getAttribute("aAttr");
  const spots: Record<Ground, Vector3[]> = { meadow: [], sand: [] };
  const water: Vector3[] = [];
  for (let i = 0; i < gp.count; i++) {
    const at = new Vector3(gp.getX(i), gp.getY(i), gp.getZ(i));
    if (ga.getX(i) > 0.01) water.push(at.normalize());
    else spots[gc.getY(i) > gc.getX(i) + 0.04 ? "meadow" : "sand"].push(at);
  }

  // The garden's middle: of a few hundred meadow spots, the one with the least water near it.
  const center = new Vector3(0, 1, 0);
  let best = Infinity;
  for (let k = 0; k < 300 && spots.meadow.length; k++) {
    const c = spots.meadow[Math.floor(r() * spots.meadow.length)].clone().normalize();
    let wet = 0;
    for (let i = 0; i < water.length; i += 7) if (water[i].dot(c) > Math.cos(0.75)) wet++;
    if (wet < best) { best = wet; center.copy(c); }
  }
  const angle = (at: Vector3) => Math.acos(Math.min(1, at.clone().normalize().dot(center)));

  const byName = new Map(meta.models.map((m) => [m.name, m]));
  const trees = meta.models.filter((m) => m.name.endsWith("-tree"));
  const young = meta.models.filter((m) => m.name.endsWith("-young"));
  const sand = meta.models.filter((m) => onSand.test(m.name));
  const flowers = meta.models.filter((m) => !isTree(m) && !sand.includes(m));

  const placed: { at: Vector3; spacing: number }[] = [];
  const result = new Map<string, { matrices: Matrix4[]; seeds: number[] }>();
  const up = new Vector3(0, 1, 0);
  let tallest = 0;
  /** Plants one, if there's room; `model` may depend on where. */
  const plant = (list: Vector3[], spacing: number, grow: number, where: (a: number) => boolean,
    model: (at: Vector3) => PlantModel | undefined) => {
    for (let attempt = 0; attempt < 60; attempt++) {
      const foot = list[Math.floor(r() * list.length)];
      if (!foot || !where(angle(foot))) continue;
      if (placed.some((p) => p.at.distanceTo(foot) < (p.spacing + spacing) * 0.5)) continue;
      const m = model(foot);
      if (!m) return false;
      placed.push({ at: foot, spacing });
      const normal = foot.clone().normalize();
      const base = foot.clone().addScaledVector(normal, -0.002); // sink the foot into the grass a touch
      const turn = new Quaternion().setFromUnitVectors(up, normal).multiply(new Quaternion().setFromAxisAngle(up, r() * Math.PI * 2));
      const size = sizeOf(m) * grow * (0.9 + r() * 0.2);
      tallest = Math.max(tallest, m.height * size);
      const entry = result.get(m.name) ?? { matrices: [], seeds: [] };
      entry.matrices.push(new Matrix4().compose(base, turn, new Vector3(size, size, size)));
      entry.seeds.push(r());
      result.set(m.name, entry);
      return true;
    }
    return false;
  };

  // A few big trees in the middle, each a different kind.
  const heroList = heroes.map((n) => byName.get(n)).filter((m): m is PlantModel => !!m);
  let h = 0;
  for (let k = 0; k < 40 && h < 4; k++) if (plant(spots.meadow, 0.24, 2, (a) => a < 0.45, () => heroList[h])) h++;
  // Smaller trees round them, no kind more than twice, the loud ones only at the edge.
  const used = new Map<string, number>();
  const supporting = [...young, ...trees.filter((m) => !heroList.slice(0, 4).includes(m))];
  for (let k = 0; k < 9; k++) {
    plant(spots.meadow, 0.13, 1.2, (a) => a > 0.25 && a < 0.8, (at) => {
      const options = supporting.filter((m) => (used.get(m.name) ?? 0) < 2 && (!loud.includes(m.name) || angle(at) > 0.6));
      const m = options[Math.floor(r() * options.length)];
      if (m) used.set(m.name, (used.get(m.name) ?? 0) + 1);
      return m;
    });
  }
  // Flower beds: points round the garden, each with its own kind; most flowers take the nearest bed's.
  const beds = Array.from({ length: 24 }, () => {
    const at = spots.meadow[Math.floor(r() * spots.meadow.length)];
    const kinds = flowers.filter((m) => !accent.test(m.name));
    return { at, model: kinds[Math.floor(r() * kinds.length)] };
  }).filter((b) => b.at && angle(b.at) < 0.9);
  const bedFlower = (at: Vector3) => {
    if (r() < 0.35 || !beds.length) return flowers[Math.floor(r() * flowers.length)];
    return beds.reduce((a, b) => (a.at.distanceTo(at) < b.at.distanceTo(at) ? a : b)).model;
  };
  for (let k = 0; k < 340; k++) plant(spots.meadow, 0.026, 1, (a) => a < 0.9 && r() < 1 - 0.7 * (a / 0.9) ** 2, bedFlower);
  // The wild beyond: a scatter of flowers, and cacti on the nearer beaches.
  for (let k = 0; k < 45; k++) plant(spots.meadow, 0.05, 1, (a) => a >= 0.9, () => flowers[Math.floor(r() * flowers.length)]);
  for (let k = 0; k < 26; k++) plant(spots.sand, 0.04, 1, (a) => a < 1.3, () => sand[Math.floor(r() * sand.length)]);

  return { spots: result, center, tallest: tallest * 1.1 };
}

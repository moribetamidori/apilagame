// The app's own plants and friendship trees, scattered over the plain
// planet's land: trees and flowers on the meadows, cacti and succulents on the
// beaches. The meshes are exported from the app (testExportPlants in
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
type Group = { ground: Ground; count: number; spacing: number; models: PlantModel[] };

const onSand = /Opuntia|Kroenleinia|Carnegiea|Gymnocalycium|Agave|Echeveria/;
const isTree = (m: PlantModel) => m.name.endsWith("-tree") || m.name.endsWith("-young");

/**
 * How big a model is drawn, before a little random variety. Trees keep the
 * app's proportions; flowers and cacti are drawn larger than beside a tree
 * in the app, or from this far out they'd be specks.
 */
const sizeOf = (m: PlantModel) => PLANT_SCALE * m.displayScale * (isTree(m) ? 1 : onSand.test(m.name) ? 1.4 : 1.6);

/** The tallest anything stands above the ground, in planet units, for framing the camera. */
export function tallestPlant(meta: PlantsMeta) {
  return Math.max(...meta.models.map((m) => m.height * sizeOf(m))) * 1.15;
}

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

/**
 * Where each model grows: per model name, an instance matrix (standing on
 * the ground, turned at random, sized by PLANT_SCALE and the app's
 * displayScale) and a random seed for each spot.
 */
export function placeFlora(ground: BufferGeometry, meta: PlantsMeta): Map<string, { matrices: Matrix4[]; seeds: number[] }> {
  const r = mulberry32(20261125);
  const gp = ground.getAttribute("position"), gc = ground.getAttribute("aColor"), ga = ground.getAttribute("aAttr");
  const spots: Record<Ground, number[]> = { meadow: [], sand: [] };
  for (let i = 0; i < gp.count; i++) {
    if (ga.getX(i) > 0.01) continue; // not in the water
    spots[gc.getY(i) > gc.getX(i) + 0.04 ? "meadow" : "sand"].push(i);
  }

  const pick = (test: (m: PlantModel) => boolean) => meta.models.filter(test);
  const trees = pick((m) => m.name.endsWith("-tree")), young = pick((m) => m.name.endsWith("-young"));
  const sand = pick((m) => onSand.test(m.name));
  const flowers = pick((m) => !trees.includes(m) && !young.includes(m) && !sand.includes(m));
  // Biggest first, so the trees find room before the flowers fill in round them.
  const groups: Group[] = [
    { ground: "meadow", count: 40, spacing: 0.1, models: trees },
    { ground: "meadow", count: 26, spacing: 0.07, models: young },
    { ground: "sand", count: 50, spacing: 0.04, models: sand },
    { ground: "meadow", count: 420, spacing: 0.028, models: flowers },
  ];

  const placed: { at: Vector3; spacing: number }[] = [];
  const result = new Map<string, { matrices: Matrix4[]; seeds: number[] }>();
  const up = new Vector3(0, 1, 0);
  for (const group of groups) {
    const list = spots[group.ground];
    if (!list.length || !group.models.length) continue;
    for (let n = 0, attempt = 0; n < group.count && attempt < group.count * 40; attempt++) {
      const vi = list[Math.floor(r() * list.length)];
      const foot = new Vector3(gp.getX(vi), gp.getY(vi), gp.getZ(vi));
      if (placed.some((p) => p.at.distanceTo(foot) < (p.spacing + group.spacing) * 0.5)) continue;
      placed.push({ at: foot, spacing: group.spacing });
      n++;

      const model = group.models[Math.floor(r() * group.models.length)];
      const normal = foot.clone().normalize();
      const base = foot.addScaledVector(normal, -0.002); // sink the foot into the grass a touch
      const turn = new Quaternion().setFromUnitVectors(up, normal).multiply(new Quaternion().setFromAxisAngle(up, r() * Math.PI * 2));
      const size = sizeOf(model) * (0.85 + r() * 0.3);
      const entry = result.get(model.name) ?? { matrices: [], seeds: [] };
      entry.matrices.push(new Matrix4().compose(base, turn, new Vector3(size, size, size)));
      entry.seeds.push(r());
      result.set(model.name, entry);
    }
  }
  return result;
}

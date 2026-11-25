// Packs the plants and trees exported from the Apila app (testExportPlants in
// scripts/PlantExportTests.swift.txt) into public/models/plants.bin (gzipped)
// and plants.json, read by src/components/planet/flora.ts.
//
// The app's meshes are made for close-ups (a grown tree is ~200k vertices);
// each is simplified with meshoptimizer to a budget that reads the same at the
// size they're drawn on the landing page, keeping colour boundaries.
//
// Per model, 16 bytes a vertex:
//   position i16x3 (× 1/8000, model units, standing on y = 0) + pad |
//   normal i8x3 + pad | color u8x4 (sRGB)
// then u16 indices (padded to 4 bytes).
// Usage: node scripts/pack-plants.mjs <export dir> <out dir>

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { MeshoptSimplifier } from "meshoptimizer";

const [src, out] = process.argv.slice(2);
const meta = JSON.parse(readFileSync(join(src, "plants.json"), "utf8"));
const raw = readFileSync(join(src, "plants.raw"));
const STRIDE_IN = 60, SCALE = 8000;

// Triangle budgets: trees carry the scene, flowers are small on screen.
const budget = (name) => (name.endsWith("-tree") ? 9000 : name.endsWith("-young") ? 5000 : 1200);

/** A repeatable 0…1 for a number. */
const hash = (k) => {
  let x = Math.imul(k ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};

/** The mesh's separate pieces (touching by position): their triangles, vertices, middle and size. */
function pieces(indices, positions) {
  const byPosition = new Map(), place = new Uint32Array(positions.length / 3);
  for (let v = 0; v < place.length; v++) {
    const key = `${positions[3 * v].toFixed(5)},${positions[3 * v + 1].toFixed(5)},${positions[3 * v + 2].toFixed(5)}`;
    if (!byPosition.has(key)) byPosition.set(key, byPosition.size);
    place[v] = byPosition.get(key);
  }
  const parent = new Int32Array(byPosition.size).map((_, i) => i);
  const find = (x) => { while (parent[x] !== x) x = parent[x] = parent[parent[x]]; return x; };
  for (let t = 0; t < indices.length; t += 3) {
    const a = find(place[indices[t]]);
    parent[find(place[indices[t + 1]])] = a;
    parent[find(place[indices[t + 2]])] = a;
  }
  const groups = new Map();
  for (let t = 0; t < indices.length / 3; t++) {
    const root = find(place[indices[3 * t]]);
    if (!groups.has(root)) groups.set(root, { triangles: [], vertices: new Set() });
    const g = groups.get(root);
    g.triangles.push(t);
    for (let k = 0; k < 3; k++) g.vertices.add(indices[3 * t + k]);
  }
  return [...groups.values()].map((g) => {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const v of g.vertices) for (let a = 0; a < 3; a++) {
      lo[a] = Math.min(lo[a], positions[3 * v + a]);
      hi[a] = Math.max(hi[a], positions[3 * v + a]);
    }
    return { ...g, center: lo.map((l, a) => (l + hi[a]) / 2), size: Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) };
  });
}

/**
 * A leaf as a flat diamond: along its length from base to tip, across its
 * width, facing its average normal, grown by `grow` about its middle. Adds
 * four vertices to pos/nor/col and gives back the two triangles' indices.
 */
function card(leaf, grow, pos, nor, col) {
  const vs = [...leaf.vertices];
  const at = (v) => [pos[3 * v], pos[3 * v + 1], pos[3 * v + 2]];
  const c = [0, 0, 0], n = [0, 0, 0];
  for (const v of vs) for (let a = 0; a < 3; a++) { c[a] += pos[3 * v + a] / vs.length; n[a] += nor[3 * v + a]; }
  // Its length: the main axis of its points (power iteration on their spread).
  const cov = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const v of vs) {
    const d = at(v).map((x, a) => x - c[a]);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cov[3 * i + j] += d[i] * d[j];
  }
  let main = [0.3, 1, 0.2];
  for (let it = 0; it < 24; it++) {
    const m = [0, 1, 2].map((i) => cov[3 * i] * main[0] + cov[3 * i + 1] * main[1] + cov[3 * i + 2] * main[2]);
    const l = Math.hypot(...m) || 1;
    main = m.map((x) => x / l);
  }
  const dot = (u, w) => u[0] * w[0] + u[1] * w[1] + u[2] * w[2];
  const cross = (u, w) => [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
  const unit = (u) => { const l = Math.hypot(...u) || 1; return u.map((x) => x / l); };
  let normal = unit(n);
  if (Math.abs(dot(normal, main)) > 0.95) normal = unit(cross(main, [0, 1, 0]));
  const side = unit(cross(normal, main));
  main = cross(side, normal);
  let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity], base = vs[0], tip = vs[0];
  for (const v of vs) {
    const d = at(v).map((x, a) => x - c[a]), u = dot(d, main), w = dot(d, side);
    if (u < lo[0]) { lo[0] = u; base = v; }
    if (u > hi[0]) { hi[0] = u; tip = v; }
    lo[1] = Math.min(lo[1], w);
    hi[1] = Math.max(hi[1], w);
  }
  // The base keeps its place on the twig; the leaf grows out from it.
  const mid = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2];
  const g = grow;
  const corner = (u, w) => [0, 1, 2].map((a) => c[a] + main[a] * (lo[0] + (u - lo[0]) * g) + side[a] * (mid[1] + (w - mid[1]) * g));
  const average = [0, 1, 2].map((a) => vs.reduce((s, v) => s + col[3 * v + a], 0) / vs.length);
  const corners = [
    [corner(lo[0], mid[1]), base], [corner(mid[0], lo[1]), null], [corner(hi[0], mid[1]), tip], [corner(mid[0], hi[1]), null],
  ];
  const first = pos.length / 3;
  for (const [p, from] of corners) {
    pos.push(...p);
    nor.push(...normal);
    col.push(...(from === null ? average.map(Math.round) : [col[3 * from], col[3 * from + 1], col[3 * from + 2]]));
  }
  return [first, first + 1, first + 2, first, first + 2, first + 3];
}

await MeshoptSimplifier.ready;
MeshoptSimplifier.useExperimentalFeatures = true;

const chunks = [];
let blob = [];
let offset = 0;
const push = (buffer) => {
  blob.push(buffer);
  offset += buffer.length;
};

for (const part of meta.parts) {
  const data = new DataView(raw.buffer, raw.byteOffset + part.vertexOffset, part.vertexCount * STRIDE_IN);
  // Weld vertices sharing position, normal and colour, so neighbouring pieces can collapse together.
  const key = new Map(), weld = new Uint32Array(part.vertexCount);
  const pos = [], nor = [], col = [];
  for (let i = 0; i < part.vertexCount; i++) {
    const o = i * STRIDE_IN;
    const p = [0, 4, 8].map((k) => data.getFloat32(o + k, true));
    const n = [12, 16, 20].map((k) => data.getFloat32(o + k, true));
    const c = [24, 25, 26].map((k) => data.getUint8(o + k));
    const id = `${p.map((v) => v.toFixed(5))}|${n.map((v) => v.toFixed(2))}|${c}`;
    let v = key.get(id);
    if (v === undefined) {
      v = pos.length / 3;
      key.set(id, v);
      pos.push(...p);
      nor.push(...n);
      col.push(...c);
    }
    weld[i] = v;
  }
  const indexIn = new Uint32Array(raw.buffer.slice(raw.byteOffset + part.indexOffset, raw.byteOffset + part.indexOffset + part.indexCount * 4));
  const indices = indexIn.map((i) => weld[i]);
  const positions = new Float32Array(pos);
  const target = Math.min(indices.length, budget(part.name) * 3);

  // Foliage is thousands of separate little leaves and petals, each finely
  // made, which simplifying would melt away. Each becomes a flat card of two
  // triangles instead, its own size, slant and colours (base to tip); if
  // there are still too many, a share of them are kept, grown to keep the
  // crown's leafy area. Everything else (trunks, branches, blossom clumps,
  // flowers, cacti) is simplified as a whole.
  // Only massed foliage: a flower's handful of petals keeps its shape.
  let leaves = indices.length > target ? pieces(indices, positions).filter((c) => c.triangles.length >= 6 && c.triangles.length <= 400 && c.size < 0.35) : [];
  if (leaves.length < 300) leaves = [];
  const isLeaf = new Uint8Array(indices.length / 3);
  for (const c of leaves) for (const t of c.triangles) isLeaf[t] = 1;
  const rest = indices.filter((_, i) => !isLeaf[Math.floor(i / 3)]);
  // The leaves get the budget in their share of the model, within 30–70%.
  const leafTriangles = leaves.reduce((sum, c) => sum + c.triangles.length, 0);
  const leafShare = Math.min(0.7, Math.max(0.3, leafTriangles / (indices.length / 3)));
  const keep = Math.min(1, ((target / 3) * leafShare) / 2 / Math.max(1, leaves.length));
  const cards = [];
  leaves.forEach((c, k) => {
    if (hash(k) < keep) cards.push(...card(c, Math.min(2, 1 / Math.sqrt(keep)), pos, nor, col));
  });
  const positions2 = new Float32Array(pos), attributes2 = new Float32Array(col.map((c) => c / 255));
  // Allow more error until the rest fits what's left of the budget.
  const restTarget = Math.min(rest.length, Math.max(300, Math.floor((target - cards.length) / 3) * 3));
  let simple = rest;
  if (rest.length > restTarget) {
    for (const error of [0.02, 0.05, 0.1, 0.2]) {
      [simple] = MeshoptSimplifier.simplifyWithAttributes(rest, positions2, 3, attributes2, 3, [0.6, 0.6, 0.6], null, restTarget, error);
      if (simple.length <= restTarget * 1.2) break;
    }
  }
  simple = Uint32Array.from([...simple, ...cards]);
  // compactMesh renumbers the indices in place and gives each old vertex its new number.
  const compact = simple.slice();
  const [remap, count] = MeshoptSimplifier.compactMesh(compact);
  const order = new Int32Array(count);
  remap.forEach((to, from) => { if (to !== 0xffffffff) order[to] = from; });
  if (count > 65535) throw new Error(`${part.name}: ${count} vertices after simplifying`);

  let height = 0;
  const vertexBytes = Buffer.alloc(count * 16);
  for (let v = 0; v < count; v++) {
    const s = order[v], o = v * 16;
    height = Math.max(height, positions2[3 * s + 1]);
    for (let k = 0; k < 3; k++) {
      vertexBytes.writeInt16LE(Math.round(positions2[3 * s + k] * SCALE), o + 2 * k);
      vertexBytes.writeInt8(Math.max(-127, Math.min(127, Math.round(nor[3 * s + k] * 127))), o + 8 + k);
      vertexBytes.writeUint8(col[3 * s + k], o + 12 + k);
    }
    vertexBytes.writeUint8(255, o + 15);
  }
  const indexBytes = Buffer.alloc(Math.ceil((compact.length * 2) / 4) * 4);
  compact.forEach((i, k) => indexBytes.writeUint16LE(i, 2 * k));

  chunks.push({ name: part.name, displayScale: Math.round(part.displayScale * 1000) / 1000, height: Math.round(height * 1000) / 1000,
    vertexOffset: offset, vertexCount: count, indexOffset: offset + vertexBytes.length, indexCount: compact.length });
  push(vertexBytes);
  push(indexBytes);
  console.log(`${part.name.padEnd(44)} ${String(part.indexCount / 3).padStart(7)} → ${String(compact.length / 3).padStart(6)} triangles`);
}

const packed = gzipSync(Buffer.concat(blob), { level: 9 });
writeFileSync(join(out, "plants.bin"), packed);
writeFileSync(join(out, "plants.json"), JSON.stringify({ positionScale: 1 / SCALE, models: chunks }));
console.log(`${chunks.length} models → plants.bin, ${(offset / 1e6).toFixed(2)} MB (${(packed.length / 1e6).toFixed(2)} MB gzipped)`);

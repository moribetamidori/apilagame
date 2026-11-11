"""Repacks the plain planet exported from the Apila app (testExportPlanet in
scripts/AvatarExportTests.swift.txt) into public/models/planet.bin (gzipped)
and planet.json, read by src/components/planet/viewer.ts.

The ground cover is ~38k little clumps of grass (8-10 vertices each, stored
contiguously); a hashed subset of whole clumps is kept, which reads the same
at web sizes at a fraction of the download.

Per mesh chunk (each under 65536 vertices, for 16-bit indices), 20 bytes a vertex:
  position i16x3 (× 1/30000) + pad | normal i8x3 + pad |
  color u8x4 (sRGB) | water u8, lava u8, sway u8, pad
then u16 indices.
Usage: python3 pack-planet.py <export dir> <out dir> [cover fraction]
"""
import array, gzip, json, os, struct, sys

src, out = sys.argv[1], sys.argv[2]
keep = float(sys.argv[3]) if len(sys.argv) > 3 else 0.4
meta = json.load(open(os.path.join(src, "planet.json")))
raw = open(os.path.join(src, "planet.raw"), "rb").read()
STRIDE_IN = 44
SCALE = 30000

def vertices(p):
    base = p["vertexOffset"]
    for i in range(p["vertexCount"]):
        yield struct.unpack_from("<6fI4f", raw, base + i * STRIDE_IN)

def indices(p):
    a = array.array("I")
    a.frombytes(raw[p["indexOffset"]: p["indexOffset"] + 4 * p["indexCount"]])
    return a

def components(n, idx):
    """Contiguous vertex ranges of connected pieces."""
    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    for i in range(0, len(idx), 3):
        a, b, c = find(idx[i]), find(idx[i + 1]), find(idx[i + 2])
        parent[b] = a
        parent[find(c)] = a
    ranges, start = [], 0
    for v in range(1, n + 1):
        if v == n or find(v) != find(start):
            ranges.append((start, v))
            start = v
    return ranges

def hashed(i):
    x = (i * 2654435761) & 0xFFFFFFFF
    x ^= x >> 15
    return (x * 2246822519 & 0xFFFFFFFF) / 0xFFFFFFFF

blob = bytearray()
chunks = []

def emit(name, verts, tris):
    """verts: list of input tuples; tris: flat indices into verts."""
    offset = len(blob)
    for (px, py, pz, nx, ny, nz, color, u0, v0, u1, v1) in verts:
        q = lambda v: max(-32767, min(32767, round(v * SCALE)))
        n8 = lambda v: max(-127, min(127, round(v * 127)))
        b = lambda v: max(0, min(255, round(v * 255)))
        blob.extend(struct.pack("<4h4b4s4B", q(px), q(py), q(pz), 0, n8(nx), n8(ny), n8(nz), 0,
                                struct.pack("<I", color), b(u0), b(v0), b(u1), 0))
    index_offset = len(blob)
    blob.extend(array.array("H", tris).tobytes())
    while len(blob) % 4:
        blob.append(0)
    chunks.append({"mesh": name, "vertexOffset": offset, "vertexCount": len(verts),
                   "indexOffset": index_offset, "indexCount": len(tris)})

for p in meta["parts"]:
    if p["vertexCount"] == 0:
        continue
    verts, idx = list(vertices(p)), indices(p)
    if p["name"] == "cover":
        ranges = [r for k, r in enumerate(components(len(verts), idx)) if hashed(k) < keep]
    else:
        ranges = [(0, len(verts))]
    # Triangles by the range they fall in (pieces are contiguous).
    starts = [r[0] for r in ranges]
    import bisect
    tris_by = {r: [] for r in ranges}
    for i in range(0, len(idx), 3):
        a = idx[i]
        k = bisect.bisect_right(starts, a) - 1
        if k >= 0 and ranges[k][0] <= a < ranges[k][1]:
            tris_by[ranges[k]].extend(idx[i:i + 3])
    # Pack ranges into chunks under 65536 vertices.
    chunk_v, chunk_t = [], []
    def flush():
        if chunk_v:
            emit(p["name"], chunk_v, chunk_t)
    if p["name"] != "cover":
        assert len(verts) < 65536, (p["name"], len(verts))
    for r in ranges:
        size = r[1] - r[0]
        if len(chunk_v) + size >= 65536:
            flush()
            chunk_v, chunk_t = [], []
        base = len(chunk_v) - r[0]
        chunk_v.extend(verts[r[0]:r[1]])
        chunk_t.extend(t + base for t in tris_by[r])
    flush()

os.makedirs(out, exist_ok=True)
with gzip.open(os.path.join(out, "planet.bin"), "wb", compresslevel=9) as f:
    f.write(bytes(blob))
json.dump({"chunks": chunks, "sky": meta["sky"], "maximumRadius": meta["maximumRadius"],
           "fieldOfView": meta["fieldOfView"], "positionScale": 1 / SCALE},
          open(os.path.join(out, "planet.json"), "w"), separators=(",", ":"))
print(f"{len(blob)} bytes raw, {len(chunks)} chunks, {sum(c['vertexCount'] for c in chunks)} vertices")

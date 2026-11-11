"""Repacks an avatar exported from the Apila app (LandingRenderTests, run once
by hand) into the compact format public/models/<name>.bin (gzipped) that AvatarViewer reads.

Per part, interleaved 32 bytes a vertex:
  position f32x3 | normal i8x3 + weight u8 | color u8x4 (sRGB) |
  kind u8, skin u8, joint a u8, joint b u8 | uv1 f32x2
then u16 indices. Usage: python3 pack-avatar.py <export dir> <name> <out dir>
"""
import array, gzip, json, struct, sys, os

src, name, out = sys.argv[1], sys.argv[2], sys.argv[3]
meta = json.load(open(os.path.join(src, f"{name}.json")))
raw = open(os.path.join(src, f"{name}.bin"), "rb").read()

def read(spec, code):
    a = array.array(code)
    size = a.itemsize
    a.frombytes(raw[spec["offset"]: spec["offset"] + spec["count"] * size])
    return a

blob = bytearray()
parts = []
kinds = set()
for p in meta["parts"]:
    pos, nrm = read(p["position"], "f"), read(p["normal"], "f")
    col, uv0, uv1 = read(p["color"], "I"), read(p["uv0"], "f"), read(p["uv1"], "f")
    joints, weight, index = read(p["joints"], "I"), read(p["weight"], "f"), read(p["index"], "I")
    n = len(pos) // 3
    assert n < 65536, (p["key"], n)
    offset = len(blob)
    for i in range(n):
        q = lambda v: max(-127, min(127, round(v * 127)))
        kind, skin = round(uv0[2 * i]), round(uv0[2 * i + 1])
        kinds.add(kind)
        blob += struct.pack("<3f3bB4s4B2f", pos[3*i], pos[3*i+1], pos[3*i+2],
                            q(nrm[3*i]), q(nrm[3*i+1]), q(nrm[3*i+2]), round(weight[i] * 255),
                            struct.pack("<I", col[i]), kind, skin, joints[i] & 0xFF, (joints[i] >> 8) & 0xFF,
                            uv1[2*i], uv1[2*i+1])
    index_offset = len(blob)
    blob += array.array("H", index).tobytes()
    while len(blob) % 4: blob += b"\0"
    parts.append({"key": p["key"], "role": p["role"], "glassStart": p["glassStart"],
                  "vertexOffset": offset, "vertexCount": n, "indexOffset": index_offset, "indexCount": len(index)})

os.makedirs(out, exist_ok=True)
with gzip.open(os.path.join(out, f"{name}.bin"), "wb", compresslevel=9) as f:
    f.write(bytes(blob))
json.dump({"name": name, "armSpread": meta["armSpread"], "parts": parts},
          open(os.path.join(out, f"{name}.json"), "w"), separators=(",", ":"))
print(name, len(blob), "bytes raw; material kinds", sorted(kinds))

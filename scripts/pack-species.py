"""Packs the Apila species catalog for the /wiki page: src/lib/species.json
(shelves → categories → species) and one small icon per species in
public/assets/species/<id>.webp.

Reads Design/Species/catalog.json in the Apila app repo (run its
Scripts/species_catalog.py first if the list changed). Icons are fetched from
R2, cropped to the plant and shrunk to 128 px WebP; they're cached in
~/Library/Caches/apila-species-wiki, so later runs only fetch new ones.

Needs Pillow (`pip install pillow`).
Usage: python3 scripts/pack-species.py [path to Apila repo, default ../Apila]
"""
import io, json, os, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
APILA = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "Apila"
CATALOG = APILA / "Design/Species/catalog.json"
DATA_OUT = ROOT / "src/lib/species.json"
ICONS_OUT = ROOT / "public/assets/species"
CACHE = Path.home() / "Library/Caches/apila-species-wiki"
ICON_BASE = "https://apila-species.apila-photos.workers.dev/"
SIZE = 128


def small_icon(icon_path):
    """The species' icon, cropped to the plant and shrunk to a WebP."""
    cached = CACHE / (Path(icon_path).stem + ".webp")
    if cached.exists():
        return cached.read_bytes()
    with urllib.request.urlopen(ICON_BASE + icon_path, timeout=60) as response:
        image = Image.open(io.BytesIO(response.read())).convert("RGBA")
    box = image.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if box:
        image = image.crop(box)
    w, h = image.size
    side = int(max(w, h) * 1.06)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(image, ((side - w) // 2, (side - h) // 2))
    out = io.BytesIO()
    square.resize((SIZE, SIZE), Image.LANCZOS).save(out, "WEBP", quality=78, method=6)
    cached.write_bytes(out.getvalue())
    return out.getvalue()


catalog = json.loads(CATALOG.read_text())
species = sorted((s for s in catalog["species"] if s.get("released")), key=lambda s: s["sort"])
no_icon = [s["id"] for s in species if not s.get("icon_path")]
if no_icon:
    print(f"{len(no_icon)} species have no icon yet: {', '.join(no_icon[:5])}", file=sys.stderr)

CACHE.mkdir(parents=True, exist_ok=True)
ICONS_OUT.mkdir(parents=True, exist_ok=True)
with_icons = [s for s in species if s.get("icon_path")]
with ThreadPoolExecutor(16) as pool:
    for s, data in zip(with_icons, pool.map(lambda s: small_icon(s["icon_path"]), with_icons)):
        (ICONS_OUT / f"{s['id']}.webp").write_bytes(data)
# Drop icons of species that were withdrawn or renamed.
keep = {f"{s['id']}.webp" for s in with_icons}
for stale in os.listdir(ICONS_OUT):
    if stale not in keep:
        os.remove(ICONS_OUT / stale)

by_category = {}
for s in species:
    by_category.setdefault(s["category_id"], []).append({
        "id": s["id"], "name": s["name"], "scientific": s["scientific_name"],
        "shape": s["archetype"], "firstShipped": s["archetype"] == "legacy",
        "icon": bool(s.get("icon_path")),
    })
categories = sorted(catalog["categories"], key=lambda c: c["sort"])
shelves = [{
    "id": shelf["id"], "title": shelf["title"],
    "categories": [{"id": c["id"], "title": c["title"], "species": by_category[c["id"]]}
                   for c in categories if c["shelf_id"] == shelf["id"] and c["id"] in by_category],
} for shelf in sorted(catalog["shelves"], key=lambda s: s["sort"])]

DATA_OUT.write_text(json.dumps(shelves, ensure_ascii=False, separators=(",", ":")) + "\n")
print(f"{len(species)} species in {sum(len(s['categories']) for s in shelves)} categories → "
      f"{DATA_OUT.relative_to(ROOT)}, {len(with_icons)} icons → {ICONS_OUT.relative_to(ROOT)}")

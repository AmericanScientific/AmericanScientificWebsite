import csv, io, os, json, re, glob

AR = r"C:\Users\trevor\Desktop\PHYWE Full Catalog"
OUT = r"C:\Users\trevor\AmericanScientificWebsite\amsci-web\src\data\phywe_catalog.json"
CDN = "https://cdn02.plentyone.com/jd5w7us67fek/item/images"

# Sellable categories (drop Equipment & Accessories parts, Manufacturer dupes,
# Service, _Uncategorized) — mirrors the old-site curation.
KEEP = {"Physics", "Chemistry", "Biology", "Sensors & Software", "Experiments & Sets", "Nature & Technology"}
# Obvious spare-part / non-product name signals to skip.
SKIP_NAME = re.compile(r"\b(spare|replacement part|screw|o-ring|fuse|adapter cable|in german)\b", re.I)

def clean_desc(folder):
    p = os.path.join(AR, folder, "description.txt")
    try:
        txt = io.open(p, encoding="utf-8").read()
    except Exception:
        return "", None
    desc = ""
    m = re.search(r"Description:\s*\n-+\n(.*?)(?:\n\nImages:|\Z)", txt, re.S)
    if m:
        desc = m.group(1).strip()
        if desc.startswith("Unknown "):
            desc = desc[len("Unknown "):]
    img = None
    mi = re.search(r"Images:\s*\n\s*-\s*(.+)", txt)
    if mi:
        img = mi.group(1).strip()
    return desc, img

def folder_image(folder):
    for ext in ("*.jpg", "*.jpeg", "*.png"):
        hits = glob.glob(os.path.join(AR, folder, ext))
        if hits:
            return os.path.basename(hits[0])
    return None

rows = []
with io.open(os.path.join(AR, "_CATALOG_INDEX.csv"), encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))

seen = set()
out = []
for r in rows:
    cat = r["top_category"]
    if cat not in KEEP:
        continue
    art = (r["article_no"] or "").strip()
    name = (r["name"] or "").strip()
    if not art or not name or art in seen:
        continue
    if SKIP_NAME.search(name):
        continue
    seen.add(art)
    folder = r["folder_path"]
    desc, img_from_txt = clean_desc(folder)
    img = img_from_txt or folder_image(folder)
    item_id = (r["item_id"] or "").strip()
    image = f"{CDN}/{item_id}/full/{img}" if (item_id and img) else None
    out.append({
        "articleNo": art,
        "name": name,
        "category": cat,
        "focus": (r["focus"] or "").strip(),
        "subcategory": (r["subcategory"] or "").strip(),
        "description": desc,
        "image": image,
        "score": float(r["premium_score"] or 0),
    })

# Flagship-first, then name.
out.sort(key=lambda x: (-x["score"], x["name"]))
# Drop the transient score from the shipped file (kept only for ordering).
for x in out:
    x.pop("score", None)

json.dump(out, io.open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
from collections import Counter
c = Counter(x["category"] for x in out)
print("total curated products:", len(out))
for k, v in c.most_common():
    print(f"  {v:5}  {k}")
missing_img = sum(1 for x in out if not x["image"])
missing_desc = sum(1 for x in out if not x["description"])
print("missing image:", missing_img, "| missing description:", missing_desc)
sz = os.path.getsize(OUT)
print(f"wrote {OUT} ({sz/1_000_000:.1f} MB)")
print("--- sample ---")
print(json.dumps(out[0], ensure_ascii=False)[:400])

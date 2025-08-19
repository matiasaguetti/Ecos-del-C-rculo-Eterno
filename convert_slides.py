#!/usr/bin/env python3
"""
Convertidor de slides.json:
- Si slides.json es un objeto { "01": [...], "02": [...] } lo convierte en
  un array [ {id, chapter, title, date, body, images: [...]}, ... ] respetando
  el orden de capítulos y el orden dentro de cada capítulo.
- Hace backup del original antes de sobrescribir.
Usage:
  python3 convert_slides.py            # lee slides.json y escribe slides_converted.json
  python3 convert_slides.py --inplace  # sobrescribe slides.json (crea backup)
  python3 convert_slides.py <file.json> [--inplace]
"""
import json, sys, os, shutil, time
from pathlib import Path

def now_ts():
    return time.strftime("%Y%m%d-%H%M%S")

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def normalize_item(item, chapter_id, gen_id_base, idx):
    # Ensure item is dict
    if not isinstance(item, dict):
        return None
    out = dict(item)  # copy
    # set chapter if missing
    if 'chapter' not in out or out.get('chapter') in (None, ""):
        out['chapter'] = str(chapter_id)
    # ensure id exists
    if 'id' not in out or out['id'] in (None, ""):
        out['id'] = f"{gen_id_base}{idx}"
    # normalize images: if string -> wrap in array; if missing -> []
    imgs = out.get('images', [])
    if isinstance(imgs, str):
        imgs = [imgs]
    if imgs is None:
        imgs = []
    out['images'] = imgs
    # keep other fields as-is
    return out

def convert_obj_to_array(src_obj):
    """
    src_obj is expected to be a dict whose keys are chapter ids and values are arrays of items
    Returns array of normalized items preserving key-order and item order.
    """
    out = []
    gen_base = now_ts() + "-"
    # Python dict preserves insertion order (same as file order in modern Python)
    for chap_idx, (chap_key, items) in enumerate(src_obj.items()):
        # If items is not a list but a dict with numeric keys, try to extract by sorted keys
        if isinstance(items, dict):
            # convert dict-of-items to list using numeric order when possible
            try:
                # sort keys numerically when possible
                keys_sorted = sorted(items.keys(), key=lambda k: int(k) if str(k).isdigit() else k)
            except Exception:
                keys_sorted = list(items.keys())
            items_list = [items[k] for k in keys_sorted]
        else:
            items_list = list(items or [])
        for i, it in enumerate(items_list):
            normalized = normalize_item(it, chap_key, gen_base, f"{chap_idx+1:02d}-{i+1}")
            if normalized:
                out.append(normalized)
    return out

def main():
    args = sys.argv[1:]
    infile = "slides.json"
    inplace = False
    if len(args) >= 1 and not args[0].startswith("--"):
        infile = args[0]
        args = args[1:]
    if "--inplace" in args:
        inplace = True

    p = Path(infile)
    if not p.exists():
        print(f"[ERROR] No existe el archivo: {infile}")
        sys.exit(2)

    try:
        data = load_json(p)
    except Exception as e:
        print(f"[ERROR] No se pudo leer JSON: {e}")
        sys.exit(2)

    # If it's already a list/array, inform and exit
    if isinstance(data, list):
        print(f"[OK] {infile} ya está en formato array. No se realiza conversión.")
        sys.exit(0)

    if not isinstance(data, dict):
        print(f"[ERROR] Formato inesperado en {infile} (ni array ni objeto). Revisar manualmente.")
        sys.exit(2)

    # backup
    bak_name = f"{p.name}.bak.{now_ts()}"
    bak_path = p.with_name(bak_name)
    print(f"[INFO] Creando backup: {bak_path}")
    shutil.copy(p, bak_path)

    # convert
    out_array = convert_obj_to_array(data)

    # write output
    if inplace:
        print(f"[INFO] Sobrescribiendo {p} con el array convertido.")
        save_json(p, out_array)
        print(f"[OK] Conversión completada. Backup: {bak_path}")
    else:
        out_path = p.with_name("slides_converted.json")
        save_json(out_path, out_array)
        print(f"[OK] Conversión completada. Archivo generado: {out_path}")
        print(f"[INFO] Backup original: {bak_path}")

if __name__ == "__main__":
    main()

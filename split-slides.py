#!/usr/bin/env python3
"""
Divide slides.json en archivos por capítulo:
- lee slides.json (array) y crea slides-<chapter>.json para cada capítulo encontrado
- si una entrada no tiene 'chapter', la asigna a '01' por defecto
"""
import json
from pathlib import Path
p = Path("slides.json")
if not p.exists():
    print("No existe slides.json")
    raise SystemExit(1)
data = json.loads(p.read_text(encoding="utf-8"))
if not isinstance(data, list):
    print("slides.json no es un array. Adapta antes o usa el script de conversión.")
    raise SystemExit(1)

out = {}
for item in data:
    ch = str(item.get("chapter","01"))
    out.setdefault(ch, []).append(item)

for ch, items in out.items():
    fname = f"slides-{ch}.json"
    Path(fname).write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Escrito", fname, "(", len(items), "entradas )")
print("Split completado. Borra slides.json si vas a usar los archivos por capítulo.")

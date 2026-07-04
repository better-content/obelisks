#!/usr/bin/env python3
import csv
import json
import re
import sys
import zipfile
from pathlib import Path

try:
    import tomllib
except Exception as e:
    tomllib = None

mods_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / '.local/share/PrismLauncher/instances/Bound to Matter-Playtest 4 - v1/minecraft/mods'
out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else Path('/tmp/btm-memory-variants')
out_dir.mkdir(parents=True, exist_ok=True)

categories = {
    'blockstates': re.compile(r'^assets/[^/]+/blockstates/.+\.json$'),
    'block_models': re.compile(r'^assets/[^/]+/models/block/.+\.json$'),
    'item_models': re.compile(r'^assets/[^/]+/models/item/.+\.json$'),
    'textures_png': re.compile(r'^assets/[^/]+/textures/.+\.png$'),
    'geo_models': re.compile(r'^assets/[^/]+/(geo|models/geo)/.+\.(json|geo\.json)$'),
    'animations': re.compile(r'^assets/[^/]+/animations/.+\.json$'),
    'lang_files': re.compile(r'^assets/[^/]+/lang/.+\.json$'),
    'recipes': re.compile(r'^data/[^/]+/recipes/.+\.json$'),
    'loot_tables': re.compile(r'^data/[^/]+/loot_tables/.+\.json$'),
    'worldgen': re.compile(r'^data/[^/]+/(worldgen|forge/worldgen)/.+\.json$'),
    'tags': re.compile(r'^data/[^/]+/tags/.+\.json$'),
    'patchouli_json': re.compile(r'^data/[^/]+/patchouli_books/.+\.json$'),
    'guide_json': re.compile(r'^data/[^/]+/(modonomicon|guideme|patchouli_books)/.+\.json$'),
}

asset_ns = re.compile(r'^assets/([^/]+)/')
data_ns = re.compile(r'^data/([^/]+)/')

def parse_mods_toml(zf):
    try:
        raw = zf.read('META-INF/mods.toml')
    except KeyError:
        return []
    if not tomllib:
        return []
    try:
        data = tomllib.loads(raw.decode('utf-8', errors='replace'))
    except Exception:
        return []
    mods = data.get('mods') or []
    result = []
    for mod in mods:
        if isinstance(mod, dict):
            result.append({
                'mod_id': str(mod.get('modId') or ''),
                'display_name': str(mod.get('displayName') or ''),
            })
    return result

rows = []
for jar in sorted(mods_dir.glob('*.jar')):
    row = {
        'jar': jar.name,
        'jar_mib': round(jar.stat().st_size / 1024 / 1024, 2),
        'mod_ids': '',
        'display_names': '',
        'namespaces': '',
        'files_total': 0,
        'assets_files': 0,
        'data_files': 0,
    }
    for key in categories:
        row[key] = 0
    ns_counts = {}
    try:
        with zipfile.ZipFile(jar) as zf:
            mods = parse_mods_toml(zf)
            row['mod_ids'] = ';'.join(m['mod_id'] for m in mods if m['mod_id'])
            row['display_names'] = ';'.join(m['display_name'] for m in mods if m['display_name'])
            for info in zf.infolist():
                if info.is_dir():
                    continue
                name = info.filename
                row['files_total'] += 1
                am = asset_ns.match(name)
                dm = data_ns.match(name)
                if am:
                    row['assets_files'] += 1
                    ns_counts[am.group(1)] = ns_counts.get(am.group(1), 0) + 1
                if dm:
                    row['data_files'] += 1
                    ns_counts[dm.group(1)] = ns_counts.get(dm.group(1), 0) + 1
                for key, pattern in categories.items():
                    if pattern.match(name):
                        row[key] += 1
            row['namespaces'] = ';'.join(f'{k}:{v}' for k, v in sorted(ns_counts.items(), key=lambda kv: (-kv[1], kv[0]))[:8])
    except zipfile.BadZipFile:
        row['error'] = 'bad_zip'
    rows.append(row)

# Weighted score tuned to model/resource pressure observed in histograms.
weights = {
    'blockstates': 6,
    'block_models': 5,
    'item_models': 2,
    'textures_png': 2,
    'geo_models': 4,
    'animations': 2,
    'recipes': 1,
    'loot_tables': 1,
    'worldgen': 3,
    'patchouli_json': 0.4,
    'guide_json': 0.4,
}
for row in rows:
    score = 0.0
    for key, weight in weights.items():
        score += row.get(key, 0) * weight
    row['model_pressure_score'] = round(score, 1)

csv_path = out_dir / 'content_memory_inventory.csv'
fields = ['jar','mod_ids','display_names','jar_mib','model_pressure_score','files_total','assets_files','data_files'] + list(categories.keys()) + ['namespaces']
with csv_path.open('w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
    writer.writeheader()
    writer.writerows(rows)

summary = {
    'mods_dir': str(mods_dir),
    'jar_count': len(rows),
    'totals': {key: sum(row.get(key, 0) for row in rows) for key in ['jar_mib','files_total','assets_files','data_files','model_pressure_score'] + list(categories.keys())},
    'top_model_pressure': sorted(rows, key=lambda r: r['model_pressure_score'], reverse=True)[:40],
    'top_blockstates': sorted(rows, key=lambda r: r['blockstates'], reverse=True)[:30],
    'top_block_models': sorted(rows, key=lambda r: r['block_models'], reverse=True)[:30],
    'top_item_models': sorted(rows, key=lambda r: r['item_models'], reverse=True)[:30],
    'top_textures': sorted(rows, key=lambda r: r['textures_png'], reverse=True)[:30],
    'top_recipes': sorted(rows, key=lambda r: r['recipes'], reverse=True)[:30],
    'top_patchouli': sorted(rows, key=lambda r: r['patchouli_json'], reverse=True)[:30],
    'top_worldgen': sorted(rows, key=lambda r: r['worldgen'], reverse=True)[:30],
}
json_path = out_dir / 'content_memory_inventory.json'
json_path.write_text(json.dumps(summary, indent=2))
print(f'wrote {csv_path}')
print(f'wrote {json_path}')
print('Top model pressure:')
for row in summary['top_model_pressure'][:20]:
    print(f"{row['model_pressure_score']:8.1f} {row['jar'][:56]:56} bs={row['blockstates']} bm={row['block_models']} im={row['item_models']} tex={row['textures_png']} recipes={row['recipes']}")

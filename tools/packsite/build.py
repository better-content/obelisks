#!/usr/bin/env python3
from __future__ import annotations

import html
import json
import os
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
if str(REPO) not in sys.path:
    sys.path.insert(0, str(REPO))

from tools.packsite.icons import resolve_icons
from tools.packsite.site_model import display_name, namespace, slug
from tools.packsite.validation import combined_validation_summary
from tools.questgraph.export_ftbquests import export_ftbquests
from tools.questgraph.model import collect_item_refs, load_quest_graph
from tools.questgraph.validate import validate_graph
from tools.recipegraph.normalize import fluid_ids, item_ids, load_recipe_graph
from tools.recipegraph.policies import apply_policies
from tools.recipegraph.render_site import recipe_graph_data
from tools.recipegraph.validate import validate_recipe_graph


def main():
    graph_path = REPO / "quests" / "graph.yml"
    runtime_dir = REPO / "generated" / "runtime-dumps"
    site_dir = REPO / "generated" / "pack-site"
    ftb_dir = REPO / "generated" / "ftbquests"

    site_dir.mkdir(parents=True, exist_ok=True)
    (site_dir / "assets").mkdir(parents=True, exist_ok=True)

    quest_graph = load_quest_graph(str(graph_path))
    recipe_graph = load_recipe_graph(str(runtime_dir))
    known_items = item_ids(recipe_graph) if (runtime_dir / "registries.json").exists() else None
    quest_result = validate_graph(quest_graph, known_items=known_items)
    recipe_result = validate_recipe_graph(recipe_graph)
    policy_report = apply_policies(recipe_graph, str(REPO / "recipe-policies.yml"))

    icon_manifest = resolve_icons(collect_item_refs(quest_graph).union(item_ids(recipe_graph)), str(site_dir))
    validation = combined_validation_summary(quest_result, recipe_result, policy_report, icon_manifest)

    _write_static_assets(site_dir)
    _write_json_js(site_dir / "assets" / "quest-graph-data.js", "QUEST_GRAPH", _quest_graph_data(quest_graph))
    _write_json_js(site_dir / "assets" / "recipe-graph-data.js", "RECIPE_GRAPH", recipe_graph_data(recipe_graph, quest_graph))

    _render_index(site_dir, quest_graph, recipe_graph, validation)
    _render_validation(site_dir, validation)
    _render_quests(site_dir, quest_graph, recipe_graph)
    _render_recipes(site_dir, quest_graph, recipe_graph, validation)
    export_ftbquests(quest_graph, str(ftb_dir))

    print("Pack site generated:")
    print("  generated/pack-site/index.html")
    print()
    print("Quest export generated:")
    print("  generated/ftbquests/")
    print()
    print("Validation:")
    print(f"  errors: {validation['errors']}")
    print(f"  warnings: {validation['warnings']}")
    print(f"  unparsed recipes: {len(recipe_graph.unparsed)}")
    print(f"  missing icons: {validation['missing_icons']}")
    print(f"  policy violation count: {len(policy_report.violations)}")


def _render_index(site_dir, quest_graph, recipe_graph, validation):
    body = f"""
    <section class="hero">
      <h1>Obelisks Pack Cockpit</h1>
      <p>Static visibility for quest architecture, runtime recipes, items, fluids, tags, and policy checks.</p>
    </section>
    <section class="cards">
      {_card("Quests", len(quest_graph.nodes))}
      {_card("Chapters", len(quest_graph.chapters))}
      {_card("Recipes", len(recipe_graph.recipes))}
      {_card("Items", len(item_ids(recipe_graph)))}
      {_card("Fluids", len(fluid_ids(recipe_graph)))}
      {_card("Validation Errors", validation["errors"])}
      {_card("Warnings", validation["warnings"])}
      {_card("Unparsed Recipes", len(recipe_graph.unparsed))}
      {_card("Missing Icons", validation["missing_icons"])}
      {_card("Policy Violations", len(validation["policy_violations"]))}
    </section>
    <nav class="link-grid">
      <a href="validation.html">Validation</a>
      <a href="quests/graph.html">Quest Graph</a>
      <a href="recipes/graph.html">Recipe Graph</a>
      <a href="recipes/reports/unparsed-recipes.html">Unparsed Recipes</a>
      <a href="recipes/items/index.html">Items</a>
      <a href="recipes/fluids/index.html">Fluids</a>
      <a href="recipes/machines/index.html">Machines</a>
      <a href="recipes/mods/index.html">Mods</a>
      <a href="recipes/tags/index.html">Tags</a>
    </nav>
    """
    _write_html(site_dir / "index.html", "Pack Cockpit", body, depth=0)


def _render_validation(site_dir, validation):
    parts = ["<h1>Validation</h1>"]
    for title, rows in [
        ("Quest Errors", validation["quest_errors"]),
        ("Quest Warnings", validation["quest_warnings"]),
        ("Recipe Errors", validation["recipe_errors"]),
        ("Recipe Warnings", validation["recipe_warnings"][:500]),
    ]:
        parts.append(f"<h2>{_h(title)}</h2>")
        parts.append(_list(rows))
    parts.append("<h2>Policy Violations</h2>")
    parts.append(_list([f"{v['severity']}: {v['policy']} - {v['message']}" for v in validation["policy_violations"]]))
    _write_html(site_dir / "validation.html", "Validation", "\n".join(parts), depth=0)


def _render_quests(site_dir, quest_graph, recipe_graph):
    base = site_dir / "quests"
    (base / "chapters").mkdir(parents=True, exist_ok=True)
    (base / "quests").mkdir(parents=True, exist_ok=True)
    _write_graph_page(base / "graph.html", "Quest Graph", "../assets/quest-graph-data.js", "QUEST_GRAPH", depth=1)
    reverse = quest_graph.reverse_edges()
    for chapter in quest_graph.chapters.values():
        nodes = [n for n in quest_graph.nodes.values() if n.chapter == chapter.key]
        body = f"<h1>{_h(chapter.title)}</h1>" + _list([_quest_link(n) for n in nodes], raw=True)
        _write_html(base / "chapters" / f"{slug(chapter.key)}.html", chapter.title, body, depth=2)
    for node in quest_graph.nodes.values():
        body = [
            f"<h1>{_h(node.title)}</h1>",
            f"<p><b>ID:</b> {_h(node.key)}</p>",
            f"<p><b>Chapter:</b> {_h(node.chapter)} | <b>Stage:</b> {_h(node.stage)}</p>",
            f"<div class=\"body-text\">{_h(node.body).replace(chr(10), '<br>')}</div>",
            "<h2>Prerequisites</h2>",
            _list([_quest_link(quest_graph.nodes[d]) for d in node.requires if d in quest_graph.nodes], raw=True),
            "<h2>Unlocks</h2>",
            _list([_quest_link(quest_graph.nodes[d]) for d in reverse.get(node.key, [])], raw=True),
            "<h2>Tasks</h2>",
            _list([_render_task(t) for t in node.tasks], raw=True),
            "<h2>Rewards</h2>",
            _list([_render_reward(r) for r in node.rewards], raw=True),
            "<h2>Tags</h2>",
            _list(node.tags),
        ]
        _write_html(base / "quests" / f"{slug(node.key)}.html", node.title, "\n".join(body), depth=2)


def _render_recipes(site_dir, quest_graph, recipe_graph, validation):
    base = site_dir / "recipes"
    for name in ("recipes", "items", "fluids", "machines", "mods", "tags", "reports"):
        (base / name).mkdir(parents=True, exist_ok=True)
    _write_graph_page(base / "graph.html", "Recipe Graph", "../assets/recipe-graph-data.js", "RECIPE_GRAPH", depth=1)
    _render_item_pages(base, quest_graph, recipe_graph)
    _render_fluid_pages(base, recipe_graph)
    _render_recipe_pages(base, recipe_graph)
    _render_machine_pages(base, recipe_graph)
    _render_mod_pages(base, recipe_graph)
    _render_tag_pages(base, recipe_graph)
    _render_reports(base, recipe_graph, validation)


def _render_item_pages(base, quest_graph, recipe_graph):
    ids = sorted(item_ids(recipe_graph).union(collect_item_refs(quest_graph)))
    _write_html(base / "items" / "index.html", "Items", "<h1>Items</h1>" + _list([_item_link(i) for i in ids], raw=True), depth=2)
    for item_id in ids:
        used_tasks = [n for n in quest_graph.nodes.values() if any(isinstance(t, dict) and t.get("item") == item_id for t in n.tasks)]
        used_rewards = [n for n in quest_graph.nodes.values() if any(isinstance(r, dict) and r.get("item") == item_id for r in n.rewards)]
        used_icons = [n for n in quest_graph.nodes.values() if n.icon == item_id]
        tags = _tags_containing(recipe_graph.tags.get("item_tags") or {}, item_id)
        body = [
            f"<h1>{_h(display_name(recipe_graph.registries, 'items', item_id))}</h1>",
            f"<p><b>ID:</b> {_h(item_id)} | <b>Namespace:</b> {_h(namespace(item_id))}</p>",
            "<h2>Produced By</h2>",
            _list([_recipe_link(r) for r in recipe_graph.produced_by.get(item_id, [])], raw=True),
            "<h2>Used In Recipes</h2>",
            _list([_recipe_link(r) for r in recipe_graph.used_in.get(item_id, [])], raw=True),
            "<h2>Quest Tasks</h2>",
            _list([_quest_link(n, prefix="../../quests/quests/") for n in used_tasks], raw=True),
            "<h2>Quest Rewards</h2>",
            _list([_quest_link(n, prefix="../../quests/quests/") for n in used_rewards], raw=True),
            "<h2>Quest Icons</h2>",
            _list([_quest_link(n, prefix="../../quests/quests/") for n in used_icons], raw=True),
            "<h2>Tags</h2>",
            _list([_tag_link(t) for t in tags], raw=True),
        ]
        _write_html(base / "items" / f"{slug(item_id)}.html", item_id, "\n".join(body), depth=2)


def _render_fluid_pages(base, recipe_graph):
    ids = sorted(fluid_ids(recipe_graph))
    _write_html(base / "fluids" / "index.html", "Fluids", "<h1>Fluids</h1>" + _list([_fluid_link(i) for i in ids], raw=True), depth=2)
    for fluid_id in ids:
        tags = _tags_containing(recipe_graph.tags.get("fluid_tags") or {}, fluid_id)
        body = [
            f"<h1>{_h(fluid_id)}</h1>",
            f"<p><b>Namespace:</b> {_h(namespace(fluid_id))}</p>",
            "<h2>Produced By</h2>",
            _list([_recipe_link(r) for r in recipe_graph.fluid_produced_by.get(fluid_id, [])], raw=True),
            "<h2>Consumed By</h2>",
            _list([_recipe_link(r) for r in recipe_graph.fluid_used_in.get(fluid_id, [])], raw=True),
            "<h2>Tags</h2>",
            _list([_tag_link(t) for t in tags], raw=True),
        ]
        _write_html(base / "fluids" / f"{slug(fluid_id)}.html", fluid_id, "\n".join(body), depth=2)


def _render_recipe_pages(base, recipe_graph):
    _write_html(base / "recipes" / "index.html", "Recipes", "<h1>Recipes</h1>" + _list([_recipe_link(r) for r in recipe_graph.recipes], raw=True), depth=2)
    for recipe in recipe_graph.recipes:
        raw = json.dumps(recipe.get("raw", recipe), indent=2, sort_keys=True)
        body = [
            f"<h1>{_h(recipe.get('id', 'unknown'))}</h1>",
            f"<p><b>Type:</b> {_h(recipe.get('type', 'unknown'))} | <b>Parsed:</b> {_h(recipe.get('parsed', True))}</p>",
            "<h2>Inputs</h2>", _list([_entry_link(e) for e in recipe.get("inputs", [])], raw=True),
            "<h2>Outputs</h2>", _list([_entry_link(e) for e in recipe.get("outputs", [])], raw=True),
            "<h2>Fluid Inputs</h2>", _list([_entry_link(e) for e in recipe.get("fluids_in", [])], raw=True),
            "<h2>Fluid Outputs</h2>", _list([_entry_link(e) for e in recipe.get("fluids_out", [])], raw=True),
            "<h2>Requirements</h2>", f"<pre>{_h(json.dumps(recipe.get('requirements', {}), indent=2))}</pre>",
            "<h2>Raw</h2>", f"<pre>{_h(raw)}</pre>",
        ]
        _write_html(base / "recipes" / f"{slug(recipe.get('id', 'unknown'))}.html", recipe.get("id", "Recipe"), "\n".join(body), depth=2)


def _render_machine_pages(base, recipe_graph):
    machine_map = {}
    for recipe in recipe_graph.recipes:
        for machine in recipe.get("machines", []) or []:
            mid = machine.get("id")
            if mid:
                machine_map.setdefault(mid, []).append(recipe)
    _write_html(base / "machines" / "index.html", "Machines", "<h1>Machines</h1>" + _list([_machine_link(m) for m in sorted(machine_map)], raw=True), depth=2)
    for mid, recipes in machine_map.items():
        _write_html(base / "machines" / f"{slug(mid)}.html", mid, f"<h1>{_h(mid)}</h1>" + _list([_recipe_link(r) for r in recipes], raw=True), depth=2)


def _render_mod_pages(base, recipe_graph):
    mods = recipe_graph.mods.get("mods") if isinstance(recipe_graph.mods.get("mods"), dict) else {}
    _write_html(base / "mods" / "index.html", "Mods", "<h1>Mods</h1>" + _list(sorted(mods.keys())), depth=2)
    for modid, meta in mods.items():
        body = f"<h1>{_h(meta.get('name', modid))}</h1><p><b>ID:</b> {_h(modid)}</p><p><b>Version:</b> {_h(meta.get('version', 'UNKNOWN'))}</p>"
        _write_html(base / "mods" / f"{slug(modid)}.html", modid, body, depth=2)


def _render_tag_pages(base, recipe_graph):
    tags = {}
    tags.update(recipe_graph.tags.get("item_tags") or {})
    tags.update(recipe_graph.tags.get("fluid_tags") or {})
    _write_html(base / "tags" / "index.html", "Tags", "<h1>Tags</h1>" + _list([_tag_link(t) for t in sorted(tags)], raw=True), depth=2)
    for tag, values in tags.items():
        _write_html(base / "tags" / f"{slug(tag)}.html", tag, f"<h1>{_h(tag)}</h1>" + _list(values), depth=2)


def _render_reports(base, recipe_graph, validation):
    _write_html(base / "reports" / "unparsed-recipes.html", "Unparsed Recipes", "<h1>Unparsed Recipes</h1>" + _list([_recipe_link(r) for r in recipe_graph.unparsed], raw=True), depth=2)
    _write_html(base / "reports" / "policy-violations.html", "Policy Violations", "<h1>Policy Violations</h1>" + _list([f"{v['severity']}: {v['policy']} - {v['message']}" for v in validation["policy_violations"]]), depth=2)


def _write_graph_page(path, title, data_src, global_name, depth):
    body = f"""
    <h1>{_h(title)}</h1>
    <div class="toolbar">
      <input id="graph-search" placeholder="Search graph">
      <select id="graph-kind"><option value="">All node types</option></select>
    </div>
    <div id="graph"></div>
    <aside id="graph-details">Select a node.</aside>
    <script src="{_rel(depth)}assets/cytoscape.min.js"></script>
    <script src="{data_src}"></script>
    <script>window.GRAPH_DATA = window.{global_name};</script>
    <script src="{_rel(depth)}assets/graph.js"></script>
    """
    _write_html(path, title, body, depth=depth)


def _quest_graph_data(graph):
    nodes = [{"id": key, "kind": "quest", "label": node.title, "chapter": node.chapter, "stage": node.stage, "url": "quests/" + slug(key) + ".html"} for key, node in graph.nodes.items()]
    edges = [{"source": dep, "target": key, "kind": "requires"} for key, node in graph.nodes.items() for dep in node.requires]
    return {"nodes": nodes, "edges": edges}


def _write_static_assets(site_dir):
    css = """
    :root { --ink:#172017; --paper:#f5efe1; --panel:#fffaf0; --accent:#56704b; --line:#c9b98f; }
    body { margin:0; font:16px/1.45 Georgia, 'Times New Roman', serif; background:linear-gradient(135deg,#f5efe1,#e9ddc0); color:var(--ink); }
    main { max-width:1200px; margin:0 auto; padding:32px; }
    a { color:#375f37; } .hero { padding:24px; border:2px solid var(--line); background:var(--panel); box-shadow:8px 8px 0 #d5c594; }
    .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:14px; margin:24px 0; }
    .card, .link-grid a { background:var(--panel); border:1px solid var(--line); padding:16px; text-decoration:none; }
    .card strong { display:block; font-size:32px; } .link-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; }
    pre { overflow:auto; background:#1b2118; color:#eff6df; padding:12px; }
    #graph { height:640px; border:1px solid var(--line); background:#fffdf7; margin-top:12px; }
    #graph-details { margin-top:12px; padding:12px; background:var(--panel); border:1px solid var(--line); }
    .toolbar { display:flex; gap:8px; } input, select { padding:8px; border:1px solid var(--line); background:white; }
    """
    graph_js = """
    (function(){
      const data = window.GRAPH_DATA || {nodes:[], edges:[]};
      const kind = document.getElementById('graph-kind');
      const search = document.getElementById('graph-search');
      const details = document.getElementById('graph-details');
      const kinds = Array.from(new Set(data.nodes.map(n=>n.kind))).sort();
      kinds.forEach(k=>{ const o=document.createElement('option'); o.value=k; o.textContent=k; kind.appendChild(o); });
      const cy = cytoscape({
        container: document.getElementById('graph'),
        elements: [
          ...data.nodes.map(n=>({data:n})),
          ...data.edges.map((e,i)=>({data:{id:'e'+i, ...e}}))
        ],
        style: [
          { selector:'node', style:{ label:'data(label)', 'background-color':'#6d875f', color:'#172017', 'font-size':10, 'text-wrap':'wrap', 'text-max-width':120 }},
          { selector:'edge', style:{ width:2, 'line-color':'#b79e58', 'target-arrow-color':'#b79e58', 'target-arrow-shape':'triangle', 'curve-style':'bezier' }},
          { selector:'.faded', style:{ opacity:0.12 }}
        ],
        layout:{ name:'cose', animate:false }
      });
      function applyFilter(){
        const q=(search.value||'').toLowerCase(), k=kind.value;
        cy.nodes().forEach(n=>{
          const d=n.data(); const hit=(!q || String(d.label).toLowerCase().includes(q) || String(d.id).toLowerCase().includes(q)) && (!k || d.kind===k);
          n.style('display', hit ? 'element':'none');
        });
      }
      search.addEventListener('input', applyFilter); kind.addEventListener('change', applyFilter);
      cy.on('tap','node',evt=>{ const d=evt.target.data(); details.innerHTML='<b>'+d.label+'</b><br>ID: '+d.id+'<br>Type: '+d.kind; cy.elements().addClass('faded'); evt.target.removeClass('faded'); evt.target.connectedEdges().removeClass('faded').connectedNodes().removeClass('faded'); });
      cy.on('dbltap','node',evt=>{ const u=evt.target.data('url'); if(u) location.href=u; });
    })();
    """
    cytoscape_stub = """
    if (!window.cytoscape) {
      window.cytoscape = function(opts) {
        var el = opts.container; el.innerHTML = '<p style="padding:1rem">Graph data loaded. Add a real cytoscape.min.js for interactive layout.</p><pre>'+JSON.stringify((window.GRAPH_DATA||{}), null, 2)+'</pre>';
        return { nodes:function(){return []}, elements:function(){return {addClass:function(){}}}, on:function(){} };
      };
    }
    """
    (site_dir / "assets" / "site.css").write_text(css, encoding="utf-8")
    (site_dir / "assets" / "graph.js").write_text(graph_js, encoding="utf-8")
    (site_dir / "assets" / "cytoscape.min.js").write_text(cytoscape_stub, encoding="utf-8")


def _write_json_js(path, name, data):
    path.write_text(f"window.{name} = {json.dumps(data, indent=2)};\n", encoding="utf-8")


def _write_html(path, title, body, depth):
    path.parent.mkdir(parents=True, exist_ok=True)
    rel = _rel(depth)
    text = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>{_h(title)}</title><link rel="stylesheet" href="{rel}assets/site.css"></head>
<body><main><p><a href="{rel}index.html">Pack Cockpit</a></p>{body}</main></body></html>
"""
    path.write_text(text, encoding="utf-8")


def _rel(depth):
    return "../" * depth


def _card(label, value):
    return f'<div class="card"><span>{_h(label)}</span><strong>{_h(value)}</strong></div>'


def _list(items, raw=False):
    if not items:
        return "<p><em>None.</em></p>"
    return "<ul>" + "".join(f"<li>{item if raw else _h(item)}</li>" for item in items) + "</ul>"


def _quest_link(node, prefix="quests/"):
    return f'<a href="{prefix}{slug(node.key)}.html">{_h(node.title)}</a>'


def _item_link(item_id):
    return f'<a href="{slug(item_id)}.html">{_h(item_id)}</a>'


def _fluid_link(fluid_id):
    return f'<a href="{slug(fluid_id)}.html">{_h(fluid_id)}</a>'


def _tag_link(tag):
    return f'<a href="../tags/{slug(tag)}.html">{_h(tag)}</a>'


def _machine_link(machine):
    return f'<a href="{slug(machine)}.html">{_h(machine)}</a>'


def _recipe_link(recipe):
    rid = recipe.get("id", "unknown")
    return f'<a href="../recipes/{slug(rid)}.html">{_h(rid)}</a> <small>{_h(recipe.get("type", ""))}</small>'


def _entry_link(entry):
    if not isinstance(entry, dict):
        return _h(entry)
    eid = entry.get("id", "UNKNOWN")
    kind = entry.get("kind", "unknown")
    if kind == "item":
        return f'<a href="../items/{slug(eid)}.html">{_h(eid)}</a>'
    if kind == "fluid":
        return f'<a href="../fluids/{slug(eid)}.html">{_h(eid)}</a>'
    if kind == "tag":
        return f'<a href="../tags/{slug(eid)}.html">#{_h(eid)}</a>'
    return _h(json.dumps(entry))


def _render_task(task):
    if not isinstance(task, dict):
        return _h(task)
    if task.get("type") == "item":
        return f'Item: <a href="../../recipes/items/{slug(task.get("item"))}.html">{_h(task.get("item"))}</a> x{_h(task.get("count", 1))}'
    return _h(json.dumps(task))


def _render_reward(reward):
    if not isinstance(reward, dict):
        return _h(reward)
    if reward.get("type") == "item":
        return f'Item: <a href="../../recipes/items/{slug(reward.get("item"))}.html">{_h(reward.get("item"))}</a> x{_h(reward.get("count", 1))}'
    return _h(json.dumps(reward))


def _tags_containing(tags, value):
    return [tag for tag, values in tags.items() if value in values]


def _h(value):
    return html.escape(str(value))


if __name__ == "__main__":
    main()

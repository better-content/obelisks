from __future__ import annotations


def recipe_graph_data(graph, quest_graph):
    nodes = []
    edges = []
    seen = set()

    def add_node(node_id, kind, label, url=""):
        if node_id in seen:
            return
        seen.add(node_id)
        nodes.append({"id": node_id, "kind": kind, "label": label, "url": url})

    for recipe in graph.recipes:
        rid = recipe.get("id", "unknown")
        add_node("recipe:" + rid, "recipe", rid, "../recipes/recipes/" + _slug(rid) + ".html")
        for machine in recipe.get("machines", []) or []:
            mid = machine.get("id")
            if mid:
                add_node("machine:" + mid, "machine", machine.get("label", mid), "../recipes/machines/" + _slug(mid) + ".html")
                edges.append({"source": "machine:" + mid, "target": "recipe:" + rid, "kind": "runs"})
        for entry in recipe.get("inputs", []) or []:
            _entry_edge(add_node, edges, entry, "recipe:" + rid, "input")
        for entry in recipe.get("outputs", []) or []:
            _entry_edge(add_node, edges, entry, "recipe:" + rid, "output", reverse=True)
    for key, node in quest_graph.nodes.items():
        add_node("quest:" + key, "quest", node.title, "../quests/quests/" + _slug(key) + ".html")
        for task in node.tasks:
            if isinstance(task, dict) and task.get("item"):
                iid = task["item"]
                add_node("item:" + iid, "item", iid, "../recipes/items/" + _slug(iid) + ".html")
                edges.append({"source": "item:" + iid, "target": "quest:" + key, "kind": "task"})
    return {"nodes": nodes, "edges": edges}


def _entry_edge(add_node, edges, entry, recipe_node, kind, reverse=False):
    if not isinstance(entry, dict):
        return
    entry_kind = entry.get("kind")
    entry_id = entry.get("id")
    if not entry_id:
        return
    url_kind = "items" if entry_kind == "item" else "fluids" if entry_kind == "fluid" else "tags"
    node_id = entry_kind + ":" + entry_id
    add_node(node_id, entry_kind, entry_id, "../recipes/" + url_kind + "/" + _slug(entry_id) + ".html")
    if reverse:
        edges.append({"source": recipe_node, "target": node_id, "kind": kind})
    else:
        edges.append({"source": node_id, "target": recipe_node, "kind": kind})


def _slug(value: str) -> str:
    return str(value).replace(":", "__").replace("/", "_").replace("#", "tag_")

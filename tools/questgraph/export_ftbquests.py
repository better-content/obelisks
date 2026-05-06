from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

from .model import QuestGraph


def stable_ftb_id(kind: str, key: str) -> str:
    digest = hashlib.sha1(f"{kind}:{key}".encode("utf-8")).hexdigest().upper()
    return digest[:16]


def export_ftbquests(graph: QuestGraph, out_dir: str) -> None:
    root = Path(out_dir)
    chapters_dir = root / "quests" / "chapters"
    chapters_dir.mkdir(parents=True, exist_ok=True)
    _write(root / "quests" / "data.snbt", _render_data())
    _write(root / "quests" / "chapter_groups.snbt", _render_chapter_groups())
    for chapter_key, chapter in sorted(graph.chapters.items(), key=lambda item: item[1].order):
        nodes = [node for node in graph.nodes.values() if node.chapter == chapter_key]
        _write(chapters_dir / f"{chapter_key}.snbt", _render_chapter(chapter, nodes))
    _write(root / "README.md", "Generated FTB Quests export. Do not edit live quest files directly.\n")


def _write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def _render_data() -> str:
    return "{\n\tdefault_team: true\n}\n"


def _render_chapter_groups() -> str:
    return "{\n\tgroups: [{\n\t\tid: \"default\",\n\t\ttitle: \"Obelisks\",\n\t\torder_index: 0\n\t}]\n}\n"


def _render_chapter(chapter, nodes) -> str:
    lines = [
        "{",
        f'\tid: "{stable_ftb_id("chapter", chapter.key)}",',
        '\tgroup: "default",',
        f'\ttitle: "{_q(chapter.title)}",',
        f'\ticon: "{_q(chapter.icon)}",',
        f"\torder_index: {chapter.order},",
        '\tquests: ['
    ]
    for i, node in enumerate(nodes):
        rendered = _render_node(node)
        suffix = "," if i < len(nodes) - 1 else ""
        lines.extend("\t\t" + line for line in rendered.splitlines())
        if suffix:
            lines[-1] += suffix
    lines.extend(["\t]", "}"])
    return "\n".join(lines) + "\n"


def _render_node(node) -> str:
    deps = ", ".join(f'"{stable_ftb_id("quest", dep)}"' for dep in node.requires)
    desc = ", ".join(json.dumps(line) for line in node.body.strip().splitlines() if line.strip())
    lines = [
        "{",
        f'\tid: "{stable_ftb_id("quest", node.key)}",',
        f'\ttitle: "{_q(node.title)}",',
        f'\ticon: "{_q(node.icon)}",',
        '\tshape: "rsquare",',
        "\tsize: 1.0d,",
        f"\tx: {float(node.x):.1f}d,",
        f"\ty: {float(node.y):.1f}d,",
    ]
    if node.requires:
        lines.append(f"\tdependencies: [{deps}],")
    if desc:
        lines.append(f"\tdescription: [{desc}],")
    lines.append(f"\ttasks: [{', '.join(_render_task(node, idx, task) for idx, task in enumerate(node.tasks))}],")
    lines.append(f"\trewards: [{', '.join(_render_reward(node, idx, reward) for idx, reward in enumerate(node.rewards))}]")
    lines.append("}")
    return "\n".join(lines)


def _render_task(node, idx, task):
    if task.get("type") == "item":
        count = int(task.get("count", 1))
        return f'{{id: "{stable_ftb_id("task", node.key + ":" + str(idx))}", type: "item", item: "{_q(task["item"])}", count: {count}}}'
    return f'{{id: "{stable_ftb_id("task", node.key + ":" + str(idx))}", type: "unknown"}}'


def _render_reward(node, idx, reward):
    if reward.get("type") == "item":
        count = int(reward.get("count", 1))
        return f'{{id: "{stable_ftb_id("reward", node.key + ":" + str(idx))}", type: "item", item: "{_q(reward["item"])}", count: {count}}}'
    return f'{{id: "{stable_ftb_id("reward", node.key + ":" + str(idx))}", type: "unknown"}}'


def _q(value: str) -> str:
    return str(value).replace("\\", "\\\\").replace('"', '\\"')

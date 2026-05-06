from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .simple_yaml import load_yaml


@dataclass
class Chapter:
    key: str
    title: str
    order: int
    icon: str
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class QuestNode:
    key: str
    title: str
    chapter: str
    icon: str
    stage: str
    x: float
    y: float
    body: str
    requires: list[str]
    tasks: list[dict[str, Any]]
    rewards: list[dict[str, Any]]
    tags: list[str]
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class QuestGraph:
    meta: dict[str, Any]
    chapters: dict[str, Chapter]
    nodes: dict[str, QuestNode]

    def reverse_edges(self) -> dict[str, list[str]]:
        out = {key: [] for key in self.nodes}
        for key, node in self.nodes.items():
            for dep in node.requires:
                out.setdefault(dep, []).append(key)
        return out


def load_quest_graph(path: str) -> QuestGraph:
    data = load_yaml(path)
    chapters = {}
    for key, raw in (data.get("chapters") or {}).items():
        chapters[key] = Chapter(
            key=key,
            title=str(raw.get("title", "")),
            order=int(raw.get("order", 0)),
            icon=str(raw.get("icon", "")),
            raw=raw,
        )
    nodes = {}
    for key, raw in (data.get("nodes") or {}).items():
        nodes[key] = QuestNode(
            key=key,
            title=str(raw.get("title", "")),
            chapter=str(raw.get("chapter", "")),
            icon=str(raw.get("icon", "")),
            stage=str(raw.get("stage", "")),
            x=float(raw.get("x", 0)),
            y=float(raw.get("y", 0)),
            body=str(raw.get("body", "")),
            requires=list(raw.get("requires") or []),
            tasks=list(raw.get("tasks") or []),
            rewards=list(raw.get("rewards") or []),
            tags=list(raw.get("tags") or []),
            raw=raw,
        )
    return QuestGraph(meta=dict(data.get("meta") or {}), chapters=chapters, nodes=nodes)


def collect_item_refs(graph: QuestGraph) -> set[str]:
    refs = set()
    for chapter in graph.chapters.values():
        if chapter.icon:
            refs.add(chapter.icon)
    for node in graph.nodes.values():
        if node.icon:
            refs.add(node.icon)
        for task in node.tasks:
            if isinstance(task, dict) and task.get("item"):
                refs.add(str(task["item"]))
        for reward in node.rewards:
            if isinstance(reward, dict) and reward.get("item"):
                refs.add(str(reward["item"]))
    return refs

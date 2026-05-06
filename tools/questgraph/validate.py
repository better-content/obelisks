from __future__ import annotations

import argparse
import re
from dataclasses import dataclass, field

from .model import QuestGraph, load_quest_graph

ID_RE = re.compile(r"^[a-z0-9_./-]+:[a-z0-9_./-]+$")


@dataclass
class ValidationResult:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.errors


def validate_graph(graph: QuestGraph, known_items: set[str] | None = None, hard_unknown_items: bool = False) -> ValidationResult:
    result = ValidationResult()
    if not graph.meta:
        result.errors.append("missing meta")
    if not graph.chapters:
        result.errors.append("no chapters defined")
    if not graph.nodes:
        result.errors.append("no quest nodes defined")

    for key, chapter in graph.chapters.items():
        if not chapter.title:
            result.errors.append(f"chapter {key}: missing title")
        if not chapter.icon:
            result.warnings.append(f"chapter {key}: missing icon")
        elif not ID_RE.match(chapter.icon):
            result.warnings.append(f"chapter {key}: icon is not a registry id: {chapter.icon}")

    for key, node in graph.nodes.items():
        if node.raw.get("type") != "quest":
            result.errors.append(f"node {key}: unsupported or missing type")
        if node.chapter not in graph.chapters:
            result.errors.append(f"node {key}: unknown chapter {node.chapter}")
        for field_name in ("title", "icon", "stage", "body"):
            if not getattr(node, field_name):
                message = f"node {key}: missing {field_name}"
                if field_name in ("icon", "body"):
                    result.warnings.append(message)
                else:
                    result.errors.append(message)
        for dep in node.requires:
            if dep not in graph.nodes:
                result.errors.append(f"node {key}: missing dependency node {dep}")
        for task in node.tasks:
            _validate_task(result, key, task)
            _validate_ref(result, key, "task item", task.get("item") if isinstance(task, dict) else None, known_items, hard_unknown_items)
        for reward in node.rewards:
            _validate_reward(result, key, reward)
            _validate_ref(result, key, "reward item", reward.get("item") if isinstance(reward, dict) else None, known_items, hard_unknown_items)

    _validate_cycles(graph, result)
    reverse = graph.reverse_edges()
    for key, deps in reverse.items():
        if not graph.nodes[key].requires and not deps:
            result.warnings.append(f"node {key}: orphan quest")
        elif not deps:
            result.warnings.append(f"node {key}: no outgoing edges")

    return result


def _validate_task(result, node_key, task):
    if not isinstance(task, dict):
        result.errors.append(f"node {node_key}: invalid task shape")
        return
    task_type = task.get("type")
    if task_type == "item":
        if not task.get("item"):
            result.errors.append(f"node {node_key}: item task missing item")
    elif task_type == "fluid":
        if not task.get("fluid"):
            result.errors.append(f"node {node_key}: fluid task missing fluid")
    elif task_type == "entity":
        if not task.get("entity"):
            result.errors.append(f"node {node_key}: entity task missing entity")
    else:
        result.errors.append(f"node {node_key}: unsupported task type {task_type}")


def _validate_reward(result, node_key, reward):
    if not isinstance(reward, dict):
        result.errors.append(f"node {node_key}: invalid reward shape")
        return
    reward_type = reward.get("type")
    if reward_type == "item":
        if not reward.get("item"):
            result.errors.append(f"node {node_key}: item reward missing item")
    else:
        result.errors.append(f"node {node_key}: unsupported reward type {reward_type}")


def _validate_ref(result, node_key, label, item_id, known_items, hard_unknown_items):
    if not item_id:
        return
    item_id = str(item_id)
    if not ID_RE.match(item_id):
        result.errors.append(f"node {node_key}: invalid {label} id {item_id}")
    elif known_items is None:
        result.warnings.append(f"node {node_key}: {label} unchecked without registry dump: {item_id}")
    elif item_id not in known_items:
        message = f"node {node_key}: unknown {label} id {item_id}"
        if hard_unknown_items:
            result.errors.append(message)
        else:
            result.warnings.append(message)


def _validate_cycles(graph: QuestGraph, result: ValidationResult):
    visiting = set()
    visited = set()

    def visit(key, stack):
        if key in visiting:
            result.errors.append("dependency cycle: " + " -> ".join(stack + [key]))
            return
        if key in visited:
            return
        visiting.add(key)
        for dep in graph.nodes[key].requires:
            if dep in graph.nodes:
                visit(dep, stack + [key])
        visiting.remove(key)
        visited.add(key)

    for key in graph.nodes:
        visit(key, [])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("graph", nargs="?", default="quests/graph.yml")
    args = parser.parse_args()
    result = validate_graph(load_quest_graph(args.graph))
    for warning in result.warnings:
        print(f"warning: {warning}")
    for error in result.errors:
        print(f"error: {error}")
    print(f"quest graph validation: errors={len(result.errors)} warnings={len(result.warnings)}")
    raise SystemExit(0 if result.ok else 1)


if __name__ == "__main__":
    main()

from __future__ import annotations

from dataclasses import dataclass, field

from tools.questgraph.simple_yaml import load_yaml


@dataclass
class PolicyReport:
    violations: list[dict] = field(default_factory=list)

    @property
    def errors(self) -> list[dict]:
        return [v for v in self.violations if v.get("severity") == "error"]

    @property
    def warnings(self) -> list[dict]:
        return [v for v in self.violations if v.get("severity") != "error"]


def apply_policies(graph, policy_path: str) -> PolicyReport:
    data = load_yaml(policy_path)
    report = PolicyReport()
    for key, policy in (data.get("policies") or {}).items():
        target = policy.get("target") or {}
        if target.get("kind") != "item":
            continue
        item_id = target.get("id")
        if not item_id or item_id == "UNKNOWN":
            report.violations.append(_violation(key, policy, "target item is UNKNOWN"))
            continue
        producers = graph.produced_by.get(item_id, [])
        if policy.get("must_have_recipe") and not producers:
            report.violations.append(_violation(key, policy, f"{item_id} has no recipe"))
        if policy.get("must_have_use") and item_id not in graph.used_in:
            report.violations.append(_violation(key, policy, f"{item_id} has no recipe use"))
        allowed = set(policy.get("allowed_recipe_types") or [])
        if allowed:
            for recipe in producers:
                if recipe.get("type") not in allowed:
                    report.violations.append(_violation(key, policy, f"{item_id} produced by disallowed type {recipe.get('type')} in {recipe.get('id')}"))
        forbidden = set(policy.get("forbidden_recipe_types") or [])
        for recipe in producers:
            if recipe.get("type") in forbidden:
                report.violations.append(_violation(key, policy, f"{item_id} produced by forbidden type {recipe.get('type')} in {recipe.get('id')}"))
        required_any = set(policy.get("must_require_any") or [])
        if required_any and producers:
            for recipe in producers:
                inputs = {entry.get("id") for entry in recipe.get("inputs", []) if isinstance(entry, dict)}
                if not inputs.intersection(required_any):
                    report.violations.append(_violation(key, policy, f"{recipe.get('id')} does not require one of {sorted(required_any)}"))
        if policy.get("recipe_type_must_be_parsed"):
            for recipe in producers:
                if recipe.get("parsed") is False:
                    report.violations.append(_violation(key, policy, f"{recipe.get('id')} is unparsed"))
    return report


def _violation(key, policy, message):
    return {
        "policy": key,
        "severity": policy.get("severity", "warning"),
        "description": policy.get("description", ""),
        "message": message,
    }

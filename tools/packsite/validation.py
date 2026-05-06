from __future__ import annotations


def combined_validation_summary(quest_result, recipe_result, policy_report, icon_manifest):
    missing_icons = sum(1 for path in icon_manifest.values() if path.endswith("missing.png"))
    return {
        "errors": len(quest_result.errors) + len(recipe_result.errors) + len(policy_report.errors),
        "warnings": len(quest_result.warnings) + len(recipe_result.warnings) + len(policy_report.warnings),
        "quest_errors": quest_result.errors,
        "quest_warnings": quest_result.warnings,
        "recipe_errors": recipe_result.errors,
        "recipe_warnings": recipe_result.warnings,
        "policy_violations": policy_report.violations,
        "missing_icons": missing_icons,
    }

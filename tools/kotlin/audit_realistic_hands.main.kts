#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Paths

val root = Paths.get("").toAbsolutePath().normalize()
val blockTagPath = root.resolve("generated/custom-mod-sources/better-content-fixes/src/main/resources/data/bcfixes/tags/blocks/realistic_hands/axe.json")
val itemTagPath = root.resolve("generated/custom-mod-sources/better-content-fixes/src/main/resources/data/bcfixes/tags/items/realistic_hands/tools/axe.json")
val quarantinePath = root.resolve("generated/custom-mod-sources/better-content-fixes/quarantine/realistic-hands-exhaustive-policy")
val outputJsonPath = root.resolve("generated/runtime-dumps/realistic_hands_audit.json")
val outputMdPath = root.resolve("generated/runtime-dumps/realistic_hands_audit.md")

fun requireMarker(path: java.nio.file.Path, marker: String) {
    require(Files.exists(path)) { "missing ${root.relativize(path)}" }
    require(marker in Files.readString(path)) { "${root.relativize(path)} is missing $marker" }
}

requireMarker(blockTagPath, "#minecraft:logs")
requireMarker(itemTagPath, "#forge:tools/axes")
require(Files.exists(quarantinePath.resolve("README.md"))) { "missing quarantined exhaustive policy" }

Files.createDirectories(outputJsonPath.parent)
Files.writeString(outputJsonPath, """{
  "schema": "better_content.realistic_hands.no_tree_punching_audit.v2",
  "generatedBy": "tools/kotlin/audit_realistic_hands.main.kts",
  "policy": "no_tree_punching",
  "blockTag": "#minecraft:logs",
  "toolTag": "#forge:tools/axes",
  "quarantine": "generated/custom-mod-sources/better-content-fixes/quarantine/realistic-hands-exhaustive-policy"
}
""")
Files.writeString(outputMdPath, """# Realistic Hands Audit

- Active policy: no tree punching
- Gated blocks: `#minecraft:logs`
- Accepted tools: `#forge:tools/axes`
- Exhaustive policy: quarantined outside runtime resources
""")

println("wrote ${root.relativize(outputJsonPath)}")
println("wrote ${root.relativize(outputMdPath)}")

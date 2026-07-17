#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Paths
import kotlin.system.exitProcess

val root = Paths.get("").toAbsolutePath().normalize()
val contractPath = root.resolve("tools/progression_milestones_contract.json")
val playerPath = root.resolve("kubejs/config/player_progression_regression.json")
val contract = Files.readString(contractPath)
val player = Files.readString(playerPath)
val errors = mutableListOf<String>()

if (!contract.contains("\"schema\": \"bc.progression_milestones_contract.v1\"")) errors += "missing or invalid contract schema"
if (!contract.contains("\"sourceManifest\": \"kubejs/config/player_progression_regression.json\"")) errors += "contract must name player progression manifest"

val expectedTierMatch = Regex("\"expectedTierOrder\"\\s*:\\s*\\[(.*?)]", RegexOption.DOT_MATCHES_ALL).find(player)
val tiers = expectedTierMatch?.groupValues?.get(1)?.let { Regex("\"([^\"]+)\"").findAll(it).map { match -> match.groupValues[1] }.toSet() }.orEmpty()
if (tiers.isEmpty()) errors += "player progression manifest has no expected tiers"

val phaseChunks = contract.split("\n    {\n      \"id\": ").drop(1)
if (phaseChunks.isEmpty()) errors += "contract has no phases"
val ids = mutableSetOf<String>()
fun stringsFromArray(section: String, name: String): List<String> =
    Regex("\"$name\"\\s*:\\s*\\[(.*?)]", RegexOption.DOT_MATCHES_ALL)
        .find(section)
        ?.groupValues
        ?.get(1)
        ?.let { raw -> Regex("\"([^\"]+)\"").findAll(raw).map { it.groupValues[1] }.toList() }
        .orEmpty()

for (chunk in phaseChunks) {
    val id = chunk.trimStart().removePrefix("\"").substringBefore('"')
    val section = chunk.substringBefore("\n    }")
    if (!ids.add(id)) errors += "duplicate phase id: $id"
    val tier = Regex("\"tier\": \"([^\"]+)\"").find(section)?.groupValues?.get(1)
    if (tier == null) errors += "$id has no tier" else if (tier !in tiers) errors += "$id references unknown tier $tier"
    val outputs = stringsFromArray(section, "expectedOutputs")
    val recipeIds = stringsFromArray(section, "recipeIds")
    val recipeTypes = stringsFromArray(section, "recipeTypes")
    if (outputs.isEmpty()) errors += "$id has no expected output"
    if (recipeIds.isEmpty()) errors += "$id has no recipe id list"
    if (recipeTypes.isEmpty()) errors += "$id has no recipe type list"
    if (recipeTypes.size != 1 && recipeTypes.size != recipeIds.size) errors += "$id recipeTypes must have one value or match recipeIds size"
    stringsFromArray(section, "dependsOn").forEach { dependency ->
        if (dependency == id) errors += "$id depends on itself"
    }
    stringsFromArray(section, "dataChecks").forEach { dataCheck ->
        if (!Files.exists(root.resolve(dataCheck))) errors += "$id data check path missing: $dataCheck"
    }
}
for (chunk in phaseChunks) {
    val id = chunk.trimStart().removePrefix("\"").substringBefore('"')
    val section = chunk.substringBefore("\n    }")
    stringsFromArray(section, "dependsOn").forEach { dependency ->
        if (dependency !in ids) errors += "$id depends on unknown phase $dependency"
    }
}

val manifestIds = Regex("\"milestones\"\\s*:\\s*\\[(.*?)]\\s*,\\s*\"forbiddenBypassOutputs\"", RegexOption.DOT_MATCHES_ALL)
    .find(player)
    ?.groupValues
    ?.get(1)
    ?.let { Regex("\"id\"\\s*:\\s*\"([^\"]+)\"").findAll(it).map { match -> match.groupValues[1] }.toSet() }
    .orEmpty()
if (manifestIds.isEmpty()) {
    errors += "player progression manifest has no milestone IDs"
} else {
    val missing = manifestIds.filterNot(ids::contains).sorted()
    val extra = ids.filterNot(manifestIds::contains).sorted()
    if (missing.isNotEmpty()) errors += "contract missing manifest milestones: ${missing.joinToString(", ")}"
    if (extra.isNotEmpty()) errors += "contract has phases not in manifest: ${extra.joinToString(", ")}"
}

if (errors.isNotEmpty()) {
    errors.forEach { System.err.println("FAIL - $it") }
    exitProcess(1)
}
println("progression milestones contract validates (${ids.size} phases, ${tiers.size} tiers)")

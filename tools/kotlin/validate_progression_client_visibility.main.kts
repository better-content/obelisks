#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import kotlin.io.path.isRegularFile
import kotlin.system.exitProcess

val root = Paths.get("").toAbsolutePath().normalize()
var runtimeDir: Path? = null
var index = 0
while (index < args.size) {
    when (args[index]) {
        "--runtime-dir" -> {
            runtimeDir = Paths.get(args.getOrNull(index + 1) ?: error("--runtime-dir needs a path")).toAbsolutePath().normalize()
            index += 2
        }
        "--help" -> {
            println("Usage: kotlin tools/kotlin/validate_progression_client_visibility.main.kts [--runtime-dir PATH]")
            exitProcess(0)
        }
        else -> error("unknown argument: ${args[index]}")
    }
}

fun read(path: Path): String = if (Files.isRegularFile(path)) Files.readString(path) else ""
fun stringsFromArray(text: String, name: String): List<String> =
    Regex("\"$name\"\\s*:\\s*\\[(.*?)]", RegexOption.DOT_MATCHES_ALL)
        .findAll(text)
        .flatMap { match -> Regex("\"([^\"]+)\"").findAll(match.groupValues[1]).map { it.groupValues[1] } }
        .toList()

val contractText = read(root.resolve("tools/progression_milestones_contract.json"))
val manifestText = read(root.resolve("kubejs/config/player_progression_regression.json"))
val errors = mutableListOf<String>()
if (!contractText.contains("\"schema\": \"bc.progression_milestones_contract.v1\"")) errors += "missing progression milestone contract"
if (!manifestText.contains("\"schema\": \"bc.player_progression_regression.v1\"")) errors += "missing player progression manifest"

val recipeIds = stringsFromArray(contractText, "recipeIds").distinct().filterNot { it.startsWith("kubejs:bloodmagic/50_") }
val milestoneOutputs = stringsFromArray(manifestText.substringBefore("\"forbiddenBypassOutputs\""), "outputs").distinct()
val forbiddenBypassOutputs = stringsFromArray(manifestText, "forbiddenBypassOutputs").toSet()

val evidenceTexts = mutableListOf<Pair<String, String>>()
fun addEvidence(path: Path) {
    if (Files.isRegularFile(path)) evidenceTexts += path.toString() to read(path)
}
runtimeDir?.let { dir ->
    addEvidence(dir.resolve("generated/runtime-dumps/recipes.json"))
    addEvidence(dir.resolve("recipes.json"))
    val kubejsConfig = dir.resolve("kubejs/config")
    val manifest = kubejsConfig.resolve("full_recipe_index_manifest.json")
    addEvidence(manifest)
    if (Files.isRegularFile(manifest)) {
        Files.list(kubejsConfig).use { stream ->
            stream.filter { it.fileName.toString().matches(Regex("""full_recipe_index_\d{4}\.json""")) }
                .sorted()
                .forEach(::addEvidence)
        }
    }
}
addEvidence(root.resolve("generated/runtime-dumps/recipes.json"))
Files.walk(root.resolve("kubejs")).use { stream ->
    stream.filter { it.isRegularFile() && (it.toString().endsWith(".js") || it.toString().endsWith(".json")) }
        .forEach(::addEvidence)
}

fun evidenceContains(value: String): Boolean = evidenceTexts.any { (_, text) -> value in text }
fun recipeEvidenceContains(value: String): Boolean =
    evidenceContains(value) || (value.startsWith("kubejs:") && evidenceContains(value.substringAfterLast('/')))

val missingRecipes = recipeIds.filterNot(::recipeEvidenceContains)
if (missingRecipes.isNotEmpty()) errors += "progression recipe IDs lack recipe-viewer evidence: ${missingRecipes.joinToString(", ")}"

val clientHideText = Files.walk(root.resolve("kubejs/client_scripts")).use { stream ->
    stream.filter { it.isRegularFile() && it.toString().endsWith(".js") }
        .toList()
        .joinToString("\n") { read(it) }
}
if ("JEIEvents.hideItems" !in clientHideText) errors += "client JEI hide hook missing"
if ("EMIEvents.hideItems" !in clientHideText) errors += "client EMI hide hook missing"

val hiddenMilestoneOutputs = milestoneOutputs.filter { output ->
    val hideWindows = Regex("""(?s)(JEIEvents\.hideItems|EMIEvents\.hideItems).*?(?=JEIEvents\.hideItems|EMIEvents\.hideItems|$)""")
        .findAll(clientHideText)
        .map { it.value }
    hideWindows.any { output in it }
}
if (hiddenMilestoneOutputs.isNotEmpty()) errors += "milestone outputs are hidden from recipe viewers: ${hiddenMilestoneOutputs.joinToString(", ")}"

val hiddenForbiddenOutputs = forbiddenBypassOutputs.filter { output -> output in clientHideText }
println("progression client visibility evidence: ${recipeIds.size - missingRecipes.size}/${recipeIds.size} recipe ids, ${milestoneOutputs.size} milestone outputs, ${hiddenForbiddenOutputs.size} hidden forbidden outputs")

if (errors.isNotEmpty()) {
    errors.forEach { System.err.println("FAIL - $it") }
    exitProcess(1)
}

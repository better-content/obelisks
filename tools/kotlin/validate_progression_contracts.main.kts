#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Paths
import kotlin.system.exitProcess

val root = Paths.get("").toAbsolutePath().normalize()
val files = listOf(
    "kubejs/config/tech_parenting.json" to listOf("\"schema\": \"bc.tech_parenting.v1\"", "\"entries\"", "\"era\": \"survival\""),
    "kubejs/config/magic_parenting.json" to listOf("\"schema\": \"bc.magic_parenting.v1\"", "\"entries\"", "\"mod\": \"bloodmagic\""),
    "kubejs/config/economy_acquisition.json" to listOf("\"schema\": \"bc.economy_acquisition.v1\"", "\"entries\"", "\"policy\": \"currency_only\""),
    "kubejs/config/surface_registry.json" to listOf("\"schema\": \"bc.surface_registry.v1\"", "\"recipe_surface_types\"", "\"acquisition_surface_types\""),
)
val failures = mutableListOf<String>()

for ((path, needles) in files) {
    val abs = root.resolve(path)
    if (!Files.isRegularFile(abs)) {
        failures += "missing $path"
        continue
    }
    val text = Files.readString(abs)
    val missing = needles.filterNot(text::contains)
    if (missing.isNotEmpty()) failures += "$path missing ${missing.joinToString(", ")}"
}

if (failures.isNotEmpty()) {
    failures.forEach { System.err.println("FAIL - $it") }
    exitProcess(1)
}

println("progression contracts validate")

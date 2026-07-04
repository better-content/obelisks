#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Paths
import kotlin.system.exitProcess

val contractPath = Paths.get("").toAbsolutePath().normalize().resolve("tools/worldgen_sampling_contract.json")
if (!Files.isRegularFile(contractPath)) {
    System.err.println("FAIL - missing tools/worldgen_sampling_contract.json")
    exitProcess(1)
}
val text = Files.readString(contractPath)
val requiredNeedles = listOf(
    "\"schema\": \"btm.worldgen_sampling_contract.v1\"",
    "\"scenario\": \"worldgen_sampling\"",
    "\"quick\"",
    "\"release\"",
    "\"seedCount\": 3",
    "\"seedCount\": 12",
    "\"starter_viability\"",
    "\"hard_log_scan\"",
)
val missing = requiredNeedles.filterNot(text::contains)
if (missing.isNotEmpty()) {
    System.err.println("FAIL - worldgen sampling contract is missing: ${missing.joinToString(", ")}")
    exitProcess(1)
}
println("worldgen sampling contracts validate")

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
    "\"schema\": \"bc.worldgen_sampling_contract.v1\"",
    "\"scenario\": \"worldgen_sampling\"",
    "\"quick\"",
    "\"release\"",
    "\"seedCount\": 3",
    "\"seedCount\": 12",
    "\"replacement_ore_density\"",
    "\"replacement_ore_diversity\"",
    "\"vanilla_ore_exclusion\"",
    "\"adlod_surface_signal\"",
    "\"tectonic_depth\"",
    "\"hard_log_scan\"",
)
val missing = requiredNeedles.filterNot(text::contains)
if (missing.isNotEmpty()) {
    System.err.println("FAIL - worldgen sampling contract is missing: ${missing.joinToString(", ")}")
    exitProcess(1)
}
println("worldgen sampling contracts validate")

val root = Paths.get("").toAbsolutePath().normalize()
val auditPath = root.resolve("tools/kotlin/audit_unearthed_replacement.main.kts")
val bcPath = root.resolve("tools/bc.main.kts")
val stressPath = root.resolve("tools/kotlin/dimension_worldgen_stress.main.kts")
if (!Files.isRegularFile(auditPath)) {
    System.err.println("FAIL - missing Unearthed replacement audit")
    exitProcess(1)
}
val audit = Files.readString(auditPath)
val bc = Files.readString(bcPath)
val stress = Files.readString(stressPath)
val launcherPath = root.resolve("tools/kotlin/worldgen_sampling.main.kts")
val launcher = if (Files.isRegularFile(launcherPath)) Files.readString(launcherPath) else ""
val requiredAuditNeedles = listOf(
    "bc.unearthed_replacement_audit.v1",
    "MAX_UNDERGROUND_ROCK_RATIO",
    "MAX_ABOVEGROUND_ROCK_RATIO",
    "MAX_ABOVEGROUND_SURFACE_HOST_RATIO",
    "MIN_ABOVEGROUND_REGOLITH_PER_CHUNK",
    "minecraft:deepslate",
    "minecraft:tuff",
)
val missingAudit = requiredAuditNeedles.filterNot(audit::contains)
if (missingAudit.isNotEmpty()) {
    System.err.println("FAIL - Unearthed replacement audit contract is missing: ${missingAudit.joinToString(", ")}")
    exitProcess(1)
}
val requiredBcNeedles = listOf(
    "tools/bc test unearthed-replacement --instance PATH",
    "unearthed_replacement_audit",
    "runUnearthedReplacementAudit(serverDir, null, unearthedAuditPath)",
)
val missingBc = requiredBcNeedles.filterNot(bc::contains)
if (missingBc.isNotEmpty()) {
    System.err.println("FAIL - bc Unearthed replacement integration is missing: ${missingBc.joinToString(", ")}")
    exitProcess(1)
}
if (!stress.contains("tools/bc") || !stress.contains("unearthed-replacement") || !stress.contains("unearthed-replacement-audit.json")) {
    System.err.println("FAIL - dimension worldgen sampling does not run the Unearthed replacement regression guard")
    exitProcess(1)
}
println("Unearthed replacement regression contract validates")

val oreAuditPath = root.resolve("kubejs/server_scripts/90_dev_debug/55_ore_worldgen_audit.js")
val oreAudit = if (Files.isRegularFile(oreAuditPath)) Files.readString(oreAuditPath) else ""
val requiredOreNeedles = listOf(
    "bc_ore_audit",
    "BC_FORBIDDEN_VANILLA_ORES",
    "[BC-ORE-AUDIT]",
    "surface_samples=",
)
val missingOreAudit = requiredOreNeedles.filterNot(oreAudit::contains)
if (missingOreAudit.isNotEmpty() || !stress.contains("realistic_ore_blocks") || !stress.contains("vanilla_ore_blocks")) {
    System.err.println("FAIL - ore worldgen regression integration is incomplete")
    exitProcess(1)
}
println("ore worldgen regression contract validates")

if (!launcher.contains("\"local\" -> listOf(\"--cycles\", \"1\", \"--dimensions\", \"minecraft:overworld\", \"--radius\", \"4\"")) {
    System.err.println("FAIL - local worldgen sampling must retain the 81-chunk ADLOD census floor")
    exitProcess(1)
}
println("local ADLOD census floor validates")

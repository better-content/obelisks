#!/usr/bin/env kotlin

import java.io.ByteArrayOutputStream
import java.nio.file.Path
import java.nio.file.Paths
import kotlin.system.exitProcess

data class StaticStep(
    val label: String,
    val command: List<String>,
    val workDir: Path = repo,
    val extraEnv: Map<String, String> = emptyMap(),
)

data class StepResult(val exitCode: Int, val output: String)

val repo: Path = Paths.get("").toAbsolutePath().normalize()

fun runStep(step: StaticStep): StepResult {
    println("==> ${step.label}")
    val process = ProcessBuilder(step.command)
        .directory(step.workDir.toFile())
        .redirectErrorStream(true)
        .apply { environment().putAll(step.extraEnv) }
        .start()
    val buffer = ByteArrayOutputStream()
    process.inputStream.copyTo(buffer)
    val exitCode = process.waitFor()
    val output = buffer.toString(Charsets.UTF_8).trim()
    if (output.isNotBlank()) {
        println(output)
    }
    return StepResult(exitCode, output)
}

val steps = listOf(
    StaticStep("validate Kotlin tool surface", listOf("kotlin", repo.resolve("tools/kotlin/validate_kotlin_tool_surface.main.kts").toString())),
    StaticStep("validate tool/doc surface", listOf("tools/bc", "internal", "validate-tool-doc-surface")),
    StaticStep("check KubeJS syntax", listOf("tools/bc", "internal", "check-js-syntax")),
    StaticStep("check JSON surface", listOf("tools/bc", "internal", "check-json-surface")),
    StaticStep("validate BetterGrassify grass blocks", listOf("tools/bc", "internal", "validate-bettergrassify-grass-blocks")),
    StaticStep("validate pack contract", listOf("tools/bc", "internal", "validate-pack-contract")),
    StaticStep("check contract completeness", listOf("tools/bc", "internal", "contract-completeness-report", "--check", "--no-write")),
    StaticStep("validate autonomous contracts", listOf("tools/bc", "internal", "validate-autonomous-contracts")),
    StaticStep(
        "audit indirect casing economy",
        listOf("kotlin", repo.resolve("tools/kotlin/audit_indirect_casing_economy.main.kts").toString(), "--check"),
        extraEnv = mapOf("OUT_DIR" to repo.resolve("generated/validation/indirect_casing_audit").toString()),
    ),
    StaticStep("validate KubeJS assets", listOf("tools/bc", "internal", "validate-kubejs-assets")),
    StaticStep("validate Dynamic Trees coverage", listOf("tools/bc", "internal", "validate-dynamic-trees-coverage")),
    StaticStep("validate chemistry identity", listOf("tools/bc", "internal", "validate-chemistry-identity")),
    StaticStep("validate synthesis pipeline", listOf("tools/bc", "internal", "validate-synthesis-pipeline")),
    StaticStep("validate progression contracts", listOf("kotlin", repo.resolve("tools/kotlin/validate_progression_contracts.main.kts").toString())),
    StaticStep("validate player progression contracts", listOf("tools/bc", "internal", "validate-player-progression-contracts")),
    StaticStep("validate progression reachability", listOf("tools/bc", "internal", "validate-progression-reachability")),
    StaticStep("validate Burnt coverage", listOf("tools/bc", "internal", "validate-burnt-coverage")),
    StaticStep("validate LC/TFTH/DH contracts", listOf("kotlin", repo.resolve("tools/kotlin/validate_lc_tfth_dh_contracts.main.kts").toString())),
    StaticStep("validate VS ships contracts", listOf("kotlin", repo.resolve("tools/kotlin/validate_vs_ships_contracts.main.kts").toString())),
)

for (step in steps) {
    val result = runStep(step)
    if (result.exitCode != 0) exitProcess(result.exitCode)
}

exitProcess(0)

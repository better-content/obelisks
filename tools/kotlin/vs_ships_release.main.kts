#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.time.Instant
import java.util.concurrent.TimeUnit
import kotlin.io.path.createDirectories
import kotlin.system.exitProcess

data class ReleaseRun(val name: String, val command: List<String>, val runRoot: Path, val exitCode: Int, val durationMs: Long)

val root = Paths.get("").toAbsolutePath().normalize()
var runRoot = Paths.get("/tmp/bc-vs-ships-release")
var bootstrapMode = "once"
var keepGoing = false
var keepRuns = false
var basePort = 25570
var index = 0
fun usage(message: String? = null): Nothing {
    message?.let(System.err::println)
    System.err.println("Usage: tools/bc test scenario-headful vs_ships_release [--bootstrap-mode always|once|never] [--run-root PATH] [--port N] [--keep-going] [--keep-runs]")
    exitProcess(2)
}
while (index < args.size) when (args[index]) {
    "--bootstrap-mode" -> { bootstrapMode = args.getOrNull(index + 1) ?: usage("--bootstrap-mode needs a value"); index += 2 }
    "--run-root" -> { runRoot = Paths.get(args.getOrNull(index + 1) ?: usage("--run-root needs a path")); index += 2 }
    "--port" -> { basePort = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--port needs a number"); index += 2 }
    "--keep-going" -> { keepGoing = true; index++ }
    "--keep-runs" -> { keepRuns = true; index++ }
    "--help" -> usage()
    else -> usage("unknown argument: ${args[index]}")
}
if (bootstrapMode !in setOf("always", "once", "never")) usage("invalid bootstrap mode: $bootstrapMode")
runRoot = runRoot.toAbsolutePath().normalize()
runRoot.createDirectories()

val specifications = mutableListOf<Pair<String, List<String>>>()
specifications += "server_lifecycle" to listOf("test", "scenario", "vs_ships_stability", "--profile", "release", "--cycles", "1", "--port", basePort.toString())
specifications += "isolation_matrix" to listOf("test", "scenario", "vs_ships_matrix", "--profile", "release", "--cycles", "1", "--port", (basePort + 1).toString(), "--keep-going")
val fixtures = listOf("core", "clockwork", "trackwork", "combined")
fixtures.forEachIndexed { fixtureIndex, fixture ->
    specifications += "client_${fixture}_current" to listOf("test", "scenario-headful", "vs_ships_client", "--profile", "release", "--fixture", fixture, "--variant", "current", "--port", (basePort + 20 + fixtureIndex).toString())
}
listOf("dh_disabled", "c2me_disabled", "dh_c2me_disabled").forEachIndexed { variantIndex, variant ->
    specifications += "client_combined_$variant" to listOf("test", "scenario-headful", "vs_ships_client", "--profile", "release", "--fixture", "combined", "--variant", variant, "--port", (basePort + 30 + variantIndex).toString())
}

val results = mutableListOf<ReleaseRun>()
for ((name, baseArgs) in specifications) {
    val childRoot = runRoot.resolve(name)
    val command = listOf(root.resolve("tools/bc").toString()) + baseArgs + listOf("--bootstrap-mode", bootstrapMode, "--run-root", childRoot.toString()) + if (keepRuns) listOf("--keep-runs") else emptyList()
    val started = System.nanoTime()
    val process = ProcessBuilder(command).directory(root.toFile()).inheritIO().start()
    val finished = process.waitFor(3, TimeUnit.HOURS)
    if (!finished) process.destroyForcibly()
    val exit = if (finished) process.exitValue() else 124
    results += ReleaseRun(name, command, childRoot, exit, (System.nanoTime() - started) / 1_000_000)
    if (exit != 0 && !keepGoing) break
}
val passed = results.size == specifications.size && results.all { it.exitCode == 0 }
fun q(value: String) = "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\""
Files.writeString(runRoot.resolve("summary.json"), buildString {
    appendLine("{")
    appendLine("  \"scenario\": \"vs_ships_release\",")
    appendLine("  \"status\": ${q(if (passed) "passed" else "failed")},")
    appendLine("  \"completed_at\": ${q(Instant.now().toString())},")
    appendLine("  \"results\": [")
    appendLine(results.joinToString(",\n") { "    {\"name\":${q(it.name)},\"exit_code\":${it.exitCode},\"duration_ms\":${it.durationMs},\"run_root\":${q(it.runRoot.toString())},\"command\":${q(it.command.joinToString(" "))}}" })
    appendLine("  ]")
    appendLine("}")
})
println("vs_ships_release: ${if (passed) "passed" else "failed"} (${results.size}/${specifications.size} lanes completed)")
exitProcess(if (passed) 0 else 1)

#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import kotlin.io.path.exists
import kotlin.system.exitProcess

fun jsonEscape(value: String): String = buildString {
    value.forEach { ch ->
        when (ch) {
            '\\' -> append("\\\\")
            '"' -> append("\\\"")
            '\n' -> append("\\n")
            '\r' -> append("\\r")
            '\t' -> append("\\t")
            else -> append(ch)
        }
    }
}

val root = Paths.get("").toAbsolutePath().normalize()
var runRoot: Path? = null
var index = 0
while (index < args.size) {
    when (args[index]) {
        "--run-root" -> {
            runRoot = Paths.get(args.getOrNull(index + 1) ?: error("--run-root needs a path")).toAbsolutePath().normalize()
            index += 2
        }
        "--bootstrap-mode", "--port" -> index += 2
        "--keep-runs" -> index += 1
        "--help" -> {
            println("Usage: tools/bc test scenario-headful revival [--bootstrap-mode always|once|never] [--run-root PATH] [--port N] [--keep-runs]")
            exitProcess(0)
        }
        else -> error("unknown argument: ${args[index]}")
    }
}

val runtime = runRoot ?: Paths.get(System.getProperty("user.home"), ".cache", "bc", "revival")
val forwarded = mutableListOf("--profile", "quick")
forwarded += args
if (runRoot == null) forwarded += listOf("--run-root", runtime.toString())

val smoke = ProcessBuilder(
    listOf("kotlin", root.resolve("tools/kotlin/client_smoke.main.kts").toString()) + forwarded
).directory(root.toFile()).inheritIO().start()
val smokeExit = smoke.waitFor()
if (smokeExit != 0) exitProcess(smokeExit)

val mods = runtime.resolve("mods")
val revivalJar = Files.list(mods).use { files ->
    files.filter { it.fileName.toString().matches(Regex("revival-[0-9].*\\.jar")) }.findFirst().orElse(null)
}
val oldReviveArtifacts = Files.list(mods).use { files ->
    files.filter { it.fileName.toString().contains("playerrevive", ignoreCase = true) }.map { it.fileName.toString() }.toList()
}
val config = runtime.resolve("config/revival-common.toml")
val log = runtime.resolve("logs/latest.log")
val logText = if (log.exists()) Files.readString(log) else ""
val checks = linkedMapOf(
    "revival_runtime_jar" to (revivalJar != null),
    "playerrevive_absent" to oldReviveArtifacts.isEmpty(),
    "authored_config_synced" to config.exists(),
    "client_or_server_log_mentions_revival" to logText.contains("revival", ignoreCase = true),
)
val ok = checks.values.all { it }
val evidence = runtime.resolve("evidence")
Files.createDirectories(evidence)
val summary = evidence.resolve("revival-summary.json")
Files.writeString(summary, buildString {
    appendLine("{")
    appendLine("  \"schema\": \"bc.revival.v1\",")
    appendLine("  \"status\": \"${if (ok) "PASS" else "FAIL"}\",")
    appendLine("  \"runtime\": \"${jsonEscape(runtime.toString())}\",")
    appendLine("  \"checks\": {")
    checks.entries.forEachIndexed { checkIndex, (name, value) ->
        append("    \"${jsonEscape(name)}\": $value")
        appendLine(if (checkIndex == checks.size - 1) "" else ",")
    }
    appendLine("  },")
    appendLine("  \"old_playerrevive_artifacts\": [${oldReviveArtifacts.joinToString(",") { "\"${jsonEscape(it)}\"" }}]")
    appendLine("}")
})
println("Revival scenario ${if (ok) "passed" else "failed"}: $summary")
exitProcess(if (ok) 0 else 1)

#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Paths
import kotlin.system.exitProcess

fun deleteTree(path: java.nio.file.Path) {
    if (!Files.exists(path)) return
    Files.walk(path).use { stream ->
        stream.sorted(java.util.Comparator.reverseOrder()).forEach { Files.deleteIfExists(it) }
    }
}

fun usage(message: String? = null): Nothing {
    if (message != null) System.err.println(message)
    System.err.println("Usage: tools/bc test scenario-headful client_smoke --profile quick|release [--bootstrap-mode always|once|never] [--run-root PATH] [--keep-runs]")
    exitProcess(2)
}

var profile: String? = null
var bootstrapMode = "always"
var keepRuns = false
var runRoot: String? = null
var port: String? = System.getenv("BC_HARNESS_ACTUAL_PORT")?.takeIf { it.isNotBlank() }
var index = 0
while (index < args.size) {
    when (args[index]) {
        "--profile" -> {
            profile = args.getOrNull(index + 1) ?: usage("--profile needs quick or release")
            index += 2
        }
        "--bootstrap-mode" -> {
            bootstrapMode = args.getOrNull(index + 1) ?: usage("--bootstrap-mode needs always, once, or never")
            if (bootstrapMode !in setOf("always", "once", "never")) usage("invalid bootstrap mode: $bootstrapMode")
            index += 2
        }
        "--keep-runs" -> {
            keepRuns = true
            index += 1
        }
        "--run-root" -> {
            runRoot = args.getOrNull(index + 1) ?: usage("--run-root needs a path")
            index += 2
        }
        "--port" -> {
            port = args.getOrNull(index + 1) ?: usage("--port needs a number")
            if (!port!!.all(Char::isDigit)) usage("--port needs a number")
            index += 2
        }
        "--help" -> usage()
        else -> usage("unknown argument: ${args[index]}")
    }
}

val selected = profile ?: usage("--profile is required")
if (selected !in setOf("quick", "release")) usage("invalid profile: $selected")

val contract = ProcessBuilder("tools/bc", "internal", "validate-client-smoke-contracts")
    .directory(Paths.get("").toAbsolutePath().normalize().toFile())
    .inheritIO()
    .start()
val contractExit = contract.waitFor()
if (contractExit != 0) exitProcess(contractExit)

val runtimeDir = runRoot?.let { Paths.get(it) }
    ?: Paths.get(System.getProperty("user.home"), ".cache", "bc", if (selected == "quick") "client-smoke-quick" else "client-smoke-release")
val smokePort = port ?: if (selected == "quick") "25567" else "25568"
if (!keepRuns && bootstrapMode != "never" && Files.exists(runtimeDir)) {
    deleteTree(runtimeDir)
}

val smokeBuilder = ProcessBuilder(
    "tools/bc",
    "test",
    "smoke",
    "--server-dir",
    runtimeDir.toString(),
    "--port",
    smokePort,
    "--bootstrap-mode",
    bootstrapMode,
    *if (bootstrapMode == "always" || bootstrapMode == "once") arrayOf("--reset-runtime") else emptyArray(),
)
    .directory(Paths.get("").toAbsolutePath().normalize().toFile())
smokeBuilder.inheritIO()
smokeBuilder.environment().putAll(
    listOf(
        "BC_HARNESS_STATUS_PATH",
        "BC_HARNESS_SUMMARY_PATH",
        "BC_HARNESS_PIDS_PATH",
        "BC_HARNESS_LOCK_PATH",
        "BC_HARNESS_LATEST_STATUS_PATH",
        "BC_HARNESS_LATEST_SUMMARY_PATH",
        "BC_HARNESS_REQUESTED_PORT",
        "BC_HARNESS_ACTUAL_PORT",
    ).mapNotNull { key -> System.getenv(key)?.let { key to it } }.toMap(),
)
val smoke = smokeBuilder.start()
val smokeExit = smoke.waitFor()
if (smokeExit != 0) exitProcess(smokeExit)

if (selected == "release") {
    val visibility = ProcessBuilder(
        "kotlin",
        "tools/kotlin/validate_progression_client_visibility.main.kts",
        "--runtime-dir",
        runtimeDir.toString(),
    )
        .directory(Paths.get("").toAbsolutePath().normalize().toFile())
        .inheritIO()
        .start()
    exitProcess(visibility.waitFor())
}

exitProcess(0)

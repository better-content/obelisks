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
    System.err.println("Usage: tools/btm test scenario-headful client_smoke --profile quick|release [--keep-runs]")
    exitProcess(2)
}

var profile: String? = null
var keepRuns = false
var index = 0
while (index < args.size) {
    when (args[index]) {
        "--profile" -> {
            profile = args.getOrNull(index + 1) ?: usage("--profile needs quick or release")
            index += 2
        }
        "--keep-runs" -> {
            keepRuns = true
            index += 1
        }
        "--help" -> usage()
        else -> usage("unknown argument: ${args[index]}")
    }
}

val selected = profile ?: usage("--profile is required")
if (selected !in setOf("quick", "release")) usage("invalid profile: $selected")

val contract = ProcessBuilder("tools/btm", "internal", "validate-client-smoke-contracts")
    .directory(Paths.get("").toAbsolutePath().normalize().toFile())
    .inheritIO()
    .start()
val contractExit = contract.waitFor()
if (contractExit != 0) exitProcess(contractExit)

val runtimeDir = Paths.get("/tmp", if (selected == "quick") "btm-client-smoke-quick" else "btm-client-smoke-release")
val smokePort = if (selected == "quick") "25567" else "25568"
if (!keepRuns && Files.exists(runtimeDir)) {
    deleteTree(runtimeDir)
}

val smoke = ProcessBuilder(
    "tools/btm",
    "test",
    "smoke",
    "--server-dir",
    runtimeDir.toString(),
    "--port",
    smokePort,
    "--reset-runtime",
)
    .directory(Paths.get("").toAbsolutePath().normalize().toFile())
    .inheritIO()
    .start()
exitProcess(smoke.waitFor())

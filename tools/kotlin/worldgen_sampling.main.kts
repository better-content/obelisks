#!/usr/bin/env kotlin

import java.nio.file.Paths
import kotlin.system.exitProcess

fun usage(message: String? = null): Nothing {
    if (message != null) System.err.println(message)
    System.err.println("Usage: tools/btm test scenario worldgen_sampling --profile quick|release|local [--bootstrap-mode always|once|never] [--keep-going] [--keep-runs]")
    exitProcess(2)
}

var profile: String? = null
var bootstrapMode = "always"
var port: String? = System.getenv("BTM_HARNESS_ACTUAL_PORT")?.takeIf { it.isNotBlank() }
val passthrough = mutableListOf<String>()
var index = 0
while (index < args.size) {
    when (args[index]) {
        "--profile" -> {
            profile = args.getOrNull(index + 1) ?: usage("--profile needs quick, release, or local")
            index += 2
        }
        "--bootstrap-mode" -> {
            bootstrapMode = args.getOrNull(index + 1) ?: usage("--bootstrap-mode needs always, once, or never")
            if (bootstrapMode !in setOf("always", "once", "never")) usage("invalid bootstrap mode: $bootstrapMode")
            index += 2
        }
        "--port" -> {
            port = args.getOrNull(index + 1) ?: usage("--port needs a number")
            if (!port!!.all(Char::isDigit)) usage("--port needs a number")
            index += 2
        }
        "--help" -> usage()
        else -> {
            passthrough += args[index]
            index += 1
        }
    }
}

val selected = profile ?: usage("--profile is required")
val mappedArgs = when (selected) {
    "local" -> listOf("--cycles", "1", "--dimensions", "minecraft:overworld", "--radius", "1", "--samples", "1", "--server-only")
    "quick" -> listOf("--cycles", "1", "--dimensions", "minecraft:overworld", "--radius", "2", "--samples", "1", "--server-only")
    "release" -> listOf("--cycles", "1", "--dimensions", "minecraft:overworld,lostcities:lostcity,creatingspace:earth_orbit", "--radius", "4", "--samples", "3", "--server-only")
    else -> usage("invalid profile: $selected")
}

val root = Paths.get("").toAbsolutePath().normalize()
val contract = ProcessBuilder("tools/btm", "internal", "validate-worldgen-sampling-contracts")
    .directory(root.toFile())
    .inheritIO()
    .start()
val contractExit = contract.waitFor()
if (contractExit != 0) exitProcess(contractExit)

val backend = root.resolve("tools/kotlin/dimension_worldgen_stress.main.kts")
val command = mutableListOf<String>()
command += listOf("kotlin", backend.toString())
command += mappedArgs
command += listOf("--bootstrap-mode", bootstrapMode)
if (port != null) command += listOf("--port", port!!)
command += passthrough
val builder = ProcessBuilder(command).directory(root.toFile())
builder.inheritIO()
builder.environment().putAll(
    listOf(
        "BTM_HARNESS_STATUS_PATH",
        "BTM_HARNESS_SUMMARY_PATH",
        "BTM_HARNESS_PIDS_PATH",
        "BTM_HARNESS_LOCK_PATH",
        "BTM_HARNESS_LATEST_STATUS_PATH",
        "BTM_HARNESS_LATEST_SUMMARY_PATH",
        "BTM_HARNESS_REQUESTED_PORT",
        "BTM_HARNESS_ACTUAL_PORT",
    ).mapNotNull { key -> System.getenv(key)?.let { key to it } }.toMap(),
)
val process = builder.start()
exitProcess(process.waitFor())

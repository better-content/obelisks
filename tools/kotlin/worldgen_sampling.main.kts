#!/usr/bin/env kotlin

import java.nio.file.Paths
import kotlin.system.exitProcess

fun usage(message: String? = null): Nothing {
    if (message != null) System.err.println(message)
    System.err.println("Usage: tools/btm test scenario worldgen_sampling --profile quick|release [--keep-going] [--keep-runs]")
    exitProcess(2)
}

var profile: String? = null
val passthrough = mutableListOf<String>()
var index = 0
while (index < args.size) {
    when (args[index]) {
        "--profile" -> {
            profile = args.getOrNull(index + 1) ?: usage("--profile needs quick or release")
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
val process = ProcessBuilder(listOf("kotlin", backend.toString()) + mappedArgs + passthrough)
    .directory(root.toFile())
    .inheritIO()
    .start()
exitProcess(process.waitFor())

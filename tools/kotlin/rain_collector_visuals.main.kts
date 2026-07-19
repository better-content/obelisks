#!/usr/bin/env kotlin

import java.nio.file.Paths
import kotlin.system.exitProcess

val root = Paths.get("").toAbsolutePath().normalize()
val command = listOf(
    "kotlin",
    root.resolve("tools/kotlin/worldgen_marketing_screenshots.main.kts").toString(),
    "--fixture",
    "rain-collector",
) + args
val process = ProcessBuilder(command).directory(root.toFile()).inheritIO().start()
exitProcess(process.waitFor())

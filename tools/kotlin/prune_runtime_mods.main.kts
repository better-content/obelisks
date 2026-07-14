#!/usr/bin/env kotlin

import java.nio.file.Paths
import kotlin.system.exitProcess

val root = Paths.get("").toAbsolutePath().normalize()

val forwarded = listOf("internal", "prune-runtime-mods") + args.toList()
val process = ProcessBuilder(listOf(root.resolve("tools/bc").toString()) + forwarded)
    .directory(root.toFile())
    .inheritIO()
    .start()
exitProcess(process.waitFor())

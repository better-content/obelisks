#!/usr/bin/env kotlin

import java.nio.file.Paths
import kotlin.system.exitProcess

val root = Paths.get("").toAbsolutePath().normalize()

fun fail(message: String): Nothing {
    System.err.println("ERROR: $message")
    exitProcess(2)
}

val forwarded = buildList {
    var index = 0
    while (index < args.size) {
        when (val arg = args[index]) {
            "--pack-root" -> index += 2
            else -> {
                add(arg)
                if (arg.startsWith("--") && arg !in setOf("--apply", "--dry-run")) {
                    add(args.getOrNull(index + 1) ?: fail("$arg needs a value"))
                    index += 2
                } else {
                    index += 1
                }
            }
        }
    }
    addAll(0, listOf("internal", "resolve-packwiz-downloads"))
}

val process = ProcessBuilder(listOf(root.resolve("tools/bc").toString()) + forwarded)
    .directory(root.toFile())
    .inheritIO()
    .start()
exitProcess(process.waitFor())

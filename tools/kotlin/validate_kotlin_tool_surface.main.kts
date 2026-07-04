#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import kotlin.system.exitProcess

val root = Paths.get("").toAbsolutePath().normalize()
val toolsDir = root.resolve("tools")
val quarantineDir = toolsDir.resolve("quarantine")
val offenders = mutableListOf<String>()

Files.walk(toolsDir).use { stream ->
    stream
        .filter { Files.isRegularFile(it) }
        .forEach { path ->
            if (path.startsWith(quarantineDir)) return@forEach
            val name = path.fileName.toString()
            if (name.endsWith(".py") || name.endsWith(".sh")) {
                offenders += root.relativize(path).toString().replace('\\', '/')
            }
        }
}

if (offenders.isEmpty()) {
    println("kotlin tool surface validates: no active .py or .sh files remain under tools/")
    exitProcess(0)
}

System.err.println("FAIL - active tools surface still contains non-Kotlin source files:")
offenders.sorted().forEach { System.err.println(it) }
exitProcess(1)

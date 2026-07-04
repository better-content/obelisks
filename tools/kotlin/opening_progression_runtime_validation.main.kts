#!/usr/bin/env kotlin

import java.io.BufferedWriter
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.util.Comparator
import java.util.concurrent.TimeUnit
import kotlin.io.path.createDirectories
import kotlin.io.path.exists
import kotlin.system.exitProcess

data class ScenarioConfig(
    val cycles: Int,
    val timeoutSeconds: Int,
    val basePort: Int,
    val keepGoing: Boolean,
    val keepRuns: Boolean,
    val runRoot: Path,
)

data class RunningServer(val process: Process, val stdin: BufferedWriter?, val logPath: Path)

fun usage(message: String? = null): Nothing {
    if (message != null) System.err.println(message)
    System.err.println("Usage: tools/btm test scenario opening_progression [--cycles N] [--timeout N] [--port N] [--run-root PATH] [--keep-going] [--keep-runs]")
    exitProcess(2)
}

fun parseConfig(args: Array<String>): ScenarioConfig {
    var cycles = 1
    var timeoutSeconds = 240
    var basePort = 25565
    var keepGoing = false
    var keepRuns = false
    var runRoot = Paths.get("/tmp/btm-opening-progression")
    var index = 0
    while (index < args.size) {
        when (args[index]) {
            "--cycles" -> {
                cycles = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--cycles needs a positive integer")
                index += 2
            }
            "--timeout" -> {
                timeoutSeconds = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--timeout needs a positive integer")
                index += 2
            }
            "--port" -> {
                basePort = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--port needs a positive integer")
                index += 2
            }
            "--run-root" -> {
                runRoot = Paths.get(args.getOrNull(index + 1) ?: usage("--run-root needs a path")).toAbsolutePath().normalize()
                index += 2
            }
            "--keep-going" -> {
                keepGoing = true
                index += 1
            }
            "--keep-runs" -> {
                keepRuns = true
                index += 1
            }
            "--help" -> usage()
            else -> usage("unknown argument: ${args[index]}")
        }
    }
    if (cycles <= 0) usage("--cycles must be >= 1")
    if (timeoutSeconds <= 0) usage("--timeout must be >= 1")
    if (basePort <= 0) usage("--port must be >= 1")
    return ScenarioConfig(cycles, timeoutSeconds, basePort, keepGoing, keepRuns, runRoot)
}

fun deleteTree(path: Path) {
    if (!Files.exists(path)) return
    Files.walk(path).use { stream ->
        stream.sorted(Comparator.reverseOrder()).forEach { Files.deleteIfExists(it) }
    }
}

fun runCommand(command: List<String>, root: Path, inheritIo: Boolean = true): Int {
    val builder = ProcessBuilder(command).directory(root.toFile())
    if (inheritIo) builder.inheritIO()
    val process = builder.start()
    return process.waitFor()
}

fun ensureSmokeBootstrapped(root: Path, serverDir: Path, port: Int) {
    val exit = runCommand(
        listOf(
            "tools/btm",
            "test",
            "smoke",
            "--server-dir",
            serverDir.toString(),
            "--port",
            port.toString(),
            "--reset-runtime",
        ),
        root,
    )
    if (exit != 0) exitProcess(exit)
}

fun startServer(serverDir: Path, port: Int, evidenceDir: Path): RunningServer {
    val logPath = evidenceDir.resolve("server-console.log")
    val builder = ProcessBuilder(listOf("./run.sh", "nogui"))
        .directory(serverDir.toFile())
        .redirectErrorStream(true)
        .redirectOutput(logPath.toFile())
    builder.environment()["BTM_SERVER_PORT"] = port.toString()
    val process = builder.start()
    return RunningServer(process, process.outputStream.bufferedWriter(), logPath)
}

fun tailText(path: Path, limit: Long = 512_000): String {
    if (!path.exists()) return ""
    val file = path.toFile()
    file.inputStream().use { input ->
        val skip = (file.length() - limit).coerceAtLeast(0)
        input.skip(skip)
        return input.readBytes().toString(Charsets.UTF_8)
    }
}

fun waitForPattern(paths: List<Path>, pattern: Regex, timeoutSeconds: Int, process: Process, phase: String) {
    val deadline = System.currentTimeMillis() + timeoutSeconds * 1000L
    while (System.currentTimeMillis() < deadline) {
        if (!process.isAlive) error("$phase exited with ${process.exitValue()}")
        if (paths.any { pattern.containsMatchIn(tailText(it)) }) return
        Thread.sleep(1000)
    }
    error("$phase timed out after ${timeoutSeconds}s")
}

fun sendCommand(server: RunningServer, command: String) {
    server.stdin?.apply {
        write(command)
        newLine()
        flush()
    }
}

fun stopServer(server: RunningServer?) {
    if (server == null || !server.process.isAlive) return
    try {
        sendCommand(server, "stop")
        server.process.waitFor(60, TimeUnit.SECONDS)
    } catch (_: Exception) {
    }
    if (server.process.isAlive) {
        server.process.destroy()
        if (!server.process.waitFor(20, TimeUnit.SECONDS)) server.process.destroyForcibly()
    }
}

val root = Paths.get("").toAbsolutePath().normalize()
val config = parseConfig(args)
config.runRoot.createDirectories()

val passPattern = Regex("""OPENING_PROGRESSION_VALIDATION PASS""", RegexOption.IGNORE_CASE)
val failPattern = Regex("""OPENING_PROGRESSION_VALIDATION FAIL|Unknown or incomplete command""", RegexOption.IGNORE_CASE)
val readyPattern = Regex("""Done \([\d.]+s\)! For help, type "help"""")

var failed = false
for (cycle in 1..config.cycles) {
    val cycleRoot = config.runRoot.resolve("cycle-$cycle")
    val serverDir = cycleRoot.resolve("server")
    val evidenceDir = cycleRoot.resolve("evidence")
    if (!config.keepRuns) deleteTree(cycleRoot)
    evidenceDir.createDirectories()

    println("cycle $cycle/${config.cycles}: smoke bootstrap")
    ensureSmokeBootstrapped(root, serverDir, config.basePort + cycle - 1)

    var server: RunningServer? = null
    try {
        server = startServer(serverDir, config.basePort + cycle - 1, evidenceDir)
        val logs = listOf(serverDir.resolve("logs/latest.log"), server.logPath)
        waitForPattern(logs, readyPattern, 900, server.process, "server boot")
        sendCommand(server, "sam validate_opening_progression")
        val deadline = System.currentTimeMillis() + config.timeoutSeconds * 1000L
        var passed = false
        while (System.currentTimeMillis() < deadline) {
            if (!server.process.isAlive) error("server exited with ${server.process.exitValue()}")
            val text = logs.joinToString("\n") { tailText(it) }
            if (failPattern.containsMatchIn(text)) error("runtime validator reported failure")
            if (passPattern.containsMatchIn(text)) {
                passed = true
                break
            }
            Thread.sleep(1000)
        }
        if (!passed) error("opening progression runtime validation timed out after ${config.timeoutSeconds}s")
        println("cycle $cycle: PASS")
    } catch (error: Throwable) {
        failed = true
        System.err.println("cycle $cycle: FAIL - ${error.message}")
        if (!config.keepGoing) {
            stopServer(server)
            break
        }
    } finally {
        stopServer(server)
    }
}

exitProcess(if (failed) 1 else 0)

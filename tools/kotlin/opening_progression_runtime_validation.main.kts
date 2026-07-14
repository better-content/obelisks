#!/usr/bin/env kotlin

import java.io.BufferedWriter
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardCopyOption
import java.util.Comparator
import java.util.concurrent.TimeUnit
import kotlin.io.path.createDirectories
import kotlin.io.path.exists
import kotlin.system.exitProcess

data class ScenarioConfig(
    val cycles: Int,
    val timeoutSeconds: Int,
    val requestedPort: Int,
    val actualPort: Int,
    val bootstrapMode: String,
    val keepGoing: Boolean,
    val keepRuns: Boolean,
    val runRoot: Path,
    val statusPath: Path?,
    val summaryPath: Path?,
    val latestStatusPath: Path?,
    val latestSummaryPath: Path?,
    val fakeMode: String?,
)

data class RunningServer(val process: Process, val stdin: BufferedWriter?, val logPath: Path)

fun usage(message: String? = null): Nothing {
    if (message != null) System.err.println(message)
    System.err.println("Usage: tools/bc test scenario opening_progression [--cycles N] [--timeout N] [--port N] [--bootstrap-mode always|once|never] [--run-root PATH] [--keep-going] [--keep-runs]")
    exitProcess(2)
}

fun envPath(name: String): Path? = System.getenv(name)?.takeIf { it.isNotBlank() }?.let { Paths.get(it).toAbsolutePath().normalize() }

fun parseConfig(args: Array<String>): ScenarioConfig {
    var cycles = 1
    var timeoutSeconds = 240
    var requestedPort = System.getenv("BC_HARNESS_REQUESTED_PORT")?.toIntOrNull() ?: 25565
    var actualPort = System.getenv("BC_HARNESS_ACTUAL_PORT")?.toIntOrNull()
    var bootstrapMode = "always"
    var keepGoing = false
    var keepRuns = false
    var runRoot = envPath("BC_HARNESS_RUN_ROOT") ?: Paths.get("/tmp/bc-opening-progression")
    var statusPath = envPath("BC_HARNESS_STATUS_PATH")
    var summaryPath = envPath("BC_HARNESS_SUMMARY_PATH")
    var latestStatusPath = envPath("BC_HARNESS_LATEST_STATUS_PATH")
    var latestSummaryPath = envPath("BC_HARNESS_LATEST_SUMMARY_PATH")
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
                val value = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--port needs a positive integer")
                requestedPort = value
                actualPort = value
                index += 2
            }
            "--resolved-port" -> {
                actualPort = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--resolved-port needs a positive integer")
                index += 2
            }
            "--bootstrap-mode" -> {
                bootstrapMode = args.getOrNull(index + 1) ?: usage("--bootstrap-mode needs always, once, or never")
                if (bootstrapMode !in setOf("always", "once", "never")) usage("invalid bootstrap mode: $bootstrapMode")
                index += 2
            }
            "--run-root" -> {
                runRoot = Paths.get(args.getOrNull(index + 1) ?: usage("--run-root needs a path")).toAbsolutePath().normalize()
                index += 2
            }
            "--status-path" -> {
                statusPath = Paths.get(args.getOrNull(index + 1) ?: usage("--status-path needs a path")).toAbsolutePath().normalize()
                index += 2
            }
            "--summary-path" -> {
                summaryPath = Paths.get(args.getOrNull(index + 1) ?: usage("--summary-path needs a path")).toAbsolutePath().normalize()
                index += 2
            }
            "--latest-status-path" -> {
                latestStatusPath = Paths.get(args.getOrNull(index + 1) ?: usage("--latest-status-path needs a path")).toAbsolutePath().normalize()
                index += 2
            }
            "--latest-summary-path" -> {
                latestSummaryPath = Paths.get(args.getOrNull(index + 1) ?: usage("--latest-summary-path needs a path")).toAbsolutePath().normalize()
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
    if (requestedPort <= 0) usage("--port must be >= 1")
    val resolved = actualPort ?: requestedPort
    if (resolved <= 0) usage("--resolved-port must be >= 1")
    return ScenarioConfig(
        cycles = cycles,
        timeoutSeconds = timeoutSeconds,
        requestedPort = requestedPort,
        actualPort = resolved,
        bootstrapMode = bootstrapMode,
        keepGoing = keepGoing,
        keepRuns = keepRuns,
        runRoot = runRoot,
        statusPath = statusPath,
        summaryPath = summaryPath,
        latestStatusPath = latestStatusPath,
        latestSummaryPath = latestSummaryPath,
        fakeMode = System.getenv("BC_TEST_OPENING_PROGRESS_FAKE")?.takeIf { it.isNotBlank() },
    )
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

fun setServerPort(path: Path, port: Int) {
    val lines = if (Files.exists(path)) Files.readAllLines(path).toMutableList() else mutableListOf<String>()
    var replaced = false
    for (index in lines.indices) {
        if (lines[index].startsWith("server-port=")) {
            lines[index] = "server-port=$port"
            replaced = true
        }
    }
    if (!replaced) lines += "server-port=$port"
    Files.write(path, lines.map { "$it\n" }.joinToString("").toByteArray(Charsets.UTF_8))
}

fun ensureSmokeBootstrapped(root: Path, serverDir: Path, port: Int) {
    val exit = runCommand(
        listOf(
            "tools/bc",
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

fun requirePreparedRuntime(serverDir: Path) {
    if (!serverDir.resolve("run.sh").exists()) {
        usage("prepared runtime missing for --bootstrap-mode never: $serverDir")
    }
}

fun startServer(serverDir: Path, port: Int, evidenceDir: Path): RunningServer {
    val logPath = evidenceDir.resolve("server-console.log")
    setServerPort(serverDir.resolve("server.properties"), port)
    val builder = ProcessBuilder(listOf("./run.sh", "nogui"))
        .directory(serverDir.toFile())
        .redirectErrorStream(true)
        .redirectOutput(logPath.toFile())
    builder.environment()["BC_SERVER_PORT"] = port.toString()
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

fun jsonEscape(text: String): String = buildString {
    for (ch in text) {
        when (ch) {
            '\\' -> append("\\\\")
            '"' -> append("\\\"")
            '\b' -> append("\\b")
            '\u000C' -> append("\\f")
            '\n' -> append("\\n")
            '\r' -> append("\\r")
            '\t' -> append("\\t")
            else -> if (ch.code < 0x20) append("\\u%04x".format(ch.code)) else append(ch)
        }
    }
}

fun toJson(value: Any?): String = when (value) {
    null -> "null"
    is String -> "\"${jsonEscape(value)}\""
    is Number, is Boolean -> value.toString()
    is Map<*, *> -> value.entries.joinToString(prefix = "{", postfix = "}") { (key, entryValue) ->
        "\"${jsonEscape(key.toString())}\":${toJson(entryValue)}"
    }
    is Iterable<*> -> value.joinToString(prefix = "[", postfix = "]") { toJson(it) }
    is Array<*> -> value.joinToString(prefix = "[", postfix = "]") { toJson(it) }
    else -> "\"${jsonEscape(value.toString())}\""
}

fun writeJson(path: Path?, value: Any?) {
    if (path == null) return
    path.parent?.createDirectories()
    Files.writeString(path, toJson(value) + "\n")
}

fun syncLatest(target: Path?, source: Path?) {
    if (target == null || source == null || !Files.exists(source)) return
    target.parent?.createDirectories()
    Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING)
}

class HarnessReporter(private val config: ScenarioConfig) {
    private val startedAt = java.time.Instant.now().toString()
    private val cycleResults = mutableListOf<MutableMap<String, Any?>>()
    private val status = linkedMapOf<String, Any?>(
        "status" to "starting",
        "command" to "test scenario opening_progression",
        "pid" to ProcessHandle.current().pid(),
        "started_at" to startedAt,
        "updated_at" to startedAt,
        "repo_or_scenario" to "opening_progression",
        "work_dir_or_run_root" to config.runRoot.toString(),
        "requested_port" to config.requestedPort,
        "actual_port" to config.actualPort,
        "phase" to "bootstrap",
        "evidence_paths" to emptyList<String>(),
        "last_error" to null,
        "child_pids" to emptyList<Long>(),
    )

    init {
        flushStatus()
        flushSummary("starting")
    }

    fun update(
        phase: String,
        statusValue: String = status["status"] as String,
        evidencePaths: List<String>? = null,
        childPids: List<Long>? = null,
        lastError: String? = null,
        extra: Map<String, Any?> = emptyMap(),
    ) {
        status["status"] = statusValue
        status["phase"] = phase
        status["updated_at"] = java.time.Instant.now().toString()
        if (evidencePaths != null) status["evidence_paths"] = evidencePaths
        if (childPids != null) status["child_pids"] = childPids
        if (lastError != null || extra.containsKey("last_error")) status["last_error"] = lastError
        for ((key, value) in extra) status[key] = value
        flushStatus()
    }

    fun beginCycle(index: Int, evidenceDir: Path): MutableMap<String, Any?> {
        val cycle = linkedMapOf<String, Any?>(
            "cycle_index" to index,
            "status" to "running",
            "requested_port" to config.requestedPort,
            "actual_port" to config.actualPort,
            "server_pid" to null,
            "evidence_dir" to evidenceDir.toString(),
            "last_log_path" to null,
            "failure_reason" to null,
            "last_log_excerpt" to null,
            "validation_evidence" to null,
        )
        cycleResults += cycle
        flushSummary("running")
        return cycle
    }

    fun finishCycle(cycle: MutableMap<String, Any?>) {
        flushSummary(status["status"] as String)
    }

    fun finish(statusValue: String, lastError: String? = null) {
        update(
            phase = if (statusValue == "passed") "shutdown" else status["phase"] as String,
            statusValue = statusValue,
            lastError = lastError,
        )
        flushSummary(statusValue)
    }

    private fun flushStatus() {
        writeJson(config.statusPath, status)
        syncLatest(config.latestStatusPath, config.statusPath)
    }

    private fun flushSummary(statusValue: String) {
        val summary = linkedMapOf<String, Any?>(
            "scenario" to "opening_progression",
            "status" to statusValue,
            "started_at" to startedAt,
            "updated_at" to java.time.Instant.now().toString(),
            "requested_port" to config.requestedPort,
            "actual_port" to config.actualPort,
            "run_root" to config.runRoot.toString(),
            "cycles" to cycleResults,
        )
        status["last_error"]?.let { if (it != null) summary["last_error"] = it }
        writeJson(config.summaryPath, summary)
        syncLatest(config.latestSummaryPath, config.summaryPath)
    }
}

val root = Paths.get("").toAbsolutePath().normalize()
val config = parseConfig(args)
config.runRoot.createDirectories()
if (!config.keepRuns && config.bootstrapMode == "once") deleteTree(config.runRoot.resolve("prepared"))

val passPattern = Regex("""OPENING_PROGRESSION_VALIDATION PASS""", RegexOption.IGNORE_CASE)
val failPattern = Regex("""OPENING_PROGRESSION_VALIDATION FAIL|Unknown or incomplete command""", RegexOption.IGNORE_CASE)
val readyPattern = Regex("""Done \([\d.]+s\)! For help, type "help"""")

val reporter = HarnessReporter(config)
if (config.actualPort != config.requestedPort) {
    reporter.update(
        phase = "bootstrap",
        statusValue = "running",
        lastError = "requested port ${config.requestedPort} remapped to ${config.actualPort}",
    )
}

var failed = false
for (cycle in 1..config.cycles) {
    val cycleRoot = config.runRoot.resolve("cycle-$cycle")
    val serverDir = when (config.bootstrapMode) {
        "once", "never" -> config.runRoot.resolve("prepared/server")
        else -> cycleRoot.resolve("server")
    }
    val evidenceDir = cycleRoot.resolve("evidence")
    if (!config.keepRuns) deleteTree(cycleRoot)
    evidenceDir.createDirectories()
    val cycleResult = reporter.beginCycle(cycle, evidenceDir)

    if (config.fakeMode == null) {
        when (config.bootstrapMode) {
            "always" -> {
                reporter.update("bootstrap", "running", evidencePaths = listOf(evidenceDir.toString()))
                println("cycle $cycle/${config.cycles}: smoke bootstrap")
                ensureSmokeBootstrapped(root, serverDir, config.actualPort)
            }
            "once" -> {
                reporter.update("bootstrap", "running", evidencePaths = listOf(evidenceDir.toString()))
                if (!serverDir.resolve("run.sh").exists()) {
                    println("cycle $cycle/${config.cycles}: smoke bootstrap")
                    ensureSmokeBootstrapped(root, serverDir, config.actualPort)
                } else {
                    println("cycle $cycle/${config.cycles}: reusing prepared runtime")
                }
            }
            "never" -> {
                reporter.update("bootstrap", "running", evidencePaths = listOf(evidenceDir.toString()))
                requirePreparedRuntime(serverDir)
                println("cycle $cycle/${config.cycles}: using prepared runtime")
            }
        }
    } else {
        reporter.update("bootstrap", "running", evidencePaths = listOf(evidenceDir.toString()))
    }

    var server: RunningServer? = null
    try {
        if (config.fakeMode != null) {
            val fakeLog = evidenceDir.resolve("server-console.log")
            Files.writeString(fakeLog, "OPENING_PROGRESSION_VALIDATION ${if (config.fakeMode == "pass") "PASS" else "FAIL"}\n")
            cycleResult["last_log_path"] = fakeLog.toString()
            reporter.update("start_server", "running", evidencePaths = listOf(evidenceDir.toString(), fakeLog.toString()))
            reporter.update("wait_ready", "running", evidencePaths = listOf(evidenceDir.toString(), fakeLog.toString()))
            reporter.update("run_validation", "running", evidencePaths = listOf(evidenceDir.toString(), fakeLog.toString()))
            if (config.fakeMode == "pass") {
                cycleResult["status"] = "passed"
                cycleResult["validation_evidence"] = "OPENING_PROGRESSION_VALIDATION PASS"
                reporter.update("shutdown", "running", evidencePaths = listOf(evidenceDir.toString(), fakeLog.toString()))
                println("cycle $cycle: PASS")
            } else {
                error("fake opening progression failure")
            }
        } else {
            reporter.update("start_server", "running", evidencePaths = listOf(evidenceDir.toString()))
            server = startServer(serverDir, config.actualPort, evidenceDir)
            cycleResult["server_pid"] = server.process.pid()
            cycleResult["last_log_path"] = server.logPath.toString()
            reporter.update(
                "start_server",
                "running",
                evidencePaths = listOf(evidenceDir.toString(), server.logPath.toString()),
                childPids = listOf(server.process.pid()),
            )
            val logs = listOf(serverDir.resolve("logs/latest.log"), server.logPath)
            reporter.update("wait_ready", "running", evidencePaths = logs.map(Path::toString) + evidenceDir.toString())
            waitForPattern(logs, readyPattern, 900, server.process, "server boot")
            reporter.update("run_validation", "running", evidencePaths = logs.map(Path::toString) + evidenceDir.toString())
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
            cycleResult["status"] = "passed"
            cycleResult["validation_evidence"] = "OPENING_PROGRESSION_VALIDATION PASS"
            reporter.update("shutdown", "running", evidencePaths = logs.map(Path::toString) + evidenceDir.toString())
            println("cycle $cycle: PASS")
        }
    } catch (error: Throwable) {
        failed = true
        val logPath = (cycleResult["last_log_path"] as? String)?.let { Paths.get(it) }
        cycleResult["status"] = "failed"
        cycleResult["failure_reason"] = error.message ?: error::class.java.simpleName
        cycleResult["last_log_excerpt"] = logPath?.let { tailText(it, 8_192) }
        reporter.update(
            phase = "shutdown",
            statusValue = "failed",
            evidencePaths = listOfNotNull(evidenceDir.toString(), logPath?.toString()),
            lastError = cycleResult["failure_reason"] as String,
        )
        System.err.println("cycle $cycle: FAIL - ${error.message}")
        if (!config.keepGoing) {
            stopServer(server)
            reporter.finishCycle(cycleResult)
            break
        }
    } finally {
        reporter.update(
            "shutdown",
            if (failed) "failed" else "running",
            evidencePaths = listOfNotNull(evidenceDir.toString(), cycleResult["last_log_path"] as? String),
            childPids = emptyList(),
        )
        stopServer(server)
        reporter.finishCycle(cycleResult)
    }
}

reporter.finish(if (failed) "failed" else "passed", if (failed) "opening progression scenario failed" else null)
exitProcess(if (failed) 1 else 0)

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

val fatalClassifierKeys = listOf(
    "modernfix_watchdog",
    "crash_report",
    "c2me_thread_guard",
    "dh_worldgen_exception",
    "lostcities_exception",
    "c2me_far_chunk_write",
)

data class Config(
    val basePort: Int,
    val radius: Int,
    val samples: Int,
    val settleSeconds: Int,
    val bootstrapMode: String,
    val keepRuns: Boolean,
    val runRoot: Path,
)

data class RunningServer(val process: Process, val stdin: BufferedWriter?, val logPath: Path)
data class LogCursor(val path: Path, var offset: Long)
data class VariantResult(
    val name: String,
    val passed: Boolean,
    val classifier: String?,
    val details: String,
)

fun usage(message: String? = null): Nothing {
    if (message != null) System.err.println(message)
    System.err.println("Usage: tools/bc test scenario lc_tfth_c2me_dh [--port N] [--radius N] [--samples N] [--settle-seconds N] [--bootstrap-mode always|once|never] [--run-root PATH] [--keep-runs]")
    exitProcess(2)
}

fun parseConfig(args: Array<String>): Config {
    var basePort = 25565
    var radius = 7
    var samples = 4
    var settleSeconds = 30
    var bootstrapMode = "always"
    var keepRuns = false
    var runRoot = Paths.get("/tmp/bc-lc-c2me-dh-repro")
    var index = 0
    while (index < args.size) {
        when (args[index]) {
            "--port" -> {
                basePort = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--port needs an integer")
                index += 2
            }
            "--radius" -> {
                radius = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--radius needs an integer")
                index += 2
            }
            "--samples" -> {
                samples = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--samples needs an integer")
                index += 2
            }
            "--settle-seconds" -> {
                settleSeconds = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--settle-seconds needs an integer")
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
            "--keep-runs" -> {
                keepRuns = true
                index += 1
            }
            "--skip-bootstrap", "--boot-timeout", "--join-timeout", "--min-free-gb", "--max-old-runs", "--cycles", "--idle-seconds", "--tfth-seconds", "--keep-going" -> {
                index += when (args[index]) {
                    "--keep-going" -> 1
                    else -> 2
                }
            }
            "--help" -> usage()
            else -> usage("unknown argument: ${args[index]}")
        }
    }
    if (basePort <= 0 || radius < 0 || samples <= 0 || settleSeconds <= 0) usage("numeric arguments must be positive")
    return Config(basePort, radius.coerceIn(0, 7), samples, settleSeconds, bootstrapMode, keepRuns, runRoot)
}

fun deleteTree(path: Path) {
    if (!Files.exists(path)) return
    Files.walk(path).use { stream ->
        stream.sorted(Comparator.reverseOrder()).forEach { Files.deleteIfExists(it) }
    }
}

fun copyTree(source: Path, target: Path) {
    deleteTree(target)
    Files.walk(source).use { stream ->
        stream.forEach { current ->
            val relative = source.relativize(current)
            val destination = target.resolve(relative.toString())
            if (Files.isDirectory(current)) {
                destination.createDirectories()
            } else {
                destination.parent?.createDirectories()
                Files.copy(current, destination, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.COPY_ATTRIBUTES)
            }
        }
    }
}

fun runCommand(command: List<String>, root: Path): Int =
    ProcessBuilder(command).directory(root.toFile()).inheritIO().start().waitFor()

fun setServerPort(path: Path, port: Int) {
    val lines = if (Files.exists(path)) Files.readAllLines(path).toMutableList() else mutableListOf<String>()
    var replaced = false
    for (lineIndex in lines.indices) {
        if (lines[lineIndex].startsWith("server-port=")) {
            lines[lineIndex] = "server-port=$port"
            replaced = true
        }
    }
    if (!replaced) lines += "server-port=$port"
    Files.write(path, lines.map { "$it\n" }.joinToString("").toByteArray(Charsets.UTF_8))
}

fun ensureSmokeBootstrapped(root: Path, serverDir: Path, port: Int) {
    val exit = runCommand(
        listOf("tools/bc", "test", "smoke", "--server-dir", serverDir.toString(), "--port", port.toString(), "--reset-runtime"),
        root,
    )
    if (exit != 0) exitProcess(exit)
}

fun requirePreparedRuntime(serverDir: Path) {
    if (!serverDir.resolve("run.sh").exists()) usage("prepared runtime missing for --bootstrap-mode never: $serverDir")
}

fun setSerializeGuard(serverDir: Path, enabled: Boolean) {
    val path = serverDir.resolve("config/bcfixes-common.toml")
    if (!path.exists()) error("missing config override target: $path")
    val current = Files.readString(path)
    val pattern = Regex("""(?m)^(\s*serializeDhC2meFeaturePlacement\s*=\s*)(true|false)\s*$""")
    if (!pattern.containsMatchIn(current)) error("could not locate serializeDhC2meFeaturePlacement in $path")
    val updated = current.replace(pattern, "$1$enabled")
    Files.writeString(path, updated)
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

fun logCursors(paths: List<Path>): List<LogCursor> = paths.map { path ->
    LogCursor(path, if (path.exists()) Files.size(path) else 0L)
}

fun readSince(cursor: LogCursor, limit: Long = 512_000): String {
    if (!cursor.path.exists()) return ""
    val file = cursor.path.toFile()
    file.inputStream().use { input ->
        val currentSize = file.length()
        val start = cursor.offset.coerceAtMost(currentSize)
        input.skip(start)
        val bytes = input.readBytes()
        cursor.offset = currentSize
        val text = bytes.toString(Charsets.UTF_8)
        return if (text.length > limit) text.takeLast(limit.toInt()) else text
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

fun fatalClassifier(text: String): String? {
    val serious = """(?:ReportedException|IllegalStateException|NullPointerException|RuntimeException|ExceptionInInitializerError|ConcurrentModificationException|ArrayIndexOutOfBoundsException|ClassCastException|UnsupportedOperationException|LinkageError|AssertionError)"""
    val checks = linkedMapOf(
        "modernfix_watchdog" to Regex("""modernfix.*watchdog|watchdog.*modernfix|server thread dump""", RegexOption.IGNORE_CASE),
        "crash_report" to Regex("""crash report|this crash report has been saved|preparing crash report""", RegexOption.IGNORE_CASE),
        "c2me_thread_guard" to Regex("""(ThreadingDetector|PalettedContainer|BulkSectionAccess|safe.?random|random.*wrong thread|accessing legacyrandomsource|CheckedThreadLocalRandom|Chunk not there when requested).*\b(Exception|Error|FATAL|ReportedException|IllegalStateException)\b|\b(Exception|Error|FATAL|ReportedException|IllegalStateException)\b.*(ThreadingDetector|PalettedContainer|BulkSectionAccess|safe.?random|random.*wrong thread|accessing legacyrandomsource|CheckedThreadLocalRandom|Chunk not there when requested)""", RegexOption.IGNORE_CASE),
        "dh_worldgen_exception" to Regex("""(DistantHorizons|LOD World Gen|DhServerLevel|BatchGenerator|WorldGenerationQueue).*\b(Exception|Throwable|Error)\b|\b(Exception|Throwable|Error)\b.*(DistantHorizons|LOD World Gen|DhServerLevel|BatchGenerator|WorldGenerationQueue)""", RegexOption.IGNORE_CASE),
        "lostcities_exception" to Regex("""(lostcities|LostCityFeature|LostCityTerrainFeature).*\b$serious\b|\b$serious\b.*(lostcities|LostCityFeature|LostCityTerrainFeature)""", RegexOption.IGNORE_CASE),
        "c2me_far_chunk_write" to Regex("""Detected setBlock in a far chunk""", RegexOption.IGNORE_CASE),
    )
    return checks.entries.firstOrNull { it.value.containsMatchIn(text) }?.key
}

fun sampleLostCity(server: RunningServer, cursors: List<LogCursor>, config: Config, variant: String): String? {
    for (sample in 0 until config.samples) {
        val cx = sample * (config.radius * 4 + 24)
        val cz = sample * (config.radius * -3 - 21)
        sendCommand(server, "execute in lostcities:lostcity run forceload add ${cx - config.radius} ${cz - config.radius} ${cx + config.radius} ${cz + config.radius}")
        Thread.sleep(config.settleSeconds * 1000L)
        val logText = cursors.joinToString("\n") { readSince(it) }
        val classifier = fatalClassifier(logText)
        if (classifier != null) {
            println("$variant: sampled lostcities:lostcity [${sample + 1}/${config.samples}] -> $classifier")
            return classifier
        }
        println("$variant: sampled lostcities:lostcity [${sample + 1}/${config.samples}]")
    }
    return null
}

fun runVariant(name: String, serverDir: Path, port: Int, config: Config, expectFailure: Boolean): VariantResult {
    val evidenceDir = config.runRoot.resolve("evidence/$name")
    if (!config.keepRuns) deleteTree(evidenceDir)
    evidenceDir.createDirectories()
    val guardEnabled = name == "control"
    setSerializeGuard(serverDir, guardEnabled)
    Files.writeString(evidenceDir.resolve("variant-config.txt"), "serializeDhC2meFeaturePlacement=$guardEnabled\n")
    var server: RunningServer? = null
    return try {
        server = startServer(serverDir, port, evidenceDir)
        val logs = listOf(serverDir.resolve("logs/latest.log"), server.logPath)
        val readyPattern = Regex("""Done \([\d.]+s\)! For help, type "help"""")
        waitForPattern(logs, readyPattern, 900, server.process, "$name server boot")
        val classifier = sampleLostCity(server, logCursors(logs), config, name)
        val result = when {
            !expectFailure && classifier == null -> VariantResult(name, true, null, "guarded control passed with no targeted Lost Cities/C2ME/DH fatal signature")
            !expectFailure -> VariantResult(name, false, classifier, "guarded control tripped targeted fatal classifier: $classifier")
            expectFailure && classifier != null -> VariantResult(name, true, classifier, "unguarded repro tripped targeted fatal classifier: $classifier")
            else -> VariantResult(name, false, null, "unguarded repro was inconclusive: no targeted fatal signature within ${config.samples} samples at radius ${config.radius}")
        }
        Files.writeString(
            evidenceDir.resolve("summary.txt"),
            listOf(
                "variant=$name",
                "expected=${if (expectFailure) "failure" else "pass"}",
                "passed=${result.passed}",
                "classifier=${result.classifier ?: "none"}",
                "details=${result.details}",
            ).joinToString("\n", postfix = "\n"),
        )
        result
    } catch (error: Throwable) {
        VariantResult(name, false, null, error.message ?: error.javaClass.simpleName)
    } finally {
        stopServer(server)
    }
}

val root = Paths.get("").toAbsolutePath().normalize()
val config = parseConfig(args)
config.runRoot.createDirectories()

val preparedServerDir = config.runRoot.resolve("prepared/server")
if (!config.keepRuns && config.bootstrapMode == "once") deleteTree(config.runRoot.resolve("prepared"))
when (config.bootstrapMode) {
    "always" -> {
        deleteTree(preparedServerDir)
        println("bootstrap: smoke bootstrap")
        ensureSmokeBootstrapped(root, preparedServerDir, config.basePort)
    }
    "once" -> {
        if (!preparedServerDir.resolve("run.sh").exists()) {
            println("bootstrap: smoke bootstrap")
            ensureSmokeBootstrapped(root, preparedServerDir, config.basePort)
        } else {
            println("bootstrap: reusing prepared runtime")
        }
    }
    "never" -> {
        requirePreparedRuntime(preparedServerDir)
        println("bootstrap: using prepared runtime")
    }
}

val controlServerDir = config.runRoot.resolve("variants/control/server")
val reproServerDir = config.runRoot.resolve("variants/repro/server")
copyTree(preparedServerDir, controlServerDir)
copyTree(preparedServerDir, reproServerDir)

val control = runVariant("control", controlServerDir, config.basePort + 1, config, expectFailure = false)
val repro = runVariant("repro", reproServerDir, config.basePort + 2, config, expectFailure = true)

println("control: ${if (control.passed) "PASS" else "FAIL"} - ${control.details}")
println("repro: ${if (repro.passed) "PASS" else "FAIL"} - ${repro.details}")

val success = control.passed && repro.passed
exitProcess(if (success) 0 else 1)

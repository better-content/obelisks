#!/usr/bin/env kotlin

// Lost Cities + C2ME + DistantHorizons + The Flesh That Hates stability lane.

import java.io.BufferedWriter
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
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
    "tfth_exception",
    "jvm_fatal",
)
val requiredActivityMarkers = listOf("distant_horizons", "missing_dh_activity", "requireDhActivity = true")

data class Config(
    val cycles: Int,
    val basePort: Int,
    val idleSeconds: Int,
    val tfthSeconds: Int,
    val keepGoing: Boolean,
    val keepRuns: Boolean,
    val runRoot: Path,
)

data class RunningServer(val process: Process, val stdin: BufferedWriter?, val logPath: Path)

fun usage(message: String? = null): Nothing {
    if (message != null) System.err.println(message)
    System.err.println("Usage: tools/btm test scenario-headful lc_tfth_c2me_dh [--cycles N] [--idle-seconds N] [--tfth-seconds N] [--port N] [--run-root PATH] [--keep-going] [--keep-runs]")
    exitProcess(2)
}

fun parseConfig(args: Array<String>): Config {
    var cycles = 3
    var basePort = 25565
    var idleSeconds = 180
    var tfthSeconds = 120
    var keepGoing = false
    var keepRuns = false
    var runRoot = Paths.get("/tmp/btm-lc-tfth-c2me-dh")
    var index = 0
    while (index < args.size) {
        when (args[index]) {
            "--cycles" -> {
                cycles = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--cycles needs an integer")
                index += 2
            }
            "--idle-seconds" -> {
                idleSeconds = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--idle-seconds needs an integer")
                index += 2
            }
            "--tfth-seconds" -> {
                tfthSeconds = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--tfth-seconds needs an integer")
                index += 2
            }
            "--port" -> {
                basePort = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--port needs an integer")
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
            "--skip-bootstrap", "--boot-timeout", "--join-timeout", "--min-free-gb", "--max-old-runs" -> {
                index += if (args[index] == "--skip-bootstrap") 1 else 2
            }
            "--help" -> usage()
            else -> usage("unknown argument: ${args[index]}")
        }
    }
    if (cycles <= 0 || basePort <= 0 || idleSeconds <= 0 || tfthSeconds <= 0) usage("numeric arguments must be positive")
    return Config(cycles, basePort, idleSeconds, tfthSeconds, keepGoing, keepRuns, runRoot)
}

fun deleteTree(path: Path) {
    if (!Files.exists(path)) return
    Files.walk(path).use { stream ->
        stream.sorted(Comparator.reverseOrder()).forEach { Files.deleteIfExists(it) }
    }
}

fun runCommand(command: List<String>, root: Path): Int =
    ProcessBuilder(command).directory(root.toFile()).inheritIO().start().waitFor()

fun ensureSmokeBootstrapped(root: Path, serverDir: Path, port: Int) {
    val exit = runCommand(
        listOf("tools/btm", "test", "smoke", "--server-dir", serverDir.toString(), "--port", port.toString(), "--reset-runtime"),
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

fun fatalClassifier(text: String): String? {
    val serious = """(?:ReportedException|IllegalStateException|NullPointerException|RuntimeException|ExceptionInInitializerError|ConcurrentModificationException|ArrayIndexOutOfBoundsException|ClassCastException|UnsupportedOperationException|LinkageError|AssertionError)"""
    val checks = linkedMapOf(
        "modernfix_watchdog" to Regex("""modernfix.*watchdog|watchdog.*modernfix|server thread dump""", RegexOption.IGNORE_CASE),
        "crash_report" to Regex("""crash report|this crash report has been saved|preparing crash report""", RegexOption.IGNORE_CASE),
        "c2me_thread_guard" to Regex("""(ThreadingDetector|PalettedContainer|BulkSectionAccess|safe.?random|random.*wrong thread|accessing legacyrandomsource|CheckedThreadLocalRandom|Chunk not there when requested).*\b(Exception|Error|FATAL|ReportedException|IllegalStateException)\b|\b(Exception|Error|FATAL|ReportedException|IllegalStateException)\b.*(ThreadingDetector|PalettedContainer|BulkSectionAccess|safe.?random|random.*wrong thread|accessing legacyrandomsource|CheckedThreadLocalRandom|Chunk not there when requested)""", RegexOption.IGNORE_CASE),
        "dh_worldgen_exception" to Regex("""(DistantHorizons|LOD World Gen|DhServerLevel|BatchGenerator|WorldGenerationQueue).*\b(Exception|Throwable|Error)\b|\b(Exception|Throwable|Error)\b.*(DistantHorizons|LOD World Gen|DhServerLevel|BatchGenerator|WorldGenerationQueue)""", RegexOption.IGNORE_CASE),
        "lostcities_exception" to Regex("""(lostcities|LostCityFeature|LostCityTerrainFeature).*\b$serious\b|\b$serious\b.*(lostcities|LostCityFeature|LostCityTerrainFeature)""", RegexOption.IGNORE_CASE),
        "tfth_exception" to Regex("""(the_flesh_that_hates|FleshBlockSpread|net\.mcreator\.thefleshthathates).*\b$serious\b|\b$serious\b.*(the_flesh_that_hates|FleshBlockSpread|net\.mcreator\.thefleshthathates)""", RegexOption.IGNORE_CASE),
        "jvm_fatal" to Regex("""OutOfMemoryError|hs_err_pid|fatal error has been detected""", RegexOption.IGNORE_CASE),
    )
    return checks.entries.firstOrNull { it.value.containsMatchIn(text) }?.key
}

val requireDhActivity = true
val root = Paths.get("").toAbsolutePath().normalize()
val config = parseConfig(args)
config.runRoot.createDirectories()
val readyPattern = Regex("""Done \([\d.]+s\)! For help, type "help"""")
val dhPattern = Regex("""distanthorizons|lod|full data|world generation""", RegexOption.IGNORE_CASE)

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

        sendCommand(server, "execute in lostcities:lostcity run forceload add -8 -8 8 8")
        Thread.sleep(15_000)
        fatalClassifier(logs.joinToString("\n") { tailText(it) })?.let { error("fatal classifier tripped: $it") }

        Thread.sleep(config.idleSeconds * 1000L)
        sendCommand(server, "execute in lostcities:lostcity run setblock 2 80 2 the_flesh_that_hates:flesh_block")
        sendCommand(server, "execute in lostcities:lostcity run setblock 3 80 2 the_flesh_that_hates:tumor")
        sendCommand(server, "execute in lostcities:lostcity run setblock 2 80 3 the_flesh_that_hates:purulent_tumor")
        sendCommand(server, "execute in lostcities:lostcity run summon the_flesh_that_hates:plaquecontaminator 4 80 4")
        sendCommand(server, "execute in lostcities:lostcity run summon the_flesh_that_hates:flesh_human 5 80 4")
        sendCommand(server, "execute in lostcities:lostcity run summon the_flesh_that_hates:flesh_howler 6 80 4")
        Thread.sleep(config.tfthSeconds * 1000L)

        val text = logs.joinToString("\n") { tailText(it) }
        fatalClassifier(text)?.let { error("fatal classifier tripped: $it") }
        if (requireDhActivity && !dhPattern.containsMatchIn(text)) error("missing_dh_activity")
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

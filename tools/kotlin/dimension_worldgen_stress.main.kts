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

val defaultDimensions = listOf(
    "minecraft:overworld",
    "minecraft:the_nether",
    "aether:the_aether",
    "undergarden:undergarden",
    "twilightforest:twilight_forest",
    "deeperdarker:otherside",
    "lostcities:lostcity",
    "fallout_wastelands_:wastelands",
    "creatingspace:earth_orbit",
    "creatingspace:moon_orbit",
    "creatingspace:mars_orbit",
    "creatingspace:the_moon",
    "creatingspace:mars",
    "creatingspace:venus",
    "ae2:spatial_storage",
    "bloodmagic:dungeon",
    "irons_spellbooks:pocket_dimension",
)

val fatalClassifierKeys = listOf(
    "invalid_dimension",
    "modernfix_watchdog",
    "crash_report",
    "client_internal_disconnect",
    "c2me_thread_guard",
    "c2me_far_chunk_write",
    "dh_worldgen_exception",
    "worldgen_exception",
    "jvm_fatal",
)

data class Config(
    val cycles: Int,
    val basePort: Int,
    val radius: Int,
    val samples: Int,
    val settleSeconds: Int,
    val dimensions: List<String>,
    val bootstrapMode: String,
    val keepGoing: Boolean,
    val keepRuns: Boolean,
    val runRoot: Path,
    val serverDirOverride: Path?,
)

data class RunningServer(val process: Process, val stdin: BufferedWriter?, val logPath: Path)

fun usage(message: String? = null): Nothing {
    if (message != null) System.err.println(message)
    System.err.println("Usage: tools/bc test scenario-headful dimension_worldgen [--cycles N] [--port N] [--radius N] [--samples N] [--settle-seconds N] [--dimensions a,b,c] [--server-dir PATH] [--server-only] [--bootstrap-mode always|once|never] [--run-root PATH] [--keep-going] [--keep-runs]")
    exitProcess(2)
}

fun parseConfig(args: Array<String>): Config {
    var cycles = 1
    var basePort = 25565
    var radius = 7
    var samples = 2
    var settleSeconds = 45
    var dimensions = defaultDimensions
    var bootstrapMode = "always"
    var keepGoing = false
    var keepRuns = false
    var runRoot = Paths.get(System.getProperty("user.home"), ".cache", "bc", "dimension-worldgen")
    var serverDirOverride: Path? = null
    var index = 0
    while (index < args.size) {
        when (args[index]) {
            "--cycles" -> {
                cycles = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--cycles needs an integer")
                index += 2
            }
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
            "--dimensions" -> {
                dimensions = args.getOrNull(index + 1)?.split(',')?.map(String::trim)?.filter(String::isNotBlank) ?: usage("--dimensions needs a comma-separated value")
                index += 2
            }
            "--server-dir" -> {
                serverDirOverride = Paths.get(args.getOrNull(index + 1) ?: usage("--server-dir needs a path")).toAbsolutePath().normalize()
                index += 2
            }
            "--server-only" -> index += 1
            "--bootstrap-mode" -> {
                bootstrapMode = args.getOrNull(index + 1) ?: usage("--bootstrap-mode needs always, once, or never")
                if (bootstrapMode !in setOf("always", "once", "never")) usage("invalid bootstrap mode: $bootstrapMode")
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
    if (cycles <= 0 || basePort <= 0 || samples <= 0 || settleSeconds <= 0) usage("numeric arguments must be positive")
    return Config(cycles, basePort, radius.coerceIn(0, 7), samples, settleSeconds, dimensions, bootstrapMode, keepGoing, keepRuns, runRoot, serverDirOverride)
}

fun deleteTree(path: Path) {
    if (!Files.exists(path)) return
    Files.walk(path).use { stream ->
        stream.sorted(Comparator.reverseOrder()).forEach { Files.deleteIfExists(it) }
    }
}

fun runCommand(command: List<String>, root: Path): Int =
    ProcessBuilder(command).directory(root.toFile()).inheritIO().start().waitFor()

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
        listOf("tools/bc", "test", "smoke", "--server-dir", serverDir.toString(), "--port", port.toString(), "--reset-runtime"),
        root,
    )
    if (exit != 0) exitProcess(exit)
}

fun requirePreparedRuntime(serverDir: Path) {
    if (!serverDir.resolve("run.sh").exists()) usage("prepared runtime missing for --bootstrap-mode never: $serverDir")
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

fun hasFatalLogText(text: String): String? {
    val checks = linkedMapOf(
        "invalid_dimension" to Regex("""argument\.dimension\.invalid|Unknown dimension|Can't find dimension""", RegexOption.IGNORE_CASE),
        "modernfix_watchdog" to Regex("""modernfix.*watchdog|watchdog.*modernfix|server thread dump""", RegexOption.IGNORE_CASE),
        "crash_report" to Regex("""crash report|this crash report has been saved|preparing crash report""", RegexOption.IGNORE_CASE),
        "client_internal_disconnect" to Regex("""lost connection: Internal Exception|Terminating connection with server, mismatched mod list|FluidStack cannot be empty""", RegexOption.IGNORE_CASE),
        "c2me_thread_guard" to Regex("""(ThreadingDetector|PalettedContainer|BulkSectionAccess|safe.?random|random.*wrong thread|accessing legacyrandomsource|CheckedThreadLocalRandom|Chunk not there when requested).*\b(Exception|Error|FATAL|ReportedException|IllegalStateException)\b|\b(Exception|Error|FATAL|ReportedException|IllegalStateException)\b.*(ThreadingDetector|PalettedContainer|BulkSectionAccess|safe.?random|random.*wrong thread|accessing legacyrandomsource|CheckedThreadLocalRandom|Chunk not there when requested)""", RegexOption.IGNORE_CASE),
        "c2me_far_chunk_write" to Regex("""Detected setBlock in a far chunk""", RegexOption.IGNORE_CASE),
        "dh_worldgen_exception" to Regex("""(DistantHorizons|LOD World Gen|DhServerLevel|BatchGenerator|WorldGenerationQueue).*\b(Exception|Throwable|Error)\b|\b(Exception|Throwable|Error)\b.*(DistantHorizons|LOD World Gen|DhServerLevel|BatchGenerator|WorldGenerationQueue)""", RegexOption.IGNORE_CASE),
        "worldgen_exception" to Regex("""(Feature|ChunkGenerator|ChunkStatus|WorldGen|Noise|Structure|Biome).*\b(ReportedException|IllegalStateException|ConcurrentModificationException|ArrayIndexOutOfBoundsException|NullPointerException|Exception|Error)\b|\b(ReportedException|IllegalStateException|ConcurrentModificationException|ArrayIndexOutOfBoundsException|NullPointerException)\b.*(Feature|ChunkGenerator|ChunkStatus|WorldGen|Noise|Structure|Biome)""", RegexOption.IGNORE_CASE),
        "jvm_fatal" to Regex("""OutOfMemoryError|hs_err_pid|fatal error has been detected""", RegexOption.IGNORE_CASE),
    )
    return checks.entries.firstOrNull { it.value.containsMatchIn(text) }?.key
}

val root = Paths.get("").toAbsolutePath().normalize()
val config = parseConfig(args)
config.runRoot.createDirectories()
if (!config.keepRuns && config.bootstrapMode == "once") deleteTree(config.runRoot.resolve("prepared"))
val readyPattern = Regex("""Done \([\d.]+s\)! For help, type "help"""")

var failed = false
for (cycle in 1..config.cycles) {
    val cycleRoot = config.runRoot.resolve("cycle-$cycle")
    val serverDir = config.serverDirOverride ?: when (config.bootstrapMode) {
        "once", "never" -> config.runRoot.resolve("prepared/server")
        else -> cycleRoot.resolve("server")
    }
    val evidenceDir = cycleRoot.resolve("evidence")
    if (!config.keepRuns) deleteTree(cycleRoot)
    evidenceDir.createDirectories()

    when (config.bootstrapMode) {
        "always" -> {
            println("cycle $cycle/${config.cycles}: smoke bootstrap")
            ensureSmokeBootstrapped(root, serverDir, config.basePort + cycle - 1)
        }
        "once" -> {
            if (!serverDir.resolve("run.sh").exists()) {
                println("cycle $cycle/${config.cycles}: smoke bootstrap")
                ensureSmokeBootstrapped(root, serverDir, config.basePort)
            } else {
                println("cycle $cycle/${config.cycles}: reusing prepared runtime")
            }
        }
        "never" -> {
            requirePreparedRuntime(serverDir)
            println("cycle $cycle/${config.cycles}: using prepared runtime")
        }
    }

    var server: RunningServer? = null
    var cyclePassed = true
    try {
        val cyclePort = if (config.bootstrapMode == "always") config.basePort + cycle - 1 else config.basePort
        server = startServer(serverDir, cyclePort, evidenceDir)
        val logs = listOf(serverDir.resolve("logs/latest.log"), server.logPath)
        waitForPattern(logs, readyPattern, 900, server.process, "server boot")
        for (dimension in config.dimensions) {
            for (sample in 0 until config.samples) {
                val cx = sample * (config.radius * 4 + 24)
                val cz = sample * (config.radius * -3 - 21)
                sendCommand(server, "execute in $dimension run forceload add ${cx - config.radius} ${cz - config.radius} ${cx + config.radius} ${cz + config.radius}")
                Thread.sleep(config.settleSeconds * 1000L)
                val text = logs.joinToString("\n") { tailText(it) }
                hasFatalLogText(text)?.let { error("fatal classifier tripped: $it") }
                println("cycle $cycle: sampled $dimension [${sample + 1}/${config.samples}]")
            }
            sendCommand(server, "execute in $dimension run forceload remove all")
        }
    } catch (error: Throwable) {
        failed = true
        cyclePassed = false
        System.err.println("cycle $cycle: FAIL - ${error.message}")
        if (!config.keepGoing) {
            stopServer(server)
            break
        }
    } finally {
        stopServer(server)
    }
    if (cyclePassed && "minecraft:overworld" in config.dimensions) {
        val auditExit = runCommand(
            listOf(
                "tools/bc",
                "test",
                "unearthed-replacement",
                "--instance",
                serverDir.toString(),
                "--output",
                evidenceDir.resolve("unearthed-replacement-audit.json").toString(),
            ),
            root,
        )
        if (auditExit != 0) {
            failed = true
            cyclePassed = false
            System.err.println("cycle $cycle: FAIL - Unearthed replacement regression guard")
            if (!config.keepGoing) break
        }
    }
    if (cyclePassed) println("cycle $cycle: PASS")
}

exitProcess(if (failed) 1 else 0)

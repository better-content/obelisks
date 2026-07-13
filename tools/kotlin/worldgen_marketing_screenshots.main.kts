#!/usr/bin/env kotlin

import java.awt.GraphicsEnvironment
import java.awt.Rectangle
import java.awt.Robot
import java.awt.Toolkit
import java.awt.event.KeyEvent
import java.awt.image.BufferedImage
import java.io.BufferedWriter
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardCopyOption
import java.security.MessageDigest
import java.time.Instant
import java.util.concurrent.TimeUnit
import javax.imageio.ImageIO
import kotlin.io.path.createDirectories
import kotlin.io.path.exists
import kotlin.math.max
import kotlin.system.exitProcess

data class RunningServer(val process: Process, val stdin: BufferedWriter, val log: Path)
data class PhaseResult(val name: String, val status: String, val durationMs: Long, val detail: String? = null)
data class Shot(
    val id: String,
    val file: String,
    val biome: String,
    val subject: String,
    val x: Double,
    val y: Double,
    val z: Double,
    val yaw: Double,
    val pitch: Double,
)
data class DhGateResult(
    val status: String,
    val minSettleSeconds: Int,
    val quietSeconds: Int,
    val timeoutSeconds: Int,
    val elapsedSeconds: Long,
    val dhLogObserved: Boolean,
    val stableSamples: Int,
    val lowTailThresholdChunks: Int,
    val lowTailSeconds: Int,
    val tailChunksLeft: Int?,
    val tailStableSeconds: Long,
)

val root = Paths.get("").toAbsolutePath().normalize()
val width = 1920
val height = 1080
val shaderPack = "ComplementaryReimagined_r5.8.1.zip"
val seed = "btm-worldgen-marketing-v1"
val dhCaptureRadiusChunks = 32
val serverForceloadRadiusChunks = 7

fun usage(message: String? = null): Nothing {
    if (message != null) System.err.println(message)
    System.err.println("Usage: tools/btm test scenario-headful worldgen_marketing_screenshots [--bootstrap-mode always|once|never] [--port N] [--run-root PATH] [--output-dir PATH] [--keep-runs] [--dh-min-settle SECONDS] [--dh-quiet SECONDS] [--dh-timeout SECONDS] [--dh-low-tail-max CHUNKS] [--dh-low-tail-seconds SECONDS]")
    exitProcess(2)
}

if (args.contains("--help")) usage()
val forceXvfb = System.getenv("BTM_FORCE_XVFB") == "1"
if ((forceXvfb || System.getenv("DISPLAY").isNullOrBlank() || GraphicsEnvironment.isHeadless()) && System.getenv("BTM_WORLDGEN_SHOTS_XVFB") != "1") {
    val xvfbRun = listOfNotNull(
        System.getenv("XVFB_RUN")?.takeIf { it.isNotBlank() },
        System.getenv("BTM_XVFB_RUN")?.takeIf { it.isNotBlank() },
        Paths.get(System.getProperty("user.home"), ".local", "bin", "xvfb-run").takeIf { Files.isExecutable(it) }?.toString(),
        "xvfb-run",
    ).first()
    val command = listOf(xvfbRun, "-a", "-s", "-screen 0 ${width}x${height}x24", "kotlin", "-J-Djava.awt.headless=false", root.resolve("tools/kotlin/worldgen_marketing_screenshots.main.kts").toString()) + args
    val process = ProcessBuilder(command).directory(root.toFile()).inheritIO().apply { environment()["BTM_WORLDGEN_SHOTS_XVFB"] = "1" }.start()
    exitProcess(process.waitFor())
}

var bootstrapMode = "always"
var keepRuns = false
var port = System.getenv("BTM_HARNESS_ACTUAL_PORT")?.takeIf { it.isNotBlank() }?.toIntOrNull() ?: 25569
var runRoot = Paths.get(System.getenv("BTM_HARNESS_RUN_ROOT")?.takeIf { it.isNotBlank() } ?: "/tmp/btm-worldgen-marketing-screenshots")
var outputDir = root.resolve("generated/cache/worldgen-marketing")
var dhMinSettle = 120
var dhQuiet = 30
var dhTimeout = 420
var dhLowTailMax = 32
var dhLowTailSeconds = 60
var index = 0
while (index < args.size) {
    when (args[index]) {
        "--bootstrap-mode" -> {
            bootstrapMode = args.getOrNull(index + 1) ?: usage("--bootstrap-mode needs always, once, or never")
            if (bootstrapMode !in setOf("always", "once", "never")) usage("invalid bootstrap mode: $bootstrapMode")
            index += 2
        }
        "--keep-runs" -> {
            keepRuns = true
            index += 1
        }
        "--port" -> {
            port = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--port needs a number")
            index += 2
        }
        "--run-root" -> {
            runRoot = Paths.get(args.getOrNull(index + 1) ?: usage("--run-root needs a path"))
            index += 2
        }
        "--output-dir" -> {
            outputDir = Paths.get(args.getOrNull(index + 1) ?: usage("--output-dir needs a path"))
            index += 2
        }
        "--dh-min-settle" -> {
            dhMinSettle = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--dh-min-settle needs seconds")
            index += 2
        }
        "--dh-quiet" -> {
            dhQuiet = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--dh-quiet needs seconds")
            index += 2
        }
        "--dh-timeout" -> {
            dhTimeout = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--dh-timeout needs seconds")
            index += 2
        }
        "--dh-low-tail-max" -> {
            dhLowTailMax = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--dh-low-tail-max needs chunks")
            index += 2
        }
        "--dh-low-tail-seconds" -> {
            dhLowTailSeconds = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--dh-low-tail-seconds needs seconds")
            index += 2
        }
        "--help" -> usage()
        else -> usage("unknown argument: ${args[index]}")
    }
}

val shots = listOf(
    Shot("01-overworld-forest", "01-overworld-forest.png", "minecraft:forest", "forest canopy and escarpment", 0.5, 95.0, -49.5, 0.0, 12.0),
    Shot("02-overworld-jungle", "02-overworld-jungle.png", "minecraft:jungle", "jungle river valley", 704.5, 105.0, 608.5, 45.0, 20.0),
    Shot("03-overworld-desert", "03-overworld-desert.png", "minecraft:desert", "desert plateau at a jungle boundary", 1152.5, 100.0, 1600.5, 45.0, 18.0),
    Shot("04-overworld-badlands", "04-overworld-badlands.png", "minecraft:badlands", "badlands river basin", 96.5, 105.0, 1632.5, 45.0, 20.0),
    Shot("05-overworld-snowy-plains", "05-overworld-snowy-plains.png", "minecraft:snowy_plains", "snowy plains and ice formations", 32.5, 100.0, -1535.5, 45.0, 18.0),
    Shot("06-overworld-cherry-grove", "06-overworld-cherry-grove.png", "minecraft:cherry_grove", "cherry grove in a mountain amphitheater", 4384.5, 250.0, -543.5, 45.0, 35.0),
)

fun q(value: String?) = if (value == null) "null" else "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\""
fun deleteTree(path: Path) {
    if (!path.exists()) return
    Files.walk(path).use { stream -> stream.sorted(java.util.Comparator.reverseOrder()).forEach(Files::deleteIfExists) }
}
fun run(command: List<String>, timeoutSeconds: Long, output: Path): Int {
    output.parent?.createDirectories()
    val process = ProcessBuilder(command).directory(root.toFile()).redirectErrorStream(true).redirectOutput(output.toFile()).start()
    if (!process.waitFor(timeoutSeconds, TimeUnit.SECONDS)) {
        process.destroy()
        if (!process.waitFor(10, TimeUnit.SECONDS)) process.destroyForcibly()
        return 124
    }
    return process.exitValue()
}
fun tail(path: Path, limit: Long = 1_000_000): String {
    if (!path.exists()) return ""
    path.toFile().inputStream().use { input ->
        input.skip((path.toFile().length() - limit).coerceAtLeast(0))
        return input.readBytes().toString(Charsets.UTF_8)
    }
}
fun readFrom(path: Path, offset: Long, limit: Long = 2_000_000): String {
    if (!path.exists()) return ""
    path.toFile().inputStream().use { input ->
        val size = path.toFile().length()
        val start = offset.coerceAtMost(size).coerceAtLeast((size - limit).coerceAtLeast(0))
        input.skip(start)
        return input.readBytes().toString(Charsets.UTF_8)
    }
}
fun waitFor(path: Path, pattern: Regex, timeoutSeconds: Long, process: Process? = null, minMatches: Int = 1) {
    val deadline = System.currentTimeMillis() + timeoutSeconds * 1000
    while (System.currentTimeMillis() < deadline) {
        if (process != null && !process.isAlive) error("process exited with ${process.exitValue()} while waiting for ${pattern.pattern}")
        if (pattern.findAll(tail(path)).count() >= minMatches) return
        Thread.sleep(500)
    }
    error("timed out waiting for ${pattern.pattern}")
}
fun setServerPort(properties: Path, port: Int) {
    val lines = if (properties.exists()) Files.readAllLines(properties).filterNot { it.startsWith("server-port=") || it.startsWith("level-seed=") }.toMutableList() else mutableListOf()
    lines += "server-port=$port"
    lines += "level-seed=$seed"
    Files.write(properties, lines)
}
fun startServer(serverDir: Path, log: Path): RunningServer {
    setServerPort(serverDir.resolve("server.properties"), port)
    val process = ProcessBuilder("./run.sh", "nogui").directory(serverDir.toFile()).redirectErrorStream(true).redirectOutput(log.toFile()).start()
    return RunningServer(process, process.outputStream.bufferedWriter(), log)
}
fun send(server: RunningServer, command: String, commands: StringBuilder) {
    commands.appendLine(command)
    server.stdin.write(command)
    server.stdin.newLine()
    server.stdin.flush()
}
fun stopServer(server: RunningServer?, commands: StringBuilder) {
    if (server == null || !server.process.isAlive) return
    runCatching { send(server, "stop", commands) }
    if (!server.process.waitFor(60, TimeUnit.SECONDS)) {
        server.process.destroy()
        if (!server.process.waitFor(10, TimeUnit.SECONDS)) server.process.destroyForcibly()
    }
}
fun stopProcess(process: Process?) {
    if (process == null || !process.isAlive) return
    process.destroy()
    if (!process.waitFor(20, TimeUnit.SECONDS)) process.destroyForcibly()
}
fun sha256(path: Path): String {
    val digest = MessageDigest.getInstance("SHA-256")
    Files.newInputStream(path).use { input ->
        val buffer = ByteArray(8192)
        while (true) {
            val read = input.read(buffer)
            if (read < 0) break
            digest.update(buffer, 0, read)
        }
    }
    return digest.digest().joinToString("") { "%02x".format(it) }
}
fun patchColonFile(path: Path, values: Map<String, String>) {
    val seen = mutableSetOf<String>()
    val lines = Files.readAllLines(path).map { line ->
        val key = line.substringBefore(":", "")
        if (key in values) {
            seen += key
            "$key:${values.getValue(key)}"
        } else line
    }.toMutableList()
    for ((key, value) in values) if (key !in seen) lines += "$key:$value"
    Files.write(path, lines)
}
fun patchTomlValue(path: Path, key: String, value: String) {
    val lines = Files.readAllLines(path).map { line ->
        if (Regex("""^\s*${Regex.escape(key)}\s*=""").containsMatchIn(line)) {
            val indent = line.takeWhile { it == ' ' || it == '\t' }
            "$indent$key = $value"
        } else line
    }
    Files.write(path, lines)
}
fun configureClient(clientDir: Path) {
    deleteTree(clientDir.resolve("Distant_Horizons_server_data"))
    deleteTree(clientDir.resolve("saves/New World/data"))
    Files.copy(root.resolve("options.txt"), clientDir.resolve("options.txt"), StandardCopyOption.REPLACE_EXISTING)
    patchColonFile(
        clientDir.resolve("options.txt"),
        mapOf(
            "fullscreen" to "false",
            "overrideWidth" to width.toString(),
            "overrideHeight" to height.toString(),
            "pauseOnLostFocus" to "false",
            "lastServer" to "127.0.0.1:$port",
            "tutorialStep" to "none",
            "skipMultiplayerWarning" to "true",
            "joinedFirstServer" to "true",
            "onboardAccessibility" to "false",
        ),
    )
    Files.writeString(
        clientDir.resolve("config/oculus.properties"),
        """
# Deterministic screenshot capture override.
colorSpace=SRGB
disableUpdateMessage=false
enableDebugOptions=false
maxShadowRenderDistance=16
shaderPack=$shaderPack
enableShaders=true
""".trimIndent() + "\n",
    )
    val dh = clientDir.resolve("config/DistantHorizons.toml")
    patchTomlValue(dh, "showGenerationProgress", "\"LOG\"")
    patchTomlValue(dh, "generationProgressDisableMessageDisplayTimeInSeconds", "0")
    patchTomlValue(dh, "generationProgressDisplayIntervalInSeconds", "2")
    patchTomlValue(dh, "generationProgressIncludeChunksPerSecond", "true")
    patchTomlValue(dh, "maxGenerationRequestDistance", "16")
    patchTomlValue(dh, "maxSyncOnLoadRequestDistance", "24")
    patchTomlValue(dh, "generationRequestRateLimit", "200")
    patchTomlValue(dh, "syncOnLoadRateLimit", "200")
    patchTomlValue(dh, "playerBandwidthLimit", "0")
    patchTomlValue(dh, "lodChunkRenderDistanceRadius", dhCaptureRadiusChunks.toString())
    patchTomlValue(dh, "threadRunTimeRatio", "\"1.0\"")
    patchTomlValue(dh, "numberOfThreads", max(3, Runtime.getRuntime().availableProcessors() - 2).coerceAtMost(8).toString())
}
fun prepareArgfile(clientDir: Path, username: String, out: Path, log: Path) {
    val command = listOf(root.resolve("tools/btm").toString(), "internal", "minecraft-client-argfile", "--client-dir", clientDir.toString(), "--version-id", "1.20.1-forge-47.4.13", "--username", username, "--server", "127.0.0.1:$port", "--out", out.toString())
    if (run(command, 600, log) != 0) error("client argument generation failed; see $log")
    Files.writeString(out, Files.readString(out) + "\"--width\"\n\"$width\"\n\"--height\"\n\"$height\"\n")
}
fun startClient(clientDir: Path, argfile: Path, console: Path): Process {
    Files.deleteIfExists(clientDir.resolve("logs/latest.log"))
    val java17 = listOfNotNull(
        System.getenv("JAVA17")?.takeIf { it.isNotBlank() },
        System.getenv("JAVA_HOME")?.takeIf { it.isNotBlank() }?.let { Paths.get(it).resolve("bin/java").toString() },
        Paths.get(System.getProperty("user.home"), ".local", "opt", "temurin-17", "bin", "java").takeIf { Files.isExecutable(it) }?.toString(),
        "java",
    ).first()
    return ProcessBuilder(java17, "-Xms2G", "-Xmx6G", "@${argfile}")
        .directory(clientDir.toFile()).redirectErrorStream(true).redirectOutput(console.toFile()).start()
}
fun screenshot(robot: Robot, out: Path): BufferedImage {
    out.parent?.createDirectories()
    val image = robot.createScreenCapture(Rectangle(Toolkit.getDefaultToolkit().screenSize))
    ImageIO.write(image, "png", out.toFile())
    return image
}
fun nonblank(image: BufferedImage): Boolean {
    val colors = mutableSetOf<Int>()
    var luminance = 0L
    var samples = 0
    for (y in 0 until image.height step 24) for (x in 0 until image.width step 24) {
        val rgb = image.getRGB(x, y)
        colors += rgb
        luminance += ((rgb shr 16) and 255) + ((rgb shr 8) and 255) + (rgb and 255)
        samples++
    }
    return colors.size >= 16 && luminance > samples * 12L
}
fun waitForPlayableFrame(robot: Robot, out: Path, timeoutSeconds: Long): Boolean {
    val deadline = System.currentTimeMillis() + timeoutSeconds * 1000
    while (System.currentTimeMillis() < deadline) {
        val image = screenshot(robot, out)
        if (nonblank(image)) return true
        Thread.sleep(1_000)
    }
    return false
}
fun dhFiles(clientDir: Path): List<Path> {
    val roots = listOf(clientDir.resolve("Distant_Horizons_server_data"), clientDir.resolve("saves"))
    return roots.filter { it.exists() }.flatMap { rootDir ->
        Files.walk(rootDir).use { stream ->
            stream.filter { Files.isRegularFile(it) && it.fileName.toString().contains("DistantHorizons") }.toList()
        }
    }
}
fun dhSignature(clientDir: Path): String {
    val log = clientDir.resolve("logs/latest.log")
    val logSize = if (log.exists()) Files.size(log) else 0L
    val files = dhFiles(clientDir).sortedBy { it.toString() }.joinToString("|") { "${it.fileName}:${Files.size(it)}:${Files.getLastModifiedTime(it).toMillis()}" }
    return "$logSize|$files"
}
fun waitForDhStable(clientDir: Path): DhGateResult {
    val started = System.currentTimeMillis()
    val deadline = started + dhTimeout * 1000L
    val log = clientDir.resolve("logs/latest.log")
    val logStart = if (log.exists()) Files.size(log) else 0L
    var last = dhSignature(clientDir)
    var lastChange = System.currentTimeMillis()
    var stableSamples = 0
    var tailChunksLeft: Int? = null
    var tailSince: Long? = null
    val progressPattern = Regex("""DH is generating chunks\. ([0-9]+) left""")
    Thread.sleep(dhMinSettle * 1000L)
    while (System.currentTimeMillis() < deadline) {
        val current = dhSignature(clientDir)
        if (current != last) {
            last = current
            lastChange = System.currentTimeMillis()
            stableSamples = 0
        } else {
            stableSamples++
        }
        val quietFor = (System.currentTimeMillis() - lastChange) / 1000
        val logTextSinceGateStart = readFrom(log, logStart)
        val currentTail = progressPattern.findAll(logTextSinceGateStart).lastOrNull()?.groupValues?.getOrNull(1)?.toIntOrNull()
        if (currentTail != null && currentTail <= dhLowTailMax) {
            if (currentTail != tailChunksLeft) {
                tailChunksLeft = currentTail
                tailSince = System.currentTimeMillis()
            }
            val lowTailFor = (System.currentTimeMillis() - (tailSince ?: System.currentTimeMillis())) / 1000
            if (lowTailFor >= dhLowTailSeconds) {
                val logText = tail(log, 2_000_000)
                return DhGateResult("low-tail-stable", dhMinSettle, dhQuiet, dhTimeout, (System.currentTimeMillis() - started) / 1000, Regex("Distant Horizons|DistantHorizons|world gen|generation", RegexOption.IGNORE_CASE).containsMatchIn(logText), stableSamples, dhLowTailMax, dhLowTailSeconds, tailChunksLeft, lowTailFor)
            }
        }
        if (quietFor >= dhQuiet) {
            val logText = tail(log, 2_000_000)
            val tailStableSeconds = if (tailSince == null) 0 else (System.currentTimeMillis() - tailSince!!) / 1000
            return DhGateResult("stable", dhMinSettle, dhQuiet, dhTimeout, (System.currentTimeMillis() - started) / 1000, Regex("Distant Horizons|DistantHorizons|world gen|generation", RegexOption.IGNORE_CASE).containsMatchIn(logText), stableSamples, dhLowTailMax, dhLowTailSeconds, tailChunksLeft, tailStableSeconds)
        }
        Thread.sleep(2_000)
    }
    val logText = tail(log, 2_000_000)
    val tailStableSeconds = if (tailSince == null) 0 else (System.currentTimeMillis() - tailSince!!) / 1000
    return DhGateResult("timeout", dhMinSettle, dhQuiet, dhTimeout, (System.currentTimeMillis() - started) / 1000, Regex("Distant Horizons|DistantHorizons|world gen|generation", RegexOption.IGNORE_CASE).containsMatchIn(logText), stableSamples, dhLowTailMax, dhLowTailSeconds, tailChunksLeft, tailStableSeconds)
}
fun writeReview(path: Path, shot: Shot, dh: DhGateResult) {
    val review = """
{
  "schema": "btm.screenshot_review.v1",
  "image": ${q(path.fileName.toString())},
  "sha256": ${q(sha256(path))},
  "style": "storefront",
  "crop": "16:9",
  "intendedSubject": ${q(shot.subject)},
  "capture": {
    "determinismProfile": "worldgen-marketing-v1",
    "seed": ${q(seed)},
    "dimension": "minecraft:overworld",
    "biome": ${q(shot.biome)},
    "camera": {"x": ${shot.x}, "y": ${shot.y}, "z": ${shot.z}, "yaw": ${shot.yaw}, "pitch": ${shot.pitch}},
    "fov": 70,
    "weather": "clear",
    "time": "morning",
    "terrainAltered": false,
    "resolution": "${width}x${height}",
    "shaderPack": ${q(shaderPack)},
    "shaderPreset": ${q("shaderpacks/$shaderPack.txt")},
    "optionsSource": "options.txt",
    "dhCaptureRadiusChunks": $dhCaptureRadiusChunks,
    "dhGate": {"status": ${q(dh.status)}, "elapsedSeconds": ${dh.elapsedSeconds}, "minSettleSeconds": ${dh.minSettleSeconds}, "quietSeconds": ${dh.quietSeconds}, "timeoutSeconds": ${dh.timeoutSeconds}, "dhLogObserved": ${dh.dhLogObserved}, "stableSamples": ${dh.stableSamples}, "lowTailThresholdChunks": ${dh.lowTailThresholdChunks}, "lowTailSeconds": ${dh.lowTailSeconds}, "tailChunksLeft": ${dh.tailChunksLeft ?: "null"}, "tailStableSeconds": ${dh.tailStableSeconds}}
  },
  "rubricVersion": "1",
  "reviewer": "pending vision review",
  "model": "pending",
  "reviewedAt": ${q(Instant.now().toString())},
  "scores": {},
  "findings": [],
  "advice": "Vision AI review required before publication.",
  "decision": "pending"
}
""".trimIndent() + "\n"
    Files.writeString(path.resolveSibling(path.fileName.toString().removeSuffix(".png") + ".review.json"), review)
}

runRoot = runRoot.toAbsolutePath().normalize()
outputDir = outputDir.toAbsolutePath().normalize()
val evidence = runRoot.resolve("evidence")
val raw = outputDir.resolve("raw-corrected")
val final = outputDir.resolve("final-corrected")
val serverDir = runRoot.resolve("server")
val clientDir = runRoot.resolve("client")
val commands = StringBuilder()
val phases = mutableListOf<PhaseResult>()
var server: RunningServer? = null
var client: Process? = null
var failure: Throwable? = null
evidence.createDirectories()
raw.createDirectories()
final.createDirectories()
val robot = Robot()

fun phase(name: String, block: () -> Unit) {
    val started = System.nanoTime()
    try {
        block()
        phases += PhaseResult(name, "passed", (System.nanoTime() - started) / 1_000_000)
    } catch (error: Throwable) {
        phases += PhaseResult(name, "failed", (System.nanoTime() - started) / 1_000_000, error.message)
        throw error
    }
}

try {
    phase("prepare_runtimes") {
        if (!keepRuns && bootstrapMode != "never") {
            deleteTree(serverDir)
            deleteTree(clientDir)
        }
        if (bootstrapMode != "never" || !serverDir.resolve("run.sh").exists()) {
            val command = listOf(root.resolve("tools/btm").toString(), "internal", "prepare-server-runtime", "--server-dir", serverDir.toString(), "--port", port.toString(), "--reset-runtime")
            commands.appendLine(command.joinToString(" "))
            if (run(command, 1_200, evidence.resolve("prepare-server.log")) != 0) error("server runtime preparation failed")
        }
        if (bootstrapMode != "never" || !clientDir.resolve("versions/1.20.1-forge-47.4.13").exists()) {
            val command = listOf(root.resolve("tools/btm").toString(), "internal", "prepare-client-runtime", "--client-dir", clientDir.toString())
            commands.appendLine(command.joinToString(" "))
            if (run(command, 1_800, evidence.resolve("prepare-client.log")) != 0) error("client runtime preparation failed")
        }
        configureClient(clientDir)
        prepareArgfile(clientDir, "AgentShot", evidence.resolve("client.args"), evidence.resolve("client-argfile.log"))
    }
    phase("server_boot") {
        deleteTree(serverDir.resolve("world/data"))
        deleteTree(serverDir.resolve("world/dimensions"))
        server = startServer(serverDir, evidence.resolve("server-console.log"))
        waitFor(server!!.log, Regex("Done \\([0-9.]+s\\)!"), 900, server!!.process)
        send(server!!, "op AgentShot", commands)
        send(server!!, "gamerule doDaylightCycle false", commands)
        send(server!!, "gamerule doWeatherCycle false", commands)
        send(server!!, "weather clear", commands)
        send(server!!, "time set 1000", commands)
    }
    phase("client_join") {
        val joins = Regex("AgentShot joined the game").findAll(tail(server!!.log)).count()
        client = startClient(clientDir, evidence.resolve("client.args"), evidence.resolve("client-console.log"))
        waitFor(server!!.log, Regex("AgentShot joined the game"), 900, client, joins + 1)
        Thread.sleep(8_000)
        robot.keyPress(KeyEvent.VK_ESCAPE)
        robot.keyRelease(KeyEvent.VK_ESCAPE)
        Thread.sleep(500)
        robot.keyPress(KeyEvent.VK_F1)
        robot.keyRelease(KeyEvent.VK_F1)
        send(server!!, "gamemode spectator AgentShot", commands)
        send(server!!, "effect clear AgentShot", commands)
        if (!waitForPlayableFrame(robot, evidence.resolve("joined-playable.png"), 180)) error("client never produced a playable frame")
    }
    phase("capture_shots") {
        val captured = mutableListOf<String>()
        for (shot in shots) {
            send(server!!, "weather clear", commands)
            send(server!!, "time set 1000", commands)
            send(server!!, "tp AgentShot ${shot.x} ${shot.y} ${shot.z} ${shot.yaw} ${shot.pitch}", commands)
            val chunkX = Math.floor(shot.x / 16.0).toInt()
            val chunkZ = Math.floor(shot.z / 16.0).toInt()
            val fromBlockX = (chunkX - serverForceloadRadiusChunks) * 16
            val fromBlockZ = (chunkZ - serverForceloadRadiusChunks) * 16
            val toBlockX = (chunkX + serverForceloadRadiusChunks) * 16
            val toBlockZ = (chunkZ + serverForceloadRadiusChunks) * 16
            send(server!!, "forceload add $fromBlockX $fromBlockZ $toBlockX $toBlockZ", commands)
            Thread.sleep(8_000)
            val dh = waitForDhStable(clientDir)
            if (dh.status !in setOf("stable", "low-tail-stable")) error("DH did not reach a stable quiet window or bounded low-tail state for ${shot.id}")
            Thread.sleep(15_000)
            val rawPath = raw.resolve(shot.file)
            val finalPath = final.resolve(shot.file)
            screenshot(robot, rawPath)
            Files.copy(rawPath, finalPath, StandardCopyOption.REPLACE_EXISTING)
            writeReview(finalPath, shot, dh)
            captured += finalPath.toString()
        }
        Files.writeString(evidence.resolve("captured-files.txt"), captured.joinToString("\n", postfix = "\n"))
    }
} catch (error: Throwable) {
    failure = error
} finally {
    stopProcess(client)
    stopServer(server, commands)
    Files.writeString(evidence.resolve("server-commands.txt"), commands.toString())
}

val manifest = buildString {
    appendLine("{")
    appendLine("  \"schema\": \"btm.worldgen_marketing_screenshots.v1\",")
    appendLine("  \"status\": ${q(if (failure == null) "passed" else "failed")},")
    appendLine("  \"error\": ${q(failure?.message)},")
    appendLine("  \"seed\": ${q(seed)},")
    appendLine("  \"shaderPack\": ${q(shaderPack)},")
    appendLine("  \"resolution\": \"${width}x${height}\",")
    appendLine("  \"runRoot\": ${q(runRoot.toString())},")
    appendLine("  \"outputDir\": ${q(outputDir.toString())},")
    appendLine("  \"phases\": [")
    appendLine(phases.joinToString(",\n") { phase ->
        "    {\"name\":${q(phase.name)},\"status\":${q(phase.status)},\"durationMs\":${phase.durationMs},\"detail\":${q(phase.detail)}}"
    })
    appendLine("  ],")
    appendLine("  \"shots\": [")
    appendLine(shots.joinToString(",\n") { shot ->
        "    {\"id\":${q(shot.id)},\"path\":${q(final.resolve(shot.file).toString())},\"review\":${q(final.resolve(shot.file.removeSuffix(".png") + ".review.json").toString())},\"biome\":${q(shot.biome)},\"subject\":${q(shot.subject)},\"camera\":{\"x\":${shot.x},\"y\":${shot.y},\"z\":${shot.z},\"yaw\":${shot.yaw},\"pitch\":${shot.pitch}}}"
    })
    appendLine("  ]")
    appendLine("}")
}
Files.writeString(runRoot.resolve("latest-summary.json"), manifest)
Files.writeString(outputDir.resolve("latest-corrected-manifest.json"), manifest)

if (failure != null) {
    System.err.println("worldgen marketing screenshot capture failed: ${failure!!.message}")
    exitProcess(1)
}
println("worldgen marketing screenshots captured: ${final}")

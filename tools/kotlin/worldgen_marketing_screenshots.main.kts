#!/usr/bin/env kotlin

import java.awt.GraphicsEnvironment
import java.awt.Rectangle
import java.awt.Robot
import java.awt.Toolkit
import java.awt.event.KeyEvent
import java.awt.image.BufferedImage
import java.io.BufferedWriter
import java.io.PrintWriter
import java.io.StringWriter
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
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.sin
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
    val structures: List<String> = emptyList(),
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
data class FrameAssessment(
    val accepted: Boolean,
    val reason: String? = null,
    val entropy: Double = 0.0,
    val edgeDensity: Double = 0.0,
    val luminanceRange: Int = 0,
)
data class CameraPose(
    val x: Double,
    val y: Double,
    val z: Double,
    val yaw: Double,
    val pitch: Double,
)
data class LocatedAnchor(
    val shot: Shot,
    val mode: String,
    val detail: String,
)
data class CandidateFrame(
    val label: String,
    val pose: CameraPose,
    val path: Path,
    val frame: FrameAssessment,
    val score: Double,
    val detail: String,
)
data class CompositionScore(
    val accepted: Boolean,
    val score: Double,
    val detail: String,
    val rejectionReason: String? = null,
)
data class CandidateReport(
    val label: String,
    val pose: CameraPose,
    val path: Path,
    val frame: FrameAssessment,
    val composition: CompositionScore?,
)
data class ShotResult(
    val shot: Shot,
    val status: String,
    val path: Path,
    val review: Path,
    val failureReason: String? = null,
    val promptHandling: String = "not-run",
    val dh: DhGateResult? = null,
    val selectedCamera: CameraPose? = null,
    val candidateLabel: String? = null,
    val candidateScore: Double? = null,
    val anchorMode: String? = null,
    val anchorDetail: String? = null,
)

val root = Paths.get("").toAbsolutePath().normalize()
val width = 1920
val height = 1080
val shaderPack = "ComplementaryReimagined_r5.8.1.zip"
val seed = "btm-worldgen-marketing-v1"
var dhCaptureRadiusChunks = 32
var serverForceloadRadiusChunks = 3
val captureFovDegrees = 80
val availableProcessors = Runtime.getRuntime().availableProcessors()
val screenshotClientDhThreads = max(3, availableProcessors - 2).coerceAtMost(8)
val screenshotServerDhThreads = availableProcessors
val cameraSweepFocusDistance = 48.0
val maxFeatureAnchorDistanceBlocks = 768.0
// Vanilla's FOV option is normalized across the 30-110 degree range.
val captureFovOptionValue = (captureFovDegrees - 30.0) / 80.0
val knownBadFrameMarkers = listOf(
    "start chunk scanning",
    "press k to set your starting spawn and begin",
    "connection lost",
    "disconnected",
    "multiplayer game",
    "saving world",
    "pause menu",
    "game menu",
)

fun usage(message: String? = null): Nothing {
    if (message != null) System.err.println(message)
    System.err.println("Usage: tools/btm test scenario-headful worldgen_marketing_screenshots [--bootstrap-mode always|once|never] [--port N] [--run-root PATH] [--output-dir PATH] [--keep-runs] [--batch-mode bounded|session] [--start-shot N|SHOT_ID] [--end-shot N|SHOT_ID] [--dh-capture-radius CHUNKS] [--server-forceload-radius CHUNKS] [--dh-min-settle SECONDS] [--dh-quiet SECONDS] [--dh-timeout SECONDS] [--dh-low-tail-max CHUNKS] [--dh-low-tail-seconds SECONDS] [--allow-low-tail-dh] [--camera-search off|local-sweep] [--anchor-search off|locate-biome|locate-feature]")
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
var runRoot = Paths.get(
    System.getenv("BTM_HARNESS_RUN_ROOT")?.takeIf { it.isNotBlank() }
        ?: System.getenv("BTM_WORLDGEN_SHOTS_RUN_ROOT")?.takeIf { it.isNotBlank() }
        ?: Paths.get(System.getProperty("user.home"), ".cache", "btm", "worldgen-marketing-screenshots").toString(),
)
var outputDir = root.resolve("generated/cache/worldgen-marketing")
var startShotArg: String? = null
var endShotArg: String? = null
var dhMinSettle = 120
var dhQuiet = 30
var dhTimeout = 420
var dhLowTailMax = 32
var dhLowTailSeconds = 60
var batchMode = "bounded"
var cameraSearchMode = "local-sweep"
var anchorSearchMode = "locate-biome"
var allowLowTailDh = false
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
        "--allow-low-tail-dh" -> {
            allowLowTailDh = true
            index += 1
        }
        "--batch-mode" -> {
            batchMode = args.getOrNull(index + 1) ?: usage("--batch-mode needs bounded or session")
            if (batchMode !in setOf("bounded", "session")) usage("invalid batch mode: $batchMode")
            index += 2
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
        "--start-shot" -> {
            startShotArg = args.getOrNull(index + 1) ?: usage("--start-shot needs a shot index or id")
            index += 2
        }
        "--end-shot" -> {
            endShotArg = args.getOrNull(index + 1) ?: usage("--end-shot needs a shot index or id")
            index += 2
        }
        "--dh-min-settle" -> {
            dhMinSettle = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--dh-min-settle needs seconds")
            index += 2
        }
        "--dh-capture-radius" -> {
            dhCaptureRadiusChunks = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--dh-capture-radius needs chunks")
            if (dhCaptureRadiusChunks !in 8..256) usage("--dh-capture-radius must be between 8 and 256 chunks")
            index += 2
        }
        "--server-forceload-radius" -> {
            serverForceloadRadiusChunks = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--server-forceload-radius needs chunks")
            if (serverForceloadRadiusChunks !in 0..8) usage("--server-forceload-radius must be between 0 and 8 chunks")
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
        "--camera-search" -> {
            cameraSearchMode = args.getOrNull(index + 1) ?: usage("--camera-search needs off or local-sweep")
            if (cameraSearchMode !in setOf("off", "local-sweep")) usage("invalid camera search mode: $cameraSearchMode")
            index += 2
        }
        "--anchor-search" -> {
            anchorSearchMode = args.getOrNull(index + 1) ?: usage("--anchor-search needs off, locate-biome, or locate-feature")
            if (anchorSearchMode !in setOf("off", "locate-biome", "locate-feature")) usage("invalid anchor search mode: $anchorSearchMode")
            index += 2
        }
        "--help" -> usage()
        else -> usage("unknown argument: ${args[index]}")
    }
}

// These marketing anchors remain deterministic, but the camera height stays
// deliberately above the local terrain so spectator mode never captures from
// inside hillsides or dense canopy.
val shots = listOf(
    Shot("01-overworld-forest", "01-overworld-forest.png", "minecraft:forest", "forest canopy and escarpment", 0.5, 220.0, -49.5, 0.0, 10.0, listOf("minecraft:village_plains", "minecraft:pillager_outpost", "minecraft:trail_ruins")),
    Shot("02-overworld-jungle", "02-overworld-jungle.png", "minecraft:jungle", "jungle river valley", 704.5, 186.0, 608.5, 45.0, 28.0, listOf("minecraft:jungle_pyramid", "minecraft:trail_ruins", "minecraft:ruined_portal")),
    Shot("03-overworld-desert", "03-overworld-desert.png", "minecraft:desert", "desert plateau at a jungle boundary", 1152.5, 176.0, 1600.5, 45.0, 24.0, listOf("minecraft:desert_pyramid", "minecraft:village_desert", "minecraft:ruined_portal_desert")),
    Shot("04-overworld-badlands", "04-overworld-badlands.png", "minecraft:badlands", "badlands river basin", 96.5, 188.0, 1632.5, 45.0, 28.0, listOf("minecraft:mineshaft_mesa", "minecraft:ruined_portal", "minecraft:trail_ruins")),
    Shot("05-overworld-snowy-plains", "05-overworld-snowy-plains.png", "minecraft:snowy_plains", "snowy plains and ice formations", 32.5, 172.0, -1535.5, 45.0, 24.0, listOf("minecraft:village_snowy", "minecraft:igloo", "minecraft:pillager_outpost")),
    Shot("06-overworld-cherry-grove", "06-overworld-cherry-grove.png", "minecraft:cherry_grove", "cherry grove in a mountain amphitheater", 4384.5, 320.0, -543.5, 45.0, 42.0, listOf("minecraft:ancient_city", "minecraft:trail_ruins", "minecraft:ruined_portal_mountain")),
)
fun resolveShotIndex(arg: String?, flag: String, defaultIndex: Int): Int = when (arg) {
    null -> defaultIndex
    else -> {
        val numeric = arg.toIntOrNull()
        when {
            numeric != null && numeric in 1..shots.size -> numeric - 1
            else -> shots.indexOfFirst { it.id == arg || it.file == arg }.takeIf { it >= 0 }
                ?: usage("unknown $flag value: $arg")
        }
    }
}
val startShotIndex = resolveShotIndex(startShotArg, "--start-shot", 0)
val endShotIndex = resolveShotIndex(endShotArg, "--end-shot", shots.lastIndex)
if (endShotIndex < startShotIndex) usage("--end-shot must be at or after --start-shot")
val selectedShots = shots.subList(startShotIndex, endShotIndex + 1)

fun q(value: String?) = if (value == null) "null" else "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\""

// A batch is intentionally a sequence of independent one-shot runtimes. This
// keeps a single stalled client or disconnected server from invalidating later shots.
if (batchMode == "bounded" && selectedShots.size > 1) {
    val batchRoot = runRoot.toAbsolutePath().normalize()
    val segments = batchRoot.resolve("segments")
    val summaries = mutableListOf<Pair<Shot, Path>>()
    var failedSegments = 0
    for (shot in selectedShots) {
        val segmentRoot = segments.resolve(shot.id)
        val command = listOf(
            "kotlin", "-J-Djava.awt.headless=false", root.resolve("tools/kotlin/worldgen_marketing_screenshots.main.kts").toString(),
            "--bootstrap-mode", bootstrapMode,
            "--port", port.toString(),
            "--run-root", segmentRoot.toString(),
            "--output-dir", outputDir.toAbsolutePath().normalize().toString(),
            "--batch-mode", "session",
            "--start-shot", shot.id,
            "--end-shot", shot.id,
            "--dh-min-settle", dhMinSettle.toString(),
            "--dh-quiet", dhQuiet.toString(),
            "--dh-timeout", dhTimeout.toString(),
            "--dh-low-tail-max", dhLowTailMax.toString(),
            "--dh-low-tail-seconds", dhLowTailSeconds.toString(),
            "--camera-search", cameraSearchMode,
            "--anchor-search", anchorSearchMode,
        ) +
            (if (keepRuns) listOf("--keep-runs") else emptyList()) +
            (if (allowLowTailDh) listOf("--allow-low-tail-dh") else emptyList())
        val process = ProcessBuilder(command).directory(root.toFile()).inheritIO().start()
        if (process.waitFor() != 0) failedSegments++
        summaries += shot to segmentRoot.resolve("latest-summary.json")
    }
    val aggregate = buildString {
        appendLine("{")
        appendLine("  \"schema\": \"btm.worldgen_marketing_screenshots.v1\",")
        appendLine("  \"status\": ${q(if (failedSegments == 0) "technical-pass-pending-ai-review" else "failed")},")
        appendLine("  \"batchMode\": \"bounded\",")
        appendLine("  \"fov\": $captureFovDegrees,")
        appendLine("  \"seed\": ${q(seed)},")
        appendLine("  \"shaderPack\": ${q(shaderPack)},")
        appendLine("  \"shots\": [")
        appendLine(summaries.joinToString(",\n") { (shot, summary) ->
            val summaryText = if (summary.exists()) Files.readString(summary) else ""
            val status = if ("\"status\": \"technical-pass-pending-ai-review\"" in summaryText) "technical-pass-pending-ai-review" else "failed"
            "    {\"id\":${q(shot.id)},\"status\":${q(status)},\"summary\":${q(summary.toString())}}"
        })
        appendLine("  ]")
        appendLine("}")
    }
    batchRoot.createDirectories()
    outputDir.toAbsolutePath().normalize().createDirectories()
    Files.writeString(batchRoot.resolve("latest-summary.json"), aggregate)
    Files.writeString(outputDir.toAbsolutePath().normalize().resolve("latest-corrected-manifest.json"), aggregate)
    if (failedSegments != 0) exitProcess(1)
    println("worldgen marketing screenshot batch completed: ${outputDir.resolve("final-corrected")}")
    exitProcess(0)
}
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
fun fileSize(path: Path): Long = if (path.exists()) path.toFile().length() else 0L
fun waitFor(path: Path, pattern: Regex, timeoutSeconds: Long, process: Process? = null, minMatches: Int = 1) {
    val deadline = System.currentTimeMillis() + timeoutSeconds * 1000
    while (System.currentTimeMillis() < deadline) {
        if (process != null && !process.isAlive) error("process exited with ${process.exitValue()} while waiting for ${pattern.pattern}")
        if (pattern.findAll(tail(path)).count() >= minMatches) return
        Thread.sleep(500)
    }
    error("timed out waiting for ${pattern.pattern}")
}
fun waitForLogAfter(path: Path, offset: Long, pattern: Regex, timeoutMillis: Long, process: Process? = null): Boolean {
    val deadline = System.currentTimeMillis() + timeoutMillis
    while (System.currentTimeMillis() < deadline) {
        if (process != null && !process.isAlive) return false
        if (pattern.containsMatchIn(readFrom(path, offset))) return true
        Thread.sleep(250)
    }
    return false
}
fun setServerPort(properties: Path, port: Int) {
    val lines = if (properties.exists()) Files.readAllLines(properties).filterNot { it.startsWith("server-port=") || it.startsWith("level-seed=") }.toMutableList() else mutableListOf()
    lines += "server-port=$port"
    lines += "level-seed=$seed"
    Files.write(properties, lines)
}
fun startServer(serverDir: Path, log: Path): RunningServer {
    setServerPort(serverDir.resolve("server.properties"), port)
    val process = ProcessBuilder("./run.sh", "nogui").directory(serverDir.toFile()).redirectErrorStream(true).redirectOutput(log.toFile()).apply {
        environment()["JAVA_TOOL_OPTIONS"] = "-Djava.io.tmpdir=${serverDir.resolve(".java-tmp").toAbsolutePath()}"
    }.start()
    return RunningServer(process, process.outputStream.bufferedWriter(), log)
}
fun send(server: RunningServer, command: String, commands: StringBuilder) {
    commands.appendLine(command)
    if (!server.process.isAlive) error("server is not running while sending command: $command")
    try {
        server.stdin.write(command)
        server.stdin.newLine()
        server.stdin.flush()
    } catch (error: java.io.IOException) {
        throw IllegalStateException("server command pipe closed while sending command: $command", error)
    }
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
fun patchJsonBooleans(path: Path, keys: Collection<String>, value: Boolean) {
    if (!path.exists()) return
    var text = Files.readString(path)
    for (key in keys) {
        val pattern = Regex("(\\\"${Regex.escape(key)}\\\"\\s*:\\s*)(true|false)")
        text = text.replace(pattern) { match -> match.groupValues[1] + value }
    }
    Files.writeString(path, text)
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
            "chatVisibility" to "2",
            "fov" to captureFovOptionValue.toString(),
        ),
    )
    patchJsonBooleans(
        clientDir.resolve("config/no-more-popups.json"),
        listOf(
            "advancements.messages", "advancements.toasts", "experimental_warning",
            "multiplayer_warning", "recipes_toasts", "resource_pack_warnings",
            "system_toasts", "tutorials",
        ),
        false,
    )
    // Block indexing is not relevant to a still capture and can open a modal prompt.
    val explosionOverhaul = clientDir.resolve("config/explosionoverhaul/explosionoverhaul-common.toml")
    patchTomlValue(explosionOverhaul, "enableBlockIndexing", "false")
    patchTomlValue(explosionOverhaul, "showScanProgressHUD", "false")
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
    patchTomlValue(dh, "maxGenerationRequestDistance", dhCaptureRadiusChunks.toString())
    patchTomlValue(dh, "maxSyncOnLoadRequestDistance", dhCaptureRadiusChunks.toString())
    patchTomlValue(dh, "generationRequestRateLimit", "500")
    patchTomlValue(dh, "syncOnLoadRateLimit", "500")
    patchTomlValue(dh, "playerBandwidthLimit", "0")
    patchTomlValue(dh, "lodChunkRenderDistanceRadius", dhCaptureRadiusChunks.toString())
    patchTomlValue(dh, "threadRunTimeRatio", "\"1.0\"")
    patchTomlValue(dh, "numberOfThreads", screenshotClientDhThreads.toString())
}
fun configureServer(serverDir: Path) {
    // Explosion Overhaul's scan-decision modal is initiated by the server, so
    // this must be disabled on both disposable sides of the screenshot lane.
    val explosionOverhaul = serverDir.resolve("config/explosionoverhaul/explosionoverhaul-common.toml")
    patchTomlValue(explosionOverhaul, "enableBlockIndexing", "false")
    patchTomlValue(explosionOverhaul, "showScanProgressHUD", "false")
    val dh = serverDir.resolve("config/DistantHorizons.toml")
    patchTomlValue(dh, "threadRunTimeRatio", "\"1.0\"")
    patchTomlValue(dh, "numberOfThreads", screenshotServerDhThreads.toString())
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
    return ProcessBuilder(java17, "-Djava.io.tmpdir=${clientDir.resolve(".java-tmp").toAbsolutePath()}", "-Xms2G", "-Xmx6G", "@${argfile}")
        .directory(clientDir.toFile()).redirectErrorStream(true).redirectOutput(console.toFile()).start()
}
fun screenshot(robot: Robot, out: Path): BufferedImage {
    out.parent?.createDirectories()
    val image = robot.createScreenCapture(Rectangle(Toolkit.getDefaultToolkit().screenSize))
    ImageIO.write(image, "png", out.toFile())
    return image
}
fun CameraPose.asCommandArgs() = "${x.format1()} ${y.format1()} ${z.format1()} ${yaw.format1()} ${pitch.format1()}"
fun Double.format1() = String.format(java.util.Locale.US, "%.1f", this)
fun Shot.basePose() = CameraPose(x, y, z, yaw, pitch)
fun forwardVector(yaw: Double, pitch: Double): Triple<Double, Double, Double> {
    val yawRad = Math.toRadians(yaw)
    val pitchRad = Math.toRadians(pitch)
    val horizontal = cos(pitchRad)
    return Triple(-sin(yawRad) * horizontal, -sin(pitchRad), cos(yawRad) * horizontal)
}
fun rightVector(yaw: Double): Pair<Double, Double> {
    val yawRad = Math.toRadians(yaw)
    return Pair(cos(yawRad), sin(yawRad))
}
fun lookAt(fromX: Double, fromY: Double, fromZ: Double, targetX: Double, targetY: Double, targetZ: Double): CameraPose {
    val dx = targetX - fromX
    val dy = targetY - fromY
    val dz = targetZ - fromZ
    val yaw = Math.toDegrees(atan2(-dx, dz))
    val pitch = -Math.toDegrees(atan2(dy, hypot(dx, dz)))
    return CameraPose(fromX, fromY, fromZ, yaw, pitch)
}
fun candidatePoses(shot: Shot): List<Pair<String, CameraPose>> {
    val base = shot.basePose()
    val (fx, fy, fz) = forwardVector(base.yaw, base.pitch)
    val targetX = base.x + fx * cameraSweepFocusDistance
    val targetY = base.y + fy * cameraSweepFocusDistance
    val targetZ = base.z + fz * cameraSweepFocusDistance
    val (rx, rz) = rightVector(base.yaw)
    fun pose(label: String, right: Double = 0.0, forward: Double = 0.0, up: Double = 0.0, targetLift: Double = 0.0): Pair<String, CameraPose> {
        val x = base.x + rx * right + fx * forward
        val y = base.y + up
        val z = base.z + rz * right + fz * forward
        return label to lookAt(x, y, z, targetX, targetY + targetLift, targetZ)
    }
    return listOf(
        "base" to base,
        pose("left-low", right = -12.0),
        pose("right-low", right = 12.0),
        pose("back-high", forward = -14.0, up = 8.0),
        pose("left-back-high", right = -20.0, forward = -10.0, up = 10.0),
        pose("right-back-high", right = 20.0, forward = -10.0, up = 10.0),
        pose("high-pullback", forward = -24.0, up = 16.0),
        pose("low-forward", forward = 10.0, up = -7.0),
        pose("high-forward", forward = 8.0, up = 12.0),
        pose("wide-left", right = -36.0, forward = -20.0, up = 14.0),
        pose("wide-right", right = 36.0, forward = -20.0, up = 14.0),
        pose("very-high-pullback", forward = -42.0, up = 28.0),
        pose("left-compress", right = -18.0, forward = 12.0, up = 4.0),
        pose("right-compress", right = 18.0, forward = 12.0, up = 4.0),
        pose("look-low", up = 8.0, targetLift = -18.0),
        pose("look-high", up = -4.0, targetLift = 18.0),
        pose("left-look-low", right = -24.0, forward = -8.0, up = 10.0, targetLift = -16.0),
        pose("right-look-low", right = 24.0, forward = -8.0, up = 10.0, targetLift = -16.0),
    )
}
fun assessFrame(image: BufferedImage): FrameAssessment {
    if (image.width != width || image.height != height) {
        return FrameAssessment(false, "unexpected frame size ${image.width}x${image.height}")
    }
    val bins = IntArray(4096)
    var samples = 0
    var minLuminance = 255
    var maxLuminance = 0
    var edges = 0
    var comparisons = 0
    var nearBlack = 0
    var nearWhite = 0
    for (y in 0 until image.height step 8) for (x in 0 until image.width step 8) {
        val rgb = image.getRGB(x, y)
        val red = (rgb shr 16) and 255
        val green = (rgb shr 8) and 255
        val blue = rgb and 255
        if (red < 12 && green < 12 && blue < 12) nearBlack++
        if (red > 235 && green > 235 && blue > 235) nearWhite++
        bins[(red shr 4) * 256 + (green shr 4) * 16 + (blue shr 4)]++
        val luminance = (red * 54 + green * 183 + blue * 19) / 256
        minLuminance = minOf(minLuminance, luminance)
        maxLuminance = maxOf(maxLuminance, luminance)
        if (x >= 8) {
            val previous = image.getRGB(x - 8, y)
            val difference = kotlin.math.abs(red - ((previous shr 16) and 255)) + kotlin.math.abs(green - ((previous shr 8) and 255)) + kotlin.math.abs(blue - (previous and 255))
            if (difference > 60) edges++
            comparisons++
        }
        samples++
    }
    val entropy = bins.filter { it > 0 }.sumOf { count ->
        val probability = count.toDouble() / samples
        -probability * ln(probability)
    }
    val edgeDensity = edges.toDouble() / comparisons.coerceAtLeast(1)
    val luminanceRange = maxLuminance - minLuminance
    val blackFraction = nearBlack.toDouble() / samples
    val whiteFraction = nearWhite.toDouble() / samples
    if (entropy < 1.35 || luminanceRange < 18 || edgeDensity < 0.004) {
        return FrameAssessment(false, "low-entropy or flat non-world frame", entropy, edgeDensity, luminanceRange)
    }
    if (blackFraction > 0.42 && whiteFraction > 0.12) {
        return FrameAssessment(false, "xray-like geometry corruption signature", entropy, edgeDensity, luminanceRange)
    }
    return FrameAssessment(true, entropy = entropy, edgeDensity = edgeDensity, luminanceRange = luminanceRange)
}
fun scoreCandidateFrame(image: BufferedImage, frame: FrameAssessment): CompositionScore {
    val thirdsVertical = DoubleArray(3)
    val thirdsHorizontal = DoubleArray(3)
    val edgeBands = DoubleArray(6)
    val saturationBands = DoubleArray(3)
    var centerEdges = 0
    var thirdLineEdges = 0
    var totalEdges = 0
    var topBlank = 0
    var topSamples = 0
    var bottomBlank = 0
    var bottomSamples = 0
    var colorfulnessTotal = 0.0
    var luminanceTotal = 0.0
    var luminanceSquaredTotal = 0.0
    var samples = 0
    for (y in 8 until image.height step 8) for (x in 8 until image.width step 8) {
        val rgb = image.getRGB(x, y)
        val previous = image.getRGB(x - 8, y)
        val red = (rgb shr 16) and 255
        val green = (rgb shr 8) and 255
        val blue = rgb and 255
        val difference = kotlin.math.abs(red - ((previous shr 16) and 255)) +
            kotlin.math.abs(green - ((previous shr 8) and 255)) +
            kotlin.math.abs(blue - (previous and 255))
        val maxChannel = maxOf(red, green, blue)
        val minChannel = minOf(red, green, blue)
        val saturation = if (maxChannel == 0) 0.0 else (maxChannel - minChannel).toDouble() / maxChannel
        val luminance = (red * 54 + green * 183 + blue * 19) / 256.0
        val rg = kotlin.math.abs(red - green)
        val yb = kotlin.math.abs((red + green) / 2 - blue)
        colorfulnessTotal += (rg + yb).toDouble() / 510.0
        luminanceTotal += luminance
        luminanceSquaredTotal += luminance * luminance
        saturationBands[(y * 3) / image.height] += saturation
        samples++
        if (difference > 60) {
            val v = (y * 3) / image.height
            val h = (x * 3) / image.width
            thirdsVertical[v]++
            thirdsHorizontal[h]++
            edgeBands[(y * 6) / image.height]++
            totalEdges++
            if (x in (image.width * 3 / 10)..(image.width * 7 / 10) && y in (image.height * 2 / 10)..(image.height * 8 / 10)) centerEdges++
            val nearVerticalThird = kotlin.math.min(kotlin.math.abs(x - image.width / 3), kotlin.math.abs(x - image.width * 2 / 3)) < image.width / 18
            val nearHorizontalThird = kotlin.math.min(kotlin.math.abs(y - image.height / 3), kotlin.math.abs(y - image.height * 2 / 3)) < image.height / 18
            if (nearVerticalThird || nearHorizontalThird) thirdLineEdges++
        }
        if (y < image.height / 3) {
            topSamples++
            if (difference <= 12) topBlank++
        }
        if (y > image.height * 2 / 3) {
            bottomSamples++
            if (difference <= 12) bottomBlank++
        }
    }
    val total = totalEdges.coerceAtLeast(1).toDouble()
    val verticalCoverage = thirdsVertical.count { it / total > 0.12 }
    val horizontalCoverage = thirdsHorizontal.count { it / total > 0.12 }
    val centerFraction = centerEdges / total
    val thirdLineFraction = thirdLineEdges / total
    val topBlankFraction = topBlank.toDouble() / topSamples.coerceAtLeast(1)
    val bottomBlankFraction = bottomBlank.toDouble() / bottomSamples.coerceAtLeast(1)
    val colorfulness = colorfulnessTotal / samples.coerceAtLeast(1)
    val meanLuminance = luminanceTotal / samples.coerceAtLeast(1)
    val luminanceStdDev = kotlin.math.sqrt((luminanceSquaredTotal / samples.coerceAtLeast(1) - meanLuminance * meanLuminance).coerceAtLeast(0.0))
    val foregroundEdgeFraction = (edgeBands[4] + edgeBands[5]) / total
    val middleEdgeFraction = (edgeBands[2] + edgeBands[3]) / total
    val backgroundEdgeFraction = (edgeBands[0] + edgeBands[1]) / total
    val depthLayerCount = listOf(foregroundEdgeFraction, middleEdgeFraction, backgroundEdgeFraction).count { it > 0.16 }
    val saturationBalance = saturationBands.map { it / (samples / 3.0).coerceAtLeast(1.0) }.let { bands ->
        1.0 - (bands.maxOrNull()!! - bands.minOrNull()!!).coerceIn(0.0, 1.0)
    }
    val bandBalancePenalty = thirdsVertical.map { kotlin.math.abs((it / total) - (1.0 / 3.0)) }.sum() +
        thirdsHorizontal.map { kotlin.math.abs((it / total) - (1.0 / 3.0)) }.sum()
    val rejectionReason = when {
        topBlankFraction > 0.92 && bottomBlankFraction > 0.72 -> "too little visible terrain"
        bottomBlankFraction > 0.82 -> "too much flat foreground"
        depthLayerCount < 2 -> "insufficient foreground/midground/background layering"
        colorfulness < 0.045 -> "too little color separation"
        luminanceStdDev < 18.0 -> "too little tonal structure"
        else -> null
    }
    val score = frame.entropy * 18.0 +
        frame.edgeDensity * 2400.0 +
        frame.luminanceRange * 0.18 +
        verticalCoverage * 8.0 +
        horizontalCoverage * 8.0 -
        topBlankFraction * 18.0 -
        bottomBlankFraction * 10.0 -
        centerFraction * 16.0 -
        bandBalancePenalty * 12.0 +
        thirdLineFraction * 24.0 +
        depthLayerCount * 10.0 +
        colorfulness * 70.0 +
        saturationBalance * 8.0 +
        luminanceStdDev * 0.22
    val detail = "entropy=${"%.2f".format(java.util.Locale.US, frame.entropy)} edge=${"%.4f".format(java.util.Locale.US, frame.edgeDensity)} range=${frame.luminanceRange} vcov=$verticalCoverage hcov=$horizontalCoverage center=${"%.2f".format(java.util.Locale.US, centerFraction)} thirds=${"%.2f".format(java.util.Locale.US, thirdLineFraction)} topBlank=${"%.2f".format(java.util.Locale.US, topBlankFraction)} bottomBlank=${"%.2f".format(java.util.Locale.US, bottomBlankFraction)} layers=$depthLayerCount color=${"%.3f".format(java.util.Locale.US, colorfulness)} satBalance=${"%.2f".format(java.util.Locale.US, saturationBalance)} lumStd=${"%.1f".format(java.util.Locale.US, luminanceStdDev)}"
    return CompositionScore(rejectionReason == null, score, detail, rejectionReason)
}
fun waitForPlayableFrame(robot: Robot, out: Path, timeoutSeconds: Long): Boolean {
    val deadline = System.currentTimeMillis() + timeoutSeconds * 1000
    while (System.currentTimeMillis() < deadline) {
        val image = screenshot(robot, out)
        if (assessFrame(image).accepted) return true
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
fun dhGateResult(status: String, started: Long, stableSamples: Int, tailChunksLeft: Int?, tailStableSeconds: Long): DhGateResult {
    val logText = tail(clientDir.resolve("logs/latest.log"), 2_000_000)
    return DhGateResult(
        status,
        dhMinSettle,
        dhQuiet,
        dhTimeout,
        (System.currentTimeMillis() - started) / 1000,
        Regex("Distant Horizons|DistantHorizons|world gen|generation", RegexOption.IGNORE_CASE).containsMatchIn(logText),
        stableSamples,
        dhLowTailMax,
        dhLowTailSeconds,
        tailChunksLeft,
        tailStableSeconds,
    )
}
fun latestServerCrashReportSince(started: Long): Path? {
    val crashDir = serverDir.resolve("crash-reports")
    if (!crashDir.exists()) return null
    return Files.list(crashDir).use { stream ->
        stream
            .filter { Files.isRegularFile(it) }
            .filter { Files.getLastModifiedTime(it).toMillis() >= started }
            .max(Comparator.comparingLong<Path> { Files.getLastModifiedTime(it).toMillis() })
            .orElse(null)
    }
}
fun dhRuntimeFailureStatus(log: Path, logStart: Long, started: Long): String? {
    latestServerCrashReportSince(started)?.let { return "server-crash-report:${it.fileName}" }
    if (server != null && !server!!.process.isAlive) return "server-stopped"
    if (client != null && !client!!.isAlive) return "client-exited"
    val text = readFrom(log, logStart).lowercase()
    if (
        "clientonly mode disconnecting" in text ||
        "disconnecting from server" in text ||
        "disconnected_screen" in text ||
        "player logged out" in text
    ) return "client-disconnected"
    return null
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
    var lowTailSince: Long? = null
    val progressPattern = Regex("""DH is generating chunks\. ([0-9]+) left""")
    val minSettleDeadline = started + dhMinSettle * 1000L
    while (System.currentTimeMillis() < minSettleDeadline) {
        val failureStatus = dhRuntimeFailureStatus(log, logStart, started)
        if (failureStatus != null) return dhGateResult(failureStatus, started, stableSamples, tailChunksLeft, 0)
        Thread.sleep(1_000)
    }
    while (System.currentTimeMillis() < deadline) {
        val failureStatus = dhRuntimeFailureStatus(log, logStart, started)
        if (failureStatus != null) {
            val tailStableSeconds = if (lowTailSince == null) 0 else (System.currentTimeMillis() - lowTailSince!!) / 1000
            return dhGateResult(failureStatus, started, stableSamples, tailChunksLeft, tailStableSeconds)
        }
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
            tailChunksLeft = currentTail
            if (lowTailSince == null) lowTailSince = System.currentTimeMillis()
            val lowTailFor = (System.currentTimeMillis() - lowTailSince!!) / 1000
            if (lowTailFor >= dhLowTailSeconds) {
                return dhGateResult("low-tail-stable", started, stableSamples, tailChunksLeft, lowTailFor)
            }
        } else if (currentTail != null) {
            tailChunksLeft = currentTail
            lowTailSince = null
        }
        if (quietFor >= dhQuiet) {
            val tailStableSeconds = if (lowTailSince == null) 0 else (System.currentTimeMillis() - lowTailSince!!) / 1000
            return dhGateResult("stable", started, stableSamples, tailChunksLeft, tailStableSeconds)
        }
        Thread.sleep(2_000)
    }
    val tailStableSeconds = if (lowTailSince == null) 0 else (System.currentTimeMillis() - lowTailSince!!) / 1000
    return dhGateResult("timeout", started, stableSamples, tailChunksLeft, tailStableSeconds)
}
fun writeReview(path: Path, shot: Shot, dh: DhGateResult?, technicalStatus: String, failureReason: String?, promptHandling: String, frame: FrameAssessment?) {
    writeReview(path, shot, shot.basePose(), dh, technicalStatus, failureReason, promptHandling, frame, null, null, null, null)
}
fun writeReview(path: Path, shot: Shot, camera: CameraPose, dh: DhGateResult?, technicalStatus: String, failureReason: String?, promptHandling: String, frame: FrameAssessment?, candidateLabel: String?, candidateScore: Double?, anchorMode: String?, anchorDetail: String?) {
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
    "camera": {"x": ${camera.x}, "y": ${camera.y}, "z": ${camera.z}, "yaw": ${camera.yaw}, "pitch": ${camera.pitch}},
    "baseCamera": {"x": ${shot.x}, "y": ${shot.y}, "z": ${shot.z}, "yaw": ${shot.yaw}, "pitch": ${shot.pitch}},
    "fov": $captureFovDegrees,
    "weather": "clear",
    "time": "morning",
    "terrainAltered": false,
    "resolution": "${width}x${height}",
    "shaderPack": ${q(shaderPack)},
    "shaderPreset": ${q("shaderpacks/$shaderPack.txt")},
    "optionsSource": "options.txt",
    "anchorMode": ${q(anchorMode)},
    "anchorDetail": ${q(anchorDetail)},
    "candidateLabel": ${q(candidateLabel)},
    "candidateScore": ${candidateScore ?: "null"},
    "dhCaptureRadiusChunks": $dhCaptureRadiusChunks,
    "serverForceloadRadiusChunks": $serverForceloadRadiusChunks,
    "dhLowTailAllowed": $allowLowTailDh,
    "dhGate": ${if (dh == null) "null" else "{\"status\": ${q(dh.status)}, \"elapsedSeconds\": ${dh.elapsedSeconds}, \"minSettleSeconds\": ${dh.minSettleSeconds}, \"quietSeconds\": ${dh.quietSeconds}, \"timeoutSeconds\": ${dh.timeoutSeconds}, \"dhLogObserved\": ${dh.dhLogObserved}, \"stableSamples\": ${dh.stableSamples}, \"lowTailThresholdChunks\": ${dh.lowTailThresholdChunks}, \"lowTailSeconds\": ${dh.lowTailSeconds}, \"tailChunksLeft\": ${dh.tailChunksLeft ?: "null"}, \"tailStableSeconds\": ${dh.tailStableSeconds}}"},
    "technicalGate": {"status": ${q(technicalStatus)}, "failureReason": ${q(failureReason)}, "promptHandling": ${q(promptHandling)}, "frameEntropy": ${frame?.entropy ?: "null"}, "frameEdgeDensity": ${frame?.edgeDensity ?: "null"}, "frameLuminanceRange": ${frame?.luminanceRange ?: "null"}}
  },
  "rubricVersion": "1",
  "reviewer": "pending vision review",
  "model": "pending",
  "reviewedAt": ${q(Instant.now().toString())},
  "scores": {},
  "findings": [],
  "advice": ${q(if (technicalStatus == "passed") "Vision AI review required before publication." else "Rejected capture evidence. Recapture only after resolving the technical gate failure.")},
  "decision": ${q(if (technicalStatus == "passed") "pending" else "failed")}
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
var activeShot: Shot? = null
evidence.createDirectories()
raw.createDirectories()
final.createDirectories()
val robot = Robot()
val progressLog = evidence.resolve("capture-progress.jsonl")
val capturedFilesLog = evidence.resolve("captured-files.txt")
val shotResults = mutableListOf<ShotResult>()
var hudHidden = false

fun appendProgress(event: String, shot: Shot? = null, detail: String? = null) {
    val line = buildString {
        append("{")
        append("\"time\":")
        append(q(Instant.now().toString()))
        append(",\"event\":")
        append(q(event))
        if (shot != null) {
            append(",\"shot\":")
            append(q(shot.id))
        }
        if (detail != null) {
            append(",\"detail\":")
            append(q(detail))
        }
        append("}")
    }
    Files.writeString(progressLog, line + "\n", java.nio.file.StandardOpenOption.CREATE, java.nio.file.StandardOpenOption.APPEND)
}

fun writeFailureTrace(error: Throwable) {
    val buffer = StringWriter()
    error.printStackTrace(PrintWriter(buffer))
    val trace = buildString {
        appendLine("time=${Instant.now()}")
        appendLine("active_shot=${activeShot?.id ?: "none"}")
        appendLine("message=${error.message}")
        appendLine()
        append(buffer.toString())
    }
    Files.writeString(evidence.resolve("capture-error.txt"), trace)
}

fun pressKey(key: Int) {
    robot.keyPress(key)
    robot.keyRelease(key)
}
fun teleportCamera(pose: CameraPose) {
    send(server!!, "tp AgentShot ${pose.asCommandArgs()}", commands)
}
fun cameraJson(pose: CameraPose): String =
    "{\"x\":${pose.x},\"y\":${pose.y},\"z\":${pose.z},\"yaw\":${pose.yaw},\"pitch\":${pose.pitch}}"
fun writeCandidateReport(path: Path, shot: Shot, reports: List<CandidateReport>, selected: CandidateFrame?) {
    val json = buildString {
        appendLine("{")
        appendLine("  \"schema\": \"btm.screenshot_candidate_report.v1\",")
        appendLine("  \"shot\": ${q(shot.id)},")
        appendLine("  \"biome\": ${q(shot.biome)},")
        appendLine("  \"selected\": ${q(selected?.label)},")
        appendLine("  \"selectedScore\": ${selected?.score ?: "null"},")
        appendLine("  \"candidates\": [")
        appendLine(reports.joinToString(",\n") { report ->
            val composition = report.composition
            "    {\"label\":${q(report.label)},\"path\":${q(report.path.toString())},\"camera\":${cameraJson(report.pose)},\"accepted\":${report.frame.accepted && composition?.accepted != false},\"frameAccepted\":${report.frame.accepted},\"frameReason\":${q(report.frame.reason)},\"entropy\":${report.frame.entropy},\"edgeDensity\":${report.frame.edgeDensity},\"luminanceRange\":${report.frame.luminanceRange},\"compositionAccepted\":${composition?.accepted ?: "null"},\"compositionReason\":${q(composition?.rejectionReason)},\"score\":${composition?.score ?: "null"},\"detail\":${q(composition?.detail)}}"
        })
        appendLine("  ]")
        appendLine("}")
    }
    Files.writeString(path, json)
}
fun chooseCameraCandidate(shot: Shot, previewRoot: Path): CandidateFrame {
    if (cameraSearchMode == "off") {
        val base = shot.basePose()
        return CandidateFrame("base", base, previewRoot.resolve("00-base.png"), FrameAssessment(true), 0.0, "camera search disabled")
    }
    previewRoot.createDirectories()
    var best: CandidateFrame? = null
    val rejected = mutableListOf<String>()
    val reports = mutableListOf<CandidateReport>()
    for ((index, candidate) in candidatePoses(shot).withIndex()) {
        val (label, pose) = candidate
        teleportCamera(pose)
        Thread.sleep(1_500)
        val previewPath = previewRoot.resolve("${index.toString().padStart(2, '0')}-$label.png")
        val image = screenshot(robot, previewPath)
        val frame = assessFrame(image)
        if (!frame.accepted) {
            rejected += "$label:${frame.reason}"
            reports += CandidateReport(label, pose, previewPath, frame, null)
            appendProgress("candidate_rejected", shot, "$label ${frame.reason}")
            continue
        }
        val composition = scoreCandidateFrame(image, frame)
        reports += CandidateReport(label, pose, previewPath, frame, composition)
        if (!composition.accepted) {
            rejected += "$label:${composition.rejectionReason}"
            appendProgress("candidate_rejected", shot, "$label ${composition.rejectionReason} ${composition.detail}")
            continue
        }
        val scored = CandidateFrame(label, pose, previewPath, frame, composition.score, composition.detail)
        appendProgress("candidate_scored", shot, "$label score=${"%.2f".format(java.util.Locale.US, composition.score)} ${composition.detail}")
        if (best == null || scored.score > best!!.score) best = scored
    }
    writeCandidateReport(previewRoot.resolve("candidate-report.json"), shot, reports, best)
    return best ?: error("no acceptable camera candidates for ${shot.id}: ${rejected.joinToString("; ")}")
}
fun badMarkersSince(clientDir: Path, offset: Long): List<String> {
    val text = readFrom(clientDir.resolve("logs/latest.log"), offset).lowercase()
    return knownBadFrameMarkers.filter { it in text }
}
fun parseLocatedBlockPosition(text: String, targetId: String): Pair<Int, Int>? {
    val target = targetId.lowercase()
    val bracketPattern = Regex("""\[\s*(-?\d+)\s*,\s*(?:~|-?\d+)\s*,\s*(-?\d+)\s*]""")
    return text.lineSequence()
        .filter { "[" in it && ("nearest" in it.lowercase() || "at" in it.lowercase() || target in it.lowercase()) }
        .mapNotNull { line ->
            val match = bracketPattern.find(line) ?: return@mapNotNull null
            match.groupValues[1].toIntOrNull()?.let { x ->
                match.groupValues[2].toIntOrNull()?.let { z -> x to z }
            }
        }
        .lastOrNull()
}
fun locateFromCurrentPosition(targetType: String, targetId: String, timeoutMillis: Long = 30_000): Pair<Int, Int>? {
    val log = server!!.log
    val offset = if (log.exists()) Files.size(log) else 0L
    send(server!!, "execute as AgentShot at @s run locate $targetType $targetId", commands)
    val deadline = System.currentTimeMillis() + timeoutMillis
    while (System.currentTimeMillis() < deadline) {
        val text = readFrom(log, offset)
        if ("Could not find" in text || "An unexpected error occurred" in text || "Unknown or incomplete command" in text) return null
        val located = parseLocatedBlockPosition(text, targetId)
        if (located != null) return located
        Thread.sleep(250)
    }
    return null
}
fun distance2d(aX: Double, aZ: Double, bX: Double, bZ: Double): Double = hypot(aX - bX, aZ - bZ)
fun resolveShotAnchor(shot: Shot): LocatedAnchor {
    if (anchorSearchMode == "off") return LocatedAnchor(shot, "authored", "anchor search disabled")
    teleportCamera(shot.basePose())
    Thread.sleep(500)
    val locatedBiome = locateFromCurrentPosition("biome", shot.biome)
        ?: return LocatedAnchor(shot, "authored-fallback", "locate biome ${shot.biome} failed or timed out")
    val (biomeX, biomeZ) = locatedBiome
    val biomeShot = shot.copy(x = biomeX + 0.5, z = biomeZ + 0.5)
    if (anchorSearchMode == "locate-biome" || shot.structures.isEmpty()) {
        return LocatedAnchor(biomeShot, "locate-biome", "located ${shot.biome} at $biomeX,$biomeZ from authored ${shot.x.format1()},${shot.z.format1()}")
    }
    teleportCamera(biomeShot.basePose())
    Thread.sleep(500)
    val nearbyStructures = shot.structures.mapNotNull { structure ->
        val located = locateFromCurrentPosition("structure", structure, timeoutMillis = 20_000) ?: return@mapNotNull null
        val distance = distance2d(biomeX.toDouble(), biomeZ.toDouble(), located.first.toDouble(), located.second.toDouble())
        if (distance <= maxFeatureAnchorDistanceBlocks) Triple(structure, located, distance) else null
    }.sortedBy { it.third }
    val feature = nearbyStructures.firstOrNull()
    if (feature != null) {
        val (structure, position, distance) = feature
        val (featureX, featureZ) = position
        val blendedX = biomeX * 0.65 + featureX * 0.35
        val blendedZ = biomeZ * 0.65 + featureZ * 0.35
        val yaw = Math.toDegrees(atan2(-(featureX - blendedX), featureZ - blendedZ))
        val relocated = shot.copy(x = blendedX + 0.5, z = blendedZ + 0.5, yaw = yaw, pitch = shot.pitch.coerceIn(18.0, 36.0))
        return LocatedAnchor(
            relocated,
            "locate-feature",
            "located ${shot.biome} at $biomeX,$biomeZ and $structure at $featureX,$featureZ distance=${distance.format1()}",
        )
    }
    return LocatedAnchor(
        biomeShot,
        "locate-biome-fallback",
        "located ${shot.biome} at $biomeX,$biomeZ; no target structures within ${maxFeatureAnchorDistanceBlocks.format1()} blocks",
    )
}
fun verifyPlayerInWorld(): Boolean {
    val log = server!!.log
    val listOffset = fileSize(log)
    send(server!!, "list", commands)
    val listed = waitForLogAfter(
        log,
        listOffset,
        Regex("""players online:\s*.*\bAgentShot\b"""),
        5_000,
        server!!.process,
    )
    if (listed) return true

    val dataOffset = fileSize(log)
    send(server!!, "data get entity AgentShot Pos", commands)
    return waitForLogAfter(
        log,
        dataOffset,
        Regex("""AgentShot has the following entity data:.*\["""),
        5_000,
        server!!.process,
    )
}
fun verifyCaptureConfiguration() {
    val options = Files.readString(clientDir.resolve("options.txt"))
    check("fov:$captureFovOptionValue" in options) { "screenshot runtime did not retain fixed ${captureFovDegrees}-degree FOV" }
    check("chatVisibility:2" in options) { "screenshot runtime did not retain hidden chat" }
    val oculus = Files.readString(clientDir.resolve("config/oculus.properties"))
    check("enableShaders=true" in oculus && "shaderPack=$shaderPack" in oculus) { "screenshot runtime shader configuration is not active" }
}
fun prepareCleanFrame(stage: String): String {
    val log = clientDir.resolve("logs/latest.log")
    val before = if (log.exists()) Files.size(log) else 0L
    if (!hudHidden) {
        pressKey(KeyEvent.VK_F1)
        hudHidden = true
        appendProgress("hud_hidden", detail = "stage=$stage")
    }
    // This disposable username begins in class-selector's spawn-only flow.
    // Pressing the bound key is idempotent after completion and clears the prompt before captures.
    pressKey(KeyEvent.VK_K)
    send(server!!, "gamemode spectator AgentShot", commands)
    send(server!!, "effect clear AgentShot", commands)
    Thread.sleep(2_000)
    val observed = badMarkersSince(clientDir, before)
    if (observed.isNotEmpty() && observed.any { it != "press k to set your starting spawn and begin" }) {
        error("known blocking prompt remained during $stage: ${observed.joinToString()}")
    }
    val inWorldDeadline = System.currentTimeMillis() + if (stage == "client_join") 45_000 else 15_000
    var inWorld = false
    while (System.currentTimeMillis() < inWorldDeadline && !inWorld) {
        inWorld = verifyPlayerInWorld()
        if (!inWorld) Thread.sleep(1_000)
    }
    if (!inWorld) {
        appendProgress("player_probe_failed", detail = "stage=$stage")
        error("client is no longer in-world during $stage")
    }
    appendProgress("player_probe_ok", detail = "stage=$stage")
    val handling = if ("press k to set your starting spawn and begin" in observed) "fallback-dismissed-spawn-onboarding" else "suppression-clean"
    appendProgress("prompt_prepared", detail = "stage=$stage handling=$handling")
    return handling
}

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
        configureServer(serverDir)
        configureClient(clientDir)
        prepareArgfile(clientDir, "AgentShot", evidence.resolve("client.args"), evidence.resolve("client-argfile.log"))
    }
    phase("server_boot") {
        deleteTree(serverDir.resolve("world/data"))
        deleteTree(serverDir.resolve("world/dimensions"))
        server = startServer(serverDir, evidence.resolve("server-console.log"))
        waitFor(server!!.log, Regex("Done \\([0-9.]+s\\)!"), 900, server!!.process)
        send(server!!, "op AgentShot", commands)
        send(server!!, "gamerule sendCommandFeedback false", commands)
        send(server!!, "gamerule commandBlockOutput false", commands)
        send(server!!, "gamerule logAdminCommands false", commands)
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
        pressKey(KeyEvent.VK_ESCAPE)
        Thread.sleep(500)
        send(server!!, "gamemode spectator AgentShot", commands)
        send(server!!, "effect clear AgentShot", commands)
        verifyCaptureConfiguration()
        prepareCleanFrame("client_join")
        if (!waitForPlayableFrame(robot, evidence.resolve("joined-playable.png"), 180)) error("client never produced a playable frame")
    }
    phase("capture_shots") {
        val captured = mutableListOf<String>()
        appendProgress("capture_begin", detail = "starting at shot ${selectedShots.firstOrNull()?.id ?: "none"}")
        for (shot in selectedShots) {
            activeShot = shot
            appendProgress("shot_begin", shot)
            send(server!!, "weather clear", commands)
            send(server!!, "time set 1000", commands)
            val locatedAnchor = resolveShotAnchor(shot)
            val captureShot = locatedAnchor.shot
            appendProgress("anchor_selected", shot, "mode=${locatedAnchor.mode} ${locatedAnchor.detail}")
            teleportCamera(captureShot.basePose())
            val chunkX = Math.floor(captureShot.x / 16.0).toInt()
            val chunkZ = Math.floor(captureShot.z / 16.0).toInt()
            val fromBlockX = (chunkX - serverForceloadRadiusChunks) * 16
            val fromBlockZ = (chunkZ - serverForceloadRadiusChunks) * 16
            val toBlockX = (chunkX + serverForceloadRadiusChunks) * 16
            val toBlockZ = (chunkZ + serverForceloadRadiusChunks) * 16
            send(server!!, "forceload add $fromBlockX $fromBlockZ $toBlockX $toBlockZ", commands)
            appendProgress("server_forceload", shot, "radius=$serverForceloadRadiusChunks from=$fromBlockX,$fromBlockZ to=$toBlockX,$toBlockZ")
            Thread.sleep(8_000)
            appendProgress("shot_wait_dh", shot)
            val dh = waitForDhStable(clientDir)
            appendProgress("shot_dh_gate", shot, "status=${dh.status} elapsed=${dh.elapsedSeconds}s tail=${dh.tailChunksLeft ?: "none"} tailStable=${dh.tailStableSeconds}s")
            val dhAccepted = dh.status == "stable" || (allowLowTailDh && dh.status == "low-tail-stable")
            if (!dhAccepted) {
                val expectation = if (allowLowTailDh) "a stable quiet window or explicitly allowed bounded low-tail state" else "a stable quiet window"
                error("DH did not reach $expectation for ${shot.id}; status=${dh.status} tail=${dh.tailChunksLeft ?: "none"} tailStable=${dh.tailStableSeconds}s")
            }
            Thread.sleep(15_000)
            val promptHandling = prepareCleanFrame("shot:${shot.id}")
            val bestCandidate = chooseCameraCandidate(captureShot, outputDir.resolve("candidate-previews").resolve(shot.id))
            appendProgress("candidate_selected", shot, "${bestCandidate.label} score=${"%.2f".format(java.util.Locale.US, bestCandidate.score)} ${bestCandidate.detail}")
            teleportCamera(bestCandidate.pose)
            Thread.sleep(1_500)
            val log = clientDir.resolve("logs/latest.log")
            val logOffset = if (log.exists()) Files.size(log) else 0L
            val rawPath = raw.resolve(shot.file)
            val finalPath = final.resolve(shot.file)
            val image = screenshot(robot, rawPath)
            val markers = badMarkersSince(clientDir, logOffset)
            val frame = assessFrame(image)
            val failureReason = when {
                !verifyPlayerInWorld() -> "client is no longer in-world at capture time"
                markers.isNotEmpty() -> "known prompt/menu marker in capture evidence: ${markers.joinToString()}"
                !frame.accepted -> frame.reason
                dh.status == "low-tail-stable" && dh.lowTailSeconds <= 0 -> "low-tail DH gate was accepted with no stability dwell; keep as exploratory evidence only"
                else -> null
            }
            if (failureReason != null) {
                val rejectedReview = rawPath.resolveSibling(rawPath.fileName.toString().removeSuffix(".png") + ".review.json")
                writeReview(rawPath, captureShot, bestCandidate.pose, dh, "failed", failureReason, promptHandling, frame, bestCandidate.label, bestCandidate.score, locatedAnchor.mode, locatedAnchor.detail)
                shotResults += ShotResult(shot, "failed", rawPath, rejectedReview, failureReason, promptHandling, dh, bestCandidate.pose, bestCandidate.label, bestCandidate.score, locatedAnchor.mode, locatedAnchor.detail)
                appendProgress("shot_rejected", shot, failureReason)
                error("rejected ${shot.id}: $failureReason")
            }
            Files.copy(rawPath, finalPath, StandardCopyOption.REPLACE_EXISTING)
            writeReview(finalPath, captureShot, bestCandidate.pose, dh, "passed", null, promptHandling, frame, bestCandidate.label, bestCandidate.score, locatedAnchor.mode, locatedAnchor.detail)
            captured += finalPath.toString()
            shotResults += ShotResult(shot, "technical-pass-pending-ai-review", finalPath, finalPath.resolveSibling(finalPath.fileName.toString().removeSuffix(".png") + ".review.json"), promptHandling = promptHandling, dh = dh, selectedCamera = bestCandidate.pose, candidateLabel = bestCandidate.label, candidateScore = bestCandidate.score, anchorMode = locatedAnchor.mode, anchorDetail = locatedAnchor.detail)
            Files.writeString(capturedFilesLog, captured.joinToString("\n", postfix = "\n"))
            appendProgress("shot_captured", shot, "path=$finalPath fov=$captureFovDegrees promptHandling=$promptHandling candidate=${bestCandidate.label}")
        }
        activeShot = null
        appendProgress("capture_complete", detail = "captured ${captured.size} shot(s)")
        Files.writeString(capturedFilesLog, captured.joinToString("\n", postfix = "\n"))
    }
} catch (error: Throwable) {
    failure = error
    if (activeShot != null && shotResults.none { it.shot.id == activeShot!!.id }) {
        val rejectedPath = raw.resolve(activeShot!!.file)
        val reviewPath = rejectedPath.resolveSibling(rejectedPath.fileName.toString().removeSuffix(".png") + ".review.json")
        if (rejectedPath.exists()) writeReview(rejectedPath, activeShot!!, activeShot!!.basePose(), null, "failed", error.message, "failed-before-clean-frame", null, null, null, null, null)
        shotResults += ShotResult(activeShot!!, "failed", rejectedPath, reviewPath, error.message, "failed-before-clean-frame")
    }
    appendProgress("capture_failed", activeShot, error.message)
    writeFailureTrace(error)
} finally {
    stopProcess(client)
    stopServer(server, commands)
    Files.writeString(evidence.resolve("server-commands.txt"), commands.toString())
}

val manifest = buildString {
    appendLine("{")
    appendLine("  \"schema\": \"btm.worldgen_marketing_screenshots.v1\",")
    appendLine("  \"status\": ${q(if (failure == null) "technical-pass-pending-ai-review" else "failed")},")
    appendLine("  \"error\": ${q(failure?.message)},")
    appendLine("  \"seed\": ${q(seed)},")
    appendLine("  \"shaderPack\": ${q(shaderPack)},")
    appendLine("  \"fov\": $captureFovDegrees,")
    appendLine("  \"dhCaptureRadiusChunks\": $dhCaptureRadiusChunks,")
    appendLine("  \"serverForceloadRadiusChunks\": $serverForceloadRadiusChunks,")
    appendLine("  \"batchMode\": ${q(batchMode)},")
    appendLine("  \"resolution\": \"${width}x${height}\",")
    appendLine("  \"runRoot\": ${q(runRoot.toString())},")
    appendLine("  \"outputDir\": ${q(outputDir.toString())},")
    appendLine("  \"phases\": [")
    appendLine(phases.joinToString(",\n") { phase ->
        "    {\"name\":${q(phase.name)},\"status\":${q(phase.status)},\"durationMs\":${phase.durationMs},\"detail\":${q(phase.detail)}}"
    })
    appendLine("  ],")
    appendLine("  \"shots\": [")
    appendLine(selectedShots.joinToString(",\n") { shot ->
        val result = shotResults.lastOrNull { it.shot.id == shot.id }
        val camera = result?.selectedCamera ?: shot.basePose()
        "    {\"id\":${q(shot.id)},\"status\":${q(result?.status ?: "not-run")},\"failureReason\":${q(result?.failureReason)},\"path\":${q((result?.path ?: final.resolve(shot.file)).toString())},\"review\":${q((result?.review ?: final.resolve(shot.file.removeSuffix(".png") + ".review.json")).toString())},\"promptHandling\":${q(result?.promptHandling)},\"anchorMode\":${q(result?.anchorMode)},\"anchorDetail\":${q(result?.anchorDetail)},\"candidateLabel\":${q(result?.candidateLabel)},\"candidateScore\":${result?.candidateScore ?: "null"},\"biome\":${q(shot.biome)},\"subject\":${q(shot.subject)},\"dhCaptureRadiusChunks\":$dhCaptureRadiusChunks,\"serverForceloadRadiusChunks\":$serverForceloadRadiusChunks,\"camera\":{\"x\":${camera.x},\"y\":${camera.y},\"z\":${camera.z},\"yaw\":${camera.yaw},\"pitch\":${camera.pitch}},\"baseCamera\":{\"x\":${shot.x},\"y\":${shot.y},\"z\":${shot.z},\"yaw\":${shot.yaw},\"pitch\":${shot.pitch}}}"
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

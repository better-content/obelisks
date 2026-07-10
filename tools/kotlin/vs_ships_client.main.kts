#!/usr/bin/env kotlin

import java.awt.Rectangle
import java.awt.Robot
import java.awt.Toolkit
import java.awt.GraphicsEnvironment
import java.awt.event.InputEvent
import java.awt.event.KeyEvent
import java.awt.image.BufferedImage
import java.io.BufferedWriter
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardCopyOption
import java.time.Instant
import java.util.Properties
import java.util.concurrent.TimeUnit
import javax.imageio.ImageIO
import kotlin.io.path.createDirectories
import kotlin.io.path.exists
import kotlin.system.exitProcess

data class RunningServer(val process: Process, val stdin: BufferedWriter, val log: Path)
data class PhaseResult(val name: String, val status: String, val durationMs: Long, val detail: String? = null)
data class ClientContract(
    val displayWidth: Int,
    val displayHeight: Int,
    val guiScale: Int,
    val imageWidth: Int,
    val imageHeight: Int,
    val assembleX: Int,
    val assembleY: Int,
    val assembleWidth: Int,
    val assembleHeight: Int,
    val fixtureY: Int,
    val expectedBlocks: Int,
    val screenshots: List<String>,
)

val root = Paths.get("").toAbsolutePath().normalize()
val contractPath = root.resolve("tools/vs_ships_client_contract.properties")
val contractProperties = Properties().also { properties -> Files.newBufferedReader(contractPath).use(properties::load) }
fun contractInt(key: String) = contractProperties.getProperty(key)?.toIntOrNull() ?: error("invalid VS client contract field: $key")
val contract = ClientContract(
    displayWidth = contractInt("display.width"),
    displayHeight = contractInt("display.height"),
    guiScale = contractInt("display.guiScale"),
    imageWidth = contractInt("helm.imageWidth"),
    imageHeight = contractInt("helm.imageHeight"),
    assembleX = contractInt("helm.assemble.x"),
    assembleY = contractInt("helm.assemble.y"),
    assembleWidth = contractInt("helm.assemble.width"),
    assembleHeight = contractInt("helm.assemble.height"),
    fixtureY = contractInt("fixture.y"),
    expectedBlocks = contractInt("fixture.expectedBlocks"),
    screenshots = contractProperties.getProperty("screenshots").split(',').filter(String::isNotBlank),
)
if ((System.getenv("DISPLAY").isNullOrBlank() || GraphicsEnvironment.isHeadless()) && System.getenv("BTM_VS_XVFB") != "1") {
    val command = listOf("xvfb-run", "-a", "-s", "-screen 0 ${contract.displayWidth}x${contract.displayHeight}x24", "kotlin", "-J-Djava.awt.headless=false", root.resolve("tools/kotlin/vs_ships_client.main.kts").toString()) + args
    val process = ProcessBuilder(command).directory(root.toFile()).inheritIO().apply { environment()["BTM_VS_XVFB"] = "1" }.start()
    exitProcess(process.waitFor())
}

fun usage(message: String? = null): Nothing {
    if (message != null) System.err.println(message)
    System.err.println("Usage: tools/btm test scenario-headful vs_ships_client --profile quick|release [--fixture core|trackwork|clockwork|combined] [--variant current|dh_disabled|c2me_disabled|dh_c2me_disabled] [--stop-after assembly|lifecycle] [--bootstrap-mode always|once|never] [--port N] [--run-root PATH] [--keep-runs]")
    exitProcess(2)
}
fun q(value: String?) = if (value == null) "null" else "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\""
fun deleteTree(path: Path) {
    if (!path.exists()) return
    Files.walk(path).use { it.sorted(java.util.Comparator.reverseOrder()).forEach(Files::deleteIfExists) }
}
fun tail(path: Path, limit: Long = 1_000_000): String {
    if (!path.exists()) return ""
    path.toFile().inputStream().use { input ->
        input.skip((path.toFile().length() - limit).coerceAtLeast(0))
        return input.readBytes().toString(Charsets.UTF_8)
    }
}
fun run(command: List<String>, timeoutSeconds: Long, output: Path): Int {
    val process = ProcessBuilder(command).directory(root.toFile()).redirectErrorStream(true).redirectOutput(output.toFile()).start()
    if (!process.waitFor(timeoutSeconds, TimeUnit.SECONDS)) {
        process.destroy()
        if (!process.waitFor(10, TimeUnit.SECONDS)) process.destroyForcibly()
        return 124
    }
    return process.exitValue()
}
fun removeRuntimeJars(runtime: Path, patterns: List<Regex>): List<String> {
    val mods = runtime.resolve("mods")
    if (!mods.exists()) return emptyList()
    val removed = mutableListOf<String>()
    Files.list(mods).use { stream ->
        stream.filter(Files::isRegularFile).forEach { file ->
            if (patterns.any { it.matches(file.fileName.toString()) }) {
                removed += file.fileName.toString()
                Files.delete(file)
            }
        }
    }
    return removed.sorted()
}
fun setPort(path: Path, port: Int) {
    val lines = if (path.exists()) Files.readAllLines(path).toMutableList() else mutableListOf()
    val index = lines.indexOfFirst { it.startsWith("server-port=") }
    if (index >= 0) lines[index] = "server-port=$port" else lines += "server-port=$port"
    Files.writeString(path, lines.joinToString("\n", postfix = "\n"))
}
fun startServer(serverDir: Path, port: Int, log: Path): RunningServer {
    setPort(serverDir.resolve("server.properties"), port)
    val process = ProcessBuilder("./run.sh", "nogui").directory(serverDir.toFile()).redirectErrorStream(true).redirectOutput(log.toFile()).start()
    return RunningServer(process, process.outputStream.bufferedWriter(), log)
}
fun send(server: RunningServer, command: String, commands: StringBuilder) {
    commands.appendLine(command)
    server.stdin.write(command)
    server.stdin.newLine()
    server.stdin.flush()
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
fun prepareArgfile(clientDir: Path, username: String, port: Int, out: Path, log: Path) {
    val command = listOf(root.resolve("tools/btm").toString(), "internal", "minecraft-client-argfile", "--client-dir", clientDir.toString(), "--version-id", "1.20.1-forge-47.4.13", "--username", username, "--server", "127.0.0.1:$port", "--out", out.toString())
    if (run(command, 600, log) != 0) error("client argument generation failed; see $log")
    Files.writeString(out, Files.readString(out) + "\"--width\"\n\"${contract.displayWidth}\"\n\"--height\"\n\"${contract.displayHeight}\"\n")
}
fun startClient(clientDir: Path, argfile: Path, console: Path): Process {
    Files.deleteIfExists(clientDir.resolve("logs/latest.log"))
    return ProcessBuilder("java", "-Xms2G", "-Xmx6G", "@${argfile}")
        .directory(clientDir.toFile()).redirectErrorStream(true).redirectOutput(console.toFile()).start()
}
fun configureClient(clientDir: Path) {
    Files.writeString(clientDir.resolve("options.txt"), "guiScale:${contract.guiScale}\npauseOnLostFocus:false\nautoJump:false\nfullscreen:false\n")
}
fun screenshot(robot: Robot, out: Path): BufferedImage {
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
fun assembledGeometryScore(image: BufferedImage): Double {
    val xStart = image.width * 44 / 100
    val xEnd = image.width * 82 / 100
    val yStart = image.height * 20 / 100
    val yEnd = image.height * 66 / 100
    var darkPixels = 0
    var samples = 0
    for (y in yStart until yEnd step 2) for (x in xStart until xEnd step 2) {
        if (kotlin.math.abs(x - image.width / 2) < 24 && kotlin.math.abs(y - image.height / 2) < 24) continue
        val rgb = image.getRGB(x, y)
        val luminance = ((rgb shr 16) and 255) + ((rgb shr 8) and 255) + (rgb and 255)
        if (luminance < 420) darkPixels++
        samples++
    }
    return if (samples == 0) 0.0 else darkPixels.toDouble() / samples
}
fun clearChat(robot: Robot) {
    robot.keyPress(KeyEvent.VK_F3)
    robot.keyPress(KeyEvent.VK_D)
    robot.keyRelease(KeyEvent.VK_D)
    robot.keyRelease(KeyEvent.VK_F3)
    Thread.sleep(500)
}
fun waitForPlayableFrame(robot: Robot, out: Path, timeoutSeconds: Long): Boolean {
    val deadline = System.currentTimeMillis() + timeoutSeconds * 1000
    while (System.currentTimeMillis() < deadline) {
        val image = screenshot(robot, out)
        if (nonblank(image)) return true
        Thread.sleep(5_000)
    }
    return false
}
fun assertPlayerConnected(server: RunningServer, username: String, commands: StringBuilder, marker: String) {
    val pattern = Regex("\\[Server] ${Regex.escape(marker)}")
    val previous = pattern.findAll(tail(server.log)).count()
    send(server, "execute if entity @a[name=$username] run say $marker", commands)
    try {
        waitFor(server.log, pattern, 60, server.process, previous + 1)
    } catch (_: Throwable) {
        error("client disconnected after server join: $username was no longer present")
    }
}
fun assembleButtonCenter(): Pair<Int, Int> {
    val scaledWidth = kotlin.math.ceil(contract.displayWidth.toDouble() / contract.guiScale).toInt()
    val scaledHeight = kotlin.math.ceil(contract.displayHeight.toDouble() / contract.guiScale).toInt()
    val logicalX = (scaledWidth - contract.imageWidth) / 2 + contract.assembleX + contract.assembleWidth / 2
    val logicalY = (scaledHeight - contract.imageHeight) / 2 + contract.assembleY + contract.assembleHeight / 2
    return logicalX * contract.guiScale to logicalY * contract.guiScale
}
fun helmControlsVisible(image: BufferedImage): Boolean {
    fun brightness(x: Int, y: Int): Int {
        val rgb = image.getRGB(x, y)
        return ((rgb shr 16) and 255) + ((rgb shr 8) and 255) + (rgb and 255)
    }
    val scaledWidth = kotlin.math.ceil(contract.displayWidth.toDouble() / contract.guiScale).toInt()
    val scaledHeight = kotlin.math.ceil(contract.displayHeight.toDouble() / contract.guiScale).toInt()
    val panelX = ((scaledWidth - contract.imageWidth) / 2 + 3) * contract.guiScale
    val panelY = ((scaledHeight - contract.imageHeight) / 2 + 3) * contract.guiScale
    val (buttonX, buttonY) = assembleButtonCenter()
    val darkPanelSamples = listOf(
        brightness(panelX, panelY),
        brightness(panelX + 12, panelY + 12),
        brightness(panelX + 30, panelY + 120),
    ).count { it < 180 }
    return darkPanelSamples == 3 && brightness(buttonX, buttonY) > 90
}
fun screenOverlayVisible(image: BufferedImage): Boolean {
    val rgb = image.getRGB(image.width / 2, 10)
    val brightness = ((rgb shr 16) and 255) + ((rgb shr 8) and 255) + (rgb and 255)
    return brightness < 360
}
fun click(robot: Robot, x: Int, y: Int, button: Int = InputEvent.BUTTON1_DOWN_MASK) {
    robot.mouseMove(x, y)
    robot.mousePress(button)
    Thread.sleep(150)
    robot.mouseRelease(button)
}
fun rightClickCenter(robot: Robot, sneak: Boolean) {
    val screen = Toolkit.getDefaultToolkit().screenSize
    robot.mouseMove(screen.width / 2, screen.height / 2)
    if (sneak) {
        robot.keyPress(KeyEvent.VK_SHIFT)
        Thread.sleep(600)
    }
    click(robot, screen.width / 2, screen.height / 2, InputEvent.BUTTON3_DOWN_MASK)
    if (sneak) {
        Thread.sleep(300)
        robot.keyRelease(KeyEvent.VK_SHIFT)
    }
}
fun waitForTitleReady(clientDir: Path, process: Process) {
    val latest = clientDir.resolve("logs/latest.log")
    val startupFinished = Regex("Game took [0-9.]+ seconds to start", RegexOption.IGNORE_CASE)
    val deadline = System.currentTimeMillis() + 180_000
    while (System.currentTimeMillis() < deadline && process.isAlive) {
        val text = tail(latest)
        if (startupFinished.containsMatchIn(text)) { Thread.sleep(2_000); return }
        Thread.sleep(500)
    }
    error("client title screen did not become ready")
}
fun assertShips(server: RunningServer, commands: StringBuilder, makeStatic: Boolean, attempts: Int = 1): Int {
    val pattern = Regex("Set ([0-9]+) ships? to be is-static=$makeStatic", RegexOption.IGNORE_CASE)
    repeat(attempts) {
        val previous = pattern.findAll(tail(server.log)).count()
        send(server, "vs set-static @v[] $makeStatic", commands)
        waitFor(server.log, pattern, 30, server.process, previous + 1)
        val count = pattern.findAll(tail(server.log)).last().groupValues[1].toInt()
        if (count > 0) return count
        Thread.sleep(2_000)
    }
    error("ship assertion reported zero ships after $attempts attempt(s)")
}
fun currentShipCount(server: RunningServer, commands: StringBuilder, makeStatic: Boolean = true): Int {
    val pattern = Regex("Set ([0-9]+) ships? to be is-static=$makeStatic", RegexOption.IGNORE_CASE)
    val previous = pattern.findAll(tail(server.log)).count()
    send(server, "vs set-static @v[] $makeStatic", commands)
    waitFor(server.log, pattern, 30, server.process, previous + 1)
    return pattern.findAll(tail(server.log)).last().groupValues[1].toInt()
}
fun parseLastPosition(text: String, username: String): Triple<Double, Double, Double>? {
    val pattern = Regex("${Regex.escape(username)} has the following entity data: \\[([-+0-9.Ee]+)d, ([-+0-9.Ee]+)d, ([-+0-9.Ee]+)d]")
    return pattern.findAll(text).lastOrNull()?.destructured?.let { (x, y, z) -> Triple(x.toDouble(), y.toDouble(), z.toDouble()) }
}
fun distance(a: Triple<Double, Double, Double>, b: Triple<Double, Double, Double>): Double {
    val dx = a.first - b.first
    val dy = a.second - b.second
    val dz = a.third - b.third
    return kotlin.math.sqrt(dx * dx + dy * dy + dz * dz)
}
fun classify(text: String, error: Throwable): String {
    val message = error.message.orEmpty()
    val phaseChecks = listOf(
        "client_bootstrap_failure" to Regex("runtime preparation|argument generation|prepared client runtime", RegexOption.IGNORE_CASE),
        "client_disconnect_failure" to Regex("client disconnected|lost connection|no longer present", RegexOption.IGNORE_CASE),
        "onboarding_failure" to Regex("client onboarding|spectator mode", RegexOption.IGNORE_CASE),
        "removed_client_mod_present" to Regex("removed client mod present|Shoulder Surfing", RegexOption.IGNORE_CASE),
        "fixture_connectivity_failure" to Regex("too many blocks|too big|fixture connectivity|unexpected fixture block count", RegexOption.IGNORE_CASE),
        "helm_interaction_failure" to Regex("helm GUI|helm interaction", RegexOption.IGNORE_CASE),
        "menu_packet_failure" to Regex("assembly packet|assembly log", RegexOption.IGNORE_CASE),
        "assembly_registration_failure" to Regex("registered ships|ship count", RegexOption.IGNORE_CASE),
        "assembled_render_failure" to Regex("assembled render|assembled ship.*(?:invisible|missing|not visible)", RegexOption.IGNORE_CASE),
        "ship_assembly_failure" to Regex("helm|assembly|assemble|ship assertion|Found ship", RegexOption.IGNORE_CASE),
        "ship_movement_collision_failure" to Regex("movement|position before|position after|collision", RegexOption.IGNORE_CASE),
        "passenger_sync_failure" to Regex("observer", RegexOption.IGNORE_CASE),
        "ship_save_reload_failure" to Regex("restart|reconnect", RegexOption.IGNORE_CASE),
        "mount_camera_failure" to Regex("mount|dismount|passenger|camera|vehicle", RegexOption.IGNORE_CASE),
    )
    phaseChecks.firstOrNull { it.second.containsMatchIn(message) }?.let { return it.first }
    val logChecks = listOf(
        "client_render_failure" to Regex("ModelBakery|BlockRenderDispatcher|rendering block entity|Tesselating block|RenderSystem|OpenGL.*error|ClientBlockStateColorCache|ClientLevelWrapper.getBlockColor", RegexOption.IGNORE_CASE),
        "flywheel_visual_failure" to Regex("Flywheel.*(?:ERROR|Exception)|Create.*visual.*(?:ERROR|Exception)|Instancing.*(?:ERROR|Exception)", RegexOption.IGNORE_CASE),
        "ship_save_reload_failure" to Regex("Failed to load ship|ShipData.*(?:ERROR|Exception)|corrupt", RegexOption.IGNORE_CASE),
        "dependency_mixin_failure" to Regex("Mixin apply failed|NoClassDefFoundError|ClassNotFoundException|NoSuchMethodError|NoSuchFieldError", RegexOption.IGNORE_CASE),
        "eureka_init_failure" to Regex("(?:ERROR|FATAL|Exception).{0,200}(?:eureka|vs_eureka)", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL)),
        "clockwork_init_failure" to Regex("(?:ERROR|FATAL|Exception).{0,200}(?:clockwork|vs_clockwork)", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL)),
        "trackwork_init_failure" to Regex("(?:ERROR|FATAL|Exception).{0,200}trackwork", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL)),
        "vs_init_failure" to Regex("(?:ERROR|FATAL|Exception).{0,200}(?:valkyrienskies|org\\.valkyrienskies)", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL)),
    )
    return logChecks.firstOrNull { it.second.containsMatchIn(text) }?.first ?: "unclassified_vs_client_failure"
}

var profile = "quick"
var fixture = "core"
var variant = "current"
var stopAfter = "lifecycle"
var bootstrapMode = "always"
var keepRuns = false
var runRoot = System.getenv("BTM_HARNESS_RUN_ROOT")?.takeIf(String::isNotBlank)?.let(Paths::get) ?: Paths.get("/tmp/btm-vs-ships-client-quick")
var port = System.getenv("BTM_HARNESS_ACTUAL_PORT")?.toIntOrNull() ?: 25569
var index = 0
while (index < args.size) {
    when (args[index]) {
        "--profile" -> { profile = args.getOrNull(index + 1) ?: usage("--profile needs quick or release"); index += 2 }
        "--fixture" -> { fixture = args.getOrNull(index + 1) ?: usage("--fixture needs core, trackwork, clockwork, or combined"); index += 2 }
        "--variant" -> { variant = args.getOrNull(index + 1) ?: usage("--variant needs current, dh_disabled, c2me_disabled, or dh_c2me_disabled"); index += 2 }
        "--stop-after" -> { stopAfter = args.getOrNull(index + 1) ?: usage("--stop-after needs assembly or lifecycle"); index += 2 }
        "--bootstrap-mode" -> { bootstrapMode = args.getOrNull(index + 1) ?: usage("--bootstrap-mode needs always, once, or never"); index += 2 }
        "--run-root" -> { runRoot = Paths.get(args.getOrNull(index + 1) ?: usage("--run-root needs a path")); index += 2 }
        "--port" -> { port = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--port needs a number"); index += 2 }
        "--keep-runs" -> { keepRuns = true; index++ }
        "--help" -> usage()
        else -> usage("unknown argument: ${args[index]}")
    }
}
if (profile !in setOf("quick", "release")) usage("invalid profile: $profile")
if (fixture !in setOf("core", "trackwork", "clockwork", "combined")) usage("invalid fixture: $fixture")
if (variant !in setOf("current", "dh_disabled", "c2me_disabled", "dh_c2me_disabled")) usage("invalid variant: $variant")
if (stopAfter !in setOf("assembly", "lifecycle")) usage("invalid stop phase: $stopAfter")
if (bootstrapMode !in setOf("always", "once", "never")) usage("invalid bootstrap mode: $bootstrapMode")
runRoot = runRoot.toAbsolutePath().normalize()
if (!keepRuns && bootstrapMode != "never") deleteTree(runRoot)
runRoot.createDirectories()

val serverDir = runRoot.resolve("server")
val pilotDir = runRoot.resolve("pilot-client")
val observerDir = runRoot.resolve("observer-client")
val evidence = runRoot.resolve("evidence").apply { createDirectories() }
val phases = mutableListOf<PhaseResult>()
val commands = StringBuilder("# vs_ships_client commands\n")
var server: RunningServer? = null
var pilot: Process? = null
var observer: Process? = null
var failure: Throwable? = null
var fixtureRenderScore: Double? = null
var assembledRenderScore: Double? = null
val robot = Robot().apply { autoDelay = 80 }
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
        val shouldPrepareServer = bootstrapMode == "always" || (bootstrapMode == "once" && !serverDir.resolve("run.sh").exists())
        if (shouldPrepareServer) {
            val command = listOf(root.resolve("tools/btm").toString(), "internal", "prepare-server-runtime", "--server-dir", serverDir.toString(), "--port", port.toString(), "--reset-runtime")
            commands.appendLine(command.joinToString(" "))
            if (run(command, 900, evidence.resolve("prepare-server.log")) != 0) error("server runtime preparation failed")
        } else if (!serverDir.resolve("run.sh").exists()) error("prepared server runtime missing: $serverDir")
        val shouldPrepareClient = bootstrapMode == "always" || (bootstrapMode == "once" && !pilotDir.resolve("versions/1.20.1-forge-47.4.13").exists())
        if (shouldPrepareClient) {
            if (!keepRuns) deleteTree(pilotDir)
            val command = listOf(root.resolve("tools/btm").toString(), "internal", "prepare-client-runtime", "--client-dir", pilotDir.toString())
            commands.appendLine(command.joinToString(" "))
            if (run(command, 1_200, evidence.resolve("prepare-client.log")) != 0) error("client runtime preparation failed")
        } else if (!pilotDir.resolve("versions/1.20.1-forge-47.4.13").exists()) error("prepared client runtime missing: $pilotDir")
        configureClient(pilotDir)
        prepareArgfile(pilotDir, "AgentPilot", port, evidence.resolve("pilot.args"), evidence.resolve("pilot-argfile.log"))
        val removePatterns = buildList {
            if (variant in setOf("dh_disabled", "dh_c2me_disabled")) add(Regex("DistantHorizons.*\\.jar", RegexOption.IGNORE_CASE))
            if (variant in setOf("c2me_disabled", "dh_c2me_disabled")) add(Regex("c2me.*\\.jar", RegexOption.IGNORE_CASE))
        }
        val removed = (removeRuntimeJars(serverDir, removePatterns) + removeRuntimeJars(pilotDir, removePatterns)).distinct().sorted()
        Files.writeString(evidence.resolve("removed-mods.txt"), removed.joinToString("\n", postfix = if (removed.isEmpty()) "" else "\n"))
        if (profile == "release") {
            deleteTree(observerDir)
            observerDir.createDirectories()
            if (run(listOf("cp", "-a", "--reflink=auto", "${pilotDir}/.", observerDir.toString()), 600, evidence.resolve("clone-observer.log")) != 0) error("observer runtime clone failed")
            configureClient(observerDir)
            prepareArgfile(observerDir, "AgentObserver", port, evidence.resolve("observer.args"), evidence.resolve("observer-argfile.log"))
        }
    }
    phase("server_boot") {
        server = startServer(serverDir, port, evidence.resolve("server-console-boot-1.log"))
        waitFor(server!!.log, Regex("Done \\([0-9.]+s\\)!"), 900, server!!.process)
        send(server!!, "op AgentPilot", commands)
        send(server!!, "forceload add 0 0", commands)
        val y = contract.fixtureY
        send(server!!, "setworldspawn 0 $y 4", commands)
        send(server!!, "fill -8 ${y - 8} -8 8 ${y + 8} 8 minecraft:air", commands)
        send(server!!, "setblock 0 $y 0 vs_eureka:oak_ship_helm[facing=south]", commands)
        send(server!!, "setblock 1 $y 0 minecraft:oak_planks", commands)
        send(server!!, "setblock 2 $y 0 vs_eureka:engine", commands)
        send(server!!, "setblock 1 ${y + 1} 0 vs_eureka:floater", commands)
        send(server!!, "fill -1 ${y - 2} 3 1 ${y - 2} 5 minecraft:barrier", commands)
        if (fixture in setOf("trackwork", "combined")) send(server!!, "setblock 1 $y 1 trackwork:phys_track", commands)
        if (fixture in setOf("clockwork", "combined")) send(server!!, "setblock 1 $y -1 vs_clockwork:phys_bearing", commands)
        listOf("0 $y 0 vs_eureka:oak_ship_helm", "1 $y 0 minecraft:oak_planks", "2 $y 0 vs_eureka:engine", "1 ${y + 1} 0 vs_eureka:floater").forEachIndexed { fixtureIndex, check ->
            send(server!!, "execute if block $check run say BTM_VS_CORE_FIXTURE_$fixtureIndex", commands)
        }
        send(server!!, "say BTM_VS_CLIENT_FIXTURE_READY", commands)
        waitFor(server!!.log, Regex("BTM_VS_CLIENT_FIXTURE_READY"), 30, server!!.process)
        waitFor(server!!.log, Regex("BTM_VS_CORE_FIXTURE_3"), 30, server!!.process)
    }
    phase("client_join_render") {
        val joins = Regex("AgentPilot joined the game").findAll(tail(server!!.log)).count()
        pilot = startClient(pilotDir, evidence.resolve("pilot.args"), evidence.resolve("pilot-client-console-1.log"))
        waitForTitleReady(pilotDir, pilot!!)
        screenshot(robot, evidence.resolve("pilot-title.png"))
        waitFor(server!!.log, Regex("AgentPilot joined the game"), 900, pilot, joins + 1)
        Thread.sleep(5_000)
        assertPlayerConnected(server!!, "AgentPilot", commands, "BTM_VS_PILOT_CONNECTION_STABLE")
        screenshot(robot, evidence.resolve("pilot-loading.png"))
        if (!waitForPlayableFrame(robot, evidence.resolve("pilot-joined.png"), 120)) error("joined client never produced a playable frame")
        var onboardingComplete = false
        for (attempt in 1..5) {
            robot.keyPress(KeyEvent.VK_K)
            robot.keyRelease(KeyEvent.VK_K)
            Thread.sleep(2_000)
            send(server!!, "execute if entity @a[name=AgentPilot,gamemode=!spectator] run say BTM_VS_ONBOARDING_COMPLETE", commands)
            Thread.sleep(1_000)
            if (Regex("\\[Server] BTM_VS_ONBOARDING_COMPLETE").containsMatchIn(tail(server!!.log))) {
                onboardingComplete = true
                break
            }
        }
        if (!onboardingComplete) error("client onboarding did not release the pilot from spectator mode")
        send(server!!, "item replace entity AgentPilot weapon.mainhand with minecraft:air", commands)
        send(server!!, "item replace entity AgentPilot weapon.offhand with minecraft:air", commands)
        send(server!!, "tp AgentPilot 0.5 ${contract.fixtureY - 1.0} 4.5 180 2", commands)
        Thread.sleep(2_000)
        clearChat(robot)
        fixtureRenderScore = assembledGeometryScore(screenshot(robot, evidence.resolve("core-fixture.png")))
        if (fixtureRenderScore!! < 0.03) error("client render failure: source fixture was not visible before assembly (score=$fixtureRenderScore)")
    }
    phase("helm_assembly") {
        val y = contract.fixtureY
        val viewpoints = listOf("0.5 ${y - 1.0} 4.5 180 2", "0.5 ${y - 1.0} 3.8 180 3", "0.5 ${y - 1.0} 5.2 180 1")
        val initialShips = currentShipCount(server!!, commands)
        if (initialShips != 0) error("assembly registration failure: expected zero initial ships, found $initialShips")
        var visibleGui: Path? = null
        for ((attempt, viewpoint) in viewpoints.withIndex()) {
            send(server!!, "tp AgentPilot $viewpoint", commands)
            Thread.sleep(2_000)
            rightClickCenter(robot, sneak = true)
            val attemptPath = evidence.resolve("helm-gui-attempt-${attempt + 1}.png")
            val deadline = System.currentTimeMillis() + 10_000
            while (System.currentTimeMillis() < deadline) {
                val gui = screenshot(robot, attemptPath)
                if (helmControlsVisible(gui)) { visibleGui = attemptPath; break }
                Thread.sleep(1_000)
            }
            if (visibleGui != null) break
            val wrongScreen = screenshot(robot, attemptPath)
            if (screenOverlayVisible(wrongScreen)) {
                robot.keyPress(KeyEvent.VK_ESCAPE)
                robot.keyRelease(KeyEvent.VK_ESCAPE)
            }
            Thread.sleep(1_000)
        }
        val guiPath = visibleGui ?: error("helm interaction failure: helm GUI was not detected after ${viewpoints.size} attempts")
        Files.copy(guiPath, evidence.resolve("helm-gui.png"), StandardCopyOption.REPLACE_EXISTING)
        val (buttonX, buttonY) = assembleButtonCenter()
        robot.mouseMove(buttonX, buttonY)
        Thread.sleep(500)
        screenshot(robot, evidence.resolve("helm-button-hovered.png"))
        val assemblyPattern = Regex("Assembled ship with ([0-9]+) blocks", RegexOption.IGNORE_CASE)
        val previousAssemblyLogs = assemblyPattern.findAll(tail(server!!.log)).count()
        robot.mousePress(InputEvent.BUTTON1_DOWN_MASK)
        Thread.sleep(200)
        screenshot(robot, evidence.resolve("helm-button-pressed.png"))
        robot.mouseRelease(InputEvent.BUTTON1_DOWN_MASK)
        val assemblyDeadline = System.currentTimeMillis() + 60_000
        while (System.currentTimeMillis() < assemblyDeadline && server!!.process.isAlive) {
            val serverText = tail(server!!.log)
            if (Regex("Failed to assemble to[o]? large|Ship is too big", RegexOption.IGNORE_CASE).containsMatchIn(serverText)) {
                error("fixture connectivity failure: Eureka rejected too many blocks")
            }
            if (assemblyPattern.findAll(serverText).count() > previousAssemblyLogs) break
            Thread.sleep(500)
        }
        val assemblyMatch = assemblyPattern.findAll(tail(server!!.log)).lastOrNull()
            ?: error("menu packet failure: Eureka assembly log was not observed")
        val assembledBlocks = assemblyMatch.groupValues[1].toInt()
        val expectedBlocks = contract.expectedBlocks +
            (if (fixture in setOf("trackwork", "combined")) 1 else 0) +
            (if (fixture in setOf("clockwork", "combined")) 1 else 0)
        if (assembledBlocks != expectedBlocks) error("fixture connectivity failure: unexpected fixture block count $assembledBlocks, expected $expectedBlocks")
        val registeredShips = currentShipCount(server!!, commands)
        if (registeredShips != 1) error("assembly registration failure: expected one registered ship, found $registeredShips")
        val teleportPattern = Regex("Teleported 1 ships", RegexOption.IGNORE_CASE)
        val previousTeleports = teleportPattern.findAll(tail(server!!.log)).count()
        send(server!!, "vs teleport @v[] 1 $y 0", commands)
        waitFor(server!!.log, teleportPattern, 30, server!!.process, previousTeleports + 1)
        Files.writeString(evidence.resolve("assembly.txt"), "fixture=$fixture\nblocks=$assembledBlocks\nregistered_ships=$registeredShips\nbutton=$buttonX,$buttonY\n")
        robot.keyPress(KeyEvent.VK_ESCAPE)
        robot.keyRelease(KeyEvent.VK_ESCAPE)
        send(server!!, "tp AgentPilot 0.5 ${y - 1.0} 4.5 180 2", commands)
        Thread.sleep(3_000)
        clearChat(robot)
        assembledRenderScore = assembledGeometryScore(screenshot(robot, evidence.resolve("ship-assembled.png")))
        val minimumRenderScore = maxOf(0.03, fixtureRenderScore!! * 0.2)
        if (assembledRenderScore!! < minimumRenderScore) {
            error("assembled render failure: registered ship is not visible (score=$assembledRenderScore, required=$minimumRenderScore)")
        }
    }
    if (stopAfter == "lifecycle" && profile == "release") {
        phase("observer_join") {
            val captureSignal = evidence.resolve("capture-observer")
            val stopSignal = evidence.resolve("stop-observer")
            Files.deleteIfExists(captureSignal)
            Files.deleteIfExists(stopSignal)
            val command = listOf("xvfb-run", "-a", "-s", "-screen 0 ${contract.displayWidth}x${contract.displayHeight}x24", "kotlin", "-J-Djava.awt.headless=false", root.resolve("tools/kotlin/vs_ships_observer.main.kts").toString(), "--client-dir", observerDir.toString(), "--argfile", evidence.resolve("observer.args").toString(), "--server", "127.0.0.1:$port", "--evidence-dir", evidence.toString(), "--capture-signal", captureSignal.toString(), "--stop-signal", stopSignal.toString())
            commands.appendLine(command.joinToString(" "))
            observer = ProcessBuilder(command).directory(root.toFile()).redirectErrorStream(true).redirectOutput(evidence.resolve("observer-launcher.log").toFile()).start()
            waitFor(server!!.log, Regex("AgentObserver joined the game"), 900, observer)
            send(server!!, "tp AgentObserver AgentPilot", commands)
        }
    }
    if (stopAfter == "lifecycle") phase("mount_movement") {
        rightClickCenter(robot, sneak = false)
        Thread.sleep(2_000)
        send(server!!, "execute as AgentPilot on vehicle run say BTM_VS_PILOT_MOUNTED", commands)
        waitFor(server!!.log, Regex("BTM_VS_PILOT_MOUNTED"), 30, server!!.process)
        screenshot(robot, evidence.resolve("ship-mounted.png"))
        assertShips(server!!, commands, makeStatic = false)
        send(server!!, "data get entity AgentPilot Pos", commands)
        Thread.sleep(2_000)
        val before = parseLastPosition(tail(server!!.log), "AgentPilot") ?: error("mount movement position before was unavailable")
        robot.keyPress(KeyEvent.VK_W)
        Thread.sleep(4_000)
        robot.keyRelease(KeyEvent.VK_W)
        Thread.sleep(3_000)
        send(server!!, "data get entity AgentPilot Pos", commands)
        Thread.sleep(2_000)
        val after = parseLastPosition(tail(server!!.log), "AgentPilot") ?: error("mount movement position after was unavailable")
        val moved = distance(before, after)
        Files.writeString(evidence.resolve("movement.txt"), "before=$before\nafter=$after\ndistance=$moved\n")
        if (moved < 0.25) error("mount movement distance was $moved")
        screenshot(robot, evidence.resolve("ship-moved.png"))
        robot.keyPress(KeyEvent.VK_SHIFT)
        Thread.sleep(500)
        robot.keyRelease(KeyEvent.VK_SHIFT)
        assertShips(server!!, commands, makeStatic = true)
        if (profile == "release") {
            Files.writeString(evidence.resolve("capture-observer"), "capture\n")
            val deadline = System.currentTimeMillis() + 60_000
            while (System.currentTimeMillis() < deadline && !evidence.resolve("observer-sync.png").exists()) Thread.sleep(500)
            if (!evidence.resolve("observer-sync.png").exists()) error("observer sync screenshot was not captured")
        }
    }
    if (stopAfter == "lifecycle") phase("client_reconnect") {
        stopProcess(pilot)
        pilot = null
        val joins = Regex("AgentPilot joined the game").findAll(tail(server!!.log)).count()
        pilot = startClient(pilotDir, evidence.resolve("pilot.args"), evidence.resolve("pilot-client-console-2.log"))
        waitForTitleReady(pilotDir, pilot!!)
        screenshot(robot, evidence.resolve("pilot-title-reconnect.png"))
        waitFor(server!!.log, Regex("AgentPilot joined the game"), 900, pilot, joins + 1)
        assertPlayerConnected(server!!, "AgentPilot", commands, "BTM_VS_PILOT_RECONNECT_STABLE")
        if (!waitForPlayableFrame(robot, evidence.resolve("pilot-reconnected.png"), 120)) error("reconnect never produced a playable frame")
        assertShips(server!!, commands, makeStatic = true)
    }
    if (stopAfter == "lifecycle") phase("server_restart_reload") {
        stopProcess(pilot)
        pilot = null
        if (profile == "release") {
            Files.writeString(evidence.resolve("stop-observer"), "stop\n")
            if (!observer!!.waitFor(60, TimeUnit.SECONDS)) stopProcess(observer)
            if (observer!!.exitValue() != 0) error("observer client failed")
            observer = null
        }
        send(server!!, "save-all flush", commands)
        stopServer(server, commands)
        server = startServer(serverDir, port, evidence.resolve("server-console-boot-2.log"))
        waitFor(server!!.log, Regex("Done \\([0-9.]+s\\)!"), 900, server!!.process)
        pilot = startClient(pilotDir, evidence.resolve("pilot.args"), evidence.resolve("pilot-client-console-3.log"))
        waitForTitleReady(pilotDir, pilot!!)
        screenshot(robot, evidence.resolve("pilot-title-restart.png"))
        waitFor(server!!.log, Regex("AgentPilot joined the game"), 900, pilot)
        assertPlayerConnected(server!!, "AgentPilot", commands, "BTM_VS_PILOT_RESTART_STABLE")
        if (!waitForPlayableFrame(robot, evidence.resolve("pilot-after-server-restart.png"), 120)) error("server restart never produced a playable frame")
        assertShips(server!!, commands, makeStatic = true)
    }
} catch (error: Throwable) {
    failure = error
} finally {
    runCatching { Files.writeString(evidence.resolve("stop-observer"), "stop\n") }
    stopProcess(observer)
    stopProcess(pilot)
    stopServer(server, commands)
}

Files.writeString(runRoot.resolve("commands.log"), commands.toString())
listOf(
    pilotDir.resolve("logs/latest.log") to evidence.resolve("pilot-latest.log"),
    serverDir.resolve("logs/latest.log") to evidence.resolve("server-latest.log"),
).forEach { (source, target) -> if (source.exists()) Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING) }
val allText = Files.walk(evidence).use { stream -> stream.filter(Files::isRegularFile).filter { it.fileName.toString().endsWith(".log") }.toList() }
    .joinToString("\n") { tail(it) }
if (failure == null && Regex("shouldersurfing", RegexOption.IGNORE_CASE).containsMatchIn(allText)) {
    failure = error("removed client mod present: Shoulder Surfing was loaded")
}
val classifier = failure?.let { classify(allText, it) }
val status = if (failure == null) "passed" else "failed"
val pilotConsoleText = Files.list(evidence).use { stream ->
    stream.filter { it.fileName.toString().matches(Regex("pilot-client-console-.*\\.log")) }.toList()
}.joinToString("\n") { tail(it) }
val dhClientColorFailures = Regex("Failed to get block color for block", RegexOption.IGNORE_CASE).findAll(pilotConsoleText).count()
val metricsJson = """{
  "status": ${q(status)},
  "classifier": ${q(classifier)},
  "profile": ${q(profile)},
  "fixture": ${q(fixture)},
  "variant": ${q(variant)},
  "stop_after": ${q(stopAfter)},
  "dh_client_color_failures": $dhClientColorFailures,
  "fixture_render_score": ${fixtureRenderScore ?: "null"},
  "assembled_render_score": ${assembledRenderScore ?: "null"},
  "phases": [${phases.joinToString(",") { "{\"name\":${q(it.name)},\"status\":${q(it.status)},\"duration_ms\":${it.durationMs},\"detail\":${q(it.detail)}}" }}]
}
"""
Files.writeString(evidence.resolve("metrics.json"), metricsJson)
Files.writeString(runRoot.resolve("metrics.json"), metricsJson)
val registryText = serverDir.resolve("generated/runtime-dumps/registries.json").let { if (it.exists()) Files.readString(it) else "" }
val registryNamespaces = listOf("valkyrienskies", "vs_eureka") +
    (if (fixture in setOf("clockwork", "combined")) listOf("vs_clockwork") else emptyList()) +
    (if (fixture in setOf("trackwork", "combined")) listOf("trackwork") else emptyList())
Files.writeString(runRoot.resolve("registry-snapshot.json"), """{
  "namespaces": [${registryNamespaces.joinToString(",") { q(it) }}],
  "unknown_gaps": [${registryNamespaces.filterNot { registryText.contains("$it:") }.joinToString(",") { q(it) }}]
}
""")
val screenshotExpectations = mapOf(
    "pilot-joined.png" to "joined world frame is nonblank",
    "core-fixture.png" to "floating helm, plank, engine, and floater are visible with air around the fixture",
    "helm-gui.png" to "Eureka helm menu is open and Assemble is active",
    "helm-button-hovered.png" to "Assemble button shows its hover state",
    "helm-button-pressed.png" to "Assemble button shows its pressed state",
    "ship-assembled.png" to "assembled ship remains visible after world blocks relocate",
    "ship-mounted.png" to "pilot is seated at the helm without camera clipping",
    "ship-moved.png" to "ship and pilot moved without missing component models",
    "pilot-reconnected.png" to "ship renders after client reconnect",
    "pilot-after-server-restart.png" to "ship renders after server save and restart",
)
Files.writeString(runRoot.resolve("screenshot-manifest.json"), buildString {
    appendLine("{")
    appendLine("  \"schema\": \"btm.vs_screenshot_manifest.v1\",")
    appendLine("  \"fixture\": ${q(fixture)},")
    appendLine("  \"variant\": ${q(variant)},")
    appendLine("  \"review_required\": true,")
    appendLine("  \"screenshots\": [")
    appendLine(contract.screenshots.joinToString(",\n") { name ->
        val path = evidence.resolve(name)
        "    {\"id\":${q(name.removeSuffix(".png"))},\"path\":${q(path.toString())},\"exists\":${path.exists()},\"expected\":${q(screenshotExpectations[name] ?: "phase-specific visual evidence")}}"
    })
    appendLine("  ]")
    appendLine("}")
})
Files.writeString(runRoot.resolve("summary.txt"), buildString {
    appendLine("vs_ships_client $status at ${Instant.now()} classifier=${classifier ?: "none"}")
    phases.forEach { appendLine("${it.name}: ${it.status}${it.detail?.let { detail -> " ($detail)" }.orEmpty()}") }
})
Files.writeString(runRoot.resolve("summary.json"), """{
  "scenario": "vs_ships_client",
  "status": ${q(status)},
  "profile": ${q(profile)},
  "classifier": ${q(classifier)},
  "fixture": ${q(fixture)},
  "variant": ${q(variant)},
  "stop_after": ${q(stopAfter)},
  "dh_client_color_failures": $dhClientColorFailures,
  "fixture_render_score": ${fixtureRenderScore ?: "null"},
  "assembled_render_score": ${assembledRenderScore ?: "null"},
  "phases": [${phases.joinToString(",") { "{\"name\":${q(it.name)},\"status\":${q(it.status)},\"duration_ms\":${it.durationMs},\"detail\":${q(it.detail)}}" }}]
}
""")
println("vs_ships_client: $status classifier=${classifier ?: "none"}")
failure?.message?.let { System.err.println(it) }
if (status == "passed" && !keepRuns) {
    deleteTree(serverDir)
    deleteTree(pilotDir)
    deleteTree(observerDir)
}
exitProcess(if (status == "passed") 0 else 1)

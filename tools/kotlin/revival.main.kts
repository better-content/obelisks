#!/usr/bin/env kotlin

import java.awt.GraphicsEnvironment
import java.awt.Rectangle
import java.awt.Robot
import java.awt.Toolkit
import java.awt.event.InputEvent
import java.awt.event.KeyEvent
import java.awt.image.BufferedImage
import java.io.BufferedWriter
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardCopyOption
import java.time.Instant
import java.util.concurrent.TimeUnit
import javax.imageio.ImageIO
import kotlin.io.path.createDirectories
import kotlin.io.path.exists
import kotlin.system.exitProcess

data class RunningServer(val process: Process, val stdin: BufferedWriter, val log: Path)
data class Phase(val name: String, val status: String, val durationMs: Long, val detail: String? = null)

val root = Paths.get("").toAbsolutePath().normalize()
val displayWidth = 1920
val displayHeight = 1080
if ((System.getenv("DISPLAY").isNullOrBlank() || GraphicsEnvironment.isHeadless()) && System.getenv("BC_REVIVAL_XVFB") != "1") {
    val command = listOf(
        "xvfb-run", "-a", "-s", "-screen 0 ${displayWidth}x${displayHeight}x24",
        "kotlin", "-J-Djava.awt.headless=false", root.resolve("tools/kotlin/revival.main.kts").toString(),
    ) + args
    val process = ProcessBuilder(command).directory(root.toFile()).inheritIO().apply {
        environment()["BC_REVIVAL_XVFB"] = "1"
    }.start()
    exitProcess(process.waitFor())
}

fun usage(message: String? = null): Nothing {
    if (message != null) System.err.println(message)
    System.err.println("Usage: tools/bc test scenario-headful revival [--bootstrap-mode always|once|never] [--run-root PATH] [--port N] [--keep-runs]")
    exitProcess(if (message == null) 0 else 2)
}

fun q(value: String?): String = if (value == null) "null" else "\"" + value
    .replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\""

fun deleteTree(path: Path) {
    if (!path.exists()) return
    Files.walk(path).use { stream -> stream.sorted(java.util.Comparator.reverseOrder()).forEach(Files::deleteIfExists) }
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

fun setPort(path: Path, port: Int) {
    val lines = if (path.exists()) Files.readAllLines(path).toMutableList() else mutableListOf()
    val index = lines.indexOfFirst { it.startsWith("server-port=") }
    if (index >= 0) lines[index] = "server-port=$port" else lines += "server-port=$port"
    Files.writeString(path, lines.joinToString("\n", postfix = "\n"))
}

fun setTomlValue(path: Path, key: String, value: String) {
    if (!path.exists()) return
    val lines = Files.readAllLines(path).map { line ->
        if (line.trimStart().startsWith("$key =")) "$key = $value" else line
    }
    Files.writeString(path, lines.joinToString("\n", postfix = "\n"))
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

fun startServer(serverDir: Path, port: Int, log: Path): RunningServer {
    setPort(serverDir.resolve("server.properties"), port)
    val process = ProcessBuilder("./run.sh", "nogui").directory(serverDir.toFile())
        .redirectErrorStream(true).redirectOutput(log.toFile()).start()
    return RunningServer(process, process.outputStream.bufferedWriter(), log)
}

fun send(server: RunningServer, command: String, commands: StringBuilder) {
    commands.appendLine(command)
    server.stdin.write(command)
    server.stdin.newLine()
    server.stdin.flush()
}

fun waitFor(path: Path, pattern: Regex, timeoutSeconds: Long, process: Process? = null, previousMatches: Int = 0) {
    val deadline = System.currentTimeMillis() + timeoutSeconds * 1000
    while (System.currentTimeMillis() < deadline) {
        if (process != null && !process.isAlive) error("process exited with ${process.exitValue()} while waiting for ${pattern.pattern}")
        if (pattern.findAll(tail(path)).count() > previousMatches) return
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

fun configureClient(clientDir: Path) {
    Files.writeString(clientDir.resolve("options.txt"), buildString {
        appendLine("guiScale:3")
        appendLine("pauseOnLostFocus:false")
        appendLine("autoJump:false")
        appendLine("fullscreen:false")
        appendLine("fov:0.0")
        appendLine("chatVisibility:2")
    })
}

fun prepareArgfile(clientDir: Path, username: String, port: Int, out: Path, log: Path) {
    val command = listOf(
        root.resolve("tools/bc").toString(), "internal", "minecraft-client-argfile",
        "--client-dir", clientDir.toString(), "--version-id", "1.20.1-forge-47.4.13",
        "--username", username, "--server", "127.0.0.1:$port", "--out", out.toString(),
    )
    if (run(command, 600, log) != 0) error("client argument generation failed for $username; see $log")
    Files.writeString(out, Files.readString(out) + "\"--width\"\n\"$displayWidth\"\n\"--height\"\n\"$displayHeight\"\n")
}

fun startClient(clientDir: Path, argfile: Path, console: Path): Process {
    Files.deleteIfExists(clientDir.resolve("logs/latest.log"))
    return ProcessBuilder("java", "-Xms2G", "-Xmx5G", "@${argfile}")
        .directory(clientDir.toFile()).redirectErrorStream(true).redirectOutput(console.toFile()).start()
}

fun waitForTitleReady(clientDir: Path, process: Process) {
    val latest = clientDir.resolve("logs/latest.log")
    val startupFinished = Regex("Game took [0-9.]+ seconds to start", RegexOption.IGNORE_CASE)
    val deadline = System.currentTimeMillis() + 240_000
    while (System.currentTimeMillis() < deadline && process.isAlive) {
        if (startupFinished.containsMatchIn(tail(latest))) { Thread.sleep(2_000); return }
        Thread.sleep(500)
    }
    error("client title screen did not become ready")
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

fun waitForPlayableFrame(robot: Robot, out: Path, timeoutSeconds: Long) {
    val deadline = System.currentTimeMillis() + timeoutSeconds * 1000
    while (System.currentTimeMillis() < deadline) {
        if (nonblank(screenshot(robot, out))) return
        Thread.sleep(5_000)
    }
    error("joined client never produced a playable frame")
}

fun focusPreviousWindow(robot: Robot) {
    robot.keyPress(KeyEvent.VK_ALT)
    robot.keyPress(KeyEvent.VK_TAB)
    robot.keyRelease(KeyEvent.VK_TAB)
    robot.keyRelease(KeyEvent.VK_ALT)
    Thread.sleep(1_500)
}

fun completeOnboarding(robot: Robot, server: RunningServer, username: String, commands: StringBuilder) {
    val marker = "BC_REVIVAL_${username.uppercase()}_READY"
    val pattern = Regex("\\[Server] $marker")
    val previous = pattern.findAll(tail(server.log)).count()
    repeat(8) {
        send(server, "execute if entity @a[name=$username,gamemode=!spectator] run say $marker", commands)
        Thread.sleep(1_000)
        if (pattern.findAll(tail(server.log)).count() > previous) {
            focusPreviousWindow(robot)
            return
        }
        robot.keyPress(KeyEvent.VK_K)
        robot.keyRelease(KeyEvent.VK_K)
        Thread.sleep(2_000)
        focusPreviousWindow(robot)
    }
    error("client onboarding did not release $username from spectator mode")
}

fun assertConnected(server: RunningServer, username: String, commands: StringBuilder) {
    val marker = "BC_REVIVAL_${username.uppercase()}_CONNECTED"
    val pattern = Regex("\\[Server] $marker")
    val previous = pattern.findAll(tail(server.log)).count()
    send(server, "execute if entity @a[name=$username] run say $marker", commands)
    waitFor(server.log, pattern, 30, server.process, previous)
}

var bootstrapMode = "always"
var keepRuns = false
var runRoot = System.getenv("BC_HARNESS_RUN_ROOT")?.takeIf(String::isNotBlank)?.let(Paths::get)
    ?: Paths.get(System.getProperty("user.home"), ".cache", "bc", "revival-visuals")
var port = System.getenv("BC_HARNESS_ACTUAL_PORT")?.toIntOrNull() ?: 25569
var index = 0
while (index < args.size) {
    when (args[index]) {
        "--bootstrap-mode" -> { bootstrapMode = args.getOrNull(index + 1) ?: usage("--bootstrap-mode needs always, once, or never"); index += 2 }
        "--run-root" -> { runRoot = Paths.get(args.getOrNull(index + 1) ?: usage("--run-root needs a path")); index += 2 }
        "--port" -> { port = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--port needs a number"); index += 2 }
        "--keep-runs" -> { keepRuns = true; index++ }
        "--help" -> usage()
        else -> usage("unknown argument: ${args[index]}")
    }
}
if (bootstrapMode !in setOf("always", "once", "never")) usage("invalid bootstrap mode: $bootstrapMode")
runRoot = runRoot.toAbsolutePath().normalize()
if (!keepRuns && bootstrapMode != "never") deleteTree(runRoot)
runRoot.createDirectories()

val serverDir = runRoot.resolve("server")
val targetDir = runRoot.resolve("target-client")
val helperDir = runRoot.resolve("helper-client")
val evidence = runRoot.resolve("evidence").apply { createDirectories() }
val commands = StringBuilder("# revival visual scenario commands\n")
val phases = mutableListOf<Phase>()
val robot = Robot().apply { autoDelay = 80 }
var server: RunningServer? = null
var target: Process? = null
var helper: Process? = null
var failure: Throwable? = null

fun phase(name: String, block: () -> Unit) {
    val started = System.nanoTime()
    try {
        block()
        phases += Phase(name, "passed", (System.nanoTime() - started) / 1_000_000)
    } catch (error: Throwable) {
        phases += Phase(name, "failed", (System.nanoTime() - started) / 1_000_000, error.message)
        throw error
    }
}

try {
    phase("prepare_runtimes") {
        val prepareServer = bootstrapMode == "always" || (bootstrapMode == "once" && !serverDir.resolve("run.sh").exists())
        if (prepareServer) {
            if (run(listOf(root.resolve("tools/bc").toString(), "internal", "prepare-server-runtime", "--server-dir", serverDir.toString(), "--port", port.toString(), "--reset-runtime"), 900, evidence.resolve("prepare-server.log")) != 0) error("server runtime preparation failed")
        } else if (!serverDir.resolve("run.sh").exists()) error("prepared server runtime missing")
        for ((clientDir, name) in listOf(targetDir to "target", helperDir to "helper")) {
            val prepareClient = bootstrapMode == "always" || (bootstrapMode == "once" && !clientDir.resolve("versions/1.20.1-forge-47.4.13").exists())
            if (prepareClient) {
                if (run(listOf(root.resolve("tools/bc").toString(), "internal", "prepare-client-runtime", "--client-dir", clientDir.toString()), 1_200, evidence.resolve("prepare-$name-client.log")) != 0) error("$name client runtime preparation failed")
            } else if (!clientDir.resolve("versions/1.20.1-forge-47.4.13").exists()) error("prepared $name client runtime missing")
            configureClient(clientDir)
        }
        val visualIrrelevant = listOf(
            Regex("DistantHorizons.*\\.jar", RegexOption.IGNORE_CASE),
            Regex("weather2.*\\.jar", RegexOption.IGNORE_CASE),
        )
        val removed = listOf(serverDir, targetDir, helperDir)
            .flatMap { removeRuntimeJars(it, visualIrrelevant) }.distinct().sorted()
        Files.writeString(evidence.resolve("removed-visual-irrelevant-mods.txt"), removed.joinToString("\n", postfix = "\n"))
        setTomlValue(serverDir.resolve("config/revival-common.toml"), "bleedTicks", "12000")
        prepareArgfile(targetDir, "AgentTarget", port, evidence.resolve("target.args"), evidence.resolve("target-argfile.log"))
        prepareArgfile(helperDir, "AgentHelper", port, evidence.resolve("helper.args"), evidence.resolve("helper-argfile.log"))
        val runtimeMods = Files.list(serverDir.resolve("mods")).use { stream -> stream.map { it.fileName.toString() }.toList() }
        check(runtimeMods.any { it.matches(Regex("revival-[0-9].*\\.jar")) }) { "Revival runtime jar is missing" }
        check(runtimeMods.none { it.contains("playerrevive", ignoreCase = true) }) { "PlayerRevive artifact remains in runtime" }
        check(serverDir.resolve("config/revival-common.toml").exists()) { "Revival config is missing" }
    }
    phase("server_boot") {
        server = startServer(serverDir, port, evidence.resolve("server-console.log"))
        waitFor(server!!.log, Regex("Done \\([0-9.]+s\\)!"), 900, server!!.process)
        send(server!!, "op AgentTarget", commands)
        send(server!!, "op AgentHelper", commands)
        send(server!!, "forceload add 0 0", commands)
        send(server!!, "setworldspawn 0 100 0", commands)
        send(server!!, "fill -8 99 -8 8 99 8 minecraft:polished_deepslate", commands)
        send(server!!, "fill -8 100 -8 8 106 8 minecraft:air", commands)
        send(server!!, "time set day", commands)
        send(server!!, "weather clear", commands)
    }
    phase("target_join_and_downed_hud") {
        val joins = Regex("AgentTarget joined the game").findAll(tail(server!!.log)).count()
        target = startClient(targetDir, evidence.resolve("target.args"), evidence.resolve("target-client-console.log"))
        waitForTitleReady(targetDir, target!!)
        waitFor(server!!.log, Regex("AgentTarget joined the game"), 900, target, joins)
        waitFor(targetDir.resolve("logs/latest.log"), Regex("Loaded [0-9]+ advancements"), 120, target)
        waitForPlayableFrame(robot, evidence.resolve("target-joined.png"), 120)
        completeOnboarding(robot, server!!, "AgentTarget", commands)
        robot.keyPress(KeyEvent.VK_2)
        robot.keyRelease(KeyEvent.VK_2)
        send(server!!, "gamemode survival AgentTarget", commands)
        send(server!!, "effect clear AgentTarget", commands)
        send(server!!, "attribute AgentTarget minecraft:generic.max_health base set 20", commands)
        send(server!!, "tp AgentTarget 0.5 100 0.5 0 0", commands)
        send(server!!, "revival test down AgentTarget", commands)
        val downedMarker = Regex("\\[Server] BC_REVIVAL_TARGET_DOWNED")
        val previous = downedMarker.findAll(tail(server!!.log)).count()
        send(server!!, "execute if data entity AgentTarget ForgeData.\"revival:state\" run say BC_REVIVAL_TARGET_DOWNED", commands)
        waitFor(server!!.log, downedMarker, 30, server!!.process, previous)
        Thread.sleep(5_000)
        screenshot(robot, evidence.resolve("downed-hud.png"))
        robot.keyPress(KeyEvent.VK_SHIFT)
        Thread.sleep(2_500)
        screenshot(robot, evidence.resolve("give-up-progress.png"))
        robot.keyRelease(KeyEvent.VK_SHIFT)
        Thread.sleep(500)
    }
    phase("helper_join_and_channel_hud") {
        val joins = Regex("AgentHelper joined the game").findAll(tail(server!!.log)).count()
        helper = startClient(helperDir, evidence.resolve("helper.args"), evidence.resolve("helper-client-console.log"))
        waitForTitleReady(helperDir, helper!!)
        waitFor(server!!.log, Regex("AgentHelper joined the game"), 900, helper, joins)
        waitFor(helperDir.resolve("logs/latest.log"), Regex("Loaded [0-9]+ advancements"), 120, helper)
        waitForPlayableFrame(robot, evidence.resolve("helper-joined.png"), 120)
        completeOnboarding(robot, server!!, "AgentHelper", commands)
        robot.keyPress(KeyEvent.VK_2)
        robot.keyRelease(KeyEvent.VK_2)
        send(server!!, "gamemode survival AgentHelper", commands)
        send(server!!, "team add revival_fixture", commands)
        send(server!!, "team modify revival_fixture nametagVisibility never", commands)
        send(server!!, "team join revival_fixture AgentTarget", commands)
        send(server!!, "team join revival_fixture AgentHelper", commands)
        send(server!!, "tp AgentTarget 0.5 100 0.5 0 0", commands)
        send(server!!, "tp AgentHelper 0.5 100 2.5 180 28", commands)
        send(server!!, "item replace entity AgentHelper weapon.mainhand with minecraft:air", commands)
        send(server!!, "item replace entity AgentHelper weapon.offhand with minecraft:air", commands)
        Thread.sleep(2_000)
        val screen = Toolkit.getDefaultToolkit().screenSize
        robot.mouseMove(screen.width / 2, screen.height / 2)
        robot.mousePress(InputEvent.BUTTON3_DOWN_MASK)
        Thread.sleep(2_500)
        screenshot(robot, evidence.resolve("helper-reviving.png"))
        Thread.sleep(4_000)
        robot.mouseRelease(InputEvent.BUTTON3_DOWN_MASK)
        Thread.sleep(500)
        assertConnected(server!!, "AgentTarget", commands)
        assertConnected(server!!, "AgentHelper", commands)
    }
    phase("revive_completion") {
        val revivedMarker = Regex("\\[Server] BC_REVIVAL_TARGET_REVIVED")
        val previous = revivedMarker.findAll(tail(server!!.log)).count()
        send(server!!, "execute unless data entity AgentTarget ForgeData.\"revival:state\" if entity @a[name=AgentTarget,nbt={Health:2.0f}] run say BC_REVIVAL_TARGET_REVIVED", commands)
        waitFor(server!!.log, revivedMarker, 30, server!!.process, previous)
        Thread.sleep(1_000)
        screenshot(robot, evidence.resolve("helper-after-revive.png"))
        stopProcess(helper)
        helper = null
        Thread.sleep(2_000)
        screenshot(robot, evidence.resolve("target-after-revive.png"))
    }
} catch (error: Throwable) {
    failure = error
} finally {
    runCatching { robot.mouseRelease(InputEvent.BUTTON3_DOWN_MASK) }
    runCatching { robot.keyRelease(KeyEvent.VK_SHIFT) }
    stopProcess(helper)
    stopProcess(target)
    stopServer(server, commands)
}

Files.writeString(runRoot.resolve("commands.log"), commands.toString())
listOf(
    targetDir.resolve("logs/latest.log") to evidence.resolve("target-latest.log"),
    helperDir.resolve("logs/latest.log") to evidence.resolve("helper-latest.log"),
    serverDir.resolve("logs/latest.log") to evidence.resolve("server-latest.log"),
).forEach { (source, destination) -> if (source.exists()) Files.copy(source, destination, StandardCopyOption.REPLACE_EXISTING) }

val screenshotExpectations = linkedMapOf(
    "downed-hud.png" to "DOWN BUT NOT OUT, bleed timer, and give-up guidance are legible without covering the crosshair",
    "helper-reviving.png" to "helper sees a compact revive progress bar and target name while aiming at the downed player",
    "give-up-progress.png" to "downed player sees a readable partial give-up progress state",
    "helper-after-revive.png" to "helper revive overlay clears immediately after success",
    "target-after-revive.png" to "downed HUD clears immediately after success",
)
val missing = screenshotExpectations.keys.filterNot { evidence.resolve(it).exists() }
if (failure == null && missing.isNotEmpty()) failure = error("missing visual evidence: ${missing.joinToString()}")
val status = if (failure == null) "PASS" else "FAIL"
Files.writeString(runRoot.resolve("screenshot-manifest.json"), buildString {
    appendLine("{")
    appendLine("  \"schema\": \"bc.revival_visuals.v1\",")
    appendLine("  \"status\": \"$status\",")
    appendLine("  \"capture_kind\": \"diagnostic_hud_fixture\",")
    appendLine("  \"review_required\": true,")
    appendLine("  \"screenshots\": [")
    appendLine(screenshotExpectations.entries.joinToString(",\n") { (name, expected) ->
        "    {\"id\":${q(name.removeSuffix(".png"))},\"path\":${q(evidence.resolve(name).toString())},\"exists\":${evidence.resolve(name).exists()},\"expected\":${q(expected)}}"
    })
    appendLine("  ]")
    appendLine("}")
})
Files.writeString(runRoot.resolve("summary.json"), buildString {
    appendLine("{")
    appendLine("  \"scenario\": \"revival\",")
    appendLine("  \"status\": \"$status\",")
    appendLine("  \"timestamp\": ${q(Instant.now().toString())},")
    appendLine("  \"classifier\": ${q(failure?.message)},")
    appendLine("  \"phases\": [${phases.joinToString(",") { "{\"name\":${q(it.name)},\"status\":${q(it.status)},\"duration_ms\":${it.durationMs},\"detail\":${q(it.detail)}}" }}]")
    appendLine("}")
})
println("Revival visual scenario ${status.lowercase()}: ${runRoot.resolve("screenshot-manifest.json")}")
failure?.message?.let(System.err::println)
exitProcess(if (failure == null) 0 else 1)

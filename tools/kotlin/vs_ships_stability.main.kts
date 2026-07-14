#!/usr/bin/env kotlin

import java.io.BufferedWriter
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardCopyOption
import java.time.Instant
import java.util.concurrent.TimeUnit
import kotlin.io.path.createDirectories
import kotlin.io.path.exists
import kotlin.system.exitProcess

data class RunningServer(val process: Process, val stdin: BufferedWriter, val log: Path)
data class PhaseResult(val name: String, val status: String, val durationMs: Long, val detail: String? = null)
data class CycleResult(val cycle: Int, val status: String, val classifier: String?, val serverDir: String, val phases: List<PhaseResult>, val physicsWarnings: Int)

val root: Path = Paths.get("").toAbsolutePath().normalize()
val requiredIds = listOf(
    "valkyrienskies:ship_creator",
    "valkyrienskies:ship_assembler",
    "vs_eureka:oak_ship_helm",
    "vs_eureka:engine",
    "vs_clockwork:phys_bearing",
    "trackwork:phys_track",
)
val fixtureBlocks = listOf(
    Triple(0, 0, "vs_eureka:oak_ship_helm"),
    Triple(1, 0, "vs_eureka:engine"),
    Triple(2, 0, "vs_eureka:floater"),
    Triple(3, 0, "vs_clockwork:phys_bearing"),
    Triple(4, 0, "trackwork:phys_track"),
)

fun usage(message: String? = null): Nothing {
    if (message != null) System.err.println(message)
    System.err.println("Usage: tools/bc test scenario vs_ships_stability --profile quick|release|brutal [--cycles N] [--port N] [--timeout-seconds N] [--bootstrap-mode always|once|never] [--run-root PATH] [--keep-runs]")
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
fun run(command: List<String>, timeoutSeconds: Long, output: Path? = null): Int {
    val builder = ProcessBuilder(command).directory(root.toFile()).redirectErrorStream(true)
    if (output != null) builder.redirectOutput(output.toFile()) else builder.inheritIO()
    val process = builder.start()
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
fun startServer(serverDir: Path, port: Int, log: Path): RunningServer {
    setPort(serverDir.resolve("server.properties"), port)
    val process = ProcessBuilder("./run.sh", "nogui")
        .directory(serverDir.toFile())
        .redirectErrorStream(true)
        .redirectOutput(log.toFile())
        .start()
    return RunningServer(process, process.outputStream.bufferedWriter(), log)
}
fun send(server: RunningServer, command: String, commands: StringBuilder) {
    commands.appendLine(command)
    server.stdin.write(command)
    server.stdin.newLine()
    server.stdin.flush()
}
fun waitFor(server: RunningServer, pattern: Regex, timeoutSeconds: Long, phase: String) {
    val deadline = System.currentTimeMillis() + timeoutSeconds * 1000
    while (System.currentTimeMillis() < deadline) {
        if (!server.process.isAlive) error("$phase: server exited with ${server.process.exitValue()}")
        if (pattern.containsMatchIn(tail(server.log))) return
        Thread.sleep(500)
    }
    error("$phase timed out after ${timeoutSeconds}s")
}
fun stop(server: RunningServer?, commands: StringBuilder) {
    if (server == null || !server.process.isAlive) return
    runCatching { send(server, "stop", commands) }
    if (!server.process.waitFor(60, TimeUnit.SECONDS)) {
        server.process.destroy()
        if (!server.process.waitFor(10, TimeUnit.SECONDS)) server.process.destroyForcibly()
    }
}
fun classify(text: String, failure: Throwable): String {
    val checks = listOf(
        "registry_contract_failure" to Regex("missing runtime ids", RegexOption.IGNORE_CASE),
        "dependency_mixin_failure" to Regex("Mixin apply failed|NoClassDefFoundError|ClassNotFoundException|NoSuchMethodError|NoSuchFieldError", RegexOption.IGNORE_CASE),
        "eureka_init_failure" to Regex("(?:ERROR|FATAL|Exception).{0,200}(?:eureka|vs_eureka)|(?:eureka|vs_eureka).{0,200}(?:ERROR|FATAL|Exception)", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL)),
        "clockwork_init_failure" to Regex("(?:ERROR|FATAL|Exception).{0,200}(?:clockwork|vs_clockwork)|(?:clockwork|vs_clockwork).{0,200}(?:ERROR|FATAL|Exception)", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL)),
        "trackwork_init_failure" to Regex("(?:ERROR|FATAL|Exception).{0,200}trackwork|trackwork.{0,200}(?:ERROR|FATAL|Exception)", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL)),
        "vs_init_failure" to Regex("(?:ERROR|FATAL|Exception).{0,200}(?:valkyrienskies|org\\.valkyrienskies)|(?:valkyrienskies|org\\.valkyrienskies).{0,200}(?:ERROR|FATAL|Exception)", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL)),
        "ship_save_reload_failure" to Regex("reload verification|Failed to save ship|Failed to load ship|ShipData|dimension shipyard", RegexOption.IGNORE_CASE),
        "dimension_conflict" to Regex("Unknown dimension|dimension fixture|level stem|worldgen", RegexOption.IGNORE_CASE),
        "c2me_dh_threading_failure" to Regex("ThreadingDetector|CheckedThreadLocalRandom|PalettedContainer|Detected setBlock in a far chunk", RegexOption.IGNORE_CASE),
        "component_fixture_failure" to Regex("fixture|Could not set the block|Unknown block", RegexOption.IGNORE_CASE),
        "suspected_ship_object_leak" to Regex("ship.*(?:leak|not unloaded)|orphan.*ship", RegexOption.IGNORE_CASE),
        "vs_physics_startup_stall" to Regex("Too many physics frames in the physics frame queue", RegexOption.IGNORE_CASE),
        "crash_report" to Regex("Preparing crash report|This crash report has been saved|Crash Report", RegexOption.IGNORE_CASE),
    )
    val combined = failure.message.orEmpty() + "\n" + text
    return checks.firstOrNull { it.second.containsMatchIn(combined) }?.first ?: "unclassified_vs_ships_failure"
}
fun registrySnapshot(serverDir: Path, out: Path) {
    val registries = serverDir.resolve("generated/runtime-dumps/registries.json")
    val text = if (registries.exists()) Files.readString(registries) else ""
    val missing = requiredIds.filterNot(text::contains)
    Files.writeString(out, """{
  "source": ${q(registries.toString())},
  "required_ids": [${requiredIds.joinToString(",") { q(it) }}],
  "missing_ids": [${missing.joinToString(",") { q(it) }}]
}
""")
    if (missing.isNotEmpty()) error("missing runtime ids: ${missing.joinToString()}")
}
fun fixtureDimensions(profile: String): List<String> = when (profile) {
    "quick" -> listOf("minecraft:overworld")
    else -> listOf("minecraft:overworld", "lostcities:lostcity", "creatingspace:earth_orbit")
}
fun verifyFixture(server: RunningServer, dimensions: List<String>, commands: StringBuilder, prefix: String) {
    dimensions.forEachIndexed { dimensionIndex, dimension ->
        val z = dimensionIndex * 16
        fixtureBlocks.forEachIndexed { blockIndex, (x, dz, id) ->
            send(server, "execute in $dimension if block $x 200 ${z + dz} $id run say ${prefix}_${dimensionIndex}_$blockIndex", commands)
        }
    }
    fixtureBlocks.indices.forEach { blockIndex ->
        waitFor(server, Regex("${Regex.escape(prefix)}_0_$blockIndex"), 30, "fixture verification")
    }
    if (dimensions.size > 1) waitFor(server, Regex("${Regex.escape(prefix)}_${dimensions.lastIndex}_${fixtureBlocks.lastIndex}"), 60, "dimension fixture verification")
}
fun placeAndVerify(server: RunningServer, dimensions: List<String>, commands: StringBuilder, prefix: String) {
    dimensions.forEachIndexed { dimensionIndex, dimension ->
        val z = dimensionIndex * 16
        send(server, "execute in $dimension run forceload add 0 $z 0 $z", commands)
        send(server, "execute in $dimension run fill 0 199 $z 4 199 $z minecraft:stone", commands)
        fixtureBlocks.forEach { (x, dz, id) -> send(server, "execute in $dimension run setblock $x 200 ${z + dz} $id", commands) }
    }
    verifyFixture(server, dimensions, commands, prefix)
}
fun removeAndVerify(server: RunningServer, dimensions: List<String>, commands: StringBuilder) {
    dimensions.forEachIndexed { dimensionIndex, dimension ->
        val z = dimensionIndex * 16
        fixtureBlocks.forEachIndexed { blockIndex, (x, dz, id) ->
            send(server, "execute in $dimension run setblock $x 200 ${z + dz} minecraft:air", commands)
            send(server, "execute in $dimension unless block $x 200 ${z + dz} $id run sayBC_VS_REMOVED_${dimensionIndex}_$blockIndex", commands)
        }
        send(server, "execute in $dimension run forceload remove all", commands)
    }
    waitFor(server, Regex("BC_VS_REMOVED_${dimensions.lastIndex}_${fixtureBlocks.lastIndex}"), 60, "fixture removal")
}

var profile = "quick"
var cycles = 1
var bootstrapMode = "always"
var keepRuns = false
var timeoutSeconds = 900L
var runRoot = System.getenv("BC_HARNESS_RUN_ROOT")?.takeIf(String::isNotBlank)?.let(Paths::get) ?: Paths.get("/tmp/bc-vs-ships-stability")
var port = System.getenv("BC_HARNESS_ACTUAL_PORT")?.toIntOrNull() ?: 25565
var index = 0
while (index < args.size) {
    when (args[index]) {
        "--profile" -> { profile = args.getOrNull(index + 1) ?: usage("--profile needs quick, release, or brutal"); index += 2 }
        "--cycles" -> { cycles = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--cycles needs a number"); index += 2 }
        "--bootstrap-mode" -> { bootstrapMode = args.getOrNull(index + 1) ?: usage("--bootstrap-mode needs always, once, or never"); index += 2 }
        "--timeout-seconds" -> { timeoutSeconds = args.getOrNull(index + 1)?.toLongOrNull() ?: usage("--timeout-seconds needs a number"); index += 2 }
        "--run-root" -> { runRoot = Paths.get(args.getOrNull(index + 1) ?: usage("--run-root needs a path")); index += 2 }
        "--port" -> { port = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--port needs a number"); index += 2 }
        "--keep-runs" -> { keepRuns = true; index++ }
        "--help" -> usage()
        else -> usage("unknown argument: ${args[index]}")
    }
}
if (profile !in setOf("quick", "release", "brutal")) usage("invalid profile: $profile")
if (bootstrapMode !in setOf("always", "once", "never")) usage("invalid bootstrap mode: $bootstrapMode")
if (cycles < 1) usage("--cycles must be positive")
if (profile == "brutal" && cycles < 3) cycles = 3
runRoot = runRoot.toAbsolutePath().normalize()
if (!keepRuns && bootstrapMode != "never") deleteTree(runRoot)
runRoot.createDirectories()

val commands = StringBuilder("# vs_ships_stability commands\n")
val results = mutableListOf<CycleResult>()
for (cycle in 1..cycles) {
    val serverDir = runRoot.resolve("cycle-$cycle")
    val evidence = runRoot.resolve("evidence-cycle-$cycle").apply { createDirectories() }
    val phases = mutableListOf<PhaseResult>()
    var active: RunningServer? = null
    var failure: Throwable? = null
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
        phase("prepare_runtime") {
            val shouldPrepare = bootstrapMode == "always" || (bootstrapMode == "once" && !serverDir.resolve("run.sh").exists())
            if (shouldPrepare) {
                val command = listOf(root.resolve("tools/bc").toString(), "internal", "prepare-server-runtime", "--server-dir", serverDir.toString(), "--port", port.toString(), "--reset-runtime")
                commands.appendLine(command.joinToString(" "))
                val exit = run(command, timeoutSeconds, evidence.resolve("prepare.log"))
                if (exit != 0) error("runtime preparation failed with exit $exit")
            } else if (!serverDir.resolve("run.sh").exists()) error("prepared runtime missing for --bootstrap-mode $bootstrapMode: $serverDir")
        }
        val dimensions = fixtureDimensions(profile)
        phase("boot_ready") {
            active = startServer(serverDir, port, evidence.resolve("server-console-boot-1.log"))
            waitFor(active!!, Regex("Done \\([0-9.]+s\\)!"), timeoutSeconds, "initial server boot")
        }
        phase("registry_contract") { registrySnapshot(serverDir, evidence.resolve("registry-snapshot.json")) }
        phase("component_fixture") { placeAndVerify(active!!, dimensions, commands, "BC_VS_PLACED") }
        phase("save_shutdown") {
            send(active!!, "save-all flush", commands)
            send(active!!, "sayBC_VS_SAVED", commands)
            waitFor(active!!, Regex("BC_VS_SAVED"), 30, "save marker")
            stop(active, commands)
            active = null
        }
        phase("reload_ready") {
            active = startServer(serverDir, port, evidence.resolve("server-console-boot-2.log"))
            waitFor(active!!, Regex("Done \\([0-9.]+s\\)!"), timeoutSeconds, "reload server boot")
        }
        phase("reload_verification") { verifyFixture(active!!, dimensions, commands, "BC_VS_RELOADED") }
        phase("removal_unload") { removeAndVerify(active!!, dimensions, commands) }
        phase("clean_shutdown") { stop(active, commands); active = null }
        phases += PhaseResult("ship_assembly", "not_automatable_headless", 0, "VS 2.4.11 exposes no server-side assembly command")
    } catch (error: Throwable) {
        failure = error
        stop(active, commands)
        active = null
    }
    val consoleText = listOf(evidence.resolve("server-console-boot-1.log"), evidence.resolve("server-console-boot-2.log"))
        .filter(Path::exists).joinToString("\n") { tail(it) }
    val allText = consoleText + "\n" + tail(serverDir.resolve("logs/latest.log"))
    val physicsWarnings = Regex("Too many physics frames in the physics frame queue", RegexOption.IGNORE_CASE).findAll(consoleText).count()
    val classifier = failure?.let { classify(allText, it) }
    val status = if (failure == null) "passed" else "failed"
    val latest = serverDir.resolve("logs/latest.log")
    if (latest.exists()) Files.copy(latest, evidence.resolve("latest.log"), StandardCopyOption.REPLACE_EXISTING)
    Files.writeString(evidence.resolve("metrics.json"), """{
  "cycle": $cycle,
  "status": ${q(status)},
  "classifier": ${q(classifier)},
  "physics_queue_warnings": $physicsWarnings,
  "phases": [${phases.joinToString(",") { "{\"name\":${q(it.name)},\"status\":${q(it.status)},\"duration_ms\":${it.durationMs},\"detail\":${q(it.detail)}}" }}]
}
""")
    results += CycleResult(cycle, status, classifier, serverDir.toString(), phases, physicsWarnings)
    println("cycle $cycle: $status classifier=${classifier ?: "none"} physics_queue_warnings=$physicsWarnings")
    if (status == "passed" && !keepRuns && profile != "brutal") deleteTree(serverDir)
    if (failure != null) break
}

Files.writeString(runRoot.resolve("commands.log"), commands.toString())
val finalStatus = if (results.size == cycles && results.all { it.status == "passed" }) "passed" else "failed"
Files.writeString(runRoot.resolve("summary.txt"), buildString {
    appendLine("vs_ships_stability $finalStatus at ${Instant.now()}")
    results.forEach { result ->
        appendLine("cycle ${result.cycle}: ${result.status} classifier=${result.classifier ?: "none"} physics_queue_warnings=${result.physicsWarnings} server=${result.serverDir}")
        result.phases.forEach { appendLine("  ${it.name}: ${it.status}${it.detail?.let { detail -> " ($detail)" }.orEmpty()}") }
    }
})
Files.writeString(runRoot.resolve("summary.json"), buildString {
    appendLine("{")
    appendLine("  \"scenario\": \"vs_ships_stability\",")
    appendLine("  \"status\": ${q(finalStatus)},")
    appendLine("  \"profile\": ${q(profile)},")
    appendLine("  \"cycles\": [")
    appendLine(results.joinToString(",\n") { result -> "    {\"cycle\":${result.cycle},\"status\":${q(result.status)},\"classifier\":${q(result.classifier)},\"physics_queue_warnings\":${result.physicsWarnings},\"server_dir\":${q(result.serverDir)},\"phases\":[${result.phases.joinToString(",") { "{\"name\":${q(it.name)},\"status\":${q(it.status)},\"duration_ms\":${it.durationMs},\"detail\":${q(it.detail)}}" }}]}" })
    appendLine("  ]")
    appendLine("}")
})
Files.writeString(runRoot.resolve("metrics.json"), buildString {
    appendLine("{")
    appendLine("  \"status\": ${q(finalStatus)},")
    appendLine("  \"requested_cycles\": $cycles,")
    appendLine("  \"completed_cycles\": ${results.size},")
    appendLine("  \"physics_queue_warnings\": ${results.sumOf(CycleResult::physicsWarnings)}")
    appendLine("}")
})
results.firstOrNull()?.let { first ->
    val snapshot = runRoot.resolve("evidence-cycle-${first.cycle}/registry-snapshot.json")
    if (snapshot.exists()) Files.copy(snapshot, runRoot.resolve("registry-snapshot.json"), StandardCopyOption.REPLACE_EXISTING)
}
exitProcess(if (finalStatus == "passed") 0 else 1)

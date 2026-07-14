#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.time.Instant
import java.util.concurrent.TimeUnit
import kotlin.io.path.createDirectories
import kotlin.io.path.exists
import kotlin.system.exitProcess

data class Variant(val name: String, val removeGlobs: List<Regex>)
data class TimedRun(val exitCode: Int, val output: String, val timedOut: Boolean, val durationMs: Long)
data class VariantResult(
    val cycle: Int,
    val name: String,
    val status: String,
    val classifier: String?,
    val dir: String,
    val exitCode: Int,
    val durationMs: Long,
    val ready: Boolean,
    val physicsQueueWarnings: Int,
    val removed: List<String>,
)

val root: Path = Paths.get("").toAbsolutePath().normalize()
val vsAddons = listOf(
    Regex("""eureka-.*\.jar""", RegexOption.IGNORE_CASE),
    Regex("""clockwork-.*\.jar""", RegexOption.IGNORE_CASE),
    Regex("""trackwork-.*\.jar""", RegexOption.IGNORE_CASE),
)
val variants = listOf(
    Variant("current_config", emptyList()),
    Variant("dh_disabled", listOf(Regex("""DistantHorizons.*\.jar""", RegexOption.IGNORE_CASE))),
    Variant("c2me_disabled", listOf(Regex("""c2me.*\.jar""", RegexOption.IGNORE_CASE))),
    Variant("dh_c2me_disabled", listOf(Regex("""DistantHorizons.*\.jar""", RegexOption.IGNORE_CASE), Regex("""c2me.*\.jar""", RegexOption.IGNORE_CASE))),
    Variant("vs_core_only", vsAddons),
    Variant("vs_eureka", vsAddons.filterNot { it.pattern.contains("eureka") }),
    Variant("vs_clockwork", vsAddons.filterNot { it.pattern.contains("clockwork") }),
    Variant("vs_trackwork", vsAddons.filterNot { it.pattern.contains("trackwork") }),
    Variant("full_vs_family", listOf(Regex("""DistantHorizons.*\.jar""", RegexOption.IGNORE_CASE), Regex("""c2me.*\.jar""", RegexOption.IGNORE_CASE))),
    Variant("full_vs_family_current_dh_c2me", emptyList()),
)
val variantsByName = variants.associateBy { it.name }

fun usage(message: String? = null): Nothing {
    if (message != null) System.err.println(message)
    System.err.println("Usage: tools/bc test scenario vs_ships_matrix --profile quick|release|brutal [--variants NAME,...] [--cycles N] [--port N] [--bootstrap-mode always|once|never] [--run-root PATH] [--timeout-seconds N] [--keep-going] [--keep-runs]")
    exitProcess(2)
}
fun q(value: String?) = if (value == null) "null" else "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\""
fun deleteTree(path: Path) {
    if (!Files.exists(path)) return
    Files.walk(path).use { stream -> stream.sorted(java.util.Comparator.reverseOrder()).forEach { Files.deleteIfExists(it) } }
}
fun runTimed(command: List<String>, timeoutSeconds: Long): TimedRun {
    val started = System.nanoTime()
    val process = ProcessBuilder(command).directory(root.toFile()).redirectErrorStream(true).start()
    val buffer = StringBuilder()
    val reader = Thread { process.inputStream.bufferedReader().useLines { lines -> lines.forEach(buffer::appendLine) } }.apply { isDaemon = true; start() }
    val finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS)
    if (!finished) {
        process.destroy()
        if (!process.waitFor(10, TimeUnit.SECONDS)) process.destroyForcibly()
    }
    reader.join(2_000)
    return TimedRun(if (finished) process.exitValue() else 124, buffer.toString(), !finished, (System.nanoTime() - started) / 1_000_000)
}
fun setPort(path: Path, port: Int) {
    val lines = if (path.exists()) Files.readAllLines(path).toMutableList() else mutableListOf()
    val index = lines.indexOfFirst { it.startsWith("server-port=") }
    if (index >= 0) lines[index] = "server-port=$port" else lines += "server-port=$port"
    Files.writeString(path, lines.joinToString("\n", postfix = "\n"))
}
fun runServer(runtime: Path, port: Int, timeoutSeconds: Long): TimedRun {
    setPort(runtime.resolve("server.properties"), port)
    val started = System.nanoTime()
    val process = ProcessBuilder("./run.sh", "nogui").directory(runtime.toFile()).redirectErrorStream(true).start()
    val buffer = StringBuilder()
    val reader = Thread { process.inputStream.bufferedReader().useLines { lines -> lines.forEach(buffer::appendLine) } }.apply { isDaemon = true; start() }
    val readyPattern = Regex("Done \\([0-9.]+s\\)!")
    val deadline = System.currentTimeMillis() + timeoutSeconds * 1000
    var ready = false
    while (System.currentTimeMillis() < deadline && process.isAlive) {
        if (readyPattern.containsMatchIn(buffer)) { ready = true; break }
        Thread.sleep(500)
    }
    if (ready && process.isAlive) {
        process.outputStream.bufferedWriter().use { it.appendLine("stop"); it.flush() }
        if (!process.waitFor(90, TimeUnit.SECONDS)) {
            process.destroy()
            if (!process.waitFor(10, TimeUnit.SECONDS)) process.destroyForcibly()
        }
    } else if (process.isAlive) {
        val dump = runCatching {
            val diagnostic = ProcessBuilder("jcmd", process.pid().toString(), "Thread.print").redirectErrorStream(true).start()
            val text = diagnostic.inputStream.bufferedReader().readText()
            diagnostic.waitFor(20, TimeUnit.SECONDS)
            text
        }.getOrElse { "thread dump capture failed: ${it.message}" }
        buffer.appendLine("\n=== TIMEOUT THREAD DUMP ===\n$dump")
        process.destroy()
        if (!process.waitFor(10, TimeUnit.SECONDS)) process.destroyForcibly()
    }
    reader.join(2_000)
    val timedOut = !ready && System.currentTimeMillis() >= deadline
    val exit = when {
        timedOut -> 124
        ready && process.exitValue() == 0 -> 0
        else -> process.exitValue()
    }
    return TimedRun(exit, buffer.toString(), timedOut, (System.nanoTime() - started) / 1_000_000)
}
fun latestText(dir: Path): String {
    val latest = dir.resolve("logs/latest.log")
    return if (latest.exists()) Files.readString(latest).takeLast(1_000_000) else ""
}
fun removeJars(runtime: Path, globs: List<Regex>): List<String> {
    val mods = runtime.resolve("mods")
    if (!mods.exists()) return emptyList()
    val removed = mutableListOf<String>()
    Files.list(mods).use { stream -> stream.filter(Files::isRegularFile).forEach { file ->
        if (globs.any { it.matches(file.fileName.toString()) }) {
            removed += file.fileName.toString()
            Files.delete(file)
        }
    } }
    return removed.sorted()
}
fun classify(text: String, timedOut: Boolean, ready: Boolean, physicsWarnings: Int): String? {
    if (timedOut && !ready && physicsWarnings > 0) return "vs_physics_startup_stall"
    val checks = listOf(
        "addon_removal_boot_failure" to Regex("Missing or unsupported mandatory dependencies|Mod Loading has failed|requires.*(?:valkyrienskies|eureka|clockwork|trackwork)", RegexOption.IGNORE_CASE),
        "partial_save_corruption" to Regex("Failed to load level|Exception reading.*level|corrupt|Missing registry data|Unknown registry key", RegexOption.IGNORE_CASE),
        "c2me_storage_stall" to Regex("C2ME Storage.*Chunk read.*too long|Chunk read.*took too long", RegexOption.IGNORE_CASE),
        "c2me_dh_threading_failure" to Regex("ThreadingDetector|CheckedThreadLocalRandom|PalettedContainer|Detected setBlock in a far chunk", RegexOption.IGNORE_CASE),
        "dependency_mixin_failure" to Regex("Mixin apply failed|NoClassDefFoundError|ClassNotFoundException|NoSuchMethodError|NoSuchFieldError", RegexOption.IGNORE_CASE),
        "eureka_init_failure" to Regex("(?:ERROR|FATAL|Exception).{0,200}(?:eureka|vs_eureka)|(?:eureka|vs_eureka).{0,200}(?:ERROR|FATAL|Exception)", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL)),
        "clockwork_init_failure" to Regex("(?:ERROR|FATAL|Exception).{0,200}(?:clockwork|vs_clockwork)|(?:clockwork|vs_clockwork).{0,200}(?:ERROR|FATAL|Exception)", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL)),
        "trackwork_init_failure" to Regex("(?:ERROR|FATAL|Exception).{0,200}trackwork|trackwork.{0,200}(?:ERROR|FATAL|Exception)", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL)),
        "vs_init_failure" to Regex("(?:ERROR|FATAL|Exception).{0,200}(?:valkyrienskies|org\\.valkyrienskies)|(?:valkyrienskies|org\\.valkyrienskies).{0,200}(?:ERROR|FATAL|Exception)", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL)),
        "suspected_ship_object_leak" to Regex("ship.*(?:leak|not unloaded)|orphan.*ship", RegexOption.IGNORE_CASE),
    )
    return checks.firstOrNull { it.second.containsMatchIn(text) }?.first
        ?: if (timedOut) "startup_timeout" else "unclassified_vs_matrix_failure"
}
fun cloneRuntime(source: Path, destination: Path): TimedRun {
    deleteTree(destination)
    destination.createDirectories()
    return runTimed(listOf("cp", "-a", "--reflink=auto", "${source}/.", destination.toString()), 300)
}

var profile = "quick"
var bootstrapMode = "always"
var keepGoing = false
var keepRuns = false
var cycles = 1
var requestedVariants: List<String>? = null
var runRoot = System.getenv("BC_HARNESS_RUN_ROOT")?.takeIf(String::isNotBlank)?.let(Paths::get) ?: Paths.get("/tmp/bc-vs-ships-matrix")
var port = System.getenv("BC_HARNESS_ACTUAL_PORT")?.takeIf(String::isNotBlank)?.toIntOrNull() ?: 25565
var timeoutSeconds = 240L
var index = 0
while (index < args.size) {
    when (args[index]) {
        "--profile" -> { profile = args.getOrNull(index + 1) ?: usage("--profile needs quick, release, or brutal"); index += 2 }
        "--variants" -> { requestedVariants = args.getOrNull(index + 1)?.split(',')?.filter(String::isNotBlank) ?: usage("--variants needs comma-separated names"); index += 2 }
        "--cycles" -> { cycles = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--cycles needs a number"); index += 2 }
        "--bootstrap-mode" -> { bootstrapMode = args.getOrNull(index + 1) ?: usage("--bootstrap-mode needs always, once, or never"); index += 2 }
        "--run-root" -> { runRoot = Paths.get(args.getOrNull(index + 1) ?: usage("--run-root needs a path")); index += 2 }
        "--port" -> { port = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--port needs a number"); index += 2 }
        "--timeout-seconds" -> { timeoutSeconds = args.getOrNull(index + 1)?.toLongOrNull() ?: usage("--timeout-seconds needs a number"); index += 2 }
        "--keep-going" -> { keepGoing = true; index++ }
        "--keep-runs" -> { keepRuns = true; index++ }
        "--help" -> usage()
        else -> usage("unknown argument: ${args[index]}")
    }
}
if (profile !in setOf("quick", "release", "brutal")) usage("invalid profile: $profile")
if (bootstrapMode !in setOf("always", "once", "never")) usage("invalid bootstrap mode: $bootstrapMode")
if (cycles < 1) usage("--cycles must be positive")
if (profile == "brutal" && cycles < 3) cycles = 3
val selectedNames = requestedVariants ?: when (profile) {
    "quick" -> listOf("current_config", "dh_disabled")
    else -> variants.map { it.name }
}
val unknownVariants = selectedNames.filterNot(variantsByName::containsKey)
if (unknownVariants.isNotEmpty()) usage("unknown variants: ${unknownVariants.joinToString()}")
val selectedVariants = selectedNames.map(variantsByName::getValue)

runRoot = runRoot.toAbsolutePath().normalize()
if (!keepRuns && bootstrapMode != "never") deleteTree(runRoot)
runRoot.createDirectories()
val results = mutableListOf<VariantResult>()
val commandsLog = StringBuilder("# vs_ships_matrix commands\n")
var nextPort = port
var preparationFailed = false

cycleLoop@ for (cycle in 1..cycles) {
    val base = runRoot.resolve("cycle-$cycle-base")
    val shouldPrepare = bootstrapMode == "always" || (bootstrapMode == "once" && !base.exists())
    if (shouldPrepare) {
        val command = listOf(root.resolve("tools/bc").toString(), "internal", "prepare-server-runtime", "--server-dir", base.toString(), "--port", nextPort.toString(), "--reset-runtime")
        commandsLog.appendLine(command.joinToString(" "))
        val prep = runTimed(command, 900)
        Files.writeString(runRoot.resolve("cycle-$cycle-prepare.log"), prep.output)
        if (prep.exitCode != 0) {
            preparationFailed = true
            System.err.println("cycle $cycle baseline preparation failed")
            break
        }
    } else if (!base.exists()) {
        preparationFailed = true
        System.err.println("cycle $cycle baseline missing for --bootstrap-mode never: $base")
        break
    }

    for (variant in selectedVariants) {
        val dir = runRoot.resolve("cycle-$cycle-${variant.name}")
        val evidence = runRoot.resolve("cycle-$cycle-${variant.name}-evidence").apply { createDirectories() }
        val clone = cloneRuntime(base, dir)
        if (clone.exitCode != 0) {
            results += VariantResult(cycle, variant.name, "failed", "runtime_clone_failure", dir.toString(), clone.exitCode, clone.durationMs, false, 0, emptyList())
            if (!keepGoing) break@cycleLoop else continue
        }
        val removed = removeJars(dir, variant.removeGlobs)
        Files.writeString(evidence.resolve("removed-mods.txt"), removed.joinToString("\n", postfix = "\n"))
        commandsLog.appendLine("(cd $dir && ./run.sh nogui) # port=$nextPort")
        val run = runServer(dir, nextPort, timeoutSeconds)
        val output = run.output + if (run.timedOut) "\nTIMED_OUT after ${timeoutSeconds}s\n" else ""
        Files.writeString(evidence.resolve("server-console.log"), output)
        val latest = latestText(dir)
        val fullText = output + "\n" + latest
        val ready = Regex("Done \\([0-9.]+s\\)!|Dedicated server took .* seconds to load", RegexOption.IGNORE_CASE).containsMatchIn(fullText)
        val physicsWarnings = Regex("Too many physics frames in the physics frame queue", RegexOption.IGNORE_CASE).findAll(output).count()
        val classifier = if (run.exitCode == 0) null else classify(fullText, run.timedOut, ready, physicsWarnings)
        val status = if (run.exitCode == 0) "passed" else "failed"
        val latestPath = dir.resolve("logs/latest.log")
        if (latestPath.exists()) Files.copy(latestPath, evidence.resolve("latest.log"), java.nio.file.StandardCopyOption.REPLACE_EXISTING)
        Files.writeString(evidence.resolve("metrics.json"), """{
  "cycle": $cycle,
  "variant": ${q(variant.name)},
  "status": ${q(status)},
  "classifier": ${q(classifier)},
  "duration_ms": ${run.durationMs},
  "ready": $ready,
  "physics_queue_warnings": $physicsWarnings,
  "exit_code": ${run.exitCode}
}
""")
        results += VariantResult(cycle, variant.name, status, classifier, dir.toString(), run.exitCode, run.durationMs, ready, physicsWarnings, removed)
        println("cycle $cycle ${variant.name}: $status classifier=${classifier ?: "none"} physics_queue_warnings=$physicsWarnings")
        if (status == "passed" && !keepRuns && profile != "brutal") deleteTree(dir)
        nextPort++
        if (status != "passed" && !keepGoing) break@cycleLoop
    }
}

if (!keepRuns && profile != "brutal") {
    for (cycle in 1..cycles) deleteTree(runRoot.resolve("cycle-$cycle-base"))
}

Files.writeString(runRoot.resolve("commands.log"), commandsLog.toString())
val finalStatus = if (!preparationFailed && results.size == cycles * selectedVariants.size && results.all { it.status == "passed" }) "passed" else "failed"
Files.writeString(runRoot.resolve("summary.txt"), buildString {
    appendLine("vs_ships_matrix $finalStatus at ${Instant.now()}")
    results.forEach { appendLine("cycle ${it.cycle} ${it.name}: ${it.status} classifier=${it.classifier ?: "none"} ready=${it.ready} physics_queue_warnings=${it.physicsQueueWarnings} dir=${it.dir}") }
})
Files.writeString(runRoot.resolve("summary.json"), buildString {
    appendLine("{")
    appendLine("  \"scenario\": \"vs_ships_matrix\",")
    appendLine("  \"status\": ${q(finalStatus)},")
    appendLine("  \"profile\": ${q(profile)},")
    appendLine("  \"requested_cycles\": $cycles,")
    appendLine("  \"variants\": [${selectedNames.joinToString(",") { q(it) }}],")
    appendLine("  \"results\": [")
    appendLine(results.joinToString(",\n") { r -> "    {\"cycle\":${r.cycle},\"variant\":${q(r.name)},\"status\":${q(r.status)},\"classifier\":${q(r.classifier)},\"duration_ms\":${r.durationMs},\"ready\":${r.ready},\"physics_queue_warnings\":${r.physicsQueueWarnings},\"exit_code\":${r.exitCode},\"removed\":[${r.removed.joinToString(",") { q(it) }}],\"dir\":${q(r.dir)}}" })
    appendLine("  ]")
    appendLine("}")
})
Files.writeString(runRoot.resolve("metrics.json"), """{
  "status": ${q(finalStatus)},
  "requested_runs": ${cycles * selectedVariants.size},
  "completed_runs": ${results.size},
  "passed_runs": ${results.count { it.status == "passed" }},
  "physics_queue_warnings": ${results.sumOf(VariantResult::physicsQueueWarnings)}
}
""")
val registryText = results.firstOrNull()?.let { result ->
    val source = Paths.get(result.dir).resolve("generated/runtime-dumps/registries.json")
    if (source.exists()) Files.readString(source) else ""
}.orEmpty()
val registryNamespaces = listOf("valkyrienskies", "vs_eureka", "vs_clockwork", "trackwork")
Files.writeString(runRoot.resolve("registry-snapshot.json"), """{
  "namespaces": [${registryNamespaces.joinToString(",") { q(it) }}],
  "unknown_gaps": [${registryNamespaces.filterNot { registryText.contains("$it:") }.joinToString(",") { q(it) }}]
}
""")
exitProcess(if (finalStatus == "passed") 0 else 1)

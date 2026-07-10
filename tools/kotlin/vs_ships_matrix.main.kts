#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.time.Instant
import java.util.concurrent.TimeUnit
import kotlin.io.path.createDirectories
import kotlin.io.path.exists
import kotlin.system.exitProcess

data class Variant(val name: String, val removeGlobs: List<Regex>, val expectedClassifier: String? = null)
data class VariantResult(val name: String, val status: String, val classifier: String?, val dir: String, val exitCode: Int)
data class TimedRun(val exitCode: Int, val output: String, val timedOut: Boolean)

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

fun usage(message: String? = null): Nothing {
    if (message != null) System.err.println(message)
    System.err.println("Usage: tools/btm test scenario vs_ships_matrix --profile quick|release|brutal [--port N] [--bootstrap-mode always|once|never] [--run-root PATH] [--timeout-seconds N] [--keep-going] [--keep-runs]")
    exitProcess(2)
}
fun q(value: String?) = if (value == null) "null" else "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\""
fun deleteTree(path: Path) {
    if (!Files.exists(path)) return
    Files.walk(path).use { stream -> stream.sorted(java.util.Comparator.reverseOrder()).forEach { Files.deleteIfExists(it) } }
}
fun classify(text: String): String? {
    val checks = listOf(
        "addon_removal_boot_failure" to Regex("Missing or unsupported mandatory dependencies|Mod Loading has failed|requires.*valkyrienskies|requires.*eureka|requires.*clockwork|requires.*trackwork", RegexOption.IGNORE_CASE),
        "partial_save_corruption" to Regex("Failed to load level|Exception reading.*level|corrupt|Missing registry data|Unknown registry key", RegexOption.IGNORE_CASE),
        "vs_physics_startup_stall" to Regex("Too many physics frames in the physics frame queue|VSPhysicsPipelineStage|Physics pipeline|Physics thread.*valkyrienskies", RegexOption.IGNORE_CASE),
        "c2me_storage_stall" to Regex("C2ME Storage.*Chunk read.*too long|Chunk read.*took too long", RegexOption.IGNORE_CASE),
        "c2me_dh_threading_failure" to Regex("C2ME|DistantHorizons|ThreadingDetector|CheckedThreadLocalRandom|PalettedContainer", RegexOption.IGNORE_CASE),
        "dependency_mixin_failure" to Regex("Mixin apply failed|NoClassDefFoundError|ClassNotFoundException|NoSuchMethodError|NoSuchFieldError", RegexOption.IGNORE_CASE),
    )
    val hard = Regex("Encountered an unexpected exception|Mod Loading has failed|Failed to start the minecraft server|Preparing crash report|This crash report has been saved|ERROR|FATAL|Too many physics frames|Chunk read.*too long", RegexOption.IGNORE_CASE)
    if (!hard.containsMatchIn(text)) return null
    return checks.firstOrNull { it.second.containsMatchIn(text) }?.first ?: "unclassified_vs_matrix_failure"
}
fun runTimed(command: List<String>, timeoutSeconds: Long): TimedRun {
    val process = ProcessBuilder(command).directory(root.toFile()).redirectErrorStream(true).start()
    val buffer = StringBuilder()
    val reader = Thread {
        process.inputStream.bufferedReader().useLines { lines ->
            lines.forEach { line -> buffer.appendLine(line) }
        }
    }
    reader.isDaemon = true
    reader.start()
    val finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS)
    if (!finished) {
        process.destroy()
        if (!process.waitFor(10, TimeUnit.SECONDS)) process.destroyForcibly()
        reader.join(1000)
        return TimedRun(124, buffer.toString(), true)
    }
    reader.join(1000)
    return TimedRun(process.exitValue(), buffer.toString(), false)
}
fun latestText(dir: Path): String {
    val latest = dir.resolve("logs/latest.log")
    return if (latest.exists()) Files.readString(latest).takeLast(512_000) else ""
}
fun removeJars(runtime: Path, globs: List<Regex>): List<String> {
    val mods = runtime.resolve("mods")
    if (!mods.exists()) return emptyList()
    val removed = mutableListOf<String>()
    Files.list(mods).use { stream ->
        stream.filter { Files.isRegularFile(it) }.forEach { file ->
            val name = file.fileName.toString()
            if (globs.any { it.matches(name) }) {
                Files.deleteIfExists(file)
                removed += name
            }
        }
    }
    return removed
}

var profile = "quick"
var bootstrapMode = "always"
var keepGoing = false
var keepRuns = false
var runRoot = System.getenv("BTM_HARNESS_RUN_ROOT")?.takeIf { it.isNotBlank() }?.let { Paths.get(it) } ?: Paths.get("/tmp/btm-vs-ships-matrix")
var port = System.getenv("BTM_HARNESS_ACTUAL_PORT")?.takeIf { it.isNotBlank() } ?: "25565"
var smokeTimeoutSeconds = 240L
var index = 0
while (index < args.size) {
    when (args[index]) {
        "--profile" -> { profile = args.getOrNull(index + 1) ?: usage("--profile needs quick, release, or brutal"); index += 2 }
        "--bootstrap-mode" -> {
            bootstrapMode = args.getOrNull(index + 1) ?: usage("--bootstrap-mode needs always, once, or never")
            if (bootstrapMode !in setOf("always", "once", "never")) usage("invalid bootstrap mode: $bootstrapMode")
            index += 2
        }
        "--run-root" -> { runRoot = Paths.get(args.getOrNull(index + 1) ?: usage("--run-root needs a path")); index += 2 }
        "--port" -> { port = args.getOrNull(index + 1) ?: usage("--port needs a number"); if (!port.all(Char::isDigit)) usage("--port needs a number"); index += 2 }
        "--timeout-seconds" -> { smokeTimeoutSeconds = args.getOrNull(index + 1)?.toLongOrNull() ?: usage("--timeout-seconds needs a number"); index += 2 }
        "--keep-going" -> { keepGoing = true; index += 1 }
        "--keep-runs" -> { keepRuns = true; index += 1 }
        "--help" -> usage()
        else -> usage("unknown argument: ${args[index]}")
    }
}
if (profile !in setOf("quick", "release", "brutal")) usage("invalid profile: $profile")
runRoot = runRoot.toAbsolutePath().normalize()
runRoot.createDirectories()

val selectedVariants = when (profile) {
    "quick" -> variants
    "release", "brutal" -> variants
    else -> variants
}
val results = mutableListOf<VariantResult>()
val commandsLog = StringBuilder("# vs_ships_matrix commands\n")
var portNumber = port.toInt()

for (variant in selectedVariants) {
    val dir = runRoot.resolve(variant.name)
    val evidence = runRoot.resolve("${variant.name}-evidence")
    evidence.createDirectories()
    if (!keepRuns && bootstrapMode != "never" && dir.exists()) deleteTree(dir)
    var prepExit = 0
    var prepOutput = ""
    if (bootstrapMode != "never") {
        val prepMode = if (bootstrapMode == "once") "always" else bootstrapMode
        val prepSmoke = mutableListOf(
            root.resolve("tools/btm").toString(),
            "test", "smoke",
            "--server-dir", dir.toString(),
            "--port", portNumber.toString(),
            "--bootstrap-mode", prepMode,
        )
        if (prepMode != "never" && !(keepRuns && dir.exists())) prepSmoke += "--reset-runtime"
        commandsLog.appendLine(prepSmoke.joinToString(" "))
        val prepRun = runTimed(prepSmoke, smokeTimeoutSeconds)
        prepOutput = prepRun.output + if (prepRun.timedOut) "\nTIMED_OUT after ${smokeTimeoutSeconds}s\n" else ""
        prepExit = prepRun.exitCode
        Files.writeString(evidence.resolve("prepare-smoke.log"), prepOutput)
    }
    val removed = removeJars(dir, variant.removeGlobs)
    Files.writeString(evidence.resolve("removed-mods.txt"), removed.joinToString("\n", postfix = "\n"))
    if (prepExit != 0) {
        val classifier = classify(prepOutput + "\n" + latestText(dir))
        val status = if (classifier != null && classifier != "unclassified_vs_matrix_failure") "classified_failure" else "failed"
        results += VariantResult(variant.name, status, classifier, dir.toString(), prepExit)
        println("${variant.name}: $status classifier=${classifier ?: "none"}")
        portNumber += 1
        if (!keepGoing) break
        continue
    }
    if (removed.isEmpty() && bootstrapMode != "never") {
        results += VariantResult(variant.name, "passed", null, dir.toString(), 0)
        println("${variant.name}: passed classifier=none")
        portNumber += 1
        continue
    }
    val smoke = listOf(root.resolve("tools/btm").toString(), "test", "smoke", "--server-dir", dir.toString(), "--port", portNumber.toString(), "--bootstrap-mode", "never")
    commandsLog.appendLine(smoke.joinToString(" "))
    val run = runTimed(smoke, smokeTimeoutSeconds)
    val output = run.output + if (run.timedOut) "\nTIMED_OUT after ${smokeTimeoutSeconds}s\n" else ""
    val exit = run.exitCode
    Files.writeString(evidence.resolve("server-console.log"), output)
    val latest = dir.resolve("logs/latest.log")
    val text = output + "\n" + latestText(dir)
    if (latest.exists()) Files.copy(latest, evidence.resolve("latest.log"), java.nio.file.StandardCopyOption.REPLACE_EXISTING)
    val classifier = if (exit == 0) null else classify(text)
    val status = when {
        exit == 0 -> "passed"
        classifier != null && classifier != "unclassified_vs_matrix_failure" -> "classified_failure"
        else -> "failed"
    }
    results += VariantResult(variant.name, status, classifier, dir.toString(), exit)
    println("${variant.name}: $status classifier=${classifier ?: "none"}")
    portNumber += 1
    if (status != "passed" && !keepGoing) break
}

Files.writeString(runRoot.resolve("commands.log"), commandsLog.toString())
val finalStatus = when {
    results.all { it.status == "passed" } -> "passed"
    results.all { it.status in setOf("passed", "classified_failure") } -> "classified_failure"
    else -> "failed"
}
Files.writeString(runRoot.resolve("summary.txt"), "vs_ships_matrix $finalStatus at ${Instant.now()}\n${results.joinToString("\n") { "${it.name}: ${it.status} classifier=${it.classifier ?: "none"} dir=${it.dir}" }}\n")
Files.writeString(runRoot.resolve("summary.json"), buildString {
    appendLine("{")
    appendLine("  \"scenario\": \"vs_ships_matrix\",")
    appendLine("  \"status\": ${q(finalStatus)},")
    appendLine("  \"profile\": ${q(profile)},")
    appendLine("  \"variants\": [")
    appendLine(results.joinToString(",\n") { "    {\"name\": ${q(it.name)}, \"status\": ${q(it.status)}, \"classifier\": ${q(it.classifier)}, \"dir\": ${q(it.dir)}, \"exit_code\": ${it.exitCode}}" })
    appendLine("  ]")
    appendLine("}")
})
exitProcess(if (finalStatus == "failed") 1 else 0)

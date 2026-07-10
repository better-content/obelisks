#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.time.Instant
import kotlin.io.path.createDirectories
import kotlin.io.path.exists
import kotlin.system.exitProcess

data class Classifier(val key: String, val pattern: Regex)
data class CycleResult(val cycle: Int, val status: String, val classifier: String?, val serverDir: String, val exitCode: Int)

val root: Path = Paths.get("").toAbsolutePath().normalize()
val classifiers = listOf(
    Classifier("dependency_mixin_failure", Regex("Missing or unsupported mandatory dependencies|Mixin apply failed|MixinTransformerError|NoClassDefFoundError|ClassNotFoundException|NoSuchMethodError|NoSuchFieldError", RegexOption.IGNORE_CASE)),
    Classifier("vs_init_failure", Regex("valkyrienskies|org\\.valkyrienskies|VS2|Valkyrien", RegexOption.IGNORE_CASE)),
    Classifier("eureka_init_failure", Regex("eureka", RegexOption.IGNORE_CASE)),
    Classifier("clockwork_init_failure", Regex("clockwork|vs_clockwork", RegexOption.IGNORE_CASE)),
    Classifier("trackwork_init_failure", Regex("trackwork", RegexOption.IGNORE_CASE)),
    Classifier("ship_assembly_failure", Regex("assemble|shipyard|ship assembly|create ship|contraption.*ship", RegexOption.IGNORE_CASE)),
    Classifier("ship_movement_collision_failure", Regex("collision|teleporting ship|physics tick|rigid body|ship movement", RegexOption.IGNORE_CASE)),
    Classifier("ship_save_reload_failure", Regex("failed to save ship|failed to load ship|ShipData|ship object|dimension shipyard", RegexOption.IGNORE_CASE)),
    Classifier("dimension_conflict", Regex("dimension|level stem|worldgen|forceload|chunk ticket", RegexOption.IGNORE_CASE)),
    Classifier("c2me_dh_threading_failure", Regex("C2ME|DistantHorizons|ThreadingDetector|CheckedThreadLocalRandom|PalettedContainer|far chunk|DH", RegexOption.IGNORE_CASE)),
    Classifier("suspected_ship_object_leak", Regex("ship.*leak|orphan.*ship|ship.*not unloaded|Object2Object|Long2Object|memory leak", RegexOption.IGNORE_CASE)),
    Classifier("crash_report", Regex("Preparing crash report|This crash report has been saved|Crash Report", RegexOption.IGNORE_CASE)),
)

fun usage(message: String? = null): Nothing {
    if (message != null) System.err.println(message)
    System.err.println("Usage: tools/btm test scenario vs_ships_stability --profile quick|release|brutal [--cycles N] [--port N] [--bootstrap-mode always|once|never] [--run-root PATH] [--keep-runs]")
    exitProcess(2)
}

fun deleteTree(path: Path) {
    if (!Files.exists(path)) return
    Files.walk(path).use { stream ->
        stream.sorted(java.util.Comparator.reverseOrder()).forEach { Files.deleteIfExists(it) }
    }
}

fun jsonEscape(value: String): String = value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n")
fun writeJson(path: Path, pairs: List<Pair<String, String>>) {
    Files.writeString(path, pairs.joinToString(prefix = "{\n", postfix = "\n}\n", separator = ",\n") { (k, v) -> "  \"${jsonEscape(k)}\": $v" })
}
fun q(value: String?) = if (value == null) "null" else "\"${jsonEscape(value)}\""

fun collectText(dir: Path): String {
    val files = listOf(
        dir.resolve("server-console.log"),
        dir.resolve("logs/latest.log"),
    ) + listOf(dir.resolve("crash-reports")).filter { it.exists() }.flatMap { crashDir ->
        Files.list(crashDir).use { stream -> stream.filter { Files.isRegularFile(it) }.toList() }
    }
    return files.filter { it.exists() }.joinToString("\n") { Files.readString(it).takeLast(512_000) }
}

fun classify(text: String): String? {
    val hard = Regex("Encountered an unexpected exception|Mod Loading has failed|Failed to start the minecraft server|Preparing crash report|This crash report has been saved|ERROR|FATAL", RegexOption.IGNORE_CASE)
    if (!hard.containsMatchIn(text)) return null
    return classifiers.firstOrNull { it.pattern.containsMatchIn(text) }?.key ?: "unclassified_vs_ships_failure"
}

fun snapshotRegistries(serverDir: Path, out: Path) {
    val registries = serverDir.resolve("generated/runtime-dumps/registries.json")
    val text = if (registries.exists()) Files.readString(registries) else ""
    val ids = listOf("valkyrienskies", "vs_eureka", "eureka", "vs_clockwork", "trackwork").associateWith { namespace ->
        Regex(""""$namespace:[^"]+"""").findAll(text).map { it.value.trim('"') }.take(40).toList()
    }
    val unknown = ids.filterValues { it.isEmpty() }.keys.toList()
    Files.writeString(out, buildString {
        appendLine("{")
        appendLine("  \"source\": ${q(registries.toString())},")
        appendLine("  \"unknown_gaps\": [${unknown.joinToString(",") { q(it) }}],")
        appendLine("  \"ids\": {")
        appendLine(ids.entries.joinToString(",\n") { (key, values) ->
            "    ${q(key)}: [${values.joinToString(",") { q(it) }}]"
        })
        appendLine("  }")
        appendLine("}")
    })
}

var profile = "quick"
var cycles = 1
var bootstrapMode = "always"
var keepRuns = false
var runRoot = System.getenv("BTM_HARNESS_RUN_ROOT")?.takeIf { it.isNotBlank() }?.let { Paths.get(it) } ?: Paths.get("/tmp/btm-vs-ships-stability")
var port = System.getenv("BTM_HARNESS_ACTUAL_PORT")?.takeIf { it.isNotBlank() } ?: "25565"

var index = 0
while (index < args.size) {
    when (args[index]) {
        "--profile" -> { profile = args.getOrNull(index + 1) ?: usage("--profile needs quick, release, or brutal"); index += 2 }
        "--cycles" -> { cycles = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--cycles needs a number"); index += 2 }
        "--bootstrap-mode" -> {
            bootstrapMode = args.getOrNull(index + 1) ?: usage("--bootstrap-mode needs always, once, or never")
            if (bootstrapMode !in setOf("always", "once", "never")) usage("invalid bootstrap mode: $bootstrapMode")
            index += 2
        }
        "--run-root" -> { runRoot = Paths.get(args.getOrNull(index + 1) ?: usage("--run-root needs a path")); index += 2 }
        "--port" -> { port = args.getOrNull(index + 1) ?: usage("--port needs a number"); if (!port.all(Char::isDigit)) usage("--port needs a number"); index += 2 }
        "--keep-runs" -> { keepRuns = true; index += 1 }
        "--help" -> usage()
        else -> usage("unknown argument: ${args[index]}")
    }
}
if (profile !in setOf("quick", "release", "brutal")) usage("invalid profile: $profile")
if (profile == "brutal" && cycles < 3) cycles = 3
runRoot = runRoot.toAbsolutePath().normalize()
runRoot.createDirectories()

val results = mutableListOf<CycleResult>()
val commandsLog = StringBuilder()
commandsLog.appendLine("# vs_ships_stability commands")
commandsLog.appendLine("# intended probes: registry discovery, minimal placement if runtime commands expose VS ids, save/reload, removal/unload, dimension matrix, C2ME/DH pressure")

for (cycle in 1..cycles) {
    val serverDir = runRoot.resolve("cycle-$cycle")
    val evidenceDir = runRoot.resolve("evidence-cycle-$cycle")
    evidenceDir.createDirectories()
    if (!keepRuns && bootstrapMode != "never" && serverDir.exists()) deleteTree(serverDir)
    val command = mutableListOf(
        root.resolve("tools/btm").toString(),
        "test", "smoke",
        "--server-dir", serverDir.toString(),
        "--port", port,
        "--bootstrap-mode", if (bootstrapMode == "once" && cycle > 1) "never" else bootstrapMode,
    )
    if (bootstrapMode != "never" && !(keepRuns && serverDir.exists())) command += "--reset-runtime"
    commandsLog.appendLine(command.joinToString(" "))
    val process = ProcessBuilder(command).directory(root.toFile()).redirectErrorStream(true).start()
    val output = process.inputStream.bufferedReader().readText()
    val exit = process.waitFor()
    Files.writeString(evidenceDir.resolve("server-console.log"), output)
    if (serverDir.resolve("logs/latest.log").exists()) Files.copy(serverDir.resolve("logs/latest.log"), evidenceDir.resolve("latest.log"), java.nio.file.StandardCopyOption.REPLACE_EXISTING)
    snapshotRegistries(serverDir, evidenceDir.resolve("registry-snapshot.json"))
    val classifier = if (exit == 0) null else classify(output + "\n" + collectText(serverDir))
    val status = when {
        exit == 0 -> "passed"
        classifier != null && classifier != "unclassified_vs_ships_failure" -> "classified_failure"
        else -> "failed"
    }
    Files.writeString(evidenceDir.resolve("metrics.json"), "{\n  \"cycle\": $cycle,\n  \"exit_code\": $exit,\n  \"profile\": ${q(profile)},\n  \"classifier\": ${q(classifier)}\n}\n")
    results += CycleResult(cycle, status, classifier, serverDir.toString(), exit)
    println("cycle $cycle: $status classifier=${classifier ?: "none"}")
}

Files.writeString(runRoot.resolve("commands.log"), commandsLog.toString())
val finalStatus = when {
    results.all { it.status == "passed" } -> "passed"
    results.all { it.status in setOf("passed", "classified_failure") } -> "classified_failure"
    else -> "failed"
}
Files.writeString(runRoot.resolve("summary.txt"), "vs_ships_stability $finalStatus at ${Instant.now()}\n${results.joinToString("\n") { "cycle ${it.cycle}: ${it.status} classifier=${it.classifier ?: "none"} server=${it.serverDir}" }}\n")
Files.writeString(runRoot.resolve("summary.json"), buildString {
    appendLine("{")
    appendLine("  \"scenario\": \"vs_ships_stability\",")
    appendLine("  \"status\": ${q(finalStatus)},")
    appendLine("  \"profile\": ${q(profile)},")
    appendLine("  \"cycles\": [")
    appendLine(results.joinToString(",\n") { "    {\"cycle\": ${it.cycle}, \"status\": ${q(it.status)}, \"classifier\": ${q(it.classifier)}, \"server_dir\": ${q(it.serverDir)}, \"exit_code\": ${it.exitCode}}" })
    appendLine("  ]")
    appendLine("}")
})

exitProcess(if (finalStatus == "failed") 1 else 0)

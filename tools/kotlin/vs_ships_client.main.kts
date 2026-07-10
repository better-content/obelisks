#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Paths
import java.time.Instant
import kotlin.io.path.createDirectories
import kotlin.system.exitProcess

fun usage(message: String? = null): Nothing {
    if (message != null) System.err.println(message)
    System.err.println("Usage: tools/btm test scenario-headful vs_ships_client --profile quick|release [--bootstrap-mode always|once|never] [--port N] [--run-root PATH] [--keep-runs]")
    exitProcess(2)
}
fun q(value: String?) = if (value == null) "null" else "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\""
fun classify(text: String): String? {
    val checks = listOf(
        "client_render_failure" to Regex("ModelBakery|BlockRenderDispatcher|rendering block entity|Tesselating block|Renderer|RenderSystem|OpenGL", RegexOption.IGNORE_CASE),
        "flywheel_visual_failure" to Regex("Flywheel|Create.*visual|Instancing|material manager", RegexOption.IGNORE_CASE),
        "mount_camera_failure" to Regex("mount|dismount|passenger|camera|PoseStack|vehicle", RegexOption.IGNORE_CASE),
        "passenger_sync_failure" to Regex("passenger sync|entity tracking|desync|moved wrongly|moved too quickly", RegexOption.IGNORE_CASE),
        "dependency_mixin_failure" to Regex("Mixin apply failed|NoClassDefFoundError|ClassNotFoundException|NoSuchMethodError|NoSuchFieldError", RegexOption.IGNORE_CASE),
    )
    val hard = Regex("Encountered an unexpected exception|Mod Loading has failed|Preparing crash report|This crash report has been saved|ERROR|FATAL", RegexOption.IGNORE_CASE)
    if (!hard.containsMatchIn(text)) return null
    return checks.firstOrNull { it.second.containsMatchIn(text) }?.first ?: "unclassified_vs_client_failure"
}

val root = Paths.get("").toAbsolutePath().normalize()
var profile = "quick"
var bootstrapMode = "always"
var keepRuns = false
var runRoot = System.getenv("BTM_HARNESS_RUN_ROOT")?.takeIf { it.isNotBlank() }?.let { Paths.get(it) } ?: Paths.get("/tmp/btm-vs-ships-client-quick")
var port = System.getenv("BTM_HARNESS_ACTUAL_PORT")?.takeIf { it.isNotBlank() }
var index = 0
while (index < args.size) {
    when (args[index]) {
        "--profile" -> { profile = args.getOrNull(index + 1) ?: usage("--profile needs quick or release"); index += 2 }
        "--bootstrap-mode" -> {
            bootstrapMode = args.getOrNull(index + 1) ?: usage("--bootstrap-mode needs always, once, or never")
            if (bootstrapMode !in setOf("always", "once", "never")) usage("invalid bootstrap mode: $bootstrapMode")
            index += 2
        }
        "--run-root" -> { runRoot = Paths.get(args.getOrNull(index + 1) ?: usage("--run-root needs a path")); index += 2 }
        "--port" -> { port = args.getOrNull(index + 1) ?: usage("--port needs a number"); if (!port!!.all(Char::isDigit)) usage("--port needs a number"); index += 2 }
        "--keep-runs" -> { keepRuns = true; index += 1 }
        "--help" -> usage()
        else -> usage("unknown argument: ${args[index]}")
    }
}
if (profile !in setOf("quick", "release")) usage("invalid profile: $profile")
runRoot = runRoot.toAbsolutePath().normalize()
runRoot.createDirectories()

val command = mutableListOf(root.resolve("tools/btm").toString(), "test", "scenario-headful", "client_smoke", "--profile", profile, "--bootstrap-mode", bootstrapMode)
if (port != null) command += listOf("--port", port!!)
if (keepRuns) command += "--keep-runs"
Files.writeString(runRoot.resolve("commands.log"), buildString {
    appendLine("# vs_ships_client commands")
    appendLine("# intended probes: resource/model bake, Create/Flywheel visuals, component rendering, mount/dismount, reconnect, passenger observer sync")
    appendLine(command.joinToString(" "))
})
val process = ProcessBuilder(command).directory(root.toFile()).redirectErrorStream(true).start()
val output = process.inputStream.bufferedReader().readText()
val exit = process.waitFor()
Files.writeString(runRoot.resolve("client-console.log"), output)
val classifier = if (exit == 0) null else classify(output)
val status = when {
    exit == 0 -> "passed"
    classifier != null && classifier != "unclassified_vs_client_failure" -> "classified_failure"
    else -> "failed"
}
Files.writeString(runRoot.resolve("summary.txt"), "vs_ships_client $status at ${Instant.now()} classifier=${classifier ?: "none"}\n")
Files.writeString(runRoot.resolve("summary.json"), "{\n  \"scenario\": \"vs_ships_client\",\n  \"status\": ${q(status)},\n  \"profile\": ${q(profile)},\n  \"classifier\": ${q(classifier)},\n  \"exit_code\": $exit\n}\n")
println("vs_ships_client: $status classifier=${classifier ?: "none"}")
exitProcess(if (status == "failed") 1 else 0)

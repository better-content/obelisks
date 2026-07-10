#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import kotlin.io.path.isRegularFile

val root: Path = Paths.get("").toAbsolutePath().normalize()
val failures = mutableListOf<String>()
val passes = mutableListOf<String>()

fun rel(path: String): Path = root.resolve(path)
fun read(path: String): String = Files.readString(rel(path))
fun ok(name: String, detail: String = "") {
    passes += name
    println("ok - $name${if (detail.isNotBlank()) " ($detail)" else ""}")
}
fun fail(name: String, detail: String) {
    failures += "$name: $detail"
    System.err.println("FAIL - $name: $detail")
}

fun parseToml(path: String): Map<String, String> {
    val values = linkedMapOf<String, String>()
    var section = ""
    for ((lineNumber, rawLine) in read(path).lineSequence().withIndex()) {
        val line = rawLine.substringBefore("#").trim()
        if (line.isBlank()) continue
        val sectionMatch = Regex("""^\[+([^\]]+)]\s*$""").matchEntire(line)
        if (sectionMatch != null) {
            section = sectionMatch.groupValues[1]
            continue
        }
        val kv = Regex("""^("[^"]+"|[A-Za-z0-9_.-]+)\s*=\s*(.+)$""").matchEntire(line)
            ?: throw IllegalArgumentException("$path:${lineNumber + 1}: unsupported TOML line: $line")
        val key = kv.groupValues[1].trim('"')
        val value = kv.groupValues[2].trim().trim('"')
        values[if (section.isBlank()) key else "$section.$key"] = value
    }
    return values
}

data class RequiredManifest(
    val label: String,
    val path: String,
    val filename: String,
    val projectId: String,
    val fileId: String,
)

val manifests = listOf(
    RequiredManifest("Valkyrien Skies", "mods/valkyrien-skies.pw.toml", "valkyrienskies-120-2.4.11.jar", "258371", "7906689"),
    RequiredManifest("Eureka", "mods/eureka-ships.pw.toml", "eureka-1201-1.6.3.jar", "654384", "7979379"),
    RequiredManifest("VS: Clockwork", "mods/create-clockwork.pw.toml", "clockwork-0.5.6.jar", "807792", "8017005"),
    RequiredManifest("Trackwork", "mods/trackwork.pw.toml", "trackwork-1.20.1-1.2.4.jar", "1057662", "7760330"),
)

for (manifest in manifests) {
    if (!rel(manifest.path).isRegularFile()) {
        fail("${manifest.label} manifest is present", "missing ${manifest.path}")
        continue
    }
    val values = try {
        parseToml(manifest.path)
    } catch (error: Exception) {
        fail("${manifest.label} manifest parses", error.message ?: "parse failed")
        continue
    }
    val problems = mutableListOf<String>()
    if (values["filename"] != manifest.filename) problems += "filename=${values["filename"]}"
    if (values["side"] != "both") problems += "side=${values["side"]}"
    if (values["download.mode"] != "metadata:curseforge") problems += "download.mode=${values["download.mode"]}"
    if (values["update.curseforge.project-id"] != manifest.projectId) problems += "project-id=${values["update.curseforge.project-id"]}"
    if (values["update.curseforge.file-id"] != manifest.fileId) problems += "file-id=${values["update.curseforge.file-id"]}"
    if (problems.isEmpty()) ok("${manifest.label} manifest is pinned", manifest.filename)
    else fail("${manifest.label} manifest is pinned", problems.joinToString(", "))
}

val btmText = read("tools/btm.main.kts")
for (scenario in listOf("vs_ships_stability", "vs_ships_matrix", "vs_ships_client")) {
    if (""""$scenario" to ScenarioDefinition(""" in btmText) ok("$scenario is registered")
    else fail("$scenario is registered", "missing ScenarioDefinition")
}

val scriptChecks = mapOf(
    "tools/kotlin/vs_ships_stability.main.kts" to listOf(
        "dependency_mixin_failure",
        "vs_init_failure",
        "eureka_init_failure",
        "clockwork_init_failure",
        "trackwork_init_failure",
        "ship_assembly_failure",
        "ship_movement_collision_failure",
        "ship_save_reload_failure",
        "dimension_conflict",
        "c2me_dh_threading_failure",
        "suspected_ship_object_leak",
    ),
    "tools/kotlin/vs_ships_matrix.main.kts" to listOf(
        "current_config",
        "dh_disabled",
        "c2me_disabled",
        "dh_c2me_disabled",
        "vs_core_only",
        "vs_eureka",
        "vs_clockwork",
        "vs_trackwork",
        "full_vs_family",
        "full_vs_family_current_dh_c2me",
        "addon_removal_boot_failure",
        "partial_save_corruption",
    ),
    "tools/kotlin/vs_ships_client.main.kts" to listOf(
        "client_render_failure",
        "flywheel_visual_failure",
        "mount_camera_failure",
        "passenger_sync_failure",
    ),
)
for ((path, needles) in scriptChecks) {
    if (!rel(path).isRegularFile()) {
        fail("$path exists", "missing")
        continue
    }
    val text = read(path)
    val missing = needles.filterNot(text::contains)
    if (missing.isEmpty()) ok("$path keeps required VS classifiers/contracts", "${needles.size} checks")
    else fail("$path keeps required VS classifiers/contracts", missing.joinToString(", "))
}

val docs = mapOf(
    "AGENTS.md" to listOf("vs_ships_stability", "vs_ships_matrix", "vs_ships_client"),
    "docs/runtime_validation.md" to listOf(
        "tools/btm test scenario vs_ships_stability --profile quick --cycles 1 --bootstrap-mode once",
        "tools/btm test scenario vs_ships_matrix --profile quick --bootstrap-mode once",
        "tools/btm test scenario-headful vs_ships_client --profile quick --bootstrap-mode once",
    ),
    "docs/performance_and_mods.md" to listOf("Valkyrien Skies", "Eureka", "Clockwork", "Trackwork", "vs_ships_stability"),
)
for ((path, needles) in docs) {
    val text = read(path)
    val missing = needles.filterNot(text::contains)
    if (missing.isEmpty()) ok("$path documents VS ship diagnostics")
    else fail("$path documents VS ship diagnostics", missing.joinToString(", "))
}

println()
println("VS ships contract validators: ${passes.size} pass(es), ${failures.size} hard failure(s)")
if (failures.isNotEmpty()) System.err.println(failures.joinToString("\n"))
System.exit(if (failures.isEmpty()) 0 else 1)

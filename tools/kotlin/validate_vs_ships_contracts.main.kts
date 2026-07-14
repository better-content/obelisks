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

for (path in listOf("mods/shoulder-surfing-reloaded.pw.toml", "config/shouldersurfing-client.toml")) {
    if (!rel(path).isRegularFile()) ok("deferred or incompatible pack surface is absent", path)
    else fail("deferred or incompatible pack surface is absent", path)
}

val clientContractPath = rel("tools/vs_ships_client_contract.properties")
if (!clientContractPath.isRegularFile()) {
    fail("VS client source contract is present", clientContractPath.toString())
} else {
    val properties = java.util.Properties().apply { Files.newBufferedReader(clientContractPath).use(::load) }
    val expected = mapOf(
        "schema" to "bc.vs_ships_client_contract.v1",
        "eureka.sourceCommit" to "07cf4181d72590731d140d603bda5c9de23c5ae7",
        "vs.sourceCommit" to "9a09dd2609d482948f261a02c8103c1ba44ba5c1",
        "display.width" to "1280",
        "display.height" to "720",
        "display.guiScale" to "3",
        "helm.assemble.x" to "10",
        "helm.assemble.y" to "73",
        "helm.assemble.width" to "156",
        "helm.assemble.height" to "23",
        "fixture.expectedBlocks" to "5",
        "fixture.maximumBfsBlocks" to "8",
        "assembly.syncWaitSeconds" to "4",
        "screenshots" to "pilot-joined.png,core-fixture.png,helm-gui.png,helm-button-hovered.png,helm-button-pressed.png,ship-assembled.png,ship-after-reconnect-probe.png,ship-after-teleport-probe.png,pilot-reconnected.png,pilot-after-server-restart.png",
    )
    val wrong = expected.filter { (key, value) -> properties.getProperty(key) != value }
    if (wrong.isEmpty()) ok("VS client source contract is pinned", "${expected.size} fields")
    else fail("VS client source contract is pinned", wrong.keys.joinToString())
}

val bcText = read("tools/bc.main.kts")
for (scenario in listOf("vs_ships_stability", "vs_ships_matrix", "vs_ships_client", "vs_ships_release")) {
    if (""""$scenario" to ScenarioDefinition(""" in bcText) ok("$scenario is registered")
    else fail("$scenario is registered", "missing ScenarioDefinition")
}
for (internalCommand in listOf("prepare-server-runtime", "prepare-client-runtime", "minecraft-client-argfile")) {
    if (bcText.contains("\"$internalCommand\" ->")) ok("$internalCommand internal hook is registered")
    else fail("$internalCommand internal hook is registered", "missing internal command")
}

val scriptChecks = mapOf(
    "tools/kotlin/vs_ships_stability.main.kts" to listOf(
        "registry_contract_failure",
        "component_fixture_failure",
        "ship_save_reload_failure",
        "dimension_conflict",
        "c2me_dh_threading_failure",
        "vs_init_failure",
        "eureka_init_failure",
        "clockwork_init_failure",
        "trackwork_init_failure",
        "suspected_ship_object_leak",
        "ship_assembly\", \"not_automatable_headless",
        "component_fixture",
        "reload_verification",
        "removal_unload",
        "save-all flush",
        "status == \"passed\" && !keepRuns",
        "vs_eureka:oak_ship_helm",
        "vs_eureka:floater",
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
        "vs_init_failure",
        "eureka_init_failure",
        "clockwork_init_failure",
        "trackwork_init_failure",
        "suspected_ship_object_leak",
        "--variants",
        "--cycles",
        "cloneRuntime",
        "--reflink=auto",
        "physics_queue_warnings",
        "timedOut && !ready && physicsWarnings > 0",
        "exitProcess(if (finalStatus == \"passed\") 0 else 1)",
        "status == \"passed\" && !keepRuns",
        "cycle-\$cycle-base",
    ),
    "tools/kotlin/vs_ships_client.main.kts" to listOf(
        "client_render_failure",
        "client_disconnect_failure",
        "onboarding_failure",
        "respawn_failure",
        "render_environment_inconclusive",
        "assembly_sync_failure",
        "ship_transform_sync_failure",
        "client_backlog_stress_failure",
        "assembledGeometryScore",
        "captureWorld",
        "flywheel_visual_failure",
        "vs_init_failure",
        "eureka_init_failure",
        "clockwork_init_failure",
        "trackwork_init_failure",
        "c2me_dh_threading_failure",
        "prepare-client-runtime",
        "minecraft-client-argfile",
        "startClient",
        "assertPlayerConnected",
        "respawnIfDead",
        "setworldspawn 0 \$y 4",
        "vs_ships_client_contract.properties",
        "fixture_connectivity_failure",
        "menu_packet_failure",
        "assembly_registration_failure",
        "Assembled ship with ([0-9]+) blocks",
        "transform=source_assembly",
        "teleport_probe_confirmed",
        "render_environment_inconclusive",
        "screenshot-manifest.json",
        "ship-after-reconnect-probe.png",
        "ship-after-teleport-probe.png",
        "helm-button-pressed.png",
        "--fixture",
        "--variant",
        "--profile quick|release|stress",
        "client_backlog_stress",
        "stress_physics_queue_warnings",
        "stress_modernfix_watchdogs",
        "stress_disconnects",
        "dh_renderer_disabled",
        "dh_renderer_connectivity",
        "--stop-after",
        "removed-mods.txt",
        "helm_assembly",
        "vs set-static @v[]",
        "client_reconnect",
        "server_restart_reload",
        "xvfb-run",
        "pilot-after-server-restart.png",
        "status == \"passed\" && !keepRuns",
    ),
    "tools/kotlin/vs_ships_release.main.kts" to listOf(
        "vs_ships_stability",
        "vs_ships_matrix",
        "listOf(\"core\", \"clockwork\", \"trackwork\", \"combined\")",
        "dh_disabled",
        "c2me_disabled",
        "dh_c2me_disabled",
        "--keep-going",
        "summary.json",
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
val matrixText = read("tools/kotlin/vs_ships_matrix.main.kts")
if (!matrixText.contains("\"test\", \"smoke\"")) ok("VS isolation variants bypass smoke manifest preflight")
else fail("VS isolation variants bypass smoke manifest preflight", "matrix still boots mutated runtimes through test smoke")

val docs = mapOf(
    "AGENTS.md" to listOf("vs_ships_stability", "vs_ships_matrix", "vs_ships_client"),
    "docs/runtime_validation.md" to listOf(
        "tools/bc test scenario vs_ships_stability --profile quick --cycles 1 --bootstrap-mode once",
        "tools/bc test scenario vs_ships_matrix --profile quick --bootstrap-mode once",
        "tools/bc test scenario-headful vs_ships_client --profile quick --bootstrap-mode once",
        "tools/bc test scenario-headful vs_ships_client --profile stress --fixture combined --bootstrap-mode once",
        "tools/bc test scenario-headful vs_ships_release --bootstrap-mode once",
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

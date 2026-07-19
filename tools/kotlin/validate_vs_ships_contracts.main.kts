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

val transportRecipePath = "kubejs/server_scripts/30_recipe_replace/156_vs_transport_progression.js"
if (!rel(transportRecipePath).isRegularFile()) {
    fail("VS transport progression recipes are present", "missing $transportRecipePath")
} else {
    val transport = read(transportRecipePath)
    fun recipeWindow(output: String): String {
        val marker = "'$output'"
        val start = transport.indexOf(marker)
        if (start < 0) return ""
        val next = transport.indexOf("bcVs", start + marker.length)
        return transport.substring(start, if (next < 0) transport.length else next)
    }

    val primitiveStart = transport.indexOf("// Primitive exploration hook")
    val primitiveEnd = transport.indexOf("// Trackwork is the rough-terrain peer")
    val primitive = if (primitiveStart >= 0 && primitiveEnd > primitiveStart) transport.substring(primitiveStart, primitiveEnd) else ""
    val primitiveRequired = listOf(
        "tconstruct:tool_handle",
        "tconstruct:repair_kit",
        "tconstruct:small_blade",
        "vs_eureka:engine",
        "BC_EUREKA_HELM_WOODS",
    )
    val primitiveForbidden = listOf("ingot", "plate", "BC_VS_TRANSPORT.aer", "create:")
    if (primitiveRequired.all(primitive::contains) && primitiveForbidden.none(primitive::contains)) {
        ok("primitive Eureka boats require TConstruct parts without metal or Create")
    } else {
        fail("primitive Eureka boats require TConstruct parts without metal or Create", "recipe markers drifted")
    }

    val trackworkRoots = listOf("trackwork:simple_wheel_part", "trackwork:phys_track", "trackwork:suspension_track")
    val ungatedTrackwork = trackworkRoots.filter { output ->
        val window = recipeWindow(output)
        !window.contains("BC_VS_TRANSPORT.railway") || !window.contains("BC_VS_TRANSPORT.precision")
    }
    val derivedWheelParts = listOf("trackwork:small_simple_wheel_part", "trackwork:med_simple_wheel_part", "trackwork:large_simple_wheel_part")
        .filter { output -> !recipeWindow(output).contains("trackwork:simple_wheel_part") }
    if (ungatedTrackwork.isEmpty() && derivedWheelParts.isEmpty()) {
        ok("Trackwork propulsion roots cross the railway and precision milestone")
    } else {
        fail("Trackwork propulsion roots cross the railway and precision milestone", (ungatedTrackwork + derivedWheelParts).joinToString())
    }

    val balloonWindow = recipeWindow("vs_eureka:balloon")
    val balloonBypasses = listOf("balloon_leather", "balloon_membrane", "balloon_paper", "balloon_wool")
    if (balloonWindow.contains("BC_VS_TRANSPORT.aerogel") &&
        balloonWindow.contains("BC_VS_TRANSPORT.aercloud") &&
        balloonWindow.contains("BC_VS_TRANSPORT.airtight") &&
        balloonBypasses.all(transport::contains)
    ) {
        ok("Eureka balloons require Aether proof and Airtight casing with native bypass removals")
    } else {
        fail("Eureka balloons require Aether proof and Airtight casing with native bypass removals", "balloon gate markers drifted")
    }

    val clockworkAerialParts = mapOf(
        "vs_clockwork:propeller_blade" to listOf("skyroot", "quicksoilGlass"),
        "vs_clockwork:wide_propeller_blade" to listOf("propeller_blade", "quicksoilGlass"),
        "vs_clockwork:flap" to listOf("aerogel", "skyroot"),
        "vs_clockwork:wing" to listOf("flap", "aerogel"),
        "vs_clockwork:balloon_casing" to listOf("vs_eureka:balloon"),
    )
    val missingAerialProof = clockworkAerialParts.filter { (output, proofs) -> proofs.none(recipeWindow(output)::contains) }.keys
    val clockworkControllers = listOf(
        "vs_clockwork:blade_controller",
        "vs_clockwork:juryrigged_propeller_bearing",
        "vs_clockwork:phys_bearing",
        "vs_clockwork:command_seat",
        "vs_clockwork:gas_thruster",
        "vs_clockwork:gas_engine",
    )
    val missingAirtight = clockworkControllers.filter { output -> !recipeWindow(output).contains("BC_VS_TRANSPORT.airtight") }
    val brassUpgrade = recipeWindow("vs_clockwork:brass_propeller_bearing")
    if (missingAerialProof.isEmpty() && missingAirtight.isEmpty() && brassUpgrade.contains("vs_clockwork:juryrigged_propeller_bearing")) {
        ok("Clockwork aerodynamic parts carry Aether proof and functional controllers cross Airtight")
    } else {
        fail("Clockwork aerodynamic parts carry Aether proof and functional controllers cross Airtight", (missingAerialProof + missingAirtight).joinToString())
    }
}

for (path in listOf("mods/shoulder-surfing-reloaded.pw.toml", "config/shouldersurfing-client.toml")) {
    if (!rel(path).isRegularFile()) ok("deferred or incompatible pack surface is absent", path)
    else fail("deferred or incompatible pack surface is absent", path)
}

val docs = mapOf(
    "docs/performance_and_mods.md" to listOf("Valkyrien Skies", "Eureka", "Clockwork", "Trackwork"),
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

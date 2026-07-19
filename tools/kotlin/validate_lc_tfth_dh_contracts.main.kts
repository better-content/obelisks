#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import kotlin.io.path.exists
import kotlin.io.path.isRegularFile

val root: Path = Paths.get("").toAbsolutePath().normalize()
val failures = mutableListOf<String>()
val passes = mutableListOf<String>()

fun ok(name: String, detail: String = "") {
    passes += name
    println("ok - $name${if (detail.isNotBlank()) " ($detail)" else ""}")
}

fun fail(name: String, detail: String) {
    failures += "$name: $detail"
    System.err.println("FAIL - $name: $detail")
}

fun rel(path: String): Path = root.resolve(path)
fun read(path: String): String = Files.readString(rel(path))

fun parseTopLevelToml(path: String): Map<String, String> {
    val values = linkedMapOf<String, String>()
    var section = ""
    for ((lineNumber, rawLine) in read(path).lineSequence().withIndex()) {
        val withoutComment = rawLine.substringBefore("#").trim()
        if (withoutComment.isBlank()) continue
        val sectionMatch = Regex("""^\[+([^\]]+)]\s*$""").matchEntire(withoutComment)
        if (sectionMatch != null) {
            section = sectionMatch.groupValues[1]
            continue
        }
        val kv = Regex("""^("[^"]+"|[A-Za-z0-9_.-]+)\s*=\s*(.+)$""").matchEntire(withoutComment)
        if (kv == null) {
            throw IllegalArgumentException("$path:${lineNumber + 1}: unsupported TOML line: $withoutComment")
        }
        val key = kv.groupValues[1].trim('"')
        val value = kv.groupValues[2].trim()
        if (value.count { it == '"' } % 2 != 0) {
            throw IllegalArgumentException("$path:${lineNumber + 1}: unbalanced quoted string")
        }
        if (value.count { it == '[' } != value.count { it == ']' }) {
            throw IllegalArgumentException("$path:${lineNumber + 1}: unbalanced array/table brackets")
        }
        values[if (section.isBlank()) key else "$section.$key"] = value.trim('"')
    }
    return values
}

fun expectTomlParses(paths: List<String>) {
    val parsed = mutableListOf<String>()
    for (path in paths) {
        if (!rel(path).isRegularFile()) {
            fail("related config TOML exists and parses", "missing $path")
            continue
        }
        try {
            val values = parseTopLevelToml(path)
            if (values.isEmpty()) fail("related config TOML exists and parses", "$path has no key/value entries")
            else parsed += path
        } catch (error: Exception) {
            fail("related config TOML exists and parses", error.message ?: "$path failed to parse")
        }
    }
    if (parsed.size == paths.size) ok("related config TOML exists and parses", "${parsed.size} files")
}

fun expectPackwizManifest(label: String, path: String, filenamePattern: Regex) {
    if (!rel(path).isRegularFile()) {
        fail("$label manifest is present", "missing $path")
        return
    }
    val values = try {
        parseTopLevelToml(path)
    } catch (error: Exception) {
        fail("$label manifest parses", error.message ?: "parse failed")
        return
    }
    val filename = values["filename"].orEmpty()
    if (filenamePattern.matches(filename)) ok("$label manifest is present", filename)
    else fail("$label manifest filename matches harness jar contract", "$path filename=$filename")
}

fun expectCustomJar(label: String, pattern: Regex) {
    val modsDir = rel("mods")
    val jars = Files.list(modsDir).use { stream ->
        stream.filter { Files.isRegularFile(it) }.map { it.fileName.toString() }.toList()
    }
    val matches = jars.filter { pattern.matches(it) && !it.endsWith("-sources.jar") && !it.endsWith("-javadoc.jar") }
    if (matches.isNotEmpty()) ok("$label runtime jar is present", matches.joinToString(", "))
    else fail("$label runtime jar is present", "no mods/${pattern.pattern} match")
}

fun parseJsonObjectKeys(text: String, objectKey: String): Set<String> {
    val keyIndex = text.indexOf("\"$objectKey\"")
    if (keyIndex < 0) return emptySet()
    val objectStart = text.indexOf('{', keyIndex)
    if (objectStart < 0) return emptySet()
    var depth = 0
    var inString = false
    var escaped = false
    for (index in objectStart until text.length) {
        val ch = text[index]
        if (inString) {
            escaped = ch == '\\' && !escaped
            if (ch == '"' && !escaped) inString = false
            if (ch != '\\') escaped = false
            continue
        }
        when (ch) {
            '"' -> inString = true
            '{' -> depth += 1
            '}' -> {
                depth -= 1
                if (depth == 0) {
                    val body = text.substring(objectStart + 1, index)
                    return Regex(""""([^"]+)"\s*:""").findAll(body).map { it.groupValues[1] }.toSet()
                }
            }
        }
    }
    return emptySet()
}

fun expectLostCitiesRouting() {
    val earth = "kubejs/data/creatingspace/creatingspace/rocket_accessible_dimension/earth_orbit.json"
    val lostcity = "kubejs/data/lostcities/creatingspace/rocket_accessible_dimension/lostcity.json"
    if (!rel(earth).isRegularFile() || !rel(lostcity).isRegularFile()) {
        fail("Lost Cities is routed through Creating Space", "missing $earth or $lostcity")
        return
    }
    val earthKeys = parseJsonObjectKeys(read(earth), "adjacentDimensions")
    val lostKeys = parseJsonObjectKeys(read(lostcity), "adjacentDimensions")
    val routeProblems = mutableListOf<String>()
    if ("lostcities:lostcity" !in earthKeys) routeProblems += "$earth missing lostcities:lostcity adjacency"
    if ("creatingspace:earth_orbit" !in lostKeys) routeProblems += "$lostcity missing creatingspace:earth_orbit adjacency"
    val allowed = setOf(
        earth,
        lostcity,
        "config/lostcities/common.toml",
        "config/bcfixes-common.toml",
    )
    val sourceHits = Files.walk(root).use { stream ->
        stream
            .filter { Files.isRegularFile(it) }
            .filter { path ->
                val r = root.relativize(path).toString().replace('\\', '/')
                (r.startsWith("kubejs/") || r.startsWith("config/") || r.startsWith("defaultconfigs/") || r.startsWith("datapacks/")) &&
                    !r.startsWith("kubejs/config/") &&
                    listOf(".js", ".json", ".json5", ".toml", ".snbt", ".mcmeta", ".txt", ".cfg").any(r::endsWith)
            }
            .map { root.relativize(it).toString().replace('\\', '/') }
            .filter { path -> "lostcities:lostcity" in read(path) }
            .toList()
    }
    val unexpected = sourceHits.filterNot { it in allowed || it.startsWith("config/lostcities/profiles/") }
    if (routeProblems.isEmpty() && unexpected.isEmpty()) ok("Lost Cities dimension route stays on intended Creating Space surface", "earth_orbit <-> lostcity")
    else fail("Lost Cities dimension route stays on intended Creating Space surface", (routeProblems + unexpected.map { "unexpected reference: $it" }).joinToString("; "))
}

expectPackwizManifest("Lost Cities", "mods/the-lost-cities.pw.toml", Regex("""lostcities.*\.jar""", RegexOption.IGNORE_CASE))
expectPackwizManifest("TFTH", "mods/the-flesh-that-hates.pw.toml", Regex("""(TFTH|.*flesh.*hates).*\.jar""", RegexOption.IGNORE_CASE))
expectPackwizManifest("C2ME", "mods/concurrent-chunk-management-engine-for-forge-the.pw.toml", Regex("""c2me.*\.jar""", RegexOption.IGNORE_CASE))
expectPackwizManifest("Distant Horizons", "mods/distant-horizons.pw.toml", Regex("""DistantHorizons.*\.jar""", RegexOption.IGNORE_CASE))
expectCustomJar("bcfixes", Regex("""bcfixes.*\.jar""", RegexOption.IGNORE_CASE))
expectTomlParses(listOf("config/c2me.toml", "config/DistantHorizons.toml", "config/TFTH.toml", "config/TFTH-Data.toml"))
expectLostCitiesRouting()

println()
println("LC/C2ME/DH contract validators: ${passes.size} pass(es), ${failures.size} hard failure(s)")
if (failures.isNotEmpty()) {
    System.err.println(failures.joinToString("\n"))
}
System.exit(if (failures.isEmpty()) 0 else 1)

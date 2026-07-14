#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import kotlin.system.exitProcess

val root = Paths.get("").toAbsolutePath().normalize()
val auditPath = root.resolve("generated/runtime-dumps/realistic_hands_audit.json")
val retiredHookPath = root.resolve("kubejs/startup_scripts/20_blocks/20_realistic_hands.js")
val retiredAssignmentsPath = root.resolve("kubejs/startup_scripts/99_realistic_hands_assignments.js")
val retiredLootPath = root.resolve("kubejs/server_scripts/50_loot/11_realistic_hands_outcomes.js")

class JsonParser(private val text: String) {
    private var index = 0
    fun parse(): Any? {
        skip()
        val value = parseValue()
        skip()
        return value
    }
    private fun parseValue(): Any? {
        skip()
        return when (peek()) {
            '{' -> parseObject()
            '[' -> parseArray()
            '"' -> parseString()
            't' -> parseLiteral("true", true)
            'f' -> parseLiteral("false", false)
            'n' -> parseLiteral("null", null)
            else -> parseNumber()
        }
    }
    private fun parseObject(): Map<String, Any?> {
        expect('{')
        skip()
        val map = linkedMapOf<String, Any?>()
        if (peek() == '}') {
            index++
            return map
        }
        while (true) {
            skip()
            val key = parseString()
            skip()
            expect(':')
            map[key] = parseValue()
            skip()
            when (peek()) {
                ',' -> index++
                '}' -> {
                    index++
                    return map
                }
                else -> error("expected ',' or '}' at $index")
            }
        }
    }
    private fun parseArray(): List<Any?> {
        expect('[')
        skip()
        val list = mutableListOf<Any?>()
        if (peek() == ']') {
            index++
            return list
        }
        while (true) {
            skip()
            list += parseValue()
            skip()
            when (peek()) {
                ',' -> index++
                ']' -> {
                    index++
                    return list
                }
                else -> error("expected ',' or ']' at $index")
            }
        }
    }
    private fun parseString(): String {
        expect('"')
        val out = StringBuilder()
        while (index < text.length) {
            when (val ch = text[index++]) {
                '"' -> return out.toString()
                '\\' -> {
                    val esc = text[index++]
                    out.append(
                        when (esc) {
                            '"', '\\', '/' -> esc
                            'b' -> '\b'
                            'f' -> '\u000c'
                            'n' -> '\n'
                            'r' -> '\r'
                            't' -> '\t'
                            'u' -> text.substring(index, index + 4).also { index += 4 }.toInt(16).toChar()
                            else -> error("bad escape: $esc")
                        }
                    )
                }
                else -> out.append(ch)
            }
        }
        error("unterminated string")
    }
    private fun parseNumber(): Number {
        val start = index
        if (peek() == '-') index++
        while (peek()?.isDigit() == true) index++
        if (peek() == '.') {
            index++
            while (peek()?.isDigit() == true) index++
        }
        if (peek() == 'e' || peek() == 'E') {
            index++
            if (peek() == '+' || peek() == '-') index++
            while (peek()?.isDigit() == true) index++
        }
        val raw = text.substring(start, index)
        return raw.toDoubleOrNull() ?: raw.toLong()
    }
    private fun parseLiteral(token: String, value: Any?): Any? {
        require(text.startsWith(token, index))
        index += token.length
        return value
    }
    private fun skip() {
        while (index < text.length && text[index].isWhitespace()) index++
    }
    private fun peek(): Char? = text.getOrNull(index)
    private fun expect(ch: Char) {
        require(peek() == ch)
        index++
    }
}

fun parseJson(text: String): Any? = JsonParser(text).parse()
fun readJson(path: Path): Map<String, Any?> = parseJson(Files.readString(path)) as? Map<String, Any?> ?: emptyMap()
fun jsonObject(value: Any?): Map<String, Any?> = value as? Map<String, Any?> ?: emptyMap()
fun jsonArray(value: Any?): List<Any?> = value as? List<Any?> ?: emptyList()
fun jsonString(value: Any?): String? = value as? String

fun fail(message: String): Nothing {
    System.err.println("FAIL - $message")
    exitProcess(1)
}

if (!Files.exists(auditPath)) fail("missing ${root.relativize(auditPath)}")

val audit = readJson(auditPath)
val blockTags = jsonObject(audit["blockTags"]).mapValues { (_, value) -> jsonArray(value).mapNotNull(::jsonString).toSet() }
val forceHarvestMissing = jsonArray(jsonObject(audit["forceHarvestCoverage"])["missing"]).mapNotNull(::jsonString)
val reps = jsonObject(audit["representativeSeparation"])
val looseSurfaceIds = jsonArray(audit["looseSurfaceIds"]).mapNotNull(::jsonString)

val requiredHandOrShovel = listOf(
    "minecraft:sand",
    "minecraft:red_sand",
    "minecraft:gravel",
    "minecraft:dirt",
    "minecraft:coarse_dirt",
    "minecraft:rooted_dirt",
    "minecraft:mud",
    "minecraft:grass_block",
    "immersive_weathering:loam",
    "immersive_weathering:silt",
    "immersive_weathering:grassy_silt",
    "dynamictrees:rooty_gravel",
    "unearthed:beige_limestone_grassy_regolith",
    "unearthed:conglomerate_grassy_regolith",
    "unearthed:limestone_grassy_regolith",
    "unearthed:stone_grassy_regolith",
    "unearthed:siltstone_regolith"
)

val missingLooseSurfaces = requiredHandOrShovel.filter { id ->
    id !in (blockTags["hand"] ?: emptySet()) && id !in (blockTags["shovel"] ?: emptySet())
}
if (missingLooseSurfaces.isNotEmpty()) fail("missing explicit loose-surface coverage: ${missingLooseSurfaces.joinToString(", ")}")
if (forceHarvestMissing.isNotEmpty()) fail("missing force_harvest coverage: ${forceHarvestMissing.take(20).joinToString(", ")}")
if (reps["knifeGrass"] != true || reps["knifeLeaves"] != true || reps["swordCobweb"] != true || reps["swordTripwire"] != true) {
    fail("representative knife/sword separation regressed: $reps")
}
if ("minecraft:cobweb" in (blockTags["knife"] ?: emptySet())) fail("minecraft:cobweb must not move into knife")
if ("projectvibrantjourneys:short_grass" in (blockTags["sword"] ?: emptySet())) fail("projectvibrantjourneys:short_grass must not move into sword")
if ("unearthed:siltstone_regolith" !in looseSurfaceIds) fail("unearthed:siltstone_regolith must stay in loose surface audit coverage")

val retiredFiles = listOf(retiredHookPath, retiredAssignmentsPath, retiredLootPath)
val forbiddenMarkers = listOf(
    "global.BC_REALISTIC_HANDS_ASSIGNMENTS",
    "ForgeEvents.onEvent('net.minecraftforge.event.entity.player.PlayerEvent\$BreakSpeed'",
    "LootJS.modifiers("
)
for (path in retiredFiles) {
    val text = Files.readString(path)
    val leaked = forbiddenMarkers.firstOrNull { it in text }
    if (leaked != null) fail("${root.relativize(path)} still contains retired Realistic Hands marker `$leaked`")
}

println("Realistic Hands validates")
println("PASS - Realistic Hands explicit tag policy validated")

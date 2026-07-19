#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import kotlin.system.exitProcess

val root = Paths.get("").toAbsolutePath().normalize()
val blockTagDir = root.resolve("generated/custom-mod-sources/better-content-fixes/src/main/resources/data/bcfixes/tags/blocks/realistic_hands")
val itemTagDir = root.resolve("generated/custom-mod-sources/better-content-fixes/src/main/resources/data/bcfixes/tags/items/realistic_hands/tools")
val quarantinePath = root.resolve("generated/custom-mod-sources/better-content-fixes/quarantine/realistic-hands-exhaustive-policy")
val compatPath = root.resolve("generated/custom-mod-sources/better-content-fixes/src/main/java/io/github/bcfixes/compat/RealisticHandsCompat.java")
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

val blockTagPath = blockTagDir.resolve("axe.json")
val itemTagPath = itemTagDir.resolve("axe.json")
if (!Files.exists(blockTagPath) || !Files.exists(itemTagPath)) fail("missing no-tree-punching tag resources")
val blockValues = jsonArray(readJson(blockTagPath)["values"]).mapNotNull(::jsonString).toSet()
val itemValues = jsonArray(readJson(itemTagPath)["values"]).mapNotNull(::jsonString).toSet()
if (blockValues != setOf("#minecraft:logs")) fail("block policy must contain only #minecraft:logs: $blockValues")
if (itemValues != setOf("#forge:tools/axes")) fail("tool policy must contain only #forge:tools/axes: $itemValues")
Files.list(blockTagDir).use { files ->
    val runtimeFiles = files.filter(Files::isRegularFile).map { it.fileName.toString() }.toList()
    if (runtimeFiles != listOf("axe.json")) fail("unexpected runtime block policy files: $runtimeFiles")
}
Files.list(itemTagDir).use { files ->
    val runtimeFiles = files.filter(Files::isRegularFile).map { it.fileName.toString() }.toList()
    if (runtimeFiles != listOf("axe.json")) fail("unexpected runtime item policy files: $runtimeFiles")
}
if (!Files.exists(quarantinePath.resolve("README.md")) ||
    !Files.exists(quarantinePath.resolve("resources/tags/blocks/knife.json")) ||
    !Files.exists(quarantinePath.resolve("java/RealisticHandsKnifeLootModifier.java"))) {
    fail("exhaustive policy is not retained under ${root.relativize(quarantinePath)}")
}
val retiredLogOverrides = root.resolve("tools/quarantine/realistic-hands-exhaustive-policy/retired-log-tag-overrides")
val activeLogs = root.resolve("kubejs/data/minecraft/tags/blocks/logs.json")
val activeBurnableLogs = root.resolve("kubejs/data/minecraft/tags/blocks/logs_that_burn.json")
val activeItemLogs = root.resolve("kubejs/data/minecraft/tags/items/logs.json")
val activeBurnableItemLogs = root.resolve("kubejs/data/minecraft/tags/items/logs_that_burn.json")
val coreLogTags = setOf("#minecraft:acacia_logs", "#minecraft:birch_logs", "#minecraft:cherry_logs", "#minecraft:dark_oak_logs", "#minecraft:jungle_logs", "#minecraft:mangrove_logs", "#minecraft:oak_logs", "#minecraft:spruce_logs")
if (jsonArray(readJson(activeLogs)["values"]).mapNotNull(::jsonString).toSet() != coreLogTags ||
    jsonArray(readJson(activeBurnableLogs)["values"]).mapNotNull(::jsonString).toSet() != coreLogTags ||
    jsonArray(readJson(activeItemLogs)["values"]).mapNotNull(::jsonString).toSet() != coreLogTags ||
    jsonArray(readJson(activeBurnableItemLogs)["values"]).mapNotNull(::jsonString).toSet() != coreLogTags ||
    !Files.exists(retiredLogOverrides.resolve("logs.json")) ||
    !Files.exists(retiredLogOverrides.resolve("logs_that_burn.json")) ||
    !Files.exists(retiredLogOverrides.resolve("item_logs.json")) ||
    !Files.exists(retiredLogOverrides.resolve("item_logs_that_burn.json"))) {
    fail("stale pack-wide Minecraft log overrides must remain quarantined")
}
val compat = Files.readString(compatPath)
for (marker in listOf("state.is(RealisticHandsTags.AXE)", "stack.is(RealisticHandsTags.AXE_TOOLS)")) {
    if (marker !in compat) fail("missing Forge no-tree-punching marker `$marker`")
}
for (marker in listOf("RealisticHandsTags.KNIFE", "RealisticHandsTags.PICKAXE", "damageKnife")) {
    if (marker in compat) fail("exhaustive Forge policy marker remains active: `$marker`")
}

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
println("PASS - no-tree-punching gate active; exhaustive policy quarantined")

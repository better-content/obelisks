#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths

val root = Paths.get("").toAbsolutePath().normalize()
val runtimeProbePath = root.resolve("generated/runtime-dumps/block_hardness_probe.json")
val outputJsonPath = root.resolve("generated/runtime-dumps/realistic_hands_audit.json")
val outputMdPath = root.resolve("generated/runtime-dumps/realistic_hands_audit.md")
val blockTagDir = root.resolve("generated/custom-mod-sources/better-content-fixes/src/main/resources/data/bcfixes/tags/blocks/realistic_hands")
val itemTagDir = root.resolve("generated/custom-mod-sources/better-content-fixes/src/main/resources/data/bcfixes/tags/items/realistic_hands/tools")

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
        require(text.startsWith(token, index)) { "expected $token at $index" }
        index += token.length
        return value
    }
    private fun skip() {
        while (index < text.length && text[index].isWhitespace()) index++
    }
    private fun peek(): Char? = text.getOrNull(index)
    private fun expect(ch: Char) {
        require(peek() == ch) { "expected '$ch' at $index" }
        index++
    }
}

fun parseJson(text: String): Any? = JsonParser(text).parse()
fun readJson(path: Path): Map<String, Any?> = parseJson(Files.readString(path)) as? Map<String, Any?> ?: emptyMap()
fun jsonObject(value: Any?): Map<String, Any?> = value as? Map<String, Any?> ?: emptyMap()
fun jsonArray(value: Any?): List<Any?> = value as? List<Any?> ?: emptyList()
fun jsonString(value: Any?): String? = value as? String
fun jsonBoolean(value: Any?): Boolean = value as? Boolean ?: false
fun jsonNumber(value: Any?): Number? = value as? Number
fun localName(id: String): String = id.substringAfter(':', id)
fun rel(path: Path): String = root.relativize(path).toString().replace('\\', '/')
fun sortIds(values: Iterable<String>) = values.filter { it.isNotBlank() }.map(String::trim).distinct().sorted()

fun renderJson(value: Any?, indent: String = ""): String = when (value) {
    null -> "null"
    is String -> "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\""
    is Number, is Boolean -> value.toString()
    is Map<*, *> -> "{\n" + value.entries.joinToString(",\n") { (k, v) ->
        "$indent  ${renderJson(k.toString())}: ${renderJson(v, "$indent  ")}"
    } + "\n$indent}"
    is Iterable<*> -> "[\n" + value.joinToString(",\n") { "$indent  ${renderJson(it, "$indent  ")}" } + "\n$indent]"
    else -> renderJson(value.toString(), indent)
}

fun readTagValues(path: Path): List<String> = sortIds(jsonArray(readJson(path)["values"]).mapNotNull(::jsonString).filterNot { it.startsWith("#") })

if (!Files.exists(runtimeProbePath)) error("missing ${rel(runtimeProbePath)}")

val blockTags = linkedMapOf<String, List<String>>(
    "hand" to readTagValues(blockTagDir.resolve("hand.json")),
    "knife" to readTagValues(blockTagDir.resolve("knife.json")),
    "axe" to readTagValues(blockTagDir.resolve("axe.json")),
    "pickaxe" to readTagValues(blockTagDir.resolve("pickaxe.json")),
    "shovel" to readTagValues(blockTagDir.resolve("shovel.json")),
    "hoe" to readTagValues(blockTagDir.resolve("hoe.json")),
    "sword" to readTagValues(blockTagDir.resolve("sword.json")),
    "force_harvest" to readTagValues(blockTagDir.resolve("force_harvest.json")),
    "knife_straw" to readTagValues(blockTagDir.resolve("knife_straw.json")),
    "knife_extra_sticks" to readTagValues(blockTagDir.resolve("knife_extra_sticks.json"))
)
val itemTags = linkedMapOf<String, List<String>>(
    "knife" to readTagValues(itemTagDir.resolve("knife.json")),
    "axe" to readTagValues(itemTagDir.resolve("axe.json")),
    "pickaxe" to readTagValues(itemTagDir.resolve("pickaxe.json")),
    "shovel" to readTagValues(itemTagDir.resolve("shovel.json")),
    "hoe" to readTagValues(itemTagDir.resolve("hoe.json")),
    "sword" to readTagValues(itemTagDir.resolve("sword.json"))
)

val runtimeProbe = readJson(runtimeProbePath)
val runtimeRows = (jsonArray(runtimeProbe["allBlocks"]) + jsonArray(runtimeProbe["selectedBlocks"])).map(::jsonObject)
val runtimeById = runtimeRows.associateBy { jsonString(it["id"]).orEmpty() }.filterKeys { it.isNotBlank() }

val toolOrder = listOf("hand", "knife", "axe", "pickaxe", "shovel", "hoe", "sword")
val blockAssignments = linkedMapOf<String, Any?>()
val allPolicyBlocks = toolOrder.flatMap { blockTags[it].orEmpty() }.toSortedSet()
for (id in allPolicyBlocks) {
    val runtime = runtimeById[id]
    val tools = toolOrder.filter { id in blockTags[it].orEmpty() }
    val outcomes = buildList<String> {
        if (id in blockTags["knife_straw"].orEmpty()) add("knife_transform_fiber")
        if (id in blockTags["knife_extra_sticks"].orEmpty()) add("knife_extra_sticks")
        if (id in blockTags["sword"].orEmpty() && ("cobweb" in localName(id) || "tripwire" in localName(id) || "web" in localName(id))) {
            add("sword_preserve_web")
        }
    }
    blockAssignments[id] = linkedMapOf(
        "tools" to tools,
        "origin" to "explicit-tags",
        "requiresCorrectToolForDrops" to jsonBoolean(runtime?.get("requiresCorrectToolForDrops")),
        "forceHarvest" to (id in blockTags["force_harvest"].orEmpty()),
        "outcomes" to outcomes
    )
}

val itemAssignments = linkedMapOf<String, Any?>()
for ((tool, ids) in itemTags) {
    ids.forEach { id ->
        itemAssignments[id] = linkedMapOf("tool" to tool, "origin" to "explicit-tags")
    }
}

val looseSurfaceIds = sortIds((blockTags["hand"].orEmpty() + blockTags["shovel"].orEmpty()).filter {
    val name = localName(it)
    listOf("sand", "gravel", "dirt", "mud", "regolith", "loam", "silt", "soil", "grass_block", "grassy_", "mycelium", "podzol").any(name::contains)
})
val forceHarvestRequired = looseSurfaceIds.filter { jsonBoolean(runtimeById[it]?.get("requiresCorrectToolForDrops")) }
val forceHarvestMissing = forceHarvestRequired.filter { it !in blockTags["force_harvest"].orEmpty() }

val representativeSeparation = linkedMapOf(
    "knifeGrass" to ("projectvibrantjourneys:short_grass" in blockTags["knife"].orEmpty()),
    "knifeLeaves" to ("minecraft:oak_leaves" in blockTags["knife"].orEmpty()),
    "swordCobweb" to ("minecraft:cobweb" in blockTags["sword"].orEmpty()),
    "swordTripwire" to ("minecraft:tripwire" in blockTags["sword"].orEmpty())
)

val report = linkedMapOf<String, Any?>(
    "schema" to "dimension_drink.realistic_hands.tag_policy_audit.v1",
    "generatedBy" to "tools/kotlin/audit_realistic_hands.main.kts",
    "input" to rel(runtimeProbePath),
    "runtimeProbeSchema" to jsonString(runtimeProbe["schema"]).orEmpty(),
    "policyRoot" to "generated/custom-mod-sources/better-content-fixes/src/main/resources/data/bcfixes/tags",
    "blockTags" to blockTags,
    "itemTags" to itemTags,
    "blockAssignments" to blockAssignments,
    "itemAssignments" to itemAssignments,
    "looseSurfaceIds" to looseSurfaceIds,
    "forceHarvestCoverage" to linkedMapOf(
        "required" to forceHarvestRequired,
        "missing" to forceHarvestMissing
    ),
    "representativeSeparation" to representativeSeparation,
    "outcomeFamilies" to linkedMapOf(
        "knife_transform_fiber" to blockTags["knife_straw"].orEmpty(),
        "knife_extra_sticks" to blockTags["knife_extra_sticks"].orEmpty(),
        "sword_preserve_web" to blockTags["sword"].orEmpty().filter { id ->
            val name = localName(id)
            "cobweb" in name || "tripwire" == name || "web" in name
        }
    ),
    "tagCounts" to linkedMapOf(
        "blocks" to blockTags.mapValues { it.value.size },
        "items" to itemTags.mapValues { it.value.size }
    ),
    "selectedRuntimeEvidence" to linkedMapOf(
        "minecraft:gravel" to runtimeById["minecraft:gravel"],
        "unearthed:siltstone_regolith" to runtimeById["unearthed:siltstone_regolith"],
        "minecraft:stone" to runtimeById["minecraft:stone"],
        "minecraft:cobweb" to runtimeById["minecraft:cobweb"],
        "projectvibrantjourneys:short_grass" to runtimeById["projectvibrantjourneys:short_grass"]
    )
)

Files.writeString(outputJsonPath, renderJson(report) + "\n")
Files.writeString(outputMdPath, buildString {
    appendLine("# Realistic Hands Audit")
    appendLine()
    appendLine("Input: `${rel(runtimeProbePath)}`")
    appendLine("Runtime probe schema: `${jsonString(runtimeProbe["schema"]).orEmpty()}`")
    appendLine()
    appendLine("## Explicit Tag Counts")
    appendLine()
    toolOrder.forEach { tool -> appendLine("- Block `$tool`: ${blockTags[tool].orEmpty().size}") }
    appendLine("- Block `force_harvest`: ${blockTags["force_harvest"].orEmpty().size}")
    appendLine("- Block `knife_straw`: ${blockTags["knife_straw"].orEmpty().size}")
    appendLine("- Block `knife_extra_sticks`: ${blockTags["knife_extra_sticks"].orEmpty().size}")
    itemTags.forEach { (tool, ids) -> appendLine("- Item `$tool`: ${ids.size}") }
    appendLine()
    appendLine("## Representative Separation")
    appendLine()
    representativeSeparation.forEach { (name, value) -> appendLine("- $name: $value") }
    appendLine()
    appendLine("## Force Harvest Coverage")
    appendLine()
    appendLine("- Required: ${forceHarvestRequired.size}")
    appendLine("- Missing: ${forceHarvestMissing.size}")
    if (forceHarvestMissing.isNotEmpty()) {
        forceHarvestMissing.take(20).forEach { appendLine("- Missing sample: `$it`") }
    }
    appendLine()
    appendLine("## Outcome Families")
    appendLine()
    appendLine("- knife transform fiber: ${blockTags["knife_straw"].orEmpty().size}")
    appendLine("- knife extra sticks: ${blockTags["knife_extra_sticks"].orEmpty().size}")
    appendLine("- sword preserve web: ${(report["outcomeFamilies"] as Map<*, *>)["sword_preserve_web"].let(::jsonArray).size}")
})

println("wrote ${rel(outputJsonPath)} and ${rel(outputMdPath)}")

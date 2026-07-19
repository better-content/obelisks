#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths

val root = Paths.get("").toAbsolutePath().normalize()
val legacyAuditPath = Paths.get(args.getOrNull(0) ?: root.resolve("generated/runtime-dumps/realistic_hands_audit.json").toString())
val runtimeProbePath = root.resolve("generated/runtime-dumps/block_hardness_probe.json")
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
fun rel(path: Path) = root.relativize(path).toString().replace('\\', '/')
fun localName(id: String): String = id.substringAfter(':', id)
fun ensureDir(path: Path) = Files.createDirectories(path.parent)
fun sortIds(values: Iterable<String>) = values.filter { it.isNotBlank() }.map(String::trim).distinct().sorted()

fun renderJsonArray(values: List<String>): String = buildString {
    append("{\n")
    append("  \"replace\": false,\n")
    append("  \"values\": [\n")
    values.forEachIndexed { index, value ->
        append("    \"").append(value).append("\"")
        if (index + 1 < values.size) append(',')
        append('\n')
    }
    append("  ]\n")
    append("}\n")
}

fun isLooseSurfaceId(id: String): Boolean {
    val name = localName(id)
    val strongPositive = listOf(
        "regolith",
        "grassy_",
        "grass_block",
        "mycelium",
        "podzol",
        "loam",
        "quicksoil",
        "permafrost"
    ).any(name::contains) ||
        name == "mud" ||
        name.startsWith("mud_") ||
        name.endsWith("_mud") ||
        "dirt" in name ||
        "gravel" in name ||
        "soil" in name ||
        name == "silt" ||
        name.startsWith("silt_") ||
        name.endsWith("_silt")
    val sandPositive = "sand" in name && "sandstone" !in name && "sandbags" !in name
    val rootyPositive = name.startsWith("rooty_") || name == "rooty_gravel"
    if (!(strongPositive || sandPositive || rootyPositive)) {
        return false
    }
    val negatives = listOf(
        "ore",
        "vein",
        "slab",
        "stairs",
        "wall",
        "brick",
        "pillar",
        "smooth",
        "polished",
        "chiseled",
        "cut_",
        "tile",
        "tiles",
        "glass",
        "pane"
    )
    return negatives.none(name::contains)
}

fun isKnifeExtraStickId(id: String): Boolean {
    val name = localName(id)
    return "leaves" in name || "leaf" in name || "foliage" in name
}

if (!Files.exists(legacyAuditPath)) error("missing ${rel(legacyAuditPath)}")
if (!Files.exists(runtimeProbePath)) error("missing ${rel(runtimeProbePath)}")

val legacyAudit = readJson(legacyAuditPath)
val legacyBlocks = jsonObject(legacyAudit["blocks"])
val legacyItems = jsonObject(legacyAudit["items"])
val runtimeProbe = readJson(runtimeProbePath)
val runtimeRows = (jsonArray(runtimeProbe["allBlocks"]) + jsonArray(runtimeProbe["selectedBlocks"])).map(::jsonObject)
val requiresCorrectTool = runtimeRows.associate { row -> jsonString(row["id"]).orEmpty() to jsonBoolean(row["requiresCorrectToolForDrops"]) }

Files.createDirectories(blockTagDir)
Files.createDirectories(itemTagDir)

val toolKeys = listOf("hand", "knife", "axe", "pickaxe", "shovel", "hoe", "sword")
val filteredHand = sortIds(jsonArray(legacyBlocks["hand"]).mapNotNull(::jsonString).filter(::isLooseSurfaceId))
val filteredShovel = sortIds(jsonArray(legacyBlocks["shovel"]).mapNotNull(::jsonString).filter(::isLooseSurfaceId))
val blockOutputs = linkedMapOf<String, List<String>>()
blockOutputs["hand"] = filteredHand
blockOutputs["knife"] = sortIds(jsonArray(legacyBlocks["knife"]).mapNotNull(::jsonString))
blockOutputs["axe"] = sortIds(jsonArray(legacyBlocks["axe"]).mapNotNull(::jsonString))
blockOutputs["pickaxe"] = sortIds(jsonArray(legacyBlocks["pickaxe"]).mapNotNull(::jsonString))
blockOutputs["shovel"] = filteredShovel
blockOutputs["hoe"] = sortIds(jsonArray(legacyBlocks["hoe"]).mapNotNull(::jsonString))
blockOutputs["sword"] = sortIds(jsonArray(legacyBlocks["sword"]).mapNotNull(::jsonString))
blockOutputs["force_harvest"] = sortIds((filteredHand + filteredShovel).filter { requiresCorrectTool[it] == true })
blockOutputs["knife_straw"] = sortIds(
    setOf("minecraft:grass", "minecraft:tall_grass", "projectvibrantjourneys:short_grass")
        .filter { it in (blockOutputs["knife"] ?: emptyList()) }
)
blockOutputs["knife_extra_sticks"] = sortIds((blockOutputs["knife"] ?: emptyList()).filter(::isKnifeExtraStickId))

for ((name, values) in blockOutputs) {
    val path = blockTagDir.resolve("$name.json")
    ensureDir(path)
    Files.writeString(path, renderJsonArray(values))
}

for (tool in listOf("knife", "axe", "pickaxe", "shovel", "hoe", "sword")) {
    val path = itemTagDir.resolve("$tool.json")
    ensureDir(path)
    val values = sortIds(jsonArray(legacyItems[tool]).mapNotNull(::jsonString))
    Files.writeString(path, renderJsonArray(values))
}

println("bootstrapped Realistic Hands tags from ${rel(legacyAuditPath)}")

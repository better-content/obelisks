#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.util.jar.JarFile

val packRoot = Paths.get("").toAbsolutePath().normalize()
val argsList = args.toList()

fun argValue(name: String): String? {
    val index = argsList.indexOf(name)
    return if (index >= 0 && index + 1 < argsList.size) argsList[index + 1] else null
}

fun readJson(path: Path): Any? = JsonParser(Files.readString(path)).parse()
fun jsonObject(value: Any?): Map<String, Any?> = value as? Map<String, Any?> ?: emptyMap()
fun jsonArray(value: Any?): List<Any?> = value as? List<Any?> ?: emptyList()
fun jsonString(value: Any?): String? = value as? String

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
        val result = linkedMapOf<String, Any?>()
        if (peek() == '}') {
            index++
            return result
        }
        while (true) {
            skip()
            val key = parseString()
            skip()
            expect(':')
            result[key] = parseValue()
            skip()
            when (peek()) {
                ',' -> index++
                '}' -> {
                    index++
                    return result
                }
                else -> error("expected ',' or '}' at $index")
            }
        }
    }
    private fun parseArray(): List<Any?> {
        expect('[')
        skip()
        val result = mutableListOf<Any?>()
        if (peek() == ']') {
            index++
            return result
        }
        while (true) {
            result += parseValue()
            skip()
            when (peek()) {
                ',' -> index++
                ']' -> {
                    index++
                    return result
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
                            else -> error("bad escape \\$esc")
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

fun renderJson(value: Any?, indent: String = ""): String = when (value) {
    null -> "null"
    is String -> "\"" + value
        .replace("\\", "\\\\")
        .replace("\"", "\\\"")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\t", "\\t") + "\""
    is Number, is Boolean -> value.toString()
    is Map<*, *> -> {
        val entries = value.entries.joinToString(",\n") { (key, item) ->
            "$indent  ${renderJson(key.toString())}: ${renderJson(item, "$indent  ")}"
        }
        "{\n$entries\n$indent}"
    }
    is Iterable<*> -> {
        val entries = value.joinToString(",\n") { item -> "$indent  ${renderJson(item, "$indent  ")}" }
        "[\n$entries\n$indent]"
    }
    else -> renderJson(value.toString(), indent)
}

fun recipeOutputs(recipe: Map<String, Any?>): List<String> {
    val outputs = mutableListOf<String>()
    fun add(value: Any?) {
        when (value) {
            null -> Unit
            is String -> outputs += value
            is Map<*, *> -> {
                val item = value["item"] as? String
                val result = value["result"] as? String
                if (item != null) outputs += item
                if (result != null) outputs += result
            }
        }
    }
    add(recipe["result"])
    add(recipe["output"])
    add(recipe["item_output"])
    jsonArray(recipe["results"]).forEach(::add)
    return outputs
}

fun findJar(modsDir: Path, pattern: Regex): Path? =
    Files.list(modsDir).use { stream ->
        stream.filter { Files.isRegularFile(it) && it.fileName.toString().endsWith(".jar") }
            .toList()
            .firstOrNull { pattern.containsMatchIn(it.fileName.toString()) }
    }

val defaultModsDir = when {
    Files.exists(Paths.get(System.getProperty("user.home"), ".cache", "bc", "magic-audit-mods", "mods")) -> Paths.get(System.getProperty("user.home"), ".cache", "bc", "magic-audit-mods", "mods")
    Files.exists(packRoot.resolve("server-template/mods")) -> packRoot.resolve("server-template/mods")
    Files.exists(packRoot.resolve("server-instance/mods")) -> packRoot.resolve("server-instance/mods")
    else -> packRoot.resolve("mods")
}
val modsDir = Paths.get(argValue("--mods-dir") ?: defaultModsDir.toString())
val outDir = Paths.get(argValue("--out-dir") ?: packRoot.resolve("generated/validation/cross_magic_spellcraft").toString())
Files.createDirectories(outDir)

val ironJar = findJar(modsDir, Regex("""irons[_-]spellbooks""", RegexOption.IGNORE_CASE))
    ?: error("No Iron's Spells jar found in $modsDir")

val craftOutputs = mutableListOf<Map<String, String>>()
val lootTables = mutableListOf<String>()

JarFile(ironJar.toFile()).use { jar ->
    val entries = jar.entries().asSequence().toList()
    for (entry in entries) {
        val name = entry.name
        if (name.startsWith("data/irons_spellbooks/recipes/") && name.endsWith(".json")) {
            runCatching {
                val recipe = jsonObject(JsonParser(jar.getInputStream(entry).bufferedReader().readText()).parse())
                val id = name.removePrefix("data/irons_spellbooks/recipes/").removeSuffix(".json").let { "irons_spellbooks:$it" }
                for (output in recipeOutputs(recipe)) {
                    if (output.startsWith("irons_spellbooks:")) {
                        craftOutputs += mapOf("id" to id, "type" to (jsonString(recipe["type"]) ?: "UNKNOWN"), "output" to output)
                    }
                }
            }
        }
        if (name.startsWith("data/irons_spellbooks/loot_tables/") && name.endsWith(".json")) {
            val raw = jar.getInputStream(entry).bufferedReader().readText()
            if ("irons_spellbooks" in raw) {
                lootTables += name.removePrefix("data/").replace("/loot_tables/", ":").removeSuffix(".json")
            }
        }
    }
}

val magicRecipeTypes = linkedMapOf<String, MutableMap<String, Any>>()
Files.list(modsDir).use { stream ->
    stream.filter { Files.isRegularFile(it) && it.fileName.toString().endsWith(".jar") }
        .forEach { jarPath ->
            val jarName = jarPath.fileName.toString()
            if (!Regex("""(ars|bloodmagic|hexerei|malum|occultism|goety|forbidden)""", RegexOption.IGNORE_CASE).containsMatchIn(jarName)) return@forEach
            JarFile(jarPath.toFile()).use { jar ->
                for (entry in jar.entries().asSequence()) {
                    val name = entry.name
                    if (!name.contains("/recipes/") || !name.endsWith(".json")) continue
                    val recipe = runCatching {
                        jsonObject(JsonParser(jar.getInputStream(entry).bufferedReader().readText()).parse())
                    }.getOrNull() ?: continue
                    val type = jsonString(recipe["type"]) ?: "UNKNOWN"
                    val row = magicRecipeTypes.getOrPut(type) {
                        linkedMapOf<String, Any>(
                            "jar" to jarName,
                            "example" to name,
                            "count" to 0
                        )
                    }
                    row["count"] = ((row["count"] as Int) + 1)
                }
            }
        }
}

val summary = linkedMapOf<String, Any>(
    "modsDir" to modsDir.toString(),
    "ironJar" to ironJar.fileName.toString(),
    "generatedAt" to java.time.Instant.now().toString(),
    "ironCraftOutputs" to craftOutputs.size,
    "uniqueIronCraftOutputs" to craftOutputs.map { it["output"].orEmpty() }.toSet().size,
    "ironLootTablesWithIronEntries" to lootTables.size,
    "magicRecipeTypeCount" to magicRecipeTypes.size,
    "craftOutputs" to craftOutputs,
    "lootTables" to lootTables,
    "magicRecipeTypes" to magicRecipeTypes
)

Files.writeString(outDir.resolve("summary.json"), renderJson(summary) + "\n")
Files.writeString(
    outDir.resolve("summary.md"),
    listOf(
        "# Cross-Magic Spellcraft Audit",
        "",
        "- Mods dir: `${modsDir}`",
        "- Iron's Spells jar: `${ironJar.fileName}`",
        "- Iron craft output rows: ${summary["ironCraftOutputs"]}",
        "- Unique Iron craft outputs: ${summary["uniqueIronCraftOutputs"]}",
        "- Iron loot tables with Iron entries: ${summary["ironLootTablesWithIronEntries"]}",
        "- Magic recipe types observed: ${summary["magicRecipeTypeCount"]}",
        "",
        "Generated validation output only; concise conclusions belong in `docs/runtime_validation.md` when needed."
    ).joinToString("\n") + "\n"
)

println("Wrote ${outDir.resolve("summary.json")}")

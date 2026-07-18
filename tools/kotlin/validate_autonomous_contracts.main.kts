#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.security.MessageDigest
import kotlin.io.path.exists
import kotlin.system.exitProcess

val root = Paths.get("").toAbsolutePath().normalize()
val instance = System.getenv("BC_INSTANCE") ?: ""
val failures = mutableListOf<String>()
var passCount = 0

fun full(relPath: String): Path = root.resolve(relPath)
fun exists(relPath: String): Boolean = full(relPath).exists()
fun read(relPath: String): String = Files.readString(full(relPath))
fun readAbs(path: Path): String = Files.readString(path)
fun ok(name: String, detail: String = "") {
    passCount += 1
    println("ok - $name${if (detail.isNotBlank()) " ($detail)" else ""}")
}
fun fail(name: String, detail: String) {
    failures += "$name: $detail"
    System.err.println("FAIL - $name: $detail")
}
fun walk(relRoot: String, predicate: (String) -> Boolean = { true }): List<String> {
    val rootPath = full(relRoot)
    if (!rootPath.exists()) return emptyList()
    return Files.walk(rootPath).use { stream ->
        stream.filter { Files.isRegularFile(it) }
            .map { root.relativize(it).toString().replace('\\', '/') }
            .filter(predicate)
            .toList()
    }
}
fun sha256(relPath: String): String {
    val digest = MessageDigest.getInstance("SHA-256")
    Files.newInputStream(full(relPath)).use { input ->
        val buffer = ByteArray(8192)
        while (true) {
            val read = input.read(buffer)
            if (read < 0) break
            if (read > 0) digest.update(buffer, 0, read)
        }
    }
    return digest.digest().joinToString("") { "%02x".format(it) }
}
fun newestMtime(relPaths: List<String>): Long =
    relPaths.mapNotNull { rel ->
        val path = full(rel)
        if (path.exists()) Files.getLastModifiedTime(path).toMillis() else null
    }.maxOrNull() ?: 0L

fun foodDumpCandidates(): List<Path> =
    if (instance.isNotBlank()) listOf(Paths.get(instance).resolve("kubejs/config/food_effect_index.json"))
    else listOf(root.resolve("generated/runtime-dumps/kubejs-config/food_effect_index.json"))

fun foodSummaryForIndex(indexPath: Path): Path {
    val sibling = indexPath.parent.resolve("food_effect_summary.json")
    if (sibling.exists()) return sibling
    if (indexPath == root.resolve("generated/runtime-dumps/kubejs-config/food_effect_index.json")) {
        return root.resolve("generated/runtime-dumps/kubejs-config/food_effect_summary.json")
    }
    return sibling
}
data class ExistingFile(val file: Path, val mtimeMs: Long)
fun firstExistingFile(paths: List<Path>): ExistingFile? =
    paths.firstOrNull { it.exists() }?.let { ExistingFile(it, Files.getLastModifiedTime(it).toMillis()) }
fun instanceLatestLog(): Path? = if (instance.isNotBlank()) Paths.get(instance).resolve("logs/latest.log") else null

class JsonParser(private val text: String) {
    private var index = 0
    fun parse(): Any? {
        skipWhitespace()
        val value = parseValue()
        skipWhitespace()
        return value
    }
    private fun parseValue(): Any? {
        skipWhitespace()
        if (index >= text.length) error("unexpected end of JSON")
        return when (val ch = text[index]) {
            '{' -> parseObject()
            '[' -> parseArray()
            '"' -> parseString()
            't' -> parseLiteral("true", true)
            'f' -> parseLiteral("false", false)
            'n' -> parseLiteral("null", null)
            '-', in '0'..'9' -> parseNumber()
            else -> error("unexpected JSON character: $ch")
        }
    }
    private fun parseObject(): Map<String, Any?> {
        val result = linkedMapOf<String, Any?>()
        expect('{'); skipWhitespace()
        if (peek('}')) { index += 1; return result }
        while (true) {
            skipWhitespace()
            val key = parseString()
            skipWhitespace()
            expect(':')
            result[key] = parseValue()
            skipWhitespace()
            when {
                peek('}') -> { index += 1; return result }
                peek(',') -> index += 1
                else -> error("expected , or }")
            }
        }
    }
    private fun parseArray(): List<Any?> {
        val result = mutableListOf<Any?>()
        expect('['); skipWhitespace()
        if (peek(']')) { index += 1; return result }
        while (true) {
            result += parseValue()
            skipWhitespace()
            when {
                peek(']') -> { index += 1; return result }
                peek(',') -> index += 1
                else -> error("expected , or ]")
            }
        }
    }
    private fun parseString(): String {
        expect('"')
        val out = StringBuilder()
        while (index < text.length) {
            val ch = text[index++]
            when (ch) {
                '"' -> return out.toString()
                '\\' -> {
                    val esc = text[index++]
                    out.append(
                        when (esc) {
                            '"', '\\', '/' -> esc
                            'b' -> '\b'
                            'f' -> '\u000C'
                            'n' -> '\n'
                            'r' -> '\r'
                            't' -> '\t'
                            'u' -> {
                                val hex = text.substring(index, index + 4)
                                index += 4
                                hex.toInt(16).toChar()
                            }
                            else -> error("bad escape: $esc")
                        },
                    )
                }
                else -> out.append(ch)
            }
        }
        error("unterminated string")
    }
    private fun parseNumber(): Number {
        val start = index
        if (text[index] == '-') index += 1
        while (index < text.length && text[index].isDigit()) index += 1
        if (index < text.length && text[index] == '.') {
            index += 1
            while (index < text.length && text[index].isDigit()) index += 1
        }
        if (index < text.length && (text[index] == 'e' || text[index] == 'E')) {
            index += 1
            if (index < text.length && (text[index] == '+' || text[index] == '-')) index += 1
            while (index < text.length && text[index].isDigit()) index += 1
        }
        val raw = text.substring(start, index)
        return if (raw.contains('.') || raw.contains('e', true)) raw.toDouble() else raw.toLong()
    }
    private fun parseLiteral(token: String, value: Any?): Any? {
        require(text.startsWith(token, index)) { "expected $token" }
        index += token.length
        return value
    }
    private fun skipWhitespace() { while (index < text.length && text[index].isWhitespace()) index += 1 }
    private fun expect(ch: Char) {
        require(index < text.length && text[index] == ch) { "expected $ch" }
        index += 1
    }
    private fun peek(ch: Char): Boolean = index < text.length && text[index] == ch
}
fun parseJson(text: String): Any? = JsonParser(text).parse()
fun readJson(relPath: String): Map<String, Any?> = parseJson(read(relPath)) as? Map<String, Any?> ?: emptyMap()
fun readJsonAbs(path: Path): Map<String, Any?> = parseJson(readAbs(path)) as? Map<String, Any?> ?: emptyMap()
fun jsonObject(value: Any?): Map<String, Any?> = value as? Map<String, Any?> ?: emptyMap()
fun jsonArray(value: Any?): List<Any?> = value as? List<Any?> ?: emptyList()
fun jsonString(value: Any?): String? = value as? String
fun jsonNumber(value: Any?): Number? = value as? Number
fun bool(value: Any?): Boolean? = value as? Boolean

fun extractCallArrays(text: String, callName: String): List<List<List<Any?>>> {
    val arrays = mutableListOf<List<List<Any?>>>()
    var cursor = 0
    while (true) {
        val call = text.indexOf("$callName(", cursor)
        if (call < 0) break
        if (text.substring(maxOf(0, call - 12), call).contains("function ")) {
            cursor = call + callName.length
            continue
        }
        val start = text.indexOf('[', call)
        if (start < 0) break
        var depth = 0
        var quote: Char? = null
        var end = -1
        for (i in start until text.length) {
            val ch = text[i]
            val prev = if (i > 0) text[i - 1] else '\u0000'
            if (quote != null) {
                if (ch == quote && prev != '\\') quote = null
                continue
            }
            if (ch == '\'' || ch == '"') {
                quote = ch
                continue
            }
            if (ch == '[') depth += 1
            if (ch == ']') {
                depth -= 1
                if (depth == 0) {
                    end = i + 1
                    break
                }
            }
        }
        if (end < 0) break
        val literal = text.substring(start, end)
        try {
            arrays += parseJsArrayLiteral(literal)
        } catch (error: Exception) {
            fail("parse $callName rows", error.message ?: error.javaClass.simpleName)
        }
        cursor = end
    }
    return arrays
}

class JsValueParser(private val text: String) {
    private var index = 0
    fun parseValue(): Any? {
        skipWhitespace()
        if (index >= text.length) error("unexpected end")
        return when (val ch = text[index]) {
            '[' -> parseArray()
            '\'' -> parseSingleQuoted()
            '"' -> parseDoubleQuoted()
            '-', in '0'..'9' -> parseNumber()
            't' -> parseLiteral("true", true)
            'f' -> parseLiteral("false", false)
            'n' -> parseLiteral("null", null)
            else -> error("unexpected JS literal character: $ch")
        }
    }
    private fun parseArray(): List<Any?> {
        val result = mutableListOf<Any?>()
        expect('['); skipWhitespace()
        if (peek(']')) { index += 1; return result }
        while (true) {
            result += parseValue()
            skipWhitespace()
            when {
                peek(']') -> { index += 1; return result }
                peek(',') -> index += 1
                else -> error("expected , or ]")
            }
        }
    }
    private fun parseSingleQuoted(): String {
        expect('\'')
        val out = StringBuilder()
        while (index < text.length) {
            val ch = text[index++]
            if (ch == '\'') return out.toString()
            if (ch == '\\' && index < text.length) {
                val esc = text[index++]
                out.append(
                    when (esc) {
                        '\\', '\'', '"' -> esc
                        'n' -> '\n'
                        'r' -> '\r'
                        't' -> '\t'
                        else -> esc
                    },
                )
            } else out.append(ch)
        }
        error("unterminated string")
    }
    private fun parseDoubleQuoted(): String {
        expect('"')
        val out = StringBuilder()
        while (index < text.length) {
            val ch = text[index++]
            if (ch == '"') return out.toString()
            if (ch == '\\' && index < text.length) {
                val esc = text[index++]
                out.append(
                    when (esc) {
                        '\\', '\'', '"' -> esc
                        'n' -> '\n'
                        'r' -> '\r'
                        't' -> '\t'
                        else -> esc
                    },
                )
            } else out.append(ch)
        }
        error("unterminated string")
    }
    private fun parseNumber(): Number {
        val start = index
        if (text[index] == '-') index += 1
        while (index < text.length && text[index].isDigit()) index += 1
        if (index < text.length && text[index] == '.') {
            index += 1
            while (index < text.length && text[index].isDigit()) index += 1
        }
        val raw = text.substring(start, index)
        return if (raw.contains('.')) raw.toDouble() else raw.toLong()
    }
    private fun parseLiteral(token: String, value: Any?): Any? {
        require(text.startsWith(token, index))
        index += token.length
        return value
    }
    private fun skipWhitespace() { while (index < text.length && text[index].isWhitespace()) index += 1 }
    private fun expect(ch: Char) { require(text[index] == ch); index += 1 }
    private fun peek(ch: Char): Boolean = index < text.length && text[index] == ch
}
fun parseJsArrayLiteral(text: String): List<List<Any?>> =
    JsValueParser(text).parseValue() as? List<List<Any?>> ?: emptyList()

fun parseJsObjectStringMap(text: String, name: String): Map<String, String> {
    val match = Regex("""var $name = \{([\s\S]*?)\n\}""").find(text) ?: return emptyMap()
    return Regex("""([A-Za-z0-9_]+)\s*:\s*'([^']+)'""").findAll(match.groupValues[1]).associate { it.groupValues[1] to it.groupValues[2] }
}
fun parseJsObjectTrueSet(text: String, name: String): Set<String> {
    val match = Regex("""var $name = \{([\s\S]*?)\n\}""").find(text) ?: return emptySet()
    return Regex("""'([^']+)'\s*:\s*true""").findAll(match.groupValues[1]).map { it.groupValues[1] }.toSet()
}
fun extractArrayBody(text: String, name: String): String {
    val start = text.indexOf("var $name = [")
    if (start < 0) return ""
    val arrayStart = text.indexOf('[', start)
    var depth = 0
    var quote: Char? = null
    for (i in arrayStart until text.length) {
        val ch = text[i]
        val prev = if (i > 0) text[i - 1] else '\u0000'
        if (quote != null) {
            if (ch == quote && prev != '\\') quote = null
            continue
        }
        if (ch == '\'' || ch == '"') { quote = ch; continue }
        if (ch == '[') depth += 1
        if (ch == ']') {
            depth -= 1
            if (depth == 0) return text.substring(arrayStart, i + 1)
        }
    }
    return ""
}

fun validateEconomy() {
    val tradeFile = "kubejs/server_scripts/35_villager_trades/10_coin_villager_trades.js"
    val text = read(tradeFile)
    val coinOrder = listOf("copper", "zinc", "iron", "industrial_iron", "brass", "gold", "platinum")
    val coinMap = parseJsObjectStringMap(text, "BC_COIN")
    val coinItems = coinMap.values.toSet()
    val missingCoinTiers = coinOrder.filterNot(coinMap::containsKey)
    if (missingCoinTiers.isEmpty()) ok("economy coin tier map is complete", "${coinOrder.size} tiers")
    else fail("economy coin tier map is complete", missingCoinTiers.joinToString(", "))

    val exchangeRows = extractCallArrays(text, "bcAddCoinExchangeTrades").flatten()
    data class Edge(val from: String, val to: String, val input: Double, val output: Double, val rate: Double)
    val exchangeEdges = exchangeRows.map {
        Edge(
            from = it[1].toString(),
            to = it[3].toString(),
            input = (it[2] as Number).toDouble(),
            output = (it[4] as Number).toDouble(),
            rate = (it[4] as Number).toDouble() / (it[2] as Number).toDouble(),
        )
    }
    val invalidExchange = exchangeEdges.filter { it.from !in coinOrder || it.to !in coinOrder || it.input <= 0 || it.output <= 0 }
    if (invalidExchange.isEmpty()) ok("coin exchange rows are well-formed", "${exchangeEdges.size} rows")
    else fail("coin exchange rows are well-formed", invalidExchange.joinToString("; "))

    val distances = coinOrder.associateWith { 0.0 }.toMutableMap()
    var improved = false
    repeat(coinOrder.size) {
        improved = false
        for (edge in exchangeEdges) {
            val weight = -kotlin.math.ln(edge.rate)
            if (distances.getValue(edge.to) > distances.getValue(edge.from) + weight + 1e-12) {
                distances[edge.to] = distances.getValue(edge.from) + weight
                improved = true
            }
        }
    }
    if (improved) fail("coin exchange graph has no profitable conversion cycle", "negative log cycle detected")
    else ok("coin exchange graph has no profitable conversion cycle")

    val copperCost = coinOrder.associateWith { Double.POSITIVE_INFINITY }.toMutableMap()
    copperCost["copper"] = 1.0
    repeat(coinOrder.size) {
        for (edge in exchangeEdges) {
            val fromCost = copperCost.getValue(edge.from)
            if (fromCost.isFinite()) {
                copperCost[edge.to] = minOf(copperCost.getValue(edge.to), fromCost * edge.input / edge.output)
            }
        }
    }
    val blocklist = parseJsObjectTrueSet(text, "BC_NON_GROWN_TRADE_BUY_BLOCKLIST")
    data class Buy(val tier: String, val cost: Double, val item: String, val count: Double, val source: String)
    val buys = mutableListOf<Buy>()
    fun addBuy(tier: String, cost: Number, item: String, count: Number, source: String) {
        if (item in blocklist) return
        buys += Buy(tier, cost.toDouble(), item, count.toDouble(), source)
    }
    val thirtyItems = parseJsArrayLiteral(extractArrayBody(text, "BC_30_ITEMS"))
    thirtyItems.forEachIndexed { i, row ->
        addBuy("copper", 2 + kotlin.math.floor(i / 10.0), row[0].toString(), row[1] as Number, "BC_30 copper")
        addBuy("zinc", 3 + kotlin.math.floor(i / 10.0), row[0].toString(), row[1] as Number, "BC_30 zinc")
        addBuy("iron", 4 + kotlin.math.floor(i / 10.0), row[0].toString(), row[1] as Number, "BC_30 iron")
    }
    for ((tier, arrayName) in listOf("industrial_iron" to "BC_INDUSTRIAL_IRON_MARKET", "gold" to "BC_GOLD_MARKET", "platinum" to "BC_PLATINUM_MARKET")) {
        parseJsArrayLiteral(extractArrayBody(text, arrayName)).forEach { row -> addBuy(tier, row[2] as Number, row[3].toString(), row[4] as Number, arrayName) }
    }
    parseJsArrayLiteral(extractArrayBody(text, "BC_WANDERER_MARKET")).forEach { row -> addBuy(row[1].toString(), row[2] as Number, row[3].toString(), row[4] as Number, "BC_WANDERER_MARKET") }
    extractCallArrays(text, "bcAddTrades").forEach { rows ->
        rows.forEach { row -> addBuy(row[1].toString(), row[2] as Number, row[3].toString(), row[4] as Number, "bcAddTrades") }
    }
    data class Sell(val item: String, val input: Double, val copper: Double)
    val sells = mutableListOf<Sell>()
    extractCallArrays(text, "bcAddSellTrades").forEach { rows ->
        rows.forEach { row -> sells += Sell(row[1].toString(), (row[2] as Number).toDouble(), (row[3] as Number).toDouble()) }
    }
    val sellByItem = mutableMapOf<String, Double>()
    for (sell in sells) {
        if (sell.item in coinItems) fail("coin items are not sell-trade inputs", sell.item)
        sellByItem[sell.item] = maxOf(sellByItem[sell.item] ?: 0.0, sell.copper / sell.input)
    }
    val profitable = mutableListOf<String>()
    for (buy in buys) {
        val tierCost = copperCost.getValue(buy.tier)
        val sellRate = sellByItem[buy.item] ?: continue
        if (!tierCost.isFinite()) continue
        val buyCostPerItem = tierCost * buy.cost / buy.count
        if (sellRate > buyCostPerItem + 1e-9) {
            profitable += "${buy.item}: buy ${buy.cost} ${buy.tier} for ${buy.count} (${String.format("%.3f", buyCostPerItem)} copper/item), sell ${String.format("%.3f", sellRate)} copper/item via ${buy.source}"
        }
    }
    if (profitable.isEmpty()) ok("villager buy/sell trades have no direct profitable item loop", "${buys.size} buys, ${sells.size} sells")
    else fail("villager buy/sell trades have no direct profitable item loop", profitable.take(40).joinToString("\n"))
    val wares = walk("kubejs/data/wares") { it.endsWith(".json") }
    val waresText = wares.joinToString("\n") { read(it) }
    if ("minecraft:emerald" !in waresText) ok("Wares economy has no emerald currency", "${wares.size} tables")
    else fail("Wares economy has no emerald currency", "minecraft:emerald still present")
    if (coinItems.any(waresText::contains)) ok("Wares economy uses coin currency")
    else fail("Wares economy uses coin currency", "no Create Deco coin IDs found")
}

fun validateMagicBody() {
    val candidates = readJson("kubejs/config/food_effect_progression_candidates.json")
    val categories = jsonObject(candidates["categories"])
    val thresholds = mapOf("combat_supply" to 50, "route_survival" to 10, "movement_supply" to 20, "utility_supply" to 10, "strong_nutrition" to 5)
    val categoryFailures = thresholds.mapNotNull { (category, min) ->
        val count = jsonArray(categories[category]).size
        if (count < min) "$category: $count < $min" else null
    }
    if (categoryFailures.isEmpty()) ok("food effect graph has required route/body categories", "${jsonNumber(candidates["foodCount"])?.toInt() ?: 0} foods, ${jsonNumber(candidates["candidateCount"])?.toInt() ?: 0} candidates")
    else fail("food effect graph has required route/body categories", categoryFailures.joinToString(", "))

    val dumpFile = firstExistingFile(foodDumpCandidates())
    if (dumpFile == null) {
        fail("runtime food effect dump exists", if (instance.isNotBlank()) Paths.get(instance).resolve("kubejs/config/food_effect_index.json").toString() else "generated/runtime-dumps/kubejs-config/food_effect_index.json")
    } else {
        val dump = readJsonAbs(dumpFile.file)
        val provenanceProblems = mutableListOf<String>()
        if (jsonString(dump["schema"]) != "bc.food_effect_audit.v2") provenanceProblems += "schema=${jsonString(dump["schema"]) ?: "<missing>"}"
        if (jsonString(dump["generatedBy"]) != "kubejs/server_scripts/90_dev_debug/20_food_effect_audit_dumps.js") provenanceProblems += "generatedBy=${jsonString(dump["generatedBy"]) ?: "<missing>"}"
        if (jsonString(dump["generatedAt"]).isNullOrBlank()) provenanceProblems += "generatedAt=<missing>"
        if (provenanceProblems.isEmpty()) ok("runtime food effect dump has provenance metadata", "${jsonString(dump["schema"])}, ${jsonString(dump["generatedAt"])}")
        else fail("runtime food effect dump has provenance metadata", "${root.relativize(dumpFile.file)}: ${provenanceProblems.joinToString(", ")}")
        val errorCount = jsonNumber(dump["errorCount"])?.toInt() ?: 0
        if (errorCount == 0) ok("runtime food effect dump has no extraction errors", "${jsonNumber(dump["foodCount"])?.toInt() ?: 0} foods from ${root.relativize(dumpFile.file)}")
        else fail("runtime food effect dump has no extraction errors", "$errorCount errors")
        val summaryPath = foodSummaryForIndex(dumpFile.file)
        if (!summaryPath.exists()) fail("runtime food effect summary exists", root.relativize(summaryPath).toString())
        else {
            val summary = readJsonAbs(summaryPath)
            val summaryProblems = mutableListOf<String>()
            if (jsonString(summary["schema"]) != jsonString(dump["schema"])) summaryProblems += "schema=${jsonString(summary["schema"]) ?: "<missing>"}"
            if (jsonString(summary["generatedBy"]) != jsonString(dump["generatedBy"])) summaryProblems += "generatedBy=${jsonString(summary["generatedBy"]) ?: "<missing>"}"
            if (jsonString(summary["generatedAt"]) != jsonString(dump["generatedAt"])) summaryProblems += "generatedAt=${jsonString(summary["generatedAt"]) ?: "<missing>"}"
            if (jsonString(summary["source"]) != jsonString(dump["source"])) summaryProblems += "source mismatch"
            if (jsonNumber(summary["foodCount"])?.toInt() != jsonNumber(dump["foodCount"])?.toInt()) summaryProblems += "foodCount=${jsonNumber(summary["foodCount"])}, index=${jsonNumber(dump["foodCount"])}"
            if (jsonNumber(summary["errorCount"])?.toInt() != jsonNumber(dump["errorCount"])?.toInt()) summaryProblems += "errorCount=${jsonNumber(summary["errorCount"])}, index=${jsonNumber(dump["errorCount"])}"
            if (summaryProblems.isEmpty()) ok("runtime food effect summary matches index", "${jsonNumber(summary["foodCount"])?.toInt() ?: 0} foods")
            else fail("runtime food effect summary matches index", "${root.relativize(summaryPath)}: ${summaryProblems.joinToString(", ")}")
            val logPath = instanceLatestLog()
            if (logPath != null && logPath.exists()) {
                val logText = readAbs(logPath)
                val expectedLine = "[BC-FOOD-AUDIT] foods=${jsonNumber(summary["foodCount"])?.toInt() ?: 0} withEffects=${jsonNumber(summary["foodsWithEffectCount"])?.toInt() ?: 0} errors=${jsonNumber(summary["errorCount"])?.toInt() ?: 0}"
                if (expectedLine in logText) ok("latest log confirms food effect dump emission", expectedLine)
                else fail("latest log confirms food effect dump emission", "missing $expectedLine in $logPath")
            } else if (instance.isNotBlank()) fail("latest log exists for food effect dump correlation", Paths.get(instance).resolve("logs/latest.log").toString())
        }
        val newestSource = newestMtime(listOf("kubejs/server_scripts/90_dev_debug/20_food_effect_audit_dumps.js", "kubejs/config/audit_dumps.json", "kubejs/config/food_effect_progression_candidates.json"))
        if (instance.isBlank() && dumpFile.file == root.resolve("generated/runtime-dumps/kubejs-config/food_effect_index.json")) ok("runtime food effect dump freshness uses generated fallback only", "ignored generated dump is not authoritative runtime evidence")
        else if (newestSource > 0 && dumpFile.mtimeMs + 1000 < newestSource) fail("runtime food effect dump is fresh enough for source inputs", "${root.relativize(dumpFile.file)} is older than food audit sources; rerun a dump-enabled runtime")
        else ok("runtime food effect dump is fresh enough for source inputs")
    }

    val heartText = read("kubejs/server_scripts/40_recipe_add/40_blood_orbs_from_still_beating_hearts.js")
    val recipes = Regex("""addTypedHeartOrbRecipe\(event, '[^']+', '([^']+)', '([^']+)', (\d+), (\d+), (\d+), (\d+)\)""")
        .findAll(heartText)
        .map {
            mapOf(
                "output" to it.groupValues[1],
                "input" to it.groupValues[2],
                "tier" to it.groupValues[3].toInt(),
                "syphon" to it.groupValues[4].toInt(),
                "rate" to it.groupValues[5].toInt(),
                "drain" to it.groupValues[6].toInt(),
            )
        }.toList()
    val typed = recipes.filter { (it["input"] as String).startsWith("kubejs:") && (it["input"] as String).endsWith("_blood_heart") }
    val fallback = recipes.filter { it["input"] == "rpgstats:still_beating_heart" && it["output"] == "bloodmagic:weakbloodorb" }
    val expectedOutputs = listOf("bloodmagic:weakbloodorb", "bloodmagic:apprenticebloodorb", "bloodmagic:magicianbloodorb", "bloodmagic:masterbloodorb", "bloodmagic:archmagebloodorb")
    val heartFailures = mutableListOf<String>()
    if (typed.size != expectedOutputs.size) heartFailures += "expected ${expectedOutputs.size} typed heart-orb recipes, found ${typed.size}"
    if (fallback.size != 1) heartFailures += "expected one still-beating-heart weak orb fallback, found ${fallback.size}"
    for (i in typed.indices) {
        if (typed[i]["output"] != expectedOutputs[i]) heartFailures += "unexpected typed orb at $i: ${typed[i]["output"]}"
        if (i > 0) {
            if ((typed[i]["tier"] as Int) <= (typed[i - 1]["tier"] as Int) ||
                (typed[i]["syphon"] as Int) <= (typed[i - 1]["syphon"] as Int) ||
                (typed[i]["rate"] as Int) <= (typed[i - 1]["rate"] as Int) ||
                (typed[i]["drain"] as Int) <= (typed[i - 1]["drain"] as Int)
            ) heartFailures += "non-monotonic Blood Orb escalation at ${typed[i]["output"]}"
        }
    }
    if (heartFailures.isEmpty()) ok("Blood Orb heart bridge escalates monotonically", "${typed.size} typed orb tiers + weak fallback")
    else fail("Blood Orb heart bridge escalates monotonically", heartFailures.joinToString("\n"))

    val fontHeartTagPath = full("generated/custom-mod-sources/dimension-drink/src/main/resources/data/dimensiondrink/tags/items/font_hearts.json")
    if (!fontHeartTagPath.exists()) fail("Dimension Drink accepts RPG Stats still-beating hearts", root.relativize(fontHeartTagPath).toString() + " is missing")
    else {
        val tag = readJsonAbs(fontHeartTagPath)
        val values = jsonArray(tag["values"]).mapNotNull {
            when (it) {
                is String -> it
                is Map<*, *> -> jsonString(jsonObject(it)["id"])
                else -> null
            }
        }
        if ("rpgstats:still_beating_heart" in values) ok("Dimension Drink accepts RPG Stats still-beating hearts")
        else fail("Dimension Drink accepts RPG Stats still-beating hearts", "${root.relativize(fontHeartTagPath)} is missing rpgstats:still_beating_heart")
    }

    val lifeforce = read("kubejs/server_scripts/30_recipe_replace/82_blood_magic_lifeforce_rework.js")
    val missingMarkers = listOf("bloodmagic:altar", "bloodmagic:daggerofsacrifice", "upgradeLevel(4)", "altarSyphon(60000)", "bloodmagic:etherealslate").filterNot(lifeforce::contains)
    if (missingMarkers.isEmpty()) ok("Blood Magic lifeforce escalation markers exist") else fail("Blood Magic lifeforce escalation markers exist", missingMarkers.joinToString(", "))

    val deathConfig = read("defaultconfigs/configurabledeath-server.toml")
    val noMovingSpawn = read("kubejs/startup_scripts/20_globals/10_immobile_spawn.js")
    val contract = readJson("tools/pack_contract.json")
    val sourceRoot = Paths.get(System.getenv("BC_CUSTOM_MODS_DIR") ?: jsonString(jsonObject(contract["customMods"])["sourceRoot"]).orEmpty())
    val deathSources = listOf(
        deathConfig,
        noMovingSpawn,
        sourceRoot.resolve("rpg-stats/src/main/kotlin/com/example/rpgstats/common/event/CommonForgeEvents.kt"),
        sourceRoot.resolve("rpg-stats/src/main/kotlin/com/example/rpgstats/common/points/PointAwarder.kt"),
        sourceRoot.resolve("rpg-stats/src/main/kotlin/com/example/rpgstats/common/item/StillBeatingHeartData.kt"),
        sourceRoot.resolve("class-selector/src/main/kotlin/com/example/classselector/respawn/PersonalRespawnEvents.kt"),
        sourceRoot.resolve("class-selector/src/main/kotlin/com/example/classselector/respawn/PersonalRespawnSystem.kt"),
    ).joinToString("\n") { if (it is String) it else if ((it as Path).exists()) readAbs(it) else "" }
    val deathSourceMarkers = listOf(
        "keepInventory = true", "keepArmor = true", "keepHotbar = true", "newStats.unspentPoints = 0", "newStats.allocations.clear()",
        "StillBeatingHeartData.create", "createForLevel(player.experienceLevel", "root.putInt(\"level\", level.coerceAtLeast(0))",
        "classselector:respawn_dim", "PlayerSetSpawnEvent", "event.setCanceled(true)",
        "Bed respawn changes are disabled while class spawn is locked.", "playRespawnSoundForPlayer", "spawnRespawnParticlesForPlayer",
    ).filterNot(deathSources::contains)
    if (deathSourceMarkers.isEmpty()) ok("death overhaul source contract keeps items, resets RPG power, and locks respawn")
    else fail("death overhaul source contract keeps items, resets RPG power, and locks respawn", deathSourceMarkers.joinToString(", "))

    val deathDocs = listOf(read("docs/README.md"), read("docs/content_systems.md"), read("docs/progression.md")).joinToString("\n")
    val deathDocMarkers = listOf("death/respawn life-length loop", "life-length and location penalty", "rpgstats:still_beating_heart", "lifePeakLevel", "classselector:respawn_*", "sound and particle FX", "very-late-game exception").filterNot(deathDocs::contains)
    if (deathDocMarkers.isEmpty()) ok("death overhaul is covered in living docs") else fail("death overhaul is covered in living docs", deathDocMarkers.joinToString(", "))

    val starterSources = mutableListOf<Pair<String, String>>()
    jsonArray(readJson("config/classselector/kits.json")).map(::jsonObject).forEach { kit ->
        jsonArray(kit["items"]).map(::jsonObject).forEach { entry -> starterSources += "kit:${jsonString(kit["id"]) ?: ""}" to (jsonString(entry["item"]) ?: "") }
    }
    jsonArray(readJson("config/classselector/embark.json")["items"]).map(::jsonObject).forEach { entry ->
        starterSources += "embark:${jsonString(entry["id"]) ?: ""}" to (jsonString(entry["item"]) ?: "")
    }
    val forbiddenPrefixes = listOf("ae2:", "advanced_ae:", "pneumaticcraft:", "bloodmagic:", "creatingspace:", "wares:", "protection_pixel:", "sophisticatedbackpacks:", "sophisticatedstorage:")
    val forbiddenExact = setOf("create:track", "create:track_station", "create:controller_rail", "create:precision_mechanism", "minecraft:tnt", "minecraft:flint_and_steel", "minecraft:gunpowder", "minecraft:fire_charge", "farmersdelight:flint_knife", "tconstruct:hand_axe", "quark:seed_pouch")
    val forbiddenPatterns = listOf(
        Regex("""(^|:).*(^|_)(log|wood|planks)$"""),
        Regex("""(^|:).*(pickaxe|_axe|shovel|hoe|sword|knife|hammer|saw|mattock|excavator)$"""),
        Regex("""(^|:).*(chest|barrel|crate|basket|backpack|pouch|sack)$"""),
    )
    val forbiddenStarterItems = starterSources.mapNotNull { (source, item) ->
        if (forbiddenPrefixes.any(item::startsWith) || item in forbiddenExact || forbiddenPatterns.any { it.containsMatchIn(item) }) "$source: $item" else null
    }
    if (forbiddenStarterItems.isEmpty()) ok("starting options avoid tools, storage, logs, and missing-logistics progression items", "${jsonArray(readJson("config/classselector/kits.json")).size} kits, ${jsonArray(jsonObject(readJson("config/classselector/embark.json"))["items"]).size} embark items")
    else fail("starting options avoid tools, storage, logs, and missing-logistics progression items", forbiddenStarterItems.joinToString("\n"))
}

fun validateClientQuestIntent() {
    val liveQuestFiles = walk("config/ftbquests") { it.endsWith(".snbt") }
    val liveQuestContent = liveQuestFiles.filterNot { it.endsWith("client-config.snbt") }
    val liveChapters = liveQuestContent.filter { "/chapters/" in it || "\\chapters\\" in it }
    val liveQuestCount = liveChapters.sumOf { Regex("""\btasks:\s*\[""").findAll(read(it)).count() }
    if (liveChapters.isNotEmpty() && liveQuestCount > 0) ok("live FTB quest content is present", "${liveChapters.size} chapter file(s), $liveQuestCount quest task block(s)")
    else fail("live FTB quest content is present", "chapters=${liveChapters.size}, quest_task_blocks=$liveQuestCount")
    val generatedQuestFiles = walk("generated/ftbquests") { it.endsWith(".snbt") }
    if (generatedQuestFiles.size >= 4) ok("generated quest output remains available for regeneration audits", "${generatedQuestFiles.size} generated files")
    else fail("generated quest output remains available for regeneration audits", "${generatedQuestFiles.size} files")
    val hidden = read("kubejs/client_scripts/40_hide_quarantined_systems.js")
    val remove = read("kubejs/server_scripts/20_recipe_remove/30_remove_items.js")
    val missing = listOf("alchemistry:dissolver", "alchemistry:fusion_chamber_controller", "occultism:miner_foliot_unspecialized", "sophisticatedbackpacks:stack_upgrade_omega_tier", "pneumaticcraft:creative_compressor")
        .filter { it !in hidden || it !in remove }.toMutableList()
    if ("JEIEvents.hideItems" !in hidden || "EMIEvents.hideItems" !in hidden) missing += "JEI/EMI dual hide hooks"
    if (missing.isEmpty()) ok("quarantined items are removed and hidden from JEI/EMI source hooks", "5 anchors")
    else fail("quarantined items are removed and hidden from JEI/EMI source hooks", missing.joinToString(", "))
}

fun validateVanillaStyleToolSuppression() {
    val server = read("kubejs/server_scripts/30_recipe_replace/60_vanilla_tools_to_tcon_heads.js")
    val client = read("kubejs/client_scripts/20_hide_vanilla_tools.js")
    val requiredToolMarkers = listOf("minecraft:", "ae2", "aether", "deeperdarker", "everythingcopper", "forbidden_arcanus", "goety", "malum", "occultism:iesnium_pickaxe", "undergarden", "twilightforest:ironwood_pickaxe", "ars_nouveau:enchanters_sword", "create:cardboard_sword", "farmersdelight:flint_knife", "notreepunching:flint_pickaxe", "notreepunching:iron_saw", "rpgstats:iron_ritual_dagger", "undergarden:forgotten_battleaxe")
    val missingToolMarkers = requiredToolMarkers.filter { it !in server || it !in client }
    if (missingToolMarkers.isEmpty()) ok("vanilla-style tool suppression covers audited mod families", "${requiredToolMarkers.size} markers")
    else fail("vanilla-style tool suppression covers audited mod families", missingToolMarkers.joinToString(", "))
    val serverNeedles = listOf("event.remove({ output: tool })", "event.remove({ id: tool })", "event.remove({ type: tool })", "event.remove({ type: 'minecraft:smithing_transform', output: tool })", "BC_VANILLA_STYLE_TOOL_RECIPE_IDS", "occultism:ritual/craft_infused_pickaxe", "event.add('c:hidden_from_recipe_viewers'", "bcItemExists")
    val missingServerNeedles = serverNeedles.filterNot(server::contains)
    if (missingServerNeedles.isEmpty()) ok("vanilla-style tools are blocked from crafting and recipe viewers server-side", "${serverNeedles.size} hooks")
    else fail("vanilla-style tools are blocked from crafting and recipe viewers server-side", missingServerNeedles.joinToString(", "))
    val missingClientNeedles = listOf("JEIEvents.hideItems", "EMIEvents.hideItems").filterNot(client::contains)
    if (missingClientNeedles.isEmpty()) ok("vanilla-style tools are hidden from JEI and EMI") else fail("vanilla-style tools are hidden from JEI and EMI", missingClientNeedles.joinToString(", "))
    val forbiddenFamilies = listOf("['tconstruct'", "\"tconstruct\"").filter { it in server || it in client }
    if (forbiddenFamilies.isEmpty()) ok("vanilla-style tool suppression avoids TConstruct tool-building entries") else fail("vanilla-style tool suppression avoids TConstruct tool-building entries", forbiddenFamilies.joinToString(", "))
    val skippedRemovalNeedles = listOf("if (!bcItemExists(tool)) continue", "if (bcItemExists(tool)) event.remove").filter(server::contains)
    if (skippedRemovalNeedles.isEmpty()) ok("vanilla-style tool recipe removals are unconditional") else fail("vanilla-style tool recipe removals are unconditional", skippedRemovalNeedles.joinToString(", "))
}

fun validateRealisticHands() {
    val tagRoot = "generated/custom-mod-sources/better-content-fixes/src/main/resources/data/bcfixes/tags"
    val blockTag = readJson("$tagRoot/blocks/realistic_hands/axe.json")
    val itemTag = readJson("$tagRoot/items/realistic_hands/tools/axe.json")
    val blockValues = jsonArray(blockTag["values"]).mapNotNull(::jsonString).toSet()
    val itemValues = jsonArray(itemTag["values"]).mapNotNull(::jsonString).toSet()
    if (blockValues == setOf("#minecraft:logs") && itemValues == setOf("#forge:tools/axes")) {
        ok("Realistic Hands retains only the no-tree-punching tag gate")
    } else fail("Realistic Hands retains only the no-tree-punching tag gate", "blocks=$blockValues tools=$itemValues")
    val blockFiles = walk("$tagRoot/blocks/realistic_hands") { it.endsWith(".json") }
    val itemFiles = walk("$tagRoot/items/realistic_hands/tools") { it.endsWith(".json") }
    if (blockFiles.size == 1 && itemFiles.size == 1) ok("Realistic Hands runtime tags exclude exhaustive policy data")
    else fail("Realistic Hands runtime tags exclude exhaustive policy data", "blockFiles=${blockFiles.size} itemFiles=${itemFiles.size}")
    val quarantine = "generated/custom-mod-sources/better-content-fixes/quarantine/realistic-hands-exhaustive-policy"
    if (exists("$quarantine/README.md") && exists("$quarantine/resources/tags/blocks/knife.json") && exists("$quarantine/java/RealisticHandsKnifeLootModifier.java")) {
        ok("exhaustive Realistic Hands policy remains quarantined outside runtime resources")
    } else fail("exhaustive Realistic Hands policy remains quarantined outside runtime resources", quarantine)
    val retiredLogOverrides = "tools/quarantine/realistic-hands-exhaustive-policy/retired-log-tag-overrides"
    val activeLogs = readJson("kubejs/data/minecraft/tags/blocks/logs.json")
    val activeBurnableLogs = readJson("kubejs/data/minecraft/tags/blocks/logs_that_burn.json")
    val activeItemLogs = readJson("kubejs/data/minecraft/tags/items/logs.json")
    val activeBurnableItemLogs = readJson("kubejs/data/minecraft/tags/items/logs_that_burn.json")
    val coreLogTags = setOf("#minecraft:acacia_logs", "#minecraft:birch_logs", "#minecraft:cherry_logs", "#minecraft:dark_oak_logs", "#minecraft:jungle_logs", "#minecraft:mangrove_logs", "#minecraft:oak_logs", "#minecraft:spruce_logs")
    if (jsonArray(activeLogs["values"]).mapNotNull(::jsonString).toSet() == coreLogTags &&
        jsonArray(activeBurnableLogs["values"]).mapNotNull(::jsonString).toSet() == coreLogTags &&
        jsonArray(activeItemLogs["values"]).mapNotNull(::jsonString).toSet() == coreLogTags &&
        jsonArray(activeBurnableItemLogs["values"]).mapNotNull(::jsonString).toSet() == coreLogTags &&
        exists("$retiredLogOverrides/logs.json") && exists("$retiredLogOverrides/logs_that_burn.json") &&
        exists("$retiredLogOverrides/item_logs.json") && exists("$retiredLogOverrides/item_logs_that_burn.json")) {
        ok("stale pack-wide Minecraft log overrides remain quarantined")
    } else fail("stale pack-wide Minecraft log overrides remain quarantined", retiredLogOverrides)
    val compat = read("generated/custom-mod-sources/better-content-fixes/src/main/java/io/github/bcfixes/compat/RealisticHandsCompat.java")
    val requiredCompat = listOf("state.is(RealisticHandsTags.AXE)", "stack.is(RealisticHandsTags.AXE_TOOLS)")
    val forbiddenCompat = listOf("RealisticHandsTags.KNIFE", "RealisticHandsTags.PICKAXE", "damageKnife")
    val compatProblems = requiredCompat.filterNot(compat::contains) + forbiddenCompat.filter(compat::contains)
    if (compatProblems.isEmpty()) ok("Forge enforcement is scoped to logs and axes")
    else fail("Forge enforcement is scoped to logs and axes", compatProblems.joinToString(", "))
    val retiredHook = read("kubejs/startup_scripts/20_blocks/20_realistic_hands.js")
    val retiredAssignments = read("kubejs/startup_scripts/99_realistic_hands_assignments.js")
    val retiredLoot = read("kubejs/server_scripts/50_loot/11_realistic_hands_outcomes.js")
    val retiredMarkers = listOf("global.BC_REALISTIC_HANDS_ASSIGNMENTS", "ForgeEvents.onEvent(", "LootJS.modifiers(")
    val leaked = retiredMarkers.filter { it in retiredHook || it in retiredAssignments || it in retiredLoot }
    if (leaked.isEmpty()) ok("Realistic Hands KubeJS runtime ownership is retired")
    else fail("Realistic Hands KubeJS runtime ownership is retired", leaked.joinToString(", "))
}

// Remaining sections are direct text/JSON audits translated from the JS validator.
// They stay explicit rather than abstract so the contract remains easy to diff against the original source.
fun validatePrimitiveMiningRegressionContracts() = validateByNodeParity("validatePrimitiveMiningRegressionContracts") {
    fun ingredientCount(recipe: Map<String, Any?>, item: String): Int = jsonArray(recipe["ingredients"]).map(::jsonObject).count { jsonString(it["item"]) == item }
    val butcherKnife = readJson("kubejs/data/kubejs/recipes/primitive/flint_butcher_knife.json")
    val handAxe = readJson("kubejs/data/kubejs/recipes/primitive/flint_hand_axe.json")
    val knifeProblems = mutableListOf<String>()
    if (jsonString(jsonObject(butcherKnife["result"])["item"]) != "additionalweaponry:butcher_knife") knifeProblems += "result=${jsonString(jsonObject(butcherKnife["result"])["item"])}"
    if (ingredientCount(butcherKnife, "minecraft:flint") != 3) knifeProblems += "flint count"
    if (ingredientCount(butcherKnife, "minecraft:stick") != 1) knifeProblems += "stick count"
    val knifeNbt = jsonString(jsonObject(butcherKnife["result"])["nbt"]).orEmpty()
    if ("tconstruct:flint" !in knifeNbt || "tconstruct:wood" !in knifeNbt) knifeProblems += "TConstruct flint/wood NBT"
    if (knifeProblems.isEmpty()) ok("flint/wood butcher knife primitive recipe remains craftable") else fail("flint/wood butcher knife primitive recipe remains craftable", knifeProblems.joinToString(", "))
    val axeProblems = mutableListOf<String>()
    if (jsonString(jsonObject(handAxe["result"])["item"]) != "tconstruct:hand_axe") axeProblems += "result=${jsonString(jsonObject(handAxe["result"])["item"])}"
    if (ingredientCount(handAxe, "minecraft:flint") != 2) axeProblems += "flint count"
    if (ingredientCount(handAxe, "farmersdelight:straw") != 1) axeProblems += "straw count"
    if (ingredientCount(handAxe, "minecraft:stick") != 1) axeProblems += "stick count"
    val axeNbt = jsonString(jsonObject(handAxe["result"])["nbt"]).orEmpty()
    if ("tconstruct:flint" !in axeNbt || "tconstruct:wood" !in axeNbt) axeProblems += "TConstruct flint/wood NBT"
    if (axeProblems.isEmpty()) ok("straw/flint/stick hand axe primitive recipe remains craftable") else fail("straw/flint/stick hand axe primitive recipe remains craftable", axeProblems.joinToString(", "))
    val fdKnives = readJson("kubejs/data/farmersdelight/tags/items/tools/knives.json")
    val fdStrawHarvesters = readJson("kubejs/data/farmersdelight/tags/items/straw_harvesters.json")
    val knifeTagProblems = mutableListOf<String>()
    if ("additionalweaponry:butcher_knife" !in jsonArray(fdKnives["values"]).mapNotNull(::jsonString)) knifeTagProblems += "farmersdelight:tools/knives"
    if ("additionalweaponry:butcher_knife" !in jsonArray(fdStrawHarvesters["values"]).mapNotNull(::jsonString)) knifeTagProblems += "farmersdelight:straw_harvesters"
    if (knifeTagProblems.isEmpty()) ok("flint butcher knife remains a Farmer Delight straw harvester") else fail("flint butcher knife remains a Farmer Delight straw harvester", knifeTagProblems.joinToString(", "))
    val tconPatternRoutes = read("kubejs/server_scripts/30_recipe_replace/98_starting_progression_bypasses.js")
    val tconPatternMarkers = listOf("event.remove({ id: 'tconstruct:common/pattern' })","event.remove({ id: 'tconstruct:tables/pattern' })","event.remove({ id: 'tconstruct:pattern' })","event.remove({ type: 'minecraft:crafting_shaped', output: 'tconstruct:pattern' })","event.remove({ type: 'minecraft:crafting_shapeless', output: 'tconstruct:pattern' })","event.shaped(Item.of('tconstruct:pattern', 4)","C: 'farmersdelight:canvas'","type: 'create:pressing'","{ item: 'minecraft:paper' }","{ item: 'tconstruct:pattern' }").filterNot(tconPatternRoutes::contains)
    if (tconPatternMarkers.isEmpty()) ok("TConstruct pattern routes use canvas grid and Create paper pressing") else fail("TConstruct pattern routes use canvas grid and Create paper pressing", tconPatternMarkers.joinToString(", "))
    val startingBypasses = tconPatternRoutes
    val flintBypassMarkers = listOf("event.remove({ id: 'tconstruct:common/materials/flint_from_gravel' })","event.remove({ id: 'tconstruct:materials/flint_from_gravel' })","event.remove({ id: 'tconstruct:flint_from_gravel' })","event.remove({ type: 'minecraft:crafting_shapeless', input: 'minecraft:gravel', output: 'minecraft:flint' })","kubejs:create/milling/gravel_to_flint_and_gunpowder").filterNot(startingBypasses::contains)
    if (flintBypassMarkers.isEmpty()) ok("TConstruct shapeless gravel-to-flint shortcut stays removed") else fail("TConstruct shapeless gravel-to-flint shortcut stays removed", flintBypassMarkers.joinToString(", "))
    val gravelBlockDrops = read("kubejs/server_scripts/50_loot/10_overworld_block_drops.js")
    if ("{ item: 'minecraft:gunpowder', chance: 0.06 }" in startingBypasses && "m.addLoot(\"minecraft:gunpowder\").randomChance(0.125)" in gravelBlockDrops) ok("gunpowder from gravel stays at reduced chance")
    else fail("gunpowder from gravel stays at reduced chance", "expected Create milling 0.06 and gravel block loot 0.125")
    val hardnessProbe = readJson("kubejs/config/block_hardness_probe.json")
    val hardnessIds = jsonArray(hardnessProbe["blockIds"]).mapNotNull(::jsonString).toSet()
    val orePairs = listOf("coal","copper","iron","gold","redstone","lapis","diamond","emerald")
    val missingOreProbeIds = mutableListOf<String>()
    for (ore in orePairs) {
        if ("minecraft:${ore}_ore" !in hardnessIds) missingOreProbeIds += "minecraft:${ore}_ore"
        if ("minecraft:deepslate_${ore}_ore" !in hardnessIds) missingOreProbeIds += "minecraft:deepslate_${ore}_ore"
    }
    if (missingOreProbeIds.isEmpty()) ok("hardness probe covers ore tier and deepslate representative pairs", "${orePairs.size} ore families") else fail("hardness probe covers ore tier and deepslate representative pairs", missingOreProbeIds.joinToString(", "))
    val hardnessDump = firstExistingFile(listOf(full("generated/runtime-dumps/block_hardness_probe.json")))
    if (hardnessDump == null) ok("deepslate ore hardness runtime check is probe-ready", "no retained block_hardness_probe.json")
    else {
        val dump = readJsonAbs(hardnessDump.file)
        val rows = (jsonArray(dump["allBlocks"]) + jsonArray(dump["selectedBlocks"])).map(::jsonObject)
        val byId = rows.associateBy { jsonString(it["id"]).orEmpty() }
        val deepslateProblems = mutableListOf<String>()
        for (ore in orePairs) {
            val normal = jsonNumber(byId["minecraft:${ore}_ore"]?.get("defaultDestroyTime"))?.toDouble()
            val deep = jsonNumber(byId["minecraft:deepslate_${ore}_ore"]?.get("defaultDestroyTime"))?.toDouble()
            if (normal == null || deep == null || kotlin.math.abs(deep - normal - 1.5) > 0.001) deepslateProblems += "$ore: $normal->$deep"
        }
        if (deepslateProblems.isEmpty()) ok("deepslate ore variants add exactly +1.5 hardness in retained runtime probe") else fail("deepslate ore variants add exactly +1.5 hardness in retained runtime probe", deepslateProblems.joinToString(", "))
    }
}

fun validateVanillishExpertRecipePass() = validateSimpleRecipePass(
    "kubejs/server_scripts/30_recipe_replace/145_vanillish_recipe_expert_pass.js",
    listOf("event.shaped(", "event.shapeless(", "event.smelting(", "event.blasting("),
    listOf("create:deploying","create:compacting","minecraft:piston","minecraft:hopper","minecraft:observer","minecraft:rail","minecraft:minecart","everythingcopper:copper_hopper","chemlibDustIngots","bcVanRemoveCooking(event, 'minecraft:iron_ingot')","ae2:silicon"),
    listOf("bloodmagic:alchemytable","minecraft:brewing_stand","minecraft:enchanting_table","minecraft:beacon","bloodmagic:ingot_hellforged","ars_nouveau:scribes_table","ars_nouveau:imbuement_chamber","ars_nouveau:enchanting_apparatus","bloodmagic:reinforcedslate","bloodmagic:infusedslate","bloodmagic:etherealslate"),
)

fun validateSimpleRecipePass(file: String, forbiddenConstructors: List<String>, createMarkers: List<String>, bloodMarkers: List<String>) {
    if (!exists(file)) return fail("vanillish recipe expert pass exists", file)
    val text = read(file)
    val forbidden = forbiddenConstructors.filter(text::contains)
    if (forbidden.isEmpty()) ok("vanillish recipe pass does not add grid or furnace recipes") else fail("vanillish recipe pass does not add grid or furnace recipes", forbidden.joinToString(", "))
    val missingCreate = createMarkers.filterNot(text::contains)
    if (missingCreate.isEmpty()) ok("vanillish non-magic shortcuts retain authored non-grid Create surfaces where intended", "${createMarkers.size} markers") else fail("vanillish non-magic shortcuts retain authored non-grid Create surfaces where intended", missingCreate.joinToString(", "))
    val missingBlood = bloodMarkers.filterNot(text::contains)
    if (missingBlood.isEmpty()) ok("vanillish magic shortcuts are routed to Blood Magic alchemy", "${bloodMarkers.size} markers") else fail("vanillish magic shortcuts are routed to Blood Magic alchemy", missingBlood.joinToString(", "))
}

fun validateNonGrownInfiniteResourceBoundaries() {
    val remove = read("kubejs/server_scripts/20_recipe_remove/30_remove_items.js")
    val hidden = read("kubejs/client_scripts/40_hide_quarantined_systems.js")
    val trades = read("kubejs/server_scripts/35_villager_trades/10_coin_villager_trades.js")
    val docs = listOf(read("docs/content_systems.md"), read("docs/progression.md")).joinToString("\n")
    val removeMarkers = listOf("event.remove({ type: 'occultism:miner' })","event.remove({ type: 'bloodmagic:dimension_drink' })","event.remove({ id: 'createdieselgenerators:bulk_fermenting/lava' })","event.remove({ id: 'ars_nouveau:water_essence_to_bucket' })","ars_nouveau:glyph_conjure_water","bloodmagic:watersigil","bloodmagic:lavasigil").filterNot(remove::contains)
    if (removeMarkers.isEmpty()) ok("non-grown infinite resource recipe sources are quarantined", "7 markers") else fail("non-grown infinite resource recipe sources are quarantined", removeMarkers.joinToString(", "))
    val hiddenMarkers = listOf("JEIEvents.hideItems","EMIEvents.hideItems","ars_nouveau:ritual_conjure_island_plains","ars_nouveau:glyph_conjure_water","bloodmagic:watersigil","bloodmagic:lavasigil").filterNot(hidden::contains)
    if (hiddenMarkers.isEmpty()) ok("non-grown infinite resource shortcuts are hidden from JEI/EMI", "6 markers") else fail("non-grown infinite resource shortcuts are hidden from JEI/EMI", hiddenMarkers.joinToString(", "))
    val create = read("defaultconfigs/create-server.toml")
    val missingCreateMarkers = listOf("hosePulleyBlockThreshold = -1","bottomlessFluidMode = \"DENY_ALL\"","fluidFillPlaceFluidSourceBlocks = false","pipesPlaceFluidSourceBlocks = false").filterNot(create::contains)
    if (missingCreateMarkers.isEmpty()) ok("Create config disables bottomless fluid sources and source placement") else fail("Create config disables bottomless fluid sources and source placement", missingCreateMarkers.joinToString(", "))
    val finiteWater = readJson("config/flowing_fluids.json")
    val finiteWaterProblems = mutableListOf<String>()
    listOf("rainRefillChance","oceanRiverSwampRefillChance","infiniteWaterBiomeNonConsumeChance","infiniteWaterBiomeDrainSurfaceChance").forEach { key ->
        if ((jsonNumber(finiteWater[key])?.toInt() ?: 0) != 0) finiteWaterProblems += "$key=${jsonNumber(finiteWater[key])}"
    }
    if (bool(finiteWater["create_infinitePipes"]) != false) finiteWaterProblems += "create_infinitePipes=${bool(finiteWater["create_infinitePipes"])}"
    if (finiteWaterProblems.isEmpty()) ok("Finite Water config has no infinite biome/refill pipe sources") else fail("Finite Water config has no infinite biome/refill pipe sources", finiteWaterProblems.joinToString(", "))
    val tradeMarkers = listOf("BC_NON_GROWN_TRADE_BUY_BLOCKLIST","bcIsNonGrownInfiniteBuyResult(resultItem)","'minecraft:experience_bottle': true","'minecraft:echo_shard': true","'minecraft:sculk_catalyst': true").filterNot(trades::contains)
    if (tradeMarkers.isEmpty()) ok("restocking trades reject deep-progression buy results", "5 markers") else fail("restocking trades reject deep-progression buy results", tradeMarkers.joinToString(", "))
    val docMarkers = listOf("Non-grown infinite matter is not an authored resource source","villager buy restocks only skip knowledge and deep-progression outputs such as experience bottles, echo shards, and sculk catalysts").filterNot(docs::contains)
    if (docMarkers.isEmpty()) ok("living docs cover non-grown infinite resource policy") else fail("living docs cover non-grown infinite resource policy", docMarkers.joinToString(", "))
}

// The remaining three validators are still large but mainly deterministic text/JSON audits.
// Keep them as translated source checks so the port removes the Node runtime dependency.
fun validateWorldgenStaticContracts() = validateWorldgenStaticContractsImpl()
fun validateDimensionProofGraphStarts() = validateDimensionProofGraphStartsImpl()
fun validateDimensionTravelRoutes() = validateDimensionTravelRoutesImpl()
fun validateCustomModProvenanceSignals() = validateCustomModProvenanceSignalsImpl()

// Implementations preserved from the JS source with minimal structural change.
// To keep this script manageable, they are split into dedicated helpers below.

fun validateByNodeParity(name: String, block: () -> Unit) = block()

// BEGIN translated large helpers
fun validateWorldgenStaticContractsImpl() {
    val rbpOverworld = read("config/rbp/world_definitions/overworld.toml")
    if ("DefaultBlockDefinition = \"\"" in rbpOverworld) ok("RBP Overworld physics is explicit-definition only")
    else fail("RBP Overworld physics is explicit-definition only", "DefaultBlockDefinition must be empty to avoid fallback physics on decorative/support-sensitive mod blocks")
    val generatedPackSolid = read("config/rbp/block_definitions/generated_pack_solid_blocks.toml")
    val generatedPackSolidIds = Regex(""""([a-z0-9_.-]+:[a-z0-9_/.-]+)"""").findAll(generatedPackSolid).map { it.groupValues[1] }.toList()
    val generatedPackSolidSet = generatedPackSolidIds.toSet()
    if (generatedPackSolidIds.size >= 8500 && "minecraft:bedrock" !in generatedPackSolidSet) ok("RBP generated pack-solid definition covers broad solid block surface", "${generatedPackSolidIds.size} explicit ids")
    else fail("RBP generated pack-solid definition covers broad solid block surface", "${generatedPackSolidIds.size} explicit ids; bedrock included=${"minecraft:bedrock" in generatedPackSolidSet}")
    val dynamicTreesManagedRbpPatterns = listOf(Regex("""^dynamictrees:"""), Regex("""^dynamictreesplus:"""), Regex("""^bcdimtrees:"""), Regex("""^dt[a-z0-9_]*:"""))
    val dynamicTreesManagedPackSolidIds = generatedPackSolidIds.filter { id -> dynamicTreesManagedRbpPatterns.any { it.containsMatchIn(id) } }
    if (dynamicTreesManagedPackSolidIds.isEmpty()) ok("RBP generated pack-solid definition excludes Dynamic Trees-managed blocks")
    else fail("RBP generated pack-solid definition excludes Dynamic Trees-managed blocks", dynamicTreesManagedPackSolidIds.take(20).joinToString(", "))
    val pvjDetailPackSolidBlocklist = setOf(
        "projectvibrantjourneys:bones",
        "projectvibrantjourneys:charred_bones",
        "projectvibrantjourneys:dead_fallen_leaves",
        "projectvibrantjourneys:fallen_leaves",
        "projectvibrantjourneys:ice_chunks",
        "projectvibrantjourneys:icicle",
        "projectvibrantjourneys:pinecones",
        "projectvibrantjourneys:pink_lotus",
        "projectvibrantjourneys:red_sandstone_rocks",
        "projectvibrantjourneys:rocks",
        "projectvibrantjourneys:sandstone_rocks",
        "projectvibrantjourneys:seashells",
        "projectvibrantjourneys:slime_nodule",
        "projectvibrantjourneys:twigs"
    )
    val pvjDetailPackSolidIds = generatedPackSolidIds.filter { it in pvjDetailPackSolidBlocklist }
    if (pvjDetailPackSolidIds.isEmpty()) ok("RBP generated pack-solid definition excludes exact PVJ loose detail blocks")
    else fail("RBP generated pack-solid definition excludes exact PVJ loose detail blocks", pvjDetailPackSolidIds.joinToString(", "))
    val generatedModdedSandText = read("config/rbp/block_definitions/generated_modded_sand.toml")
    val looseEarthIds = Regex(""""([a-z0-9_.-]+:[a-z0-9_/.-]+)"""").findAll(generatedModdedSandText)
        .map { it.groupValues[1] }
        .filter { id -> listOf("sand", "gravel", "dirt", "mud", "regolith", "loam", "silt", "soil").any(id::contains) }
        .filterNot { it.startsWith("notreepunching:") }
        .toList()
    val generatedRbpWhitelistFiles = walk("config/rbp/block_definitions") { it.substringAfterLast('/').startsWith("generated_modded_") && it.endsWith(".toml") }
    val generatedRbpWhitelistText = generatedRbpWhitelistFiles.joinToString("\n") { read(it) }
    val generatedRbpWhitelistIds = generatedRbpWhitelistText.lineSequence().map(String::trim).filter { it.startsWith('"') }.map { it.replace(Regex("""^"([^"]+)".*$"""), "$1") }.toList()
    if (generatedRbpWhitelistFiles.size >= 10 && generatedRbpWhitelistIds.size >= 4000) ok("RBP modded whitelist covers broad explicit block surface", "${generatedRbpWhitelistIds.size} ids in ${generatedRbpWhitelistFiles.size} files")
    else fail("RBP modded whitelist covers broad explicit block surface", "${generatedRbpWhitelistIds.size} ids in ${generatedRbpWhitelistFiles.size} files")
    val forbiddenPatterns = listOf(Regex("""(^|:)bedrock$"""), Regex("""sky_stone|skystone"""), *dynamicTreesManagedRbpPatterns.toTypedArray(), Regex("""^projectvibrantjourneys:"""), Regex("""(^|[_:/])seashell($|[_:/])"""), Regex("""(^|[_:/])shell($|[_:/])"""))
    val allowedRooty = listOf(Regex("""^dynamictrees:rooty_(coarse_dirt|crimson_nylium|dirt|grass_block|moss|moss_block|mud|mycelium|podzol|rooted_dirt|soul_soil|warped_nylium)$"""), Regex("""^dtaether:rooty_(aether_dirt|aether_grass_block|enchanted_aether_grass_block|frozen_aether_grass_block)$"""), Regex("""^dtnatures_spirit:rooty_(red_moss_block|sandy_soil)$"""))
    val allowedLooseDecorIds = setOf(
        "projectvibrantjourneys:muddy_bones",
        "projectvibrantjourneys:red_sandstone_rocks",
        "projectvibrantjourneys:sandstone_rocks"
    )
    val forbiddenIds = generatedRbpWhitelistIds.filter { id ->
        allowedRooty.none { it.containsMatchIn(id) } &&
            id !in allowedLooseDecorIds &&
            id !in looseEarthIds &&
            forbiddenPatterns.any { it.containsMatchIn(id) }
    }
    if (forbiddenIds.isEmpty()) ok("RBP generated whitelist excludes lifecycle/progression/decor-sensitive blocks") else fail("RBP generated whitelist excludes lifecycle/progression/decor-sensitive blocks", forbiddenIds.take(20).joinToString(", "))
    val tectonic = readJson("config/tectonic.json")
    val terrain = jsonObject(tectonic["global_terrain"])
    if ((jsonNumber(terrain["min_y"])?.toInt() == -128) && bool(terrain["lava_tunnels"]) == true) ok("Tectonic Overworld exposes lava-depth terrain band", "min_y=${jsonNumber(terrain["min_y"])}, lava_tunnels=${bool(terrain["lava_tunnels"])}")
    else fail("Tectonic Overworld exposes lava-depth terrain band", "min_y=${jsonNumber(terrain["min_y"])}, lava_tunnels=${bool(terrain["lava_tunnels"])}")
    val adlodDeposits = walk("config/adlods/Deposits") { it.endsWith(".cfg") }
    if (adlodDeposits.size >= 40) ok("ADLODS deposit surface covers bulk and strategic geology", "${adlodDeposits.size} deposits") else fail("ADLODS deposit surface covers bulk and strategic geology", "${adlodDeposits.size} < 40")
    if (exists("config/adlods/Deposits/magnetite.cfg")) fail("retired Create New Age magnetite deposit stays absent", "config/adlods/Deposits/magnetite.cfg") else ok("retired Create New Age magnetite deposit stays absent")

    val adlodCompositeHosts = mapOf(
        "coal.cfg" to "realisticores:coal_measures",
        "iron.cfg" to "realisticores:ironstone",
        "copper.cfg" to "realisticores:copper_sulfide_ore",
        "lead.cfg" to "realisticores:lead_zinc_vein",
        "aluminum.cfg" to "realisticores:bauxite_laterite",
        "nickel.cfg" to "realisticores:nickel_sulfide_ore",
        "diamond.cfg" to "realisticores:kimberlite_pipe"
    )
    val invalidCompositeFields = adlodCompositeHosts.mapNotNull { (file, host) ->
        val path = "config/adlods/Deposits/$file"
        val text = read(path)
        if (host in text && "#realisticores:overworld_ore_replaceables" in text && "realisticores:crushed_" in text) null else path
    }
    if (invalidCompositeFields.isEmpty()) ok("ADLODS bulk fields use host-correct Realistic Ores geology", "${adlodCompositeHosts.size} representatives")
    else fail("ADLODS bulk fields use host-correct Realistic Ores geology", invalidCompositeFields.joinToString(", "))

    val enrichmentFiles = listOf("gold", "silver", "cobalt", "platinum", "palladium", "osmium", "iridium", "rhodium", "ruthenium", "amethyst", "ruby", "sapphire", "topaz")
    val independentlyCommonEnrichments = enrichmentFiles.filter { "I:rarity=256000" !in read("config/adlods/Deposits/$it.cfg") }
    if (independentlyCommonEnrichments.isEmpty()) ok("associated enrichments are descendant-first", "${enrichmentFiles.size} capped standalone rarities")
    else fail("associated enrichments are descendant-first", independentlyCommonEnrichments.joinToString(", "))

    val nickelField = read("config/adlods/Deposits/nickel.cfg")
    val missingNickelDescendants = listOf("deposit:cobalt", "deposit:platinum", "deposit:palladium", "deposit:osmium", "deposit:iridium", "deposit:rhodium", "deposit:ruthenium", ":light_pgm", ":heavy_pgm").filterNot(nickelField::contains)
    if (missingNickelDescendants.isEmpty()) ok("nickel fields own cobalt and PGM enrichment families") else fail("nickel fields own cobalt and PGM enrichment families", missingNickelDescendants.joinToString(", "))

    val fissileFiles = listOf("uranium", "thorium")
    val invalidFissileFields = fissileFiles.filter { id ->
        val text = read("config/adlods/Deposits/$id.cfg")
        "#minecraft:stone_ore_replaceables -> realisticores:${id}_ore" !in text ||
            "#minecraft:deepslate_ore_replaceables -> realisticores:deepslate_${id}_ore" !in text ||
            "#realisticores:overworld_ore_replaceables" !in text ||
            "minecraft:lava" in text ||
            "realisticores:crushed_${id}_ore" !in text ||
            "I:min=-128" !in text || "I:max=512" !in text
    }
    if (invalidFissileFields.isEmpty()) ok("uranium and thorium are full-height signalled rock-hosted ADLODS fields") else fail("uranium and thorium are full-height signalled rock-hosted ADLODS fields", invalidFissileFields.joinToString(", "))

    val commonBulkRarities = mapOf("coal.cfg" to 32, "iron.cfg" to 32, "copper.cfg" to 48, "tin.cfg" to 64, "zinc.cfg" to 64, "lead.cfg" to 64)
    val sparseBulkFields = commonBulkRarities.filter { (file, rarity) -> "I:rarity=$rarity" !in read("config/adlods/Deposits/$file") }
    if (sparseBulkFields.isEmpty()) ok("ADLODS parent fields are regional rather than lottery-rare", "${commonBulkRarities.size} bulk representatives")
    else fail("ADLODS parent fields are regional rather than lottery-rare", sparseBulkFields.keys.joinToString(", "))

    val oilSizes = mapOf("oil_small" to "I:max=120", "oil_medium" to "I:max=600", "oil_large" to "I:max=3000", "oil_huge" to "I:max=12000")
    val invalidOilFields = oilSizes.mapNotNull { (id, sizeMarker) ->
        val text = read("config/adlods/Deposits/$id.cfg")
        if ("pneumaticcraft:oil" in text && "realisticores:oil_seep" in text && sizeMarker in text && "B:exposed=false" in text) null else id
    }
    if (invalidOilFields.isEmpty()) ok("finite ADLODS oil fields cover small through huge scales") else fail("finite ADLODS oil fields cover small through huge scales", invalidOilFields.joinToString(", "))

    val forageFiles = walk("datapacks/datapack_foraging_everywhere/data") { it.endsWith(".json") }
    val foragePlacedFeatures = forageFiles.filter { "/worldgen/placed_feature/" in it }
    val forageBiomeModifiers = forageFiles.filter { "/forge/biome_modifier/" in it }
    val forageBiomeTags = forageFiles.filter { "/tags/worldgen/biome/undergarden_forage/" in it }
    val broadOverworldForage = forageFiles.filter {
        val text = read(it)
        "minecraft:is_overworld" in text || "biome_is_overworld" in text || "#minecraft:is_overworld" in text
    }
    val placedWithoutUndergardenFilter = foragePlacedFeatures.filter { file ->
        jsonArray(readJson(file)["placement"]).none { entry ->
            val obj = jsonObject(entry)
            jsonString(obj["type"]) == "farmersdelight:biome_tag" &&
                jsonString(obj["tag"]).orEmpty().startsWith("kubejs:undergarden_forage/")
        }
    }
    val modifiersWithoutUndergardenTarget = forageBiomeModifiers.filter { file ->
        val biomesValue = jsonObject(readJson(file))["biomes"]
        val biomeEntries = when (biomesValue) {
            is List<*> -> biomesValue
            null -> emptyList<Any?>()
            else -> listOf(biomesValue)
        }
        biomeEntries.any { !jsonString(it).orEmpty().startsWith("#kubejs:undergarden_forage/") }
    }
    val tagsOutsideUndergarden = forageBiomeTags.filter { file ->
        jsonArray(readJson(file)["values"]).any { value ->
            val text = jsonString(value).orEmpty()
            !(text.startsWith("undergarden:") || text.startsWith("#undergarden:") || text.startsWith("#kubejs:undergarden_forage/"))
        }
    }
    val forageFailures = mutableListOf<String>()
    forageFailures += broadOverworldForage.map { "$it: broad-overworld-token" }
    forageFailures += placedWithoutUndergardenFilter.map { "$it: missing-undergarden-placement-filter" }
    forageFailures += modifiersWithoutUndergardenTarget.map { "$it: missing-undergarden-biome-modifier-target" }
    forageFailures += tagsOutsideUndergarden.map { "$it: tag-outside-undergarden" }
    if (foragePlacedFeatures.size >= 30 && forageBiomeModifiers.size >= 20 && forageBiomeTags.size >= 7 && forageFailures.isEmpty()) ok("foraging datapack is Undergarden-only", "${foragePlacedFeatures.size} placed features, ${forageBiomeModifiers.size} biome modifiers, ${forageBiomeTags.size} biome tags")
    else fail("foraging datapack is Undergarden-only", "placed=${foragePlacedFeatures.size} modifiers=${forageBiomeModifiers.size} tags=${forageBiomeTags.size} bad=${forageFailures.joinToString(", ")}")

    val dimension_drinkEvVariants = read("globalresources/dimension_drink/excavated_variants/dimension_drink/variants/dimension_drink_modded_ores.json5")
    if ("id: 'gravel'" in dimension_drinkEvVariants && "block_id: 'minecraft:gravel'" in dimension_drinkEvVariants && "types: ['gravel']" in dimension_drinkEvVariants) ok("Excavated Variants treats gravel as a gravel ore substrate")
    else fail("Excavated Variants treats gravel as a gravel ore substrate", "missing gravel provided_stones entry")

    val dimension_drinkOreFeatureDir = "datapacks/dimension_drink_ore_relocation/data/kubejs/worldgen/configured_feature"
    val gravelTargetExclusions = setOf("dimension_drink_blazing_quartz_ore.json", "dimension_drink_iesnium_ore.json")
    val gravelTargetProblems = mutableListOf<String>()
    for (file in walk(dimension_drinkOreFeatureDir) { it.endsWith(".json") }.sorted()) {
        val name = Paths.get(file).fileName.toString()
        val data = readJson(file)
        if (jsonString(data["type"]) != "minecraft:ore" || name in gravelTargetExclusions) continue
        val hasGravelTarget = jsonArray(jsonObject(data["config"])["targets"]).any { target ->
            val targetObj = jsonObject(jsonObject(target)["target"])
            jsonString(targetObj["predicate_type"]) == "minecraft:block_match" && jsonString(targetObj["block"]) == "minecraft:gravel"
        }
        if (!hasGravelTarget) gravelTargetProblems += name
    }
    if (gravelTargetProblems.isEmpty()) ok("stone-style dimension drink ores can replace gravel")
    else fail("stone-style dimension drink ores can replace gravel", gravelTargetProblems.joinToString(", "))

    val rbpGeneratedSolid = read("config/rbp/block_definitions/generated_pack_solid_blocks.toml")
    val rbpGeneratedModdedSand = read("config/rbp/block_definitions/generated_modded_sand.toml")
    val staleGravelEvOres = listOf(
        "gravel_arcane_crystal_ore",
        "gravel_bauxite_laterite",
        "gravel_cthonic_gold_ore",
        "gravel_ironstone",
        "gravel_mithril_ore",
        "gravel_natural_quartz_ore",
        "gravel_zinc_ore"
    ).map { "excavated_variants:$it" }
    val staleGravelRbp = staleGravelEvOres.filter { id ->
        val key = "\"$id\""
        key in rbpGeneratedSolid || key in rbpGeneratedModdedSand
    }
    if (staleGravelRbp.isEmpty()) ok("stale gravel Excavated Variants ore IDs stay out of generated assignments", "${staleGravelEvOres.size} representatives")
    else fail("stale gravel Excavated Variants ore IDs stay out of generated assignments", "rbp=${staleGravelRbp.joinToString(", ")}")

    val looseEarthMissingSandPhysics = looseEarthIds.filter { "\"$it\"" !in rbpGeneratedModdedSand }
    val looseEarthStillStonePhysics = looseEarthIds.filter { "\"$it\"" in rbpGeneratedSolid || "\"$it\"" in read("config/rbp/block_definitions/generated_modded_stone.toml") }
    if (looseEarthMissingSandPhysics.isEmpty() && looseEarthStillStonePhysics.isEmpty()) {
        ok("loose-earth blocks use sand/gravel physics", "${looseEarthIds.size} ids")
    } else {
        fail(
            "loose-earth blocks use sand/gravel physics",
            "missingSand=${looseEarthMissingSandPhysics.take(20).joinToString(", ")} stoneProfile=${looseEarthStillStonePhysics.take(20).joinToString(", ")}"
        )
    }

    val lavaDepthFiles = listOf(
        "datapacks/realistic_ores_lava_depths/data/realisticores/forge/biome_modifier/add_osmiridium_lava_sulfide_ore_deepslate.json",
        "datapacks/realistic_ores_lava_depths/data/realisticores/worldgen/configured_feature/osmiridium_lava_sulfide_ore_deepslate.json",
        "datapacks/realistic_ores_lava_depths/data/realisticores/worldgen/placed_feature/osmiridium_lava_sulfide_ore_deepslate.json",
        "datapacks/hyle_deep/data/hyle/worldgen/configured_feature/stone_replacer.json",
        "datapacks/hyle_deep/data/hyle/worldgen/placed_feature/stone_replacer.json"
    )
    val missingLava = lavaDepthFiles.filterNot(::exists)
    if (missingLava.isEmpty()) ok("deep geology datapacks cover lava-depth and Hyle anchors", "${lavaDepthFiles.size} files")
    else fail("deep geology datapacks cover lava-depth and Hyle anchors", missingLava.joinToString(", "))

    val hyleStoneReplacer = readJson("datapacks/hyle_deep/data/hyle/worldgen/placed_feature/stone_replacer.json")
    val hylePlacement = jsonArray(hyleStoneReplacer["placement"])
    val hyleStoneReplacerY = jsonNumber(jsonObject(jsonObject(hylePlacement.firstOrNull())["height"])["value"]?.let(::jsonObject)?.get("absolute"))?.toInt()
    if (hyleStoneReplacerY == -128) ok("Hyle stone replacement starts at world bottom", "y=$hyleStoneReplacerY")
    else fail("Hyle stone replacement starts at world bottom", "y=$hyleStoneReplacerY")

    val hyleConfigured = readJson("datapacks/hyle_deep/data/hyle/worldgen/configured_feature/stone_replacer.json")
    val hyleConfig = jsonObject(hyleConfigured["config"])
    val hyleRegions = jsonArray(hyleConfig["regions"]).mapNotNull(::jsonString)
    val requiredHyleRegions = listOf("unearthed:default", "unearthed:limestone", "unearthed:sedimentary")
    val missingHyleRegions = requiredHyleRegions.filterNot(hyleRegions::contains)
    val unexpectedHyleRegions = hyleRegions.filterNot(requiredHyleRegions::contains)
    if (missingHyleRegions.isEmpty() && unexpectedHyleRegions.isEmpty()) ok("Hyle stone replacement uses only exhaustive Unearthed regions", hyleRegions.joinToString(", "))
    else fail("Hyle stone replacement uses only exhaustive Unearthed regions", "missing=${missingHyleRegions.joinToString(", ")} unexpected=${unexpectedHyleRegions.joinToString(", ")}")

    val activeHyleRegionFiles = requiredHyleRegions.map { region ->
        "datapacks/hyle_deep/data/${region.substringBefore(':')}/hyledata/regions/${region.substringAfter(':')}.json"
    }
    val activeHyleEmptyEntries = activeHyleRegionFiles.filter { path -> Regex("\\\"\\s*\\\"").containsMatchIn(read(path)) }
    if (activeHyleEmptyEntries.isEmpty()) ok("active Hyle regions have no vanilla-preserving empty palette entries", "${activeHyleRegionFiles.size} regions")
    else fail("active Hyle regions have no vanilla-preserving empty palette entries", activeHyleEmptyEntries.joinToString(", "))

    val hyleTagScript = read("kubejs/server_scripts/10_tags/20_replaceable_deepslate.js")
    val requiredHyleHostBlocks = listOf("minecraft:deepslate", "minecraft:tuff")
    val missingHyleHostBlocks = requiredHyleHostBlocks.filterNot { "'$it'" in hyleTagScript }
    if (missingHyleHostBlocks.isEmpty()) ok("Hyle replaces deep vanilla host stones", requiredHyleHostBlocks.joinToString(", "))
    else fail("Hyle replaces deep vanilla host stones", missingHyleHostBlocks.joinToString(", "))

    val vanillaWorldgenRemoval = read("datapacks/worldgen_compat_fixes/data/kubejs/forge/biome_modifier/remove_vanilla_overworld_ores.json")
    val lateVanillaStoneFeatures = listOf("ore_granite_upper", "ore_granite_lower", "ore_diorite_upper", "ore_diorite_lower", "ore_andesite_upper", "ore_andesite_lower", "ore_tuff")
    val unremovedLateVanillaStoneFeatures = lateVanillaStoneFeatures.filterNot { "minecraft:$it" in vanillaWorldgenRemoval }
    if (unremovedLateVanillaStoneFeatures.isEmpty()) ok("late vanilla stone features cannot overwrite Hyle geology", "${lateVanillaStoneFeatures.size} features")
    else fail("late vanilla stone features cannot overwrite Hyle geology", unremovedLateVanillaStoneFeatures.joinToString(", "))

    val bcfixesHyleMixinConfig = readJson("generated/custom-mod-sources/better-content-fixes/src/main/resources/bcfixes.mixins.json")
    val bcfixesHyleMixins = jsonArray(bcfixesHyleMixinConfig["mixins"]).mapNotNull(::jsonString)
    val hyleBottomMixinPath = "generated/custom-mod-sources/better-content-fixes/src/main/java/io/github/bcfixes/mixin/hyle/StoneReplacerMixin.java"
    val hyleBottomMixin = if (exists(hyleBottomMixinPath)) read(hyleBottomMixinPath) else ""
    val hyleBottomCoverageEnabled = "hyle.StoneReplacerMixin" in bcfixesHyleMixins &&
        "chunk.getMinBuildHeight()" in hyleBottomMixin &&
        "nearestReplacement(columnTypes, generatedIndex, original)" in hyleBottomMixin
    if (hyleBottomCoverageEnabled) ok("Hyle bottom interpolation gaps are repaired", "nearest valid generated stratum completes the lowest chunk section")
    else fail("Hyle bottom interpolation gaps are repaired", "missing bottom-section mixin or generated-stratum fallback")

    val hyleTimingMixinPath = "generated/custom-mod-sources/better-content-fixes/src/main/java/io/github/bcfixes/mixin/hyle/BiomeInjectorMixin.java"
    val hyleTimingMixin = if (exists(hyleTimingMixinPath)) read(hyleTimingMixinPath) else ""
    val hyleRunsAfterUndergroundFeatures = "hyle.BiomeInjectorMixin" in bcfixesHyleMixins &&
        "GenerationStep.Decoration.UNDERGROUND_DECORATION" in hyleTimingMixin &&
        "GenerationStep.Decoration.LOCAL_MODIFICATIONS" in hyleTimingMixin
    if (hyleRunsAfterUndergroundFeatures) ok("Hyle replaces late underground stone outputs", "geology pass runs at underground decoration tail")
    else fail("Hyle replaces late underground stone outputs", "missing Hyle injection timing override")

    val hyleOverrideFiles = walk("datapacks/hyle_deep/data/unearthed/hyledata") { it.endsWith(".json") }
    val hyleOverrideText = hyleOverrideFiles.joinToString("\n") { read(it) }
    val deadUnearthedHyleRefs = listOf(
        "unearthed:dacite",
        "unearthed:dolerite",
        "unearthed:grassy_sandstone_regolith",
        "unearthed:andesite_iron_ore",
        "unearthed:diorite_iron_ore",
        "unearthed:granite_iron_ore"
    ).filter { "\"$it\"" in hyleOverrideText }
    if (deadUnearthedHyleRefs.isEmpty()) ok("Hyle Unearthed overrides avoid known unregistered outputs")
    else fail("Hyle Unearthed overrides avoid known unregistered outputs", deadUnearthedHyleRefs.joinToString(", "))

    val misplacedHyleData = if (exists("datapacks/hyle_deep/data/hyledata")) walk("datapacks/hyle_deep/data/hyledata") { it.endsWith(".json") } else emptyList()
    if (misplacedHyleData.isEmpty()) ok("Hyle datapack data uses namespaced loader paths") else fail("Hyle datapack data uses namespaced loader paths", misplacedHyleData.joinToString(", "))

    val sgiMixinConfig = readJson("generated/custom-mod-sources/better-content-fixes/src/main/resources/bcfixes.mixins.json")
    val sgiMixinNames = jsonArray(sgiMixinConfig["mixins"]).mapNotNull(::jsonString)
    val sgiDeferredMixinPath = "generated/custom-mod-sources/better-content-fixes/src/main/java/io/github/bcfixes/mixin/sgi/ChunkGeneratorMixin.java"
    val sgiDeferredMixin = if (exists(sgiDeferredMixinPath)) read(sgiDeferredMixinPath) else ""
    val sgiDefersSurfaceConform = "sgi.ChunkGeneratorMixin" in sgiMixinNames &&
        "sgi.TerrainConformUtilMixin" in sgiMixinNames &&
        "TerrainConformUtil;applyDuringSurface" in sgiDeferredMixin &&
        "@At(\"TAIL\")" in sgiDeferredMixin &&
        "applyDuringSurface.invoke(null, level, structureManager, chunk)" in sgiDeferredMixin
    if (sgiDefersSurfaceConform) ok(
        "SGI support terrain samples the final Hyle/Unearthed palette",
        "surface conform is deferred to decoration tail with a post-conform Hyle safety pass"
    ) else fail(
        "SGI support terrain samples the final Hyle/Unearthed palette",
        "missing SGI defer mixin, tail invocation, or Hyle safety mixin"
    )

    val lavaConfigured = walk("datapacks/realistic_ores_lava_depths/data/realisticores/worldgen/configured_feature") { it.endsWith(".json") }
    val nonLavaFeatureConfigured = lavaConfigured.filter { jsonString(readJson(it)["type"]) != "realisticores:lava_exposed_ore" }
    if (nonLavaFeatureConfigured.isEmpty()) ok("lava-depth configured features use the Realistic Ores lava-exposed feature", "${lavaConfigured.size} configured features")
    else fail("lava-depth configured features use the Realistic Ores lava-exposed feature", nonLavaFeatureConfigured.joinToString(", "))

    val lavaPlaced = walk("datapacks/realistic_ores_lava_depths/data/realisticores/worldgen/placed_feature") { it.endsWith(".json") }
    val lavaPlacementFailures = lavaPlaced.filter { file ->
        val text = read(file)
        "minecraft:block_predicate_filter" !in text || "minecraft:matching_fluids" !in text || "minecraft:lava" !in text || "\"absolute\": -128" !in text || "\"absolute\": 0" !in text
    }
    if (lavaPlacementFailures.isEmpty()) ok("lava-depth placed features are height-bounded and lava-contact filtered", "${lavaPlaced.size} placed features")
    else fail("lava-depth placed features are height-bounded and lava-contact filtered", lavaPlacementFailures.joinToString(", "))

    val spawnerText = read("config/incontrol/spawner.json")
    val missingLavaSpawnerMarkers = listOf("minecraft:magma_cube", "\"inlava\": true", "\"minheight\": -128", "\"maxheight\": 0").filterNot(spawnerText::contains)
    if (missingLavaSpawnerMarkers.isEmpty()) ok("lava-depth danger spawner targets lava diving band") else fail("lava-depth danger spawner targets lava diving band", missingLavaSpawnerMarkers.joinToString(", "))

    val contract = readJson("tools/pack_contract.json")
    val sourceRoot = System.getenv("BC_CUSTOM_MODS_DIR") ?: jsonString(jsonObject(contract["customMods"])["sourceRoot"]).orEmpty()
    val lavaFeaturePath = Paths.get(sourceRoot, "realistic-ores/src/main/java/io/github/realisticores/worldgen/LavaExposedOreFeature.java")
    val lavaFeatureText = if (lavaFeaturePath.exists()) Files.readString(lavaFeaturePath) else ""
    val missingLavaFeatureMarkers = listOf("Feature.checkNeighbors", "FluidTags.LAVA", "target.target.test").filterNot(lavaFeatureText::contains)
    if (missingLavaFeatureMarkers.isEmpty()) ok("Realistic Ores implements per-block lava-exposed ore placement")
    else fail("Realistic Ores implements per-block lava-exposed ore placement", "$lavaFeaturePath: ${missingLavaFeatureMarkers.joinToString(", ")}")

    val realisticOresRoot = Paths.get(sourceRoot, "realistic-ores")
    val expectedCaveCounts = mapOf(
        "coal_measures" to 18, "ironstone" to 14, "copper_sulfide" to 12,
        "tin" to 10, "zinc" to 10, "lead_zinc_vein" to 8, "nickel_sulfide" to 8,
        "phosphate_rock" to 8, "sulfur_bearing_pyrite" to 8, "tin_tungsten_greisen" to 6,
        "bauxite_laterite" to 6, "quartz_vein" to 6, "titanium_iron_oxide" to 5,
        "cupriferous_redbed_redstone_vein" to 5, "soul_bearing_black_shale_soulstone_vein" to 5,
        "kimberlite_pipe" to 4, "corundum_beryl_gem_vein" to 4,
        "emerald_schist_beryl_vein" to 4, "lazurite_vein" to 4
    )
    val generationRoot = realisticOresRoot.resolve("src/main/resources/data/realisticores/realistic_ore_generation")
    val invalidCaveCounts = if (generationRoot.exists()) Files.list(generationRoot).use { paths ->
        paths.filter { it.fileName.toString().endsWith(".json") }.toList().mapNotNull { path ->
            val data = readJson(path.toString())
            val oreId = jsonString(data["ore_id"]).orEmpty()
            val expected = expectedCaveCounts[oreId]
            val actual = jsonNumber(data["count_per_chunk"])?.toInt()
            if (expected != null && actual != expected) "$oreId=$actual expected=$expected" else null
        }
    } else listOf("missing $generationRoot")
    if (invalidCaveCounts.isEmpty()) ok("Realistic Ores cave frequencies use the halved ore-pass budget", "${expectedCaveCounts.size} deposits")
    else fail("Realistic Ores cave frequencies use the halved ore-pass budget", invalidCaveCounts.distinct().joinToString(", "))

    val replacedVanillaOres = listOf("coal", "copper", "diamond", "emerald", "gold", "iron", "lapis", "redstone")
    val restoredVanillaOres = replacedVanillaOres.filter { ore ->
        "S:generation=none" !in read("config/adlods/VanillaOres/${ore}_ore.cfg")
    }
    val copiedBiomeOres = walk("datapacks") { it.endsWith(".json") && "/worldgen/biome/" in it }.filter { file ->
        Regex("minecraft:ore_(coal|copper|diamond|emerald|gold|iron|lapis|redstone)").containsMatchIn(read(file))
    }
    if (restoredVanillaOres.isEmpty() && copiedBiomeOres.isEmpty()) {
        ok("overridden vanilla ores stay disabled across ADLODS and copied biome data")
    } else fail(
        "overridden vanilla ores stay disabled across ADLODS and copied biome data",
        (restoredVanillaOres + copiedBiomeOres).joinToString(", ")
    )

    val oreHostTag = readJson("datapacks/hyle_deep/data/realisticores/tags/blocks/overworld_ore_replaceables.json")
    val oreHostValues = jsonArray(oreHostTag["values"]).mapNotNull(::jsonString)
    val configuredOreFeatures = walk("generated/custom-mod-sources/realistic-ores/src/main/resources/data/realisticores/worldgen/configured_feature") { it.endsWith(".json") }
    val wrongOreHosts = configuredOreFeatures.filter { "realisticores:overworld_ore_replaceables" !in read(it) }
    val hasCurrentSchistId = "unearthed:schist" in oreHostValues && oreHostValues.none { it.matches(Regex("unearthed:schist_[xyz]")) }
    if (oreHostValues.count { it.startsWith("unearthed:") } >= 16 && hasCurrentSchistId && wrongOreHosts.isEmpty()) {
        ok("Realistic Ores veins replace active Hyle/Unearthed strata", "${configuredOreFeatures.size} features, ${oreHostValues.size} hosts")
    } else fail("Realistic Ores veins replace active Hyle/Unearthed strata", wrongOreHosts.joinToString(", "))

    val modBlocksPath = realisticOresRoot.resolve("src/main/java/io/github/realisticores/registry/ModBlocks.java")
    val sampleBlockPath = realisticOresRoot.resolve("src/main/java/io/github/realisticores/block/SurfaceSampleBlock.java")
    val sampleSourceText = listOf(modBlocksPath, sampleBlockPath).filter { Files.exists(it) }.joinToString("\n") { Files.readString(it) }
    val missingSampleMarkers = listOf("SURFACE_SAMPLES_BY_ID", "OIL_SEEP", "SimpleWaterloggedBlock", "noCollission", "instabreak").filterNot(sampleSourceText::contains)
    val ironSampleState = realisticOresRoot.resolve("src/main/resources/assets/realisticores/blockstates/crushed_ironstone.json")
    if (missingSampleMarkers.isEmpty() && ironSampleState.exists()) ok("crushed ores register as placeable collectible surface samples")
    else fail("crushed ores register as placeable collectible surface samples", missingSampleMarkers.joinToString(", "))

    val sampleModelRoot = realisticOresRoot.resolve("src/main/resources/assets/realisticores/models/block")
    val sampleGeometrySignatures = if (sampleModelRoot.exists()) Files.list(sampleModelRoot).use { paths ->
        paths.filter { it.fileName.toString().matches(Regex("crushed_.+_[0-4]\\.json")) }
            .toList()
            .groupBy { it.fileName.toString().replace(Regex("_[0-4]\\.json$"), "") }
            .mapValues { (_, models) -> models.sorted().joinToString("|") { path -> jsonArray(readJson(path.toString())["elements"]).toString() } }
    } else emptyMap()
    if (sampleGeometrySignatures.size >= 20 && sampleGeometrySignatures.values.toSet().size == sampleGeometrySignatures.size) {
        ok("crushed ore surface samples use unique per-ore geometry", "${sampleGeometrySignatures.size} material scatters")
    } else fail("crushed ore surface samples use unique per-ore geometry", "${sampleGeometrySignatures.values.toSet().size}/${sampleGeometrySignatures.size} unique")

    val expectedSampleUv = listOf(8, 8, 10, 11)
    val sampleModelPaths = if (sampleModelRoot.exists()) Files.list(sampleModelRoot).use { paths ->
        paths.filter { it.fileName.toString().matches(Regex("crushed_.+_[0-4]\\.json")) }.toList()
    } else emptyList()
    val invalidSampleModels = sampleModelPaths.filter { path ->
        val model = readJson(path.toString())
        val textures = jsonObject(model["textures"])
        val faces = jsonArray(model["elements"]).flatMap { element ->
            jsonObject(jsonObject(element)["faces"]).values
        }
        textures["particle"] != "#all" || faces.isEmpty() || faces.any { face ->
            jsonArray(jsonObject(face)["uv"]).mapNotNull { (it as? Number)?.toInt() } != expectedSampleUv
        }
    }
    val osmiridiumSampleModel = sampleModelRoot.resolve("crushed_osmiridium_lava_sulfide_ore_0.json")
    val osmiridiumSampleTexture = if (osmiridiumSampleModel.exists()) {
        jsonObject(readJson(osmiridiumSampleModel.toString())["textures"])["all"]
    } else null
    if (invalidSampleModels.isEmpty() && sampleModelPaths.size >= 100 && osmiridiumSampleTexture == "realisticores:item/crushed_nickel_sulfide_ore") {
        ok("crushed ore surface models use opaque UVs and resolved texture aliases", "${sampleModelPaths.size} models")
    } else fail(
        "crushed ore surface models use opaque UVs and resolved texture aliases",
        "invalid=${invalidSampleModels.take(5).joinToString(", ")}; osmiridium=$osmiridiumSampleTexture"
    )

    val osmiridiumDefinitionPath = Paths.get(sourceRoot, "realistic-ores/src/main/resources/data/realisticores/realistic_ores/osmiridium_lava_sulfide.json")
    val osmiridiumDefinitionText = if (osmiridiumDefinitionPath.exists()) Files.readString(osmiridiumDefinitionPath) else ""
    val osmiridiumNormalOreTagFiles = listOf(
        Paths.get(sourceRoot, "realistic-ores/src/main/resources/data/forge/tags/blocks/ores/osmium.json"),
        Paths.get(sourceRoot, "realistic-ores/src/main/resources/data/forge/tags/items/ores/osmium.json"),
        Paths.get(sourceRoot, "realistic-ores/src/main/resources/data/forge/tags/blocks/ores/iridium.json"),
        Paths.get(sourceRoot, "realistic-ores/src/main/resources/data/forge/tags/items/ores/iridium.json")
    )
    val leakedOsmiridiumMaterialTags = mutableListOf<String>()
    listOf("forge:ores/osmium", "forge:ores/iridium").forEach { tag ->
        if (tag in osmiridiumDefinitionText) leakedOsmiridiumMaterialTags += "$osmiridiumDefinitionPath: $tag"
    }
    osmiridiumNormalOreTagFiles.forEach { file ->
        if (file.exists() && "osmiridium_lava_sulfide" in Files.readString(file)) leakedOsmiridiumMaterialTags += file.toString()
    }
    if (leakedOsmiridiumMaterialTags.isEmpty()) ok("osmiridium avoids normal osmium/iridium ore-source tags")
    else fail("osmiridium avoids normal osmium/iridium ore-source tags", leakedOsmiridiumMaterialTags.joinToString(", "))

    val removeItemsText = read("kubejs/server_scripts/20_recipe_remove/30_remove_items.js")
    val missingLavaBypassRemovals = listOf("event.remove({ type: 'occultism:miner' })").filterNot(removeItemsText::contains)
    if (missingLavaBypassRemovals.isEmpty()) ok("Occultism miner bypass recipes stay removed") else fail("Occultism miner bypass recipes stay removed", missingLavaBypassRemovals.joinToString(", "))

    val oilSuppressText = listOf(
        "datapacks/worldgen_compat_fixes/data/pneumaticcraft/forge/biome_modifier/oil_lake_surface.json",
        "datapacks/worldgen_compat_fixes/data/pneumaticcraft/forge/biome_modifier/oil_lake_underground.json"
    ).joinToString("\n") { read(it) }
    val missingOilBounds = listOf("#kubejs:no_biomes", "pneumaticcraft:oil_lake_surface", "pneumaticcraft:oil_lake_underground").filterNot(oilSuppressText::contains)
    if (missingOilBounds.isEmpty() && "pneumaticcraft:amadron/emerald_to_oil" in removeItemsText) ok("native and purchased oil bypasses stay disabled")
    else fail("native and purchased oil bypasses stay disabled", missingOilBounds.joinToString(", "))

    val lavaProgressionText = listOf(
        "kubejs/server_scripts/10_tags/60_realistic_ores_deposit_tags.js",
        "kubejs/server_scripts/40_recipe_add/50_create_deposit_preprocessing.js",
        "kubejs/server_scripts/40_recipe_add/55_realistic_ores_identity_outputs.js",
        "kubejs/server_scripts/30_recipe_replace/110_extreme_y_band_reward_gates.js",
        "kubejs/server_scripts/30_recipe_replace/165_protection_pixel_post_ae2_gates.js",
        "kubejs/client_scripts/15_ore_origin_tooltips.js"
    ).joinToString("\n") { read(it) }
    val missingLavaProgressionMarkers = listOf(
        "realisticores:deepslate_osmiridium_lava_sulfide_ore",
        "realisticores:crushed_osmiridium_lava_sulfide_ore",
        "kubejs:deposit_blocks/osmiridium_lava_sulfide",
        "protection_pixel:tosaki_helmet",
        "protection_pixel:tosaki_chestplate",
        "protection_pixel:tosaki_leggings"
    ).filterNot(lavaProgressionText::contains)
    if (missingLavaProgressionMarkers.isEmpty()) ok("osmiridium lava diving route is visible and consumed by post-AE2 progression")
    else fail("osmiridium lava diving route is visible and consumed by post-AE2 progression", missingLavaProgressionMarkers.joinToString(", "))
}

fun validateDimensionProofGraphStartsImpl() {
    val recipeFile = "kubejs/server_scripts/30_recipe_replace/155_dimension_proof_graph_starts.js"
    if (!exists(recipeFile)) return fail("dimension proof graph-start recipe pass exists", recipeFile)
    val recipeText = read(recipeFile)
    val progression = read("docs/progression.md")
    val dimensionDrinkSection = Regex("""## Dimension Drink Graph Starts\n([\s\S]*?)(?=\n## )""").find(progression)?.groupValues?.getOrNull(1).orEmpty()
    val dimensionIds = Regex("""['"]kubejs:dimension_graph/([^/'"]+)/""").findAll(recipeText).map { it.groupValues[1] }.toSet()
    val missingDimensions = listOf("aether").filterNot(dimensionIds::contains)
    if (missingDimensions.isEmpty()) ok("dimension proof graph-start recipe ids cover mapped route dimensions", "aether") else fail("dimension proof graph-start recipe ids cover mapped route dimensions", missingDimensions.joinToString(", "))
    if ("BC_DIM_PROOF_ADDED" in recipeText && "bcDimProofShaped" in recipeText) ok("dimension proof graph-start pass uses explicit helper and recipe counter") else fail("dimension proof graph-start pass uses explicit helper and recipe counter", "missing BC_DIM_PROOF_ADDED or bcDimProofShaped")
    val requiredRecipeMarkers = listOf("hangglider:glider_wing", "hangglider:glider_framework", "hangglider:hang_glider", "hangglider:reinforced_hang_glider").filterNot(recipeText::contains)
    if (requiredRecipeMarkers.isEmpty()) ok("dimension proof graph-start outputs stay on route-tool surfaces", "4 outputs") else fail("dimension proof graph-start outputs stay on route-tool surfaces", requiredRecipeMarkers.joinToString(", "))
    val forbiddenOutputPrefixes = listOf("create:","ae2:","advanced_ae:","pneumaticcraft:","computerbridge:","oc2r:","bloodmagic:","ars_nouveau:","hexerei:","malum:","goety:","irons_spellbooks:","aether:","deeperdarker:","thirst:")
    val authoredOutputs = Regex("""bcDimProofShaped\(event, '([^']+)'""").findAll(recipeText).map { it.groupValues[1] }.toList()
    val forbiddenOutputs = authoredOutputs.filter { output -> forbiddenOutputPrefixes.any(output::startsWith) }
    if (forbiddenOutputs.isEmpty()) ok("dimension proof graph-start recipes avoid self-label and spine reassignment outputs", "${authoredOutputs.size} authored outputs") else fail("dimension proof graph-start recipes avoid self-label and spine reassignment outputs", forbiddenOutputs.joinToString(", "))
    val tableRows = dimensionDrinkSection.lines().filter { it.startsWith('|') && !it.contains("---") }
    val forbiddenPositiveMappings = listOf("Aether" to Regex("""^Aether$""", RegexOption.IGNORE_CASE), "Otherside" to Regex("""DeeperDarker"""))
        .flatMap { (dimension, pattern) ->
            val row = tableRows.find { "| $dimension |" in it }.orEmpty()
            val graphStart = row.split('|').getOrNull(2)?.trim().orEmpty()
            if (pattern.containsMatchIn(graphStart)) listOf("$dimension -> $graphStart") else emptyList()
        }
    if (forbiddenPositiveMappings.isEmpty()) ok("dimension drink graph starts reject self-label dimension mappings") else fail("dimension drink graph starts reject self-label dimension mappings", forbiddenPositiveMappings.joinToString(", "))
    val spineTerms = listOf("Create", "AE2", "PneumaticCraft", "OC2R", "Ars", "Hexerei", "Malum", "Goety", "Iron's Spells")
    val positiveTableSpineClaims = tableRows.filter { "| Nether |" !in it && "| Undergarden |" !in it }.filter { row -> spineTerms.any { term -> (row.split('|').getOrNull(2)?.trim().orEmpty()).contains(term) } }
    if (positiveTableSpineClaims.isEmpty()) ok("dimension drink graph-start table does not reassign tech or magic spines") else fail("dimension drink graph-start table does not reassign tech or magic spines", positiveTableSpineClaims.joinToString("\n"))
    val basicWaterOutputs = authoredOutputs.filter { it == "minecraft:water_bucket" || it == "minecraft:potion" || it.startsWith("thirst:") }
    if (basicWaterOutputs.isEmpty()) ok("dimension proof routes leave basic water ungated")
    else fail("dimension proof routes do not gate basic water outputs", basicWaterOutputs.joinToString(", "))
}

fun validateDimensionTravelRoutesImpl() {
    val routeText = read("kubejs/server_scripts/30_recipe_replace/170_space_dimension_access_gates.js")
    val hiddenText = read("kubejs/client_scripts/40_hide_quarantined_systems.js")
    val removeText = read("kubejs/server_scripts/20_recipe_remove/30_remove_items.js")
    val directRouteItems = listOf("fallout_wastelands_:portal_frame","fallout_wastelands_:wastelands","undergarden:catalyst","bloodmagic:simplekey","bloodmagic:minekey","bloodmagic:mineentrancekey","bloodmagic:teleposer","bloodmagic:telepositionsigil","bloodmagic:reagentteleposition","bloodmagic:teleposerfocus","bloodmagic:reinforcedteleposerfocus","bloodmagic:enhancedteleposerfocus","aether:aether_portal_frame","deeperdarker:otherside_portal")
    val missingDirectSuppression = directRouteItems.filter { it !in routeText || it !in hiddenText || it !in removeText }
    val directRecipeConstructors = Regex("""event\.(shaped|shapeless)\s*\(""").containsMatchIn(routeText)
    if (missingDirectSuppression.isEmpty() && !directRecipeConstructors) ok("direct dimension portal/key routes are suppressed and not re-authored", "${directRouteItems.size} route items")
    else fail("direct dimension portal/key routes are suppressed and not re-authored", missingDirectSuppression.joinToString(", ") + if (directRecipeConstructors) " event.shaped/event.shapeless present" else "")
    val twilight = read("config/twilightforest-common.toml")
    val twilightProblems = listOf("disablePortalCreation = true" to "disablePortalCreation", "shouldReturnPortalBeUsable = false" to "shouldReturnPortalBeUsable", "portalUnlockedByAdvancement = \"\"" to "portalUnlockedByAdvancement").filter { it.first !in twilight }.map { it.second }
    if (twilightProblems.isEmpty()) ok("Twilight Forest direct portal config is disabled") else fail("Twilight Forest direct portal config is disabled", twilightProblems.joinToString(", "))
    val earthOrbit = readJson("kubejs/data/creatingspace/creatingspace/rocket_accessible_dimension/earth_orbit.json")
    val spaceRoutes = mapOf(
        "lostcities:lostcity" to "kubejs/data/lostcities/creatingspace/rocket_accessible_dimension/lostcity.json",
        "twilightforest:twilight_forest" to "kubejs/data/twilightforest/creatingspace/rocket_accessible_dimension/twilight_forest.json",
        "fallout_wastelands_:wastelands" to "kubejs/data/fallout_wastelands_/creatingspace/rocket_accessible_dimension/wastelands.json",
    )
    val routeProblems = mutableListOf<String>()
    for ((dimension, file) in spaceRoutes) {
        if (jsonObject(earthOrbit["adjacentDimensions"])[dimension] == null) routeProblems += "earth_orbit missing $dimension"
        if (!exists(file)) routeProblems += "missing $file"
        else if (jsonObject(readJson(file)["adjacentDimensions"])["creatingspace:earth_orbit"] == null) routeProblems += "$file missing creatingspace:earth_orbit"
    }
    if (routeProblems.isEmpty()) ok("Creating Space rocket graph owns non-dimension_drink adventure dimensions", "${spaceRoutes.size} dimensions") else fail("Creating Space rocket graph owns non-dimension_drink adventure dimensions", routeProblems.joinToString(", "))
    val disabledStructures = jsonArray(readJson("config/structurify.json")["structures"]).map(::jsonObject).filter { bool(it["is_disabled"]) == true }.mapNotNull { jsonString(it["name"]) }.toSet()
    val directPortalStructures = listOf("minecraft:ruined_portal","minecraft:ruined_portal_desert","minecraft:ruined_portal_jungle","minecraft:ruined_portal_mountain","minecraft:ruined_portal_nether","minecraft:ruined_portal_ocean","minecraft:ruined_portal_swamp","minecraft:stronghold","minecraft:ancient_city","ars_additions:ruined_portal","aether:ruined_portal","aether:ruined_portal_aether","aether:ruined_portal_desert","aether:ruined_portal_jungle","aether:ruined_portal_mountain","aether:ruined_portal_swamp","deeperdarker:ancient_temple")
    val missingDisabledStructures = directPortalStructures.filterNot(disabledStructures::contains)
    if (missingDisabledStructures.isEmpty()) ok("portal-bearing structures are disabled", "${directPortalStructures.size} structures") else fail("portal-bearing structures are disabled", missingDisabledStructures.joinToString(", "))
    val aetherObelisk = readJson("config/dimension_drink/dimension_drink/aether.json")
    if (jsonString(aetherObelisk["targetDimension"]) == "aether:the_aether" && bool(aetherObelisk["enabled"]) == true) ok("configured font routes include required Aether entry") else fail("configured font routes include required Aether entry", "aether config")
    val contract = readJson("tools/pack_contract.json")
    val sourceRoot = Paths.get(System.getenv("BC_CUSTOM_MODS_DIR") ?: jsonString(jsonObject(contract["customMods"])["sourceRoot"]).orEmpty())
    val blockerPath = sourceRoot.resolve("dimension-drink/src/main/kotlin/dev/yourname/dimensiondrink/runtime/player/VanillaPortalBlocker.kt")
    val blockerText = if (blockerPath.exists()) readAbs(blockerPath) else ""
    val missingNeedles = listOf("BlockEvent.PortalSpawnEvent","EntityTravelToDimensionEvent","path.contains(\"portal\")","path.contains(\"gateway\")").filterNot(blockerText::contains)
    if (missingNeedles.isEmpty()) ok("dimension_drink runtime blocks vanilla/generic portal travel bypasses") else fail("dimension_drink runtime blocks vanilla/generic portal travel bypasses", "$blockerPath: ${missingNeedles.joinToString(", ")}")
}

fun validateCustomModProvenanceSignalsImpl() {
    val contract = readJson("tools/pack_contract.json")
    val indexText = read("index.toml")
    val sourceRoot = Paths.get(System.getenv("BC_CUSTOM_MODS_DIR") ?: jsonString(jsonObject(contract["customMods"])["sourceRoot"]).orEmpty())
    val rows = mutableListOf<String>()
    val problems = mutableListOf<String>()
    for (modValue in jsonArray(jsonObject(contract["customMods"])["entries"])) {
        val mod = jsonObject(modValue)
        val modRoot = sourceRoot.resolve(jsonString(mod["repo"]).orEmpty())
        val jar = jsonString(mod["jar"]).orEmpty()
        val modId = jsonString(mod["id"]).orEmpty()
        if (!modRoot.exists()) { problems += "$modId: missing source $modRoot"; continue }
        if (!exists(jar)) { problems += "$modId: missing jar $jar"; continue }
        val head = ProcessBuilder("git", "-C", modRoot.toString(), "rev-parse", "--short", "HEAD").redirectErrorStream(true).start().inputStream.bufferedReader().readText().trim()
        val dirty = ProcessBuilder("git", "-C", modRoot.toString(), "status", "--porcelain").redirectErrorStream(true).start().inputStream.bufferedReader().readLines().filter(String::isNotBlank).size
        val jarHash = sha256(jar)
        if (!indexText.contains("""file = "$jar"""") || !indexText.contains("""hash = "$jarHash"""")) problems += "$modId: jar hash not current in index.toml"
        rows += "$modId@$head${if (dirty > 0) "+dirty$dirty" else ""}:${jarHash.take(12)}"
    }
    if (problems.isEmpty()) ok("custom mod source/jar provenance signals are current", "${rows.size} mods") else fail("custom mod source/jar provenance signals are current", problems.joinToString("\n"))
}
// END translated large helpers

if (instance.isNotBlank() && !Paths.get(instance).exists()) {
    fail("explicitBC_INSTANCE exists", instance)
    fail("runtime food effect dump exists", Paths.get(instance).resolve("kubejs/config/food_effect_index.json").toString())
    println("\nautonomous contract validators: $passCount pass(es), ${failures.size} hard failure(s)")
    exitProcess(1)
}

validateEconomy()
validateMagicBody()
validateClientQuestIntent()
validateVanillaStyleToolSuppression()
validateRealisticHands()
validatePrimitiveMiningRegressionContracts()
validateVanillishExpertRecipePass()
validateNonGrownInfiniteResourceBoundaries()
validateWorldgenStaticContracts()
validateDimensionProofGraphStarts()
validateDimensionTravelRoutes()
validateCustomModProvenanceSignals()

println("\nautonomous contract validators: $passCount pass(es), ${failures.size} hard failure(s)")
if (failures.isNotEmpty()) exitProcess(1)

#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths

val repo = Paths.get("").toAbsolutePath().normalize()
val defaultInstance = "/home/gerald/.local/share/PrismLauncher/instances/Better Content-Playtest 4 - v1/minecraft"
val instance = System.getenv("BC_INSTANCE") ?: defaultInstance
val configDir = Paths.get(instance).resolve("kubejs/config")
val dumpDir = Paths.get(instance).resolve("dump/data_raw")
val catalogPath = repo.resolve("kubejs/config/bc_expert_graph_catalog.json")

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
                            else -> error("bad escape")
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
fun readJson(path: Path): Any? = parseJson(Files.readString(path))
fun exists(path: Path): Boolean = Files.exists(path)
fun ensureDir(path: Path) = Files.createDirectories(path)
fun jsonObject(value: Any?): Map<String, Any?> = value as? Map<String, Any?> ?: emptyMap()
fun jsonArray(value: Any?): List<Any?> = value as? List<Any?> ?: emptyList()
fun jsonString(value: Any?): String? = value as? String
fun jsonNumber(value: Any?): Number? = value as? Number
fun ns(id: String): String = if (":" in id) id.substringBefore(':') else "minecraft"
fun local(id: String): String = if (":" in id) id.substringAfter(':') else id

fun renderJson(value: Any?, indent: String = ""): String = when (value) {
    null -> "null"
    is String -> "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\""
    is Number, is Boolean -> value.toString()
    is Map<*, *> -> "{\n" + value.entries.joinToString(",\n") { (k, v) -> "$indent  ${renderJson(k.toString())}: ${renderJson(v, "$indent  ")}" } + "\n$indent}"
    is Iterable<*> -> "[\n" + value.joinToString(",\n") { "$indent  ${renderJson(it, "$indent  ")}" } + "\n$indent]"
    else -> renderJson(value.toString(), indent)
}

fun table(rows: List<List<Any?>>): String {
    if (rows.isEmpty()) return "_None._\n"
    val widths = IntArray(rows.maxOf { it.size })
    for (row in rows) row.forEachIndexed { index, cell -> widths[index] = maxOf(widths[index], cell.toString().length) }
    fun line(row: List<Any?>) = "| " + row.mapIndexed { index, cell -> cell.toString().padEnd(widths[index]) }.joinToString(" | ") + " |"
    return buildString {
        appendLine(line(rows.first()))
        appendLine(line(rows.first().indices.map { "-".repeat(maxOf(3, widths[it])) }))
        rows.drop(1).forEach { appendLine(line(it)) }
    }
}

val catalog = jsonObject(readJson(catalogPath))
val tierOrder = jsonArray(catalog["tierOrder"]).mapNotNull(::jsonString)
val tierIndex = tierOrder.withIndex().associate { it.value to it.index }
val casingToTier = jsonArray(catalog["machineTiers"]).map(::jsonObject).associate { jsonString(it["casing"]).orEmpty() to jsonString(it["id"]).orEmpty() }
val slateToBloodTier = jsonArray(catalog["bloodMagicTiers"]).mapIndexed { index, any ->
    val row = jsonObject(any)
    jsonString(row["gate"]).orEmpty() to (jsonString(row["id"]).orEmpty() to (index + 1))
}.toMap()
val coinTiers = jsonArray(catalog["coinTiers"]).map(::jsonObject)
val coinItems = coinTiers.mapNotNull { jsonString(it["item"]) }.toSet()
val coinByItem = coinTiers.associateBy { jsonString(it["item"]).orEmpty() }

val machineNamespaceTier = mapOf(
    "tconstruct" to "tcon_seared",
    "create" to "create_andesite",
    "railways" to "create_brass",
    "create_connected" to "create_brass",
    "createadditionallogistics" to "create_brass",
    "createadvlogistics" to "create_brass",
    "createdieselgenerators" to "create_brass",
    "powergrid" to "power_grid",
    "oc2r" to "power_grid",
    "creatingspace" to "space",
    "ae2" to "ae2",
    "ae2additions" to "ae2",
    "advanced_ae" to "ae2",
    "expatternprovider" to "ae2",
    "merequester" to "ae2",
    "createappliedkinetics" to "ae2",
    "theurgy" to "power_grid",
    "occultengineering" to "create_brass"
)
val magicNamespaceBloodTier = buildMap<String, String> {
    for (tierAny in jsonArray(catalog["bloodMagicTiers"])) {
        val tier = jsonObject(tierAny)
        val id = jsonString(tier["id"]).orEmpty()
        for (modAny in jsonArray(tier["mods"])) {
            val mod = jsonString(modAny) ?: continue
            put(mod, id)
        }
    }
}
val valuableNeedles = listOf("minecraft:iron_ingot", "minecraft:copper_ingot", "minecraft:gold_ingot", "minecraft:redstone", "minecraft:lapis_lazuli", "minecraft:diamond", "minecraft:emerald", "minecraft:amethyst_shard", "#forge:ingots/iron", "#forge:ingots/copper", "#forge:ingots/gold", "#forge:dusts/redstone", "#forge:gems/lapis", "#forge:gems/diamond", "#forge:gems/emerald", "#forge:gems/amethyst")
val riskyWords = listOf("machine", "controller", "generator", "motor", "battery", "drive", "interface", "assembler", "crafter", "processor", "terminal", "import", "export", "bus", "cell", "storage", "chamber", "vat", "centrifuge", "transmitter", "receiver", "wireless", "teleport", "chunk_loader", "loader", "builder", "gadget", "quarry", "miner", "computer", "monitor", "server", "router", "network", "pipe", "pump", "conduit", "synthesizer", "liquefier", "incubator", "altar", "ritual", "focus", "programmer")

fun maxTier(a: String, b: String): String = if ((tierIndex[a] ?: -1) >= (tierIndex[b] ?: -1)) a else b
fun tierAtLeast(a: String, b: String): Boolean = (tierIndex[a] ?: -1) >= (tierIndex[b] ?: -1)

fun recipeChunks(): List<Map<String, Any?>> {
    val manifest = configDir.resolve("full_recipe_index_manifest.json")
    if (!exists(manifest)) return emptyList()
    val m = jsonObject(readJson(manifest))
    val chunkCount = jsonNumber(m["chunkCount"])?.toInt() ?: 0
    val out = mutableListOf<Map<String, Any?>>()
    repeat(chunkCount) { index ->
        val path = configDir.resolve("full_recipe_index_${index.toString().padStart(4, '0')}.json")
        if (!exists(path)) return@repeat
        out += jsonArray(jsonObject(readJson(path))["recipes"]).map { (it as? Map<*, *>)?.mapKeys { e -> e.key.toString() } ?: emptyMap() }
    }
    return out
}

fun extractItems(value: Any?, out: MutableList<String> = mutableListOf()): List<String> {
    when (value) {
        null -> Unit
        is List<*> -> value.forEach { extractItems(it, out) }
        is Map<*, *> -> {
            (value["item"] as? String)?.let(out::add)
            (value["id"] as? String)?.takeIf { ":" in it }?.let(out::add)
            (value["name"] as? String)?.takeIf { ":" in it }?.let(out::add)
            (value["tag"] as? String)?.let { out += "#$it" }
            value.values.forEach { extractItems(it, out) }
        }
    }
    return out
}

fun extractOutputs(json: Map<String, Any?>): List<String> {
    val outputs = linkedSetOf<String>()
    fun add(value: Any?) {
        when (value) {
            is String -> if (":" in value) outputs += value
            is Map<*, *> -> {
                (value["item"] as? String)?.let(outputs::add)
                (value["id"] as? String)?.let(outputs::add)
            }
        }
    }
    add(json["result"])
    add(json["output"])
    jsonArray(json["results"]).forEach(::add)
    jsonArray(json["outputs"]).forEach(::add)
    return outputs.toList()
}

fun inferIngredientTier(items: List<String>): Triple<String, Int, List<String>> {
    var tier = "survival"
    var blood = 0
    val hits = mutableListOf<String>()
    for (item in items) {
        casingToTier[item]?.let {
            tier = maxTier(tier, it)
            hits += item
        }
        slateToBloodTier[item]?.let {
            blood = maxOf(blood, it.second)
            hits += item
        }
        if (item == "create:brass_casing" || item == "create:precision_mechanism") tier = maxTier(tier, "create_brass")
        if (item == "powergrid:conductive_casing" || item.startsWith("powergrid:")) tier = maxTier(tier, "power_grid")
        if (item.startsWith("oc2r:")) tier = maxTier(tier, "power_grid")
        if (item.startsWith("creatingspace:")) tier = maxTier(tier, "space")
        if (item.startsWith("ae2:") || item.startsWith("advanced_ae:") || item.startsWith("ae2additions:")) tier = maxTier(tier, "ae2")
    }
    return Triple(tier, blood, hits)
}

fun isMachineLike(output: String, type: String): Boolean = (type.contains("crafting") || type.contains("mechanical") || type.contains("deploying")) && riskyWords.any { local(output).contains(it) }
fun intendedTier(output: String): String = when {
    casingToTier.containsKey(output) -> casingToTier.getValue(output)
    machineNamespaceTier.containsKey(ns(output)) -> machineNamespaceTier.getValue(ns(output))
    local(output).contains("wireless") || local(output).contains("spatial") -> "ae2"
    local(output).contains("teleport") || local(output).contains("chunk_loader") -> "power_grid"
    else -> "survival"
}
fun intendedBlood(output: String): Int = magicNamespaceBloodTier[ns(output)]?.substringAfter('_')?.toIntOrNull() ?: 0

data class SourceRow(val system: String, val id: String, val type: String? = null, val tier: String? = null, val blood: Int? = null)

val recipes = recipeChunks()
val recipeStats = linkedMapOf<String, Any>(
    "total" to recipes.size,
    "outputs" to 0,
    "risky" to mutableListOf<Map<String, Any?>>(),
    "materialHits" to mutableListOf<Map<String, Any?>>(),
    "byNamespace" to linkedMapOf<String, Int>(),
    "byType" to linkedMapOf<String, Int>()
)
val itemSources = linkedMapOf<String, MutableList<SourceRow>>()

fun addSource(item: String, source: SourceRow) {
    itemSources.getOrPut(item) { mutableListOf() } += source
}

for (r in recipes) {
    val namespace = jsonString(r["namespace"]).orEmpty()
    val type = jsonString(r["type"]).orEmpty()
    (recipeStats["byNamespace"] as MutableMap<String, Int>)[namespace] = ((recipeStats["byNamespace"] as MutableMap<String, Int>)[namespace] ?: 0) + 1
    (recipeStats["byType"] as MutableMap<String, Int>)[type] = ((recipeStats["byType"] as MutableMap<String, Int>)[type] ?: 0) + 1
    val parsed = runCatching { jsonObject(parseJson(jsonString(r["json"]).orEmpty())) }.getOrDefault(emptyMap())
    val outputs = extractOutputs(parsed)
    val ingredients = extractItems(parsed)
    val (ingTier, ingBlood, ingHits) = inferIngredientTier(ingredients)
    val jsonText = jsonString(r["json"]).orEmpty()
    val materialHits = valuableNeedles.filter(jsonText::contains)
    for (out in outputs) {
        recipeStats["outputs"] = (recipeStats["outputs"] as Int) + 1
        val intended = intendedTier(out)
        val machine = isMachineLike(out, type)
        val intendedB = if (machine) intendedBlood(out) else 0
        addSource(out, SourceRow("recipe", jsonString(r["id"]).orEmpty(), type, ingTier, ingBlood))
        if (materialHits.isNotEmpty()) (recipeStats["materialHits"] as MutableList<Map<String, Any?>>) += linkedMapOf("output" to out, "recipe" to jsonString(r["id"]).orEmpty(), "type" to type, "hits" to materialHits.take(6))
        if ((machine && !tierAtLeast(ingTier, intended)) || (intendedB > 0 && ingBlood < intendedB)) {
            (recipeStats["risky"] as MutableList<Map<String, Any?>>) += linkedMapOf(
                "output" to out,
                "recipe" to jsonString(r["id"]).orEmpty(),
                "type" to type,
                "intended" to intended,
                "actual" to ingTier,
                "intendedBlood" to intendedB,
                "actualBlood" to ingBlood,
                "ingredientHits" to ingHits.take(6)
            )
        }
    }
}

fun walkFiles(root: Path, predicate: (Path) -> Boolean): List<Path> {
    if (!exists(root)) return emptyList()
    return Files.walk(root).use { stream -> stream.filter { Files.isRegularFile(it) && predicate(it) }.toList() }
}

val lootFiles = walkFiles(dumpDir.resolve("loot_tables")) { it.toString().endsWith(".json") }
val lootStats = linkedMapOf<String, Any>(
    "files" to lootFiles.size,
    "coinSources" to mutableListOf<Map<String, Any?>>(),
    "emeraldSources" to mutableListOf<String>(),
    "valuableSources" to mutableListOf<Map<String, Any?>>(),
    "highRisk" to mutableListOf<Map<String, Any?>>()
)
for (file in lootFiles) {
    val rel = dumpDir.resolve("loot_tables").relativize(file).toString().removeSuffix(".json").replace('\\', '/')
    val parsed = runCatching { jsonObject(readJson(file)) }.getOrDefault(emptyMap())
    val items = extractItems(parsed).filterNot { it.startsWith("#") }
    for (item in items) {
        addSource(item, SourceRow("loot", rel))
        if (item in coinItems) (lootStats["coinSources"] as MutableList<Map<String, Any?>>) += linkedMapOf("table" to rel, "coin" to item, "tier" to jsonString(coinByItem[item]?.get("id")).orEmpty())
        if (item == "minecraft:emerald") (lootStats["emeraldSources"] as MutableList<String>) += rel
        if (item in valuableNeedles) (lootStats["valuableSources"] as MutableList<Map<String, Any?>>) += linkedMapOf("table" to rel, "item" to item)
        if ((item.contains("netherite") || item.contains("elytra") || item.contains("teleport") || item.contains("creative")) && !rel.contains("end_city") && !rel.contains("bastion")) {
            (lootStats["highRisk"] as MutableList<Map<String, Any?>>) += linkedMapOf("table" to rel, "item" to item)
        }
    }
}

val questFiles = walkFiles(repo.resolve("config/ftbquests/quests/chapters")) { it.toString().endsWith(".snbt") }
val questStats = linkedMapOf<String, Any>(
    "files" to questFiles.size,
    "rewards" to mutableListOf<Map<String, Any?>>(),
    "tasks" to mutableListOf<Map<String, Any?>>(),
    "coinRewards" to mutableListOf<Map<String, Any?>>()
)
for (file in questFiles) {
    val text = Files.readString(file)
    val chapter = file.fileName.toString()
    Regex("""rewards:\[([^\]]*)\]""").findAll(text).forEach { match ->
        Regex("""item:"([^"]+)"(?:\s+count:([0-9]+))?""").findAll(match.groupValues[1]).forEach { itemMatch ->
            val item = itemMatch.groupValues[1]
            val count = itemMatch.groupValues.getOrElse(2) { "1" }.ifBlank { "1" }
            (questStats["rewards"] as MutableList<Map<String, Any?>>) += linkedMapOf("chapter" to chapter, "item" to item, "count" to count)
            addSource(item, SourceRow("quest_reward", chapter))
            if (item in coinItems) (questStats["coinRewards"] as MutableList<Map<String, Any?>>) += linkedMapOf("chapter" to chapter, "coin" to item, "count" to count)
        }
    }
    Regex("""tasks:\[([^\]]*)\]""").findAll(text).forEach { match ->
        Regex("""item:"([^"]+)"""").findAll(match.groupValues[1]).forEach { itemMatch ->
            (questStats["tasks"] as MutableList<Map<String, Any?>>) += linkedMapOf("chapter" to chapter, "item" to itemMatch.groupValues[1])
        }
    }
}

val tradeScript = repo.resolve("kubejs/server_scripts/35_villager_trades/10_coin_villager_trades.js")
val tradeStats = linkedMapOf<String, Any>("rows" to 0, "emeraldMentions" to 0, "highTierResults" to mutableListOf<Map<String, Any?>>())
if (exists(tradeScript)) {
    val text = Files.readString(tradeScript)
    tradeStats["emeraldMentions"] = Regex("""minecraft:emerald""").findAll(text).count()
    Regex("""\[\s*(\d+)\s*,\s*'([^']+)'\s*,\s*(\d+)\s*,\s*'([^']+)'""").findAll(text).forEach { match ->
        tradeStats["rows"] = (tradeStats["rows"] as Int) + 1
        val result = match.groupValues[4]
        addSource(result, SourceRow("villager_trade", "${match.groupValues[2]}_coin_level_${match.groupValues[1]}"))
        if (result.contains("netherite") || result.contains("diamond") || result.contains("etherealslate")) {
            (tradeStats["highTierResults"] as MutableList<Map<String, Any?>>) += linkedMapOf("level" to match.groupValues[1], "coin" to match.groupValues[2], "result" to result)
        }
    }
}

val multiSource = itemSources.entries
    .filter { it.value.size > 1 }
    .map { (item, sources) ->
        linkedMapOf<String, Any>(
            "item" to item,
            "systems" to sources.map { it.system }.distinct(),
            "count" to sources.size
        )
    }
    .filter { (it["systems"] as List<*>).size > 1 }
    .sortedByDescending { jsonNumber(it["count"])?.toInt() ?: 0 }

fun top(obj: Map<String, Int>, n: Int = 20): List<Pair<String, Int>> = obj.entries.sortedByDescending { it.value }.take(n).map { it.toPair() }
val outDir = Paths.get(System.getenv("OUT_DIR") ?: repo.resolve("generated/validation/expert_graph").toString())
ensureDir(outDir)
fun writeDoc(name: String, content: String) = Files.writeString(outDir.resolve(name), content)

writeDoc(
    "expert_item_graph.md",
    """
    |# Expert Item Graph
    |
    |Generated: ${java.time.Instant.now()}
    |
    |This is the current source-of-truth graph model used by the offline audit. It treats recipes, loot, villager trades, Wares contracts, quest rewards, mob drops, and worldgen as material-conversion systems.
    |
    |## Tier Order
    |
    |${tierOrder.mapIndexed { index, tier -> "$index. $tier" }.joinToString("\n")}
    |
    |## Machine Tiers
    |
    |${table(listOf(listOf("Tier", "Casing", "Authority", "Requires Previous")) + jsonArray(catalog["machineTiers"]).map(::jsonObject).map { listOf(jsonString(it["id"]), jsonString(it["casing"]), jsonString(it["authority"]), jsonString(it["requiresPrevious"]) ?: "none") })}
    |## Blood Magic Authority
    |
    |${table(listOf(listOf("Tier", "Gate", "Mods")) + jsonArray(catalog["bloodMagicTiers"]).map(::jsonObject).map { listOf(jsonString(it["id"]), jsonString(it["gate"]), jsonArray(it["mods"]).joinToString(", ")) })}
    |## Coin Tiers
    |
    |${table(listOf(listOf("Index", "Tier", "Item", "Intended Sources")) + coinTiers.map { listOf(jsonNumber(it["index"]), jsonString(it["id"]), jsonString(it["item"]), jsonArray(it["intendedSources"]).joinToString(", ")) })}
    |## Critical Rules
    |
    |${jsonArray(catalog["criticalRules"]).joinToString("\n") { "- $it" }}
    """.trimMargin() + "\n"
)

writeDoc(
    "full_item_graph_audit.md",
    """
    |# Full Item Graph Audit
    |
    |Generated: ${java.time.Instant.now()}
    |
    |Instance: `$instance`
    |
    |## Recipe Graph
    |
    |- Recipes scanned: ${recipeStats["total"]}
    |- Recipe outputs extracted: ${recipeStats["outputs"]}
    |- Loot tables scanned: ${lootStats["files"]}
    |- Quest chapter files scanned: ${questStats["files"]}
    |- Villager trade rows parsed: ${tradeStats["rows"]}
    |
    |## Top Recipe Namespaces
    |
    |${table(listOf(listOf("Namespace", "Count")) + top(recipeStats["byNamespace"] as Map<String, Int>, 24).map { listOf(it.first, it.second) })}
    |## Top Recipe Types
    |
    |${table(listOf(listOf("Type", "Count")) + top(recipeStats["byType"] as Map<String, Int>, 24).map { listOf(it.first, it.second) })}
    |## Highest-Risk Ungated Or Undertiered Outputs
    |
    |${table(listOf(listOf("Output", "Recipe", "Type", "Intended Tier", "Actual Tier", "Blood Need/Actual")) + (recipeStats["risky"] as List<Map<String, Any?>>).take(120).map { listOf(it["output"], it["recipe"], it["type"], it["intended"], it["actual"], "${it["intendedBlood"]}/${it["actualBlood"]}") })}
    |## Valuable Vanilla Material Recipe Hits
    |
    |These are not automatically wrong. They are review targets where plain vanilla valuables may still be powering strong crafts.
    |
    |${table(listOf(listOf("Output", "Recipe", "Hits")) + (recipeStats["materialHits"] as List<Map<String, Any?>>).take(120).map { listOf(it["output"], it["recipe"], (it["hits"] as List<*>).joinToString(", ")) })}
    """.trimMargin() + "\n"
)

writeDoc(
    "cross_system_source_report.md",
    """
    |# Cross-System Source Report
    |
    |Generated: ${java.time.Instant.now()}
    |
    |This report lists item sources outside normal recipes and items produced by multiple material-conversion systems.
    |
    |## Coin Loot Sources
    |
    |${table(listOf(listOf("Loot Table", "Coin", "Tier")) + (lootStats["coinSources"] as List<Map<String, Any?>>).take(200).map { listOf(it["table"], it["coin"], it["tier"]) })}
    |## Quest Coin Rewards
    |
    |${table(listOf(listOf("Chapter", "Coin", "Count")) + (questStats["coinRewards"] as List<Map<String, Any?>>).take(200).map { listOf(it["chapter"], it["coin"], it["count"]) })}
    |## Villager Trade High-Tier Results
    |
    |${table(listOf(listOf("Level", "Coin", "Result")) + (tradeStats["highTierResults"] as List<Map<String, Any?>>).take(120).map { listOf(it["level"], it["coin"], it["result"]) })}
    |## Items With Multiple Source Systems
    |
    |${table(listOf(listOf("Item", "Systems", "Source Count")) + multiSource.take(160).map { listOf(it["item"], (it["systems"] as List<*>).joinToString(", "), it["count"]) })}
    |## Emerald Loot Sources
    |
    |${table(listOf(listOf("Loot Table")) + (lootStats["emeraldSources"] as List<String>).toSet().take(160).map { listOf(it) })}
    """.trimMargin() + "\n"
)

writeDoc(
    "no_bypass_report.md",
    """
    |# No-Bypass Report
    |
    |Generated: ${java.time.Instant.now()}
    |
    |This is an audit report, not a proof. The current KubeJS recipe dump is pre-addition for KubeJS-added recipes, so this report is best used to identify likely misses and non-recipe bypass surfaces.
    |
    |## Current Risk Counts
    |
    |${table(listOf(
        listOf("Class", "Count"),
        listOf("Recipe outputs below inferred tier or Blood gate", (recipeStats["risky"] as List<*>).size),
        listOf("Loot tables containing emerald", (lootStats["emeraldSources"] as List<String>).toSet().size),
        listOf("Loot high-risk table/item pairs", (lootStats["highRisk"] as List<*>).size),
        listOf("Villager script emerald mentions", tradeStats["emeraldMentions"]),
        listOf("Items with multiple source systems", multiSource.size)
    ))}
    |## MUST DO
    |
    |- Convert the top risky recipe outputs into explicit tiered recipes or remove them if they violate bounded matter/distance.
    |- Replace or justify remaining emerald loot tables, especially where they interact with village/trade economy.
    |- Extend loot coin tiering into modded structures deliberately, not by broad random injection.
    |- Replace the KubeJS recipe-event dump with a final recipe-manager dump when possible.
    |
    |## Top Recipe Risks
    |
    |${table(listOf(listOf("Output", "Recipe", "Intended", "Actual")) + (recipeStats["risky"] as List<Map<String, Any?>>).take(80).map { listOf(it["output"], it["recipe"], it["intended"], it["actual"]) })}
    |## Top Loot Risks
    |
    |${table(listOf(listOf("Loot Table", "Item")) + (lootStats["highRisk"] as List<Map<String, Any?>>).take(80).map { listOf(it["table"], it["item"]) })}
    """.trimMargin() + "\n"
)

val summary = linkedMapOf<String, Any>(
    "generatedAt" to java.time.Instant.now().toString(),
    "instance" to instance,
    "recipes" to recipes.size,
    "recipeOutputs" to (recipeStats["outputs"] as Int),
    "riskyRecipeOutputs" to (recipeStats["risky"] as List<*>).size,
    "lootTables" to lootFiles.size,
    "emeraldLootTables" to (lootStats["emeraldSources"] as List<String>).toSet().size,
    "coinLootSources" to (lootStats["coinSources"] as List<*>).size,
    "questFiles" to questFiles.size,
    "questCoinRewards" to (questStats["coinRewards"] as List<*>).size,
    "villagerTradeRows" to (tradeStats["rows"] as Int),
    "multiSourceItems" to multiSource.size
)
Files.writeString(outDir.resolve("expert_item_graph_summary.json"), renderJson(summary) + "\n")
println(renderJson(summary))

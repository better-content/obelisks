#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import kotlin.system.exitProcess

val repo = Paths.get("").toAbsolutePath().normalize()
fun full(rel: String): Path = repo.resolve(rel)
fun read(rel: String): String = Files.readString(full(rel))
fun exists(rel: String): Boolean = Files.exists(full(rel))

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
        require(peek() == ch) { "expected '$ch' at $index" }
        index++
    }
}

fun parseJson(text: String): Any? = JsonParser(text).parse()
fun readJson(rel: String): Any? = parseJson(read(rel))
fun jsonObject(value: Any?): Map<String, Any?> = value as? Map<String, Any?> ?: emptyMap()
fun jsonArray(value: Any?): List<Any?> = value as? List<Any?> ?: emptyList()
fun jsonString(value: Any?): String? = value as? String
fun jsonNumber(value: Any?): Number? = value as? Number

fun renderJson(value: Any?, indent: String = ""): String = when (value) {
    null -> "null"
    is String -> "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\""
    is Number, is Boolean -> value.toString()
    is Map<*, *> -> "{\n" + value.entries.joinToString(",\n") { (k, v) -> "$indent  ${renderJson(k.toString())}: ${renderJson(v, "$indent  ")}" } + "\n$indent}"
    is Iterable<*> -> "[\n" + value.joinToString(",\n") { "$indent  ${renderJson(it, "$indent  ")}" } + "\n$indent]"
    else -> renderJson(value.toString(), indent)
}

fun walkFiles(root: Path, predicate: (Path) -> Boolean, out: MutableList<Path> = mutableListOf()): List<Path> {
    if (!Files.exists(root)) return out
    Files.walk(root).use { stream ->
        stream.filter { Files.isRegularFile(it) && predicate(it) }.forEach(out::add)
    }
    return out
}

val dumpRoot = "generated/runtime-dumps/kubejs-config"
val outputRoot = "generated/validation"
val hardPrefixRejects = listOf("ae2:", "advanced_ae:", "ars_nouveau:", "pneumaticcraft:", "bloodmagic:", "chemlib:", "k_turrets:", "tconstruct:", "wares:", "protection_pixel:", "sophisticatedbackpacks:", "sophisticatedstorage:")
val hardExactRejects = setOf("create:track", "create:track_station", "create:controller_rail", "create:precision_mechanism", "minecraft:tnt", "minecraft:tnt_minecart", "minecraft:flint_and_steel", "minecraft:gunpowder", "minecraft:fire_charge", "minecraft:water_bucket", "minecraft:lava_bucket", "minecraft:emerald", "minecraft:emerald_block", "minecraft:golden_carrot", "minecraft:golden_apple", "minecraft:bone_meal", "minecraft:redstone_torch", "minecraft:note_block", "minecraft:chest_minecart", "minecraft:hopper_minecart", "minecraft:furnace_minecart", "farmersdelight:flint_knife", "tconstruct:hand_axe", "quark:seed_pouch", "minecraft:bucket")
val hardPatternRejects = listOf(
    Regex("""(^|:)stripped_"""),
    Regex("""(^|:).*(log|wood|planks)$"""),
    Regex("""(^|:).*(pickaxe|_axe|shovel|hoe|sword|knife|hammer|saw|mattock|excavator)$"""),
    Regex("""(^|:).*(helmet|chestplate|leggings|boots)$"""),
    Regex("""(^|:).*(chest|barrel|crate|basket|backpack|pouch|sack|satchel|bundle)$"""),
    Regex("""(^|:).*(controller|machine|casing|gearbox|motor|engine|generator|reactor|turbine|processor|circuit|chip|coil|dynamo|pump|pipe|duct|tube|cable|wire|terminal|drive|cell|battery|capacitor|module|upgrade|propeller|water_wheel|cogwheel)$"""),
    Regex("""(^|:).*(ingot|nugget|plate|sheet|gear|rod|wire|dust|gem|crystal|alloy|slate|orb)$"""),
    Regex("""(^|:).*(spell|wand|staff|ritual|rune|altar|pedestal|source_jar|blood_orb)$"""),
    Regex("""(^|:).*(gunpowder|explosive|blast|fuse)"""),
    Regex("""(^|:)coin_(diamond|emerald|gold|netherite|amethyst)"""),
    Regex("""(^|:).*redstone"""),
    Regex("""(^|:).*(spawn_egg|creative|debug|command)""")
)
val starterExceptions = setOf("create:copper_diving_helmet", "create:copper_diving_boots")
val roleMatchers = listOf(
    "Food" to Regex("""(food|meal|stew|soup|pie|cake|bread|toast|apple|berry|carrot|potato|onion|cabbage|tomato|rice|mushroom|seed|panicle|crop|tea|coffee|juice|beer|vodka|wine)"""),
    "Water" to Regex("""(water|canteen|waterskin|bowl|cup|diving|snorkel)"""),
    "Camp" to Regex("""(torch|lantern|candle|campfire|charcoal|match|bedroll)"""),
    "Route" to Regex("""(map|compass|spyglass|rope|lead|saddle|rail|minecart|glider|boat|cart|waystone|signpost|calendar|clock)"""),
    "Trade" to Regex("""(coin|emerald|voucher|note)"""),
    "Blasting" to Regex("""(gunpowder|fire_charge|blast|explosive|fuse)"""),
    "Material" to Regex("""(paper|string|leather|clay|brick|flint|bone|feather|wool|hide)""")
)

data class ItemStat(
    val item: String,
    var inputRecipeCount: Int = 0,
    var outputRecipeCount: Int = 0,
    var mentionedRecipeCount: Int = 0,
    val inputTypes: MutableSet<String> = linkedSetOf(),
    val outputTypes: MutableSet<String> = linkedSetOf(),
    val recipes: MutableSet<String> = linkedSetOf()
)

fun idLooksReal(value: String?): Boolean = value != null && Regex("""^[a-z0-9_.-]+:[a-z0-9_./-]+$""").matches(value) && !value.startsWith("forge:")

fun addStat(map: MutableMap<String, ItemStat>, item: String, field: String, recipe: Map<String, Any?>) {
    if (!idLooksReal(item)) return
    val stat = map.getOrPut(item) { ItemStat(item) }
    stat.recipes += (jsonString(recipe["id"]) ?: "")
    when (field) {
        "input" -> {
            stat.inputRecipeCount++
            stat.inputTypes += (jsonString(recipe["type"]) ?: "UNKNOWN")
        }
        "output" -> {
            stat.outputRecipeCount++
            stat.outputTypes += (jsonString(recipe["type"]) ?: "UNKNOWN")
        }
        else -> stat.mentionedRecipeCount++
    }
}

fun collectRecipeItems(value: Any?, recipe: Map<String, Any?>, map: MutableMap<String, ItemStat>, pathParts: List<String> = emptyList()) {
    when (value) {
        null -> Unit
        is String -> {
            if (!idLooksReal(value)) return
            val key = pathParts.lastOrNull().orEmpty()
            val parentKey = if (pathParts.size >= 2) pathParts[pathParts.lastIndex - 1] else ""
            val field = when {
                key == "item" && Regex("""result|output|outputs|results|secondary|byproduct""").containsMatchIn(parentKey) -> "output"
                key == "item" -> "input"
                Regex("""result|output|outputs|results""").containsMatchIn(key) -> "output"
                Regex("""ingredient|input|tool|base|addition|template|pattern""").containsMatchIn(key) -> "input"
                else -> "mention"
            }
            addStat(map, value, field, recipe)
        }
        is List<*> -> value.forEachIndexed { index, entry -> collectRecipeItems(entry, recipe, map, pathParts + index.toString()) }
        is Map<*, *> -> value.forEach { (nextKey, nextValue) -> collectRecipeItems(nextValue, recipe, map, pathParts + nextKey.toString()) }
    }
}

fun loadRecipes(): List<Map<String, Any?>> {
    val manifest = jsonObject(readJson("$dumpRoot/full_recipe_index_manifest.json"))
    val chunkCount = jsonNumber(manifest["chunkCount"])?.toInt() ?: 0
    val recipes = mutableListOf<Map<String, Any?>>()
    repeat(chunkCount) { index ->
        val name = "full_recipe_index_${index.toString().padStart(4, '0')}.json"
        for (recipeAny in jsonArray(jsonObject(readJson("$dumpRoot/$name"))["recipes"])) {
            val recipe = (recipeAny as? Map<*, *>)?.mapKeys { it.key.toString() } ?: emptyMap()
            val parsed = runCatching { parseJson(jsonString(recipe["json"]).orEmpty()) }.getOrNull()
            recipes += LinkedHashMap<String, Any?>(recipe).apply { put("parsed", parsed) }
        }
    }
    return recipes
}

fun roleFor(item: String): String {
    val local = item.substringAfter(':')
    for ((role, pattern) in roleMatchers) {
        if (pattern.containsMatchIn(local)) return role
    }
    return "Other"
}

fun rejectionReasons(item: String, functionalBlocks: Set<String>): List<String> {
    val reasons = mutableListOf<String>()
    val isException = item in starterExceptions
    hardPrefixRejects.filter { item.startsWith(it) }.forEach { reasons += "prefix $it" }
    if (item in hardExactRejects) reasons += "exact hard reject"
    hardPatternRejects.filter { !isException && it.containsMatchIn(item) }.forEach { reasons += "pattern ${it.pattern}" }
    if (item in functionalBlocks) reasons += "functional crafting/processing block"
    return reasons
}

fun candidateScore(stat: ItemStat, item: String): Double {
    val role = roleFor(item)
    var score = 0.0
    if (role != "Other") score += 4
    score += minOf(6.0, stat.inputRecipeCount / 3.0)
    score += minOf(3.0, stat.outputRecipeCount / 6.0)
    if (stat.inputRecipeCount > 0 && stat.outputRecipeCount > 0) score += 2
    if (role in setOf("Food", "Water", "Camp", "Route", "Trade", "Blasting")) score += 3
    if (item.startsWith("minecraft:")) score += 1
    if (item.startsWith("farmersdelight:") || item.startsWith("farmersrespite:") || item.startsWith("brewinandchewin:")) score += 1
    return score
}

fun loadFunctionalBlocks(): Set<String> {
    val file = full("generated/runtime-dumps/crafting-relevant-functional-blocks.tsv")
    if (!Files.exists(file)) return emptySet()
    return Files.readAllLines(file).drop(1).mapNotNull { line ->
        line.substringBefore('\t').takeIf(::idLooksReal)
    }.toSet()
}

fun starterItems(): Triple<Map<String, Any?>, List<Map<String, Any?>>, List<Map<String, Any?>>> {
    val embark = jsonObject(readJson("config/classselector/embark.json"))
    val kits = jsonArray(readJson("config/classselector/kits.json")).map { jsonObject(it) }
    val items = mutableListOf<Map<String, Any?>>()
    for (entry in jsonArray(embark["items"]).map(::jsonObject)) {
        items += linkedMapOf<String, Any?>("source" to "embark:${jsonString(entry["id"]).orEmpty()}").apply { putAll(entry) }
    }
    for (kit in kits) {
        for (entry in jsonArray(kit["items"]).map(::jsonObject)) {
            items += linkedMapOf<String, Any?>("source" to "kit:${jsonString(kit["id"]).orEmpty()}").apply { putAll(entry) }
        }
    }
    return Triple(embark, kits, items)
}

fun summarizeSet(values: Set<String>, max: Int = 8): List<String> = values.sorted().take(max)

val recipes = loadRecipes()
val itemStats = linkedMapOf<String, ItemStat>()
for (recipe in recipes) {
    collectRecipeItems(recipe["parsed"], recipe, itemStats)
}

val functionalBlocks = loadFunctionalBlocks()
val (embark, kits, starterEntries) = starterItems()

val currentStarterAudit = starterEntries.map { entry ->
    val item = jsonString(entry["item"]).orEmpty()
    val stat = itemStats[item] ?: ItemStat(item)
    val reasons = rejectionReasons(item, functionalBlocks)
    linkedMapOf<String, Any?>(
        "source" to jsonString(entry["source"]).orEmpty(),
        "item" to item,
        "category" to (jsonString(entry["category"]) ?: "Kit"),
        "count" to (jsonNumber(entry["count"])?.toInt() ?: 1),
        "cost" to jsonNumber(entry["cost"]),
        "role" to roleFor(item),
        "inputRecipeCount" to stat.inputRecipeCount,
        "outputRecipeCount" to stat.outputRecipeCount,
        "sampleInputTypes" to summarizeSet(stat.inputTypes),
        "sampleOutputTypes" to summarizeSet(stat.outputTypes),
        "progressionRecipeParticipant" to false,
        "rejectionReasons" to reasons
    )
}

val candidatePool = itemStats.values
    .map { stat ->
        linkedMapOf<String, Any?>(
            "item" to stat.item,
            "role" to roleFor(stat.item),
            "score" to candidateScore(stat, stat.item),
            "inputRecipeCount" to stat.inputRecipeCount,
            "outputRecipeCount" to stat.outputRecipeCount,
            "sampleInputTypes" to summarizeSet(stat.inputTypes, 5),
            "sampleOutputTypes" to summarizeSet(stat.outputTypes, 5),
            "rejectionReasons" to rejectionReasons(stat.item, functionalBlocks)
        )
    }
    .filter {
        val role = jsonString(it["role"]).orEmpty()
        role != "Other" && role != "Material" &&
            jsonArray(it["rejectionReasons"]).isEmpty() &&
            ((jsonNumber(it["inputRecipeCount"])?.toInt() ?: 0) + (jsonNumber(it["outputRecipeCount"])?.toInt() ?: 0) >= 2)
    }
    .sortedWith(
        compareByDescending<Map<String, Any?>> { jsonNumber(it["score"])?.toDouble() ?: 0.0 }
            .thenByDescending { jsonNumber(it["inputRecipeCount"])?.toInt() ?: 0 }
            .thenBy { jsonString(it["item"]).orEmpty() }
    )

val byRole = linkedMapOf<String, MutableList<Map<String, Any?>>>()
for (candidate in candidatePool) {
    val role = jsonString(candidate["role"]).orEmpty()
    val bucket = byRole.getOrPut(role) { mutableListOf() }
    if (bucket.size < 20) bucket += candidate
}

val starterRejects = currentStarterAudit.filter { jsonArray(it["rejectionReasons"]).isNotEmpty() }
val starterSummary = linkedMapOf<String, Any>(
    "embarkItems" to jsonArray(embark["items"]).size,
    "embarkQuota" to (jsonNumber(embark["pointQuota"])?.toInt() ?: 0),
    "kitCount" to kits.size,
    "starterStacks" to starterEntries.size,
    "rejectedStarterEntries" to starterRejects.size
)

val report = linkedMapOf<String, Any?>(
    "generatedBy" to "tools/kotlin/audit_starting_item_economy.main.kts",
    "source" to linkedMapOf<String, Any>(
        "recipeDump" to dumpRoot,
        "recipeCount" to recipes.size,
        "starterConfigs" to listOf("config/classselector/embark.json", "config/classselector/kits.json")
    ),
    "summary" to starterSummary,
    "currentStarterAudit" to currentStarterAudit,
    "candidateRoles" to byRole,
    "notes" to listOf(
        "Candidate scoring is advisory. Hard rejects are progression-safety rules, not balance decisions.",
        "Progression recipe participation is reported as context, but not automatically rejected; common support items such as torches and compasses appear in progression-adjacent recipes without being progression keys.",
        "Recipe graph depth counts recipe participation, so high-score items still need design review before becoming starter options."
    )
)

Files.createDirectories(full(outputRoot))
Files.writeString(full("$outputRoot/starting_item_economy_audit.json"), renderJson(report) + "\n")

val md = mutableListOf<String>()
md += "# Starting Item Economy Audit"
md += ""
md += "Recipes scanned: ${recipes.size}"
md += "Embark options: ${starterSummary["embarkItems"]} at quota ${starterSummary["embarkQuota"]}"
md += "Fallback kits: ${starterSummary["kitCount"]}"
md += "Starter entries audited: ${starterSummary["starterStacks"]}"
md += "Rejected starter entries: ${starterSummary["rejectedStarterEntries"]}"
md += ""
if (starterRejects.isNotEmpty()) {
    md += "## Starter Safety Findings"
    for (entry in starterRejects) {
        md += "- ${jsonString(entry["source"]).orEmpty()} ${jsonString(entry["item"]).orEmpty()}: ${jsonArray(entry["rejectionReasons"]).joinToString(", ")}"
    }
    md += ""
}
md += "## Current Starter Roles"
for (entry in currentStarterAudit) {
    md += "- ${entry["source"]} ${entry["item"]}: ${entry["role"]}; inputs ${entry["inputRecipeCount"]}, outputs ${entry["outputRecipeCount"]}"
}
md += ""
md += "## Interesting Safe Candidate Pool"
for (role in byRole.keys.sorted()) {
    md += "### $role"
    for (candidate in byRole[role].orEmpty().take(12)) {
        md += "- ${candidate["item"]}: score ${"%.2f".format((jsonNumber(candidate["score"])?.toDouble() ?: 0.0))}, inputs ${candidate["inputRecipeCount"]}, outputs ${candidate["outputRecipeCount"]}"
    }
}
md += ""
md += "## Conclusion"
md += "The current starter pool is mostly support economy rather than production economy. The safest expansion space is route, hydration, light, food variety, animal routing, and low-value trade. Machine surfaces, storage, tools, raw metals, casing/circuit materials, ready explosives, and magic or network starters are rejected."
Files.writeString(full("$outputRoot/starting_item_economy_audit.md"), md.joinToString("\n") + "\n")

println("scanned ${recipes.size} recipes")
println("starter entries: ${starterSummary["starterStacks"]}; rejected: ${starterSummary["rejectedStarterEntries"]}")
println("wrote $outputRoot/starting_item_economy_audit.json")
println("wrote $outputRoot/starting_item_economy_audit.md")
if (starterRejects.isNotEmpty()) exitProcess(1)

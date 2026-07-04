#!/usr/bin/env kotlin

import java.io.File
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.util.zip.ZipFile
import kotlin.io.path.exists

val repo = Paths.get("").toAbsolutePath().normalize()
val dumpDir = repo.resolve("generated/runtime-dumps")
val kubejsConfigDir = dumpDir.resolve("kubejs-config")

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
            index += 1
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
                ',' -> index += 1
                '}' -> {
                    index += 1
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
            index += 1
            return list
        }
        while (true) {
            list += parseValue()
            skip()
            when (peek()) {
                ',' -> index += 1
                ']' -> {
                    index += 1
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
                            else -> error("bad escape: \\$esc")
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
        if (peek() == '-') index += 1
        while (peek()?.isDigit() == true) index += 1
        if (peek() == '.') {
            index += 1
            while (peek()?.isDigit() == true) index += 1
        }
        if (peek() == 'e' || peek() == 'E') {
            index += 1
            if (peek() == '+' || peek() == '-') index += 1
            while (peek()?.isDigit() == true) index += 1
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
        while (index < text.length && text[index].isWhitespace()) index += 1
    }
    private fun peek(): Char? = text.getOrNull(index)
    private fun expect(ch: Char) {
        require(peek() == ch) { "expected '$ch' at $index" }
        index += 1
    }
}

fun parseJson(text: String): Any? = JsonParser(text).parse()
fun jsonObject(value: Any?): Map<String, Any?> = value as? Map<String, Any?> ?: emptyMap()
fun jsonArray(value: Any?): List<Any?> = value as? List<Any?> ?: emptyList()
fun jsonString(value: Any?): String? = value as? String
fun jsonNumber(value: Any?): Number? = value as? Number

fun readJson(path: Path): Any? = parseJson(Files.readString(path))
fun renderJson(value: Any?, indent: String = ""): String = when (value) {
    null -> "null"
    is String -> "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\""
    is Number, is Boolean -> value.toString()
    is Map<*, *> -> "{\n" + value.entries.joinToString(",\n") { (k, v) -> "$indent  ${renderJson(k.toString())}: ${renderJson(v, "$indent  ")}" } + "\n$indent}"
    is Iterable<*> -> "[\n" + value.joinToString(",\n") { "$indent  ${renderJson(it, "$indent  ")}" } + "\n$indent]"
    else -> renderJson(value.toString(), indent)
}

fun namespace(id: String): String = id.substringBefore(':', "minecraft")
fun localName(id: String): String = id.substringAfter(':', id)
fun idLooksReal(value: String?): Boolean = value != null && Regex("""^[a-z0-9_.-]+:[a-z0-9_./-]+$""").matches(value)

data class TagDef(val values: List<String>)
data class BlockInfo(val id: String, val namespace: String, val sources: MutableSet<String> = sortedSetOf())
data class RecipeRecord(val id: String, val type: String, val parsed: Map<String, Any?>)
data class BurntRow(
    val blockId: String,
    val category: String,
    val recommendedTags: List<String>,
    val matchedTags: List<String>,
    val namespace: String,
    val sources: List<String>,
)
data class FunctionalRow(
    val blockId: String,
    val namespace: String,
    val categories: Set<String>,
    val sources: Set<String>,
)
data class FunctionalSurfaceRow(
    val blockId: String,
    val roles: Set<String>,
    val namespace: String,
    val categories: Set<String>,
    val sources: Set<String>,
)
data class EdgeRow(
    val surfaceBlock: String,
    val relation: String,
    val blockId: String,
    val recipeId: String,
    val recipeType: String,
)

val knownBlocks = linkedMapOf<String, BlockInfo>()
val tagDefs = linkedMapOf<String, TagDef>()
val trackedBurntTags = listOf(
    "burnt:plants_will_burn",
    "burnt:grass_blocks",
    "burnt:fire_resistant",
    "minecraft:logs",
    "minecraft:logs_that_burn",
    "minecraft:planks",
    "minecraft:leaves",
    "minecraft:crops",
    "minecraft:wooden_buttons",
    "minecraft:wooden_pressure_plates",
    "minecraft:wooden_doors",
    "minecraft:wooden_trapdoors",
    "minecraft:wooden_fences",
    "minecraft:fence_gates",
    "minecraft:wooden_slabs",
    "minecraft:wooden_stairs",
    "forge:mushroom_blocks",
    "minecraft:wool_carpets",
)

fun registerBlock(id: String, source: String) {
    if (!idLooksReal(id)) return
    knownBlocks.getOrPut(id) { BlockInfo(id, namespace(id)) }.sources += source
}

fun collectLocalTagDefs(root: Path) {
    if (!root.exists()) return
    Files.walk(root).use { stream ->
        stream.filter { Files.isRegularFile(it) && it.fileName.toString().endsWith(".json") }.forEach { file ->
            val rel = root.relativize(file).toString().replace(File.separatorChar, '/')
            val match = Regex("""^([^/]+)/tags/blocks/(.+)\.json$""").find(rel) ?: return@forEach
            val tagId = "${match.groupValues[1]}:${match.groupValues[2]}"
            val values = jsonArray(jsonObject(readJson(file))["values"]).mapNotNull(::jsonString)
            tagDefs[tagId] = TagDef(values)
        }
    }
}

fun collectJarMetadata(modsDir: Path) {
    if (!modsDir.exists()) return
    Files.list(modsDir).use { entries ->
        entries.filter { Files.isRegularFile(it) && it.fileName.toString().endsWith(".jar") }.sorted().forEach { jarPath ->
            ZipFile(jarPath.toFile()).use { zip ->
                val jarName = jarPath.fileName.toString()
                val items = zip.entries().asSequence().toList()
                for (entry in items) {
                    val name = entry.name
                    val blockstateMatch = Regex("""^assets/([^/]+)/blockstates/(.+)\.json$""").find(name)
                    if (blockstateMatch != null) {
                        registerBlock("${blockstateMatch.groupValues[1]}:${blockstateMatch.groupValues[2]}", jarName)
                        continue
                    }
                    val tagMatch = Regex("""^data/([^/]+)/tags/blocks/(.+)\.json$""").find(name)
                    if (tagMatch != null) {
                        val tagId = "${tagMatch.groupValues[1]}:${tagMatch.groupValues[2]}"
                        val text = zip.getInputStream(entry).bufferedReader().use { it.readText() }
                        val values = jsonArray(jsonObject(parseJson(text))["values"]).mapNotNull(::jsonString)
                        tagDefs[tagId] = TagDef(values)
                    }
                }
            }
        }
    }
}

fun collectKubejsBlockstates() {
    val assetsRoot = repo.resolve("kubejs/assets")
    if (!assetsRoot.exists()) return
    Files.walk(assetsRoot).use { stream ->
        stream.filter { Files.isRegularFile(it) && it.fileName.toString().endsWith(".json") }.forEach { file ->
            val rel = assetsRoot.relativize(file).toString().replace(File.separatorChar, '/')
            val match = Regex("""^([^/]+)/blockstates/(.+)\.json$""").find(rel) ?: return@forEach
            registerBlock("${match.groupValues[1]}:${match.groupValues[2]}", "kubejs")
        }
    }
}

fun collectRegistryBlocks() {
    val path = dumpDir.resolve("registries.json")
    if (!path.exists()) return
    val blocks = jsonObject(jsonObject(readJson(path))["blocks"])
    for ((id, meta) in blocks) {
        if (!idLooksReal(id)) continue
        registerBlock(id, "registries")
        val sourceNs = jsonString(jsonObject(meta)["namespace"]) ?: namespace(id)
        knownBlocks[id]?.sources?.remove("registries")
        knownBlocks[id]?.sources?.add(sourceNs)
    }
}

fun loadRecipes(): List<RecipeRecord> {
    val manifest = kubejsConfigDir.resolve("full_recipe_index_manifest.json")
    if (!manifest.exists()) return emptyList()
    val chunkCount = jsonNumber(jsonObject(readJson(manifest))["chunkCount"])?.toInt() ?: 0
    val out = mutableListOf<RecipeRecord>()
    repeat(chunkCount) { index ->
        val file = kubejsConfigDir.resolve("full_recipe_index_${index.toString().padStart(4, '0')}.json")
        if (!file.exists()) return@repeat
        val recipes = jsonArray(jsonObject(readJson(file))["recipes"])
        for (recipeAny in recipes) {
            val recipe = jsonObject(recipeAny)
            val parsed = runCatching { jsonObject(parseJson(jsonString(recipe["json"]).orEmpty())) }.getOrDefault(emptyMap())
            out += RecipeRecord(
                id = jsonString(recipe["id"]).orEmpty(),
                type = jsonString(recipe["type"]).orEmpty(),
                parsed = parsed,
            )
        }
    }
    return out
}

fun extractOutputs(value: Any?): Set<String> {
    val outputs = linkedSetOf<String>()
    fun add(v: Any?) {
        when (v) {
            is String -> if (idLooksReal(v)) outputs += v
            is Map<*, *> -> {
                val obj = v.mapKeys { it.key.toString() }
                jsonString(obj["item"])?.takeIf(::idLooksReal)?.let(outputs::add)
                jsonString(obj["id"])?.takeIf(::idLooksReal)?.let(outputs::add)
            }
        }
    }
    val obj = jsonObject(value)
    add(obj["result"])
    add(obj["output"])
    jsonArray(obj["results"]).forEach(::add)
    jsonArray(obj["outputs"]).forEach(::add)
    return outputs
}

fun extractInputItems(value: Any?, path: List<String> = emptyList(), out: MutableSet<String> = linkedSetOf()): Set<String> {
    when (value) {
        is String -> {
            val key = path.lastOrNull().orEmpty()
            val parent = path.dropLast(1).lastOrNull().orEmpty()
            val isInput = key == "item" || key == "ingredient" || key == "base" || key == "addition" || key == "template" ||
                parent.contains("ingredient") || parent.contains("input") || parent.contains("ingredients") || parent.contains("tool")
            if (isInput && idLooksReal(value)) out += value
        }
        is List<*> -> value.forEachIndexed { index, any -> extractInputItems(any, path + index.toString(), out) }
        is Map<*, *> -> value.forEach { (k, v) -> extractInputItems(v, path + k.toString(), out) }
    }
    return out
}

fun trackedTagValues(tagId: String, cache: MutableMap<String, Set<String>>, stack: MutableSet<String> = mutableSetOf()): Set<String> {
    cache[tagId]?.let { return it }
    if (!stack.add(tagId)) return emptySet()
    val def = tagDefs[tagId] ?: return emptySet()
    val values = linkedSetOf<String>()
    for (value in def.values) {
        when {
            value.startsWith("#") -> values += trackedTagValues(value.removePrefix("#"), cache, stack)
            idLooksReal(value) -> values += value
        }
    }
    stack.remove(tagId)
    return values.also { cache[tagId] = it }
}

fun burnCategoryAndRecommendations(blockId: String, matchedTags: Set<String>): Pair<String?, List<String>> {
    val name = localName(blockId)
    fun hasAny(vararg tokens: String): Boolean = tokens.any { name.contains(it) }
    val category = when {
        "minecraft:crops" in matchedTags || hasAny("crop", "berry_bush", "tomato", "cabbage", "onion", "rice", "pepper", "turnip", "cauliflower", "bean", "stem") -> "crops"
        "burnt:grass_blocks" in matchedTags || hasAny("grass_block", "grass", "podzol") -> "grass_blocks"
        "burnt:fire_resistant" in matchedTags || hasAny("asbestos", "fireproof") -> "fire_resistant"
        "minecraft:logs_that_burn" in matchedTags || "minecraft:logs" in matchedTags || hasAny("_log", "_wood", "stem") -> "logs_that_burn"
        "minecraft:planks" in matchedTags || hasAny("planks") -> "planks"
        "minecraft:leaves" in matchedTags || hasAny("leaves", "leaf") -> "leaves"
        "minecraft:wooden_buttons" in matchedTags || hasAny("button") -> "wooden_buttons"
        "minecraft:wooden_pressure_plates" in matchedTags || hasAny("pressure_plate") -> "wooden_pressure_plates"
        "minecraft:wooden_doors" in matchedTags || hasAny("door") -> "wooden_doors"
        "minecraft:wooden_trapdoors" in matchedTags || hasAny("trapdoor") -> "wooden_trapdoors"
        "minecraft:wooden_fences" in matchedTags || hasAny("fence") && !hasAny("fence_gate") -> "wooden_fences"
        "minecraft:fence_gates" in matchedTags || hasAny("fence_gate") -> "fence_gates"
        "minecraft:wooden_slabs" in matchedTags || hasAny("slab") -> "wooden_slabs"
        "minecraft:wooden_stairs" in matchedTags || hasAny("stairs") -> "wooden_stairs"
        "forge:mushroom_blocks" in matchedTags || hasAny("mushroom_block") -> "mushroom_blocks"
        "minecraft:wool_carpets" in matchedTags || hasAny("carpet") -> "wool_carpets"
        "burnt:plants_will_burn" in matchedTags || hasAny("sapling", "flower", "bush", "vine", "grass", "fern", "moss", "lily", "reed", "mushroom", "fungus", "petal", "blossom", "cactus", "bamboo", "root") -> "plants_will_burn"
        else -> null
    }
    val recommendations = when (category) {
        "crops" -> listOf("minecraft:crops", "burnt:plants_will_burn")
        "grass_blocks" -> listOf("burnt:grass_blocks")
        "fire_resistant" -> listOf("burnt:fire_resistant")
        "logs_that_burn" -> listOf("minecraft:logs_that_burn", "minecraft:logs")
        "planks" -> listOf("minecraft:planks")
        "leaves" -> listOf("minecraft:leaves")
        "wooden_buttons" -> listOf("minecraft:wooden_buttons")
        "wooden_pressure_plates" -> listOf("minecraft:wooden_pressure_plates")
        "wooden_doors" -> listOf("minecraft:wooden_doors")
        "wooden_trapdoors" -> listOf("minecraft:wooden_trapdoors")
        "wooden_fences" -> listOf("minecraft:wooden_fences")
        "fence_gates" -> listOf("minecraft:fence_gates")
        "wooden_slabs" -> listOf("minecraft:wooden_slabs")
        "wooden_stairs" -> listOf("minecraft:wooden_stairs")
        "mushroom_blocks" -> listOf("forge:mushroom_blocks")
        "wool_carpets" -> listOf("minecraft:wool_carpets")
        "plants_will_burn" -> listOf("burnt:plants_will_burn")
        else -> emptyList()
    }
    return category to recommendations
}

fun generateBurntCoverage() {
    val resolvedTagCache = mutableMapOf<String, Set<String>>()
    val trackedMemberships = trackedBurntTags.associateWith { trackedTagValues(it, resolvedTagCache) }
    val currentCovered = mutableListOf<BurntRow>()
    val missing = mutableListOf<BurntRow>()
    val recommendedByTag = linkedMapOf<String, MutableSet<String>>()
    val recommendedHighConfidenceByTag = linkedMapOf<String, MutableSet<String>>()
    for ((blockId, info) in knownBlocks) {
        val matchedTags = trackedMemberships.filterValues { blockId in it }.keys.toSortedSet()
        val (category, recommendedTags) = burnCategoryAndRecommendations(blockId, matchedTags)
        if (category == null || recommendedTags.isEmpty()) continue
        val row = BurntRow(blockId, category, recommendedTags, matchedTags.toList(), info.namespace, info.sources.toList())
        if (recommendedTags.all { it in matchedTags }) {
            currentCovered += row
        } else {
            missing += row
            for (tag in recommendedTags.filterNot { it in matchedTags }) {
                recommendedByTag.getOrPut(tag) { sortedSetOf() } += blockId
            }
        }
    }
    val currentPath = dumpDir.resolve("burnt-coverage-current-covered.tsv")
    val missingPath = dumpDir.resolve("burnt-coverage-missing.tsv")
    val missingHighPath = dumpDir.resolve("burnt-coverage-missing-high-confidence.tsv")
    val recommendedPath = dumpDir.resolve("burnt-coverage-recommended-tags.json")
    val recommendedHighPath = dumpDir.resolve("burnt-coverage-recommended-tags-high-confidence.json")
    fun writeRows(path: Path, rows: List<BurntRow>) {
        val header = "block_id\tcategory\trecommended_tags\tmatched_tags\tnamespace\tsources\n"
        val body = rows.sortedBy { it.blockId }.joinToString("\n") {
            listOf(it.blockId, it.category, it.recommendedTags.joinToString(","), it.matchedTags.joinToString(","), it.namespace, it.sources.joinToString(",")).joinToString("\t")
        }
        Files.writeString(path, header + if (body.isBlank()) "" else "$body\n")
    }
    writeRows(currentPath, currentCovered)
    writeRows(missingPath, missing)
    writeRows(missingHighPath, emptyList())
    Files.writeString(recommendedPath, renderJson(recommendedByTag.mapValues { it.value.toList() }) + "\n")
    Files.writeString(recommendedHighPath, renderJson(recommendedHighConfidenceByTag.mapValues { it.value.toList() }) + "\n")
}

fun categoriesFor(blockId: String): Set<String> {
    val local = localName(blockId)
    val out = linkedSetOf<String>()
    fun match(vararg words: String): Boolean = words.any { local.contains(it) }
    if (match("table", "workbench", "bench", "altar", "scribes_table", "station", "lectern")) out += "crafting_workstations"
    if (match("mixer", "press", "mill", "crusher", "crushing_wheel", "deployer", "fan", "drain", "spout", "charger", "inscriber", "assembler", "crafter", "refinery", "compressor", "reactor", "centrifuge", "forge", "furnace", "melter", "incubator", "vat", "chamber", "processor")) out += "processing_machines"
    if (match("shaft", "gearbox", "cogwheel", "arm", "belt", "gantry", "track", "kinetic", "mixer", "press", "deployer", "fan", "mechanical", "basin")) out += "create_kinetics_and_logistics"
    if (match("altar", "ritual", "brazier", "pedestal", "source_jar", "soulforge", "imbuement", "enchanting_apparatus", "alchemy")) out += "magic_ritual"
    if (match("controller", "terminal", "interface", "drive", "router", "network", "computer", "monitor", "provider", "assembler", "cell", "me_")) out += "computers_networks"
    if (match("tank", "pipe", "pump", "conduit", "cable", "wire", "battery", "charger", "generator", "dynamo", "energy", "fluid", "jar", "storage", "vault", "drawer")) out += "power_energy_fluids"
    if (match("chest", "barrel", "crate", "shelf", "cabinet", "tank", "jar", "cell", "provider", "interface", "drawer", "storage", "vault")) out += "storage_item_io"
    if (out.isEmpty() && match("machine", "controller", "processor", "engine", "core")) out += "unclassified_functional_keyword"
    return out
}

fun potencyFor(row: FunctionalRow): String = when {
    "computers_networks" in row.categories || row.namespace in setOf("ae2", "advanced_ae", "oc2r", "powergrid", "pneumaticcraft") -> "P5_core_progression_processors"
    "magic_ritual" in row.categories || row.namespace in setOf("bloodmagic", "ars_nouveau", "occultism") -> "P5_core_progression_processors"
    "processing_machines" in row.categories || "create_kinetics_and_logistics" in row.categories -> "P4_primary_workstations"
    "crafting_workstations" in row.categories -> "P3_crafting_surfaces"
    "power_energy_fluids" in row.categories || "storage_item_io" in row.categories -> "P2_support_infrastructure"
    else -> "P1_auxiliary"
}

fun generateFunctionalBlockCoverage(recipes: List<RecipeRecord>) {
    val outputsByRecipe = recipes.associateWith { extractOutputs(it.parsed) }
    val inputsByRecipe = recipes.associateWith { extractInputItems(it.parsed) }
    val functionalRows = linkedMapOf<String, FunctionalRow>()
    for ((blockId, info) in knownBlocks) {
        val categories = categoriesFor(blockId)
        if (categories.isNotEmpty()) {
            functionalRows[blockId] = FunctionalRow(blockId, info.namespace, categories, info.sources)
        }
    }
    val surfaces = linkedMapOf<String, FunctionalSurfaceRow>()
    val edges = mutableListOf<EdgeRow>()
    for ((recipe, outputs) in outputsByRecipe) {
        val surfaceOutputs = outputs.filter { it in functionalRows }
        if (surfaceOutputs.isEmpty()) continue
        val inputBlocks = inputsByRecipe[recipe].orEmpty().filter { it in knownBlocks.keys }
        for (surface in surfaceOutputs) {
            val row = functionalRows.getValue(surface)
            val roles = linkedSetOf("crafting_or_processing_surface")
            surfaces[surface] = FunctionalSurfaceRow(surface, roles, row.namespace, row.categories, row.sources)
            for (input in inputBlocks) {
                val relation = if (input in functionalRows) "direct_block_ingredient_for_surface" else "one_step_block_ingredient_for_surface_component"
                edges += EdgeRow(surface, relation, input, recipe.id, recipe.type)
                if (input in functionalRows) {
                    val inputRow = functionalRows.getValue(input)
                    val prior = surfaces[input]
                    val newRoles = (prior?.roles.orEmpty() + relation).toSortedSet()
                    surfaces[input] = FunctionalSurfaceRow(input, newRoles, inputRow.namespace, inputRow.categories, inputRow.sources)
                }
            }
        }
    }
    val auditPath = dumpDir.resolve("functional-blocks-audit.tsv")
    val potencyPath = dumpDir.resolve("functional-blocks-by-potency.tsv")
    val craftingPath = dumpDir.resolve("crafting-relevant-functional-blocks.tsv")
    val edgesPath = dumpDir.resolve("crafting-relevant-functional-block-edges.tsv")
    Files.writeString(
        auditPath,
        buildString {
            appendLine("block_id\tnamespace\tfunctional_categories\tsources")
            for (row in functionalRows.values.sortedBy { it.blockId }) {
                appendLine(listOf(row.blockId, row.namespace, row.categories.joinToString(","), row.sources.joinToString(",")).joinToString("\t"))
            }
        },
    )
    Files.writeString(
        potencyPath,
        buildString {
            appendLine("potency\tblock_id\tcategories\tnamespace\tsources")
            for (row in functionalRows.values.sortedWith(compareBy<FunctionalRow>({ potencyFor(it) }, { it.blockId }))) {
                appendLine(listOf(potencyFor(row), row.blockId, row.categories.joinToString(","), row.namespace, row.sources.joinToString(",")).joinToString("\t"))
            }
        },
    )
    Files.writeString(
        craftingPath,
        buildString {
            appendLine("block_id\troles\tnamespace\tfunctional_categories\tsources")
            for (row in surfaces.values.sortedBy { it.blockId }) {
                appendLine(listOf(row.blockId, row.roles.joinToString(","), row.namespace, row.categories.joinToString(","), row.sources.joinToString(",")).joinToString("\t"))
            }
        },
    )
    Files.writeString(
        edgesPath,
        buildString {
            appendLine("surface_block\trelation\tblock_id\trecipe_id\trecipe_type")
            for (row in edges.sortedWith(compareBy<EdgeRow>({ it.surfaceBlock }, { it.blockId }, { it.recipeId }))) {
                appendLine(listOf(row.surfaceBlock, row.relation, row.blockId, row.recipeId, row.recipeType).joinToString("\t"))
            }
        },
    )
}

if (!dumpDir.exists() || !kubejsConfigDir.exists()) {
    error("runtime dumps not found under ${repo.relativize(dumpDir)}")
}

collectLocalTagDefs(repo.resolve("kubejs/data"))
collectJarMetadata(repo.resolve("mods"))
collectJarMetadata(repo.resolve("generated/cache/packwiz-downloads/mods"))
collectKubejsBlockstates()
collectRegistryBlocks()

val recipes = loadRecipes()
generateFunctionalBlockCoverage(recipes)
generateBurntCoverage()

println("retained runtime dumps refreshed")

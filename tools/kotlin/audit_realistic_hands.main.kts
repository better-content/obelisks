#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.util.jar.JarFile

val repo = Paths.get("").toAbsolutePath().normalize()
val defaultProbePath = repo.resolve("generated/runtime-dumps/block_hardness_probe.json")
val outputJsonPath = Paths.get(args.getOrNull(0) ?: repo.resolve("generated/runtime-dumps/realistic_hands_audit.json").toString())
val outputJsPath = Paths.get(args.getOrNull(1) ?: repo.resolve("kubejs/startup_scripts/99_realistic_hands_assignments.js").toString())
val outputMdPath = outputJsonPath.resolveSibling(outputJsonPath.fileName.toString().replace(Regex("""\.json$""", RegexOption.IGNORE_CASE), ".md"))

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
fun read(path: Path): String = Files.readString(path)
fun readJson(path: Path): Any? = parseJson(read(path))
fun jsonObject(value: Any?): Map<String, Any?> = value as? Map<String, Any?> ?: emptyMap()
fun jsonArray(value: Any?): List<Any?> = value as? List<Any?> ?: emptyList()
fun jsonString(value: Any?): String? = value as? String
fun jsonNumber(value: Any?): Number? = value as? Number
fun ensureDir(path: Path) = Files.createDirectories(path.parent)
fun rel(path: Path): String = repo.relativize(path).toString().replace('\\', '/')
fun sortUnique(values: Iterable<String>): List<String> = values.filter { it.isNotBlank() }.map(String::trim).distinct().sorted()

fun renderJson(value: Any?, indent: String = ""): String = when (value) {
    null -> "null"
    is String -> "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\""
    is Number, is Boolean -> value.toString()
    is Map<*, *> -> "{\n" + value.entries.joinToString(",\n") { (k, v) -> "$indent  ${renderJson(k.toString())}: ${renderJson(v, "$indent  ")}" } + "\n$indent}"
    is Iterable<*> -> "[\n" + value.joinToString(",\n") { "$indent  ${renderJson(it, "$indent  ")}" } + "\n$indent]"
    else -> renderJson(value.toString(), indent)
}

val HAND_TOOL = "hand"
val CANONICAL_TOOLS = listOf("knife", "axe", "pickaxe", "shovel", "hoe", "sword")
val ALL_TOOL_KEYS = listOf(HAND_TOOL) + CANONICAL_TOOLS
val ITEM_TOOL_TAGS = mapOf(
    "knife" to listOf("forge:tools/knives", "forge:knives", "c:tools/knives", "c:knives", "farmersdelight:tools/knives", "forge:tools/shears", "c:tools/shears", "forge:tools/scythes", "c:tools/scythes"),
    "axe" to listOf("minecraft:axes", "forge:tools/axes", "forge:axes"),
    "pickaxe" to listOf("minecraft:pickaxes", "forge:tools/pickaxes", "forge:pickaxes"),
    "shovel" to listOf("minecraft:shovels", "forge:tools/shovels", "forge:shovels"),
    "hoe" to listOf("minecraft:hoes", "forge:tools/hoes", "forge:hoes"),
    "sword" to listOf("minecraft:swords", "forge:tools/swords", "forge:swords")
)
val BLOCK_TOOL_TAGS = mapOf(
    "axe" to "minecraft:mineable/axe",
    "pickaxe" to "minecraft:mineable/pickaxe",
    "shovel" to "minecraft:mineable/shovel",
    "hoe" to "minecraft:mineable/hoe",
    "sword" to "minecraft:sword_efficient"
)
val knifeBlockTags = listOf("minecraft:crops", "minecraft:flowers", "minecraft:leaves", "minecraft:replaceable", "minecraft:saplings")
val LEGACY_TOOL_ORDER = listOf("knife", "axe", "pickaxe", "shovel", "hoe", "sword", "hand")
val HAND_EXACT_IDS = setOf("minecraft:sand", "minecraft:red_sand", "minecraft:gravel", "minecraft:dirt", "minecraft:coarse_dirt", "minecraft:grass_block", "minecraft:mycelium", "minecraft:podzol", "minecraft:rooted_dirt", "minecraft:mud", "minecraft:soul_sand", "minecraft:suspicious_gravel", "minecraft:suspicious_sand")
val SWORD_EXACT_IDS = setOf("minecraft:cobweb", "minecraft:web", "minecraft:tripwire")
val PICKAXE_EXACT_IDS = setOf("minecraft:bell", "minecraft:loom", "minecraft:lever", "minecraft:rail", "minecraft:redstone_torch", "minecraft:redstone_wall_torch", "minecraft:soul_torch", "minecraft:soul_wall_torch", "minecraft:torch", "minecraft:wall_torch", "ars_nouveau:rune", "fallout_wastelands_:cage", "fallout_wastelands_:oven", "fallout_wastelands_:pipe", "quark:pipe")
val UNEARTHED_PICKAXE_IDS = setOf("unearthed:beige_limestone_grassy_regolith", "unearthed:conglomerate_grassy_regolith", "unearthed:dolomite_grassy_regolith", "unearthed:gabbro_grassy_regolith", "unearthed:granodiorite_grassy_regolith", "unearthed:grey_limestone_grassy_regolith", "unearthed:kimberlite_grassy_regolith", "unearthed:limestone_grassy_regolith", "unearthed:mudstone_grassy_regolith", "unearthed:overgrown_andesite", "unearthed:overgrown_diorite", "unearthed:overgrown_granite", "unearthed:phyllite_grassy_regolith", "unearthed:quartzite_grassy_regolith", "unearthed:rhyolite_grassy_regolith", "unearthed:sandstone_grassy_regolith", "unearthed:siltstone_grassy_regolith", "unearthed:slate_grassy_regolith", "unearthed:stone_grassy_regolith", "unearthed:white_granite_grassy_regolith", "unearthed:white_granite_regolith")
val SOIL_KEYWORDS = listOf("sand", "gravel", "dirt", "mud", "regolith", "loam", "silt", "soil", "sediment", "grassy_", "grass_block", "mycelium", "podzol")
val PLANT_KEYWORDS = listOf("flower", "sapling", "leaves", "leaf", "vine", "vines", "crop", "crops", "grass", "fern", "bush", "shrub", "reed", "cane", "root", "roots", "moss", "petal", "petals", "berry", "bloom", "blossom", "mushroom", "fungus", "fungi", "pod", "pods", "thatch", "fiber", "fibers", "fibres", "plant", "plants", "flora", "weed", "herb", "cocoon", "nipa")
val PLANT_EXCLUSIONS = listOf("grass_block", "grassy_", "glass", "grass_path", "path", "pressure_plate", "planter", "planter_box")
val WOOD_KEYWORDS = listOf("log", "wood", "plank", "branch", "crate", "ladder", "barrel", "chest", "bookshelf", "scaffold", "trapdoor", "door", "fence", "fence_gate", "sign", "hanging_sign", "button", "boat", "raft", "beam", "post")
val SHOVEL_KEYWORDS = listOf("path", "powder", "slush", "dust", "ash", "soot", "mulch", "peat", "compost", "snow", "concrete_powder")
val HOE_KEYWORDS = listOf("farmland", "tilled", "cultivated", "fertile_soil", "rich_soil", "garden_soil")
val PICKAXE_KEYWORDS = listOf("glass", "pane", "brick", "bricks", "tile", "tiles", "ore", "machine", "engine", "gearbox", "casing", "metal", "steel", "iron", "copper", "bronze", "gold", "silver", "tin", "lead", "nickel", "uranium", "stone", "deepslate", "andesite", "granite", "diorite", "basalt", "slate", "limestone", "marble", "gabbro", "rhyolite", "quartzite", "dolomite", "kimberlite", "obsidian", "concrete", "terracotta", "ceramic", "lantern", "torch", "altar", "pedestal", "relay", "sourcelink", "turret", "sensor")

fun localName(id: String): String = if (":" in id) id.substringAfter(':') else id
fun namespace(id: String): String = if (":" in id) id.substringBefore(':') else "minecraft"
fun hasRuntimeTag(record: Map<String, Any?>, tag: String): Boolean = jsonArray(record["runtimeTags"]).mapNotNull(::jsonString).contains(tag)
fun hasToolAction(record: Map<String, Any?>, action: String): Boolean = jsonArray(record["toolActions"]).mapNotNull(::jsonString).contains(action)
fun inTagEvidence(tagEvidence: Map<String, Any?>, kind: String, tag: String, id: String): Boolean {
    val bucket = if (kind == "item") jsonObject(tagEvidence["itemMembers"]) else jsonObject(tagEvidence["blockMembers"])
    return jsonArray(bucket[tag]).mapNotNull(::jsonString).contains(id)
}
fun keywordMatch(name: String, keywords: List<String>) = keywords.any(name::contains)
fun isPotted(name: String) = name.startsWith("potted_") || "_potted_" in name
fun isWebLike(name: String) = "cobweb" in name || name == "web" || name.endsWith("_web") || "webbing" in name
fun isLooseSurface(name: String) = HAND_EXACT_IDS.contains("minecraft:$name") || keywordMatch(name, SOIL_KEYWORDS)
fun isWorkedSoil(name: String) = keywordMatch(name, HOE_KEYWORDS)
fun isLooseShovelSurface(name: String) = keywordMatch(name, SHOVEL_KEYWORDS)
fun isWoodLike(name: String) = keywordMatch(name, WOOD_KEYWORDS)
fun isPlantLike(name: String): Boolean {
    if (isPotted(name)) return true
    if (PLANT_EXCLUSIONS.any(name::contains)) return false
    return keywordMatch(name, PLANT_KEYWORDS)
}
fun isPickaxeLike(name: String) = keywordMatch(name, PICKAXE_KEYWORDS)

fun legacyToolForId(id: String, legacyAssignments: Map<String, Any?>, kind: String): String? {
    val groups = jsonObject(legacyAssignments[kind])
    for (tool in LEGACY_TOOL_ORDER) {
        val ids = jsonArray(groups[tool]).mapNotNull(::jsonString).toSet()
        if (id in ids) return tool
    }
    return null
}

fun makeAssignment(tools: List<String>, stage: String, source: String, detail: String, outcome: String = "default"): Map<String, Any?> =
    linkedMapOf("tools" to sortUnique(tools), "origin" to "$stage:$source", "detail" to detail, "outcome" to outcome)

fun classifyBlock(record: Map<String, Any?>, tagEvidence: Map<String, Any?>, legacyAssignments: Map<String, Any?>): Map<String, Any?> {
    val id = jsonString(record["id"]).orEmpty()
    val name = localName(id)
    if (id in UNEARTHED_PICKAXE_IDS) return makeAssignment(listOf("pickaxe"), "override", "exact", "grass-over-stone regolith stays stone-routed")
    if (id == "dynamictrees:rooty_gravel") return makeAssignment(listOf("hand"), "override", "exact", "primitive loose rooty gravel")
    if (namespace(id) == "excavated_variants" && name.startsWith("gravel_")) return makeAssignment(listOf("shovel"), "override", "gravel-ore-family", "gravel-substrate ore stays loose-earth routed")
    if (id in HAND_EXACT_IDS) return makeAssignment(listOf("hand"), "override", "exact", "primitive loose surface")
    if (id in SWORD_EXACT_IDS || isWebLike(name)) return makeAssignment(listOf("sword"), "override", "web-family", "preserve-cut soft surface", "sword_preserve_web")
    if (id in PICKAXE_EXACT_IDS) return makeAssignment(listOf("pickaxe"), "override", "exact", "explicit non-loose utility block")
    if (isPotted(name)) return makeAssignment(listOf("knife"), "delegation", "potted-plants", "potted plant family", "knife_transform_organics")
    if (isWorkedSoil(name)) return makeAssignment(listOf("hoe"), "delegation", "cultivated-soil", "cultivated or farm-worked surface")
    if (isWoodLike(name)) return makeAssignment(listOf("axe"), "delegation", "wood-products", "logs, branches, planks, or wood products")
    if (isPlantLike(name)) {
        val outcome = if ("grass" in name || "reed" in name || "cane" in name) "knife_transform_fiber" else "knife_transform_organics"
        return makeAssignment(listOf("knife"), "delegation", "organics", "plants, leaves, vines, crops, pods, or small organics", outcome)
    }
    if (isLooseSurface(name)) return makeAssignment(listOf("hand"), "delegation", "loose-earth", "sand, gravel, dirt, mud, regolith, or similar loose earth")
    if (isLooseShovelSurface(name)) return makeAssignment(listOf("shovel"), "delegation", "loose-worked-earth", "loose non-hand earth surface")
    for (tag in knifeBlockTags) {
        if (hasRuntimeTag(record, tag) || inTagEvidence(tagEvidence, "block", tag, id)) {
            val outcome = if (tag == "minecraft:leaves") "knife_extra_sticks" else "knife_transform_organics"
            return makeAssignment(listOf("knife"), "inference", "block-tag:$tag", "runtime or authored tag evidence", outcome)
        }
    }
    for (tool in listOf("axe", "pickaxe", "shovel", "hoe", "sword")) {
        val tag = BLOCK_TOOL_TAGS[tool] ?: continue
        if (hasRuntimeTag(record, tag) || inTagEvidence(tagEvidence, "block", tag, id)) {
            val outcome = if (tool == "sword") "sword_preserve_web" else "default"
            return makeAssignment(listOf(tool), "inference", "block-tag:$tag", "runtime or authored mining tag evidence", outcome)
        }
    }
    val legacy = legacyToolForId(id, legacyAssignments, "blocks")
    if (legacy != null) {
        val tool = if (legacy == "hand") "pickaxe" else legacy
        val detail = if (legacy == "hand") "legacy hand evidence upgraded to solid-block default" else "legacy assignment carried forward"
        return makeAssignment(listOf(tool), "inference", "legacy:$legacy", detail)
    }
    return if (isPickaxeLike(name)) makeAssignment(listOf("pickaxe"), "heuristic", "solid-default", "stone, glass, metal, machine, or solid utility keyword")
    else makeAssignment(listOf("pickaxe"), "heuristic", "catchall-solid", "residual solid/default classification")
}

fun classifyItem(record: Map<String, Any?>, tagEvidence: Map<String, Any?>, legacyAssignments: Map<String, Any?>): Map<String, Any?>? {
    val id = jsonString(record["id"]).orEmpty()
    val name = localName(id)
    for (tool in listOf("knife", "axe", "pickaxe", "shovel", "hoe", "sword")) {
        for (tag in ITEM_TOOL_TAGS[tool].orEmpty()) {
            if (inTagEvidence(tagEvidence, "item", tag, id)) return makeAssignment(listOf(tool), "delegation", "item-tag:$tag", "authored item tag delegation")
        }
    }
    if (hasToolAction(record, "axe")) return makeAssignment(listOf("axe"), "inference", "tool-action:axe", "runtime tool action evidence")
    if (hasToolAction(record, "pickaxe")) return makeAssignment(listOf("pickaxe"), "inference", "tool-action:pickaxe", "runtime tool action evidence")
    if (hasToolAction(record, "shovel")) return makeAssignment(listOf("shovel"), "inference", "tool-action:shovel", "runtime tool action evidence")
    if (hasToolAction(record, "hoe")) return makeAssignment(listOf("hoe"), "inference", "tool-action:hoe", "runtime tool action evidence")
    if (hasToolAction(record, "sword")) return makeAssignment(listOf("sword"), "inference", "tool-action:sword", "runtime tool action evidence")
    if ("knife" in name || "shears" in name || "shear" in name || "scythe" in name || "sickle" in name) return makeAssignment(listOf("knife"), "heuristic", "blade-cutters", "knife-equivalent cutter family")
    if ("pickaxe" in name || name.endsWith("_pick")) return makeAssignment(listOf("pickaxe"), "heuristic", "name", "pickaxe name heuristic")
    if ("shovel" in name || "spade" in name) return makeAssignment(listOf("shovel"), "heuristic", "name", "shovel name heuristic")
    if ("hoe" in name) return makeAssignment(listOf("hoe"), "heuristic", "name", "hoe name heuristic")
    if ("axe" in name || "hatchet" in name || "adze" in name) return makeAssignment(listOf("axe"), "heuristic", "name", "axe name heuristic")
    if ("sword" in name || "blade" in name) return makeAssignment(listOf("sword"), "heuristic", "name", "sword name heuristic")
    val legacy = legacyToolForId(id, legacyAssignments, "items")
    return if (legacy != null) makeAssignment(listOf(legacy), "inference", "legacy:$legacy", "legacy assignment carried forward") else null
}

fun compileRealisticHands(blockRecords: List<Map<String, Any?>>, itemRecords: List<Map<String, Any?>>, tagEvidence: Map<String, Any?>, legacyAssignments: Map<String, Any?>, input: String, runtimeProbeSchema: String): Map<String, Any?> {
    val blockAssignments = linkedMapOf<String, Map<String, Any?>>()
    val itemAssignments = linkedMapOf<String, Map<String, Any?>>()
    val blocksByTool = ALL_TOOL_KEYS.associateWith { mutableListOf<String>() }.toMutableMap()
    val itemsByTool = CANONICAL_TOOLS.associateWith { mutableListOf<String>() }.toMutableMap()
    for (record in blockRecords) {
        val assignment = classifyBlock(record, tagEvidence, legacyAssignments)
        val id = jsonString(record["id"]).orEmpty()
        blockAssignments[id] = assignment
        for (tool in jsonArray(assignment["tools"]).mapNotNull(::jsonString)) blocksByTool[tool]?.add(id)
    }
    for (record in itemRecords) {
        val assignment = classifyItem(record, tagEvidence, legacyAssignments) ?: continue
        val id = jsonString(record["id"]).orEmpty()
        itemAssignments[id] = assignment
        for (tool in jsonArray(assignment["tools"]).mapNotNull(::jsonString)) itemsByTool[tool]?.add(id)
    }
    val assignedBlockIds = blockAssignments.keys.toSet()
    val unassigned = sortUnique(blockRecords.mapNotNull { jsonString(it["id"]) }.filterNot(assignedBlockIds::contains))
    val originCounts = linkedMapOf<String, Int>()
    for (assignment in blockAssignments.values) {
        val origin = jsonString(assignment["origin"]).orEmpty()
        originCounts[origin] = (originCounts[origin] ?: 0) + 1
    }
    fun outcomeFamily(name: String): List<String> = sortUnique(blockAssignments.filterValues { jsonString(it["outcome"]) == name }.keys)
    return linkedMapOf<String, Any?>(
        "schema" to "obelisks.realistic_hands.assignments.v1",
        "generatedBy" to "tools/kotlin/audit_realistic_hands.main.kts",
        "input" to input,
        "runtimeProbeSchema" to runtimeProbeSchema,
        "blockCount" to blockRecords.size,
        "itemCount" to itemRecords.size,
        "blocks" to blocksByTool.mapValues { sortUnique(it.value) },
        "items" to itemsByTool.mapValues { sortUnique(it.value) },
        "blockAssignments" to blockAssignments,
        "itemAssignments" to itemAssignments,
        "outcomeFamilies" to linkedMapOf(
            "knife_transform_fiber" to outcomeFamily("knife_transform_fiber"),
            "knife_transform_organics" to outcomeFamily("knife_transform_organics"),
            "knife_extra_sticks" to outcomeFamily("knife_extra_sticks"),
            "sword_preserve_web" to outcomeFamily("sword_preserve_web")
        ),
        "originCounts" to originCounts,
        "unassignedBreakableBlocks" to unassigned
    )
}

fun summarizeRepresentativeSeparation(assignments: Map<String, Any?>): Map<String, Boolean> {
    val blocks = jsonObject(assignments["blocks"])
    val knifeSet = jsonArray(blocks["knife"]).mapNotNull(::jsonString).toSet()
    val swordSet = jsonArray(blocks["sword"]).mapNotNull(::jsonString).toSet()
    return mapOf(
        "knifeGrass" to knifeSet.contains("projectvibrantjourneys:short_grass"),
        "knifeLeaves" to knifeSet.contains("minecraft:oak_leaves"),
        "swordCobweb" to swordSet.contains("minecraft:cobweb"),
        "swordTripwire" to swordSet.contains("minecraft:tripwire")
    )
}

fun listFiles(root: Path, predicate: (Path) -> Boolean): List<Path> {
    if (!Files.exists(root)) return emptyList()
    return Files.walk(root).use { stream -> stream.filter { Files.isRegularFile(it) && predicate(it) }.toList() }
}

fun tagIdFromParts(parts: List<String>, kind: String): String? {
    val dataIndex = parts.lastIndexOf("data")
    if (dataIndex < 0) return null
    val namespace = parts.getOrNull(dataIndex + 1) ?: return null
    val tagsIndex = parts.drop(dataIndex).indexOf("tags").takeIf { it >= 0 }?.plus(dataIndex) ?: -1
    if (tagsIndex < 0 || parts.getOrNull(tagsIndex + 1) != kind) return null
    val relParts = parts.drop(tagsIndex + 2).toMutableList()
    if (relParts.isEmpty()) return null
    relParts[relParts.lastIndex] = relParts.last().removeSuffix(".json")
    return "$namespace:${relParts.joinToString("/")}"
}

fun addTagValues(map: MutableMap<String, MutableList<String>>, tag: String?, values: List<String>) {
    if (tag == null) return
    map.getOrPut(tag) { mutableListOf() }.addAll(values)
}

fun parseTagJson(text: String): List<String> =
    jsonArray(jsonObject(parseJson(text))["values"]).mapNotNull {
        when (it) {
            is String -> it
            is Map<*, *> -> it["id"] as? String
            else -> null
        }
    }

fun readDirTagMaps(root: Path, kind: String): MutableMap<String, MutableList<String>> {
    val map = linkedMapOf<String, MutableList<String>>()
    for (file in listFiles(root) { it.toString().endsWith(".json") }) {
        val tag = tagIdFromParts(file.toString().split(java.io.File.separatorChar), kind)
        val values = runCatching { parseTagJson(read(file)) }.getOrElse { emptyList() }
        addTagValues(map, tag, values)
    }
    return map
}

fun readJarTagMaps(root: Path, kind: String): MutableMap<String, MutableList<String>> {
    val map = linkedMapOf<String, MutableList<String>>()
    val jars = listFiles(root.resolve("mods")) { it.toString().endsWith(".jar") } + listFiles(root.resolve("libraries")) { it.toString().endsWith(".jar") }
    val marker = "/tags/$kind/"
    for (jarPath in jars) {
        JarFile(jarPath.toFile()).use { jar ->
            for (entry in jar.entries().asSequence()) {
                val name = entry.name
                if (!name.startsWith("data/") || !name.endsWith(".json") || marker !in name) continue
                val tag = tagIdFromParts(name.split('/'), kind)
                val values = runCatching { parseTagJson(jar.getInputStream(entry).bufferedReader().readText()) }.getOrElse { emptyList() }
                addTagValues(map, tag, values)
            }
        }
    }
    return map
}

fun mergeTagMaps(vararg maps: Map<String, MutableList<String>>): MutableMap<String, MutableList<String>> {
    val out = linkedMapOf<String, MutableList<String>>()
    for (map in maps) for ((tag, values) in map) addTagValues(out, tag, values)
    return out
}

fun resolveTagValues(map: Map<String, MutableList<String>>, tag: String, seen: MutableSet<String> = linkedSetOf()): List<String> {
    if (!seen.add(tag)) return emptyList()
    val out = mutableListOf<String>()
    for (value in map[tag].orEmpty()) {
        if (value.startsWith("#")) out += resolveTagValues(map, value.removePrefix("#"), seen)
        else out += value
    }
    return sortUnique(out)
}

fun buildTagEvidence(root: Path): Map<String, Any?> {
    val blockTags = mergeTagMaps(readJarTagMaps(root, "blocks"), readDirTagMaps(root.resolve("kubejs/data"), "blocks"))
    val itemTags = mergeTagMaps(readJarTagMaps(root, "items"), readDirTagMaps(root.resolve("kubejs/data"), "items"))
    val blockEvidenceTags = sortUnique(listOf("kubejs:hand_breakable") + BLOCK_TOOL_TAGS.values + knifeBlockTags)
    val itemEvidenceTags = sortUnique(ITEM_TOOL_TAGS.values.flatten())
    return linkedMapOf(
        "blockMembers" to blockEvidenceTags.associateWith { resolveTagValues(blockTags, it) },
        "itemMembers" to itemEvidenceTags.associateWith { resolveTagValues(itemTags, it) }
    )
}

fun parseAssignmentsFromJs(file: Path, globalName: String): Map<String, Any?>? {
    if (!Files.exists(file)) return null
    val match = Regex("""global\.$globalName\s*=\s*(\{[\s\S]*\})\s*$""").find(read(file)) ?: return null
    return jsonObject(parseJson(match.groupValues[1]))
}

fun normalizeLegacyAssignments(data: Map<String, Any?>?): Map<String, Any?> {
    val blocks = linkedMapOf<String, List<String>>()
    val items = linkedMapOf<String, List<String>>()
    for (tool in listOf("hand", "knife", "axe", "pickaxe", "shovel", "hoe", "sword")) blocks[tool] = jsonArray(jsonObject(data?.get("blocks"))[tool]).mapNotNull(::jsonString)
    for (tool in listOf("knife", "axe", "pickaxe", "shovel", "hoe", "sword")) items[tool] = jsonArray(jsonObject(data?.get("items"))[tool]).mapNotNull(::jsonString)
    return linkedMapOf("blocks" to blocks, "items" to items)
}

fun breakableBlock(record: Map<String, Any?>): Boolean = record["missing"] != true && (jsonNumber(record["defaultDestroyTime"])?.toDouble() ?: -1.0) >= 0.0

fun loadUniverse(): Triple<String, String, Pair<List<Map<String, Any?>>, List<Map<String, Any?>>>> {
    if (Files.exists(defaultProbePath)) {
        val dump = jsonObject(readJson(defaultProbePath))
        val allBlocks = jsonArray(dump["allBlocks"])
        val selectedBlocks = jsonArray(dump["selectedBlocks"])
        val blockRecords = (if (allBlocks.isNotEmpty()) allBlocks else selectedBlocks).map(::jsonObject).filter(::breakableBlock)
        val itemRecords = jsonArray(dump["allItems"]).map(::jsonObject).filter { it["missing"] != true }
        return Triple("runtime-probe", rel(defaultProbePath), blockRecords to itemRecords).let {
            Triple(it.first, jsonString(dump["schema"]) ?: "UNKNOWN", it.third)
        }
    }
    val currentJsonPath = repo.resolve("generated/runtime-dumps/realistic_hands_audit.json")
    val currentJsPath = repo.resolve("kubejs/startup_scripts/99_realistic_hands_assignments.js")
    val currentJson = if (Files.exists(currentJsonPath)) jsonObject(readJson(currentJsonPath)) else null
    val currentJs = parseAssignmentsFromJs(currentJsPath, "BTM_REALISTIC_HANDS_ASSIGNMENTS")
    val combinedBlocks = linkedSetOf<String>()
    val combinedItems = linkedSetOf<String>()
    for (source in listOf(currentJson, currentJs)) {
        if (source == null) continue
        for (values in jsonObject(source["blocks"]).values) combinedBlocks += jsonArray(values).mapNotNull(::jsonString)
        combinedBlocks += jsonArray(source["unassignedBreakableBlocks"]).mapNotNull(::jsonString)
        for (values in jsonObject(source["items"]).values) combinedItems += jsonArray(values).mapNotNull(::jsonString)
    }
    val blockRecords = sortUnique(combinedBlocks).map { linkedMapOf<String, Any?>("id" to it, "missing" to false, "defaultDestroyTime" to 0) }
    val itemRecords = sortUnique(combinedItems).map { linkedMapOf<String, Any?>("id" to it, "missing" to false) }
    return Triple("assignment-seed", "realistic-hands-assignment-seed", blockRecords to itemRecords)
}

fun writeJs(assignments: Map<String, Any?>) {
    val payload = renderJson(assignments)
    val js = """
        |// Generated by tools/kotlin/audit_realistic_hands.main.kts.
        |// Do not hand-edit block or item membership here; rerun the Realistic Hands audit instead.
        |global.BTM_REALISTIC_HANDS_ASSIGNMENTS = $payload
    """.trimMargin() + "\n"
    ensureDir(outputJsPath)
    Files.writeString(outputJsPath, js)
}

fun writeMd(assignments: Map<String, Any?>) {
    val reps = summarizeRepresentativeSeparation(assignments)
    val topOrigins = jsonObject(assignments["originCounts"]).entries.sortedByDescending { (it.value as? Number)?.toInt() ?: 0 }.take(12)
    val lines = mutableListOf<String>()
    lines += "# Realistic Hands Audit"
    lines += ""
    lines += "Input: `${assignments["input"]}`"
    lines += "Runtime probe schema: `${assignments["runtimeProbeSchema"]}`"
    lines += ""
    lines += "## Totals"
    lines += ""
    lines += "- Breakable block records: ${assignments["blockCount"]}"
    lines += "- Item records: ${assignments["itemCount"]}"
    for (tool in ALL_TOOL_KEYS) lines += "- ${tool.replaceFirstChar(Char::uppercaseChar)} blocks: ${jsonArray(jsonObject(assignments["blocks"])[tool]).size}"
    lines += "- Unassigned breakable blocks: ${jsonArray(assignments["unassignedBreakableBlocks"]).size}"
    lines += ""
    lines += "## Representative Separation"
    lines += ""
    lines += "- projectvibrantjourneys:short_grass knife: ${reps["knifeGrass"]}"
    lines += "- minecraft:oak_leaves knife: ${reps["knifeLeaves"]}"
    lines += "- minecraft:cobweb sword: ${reps["swordCobweb"]}"
    lines += "- minecraft:tripwire sword: ${reps["swordTripwire"]}"
    lines += ""
    lines += "## Outcome Families"
    lines += ""
    val outcomes = jsonObject(assignments["outcomeFamilies"])
    for (family in listOf("knife_transform_fiber", "knife_transform_organics", "knife_extra_sticks", "sword_preserve_web")) {
        lines += "- ${family.replace('_', ' ')}: ${jsonArray(outcomes[family]).size}"
    }
    lines += ""
    lines += "## Largest Origins"
    lines += ""
    for ((origin, count) in topOrigins) lines += "- $origin: $count"
    lines += ""
    lines += "## Unassigned Breakable Block Samples"
    lines += ""
    lines += jsonArray(assignments["unassignedBreakableBlocks"]).mapNotNull(::jsonString).take(80).joinToString("\n") { "- $it" }
    Files.writeString(outputMdPath, lines.joinToString("\n") + "\n")
}

val (mode, schema, universe) = loadUniverse()
val tagEvidence = buildTagEvidence(repo)
val legacyAssignments = normalizeLegacyAssignments(
    parseAssignmentsFromJs(repo.resolve("kubejs/startup_scripts/99_realistic_hands_assignments.js"), "BTM_REALISTIC_HANDS_ASSIGNMENTS")
        ?: if (Files.exists(repo.resolve("generated/runtime-dumps/realistic_hands_audit.json"))) jsonObject(readJson(repo.resolve("generated/runtime-dumps/realistic_hands_audit.json"))) else null
)
val inputPath = if (mode == "runtime-probe") rel(defaultProbePath) else "${rel(repo.resolve("generated/runtime-dumps/realistic_hands_audit.json"))} + ${rel(repo.resolve("kubejs/startup_scripts/99_realistic_hands_assignments.js"))}"
val assignments = compileRealisticHands(universe.first, universe.second, tagEvidence, legacyAssignments, inputPath, schema)
ensureDir(outputJsonPath)
Files.writeString(outputJsonPath, renderJson(assignments) + "\n")
writeJs(assignments)
writeMd(assignments)
println("Wrote ${rel(outputJsonPath)}")
println("Wrote ${rel(outputJsPath)}")
println("Wrote ${rel(outputMdPath)}")
println("mode=$mode")
println("unassigned=${jsonArray(assignments["unassignedBreakableBlocks"]).size}")

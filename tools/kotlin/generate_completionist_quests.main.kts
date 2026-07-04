#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.security.MessageDigest
import java.util.Locale
import kotlin.io.path.exists
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.roundToInt
import kotlin.system.exitProcess

data class TaskModel(
    val id: String,
    val type: String,
    val title: String? = null,
    val item: String? = null,
    val count: Int = 1,
)

data class QuestModel(
    val id: String,
    val title: String,
    var icon: String,
    val shape: String,
    val size: Double,
    var x: Double,
    var y: Double,
    val tasks: MutableList<TaskModel>,
    var description: String? = null,
)

data class ChapterModel(
    val filename: String,
    val group: String,
    var icon: String,
    val id: String,
    val orderIndex: Int,
    val quests: MutableList<QuestModel>,
)

data class SectionModel(
    val header: QuestModel,
    val quests: MutableList<QuestModel>,
)

data class EnchantmentSource(
    val id: String,
    val namespace: String,
    val title: String,
    val hintItems: List<String>,
    val minSourceCost: Int?,
    val maxSourceCost: Int?,
)

data class EffectSource(
    val id: String,
    val title: String,
    val icon: String,
    val sourceItems: List<String>,
    val hint: String?,
)

val root: Path = Paths.get("").toAbsolutePath().normalize()
val failures = mutableListOf<String>()

fun read(path: Path): String = Files.readString(path)
fun write(path: Path, text: String) = Files.writeString(path, text)
fun rel(path: Path): String = root.relativize(path).toString().replace('\\', '/')
fun fail(message: String) { failures += message }
fun readGitHead(path: Path): String? {
    return try {
        val ref = "HEAD:${rel(path)}"
        val process = ProcessBuilder("git", "show", ref)
            .directory(root.toFile())
            .redirectErrorStream(true)
            .start()
        val text = process.inputStream.bufferedReader().readText()
        if (process.waitFor() == 0) text else null
    } catch (_: Exception) {
        null
    }
}

fun findMatching(text: String, start: Int, open: Char, close: Char): Int {
    var depth = 0
    var inString = false
    var escaped = false
    for (index in start until text.length) {
        val ch = text[index]
        if (inString) {
            if (escaped) escaped = false
            else if (ch == '\\') escaped = true
            else if (ch == '"') inString = false
            continue
        }
        when (ch) {
            '"' -> inString = true
            open -> depth += 1
            close -> {
                depth -= 1
                if (depth == 0) return index
            }
        }
    }
    error("unmatched $open$close pair")
}

fun extractArrayContent(text: String, key: String): String {
    val keyIndex = text.indexOf("$key:")
    require(keyIndex >= 0) { "missing key $key" }
    val openIndex = text.indexOf('[', keyIndex)
    require(openIndex >= 0) { "missing array for $key" }
    val closeIndex = findMatching(text, openIndex, '[', ']')
    return text.substring(openIndex + 1, closeIndex)
}

fun splitTopLevelObjects(arrayContent: String): List<String> {
    val out = mutableListOf<String>()
    var index = 0
    while (index < arrayContent.length) {
        while (index < arrayContent.length && arrayContent[index].isWhitespace()) index += 1
        if (index >= arrayContent.length) break
        if (arrayContent[index] == ',') {
            index += 1
            continue
        }
        if (arrayContent[index] != '{') {
            index += 1
            continue
        }
        val end = findMatching(arrayContent, index, '{', '}')
        out += arrayContent.substring(index, end + 1)
        index = end + 1
    }
    return out
}

fun matchString(block: String, key: String): String? =
    Regex("""\b$key:\s*"((?:\\.|[^"])*)"""").find(block)?.groupValues?.get(1)?.replace("\\\"", "\"")

fun matchNumber(block: String, key: String): Double? =
    Regex("""\b$key:\s*(-?\d+(?:\.\d+)?)d?""").find(block)?.groupValues?.get(1)?.toDoubleOrNull()

fun matchInt(block: String, key: String): Int? =
    Regex("""\b$key:\s*(-?\d+)""").find(block)?.groupValues?.get(1)?.toIntOrNull()

fun parseTask(block: String): TaskModel =
    TaskModel(
        id = matchString(block, "id") ?: error("task missing id"),
        type = matchString(block, "type") ?: error("task missing type"),
        title = matchString(block, "title"),
        item = matchString(block, "item"),
        count = matchInt(block, "count") ?: 1,
    )

fun parseQuest(block: String): QuestModel {
    val tasks = splitTopLevelObjects(extractArrayContent(block, "tasks")).map(::parseTask).toMutableList()
    val description = Regex("""description:\s*\["((?:\\.|[^"])*)"]""").find(block)?.groupValues?.get(1)?.replace("\\\"", "\"")
    return QuestModel(
        id = matchString(block, "id") ?: error("quest missing id"),
        title = matchString(block, "title") ?: error("quest missing title"),
        icon = matchString(block, "icon") ?: "minecraft:barrier",
        shape = matchString(block, "shape") ?: "rsquare",
        size = matchNumber(block, "size") ?: 1.0,
        x = matchNumber(block, "x") ?: 0.0,
        y = matchNumber(block, "y") ?: 0.0,
        tasks = tasks,
        description = description,
    )
}

fun parseChapterText(text: String): ChapterModel {
    val quests = splitTopLevelObjects(extractArrayContent(text, "quests")).map(::parseQuest).toMutableList()
    return ChapterModel(
        filename = matchString(text, "filename") ?: error("chapter missing filename"),
        group = matchString(text, "group") ?: "",
        icon = matchString(text, "icon") ?: "minecraft:barrier",
        id = matchString(text, "id") ?: error("chapter missing id"),
        orderIndex = matchInt(text, "order_index") ?: 0,
        quests = quests,
    )
}

fun parseChapter(path: Path): ChapterModel = parseChapterText(read(path))

class JsonParser(private val text: String) {
    private var index = 0
    fun parse(): Any? { skipWhitespace(); val value = parseValue(); skipWhitespace(); return value }
    private fun parseValue(): Any? {
        skipWhitespace()
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
        expect('{')
        skipWhitespace()
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
        expect('[')
        skipWhitespace()
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
                '\\' -> out.append(
                    when (val esc = text[index++]) {
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
                    }
                )
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
        val raw = text.substring(start, index)
        return if (raw.contains('.')) raw.toDouble() else raw.toLong()
    }
    private fun parseLiteral(token: String, value: Any?): Any? {
        require(text.startsWith(token, index))
        index += token.length
        return value
    }
    private fun skipWhitespace() { while (index < text.length && text[index].isWhitespace()) index += 1 }
    private fun expect(ch: Char) { require(index < text.length && text[index] == ch); index += 1 }
    private fun peek(ch: Char): Boolean = index < text.length && text[index] == ch
}

fun parseJson(text: String): Any? = JsonParser(text).parse()
fun jsonObject(value: Any?): Map<String, Any?> = value as? Map<String, Any?> ?: emptyMap()
fun jsonArray(value: Any?): List<Any?> = value as? List<Any?> ?: emptyList()
fun jsonString(value: Any?): String? = value as? String
fun jsonInt(value: Any?): Int? = when (value) {
    is Number -> value.toInt()
    is String -> value.toIntOrNull()
    else -> null
}

fun stableId(key: String): String {
    val digest = MessageDigest.getInstance("SHA-256").digest(key.toByteArray(Charsets.UTF_8))
    return digest.take(8).joinToString("") { "%02X".format(it.toInt() and 0xFF) }
}

val resourceLocationPattern = Regex("""^[a-z0-9_.-]+:[a-z0-9/._-]+$""")
const val missingIconPath = "assets/icons/missing.png"

fun isValidResourceLocation(id: String): Boolean = resourceLocationPattern.matches(id)

fun loadValidItemIds(): Set<String> {
    val ids = linkedSetOf<String>()
    val registriesPath = root.resolve("generated/runtime-dumps/registries.json")
    if (registriesPath.exists()) {
        val json = parseJson(read(registriesPath)) as? Map<*, *>
        val items = json?.get("items") as? Map<*, *>
        if (items != null) {
            items.keys
                .filterIsInstance<String>()
                .filter(::isValidResourceLocation)
                .forEach(ids::add)
        }
    }
    val iconManifestPath = root.resolve("generated/pack-site/assets/icon-manifest.json")
    if (iconManifestPath.exists()) {
        val json = parseJson(read(iconManifestPath)) as? Map<*, *>
        json?.entries
            ?.asSequence()
            ?.mapNotNull { (key, value) ->
                val itemId = key as? String ?: return@mapNotNull null
                val iconPath = value as? String ?: return@mapNotNull null
                itemId.takeIf { isValidResourceLocation(it) && iconPath != missingIconPath }
            }
            ?.forEach(ids::add)
    }
    return ids
}

fun loadBurntCoverageCategories(): Map<String, String> {
    val path = root.resolve("generated/runtime-dumps/burnt-coverage-current-covered.tsv")
    if (!path.exists()) return emptyMap()
    return read(path).lineSequence()
        .drop(1)
        .mapNotNull { line ->
            val parts = line.split('\t')
            if (parts.size < 2 || ':' !in parts[0]) null else parts[0] to parts[1]
        }
        .toMap()
}

fun QuestModel.isHeaderQuest(): Boolean = tasks.isNotEmpty() && tasks.all { it.type == "checkmark" && it.item == null }
fun QuestModel.hasItemTasks(): Boolean = tasks.any { it.type == "item" && it.item != null }

fun buildSections(chapter: ChapterModel): MutableList<SectionModel> {
    val sections = mutableListOf<SectionModel>()
    var current: SectionModel? = null
    for (quest in chapter.quests) {
        when {
            quest.isHeaderQuest() -> {
                current = SectionModel(quest, mutableListOf())
                sections += current
            }
            quest.hasItemTasks() -> {
                if (current == null) {
                    val synthetic = QuestModel(
                        id = "SYNTHETIC",
                        title = "Items",
                        icon = chapter.icon,
                        shape = "square",
                        size = 0.8,
                        x = 0.0,
                        y = 0.0,
                        tasks = mutableListOf(TaskModel(id = "SYNTHETIC", type = "checkmark", title = "Items")),
                    )
                    current = SectionModel(synthetic, mutableListOf())
                    sections += current
                }
                current.quests += quest
            }
        }
    }
    return sections
}

fun isPlantCollectionCandidate(itemId: String, questTitle: String, burntCategories: Map<String, String>): Boolean {
    val loweredId = itemId.lowercase(Locale.ROOT)
    val loweredTitle = questTitle.lowercase(Locale.ROOT)
    val burntCategory = burntCategories[itemId]
    if (burntCategory != null && burntCategory !in setOf("plants_will_burn", "crops")) return false
    val tokens = (loweredId.replace(':', '_') + "_" + loweredTitle.replace(' ', '_'))
        .split(Regex("""[^a-z0-9]+"""))
        .filter { it.isNotBlank() }
        .toSet()
    val hardExclusionTokens = setOf(
        "block", "brick", "bricks", "wall", "wood", "log", "planks", "bookshelf", "chest", "ladder", "post",
        "cabinet", "basket", "crate", "bed", "bucket", "ingot", "nugget", "axe", "hoe", "pickaxe", "shovel",
        "sword", "cannon", "battery", "grapple", "lamp", "panel", "pane", "connector", "banister", "hook",
        "paste", "stone", "cobblestone", "travertine", "phyllite", "slate", "mazestone", "nagastone",
        "towerwood", "underbrick", "quartz", "tiles", "tile"
    )
    if (tokens.any { it in hardExclusionTokens }) return false
    val plantFormTokens = setOf("seed", "seeds", "sapling", "saplings", "potted", "flower", "flowers", "grass", "fern", "bush", "vine", "vines", "root", "roots", "moss", "lily", "reed", "mushroom", "fungus", "crop", "crops", "leaf", "leaves")
    val solidSuffixes = listOf("stone", "brick", "bricks", "wood", "log", "block", "wall", "planks", "bookshelf", "chest", "post", "cabinet", "basket", "crate", "bed", "bucket", "panel", "pane", "connector", "banister", "hook", "paste", "slab", "stairs", "door", "trapdoor", "button", "plate", "ingot", "nugget", "quartz", "travertine", "phyllite", "slate", "mazestone", "nagastone", "towerwood", "underbrick", "cobblestone", "holystone", "mosaic")
    if (tokens.any { token -> solidSuffixes.any { suffix -> token.endsWith(suffix) } } &&
        !(burntCategory in setOf("plants_will_burn", "crops") && tokens.any { it in plantFormTokens })
    ) return false
    val allowedSignals = listOf(
        "seed", "sapling", "potted", "flower", "leaf", "leaves", "lily", "vine", "roots", "root", "moss",
        "grass", "fern", "bush", "berry", "berries", "reed", "cactus", "bamboo", "mushroom", "fungus",
        "wart", "crop", "fiber", "fibre", "petal", "blossom", "fruit", "bean", "pepper", "tomato",
        "cabbage", "beetroot", "potato", "carrot", "onion", "pumpkin", "melon", "apple", "cocoa", "lemongrass",
        "turnip", "cauliflower"
    )
    return burntCategory in setOf("plants_will_burn", "crops") || allowedSignals.any { loweredId.contains(it) || loweredTitle.contains(it) }
}

fun filterSections(
    chapter: ChapterModel,
    sections: List<SectionModel>,
    validItems: Set<String>,
    chapterFallbackIcon: String,
    burntCategories: Map<String, String>,
): MutableList<SectionModel> {
    val kept = mutableListOf<SectionModel>()
    for (section in sections) {
        val validQuests = section.quests.filter { quest ->
            val itemTasks = quest.tasks.filter { it.type == "item" && it.item != null }
            itemTasks.isNotEmpty() && itemTasks.all { task ->
                task.item in validItems && when (chapter.filename) {
                    "completionist_plants" -> isPlantCollectionCandidate(task.item!!, quest.title, burntCategories)
                    else -> true
                }
            }
        }.toMutableList()
        if (validQuests.isEmpty()) continue
        for (quest in validQuests) {
            if (quest.icon !in validItems) {
                quest.icon = quest.tasks.firstNotNullOfOrNull { it.item } ?: chapterFallbackIcon
            }
        }
        val header = section.header.copy(
            icon = when {
                section.header.icon in validItems -> section.header.icon
                validQuests.isNotEmpty() -> validQuests.first().icon
                else -> chapterFallbackIcon
            },
            description = "${validQuests.size} starter stubs.",
        )
        kept += SectionModel(header, validQuests)
    }
    return kept
}

fun formatDouble(value: Double): String {
    val rounded = if (abs(value - value.roundToInt().toDouble()) < 1e-9) {
        String.format(Locale.ROOT, "%.1f", value)
    } else {
        String.format(Locale.ROOT, "%.2f", value).trimEnd('0').trimEnd('.')
    }
    return "${rounded}d"
}

fun escape(value: String): String = value.replace("\\", "\\\\").replace("\"", "\\\"")

fun humanizeId(id: String): String =
    id.substringAfter(':')
        .replace('/', ' ')
        .replace('_', ' ')
        .split(' ')
        .filter { it.isNotBlank() }
        .joinToString(" ") { token ->
            when (token.lowercase(Locale.ROOT)) {
                "of" -> "Of"
                "the" -> "The"
                else -> token.replaceFirstChar { ch -> ch.titlecase(Locale.ROOT) }
            }
        }

fun namespaceTitle(namespace: String): String =
    namespace.split('_', '-', ' ')
        .filter { it.isNotBlank() }
        .joinToString(" ") { token -> token.replaceFirstChar { it.titlecase(Locale.ROOT) } }

fun collectPedestalTokens(value: Any?, sink: MutableList<String>) {
    when (value) {
        is Map<*, *> -> {
            val item = value["item"]
            when (item) {
                is String -> if (':' in item) sink += item
                is Map<*, *> -> {
                    val nestedItem = item["item"] as? String
                    val nestedTag = item["tag"] as? String
                    if (nestedItem != null && ':' in nestedItem) sink += nestedItem
                    if (nestedTag != null) sink += nestedTag
                }
            }
            val tag = value["tag"] as? String
            if (tag != null) sink += tag
            value.values.forEach { collectPedestalTokens(it, sink) }
        }
        is List<*> -> value.forEach { collectPedestalTokens(it, sink) }
    }
}

fun loadRealEnchantments(): List<EnchantmentSource> {
    val manifestPath = root.resolve("generated/runtime-dumps/kubejs-config/full_recipe_index_manifest.json")
    require(manifestPath.exists()) { "missing full recipe manifest: ${rel(manifestPath)}" }
    val manifest = jsonObject(parseJson(read(manifestPath)))
    val chunkCount = jsonInt(manifest["chunkCount"]) ?: 0
    val pattern = jsonString(manifest["pattern"]) ?: "full_recipe_index_0000.json"
    data class Accumulator(
        val namespace: String,
        val hintItems: LinkedHashSet<String> = linkedSetOf(),
        var minSourceCost: Int? = null,
        var maxSourceCost: Int? = null,
    )
    val byEnchantment = linkedMapOf<String, Accumulator>()
    for (index in 0 until chunkCount) {
        val chunkName = pattern.replace(Regex("""\d{4}(?=\.json$)"""), index.toString().padStart(4, '0'))
        val chunkPath = root.resolve("generated/runtime-dumps/kubejs-config").resolve(chunkName)
        if (!chunkPath.exists()) continue
        val chunk = jsonObject(parseJson(read(chunkPath)))
        for (recipe in jsonArray(chunk["recipes"]).map(::jsonObject)) {
            if (jsonString(recipe["type"]) != "ars_nouveau:enchantment") continue
            val payload = jsonObject(parseJson(jsonString(recipe["json"]) ?: continue))
            val enchantmentId = jsonString(payload["enchantment"]) ?: continue
            val namespace = enchantmentId.substringBefore(':', "minecraft")
            val acc = byEnchantment.getOrPut(enchantmentId) { Accumulator(namespace) }
            val sourceCost = jsonInt(payload["sourceCost"])
            if (sourceCost != null) {
                acc.minSourceCost = listOfNotNull(acc.minSourceCost, sourceCost).minOrNull()
                acc.maxSourceCost = listOfNotNull(acc.maxSourceCost, sourceCost).maxOrNull()
            }
            val tokens = mutableListOf<String>()
            collectPedestalTokens(payload["pedestalItems"], tokens)
            tokens.distinct().forEach(acc.hintItems::add)
        }
    }
    return byEnchantment.entries
        .sortedWith(compareBy<Map.Entry<String, Accumulator>>({ it.value.namespace }, { humanizeId(it.key) }))
        .map { (id, acc) ->
            EnchantmentSource(
                id = id,
                namespace = acc.namespace,
                title = humanizeId(id),
                hintItems = acc.hintItems.take(4),
                minSourceCost = acc.minSourceCost,
                maxSourceCost = acc.maxSourceCost,
            )
        }
}

fun loadEffectSources(validItems: Set<String>): List<EffectSource> {
    val path = root.resolve("server-instance/kubejs/config/food_effect_source_catalog.json")
    require(path.exists()) { "missing effect source catalog: ${rel(path)}" }
    val rootObject = jsonObject(parseJson(read(path)))
    val effects = jsonArray(rootObject["effects"])
    return effects.mapNotNull { raw ->
        val effect = jsonObject(raw)
        val effectId = jsonString(effect["effect"]) ?: return@mapNotNull null
        val title = humanizeId(effectId)
        val preferredSources = jsonArray(effect["preferredSources"]).mapNotNull(::jsonString)
        val topFoods = jsonArray(effect["topFoods"]).map(::jsonObject).mapNotNull { jsonString(it["id"]) }
        val sourceItems = (preferredSources + topFoods)
            .distinct()
            .filter { it in validItems }
            .take(4)
        if (sourceItems.isEmpty()) return@mapNotNull null
        val hint = jsonString(effect["proposedStage"])
        EffectSource(
            id = effectId,
            title = title,
            icon = sourceItems.first(),
            sourceItems = sourceItems,
            hint = hint,
        )
    }.sortedBy { it.title }
}

fun layoutGenericSections(sections: List<SectionModel>, columns: Int = 12, xStep: Double = 1.25, yStep: Double = 1.25) {
    var currentY = 0.0
    for (section in sections) {
        section.header.x = 0.0
        section.header.y = currentY
        section.header.description = "${section.quests.size} starter stubs."
        for ((index, quest) in section.quests.withIndex()) {
            quest.x = 1.5 + (index % columns) * xStep
            quest.y = currentY + (index / columns) * yStep
        }
        val rows = max(1, (section.quests.size + columns - 1) / columns)
        currentY += rows * yStep + 2.0
    }
}

fun layoutConsumableSection(section: SectionModel, startY: Double, pageColumns: Int = 16, pageRows: Int = 9, xStep: Double = 1.25, yStep: Double = 1.25, pageGap: Double = 3.0) {
    section.header.x = 0.0
    section.header.y = startY
    section.header.description = "${section.quests.size} starter stubs."
    val pageSize = pageColumns * pageRows
    for ((index, quest) in section.quests.withIndex()) {
        val page = index / pageSize
        val withinPage = index % pageSize
        val col = withinPage % pageColumns
        val row = withinPage / pageColumns
        quest.x = 1.5 + page * (pageColumns * xStep + pageGap) + col * xStep
        quest.y = startY + row * yStep
    }
}

fun writeChapter(path: Path, chapter: ChapterModel) {
    val output = buildString {
        appendLine("{")
        appendLine("\tdefault_hide_dependency_lines: false")
        appendLine("\tdefault_quest_shape: \"\"")
        appendLine("\tfilename: \"${escape(chapter.filename)}\"")
        appendLine("\tgroup: \"${escape(chapter.group)}\"")
        appendLine("\ticon: \"${escape(chapter.icon)}\"")
        appendLine("\tid: \"${escape(chapter.id)}\"")
        appendLine("\torder_index: ${chapter.orderIndex}")
        appendLine("\tquest_links: [ ]")
        appendLine("\tquests: [")
        chapter.quests.forEachIndexed { questIndex, quest ->
            appendLine("\t\t{")
            appendLine("\t\t\tid: \"${escape(quest.id)}\"")
            appendLine("\t\t\ttitle: \"${escape(quest.title)}\"")
            appendLine("\t\t\ticon: \"${escape(quest.icon)}\"")
            appendLine("\t\t\tshape: \"${escape(quest.shape)}\"")
            appendLine("\t\t\tsize: ${formatDouble(quest.size)}")
            appendLine("\t\t\tx: ${formatDouble(quest.x)}")
            appendLine("\t\t\ty: ${formatDouble(quest.y)}")
            appendLine("\t\t\ttasks: [")
            quest.tasks.forEach { task ->
                appendLine("\t\t\t\t{")
                appendLine("\t\t\t\t\tid: \"${escape(task.id)}\"")
                appendLine("\t\t\t\t\ttype: \"${escape(task.type)}\"")
                if (task.title != null) appendLine("\t\t\t\t\ttitle: \"${escape(task.title)}\"")
                if (task.item != null) appendLine("\t\t\t\t\titem: \"${escape(task.item)}\"")
                if (task.item != null) appendLine("\t\t\t\t\tcount: ${task.count}")
                appendLine("\t\t\t\t}")
            }
            appendLine("\t\t\t]")
            appendLine("\t\t\trewards: [ ]")
            if (quest.description != null) appendLine("\t\t\tdescription: [\"${escape(quest.description!!)}\"]")
            append("\t\t}")
            if (questIndex != chapter.quests.lastIndex) appendLine() else appendLine()
        }
        appendLine("\t]")
        appendLine("}")
    }
    write(path, output)
}

fun rebuildChapter(path: Path, validItems: Set<String>) {
    val sourceText = when (path.fileName.toString()) {
        "completionist_plants.snbt" -> readGitHead(path) ?: read(path)
        else -> read(path)
    }
    val chapter = parseChapterText(sourceText)
    val sections = buildSections(chapter)
    val chapterFallbackIcon = when {
        chapter.icon in validItems -> chapter.icon
        else -> "minecraft:barrier"
    }
    val filteredSections = filterSections(chapter, sections, validItems, chapterFallbackIcon, loadBurntCoverageCategories())
    if (filteredSections.isEmpty()) {
        fail("no valid quests remained after filtering: ${rel(path)}")
        return
    }
    when (chapter.filename) {
        "completionist_consumables" -> {
            val foods = filteredSections.find { it.header.title == "Foods" }
            val drinks = filteredSections.find { it.header.title == "Drinks" }
            val rebuiltSections = mutableListOf<SectionModel>()
            if (foods != null) {
                layoutConsumableSection(foods, startY = 0.0)
                rebuiltSections += foods
            }
            if (drinks != null) {
                layoutConsumableSection(drinks, startY = 12.5)
                rebuiltSections += drinks
            }
            val flatQuests = rebuiltSections.flatMap { listOf(it.header) + it.quests }.toMutableList()
            chapter.quests.clear()
            chapter.quests += flatQuests
        }
        else -> {
            layoutGenericSections(filteredSections)
            chapter.quests.clear()
            chapter.quests += filteredSections.flatMap { listOf(it.header) + it.quests }
        }
    }
    chapter.icon = when {
        chapter.icon in validItems -> chapter.icon
        chapter.quests.firstOrNull { it.hasItemTasks() } != null -> chapter.quests.first { it.hasItemTasks() }.icon
        else -> chapter.icon
    }
    writeChapter(path, chapter)
}

fun rebuildEnchantmentsChapter(path: Path) {
    val template = parseChapter(path)
    val sources = loadRealEnchantments()
    if (sources.isEmpty()) {
        fail("no real enchantments found in recipe dumps for ${rel(path)}")
        return
    }
    val sections = sources.groupBy { it.namespace }.toSortedMap().map { (namespace, enchantments) ->
        val title = namespaceTitle(namespace)
        val header = QuestModel(
            id = stableId("completionist-enchantments:header:$namespace"),
            title = title,
            icon = "minecraft:enchanted_book",
            shape = "square",
            size = 0.8,
            x = 0.0,
            y = 0.0,
            tasks = mutableListOf(TaskModel(id = stableId("completionist-enchantments:header-task:$namespace"), type = "checkmark", title = title)),
            description = "${enchantments.size} starter stubs.",
        )
        val quests = enchantments.sortedBy { it.title }.map { enchantment ->
            val descriptionParts = mutableListOf<String>()
            if (enchantment.hintItems.isNotEmpty()) {
                descriptionParts += "Hint: Ars Enchanting Apparatus via ${enchantment.hintItems.joinToString(", ")}"
            }
            if (enchantment.minSourceCost != null && enchantment.maxSourceCost != null) {
                descriptionParts += "Source cost: ${enchantment.minSourceCost}-${enchantment.maxSourceCost}"
            }
            QuestModel(
                id = stableId("completionist-enchantments:quest:${enchantment.id}"),
                title = "All Enchantments: ${enchantment.title}",
                icon = "minecraft:enchanted_book",
                shape = "rsquare",
                size = 1.0,
                x = 0.0,
                y = 0.0,
                tasks = mutableListOf(
                    TaskModel(
                        id = stableId("completionist-enchantments:task:${enchantment.id}"),
                        type = "checkmark",
                        title = enchantment.title,
                    )
                ),
                description = descriptionParts.takeIf { it.isNotEmpty() }?.joinToString(" | "),
            )
        }.toMutableList()
        SectionModel(header, quests)
    }
    layoutGenericSections(sections)
    template.icon = "minecraft:enchanted_book"
    template.quests.clear()
    template.quests += sections.flatMap { listOf(it.header) + it.quests }
    writeChapter(path, template)
}

fun rebuildEffectsChapter(path: Path, validItems: Set<String>) {
    val template = parseChapter(path)
    val sources = loadEffectSources(validItems)
    if (sources.isEmpty()) {
        fail("no real potion effect sources found for ${rel(path)}")
        return
    }
    val grouped = linkedMapOf(
        "A-H" to sources.filter { it.title.firstOrNull()?.uppercaseChar() in 'A'..'H' },
        "I-P" to sources.filter { it.title.firstOrNull()?.uppercaseChar() in 'I'..'P' },
        "Q-Z" to sources.filter { it.title.firstOrNull()?.uppercaseChar() in 'Q'..'Z' },
    ).filterValues { it.isNotEmpty() }
    val sections = grouped.map { (label, entries) ->
        val header = QuestModel(
            id = stableId("completionist-effects:header:$label"),
            title = label,
            icon = entries.first().icon,
            shape = "square",
            size = 0.8,
            x = 0.0,
            y = 0.0,
            tasks = mutableListOf(TaskModel(id = stableId("completionist-effects:header-task:$label"), type = "checkmark", title = label)),
            description = "${entries.size} starter stubs.",
        )
        val quests = entries.map { effect ->
            val taskItems = effect.sourceItems.take(3)
            QuestModel(
                id = stableId("completionist-effects:quest:${effect.id}"),
                title = "All Effects: ${effect.title}",
                icon = effect.icon,
                shape = "rsquare",
                size = 1.0,
                x = 0.0,
                y = 0.0,
                tasks = taskItems.mapIndexed { index, itemId ->
                    TaskModel(
                        id = stableId("completionist-effects:task:${effect.id}:$index:$itemId"),
                        type = "item",
                        item = itemId,
                        count = 1,
                    )
                }.toMutableList(),
                description = buildList {
                    add("Source items: ${taskItems.joinToString(", ")}")
                    if (effect.hint != null) add("Runtime hint: ${effect.hint}")
                }.joinToString(" | "),
            )
        }.toMutableList()
        SectionModel(header, quests)
    }
    layoutGenericSections(sections)
    template.icon = "minecraft:potion"
    template.quests.clear()
    template.quests += sections.flatMap { listOf(it.header) + it.quests }
    writeChapter(path, template)
}

val validItems = loadValidItemIds()
if (validItems.isEmpty()) {
    fail("no valid item ids found in generated/runtime-dumps/registries.json or generated/pack-site/assets/icon-manifest.json")
}

val targetFiles = listOf(
    root.resolve("config/ftbquests/quests/chapters/completionist_consumables.snbt"),
    root.resolve("config/ftbquests/quests/chapters/completionist_plants.snbt"),
    root.resolve("config/ftbquests/quests/chapters/completionist_armour_sets.snbt"),
    root.resolve("config/ftbquests/quests/chapters/completionist_tcon_weapons.snbt"),
)

for (file in targetFiles) {
    if (!file.exists()) {
        fail("missing chapter file: ${rel(file)}")
        continue
    }
    rebuildChapter(file, validItems)
}

val enchantmentsFile = root.resolve("config/ftbquests/quests/chapters/completionist_enchantments.snbt")
if (!enchantmentsFile.exists()) fail("missing chapter file: ${rel(enchantmentsFile)}")
else rebuildEnchantmentsChapter(enchantmentsFile)

val effectsFile = root.resolve("config/ftbquests/quests/chapters/completionist_effects.snbt")
if (!effectsFile.exists()) fail("missing chapter file: ${rel(effectsFile)}")
else rebuildEffectsChapter(effectsFile, validItems)

if (failures.isNotEmpty()) {
    System.err.println(failures.joinToString("\n") { "FAIL - $it" })
    exitProcess(1)
}

println("ok - regenerated completionist chapters against ${validItems.size} current dump item ids and ${loadRealEnchantments().size} real dump enchantments")

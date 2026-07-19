#!/usr/bin/env kotlin

import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.file.FileVisitResult
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.SimpleFileVisitor
import java.nio.file.attribute.BasicFileAttributes
import java.time.Instant
import java.util.Locale
import java.util.zip.ZipFile
import kotlin.math.round
import kotlin.system.exitProcess

data class Finding(val name: String, val detail: String, val severity: String = "SHOULD")
data class Pass(val name: String, val detail: String = "")
data class Skip(val name: String, val detail: String = "")
data class CmdResult(val exitCode: Int, val output: String)
data class QuestBlock(val id: String, val title: String, val items: List<String>, val block: String)

class JsonParser(private val text: String) {
    private var index = 0
    fun parse(): Any? {
        skip()
        val value = parseValue()
        skip()
        if (index != text.length) error("unexpected trailing content at $index")
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
                '}' -> { index++; return map }
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
                ']' -> { index++; return list }
                else -> error("expected ',' or ']' at $index")
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
                            'f' -> '\u000c'
                            'n' -> '\n'
                            'r' -> '\r'
                            't' -> '\t'
                            'u' -> text.substring(index, index + 4).also { index += 4 }.toInt(16).toChar()
                            else -> error("bad escape: \\$esc")
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
        return raw.toDoubleOrNull() ?: error("bad number: $raw")
    }
    private fun parseLiteral(token: String, value: Any?): Any? {
        require(text.startsWith(token, index)) { "expected $token at $index" }
        index += token.length
        return value
    }
    private fun skip() { while (index < text.length && text[index].isWhitespace()) index++ }
    private fun peek(): Char? = text.getOrNull(index)
    private fun expect(ch: Char) {
        if (peek() != ch) error("expected '$ch' at $index")
        index++
    }
}

fun parseJson(text: String): Any? = JsonParser(text).parse()
fun jsonObject(value: Any?): Map<String, Any?> = value as? Map<String, Any?> ?: emptyMap()
fun jsonArray(value: Any?): List<Any?> = value as? List<Any?> ?: emptyList()
fun jsonString(value: Any?): String? = value as? String
fun jsonInt(value: Any?): Int? = when (value) {
    is Number -> value.toInt()
    is String -> value.toDoubleOrNull()?.toInt()
    else -> null
}
fun jsonBool(value: Any?): Boolean? = value as? Boolean

val repo: Path = Paths.get("").toAbsolutePath().normalize()
val instance: Path = Paths.get(System.getenv("BC_INSTANCE") ?: "server-instance").toAbsolutePath().normalize()
val explicitInstance = System.getenv("BC_INSTANCE") != null
val strictRuntime = (System.getenv("BC_STRICT_RUNTIME") == "1") || args.contains("--strict-runtime")
val strictDataDumps = (System.getenv("BC_STRICT_DATA_DUMPS") == "1") || args.contains("--strict-data-dumps")
val runtimeOnly = System.getenv("BC_RUNTIME_ONLY") == "1"
val reportDir: Path = Paths.get(System.getenv("BC_REPORT_DIR") ?: repo.resolve("generated/validation").toString())
val generatedConfigDir = instance.resolve("kubejs/config")
val retainedRuntimeDumpDir = repo.resolve("generated/runtime-dumps")
val retainedGeneratedConfigDir = retainedRuntimeDumpDir.resolve("kubejs-config")
val generatedDumpDir = instance.resolve("dump/data_raw")
val techParentingPath = repo.resolve("kubejs/config/tech_parenting.json")

val hardFailures = mutableListOf<Finding>()
val softFindings = mutableListOf<Finding>()
val passes = mutableListOf<Pass>()
val skips = mutableListOf<Skip>()
val metrics = linkedMapOf<String, Any?>()
val performanceResults = mutableListOf<Map<String, Any?>>()

val performanceBudgetsMs = linkedMapOf(
    "JSON and JS syntax validation" to mapOf("budget" to 8000, "hard" to 24000),
    "critical progression surfaces" to mapOf("budget" to 750, "hard" to 3000),
    "progression parenting and economy validation" to mapOf("budget" to 2500, "hard" to 10000),
    "pack contract validation" to mapOf("budget" to 1000, "hard" to 5000),
    "contract completeness classification" to mapOf("budget" to 1000, "hard" to 5000),
    "autonomous contract validation" to mapOf("budget" to 1500, "hard" to 6000),
    "quest book validation" to mapOf("budget" to 250, "hard" to 1500),
    "Wares and villager trade validation" to mapOf("budget" to 250, "hard" to 1500),
    "repo loot data validation" to mapOf("budget" to 500, "hard" to 3000),
    "runtime core tag regression validation" to mapOf("budget" to 1500, "hard" to 6000),
    "generated recipe graph validation" to mapOf("budget" to 5000, "hard" to 20000),
    "generated loot dump validation" to mapOf("budget" to 2500, "hard" to 10000),
    "engine and world performance log analysis" to mapOf("budget" to 750, "hard" to 1500),
    "Realistic Hands validation" to mapOf("budget" to 2000, "hard" to 5000),
    "KubeJS asset validation" to mapOf("budget" to 2000, "hard" to 5000),
    "chemistry identity validation" to mapOf("budget" to 1500, "hard" to 4000),
    "dev dump health validation" to mapOf("budget" to 50, "hard" to 500),
    "plank regression static validation" to mapOf("budget" to 250, "hard" to 1500),
)

data class HardFindingMatch(val lineNumber: Int, val line: String)
data class HardFinding(val key: String, val label: String, var count: Int = 0, val matches: MutableList<HardFindingMatch> = mutableListOf())

val hardPatterns = listOf(
    Triple("kubejs_recipe_parse_error", "KubeJS recipe parse errors", Regex("Error parsing recipe", RegexOption.IGNORE_CASE)),
    Triple("invalid_empty_fluid", "Invalid empty fluid errors", Regex("Invalid empty fluid", RegexOption.IGNORE_CASE)),
    Triple("crash_report_marker", "Crash report markers", Regex("crash report|this crash report has been saved|preparing crash report", RegexOption.IGNORE_CASE)),
    Triple("jvm_fatal", "JVM fatal errors", Regex("OutOfMemoryError|hs_err_pid|fatal error has been detected", RegexOption.IGNORE_CASE)),
    Triple("modernfix_watchdog", "ModernFix watchdog signatures", Regex("modernfix.*watchdog|watchdog.*modernfix|server thread dump", RegexOption.IGNORE_CASE)),
    Triple("c2me_thread_guard", "C2ME/thread-guard signatures", Regex("(ThreadingDetector|PalettedContainer|BulkSectionAccess|safe.?random|random.*wrong thread|accessing legacyrandomsource|CheckedThreadLocalRandom|Chunk not there when requested).*\\b(Exception|Error|FATAL|ReportedException|IllegalStateException)\\b|\\b(Exception|Error|FATAL|ReportedException|IllegalStateException)\\b.*(ThreadingDetector|PalettedContainer|BulkSectionAccess|safe.?random|random.*wrong thread|accessing legacyrandomsource|CheckedThreadLocalRandom|Chunk not there when requested)", RegexOption.IGNORE_CASE)),
)
val kubeJsErrorPattern = Regex("""\[[^\]]+/ERROR]|\[ERROR]""")
val hardPatternIgnores = mapOf(
    "modernfix_watchdog" to listOf(
        Regex("""Option 'mixin\.feature\.integrated_server_watchdog' overriden \(by user configuration\) to 'false'""", RegexOption.IGNORE_CASE),
    ),
)

fun ok(name: String, detail: String = "") {
    passes += Pass(name, detail)
    println("ok - $name" + if (detail.isNotBlank()) " ($detail)" else "")
}
fun fail(name: String, detail: String) {
    hardFailures += Finding(name, detail, "MUST")
    System.err.println("FAIL - $name: $detail")
}
fun finding(name: String, detail: String, severity: String = "SHOULD") {
    if (severity == "MUST") {
        fail(name, detail)
        return
    }
    softFindings += Finding(name, detail, severity)
    println("$severity - $name: $detail")
}
fun skip(name: String, detail: String) {
    skips += Skip(name, detail)
    println("skip - $name" + if (detail.isNotBlank()) " ($detail)" else "")
}
fun missingRuntimeEvidence(name: String, detail: String) {
    if (strictRuntime) fail(name, detail) else skip(name, detail)
}
fun missingDataDumpEvidence(name: String, detail: String) {
    if (strictDataDumps) fail(name, detail) else skip(name, detail)
}

fun rel(path: Path): String = repo.relativize(path.toAbsolutePath().normalize()).toString().ifBlank { "." }
fun exists(path: Path): Boolean = Files.exists(path)
fun read(path: Path): String = Files.readString(path)
fun readJson(path: Path): Any? = parseJson(read(path))
fun latestRuntimeLog(): Path = instance.resolve("logs/latest.log")
fun firstExisting(vararg candidates: Path): Path? = candidates.firstOrNull(::exists)
fun unique(values: List<String>): List<String> = values.filter { it.isNotBlank() }.distinct()
fun namespace(id: String): String = if (":" in id) id.substringBefore(':') else "minecraft"
fun localName(id: String): String = if (":" in id) id.substringAfter(':') else id

fun walk(rootDir: Path, predicate: (Path) -> Boolean = { true }): List<Path> {
    if (!exists(rootDir)) return emptyList()
    val out = mutableListOf<Path>()
    Files.walkFileTree(rootDir, object : SimpleFileVisitor<Path>() {
        override fun visitFile(file: Path, attrs: BasicFileAttributes): FileVisitResult {
            if (predicate(file)) out.add(file)
            return FileVisitResult.CONTINUE
        }
    })
    return out
}

fun countOccurrences(text: String, needle: String): Int = Regex(Regex.escape(needle)).findAll(text).count()
fun newestFile(files: List<Path>): Path? = files.maxByOrNull { Files.getLastModifiedTime(it).toMillis() }
fun roundMs(value: Double): Double = round(value * 100.0) / 100.0
fun runtimeGeneratedConfigFile(name: String): Path? = firstExisting(generatedConfigDir.resolve(name), retainedGeneratedConfigDir.resolve(name))
fun runtimeRecipeGraphFile(): Path? = firstExisting(instance.resolve("generated/runtime-dumps/recipes.json"), instance.resolve("recipes.json"), instance.resolve("dump/recipes.json"), retainedRuntimeDumpDir.resolve("recipes.json"))
fun runtimeTagGraphFile(): Path? = firstExisting(instance.resolve("generated/runtime-dumps/tags.json"), retainedRuntimeDumpDir.resolve("tags.json"))
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

fun loadBurntCoverageCategories(): Map<String, String>? {
    val path = repo.resolve("generated/runtime-dumps/burnt-coverage-current-covered.tsv")
    if (!exists(path)) return null
    return read(path).lineSequence()
        .drop(1)
        .mapNotNull { line ->
            val parts = line.split('\t')
            if (parts.size < 2 || ':' !in parts[0]) null else parts[0] to parts[1]
        }
        .toMap()
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

fun table(rows: List<List<String>>): String {
    if (rows.isEmpty()) return "_None._\n"
    val widths = mutableListOf<Int>()
    rows.forEach { row -> row.forEachIndexed { i, cell -> if (i >= widths.size) widths += cell.length else widths[i] = maxOf(widths[i], cell.length) } }
    fun line(row: List<String>): String = "| " + row.mapIndexed { i, cell -> cell.padEnd(widths[i]) }.joinToString(" | ") + " |"
    return buildString {
        appendLine(line(rows.first()))
        appendLine(line(rows.first().mapIndexed { i, _ -> "-".repeat(maxOf(3, widths[i])) }))
        rows.drop(1).forEach { appendLine(line(it)) }
    }
}

fun runCommand(vararg args: String): CmdResult {
    val process = ProcessBuilder(args.toList()).directory(repo.toFile()).redirectErrorStream(true).start()
    val buffer = ByteArrayOutputStream()
    process.inputStream.copyTo(buffer)
    return CmdResult(process.waitFor(), buffer.toString(Charsets.UTF_8))
}

fun addHardFinding(findingsByKey: MutableMap<String, HardFinding>, key: String, label: String, lineNumber: Int, line: String) {
    val finding = findingsByKey.getOrPut(key) { HardFinding(key, label) }
    finding.count += 1
    if (finding.matches.size < 20) finding.matches += HardFindingMatch(lineNumber, line)
}

fun scanHardFailuresInline(logPath: Path, instanceDir: Path): Pair<Boolean, String> {
    val findingsByKey = linkedMapOf<String, HardFinding>()
    val logsToScan = mutableListOf(logPath to false)
    for (name in listOf("server.log", "startup.log", "client.log")) {
        val kubeLog = instanceDir.resolve("logs/kubejs/$name")
        if (exists(kubeLog)) logsToScan += kubeLog to true
    }
    for ((path, isKubeJsLog) in logsToScan.distinctBy { it.first.toAbsolutePath().normalize() }) {
        val sourcePrefix = runCatching { instanceDir.relativize(path).toString() }.getOrElse { path.toString() }
        Files.readAllLines(path).forEachIndexed { index, rawLine ->
            val lineNumber = index + 1
            val line = if (path == logPath) rawLine else "$sourcePrefix:$lineNumber: $rawLine"
            Regex("""with (\d+) failed recipes""", RegexOption.IGNORE_CASE).find(rawLine)?.groupValues?.getOrNull(1)?.toIntOrNull()?.let {
                if (it > 0) addHardFinding(findingsByKey, "kubejs_failed_recipes", "KubeJS failed recipe count", lineNumber, line)
            }
            if (isKubeJsLog && kubeJsErrorPattern.containsMatchIn(rawLine)) {
                addHardFinding(findingsByKey, "kubejs_script_error", "KubeJS script log errors", lineNumber, line)
            }
            for ((key, label, pattern) in hardPatterns) {
                val ignored = hardPatternIgnores[key].orEmpty().any { it.containsMatchIn(rawLine) }
                if (!ignored && pattern.containsMatchIn(rawLine)) addHardFinding(findingsByKey, key, label, lineNumber, line)
            }
        }
    }
    val crashFiles = walk(instanceDir.resolve("crash-reports")) { Regex("""crash-.*\.txt$""").matches(it.fileName.toString()) }
    val newestCrash = newestFile(crashFiles)
    if (newestCrash != null && Files.getLastModifiedTime(newestCrash).toMillis() > Files.getLastModifiedTime(logPath).toMillis()) {
        addHardFinding(findingsByKey, "newer_crash_report", "Crash report newer than log", 0, instanceDir.relativize(newestCrash).toString())
    }
    val output = if (findingsByKey.isEmpty()) {
        "ok - hard log failure scan (${logPath})"
    } else {
        buildString {
            appendLine("FAIL - hard log failure scan (${logPath})")
            for (finding in findingsByKey.values) {
                appendLine("FAIL - ${finding.label}: ${finding.count}")
                for (match in finding.matches) {
                    val prefix = if (match.lineNumber > 0) "${match.lineNumber}:" else ""
                    appendLine("  $prefix${match.line}")
                }
            }
        }.trim()
    }
    return (findingsByKey.isEmpty()) to output
}

fun commandExists(command: String): Boolean =
    System.getenv("PATH")
        .orEmpty()
        .split(File.pathSeparator)
        .filter { it.isNotBlank() }
        .map { Paths.get(it).resolve(command) }
        .any { Files.isExecutable(it) && !Files.isDirectory(it) }

fun runMeasured(name: String, block: () -> Unit) {
    val start = System.nanoTime()
    try {
        block()
    } finally {
        val duration = roundMs((System.nanoTime() - start) / 1_000_000.0)
        val budget = performanceBudgetsMs[name]
        performanceResults += mapOf(
            "name" to name,
            "durationMs" to duration,
            "budgetMs" to budget?.get("budget"),
            "hardLimitMs" to budget?.get("hard"),
        )
        if (budget == null) {
            ok("performance measured: $name", "$duration ms")
        } else {
            val hard = budget["hard"] as Int
            val soft = budget["budget"] as Int
            if (duration > hard) fail("performance hard limit: $name", "$duration ms > $hard ms")
            else if (duration > soft) finding("performance budget exceeded: $name", "$duration ms > $soft ms", "SHOULD")
            else ok("performance budget: $name", "$duration ms <= $soft ms")
        }
    }
}

fun parseQuestBlocks(file: Path): List<QuestBlock> {
    val text = read(file)
    val blocks = mutableListOf<String>()
    val current = StringBuilder()
    var inQuests = false
    var inQuestBlock = false
    var braceDepth = 0

    for (line in text.lineSequence()) {
        val trimmed = line.trim()
        if (!inQuests) {
            if (trimmed == "quests: [") inQuests = true
            continue
        }
        if (!inQuestBlock) {
            when {
                line.startsWith("\t\t{") -> {
                    inQuestBlock = true
                    braceDepth = 0
                    current.clear()
                }
                line.startsWith("\t]") -> break
                else -> continue
            }
        }

        current.appendLine(line)
        braceDepth += line.count { it == '{' }
        braceDepth -= line.count { it == '}' }
        if (braceDepth <= 0) {
            blocks += current.toString()
            inQuestBlock = false
        }
    }

    return blocks.map { block ->
        val taskSegment = Regex("""\btasks:\s*\[([\s\S]*?)\]\s*(?:rewards:|description:|dependencies:|x:|y:|shape:|size:|\})""")
            .find(block)
            ?.groupValues
            ?.get(1)
            .orEmpty()
        QuestBlock(
            id = Regex("""\bid:\s*"([0-9A-Fa-f]{16})"""").find(block)?.groupValues?.get(1).orEmpty(),
            title = Regex("""\btitle:\s*"([^"]+)"""").find(block)?.groupValues?.get(1).orEmpty(),
            items = Regex("""type:\s*"item"[\s\S]*?\bitem:\s*"([^"]+)"""")
                .findAll(taskSegment)
                .map { it.groupValues[1] }
                .toList(),
            block = block,
        )
    }
}

fun parseQuestFile(file: Path): List<Map<String, Any?>> {
    val quests = mutableListOf<Map<String, Any?>>()
    fun parseItemList(segment: String): List<Map<String, Any?>> =
        Regex("""type:\s*"item"[\s\S]*?\bitem:\s*"([^"]+)"(?:[\s\S]*?\bcount:\s*([0-9]+)L?)?""").findAll(segment).map {
            mapOf("item" to it.groupValues[1], "count" to (it.groupValues.getOrNull(2)?.toIntOrNull() ?: 1))
        }.toList()
    for (quest in parseQuestBlocks(file)) {
        val block = quest.block
        quests += mapOf(
            "id" to quest.id,
            "block" to block,
            "icon" to (Regex("""\sicon:"([^"]+)"""").find(block)?.groupValues?.get(1) ?: ""),
            "disableJei" to (Regex("""\sdisable_jei:(true|false)""").find(block)?.groupValues?.get(1) ?: ""),
            "rewards" to parseItemList(Regex("""rewards:\[([\s\S]*?)\]\s+tasks:""").find(block)?.groupValues?.get(1) ?: ""),
            "tasks" to parseItemList(Regex("""tasks:\[([\s\S]*?)\]\}?$""").find(block)?.groupValues?.get(1) ?: ""),
        )
    }
    return quests
}

fun extractItems(value: Any?, out: MutableList<String> = mutableListOf()): List<String> {
    when (value) {
        null -> {}
        is List<*> -> value.forEach { extractItems(it, out) }
        is Map<*, *> -> {
            value["item"]?.let { if (it is String) out += it }
            value["id"]?.let { if (it is String && ":" in it) out += it }
            value["name"]?.let { if (it is String && ":" in it) out += it }
            value["tag"]?.let { if (it is String) out += "#$it" }
            value.values.forEach { extractItems(it, out) }
        }
        is String -> {}
    }
    return out
}

fun extractRecipeOutputs(json: Any?): List<String> {
    val outputs = mutableListOf<String>()
    fun add(id: Any?) {
        if (id is String && ":" in id) outputs += id
    }
    fun scan(value: Any?) {
        when (value) {
            null -> {}
            is String -> add(value)
            is List<*> -> value.forEach(::scan)
            is Map<*, *> -> {
                add(value["item"])
                add(value["id"])
            }
        }
    }
    val obj = jsonObject(json)
    scan(obj["result"]); scan(obj["results"]); scan(obj["output"]); scan(obj["outputs"])
    return unique(outputs)
}

val catalogPath = repo.resolve("kubejs/config/bc_expert_graph_catalog.json")
val catalog = try {
    jsonObject(readJson(catalogPath)).also { ok("progression catalog parses", "${jsonArray(it["tierOrder"]).size} tiers") }
} catch (error: Exception) {
    fail("progression catalog parses", error.message ?: error.javaClass.simpleName)
    emptyMap()
}
val coinTiers = jsonArray(catalog["coinTiers"]).map(::jsonObject)
val machineTiers = jsonArray(catalog["machineTiers"]).map(::jsonObject)
val tierOrder = jsonArray(catalog["tierOrder"]).mapNotNull(::jsonString)
val coinItems = coinTiers.mapNotNull { jsonString(it["item"]) }.toSet()
val tierIndex = tierOrder.withIndex().associate { it.value to it.index }
val casingToTier = machineTiers.associateNotNull({ jsonString(it["casing"]) }, { jsonString(it["id"]) })

fun <K, V> List<Map<String, Any?>>.associateNotNull(key: (Map<String, Any?>) -> K?, value: (Map<String, Any?>) -> V?): Map<K, V> {
    val out = linkedMapOf<K, V>()
    forEach { row ->
        val k = key(row)
        val v = value(row)
        if (k != null && v != null) out[k] = v
    }
    return out
}

fun tierAtLeast(actual: String, needed: String): Boolean = (tierIndex[actual] ?: -1) >= (tierIndex[needed] ?: 999)
fun inferTierFromItems(items: List<String>): String {
    var tier = "survival"
    for (item in items) {
        val casing = casingToTier[item]
        if (casing != null && tierAtLeast(casing, tier)) tier = casing
        if (item == "create:brass_casing" || item == "create:precision_mechanism") tier = "create_brass"
        if (item.startsWith("powergrid:") || item.startsWith("oc2r:")) if (!tierAtLeast(tier, "power_grid")) tier = "power_grid"
        if (item.startsWith("creatingspace:")) if (!tierAtLeast(tier, "space")) tier = "space"
        if (item.startsWith("ae2:") || item.startsWith("advanced_ae:") || item.startsWith("ae2additions:")) if (!tierAtLeast(tier, "ae2")) tier = "ae2"
    }
    return tier
}
fun intendedMachineTier(output: String): String? {
    casingToTier[output]?.let { return it }
    val ns = namespace(output)
    val name = localName(output)
    return when {
        ns == "tconstruct" -> "tcon_seared"
        ns == "create" -> if ("brass" in name || "precision" in name) "create_brass" else "create_andesite"
        ns in setOf("railways", "createdieselgenerators", "create_connected") -> "create_brass"
        ns in setOf("powergrid", "oc2r") -> "power_grid"
        ns == "creatingspace" -> "space"
        ns in setOf("ae2", "advanced_ae", "ae2additions", "expatternprovider", "merequester", "createappliedkinetics") -> "ae2"
        else -> null
    }
}
fun parentingEraTier(era: String): String? = when (era) {
    "survival" -> "survival"
    "seared" -> "tcon_seared"
    "andesite" -> "create_andesite"
    "brass" -> "create_brass"
    "airtight" -> "pneumatic_airtight"
    "electrical" -> "power_grid"
    "space" -> "space"
    "raw_impossible" -> "raw_impossible"
    "impossible" -> "ae2"
    else -> null
}
fun loadContractOutputTiers(): Pair<Map<String, String>, Set<String>> {
    if (!exists(techParentingPath)) return emptyMap<String, String>() to emptySet()
    val entries = jsonArray(jsonObject(readJson(techParentingPath))["entries"]).map(::jsonObject)
    val tiers = linkedMapOf<String, String>()
    val scripted = mutableSetOf<String>()
    for (entry in entries) {
        val output = jsonString(entry["output"]) ?: continue
        val tier = parentingEraTier(jsonString(entry["era"]).orEmpty()) ?: continue
        val current = tiers[output]
        if (current == null || tierAtLeast(tier, current)) tiers[output] = tier
        val surface = jsonString(entry["surface_type"]).orEmpty()
        if (surface.startsWith("kubejs:") || surface == "event.custom(kubejs)") scripted += output
    }
    return tiers to scripted
}
fun isMachineLike(output: String): Boolean {
    val name = localName(output)
    if (name == "activator_rail" || name == "excavator") return false
    if (namespace(output) == "tconstruct" && name.startsWith("fake_")) return false
    return Regex("""(machine|controller|generator|motor|battery|drive|interface|assembler|crafter|processor|terminal|bus|cell|storage|chamber|centrifuge|router|network|computer|monitor|transmitter|receiver|wireless|loader|quarry|miner|pump|pipe|conduit|reactor|turbine|fission|fusion|engine|gearbox|alternator|housing)|(^|_)vat($|_)""").containsMatchIn(name)
}

fun testJsonAndSyntax() {
    val jsonFiles = walk(repo.resolve("kubejs/data")) { it.toString().endsWith(".json") } +
        walk(repo.resolve("config/classselector")) { it.toString().endsWith(".json") } + listOf(catalogPath)
    val badJson = mutableListOf<String>()
    for (file in jsonFiles.filter { exists(it) }) {
        try { readJson(file) } catch (error: Exception) { badJson += "${rel(file)}: ${error.message}" }
    }
    if (badJson.isEmpty()) ok("all repo JSON parses", "${jsonFiles.size} files") else fail("all repo JSON parses", badJson.take(20).joinToString("\n"))
    val jsFiles = walk(repo.resolve("kubejs")) { it.toString().endsWith(".js") }
    if (!commandExists("kotlin")) return finding("all KubeJS JS parses with Rhino", "kotlin unavailable for syntax validation", "SHOULD")
    val result = runCommand("kotlin", repo.resolve("tools/kotlin/check_js_syntax.main.kts").toString())
    if (result.exitCode == 0) ok("all KubeJS JS parses with Rhino", "${jsFiles.size} files") else fail("all KubeJS JS parses with Rhino", result.output)
}

fun testCriticalSurfaces() {
    val required = listOf(
        "kubejs/server_scripts/30_recipe_replace/20_expensive_grout.js",
        "kubejs/server_scripts/30_recipe_replace/98_starting_progression_bypasses.js",
        "kubejs/server_scripts/30_recipe_replace/99_machine_casing_progression.js",
        "kubejs/server_scripts/30_recipe_replace/136_machine_casing_ecosystem_expansion.js",
        "kubejs/server_scripts/30_recipe_replace/165_protection_pixel_post_ae2_gates.js",
        "kubejs/server_scripts/30_recipe_replace/166_tome_of_blood_post_ae2_gates.js",
        "kubejs/server_scripts/30_recipe_replace/168_hooks_drones_utility_gates.js",
        "kubejs/server_scripts/30_recipe_replace/169_backpack_post_ae2_utility_gates.js",
        "kubejs/server_scripts/30_recipe_replace/170_space_dimension_access_gates.js",
        "kubejs/server_scripts/30_recipe_replace/80_magic_progression_blood_slate_gates.js",
        "kubejs/client_scripts/40_hide_quarantined_systems.js",
        "kubejs/server_scripts/30_recipe_replace/130_manufactured_plate_recipe_pass.js",
        "kubejs/server_scripts/35_villager_trades/10_coin_villager_trades.js",
        "kubejs/server_scripts/50_loot/20_world_chest_coin_tiers.js",
        "kubejs/server_scripts/50_loot/40_emerald_loot_coin_replacement.js",
        "kubejs/data/bc/advancements/creating_space_access.json",
        "config/twilightforest-common.toml",
        "kubejs/data/wares/loot_tables/agreement/village/plains_payment_sell.json",
    ).map(repo::resolve)
    val missing = required.filterNot(::exists).map(::rel)
    if (missing.isEmpty()) ok("critical expert-pack surfaces exist", "${required.size} files") else fail("critical expert-pack surfaces exist", missing.joinToString(", "))
    val retired = repo.resolve("kubejs/server_scripts/40_recipe_add/60_acid_vat_deposit_slurries.js")
    if (!exists(retired)) ok("retired Acid Vat deposit slurry script is absent") else fail("retired Acid Vat deposit slurry script is absent", rel(retired))
}

fun testQuestBook() {
    val chapterDir = repo.resolve("config/ftbquests/quests/chapters")
    val questFiles = walk(chapterDir) { it.toString().endsWith(".snbt") }
    metrics["questChapters"] = questFiles.size
    val groupFile = repo.resolve("config/ftbquests/quests/chapter_groups.snbt")
    if (questFiles.isEmpty() && !exists(groupFile)) {
        ok("quest book is intentionally empty", "0 chapters and no chapter groups")
        skip("quest dependency validation", "quest book removed")
        return
    }
    val groupText = if (exists(groupFile)) read(groupFile) else ""
    val groupIds = Regex("""\{id:"?([0-9A-Fa-f]{16})"?""").findAll(groupText).map { it.groupValues[1].uppercase(Locale.ROOT) }.toSet()
    val badGroupRefs = mutableListOf<String>()
    val tierTitleLabels = mutableListOf<String>()
    for (file in questFiles) {
        val text = read(file)
        val group = Regex("""^\s*group:\s*"([^"]*)"""", setOf(RegexOption.MULTILINE)).find(text)?.groupValues?.get(1).orEmpty()
        val title = Regex("""^\s*title:\s*"([^"]*)"""", setOf(RegexOption.MULTILINE)).find(text)?.groupValues?.get(1).orEmpty()
        if (group.isBlank() || group.uppercase(Locale.ROOT) !in groupIds) badGroupRefs += "${file.fileName} -> ${if (group.isBlank()) "<empty>" else group}"
        if (Regex("""^(Copper|Iron|Brass|Gold|Platinum) Tier\b""").containsMatchIn(title)) tierTitleLabels += "${file.fileName} -> $title"
    }
    if (groupIds.isEmpty() && badGroupRefs.size == questFiles.size) ok("all chapters are assigned to existing chapter groups", "chapter groups intentionally unused")
    else if (badGroupRefs.isEmpty()) ok("all chapters are assigned to existing chapter groups", "${questFiles.size} chapters") else fail("all chapters are assigned to existing chapter groups", badGroupRefs.joinToString("\n"))
    if (tierTitleLabels.isEmpty()) ok("chapter titles do not duplicate chapter group labels") else fail("chapter titles do not duplicate chapter group labels", tierTitleLabels.joinToString("\n"))
    val validDumpItems = loadQuestDumpItemIds()
    if (validDumpItems == null) {
        missingRuntimeEvidence("completionist quest item validity", repo.resolve("generated/runtime-dumps/registries.json").toString())
        return
    }
    val validDumpEnchantments = loadQuestDumpEnchantments()
    if (validDumpEnchantments == null) {
        missingRuntimeEvidence("completionist enchantment validity", repo.resolve("generated/runtime-dumps/kubejs-config/full_recipe_index_manifest.json").toString())
        return
    }
    val validDumpEffects = loadQuestDumpEffects(validDumpItems)
    if (validDumpEffects == null) {
        missingRuntimeEvidence("completionist effect validity", repo.resolve("server-instance/kubejs/config/food_effect_source_catalog.json").toString())
        return
    }
    val burntCoverageCategories = loadBurntCoverageCategories()
    if (burntCoverageCategories == null) {
        missingRuntimeEvidence("completionist plant solidity validity", repo.resolve("generated/runtime-dumps/burnt-coverage-current-covered.tsv").toString())
        return
    }
    val badQuestItems = mutableListOf<String>()
    val badEnchantments = mutableListOf<String>()
    val badEffects = mutableListOf<String>()
    val badPlantEntries = mutableListOf<String>()
    val seenEnchantments = mutableSetOf<String>()
    val seenEffects = mutableSetOf<String>()
    for (file in questFiles.filter { it.fileName.toString().startsWith("completionist_") }) {
        for (quest in parseQuestBlocks(file)) {
            val questTitle = quest.title.ifBlank { file.fileName.toString() }
            for (itemId in quest.items) {
                if (itemId !in validDumpItems) badQuestItems += "${file.fileName}: $questTitle -> $itemId"
                if (file.fileName.toString() == "completionist_plants.snbt" && !isPlantCollectionCandidate(itemId, questTitle, burntCoverageCategories)) {
                    badPlantEntries += "${file.fileName}: $questTitle -> $itemId"
                }
            }
            if (file.fileName.toString() == "completionist_effects.snbt" && questTitle.startsWith("All Effects: ")) {
                val effectTitle = questTitle.removePrefix("All Effects: ").trim()
                val expectedSources = validDumpEffects[effectTitle]
                if (expectedSources == null) {
                    badEffects += "${file.fileName}: unknown $questTitle"
                } else {
                    seenEffects += effectTitle
                    val actualSources = quest.items
                    if (actualSources.isEmpty()) badEffects += "${file.fileName}: $questTitle has no item tasks"
                    else if (actualSources != expectedSources) badEffects += "${file.fileName}: $questTitle -> ${actualSources.joinToString(", ")} expected ${expectedSources.joinToString(", ")}"
                }
            }
            if (file.fileName.toString() == "completionist_enchantments.snbt" && questTitle.startsWith("All Enchantments: ")) {
                val enchantmentTitle = questTitle.removePrefix("All Enchantments: ").trim()
                val matchedId = validDumpEnchantments.entries.find { it.value == enchantmentTitle }?.key
                if (matchedId == null) badEnchantments += "${file.fileName}: $questTitle"
                else if (!seenEnchantments.add(matchedId)) badEnchantments += "${file.fileName}: duplicate $questTitle"
            }
        }
    }
    if (badQuestItems.isEmpty()) ok("completionist quest item tasks resolve in current dumps", "${questFiles.count { it.fileName.toString().startsWith("completionist_") }} chapters")
    else fail("completionist quest item tasks resolve in current dumps", badQuestItems.take(120).joinToString("\n"))
    val missingEffects = validDumpEffects.keys.filter { it !in seenEffects }.sorted()
    if (badEffects.isEmpty() && missingEffects.isEmpty()) ok("completionist effect quests match current dump-backed source items", "${seenEffects.size} effects")
    else fail("completionist effect quests match current dump-backed source items", (badEffects + missingEffects.map { "missing quest for $it" }).take(120).joinToString("\n"))
    if (badPlantEntries.isEmpty()) ok("completionist plant quests exclude solid block derivatives", "completionist_plants.snbt")
    else fail("completionist plant quests exclude solid block derivatives", badPlantEntries.take(120).joinToString("\n"))
    val missingEnchantments = validDumpEnchantments.filterKeys { it !in seenEnchantments }.values.sorted()
    if (badEnchantments.isEmpty() && missingEnchantments.isEmpty()) ok("completionist enchantment quests match current dumps", "${seenEnchantments.size} enchantments")
    else fail("completionist enchantment quests match current dumps", (badEnchantments + missingEnchantments.map { "missing quest for $it" }).take(120).joinToString("\n"))
}

fun loadQuestDumpItemIds(): Set<String>? {
    val resourceLocationPattern = Regex("""^[a-z0-9_.-]+:[a-z0-9/._-]+$""")
    fun isValidResourceLocation(id: String): Boolean = resourceLocationPattern.matches(id)
    val registriesPath = repo.resolve("generated/runtime-dumps/registries.json")
    if (exists(registriesPath)) {
        val registries = jsonObject(readJson(registriesPath))
        val items = jsonObject(registries["items"]).keys.filter(::isValidResourceLocation).toSet()
        if (items.isNotEmpty()) return items
    }
    return null
}

fun loadQuestDumpEnchantments(): Map<String, String>? {
    val manifestPath = repo.resolve("generated/runtime-dumps/kubejs-config/full_recipe_index_manifest.json")
    if (!exists(manifestPath)) return null
    val manifest = jsonObject(readJson(manifestPath))
    val chunkCount = jsonInt(manifest["chunkCount"]) ?: return null
    val pattern = jsonString(manifest["pattern"]) ?: "full_recipe_index_0000.json"
    val enchantments = linkedMapOf<String, String>()
    for (i in 0 until chunkCount) {
        val chunkName = pattern.replace(Regex("""\d{4}(?=\.json$)"""), i.toString().padStart(4, '0'))
        val chunkPath = repo.resolve("generated/runtime-dumps/kubejs-config").resolve(chunkName)
        if (!exists(chunkPath)) continue
        val chunk = jsonObject(readJson(chunkPath))
        for (recipe in jsonArray(chunk["recipes"]).map(::jsonObject)) {
            if (jsonString(recipe["type"]) != "ars_nouveau:enchantment") continue
            val payload = jsonObject(parseJson(jsonString(recipe["json"]) ?: continue))
            val enchantmentId = jsonString(payload["enchantment"]) ?: continue
            enchantments[enchantmentId] = humanizeId(enchantmentId)
        }
    }
    return enchantments
}

fun loadQuestDumpEffects(validItems: Set<String>): Map<String, List<String>>? {
    val path = repo.resolve("server-instance/kubejs/config/food_effect_source_catalog.json")
    if (!exists(path)) return null
    val rootObject = jsonObject(readJson(path))
    val effects = jsonArray(rootObject["effects"])
    val byTitle = linkedMapOf<String, List<String>>()
    for (entry in effects.map(::jsonObject)) {
        val effectId = jsonString(entry["effect"]) ?: continue
        val title = humanizeId(effectId)
        val preferredSources = jsonArray(entry["preferredSources"]).mapNotNull(::jsonString)
        val topFoods = jsonArray(entry["topFoods"]).map(::jsonObject).mapNotNull { jsonString(it["id"]) }
        val sources = (preferredSources + topFoods).distinct().filter { it in validItems }.take(3)
        if (sources.isNotEmpty()) byTitle[title] = sources
    }
    return byTitle
}

fun testWaresAndTrades() {
    val waresFiles = walk(repo.resolve("kubejs/data/wares/loot_tables")) { it.toString().endsWith(".json") }
    if (waresFiles.isEmpty()) return fail("Wares contract loot tables exist", "no kubejs/data/wares loot tables found")
    val emeraldWares = mutableListOf<String>()
    val coinWares = mutableListOf<String>()
    for (file in waresFiles) {
        val text = read(file)
        if ("minecraft:emerald" in text) emeraldWares += rel(file)
        for (coin in coinItems) if (coin in text) coinWares += "${rel(file)} -> $coin"
    }
    if (emeraldWares.isEmpty()) ok("Wares contracts do not use emerald currency", "${waresFiles.size} tables") else fail("Wares contracts do not use emerald currency", emeraldWares.joinToString("\n"))
    if (coinWares.isNotEmpty()) ok("Wares contracts contain Create Deco coin currency", "${coinWares.map { it.substringBefore(" -> ") }.distinct().size} tables") else fail("Wares contracts contain Create Deco coin currency", "no coin entries found")
}

fun testLootData() {
    val repoLoot = walk(repo.resolve("kubejs/data")) { "${Path.of("loot_tables")}" in it.toString() && it.toString().endsWith(".json") }
    val bad = mutableListOf<String>()
    repoLoot.forEach { try { readJson(it) } catch (error: Exception) { bad += "${rel(it)}: ${error.message}" } }
    if (bad.isEmpty()) ok("repo loot table JSON parses", "${repoLoot.size} tables") else fail("repo loot table JSON parses", bad.take(40).joinToString("\n"))
    val coinTables = mutableListOf<String>()
    val emeraldTables = mutableListOf<String>()
    for (file in repoLoot) {
        val text = read(file)
        if (coinItems.any(text::contains)) coinTables += rel(file)
        if ("minecraft:emerald" in text) emeraldTables += rel(file)
    }
    if (coinTables.size >= 20) ok("repo loot tables inject many coin sources", "${coinTables.size} tables") else fail("repo loot tables inject many coin sources", "${coinTables.size} tables")
    if (emeraldTables.isEmpty()) ok("repo loot tables contain no direct emerald loot") else finding("repo loot tables still contain emeralds", emeraldTables.take(40).joinToString("\n"), "SHOULD")
}

fun loadGeneratedRecipes(): Pair<Map<String, Any?>, List<Map<String, Any?>>>? {
    val manifestPath = runtimeGeneratedConfigFile("full_recipe_index_manifest.json") ?: return null
    val manifest = jsonObject(readJson(manifestPath))
    val recipes = mutableListOf<Map<String, Any?>>()
    val chunkCount = jsonInt(manifest["chunkCount"]) ?: 0
    val chunkRoot = manifestPath.parent
    for (i in 0 until chunkCount) {
        val chunkPath = chunkRoot.resolve("full_recipe_index_${i.toString().padStart(4, '0')}.json")
        if (!exists(chunkPath)) {
            fail("generated recipe chunk exists", rel(chunkPath))
            continue
        }
        val chunk = jsonObject(readJson(chunkPath))
        recipes += jsonArray(chunk["recipes"]).map(::jsonObject)
    }
    return manifest to recipes
}

data class OwnedTag(val path: Path, val replace: Boolean, val values: List<String>)

fun loadOwnedTag(kind: String, name: String): OwnedTag? {
    val path = repo.resolve("kubejs/data/minecraft/tags/$kind/$name.json")
    if (!exists(path)) return null
    val root = jsonObject(readJson(path))
    return OwnedTag(
        path = path,
        replace = jsonBool(root["replace"]) ?: false,
        values = unique(jsonArray(root["values"]).mapNotNull(::jsonString)),
    )
}

fun loadRuntimeTagValues(kind: String, tag: String): List<String>? {
    val path = runtimeTagGraphFile() ?: return null
    val root = jsonObject(readJson(path))
    val section = when (kind) {
        "item" -> "item_tags"
        "block" -> "block_tags"
        "fluid" -> "fluid_tags"
        "entity" -> "entity_tags"
        else -> return null
    }
    return jsonArray(jsonObject(root[section])[tag]).mapNotNull(::jsonString)
}

fun recipeWindow(text: String, id: String, windowChars: Int = 6000): String? {
    val anchor = Regex(""""id"\s*:\s*"${Regex.escape(id)}"\s*,\s*"type"\s*:""")
    val match = anchor.find(text) ?: return null
    val start = match.range.first
    return text.substring(start, minOf(text.length, start + windowChars))
}

fun sourceContainsAll(path: Path, needles: List<String>): Boolean {
    if (!exists(path)) return false
    val text = read(path)
    return needles.all(text::contains)
}

fun testRuntimeCoreTagRegressions() {
    val riskyPairs = listOf(
        "logs",
        "logs_that_burn",
        "wooden_buttons",
        "wooden_slabs",
        "wooden_doors",
        "wooden_pressure_plates",
        "wooden_stairs",
        "wooden_trapdoors",
        "fence_gates",
        "wooden_fences",
    )
    val recipeGraphPath = runtimeRecipeGraphFile()
    if (recipeGraphPath == null) return missingRuntimeEvidence("runtime core tag regression validation", retainedRuntimeDumpDir.resolve("recipes.json").toString())
    val recipeGraph = read(recipeGraphPath)
    metrics["runtimeCoreTagRecipeGraph"] = mapOf(
        "path" to recipeGraphPath.toString(),
        "sizeBytes" to Files.size(recipeGraphPath),
    )

    val runtimeTagConsumerCounts = linkedMapOf<String, Int>()
    val pairMismatches = mutableListOf<String>()
    val missingItemTags = mutableListOf<String>()
    val badReplaceModes = mutableListOf<String>()

    for (tag in riskyPairs) {
        val blockTag = loadOwnedTag("blocks", tag)
        val itemTag = loadOwnedTag("items", tag)
        val runtimeConsumers = Regex(""""tag"\s*:\s*"minecraft:${Regex.escape(tag)}"""").findAll(recipeGraph).count()
        runtimeTagConsumerCounts[tag] = runtimeConsumers
        if (runtimeConsumers <= 0) continue
        if (blockTag == null) {
            pairMismatches += "$tag missing owned block tag"
            continue
        }
        if (itemTag == null) {
            missingItemTags += "$tag -> missing ${rel(repo.resolve("kubejs/data/minecraft/tags/items/$tag.json"))} with $runtimeConsumers runtime consumers"
            continue
        }
        if (blockTag.replace) badReplaceModes += "${rel(blockTag.path)} should use replace=false"
        if (itemTag.replace) badReplaceModes += "${rel(itemTag.path)} should use replace=false"
        val missingFromItem = blockTag.values.filterNot(itemTag.values::contains)
        val extraInItem = itemTag.values.filterNot(blockTag.values::contains)
        if (missingFromItem.isNotEmpty() || extraInItem.isNotEmpty()) {
            pairMismatches += buildString {
                append(tag)
                if (missingFromItem.isNotEmpty()) append(" missing-from-item=${missingFromItem.take(8)}")
                if (extraInItem.isNotEmpty()) append(" extra-in-item=${extraInItem.take(8)}")
            }
        }
    }

    metrics["runtimeCoreTagConsumers"] = runtimeTagConsumerCounts
    if (missingItemTags.isEmpty()) ok("runtime risky core tags have item-tag counterparts", "${runtimeTagConsumerCounts.filterValues { it > 0 }.size} tags with runtime item-tag consumers")
    else fail("runtime risky core tags have item-tag counterparts", missingItemTags.joinToString("\n"))
    if (pairMismatches.isEmpty()) ok("runtime risky core tag block/item membership stays aligned")
    else fail("runtime risky core tag block/item membership stays aligned", pairMismatches.joinToString("\n"))
    if (badReplaceModes.isEmpty()) ok("owned risky core tags use delta ownership") else fail("owned risky core tags use delta ownership", badReplaceModes.joinToString("\n"))

    val genericSourceChecks = listOf(
        Triple(repo.resolve("kubejs/server_scripts/30_recipe_replace/135_recipe_graph_closure.js"), listOf("create:linked_controller", "#minecraft:wooden_buttons"), "linked_controller retains wooden button gate"),
        Triple(repo.resolve("kubejs/server_scripts/30_recipe_replace/135_recipe_graph_closure.js"), listOf("create:cart_assembler", "#minecraft:logs"), "cart_assembler retains log gate"),
        Triple(repo.resolve("kubejs/server_scripts/30_recipe_replace/150_integrated_deferred_mod_gates.js"), listOf("procedural_bouquets:bouquet_grid", "#minecraft:wooden_slabs"), "bouquet_grid retains wooden slab gate"),
    )
    val missingGenericSources = genericSourceChecks.filterNot { (path, needles, _) -> sourceContainsAll(path, needles) }
    if (missingGenericSources.isEmpty()) ok("representative authored generic core-tag consumers remain in source")
    else fail(
        "representative authored generic core-tag consumers remain in source",
        missingGenericSources.joinToString("\n") { (path, needles, label) -> "$label missing in ${rel(path)} -> ${needles.joinToString(", ")}" }
    )

    val genericRuntimeChecks = listOf(
        Triple("minecraft:crafting_table", listOf(""""tag": "minecraft:planks""""), "crafting table still accepts #minecraft:planks"),
        Triple("create:crafting/appliances/linked_controller", listOf(""""tag": "minecraft:wooden_buttons""""), "linked controller still consumes #minecraft:wooden_buttons"),
        Triple("procedural_bouquets:bouquet_grid", listOf(""""tag": "minecraft:wooden_slabs""""), "runtime generic slab consumer still exists"),
    )
    val missingGenericRuntime = genericRuntimeChecks.mapNotNull { (id, needles, label) ->
        val window = recipeWindow(recipeGraph, id) ?: return@mapNotNull "$label missing recipe $id"
        if (needles.all(window::contains)) null else "$label missing expected markers for $id"
    }
    if (missingGenericRuntime.isEmpty()) ok("representative runtime generic core-tag consumers remain present")
    else fail("representative runtime generic core-tag consumers remain present", missingGenericRuntime.joinToString("\n"))

    recipeWindow(recipeGraph, "minecraft:crafting_table")?.let { window ->
        val craftingProblems = mutableListOf<String>()
        if (!window.contains(""""tag": "minecraft:planks"""")) craftingProblems += "missing #minecraft:planks ingredient"
        if (window.contains(""""item": "natures_spirit:mahogany_planks"""")) craftingProblems += "collapsed to natures_spirit:mahogany_planks item"
        if (craftingProblems.isEmpty()) ok("crafting table recipe keeps generic plank ingredient")
        else fail("crafting table recipe keeps generic plank ingredient", craftingProblems.joinToString(", "))
    } ?: fail("crafting table recipe keeps generic plank ingredient", "missing minecraft:crafting_table in $recipeGraphPath")

    val plankItems = loadRuntimeTagValues("item", "minecraft:planks")
    if (plankItems == null) {
        missingRuntimeEvidence("runtime minecraft:planks item tag evidence", runtimeTagGraphFile()?.toString() ?: retainedRuntimeDumpDir.resolve("tags.json").toString())
    } else {
        val plankProblems = mutableListOf<String>()
        if ("minecraft:oak_planks" !in plankItems) plankProblems += "missing minecraft:oak_planks"
        if ("natures_spirit:mahogany_planks" !in plankItems) plankProblems += "missing natures_spirit:mahogany_planks"
        if (plankProblems.isEmpty()) ok("runtime minecraft:planks item tag keeps vanilla and mahogany planks", "${plankItems.size} values")
        else fail("runtime minecraft:planks item tag keeps vanilla and mahogany planks", plankProblems.joinToString(", "))
    }

    val techParentingText = read(techParentingPath)
    val genericWoodStorageIds = listOf(
        "machine_output:sophisticatedstorage:generic_wood_storage:sophisticatedstorage:barrel",
        "machine_output:sophisticatedstorage:generic_wood_storage:sophisticatedstorage:chest",
        "machine_output:sophisticatedstorage:generic_wood_storage:sophisticatedstorage:limited_barrel_1",
    )
    val missingGenericWoodStorage = genericWoodStorageIds.filterNot(techParentingText::contains)
    if (missingGenericWoodStorage.isEmpty()) ok("generic wood storage fallback routes remain registered")
    else fail("generic wood storage fallback routes remain registered", missingGenericWoodStorage.joinToString("\n"))

    val woodSpecificChecks = listOf(
        Triple("sophisticatedstorage:birch_barrel", listOf("minecraft:birch_planks", "minecraft:birch_slab", """{woodType:\"birch\"}"""), "birch barrel keeps birch inputs and birch woodType"),
        Triple("sophisticatedstorage:birch_chest", listOf("minecraft:birch_planks", """{woodType:\"birch\"}"""), "birch chest keeps birch inputs and birch woodType"),
        Triple("sophisticatedstorage:birch_limited_barrel_1", listOf("minecraft:birch_planks", "minecraft:birch_slab", """{woodType:\"birch\"}"""), "birch limited barrel keeps birch inputs and birch woodType"),
        Triple("sophisticatedstorage:oak_barrel", listOf("minecraft:oak_planks", "minecraft:oak_slab", """{woodType:\"oak\"}"""), "oak barrel keeps oak inputs and oak woodType"),
        Triple("sophisticatedstorage:cherry_chest", listOf("minecraft:cherry_planks", """{woodType:\"cherry\"}"""), "cherry chest keeps cherry inputs and cherry woodType"),
        Triple("sophisticatedstorage:mangrove_barrel", listOf("minecraft:mangrove_planks", "minecraft:mangrove_slab", """{woodType:\"mangrove\"}"""), "mangrove barrel keeps mangrove inputs and mangrove woodType"),
        Triple("create:oak_window", listOf("minecraft:oak_planks"), "oak window remains wood-specific"),
        Triple("create:cherry_window", listOf("minecraft:cherry_planks"), "cherry window remains wood-specific"),
        Triple("minecraft:mangrove_chest_boat", listOf("minecraft:mangrove_boat"), "mangrove chest boat remains wood-specific"),
    )
    val missingWoodSpecific = woodSpecificChecks.mapNotNull { (id, needles, label) ->
        val window = recipeWindow(recipeGraph, id) ?: return@mapNotNull "$label missing recipe $id"
        if (needles.all(window::contains)) null else "$label missing expected markers for $id"
    }
    if (missingWoodSpecific.isEmpty()) ok("representative wood-specific recipes remain specialized")
    else fail("representative wood-specific recipes remain specialized", missingWoodSpecific.joinToString("\n"))
}

fun testGeneratedRecipeGraph() {
    val loaded = try { loadGeneratedRecipes() } catch (error: Exception) { return fail("generated recipe index loads", error.message ?: error.javaClass.simpleName) }
    if (loaded == null) return missingRuntimeEvidence("generated recipe graph tests", generatedConfigDir.resolve("full_recipe_index_manifest.json").toString())
    val (manifest, recipes) = loaded
    metrics["generatedRecipes"] = recipes.size
    if (jsonString(manifest["schema"]) == "bc.recipe_audit.v2") ok("generated recipe dump has provenance metadata", "${jsonString(manifest["schema"])}, ${jsonString(manifest["recipeEventStage"])}, ${jsonString(manifest["generatedAt"])}") else fail("generated recipe dump has provenance metadata", "schema=${jsonString(manifest["schema"]) ?: "<missing>"}")
    if (recipes.size == (jsonInt(manifest["recipeCount"]) ?: -1)) ok("generated recipe chunks match manifest", "${recipes.size} recipes") else fail("generated recipe chunks match manifest", "${recipes.size}/${jsonInt(manifest["recipeCount"]) ?: -1}")
    val ids = mutableSetOf<String>()
    val dupes = mutableListOf<String>()
    val parseFailures = mutableListOf<String>()
    val outputs = mutableMapOf<String, MutableList<String>>()
    val undertiered = mutableListOf<String>()
    val (contractOutputTiers, contractScriptedOutputs) = loadContractOutputTiers()
    for (recipe in recipes) {
        val id = jsonString(recipe["id"]).orEmpty()
        if (!ids.add(id)) dupes += id
        val jsonText = jsonString(recipe["json"]).orEmpty()
        val parsed = try { readJson(Files.writeString(Files.createTempFile("bc-pack-test-", ".json"), jsonText)) } catch (error: Exception) {
            parseFailures += "$id: ${error.message}"
            null
        }
        if (parsed == null) continue
        val ingredients = extractItems(parsed)
        val outs = extractRecipeOutputs(parsed)
        val inferredTier = inferTierFromItems(ingredients)
        for (out in outs) {
            outputs.getOrPut(out) { mutableListOf() } += id
            val needed = intendedMachineTier(out)
            val contractTier = contractOutputTiers[out]
            val effectiveTier = if (contractTier != null && out in contractScriptedOutputs && tierAtLeast(contractTier, inferredTier)) contractTier else inferredTier
            if (needed != null && isMachineLike(out) && !tierAtLeast(effectiveTier, needed)) undertiered += "$id -> $out needs $needed, inferred $inferredTier"
        }
    }
    if (dupes.isEmpty()) ok("generated recipes have unique IDs") else fail("generated recipes have unique IDs", dupes.take(80).joinToString("\n"))
    if (parseFailures.isEmpty()) ok("generated recipe JSON parses") else fail("generated recipe JSON parses", parseFailures.take(80).joinToString("\n"))
    if (undertiered.isEmpty()) ok("generated machine-like outputs appear tier-gated") else finding("generated recipe graph has undertiered machine-like outputs", undertiered.take(120).joinToString("\n"), "MUST")
    val criticalOutputs = listOf("create:andesite_alloy", "create:andesite_casing", "create:water_wheel", "create:windmill_bearing", "tconstruct:grout", "kubejs:impossible_machine_casing", "bloodmagic:weakbloodorb")
    val missing = criticalOutputs.filterNot { outputs.containsKey(it) || contractOutputTiers.containsKey(it) }
    if (missing.isEmpty()) ok("critical outputs appear in generated recipe dump", "${criticalOutputs.size} outputs") else finding("critical outputs absent from generated recipe dump", missing.joinToString(", "), "MUST")
}

fun testGeneratedDumpLoot() {
    val lootRoot = generatedDumpDir.resolve("loot_tables")
    if (!exists(lootRoot)) return missingDataDumpEvidence("generated loot dump tests", "missing $lootRoot")
    val files = walk(lootRoot) { it.toString().endsWith(".json") }
    metrics["generatedLootTables"] = files.size
    val coinHits = mutableListOf<String>()
    val emeraldHits = mutableListOf<String>()
    val alwaysCoinTargets = listOf("minecraft/chests/abandoned_mineshaft", "minecraft/chests/desert_pyramid", "minecraft/chests/jungle_temple", "minecraft/chests/simple_dungeon", "minecraft/chests/shipwreck_treasure", "minecraft/chests/village/village_plains_house")
    for (file in files) {
        val relTable = lootRoot.relativize(file).toString().removeSuffix(".json").replace('\\', '/')
        val text = read(file)
        if (coinItems.any(text::contains)) coinHits += relTable
        if ("minecraft:emerald" in text) emeraldHits += relTable
    }
    val lowWorldLootMissingCoins = alwaysCoinTargets.filter { target -> coinHits.none { it.endsWith(target) || target in it } }
    if (coinHits.size >= 30) ok("generated loot contains broad coin coverage", "${coinHits.size} tables") else finding("generated loot coin coverage is thin", "${coinHits.size} tables", "MUST")
    if (lowWorldLootMissingCoins.isEmpty()) ok("common world loot tables include coin coverage") else finding("common world loot tables missing coin coverage", lowWorldLootMissingCoins.joinToString(", "), "MUST")
    if (emeraldHits.isEmpty()) ok("generated loot contains no emeralds") else finding("generated loot still contains emeralds", emeraldHits.take(80).joinToString("\n"), "SHOULD")
}

val logMonth = mapOf("Jan" to 0, "Feb" to 1, "Mar" to 2, "Apr" to 3, "May" to 4, "Jun" to 5, "Jul" to 6, "Aug" to 7, "Sep" to 8, "Oct" to 9, "Nov" to 10, "Dec" to 11)
fun parseLogTime(line: String): Long? {
    val match = Regex("""^\[(\d{2})([A-Za-z]{3})(\d{4}) (\d{2}):(\d{2}):(\d{2})\.(\d{3})]""").find(line) ?: return null
    val m = match.groupValues
    return java.time.ZonedDateTime.of(m[3].toInt(), logMonth[m[2]]!! + 1, m[1].toInt(), m[4].toInt(), m[5].toInt(), m[6].toInt(), m[7].toInt() * 1_000_000, java.time.ZoneOffset.UTC).toInstant().toEpochMilli()
}

fun testEngineWorldPerformanceLogs() {
    val logPath = latestRuntimeLog()
    if (!exists(logPath)) return missingRuntimeEvidence("engine/world performance log analysis", "missing $logPath")
    val text = read(logPath)
    val lines = text.lines()
    val logAgeMinutes = roundMs((System.currentTimeMillis() - Files.getLastModifiedTime(logPath).toMillis()) / 60000.0)
    val logMetrics = linkedMapOf<String, Any?>(
        "latestLog" to logPath.toString(),
        "latestLogAgeMinutes" to logAgeMinutes,
        "latestLogLines" to lines.size,
        "reachedIntegratedServer" to text.contains("Starting integrated minecraft server"),
        "reachedDedicatedServer" to Regex("""Done \([\d.]+s\)! For help, type "help"""").containsMatchIn(text),
        "startedServingLan" to text.contains("Started serving on"),
        "reachedInGame" to (text.contains("Started serving on") || text.contains("Time from main menu to in-game was") || Regex("""Done \([\d.]+s\)! For help, type "help"""").containsMatchIn(text)),
        "spawnPrepTimeMs" to null,
        "serverTickBehindWarnings" to 0,
        "maxTickBehindMs" to 0,
        "distantHorizonsIncompleteTasks" to 0,
        "emiTotalReloadMs" to null,
        "kubejsRecipeParseErrors" to 0,
        "kubejsFailedRecipeCount" to 0,
        "newestCrashReport" to null,
        "newestCrashReportAfterLatestLog" to false,
    )
    var lastStoppingServerAt: Long? = null
    var saveDimensionCounter = 0
    var countingSaveDimensions = false
    var worldSaveDurationMs: Long? = null
    for (line in lines) {
        val at = parseLogTime(line)
        Regex("""Time elapsed: (\d+) ms""").find(line)?.groupValues?.getOrNull(1)?.toIntOrNull()?.let { logMetrics["spawnPrepTimeMs"] = it }
        Regex("""Can't keep up!.*Running (\d+)ms or (\d+) ticks behind""").find(line)?.let {
            val ms = it.groupValues[1].toInt()
            logMetrics["serverTickBehindWarnings"] = (logMetrics["serverTickBehindWarnings"] as Int) + 1
            logMetrics["maxTickBehindMs"] = maxOf(logMetrics["maxTickBehindMs"] as Int, ms)
        }
        Regex("""World generator thread pool shutdown with \[(\d+)] incomplete tasks""").find(line)?.groupValues?.getOrNull(1)?.toIntOrNull()?.let {
            logMetrics["distantHorizonsIncompleteTasks"] = maxOf(logMetrics["distantHorizonsIncompleteTasks"] as Int, it)
        }
        Regex("""\[EMI] Reloaded EMI in (\d+)ms""").find(line)?.groupValues?.getOrNull(1)?.toIntOrNull()?.let { logMetrics["emiTotalReloadMs"] = it }
        if (line.contains("Stopping server") && at != null) { lastStoppingServerAt = at; saveDimensionCounter = 0; countingSaveDimensions = true }
        if (countingSaveDimensions && line.contains("Saving chunks for level 'ServerLevel")) saveDimensionCounter++
        if (countingSaveDimensions && line.contains("ThreadedAnvilChunkStorage: All dimensions are saved") && at != null) {
            worldSaveDurationMs = lastStoppingServerAt?.let { at - it }
            countingSaveDimensions = false
        }
    }
    val crashFiles = walk(instance.resolve("crash-reports")) { Regex("""crash-.*\.txt$""").matches(it.fileName.toString()) }
    val newestCrash = newestFile(crashFiles)
    if (newestCrash != null) {
        logMetrics["newestCrashReport"] = newestCrash.fileName.toString()
        logMetrics["newestCrashReportAfterLatestLog"] = Files.getLastModifiedTime(newestCrash).toMillis() > Files.getLastModifiedTime(logPath).toMillis()
    }
    val (hardScanOk, hardLogScanOutput) = scanHardFailuresInline(logPath, instance)
    metrics["engineWorld"] = logMetrics + mapOf("hardLogScanOk" to hardScanOk, "hardLogScan" to hardLogScanOutput)
    if (logAgeMinutes <= 1440) ok("latest engine log is recent", "$logAgeMinutes minutes old") else finding("latest engine log is stale", "$logAgeMinutes minutes old", "SHOULD")
    if (logMetrics["reachedIntegratedServer"] == true) ok("engine reached integrated server startup")
    else if (logMetrics["reachedDedicatedServer"] == true) ok("engine reached dedicated server startup")
    else fail("engine reached server startup", "missing integrated or dedicated startup marker")
    if (logMetrics["reachedInGame"] == true) ok("world became playable/servable") else finding("world became playable/servable", "missing in-game or dedicated-server markers", "MUST")
    val spawnPrep = logMetrics["spawnPrepTimeMs"] as Int?
    when {
        spawnPrep == null -> finding("spawn preparation time is measurable", "missing \"Time elapsed\" marker", "MUST")
        spawnPrep > 120000 -> fail("spawn preparation hard limit", "$spawnPrep ms > 120000 ms")
        spawnPrep > 60000 -> finding("spawn preparation budget exceeded", "$spawnPrep ms > 60000 ms", "SHOULD")
        else -> ok("spawn preparation budget", "$spawnPrep ms <= 60000 ms")
    }
    val tickWarnings = logMetrics["serverTickBehindWarnings"] as Int
    val maxTickBehind = logMetrics["maxTickBehindMs"] as Int
    when {
        tickWarnings > 20 || maxTickBehind > 30000 -> fail("server tick-behind hard limit", "$tickWarnings warnings, max $maxTickBehind ms")
        tickWarnings > 5 || maxTickBehind > 10000 -> finding("server tick-behind budget exceeded", "$tickWarnings warnings, max $maxTickBehind ms", "SHOULD")
        else -> ok("server tick-behind budget", "$tickWarnings warnings, max $maxTickBehind ms")
    }
    when {
        worldSaveDurationMs == null -> finding("world save duration is measurable", "missing shutdown save markers", "SHOULD")
        worldSaveDurationMs > 30000 -> fail("world save hard limit", "$worldSaveDurationMs ms > 30000 ms")
        worldSaveDurationMs > 10000 -> finding("world save budget exceeded", "$worldSaveDurationMs ms > 10000 ms", "SHOULD")
        else -> ok("world save budget", "$worldSaveDurationMs ms <= 10000 ms")
    }
    if (hardScanOk) ok("hard engine log failure scan") else fail("hard engine log failure scan", hardLogScanOutput.trim())
}

fun testDevDumpHealth() {
    val auditPath = repo.resolve("kubejs/server_scripts/90_dev_debug/10_recipe_audit_dumps.js")
    val text = if (exists(auditPath)) read(auditPath) else ""
    if (text.isBlank()) return fail("dev recipe dump script exists", rel(auditPath))
    listOf("full_recipe_index_manifest.json", "known_bypass_candidate_recipes.json", "valuable_material_usage_recipes.json", "progression_recipe_mentions.json").forEach {
        if (it !in text) fail("dev dump script emits expected artifact", it)
    }
    ok("dev dump script emits expected artifacts")
    val foodAuditPath = repo.resolve("kubejs/server_scripts/90_dev_debug/20_food_effect_audit_dumps.js")
    val foodText = if (exists(foodAuditPath)) read(foodAuditPath) else ""
    if (foodText.isBlank()) return fail("dev food effect dump script exists", rel(foodAuditPath))
    listOf("food_effect_index.json", "food_effect_summary.json", "FoodProperties").forEach {
        if (it !in foodText) fail("dev food effect dump script emits expected artifact", it)
    }
    ok("dev food effect dump script emits expected artifacts")
}

fun zipEntryNames(path: Path): List<String> =
    ZipFile(path.toFile()).use { zip -> zip.entries().asSequence().map { it.name }.toList() }

fun zipEntryText(path: Path, entryName: String): String? =
    ZipFile(path.toFile()).use { zip ->
        val entry = zip.getEntry(entryName) ?: return null
        zip.getInputStream(entry).bufferedReader().use { it.readText() }
    }

fun validateAdditivePlanksTag(label: String, root: Map<String, Any?>): List<String> {
    val problems = mutableListOf<String>()
    if (jsonBool(root["replace"]) != false) problems += "$label must set replace=false"
    val values = jsonArray(root["values"]).mapNotNull(::jsonString)
    if (values.isEmpty()) problems += "$label must list additive plank values"
    val vanillaValues = values.filter { namespace(it) == "minecraft" }
    if (vanillaValues.isNotEmpty()) problems += "$label must not restate vanilla plank values: ${vanillaValues.joinToString(", ")}"
    if ("natures_spirit:mahogany_planks" !in values) problems += "$label must keep natures_spirit:mahogany_planks"
    return problems
}

fun testPlankRegressionStaticAndExports() {
    val broadHexereiRewrites = mutableListOf<String>()
    for (file in walk(repo.resolve("kubejs/server_scripts")) { it.toString().endsWith(".js") }) {
        val text = read(file)
        if (Regex("""replaceInput\(\s*\{\s*}\s*,\s*['"]#?hexerei:mahogany_planks['"]""").containsMatchIn(text)) {
            broadHexereiRewrites += rel(file)
        }
    }
    if (broadHexereiRewrites.isEmpty()) ok("Hexerei mahogany plank rewrites are scoped")
    else fail("Hexerei mahogany plank rewrites are scoped", broadHexereiRewrites.joinToString("\n"))

    val sourcePlanksTags = mapOf(
        "items" to repo.resolve("kubejs/data/minecraft/tags/items/planks.json"),
        "blocks" to repo.resolve("kubejs/data/minecraft/tags/blocks/planks.json"),
    ).filterValues(::exists)
    val sourcePlanksProblems = mutableListOf<String>()
    val sourceValues = mutableMapOf<String, List<String>>()
    for ((kind, path) in sourcePlanksTags) {
        val root = jsonObject(readJson(path))
        sourcePlanksProblems += validateAdditivePlanksTag(rel(path), root)
        sourceValues[kind] = jsonArray(root["values"]).mapNotNull(::jsonString).sorted()
    }
    val itemValues = sourceValues["items"]
    val blockValues = sourceValues["blocks"]
    if (itemValues != null && blockValues != null && itemValues != blockValues) {
        sourcePlanksProblems += "item and block minecraft:planks additive values must match"
    }
    if (sourcePlanksProblems.isEmpty()) {
        ok("repo minecraft:planks tag additions are additive", "${sourcePlanksTags.size} tag file(s)")
    } else {
        fail("repo minecraft:planks tag additions are additive", sourcePlanksProblems.joinToString("\n"))
    }

    val exportsDir = repo.resolve("generated/exports")
    val releaseArchivePattern = Regex("""better-content-playtest-v[1-9][0-9]*-(curseforge|server)\.zip""")
    val exports = if (exists(exportsDir)) {
        Files.list(exportsDir).use { paths ->
            paths.filter { exists(it) && releaseArchivePattern.matches(it.fileName.toString()) }
                .sorted()
                .toList()
        }
    } else emptyList()
    if (exports.isEmpty()) {
        skip("export bundles keep minecraft:planks tag additions additive", "generated exports not present")
    } else {
        val pattern = Regex("""(^|/)kubejs/data/minecraft/tags/(items|blocks)/planks\.json$|(^|/)data/minecraft/tags/(items|blocks)/planks\.json$""")
        val exportProblems = mutableListOf<String>()
        for (archive in exports) {
            val matchingEntries = zipEntryNames(archive).filter { pattern.containsMatchIn(it) }
            if (sourcePlanksTags.isNotEmpty() && matchingEntries.isEmpty()) {
                exportProblems += "${rel(archive)} is missing restored minecraft:planks tag additions"
            }
            val archiveKinds = matchingEntries.mapNotNull {
                when {
                    it.endsWith("/items/planks.json") || it == "kubejs/data/minecraft/tags/items/planks.json" || it == "data/minecraft/tags/items/planks.json" -> "items"
                    it.endsWith("/blocks/planks.json") || it == "kubejs/data/minecraft/tags/blocks/planks.json" || it == "data/minecraft/tags/blocks/planks.json" -> "blocks"
                    else -> null
                }
            }.toSet()
            if (sourcePlanksTags.containsKey("items") && "items" !in archiveKinds) exportProblems += "${rel(archive)} is missing item planks additions"
            if (sourcePlanksTags.containsKey("blocks") && "blocks" !in archiveKinds) exportProblems += "${rel(archive)} is missing block planks additions"
            for (entry in matchingEntries) {
                val root = jsonObject(parseJson(zipEntryText(archive, entry) ?: "{}"))
                exportProblems += validateAdditivePlanksTag("${rel(archive)}:$entry", root)
            }
        }
        if (exportProblems.isEmpty()) ok("export bundles keep minecraft:planks tag additions additive", "${exports.size} archives checked")
        else fail("export bundles keep minecraft:planks tag additions additive", exportProblems.joinToString("\n"))
    }
}

fun testBcValidator(name: String, vararg command: String) {
    val result = runCommand("tools/bc", "internal", *command)
    if (result.exitCode == 0) ok(name, result.output.trim()) else fail(name, result.output.trim())
}

if (explicitInstance && !exists(instance)) {
    System.err.println("FAIL - explicitBC_INSTANCE exists: $instance")
    exitProcess(1)
}
Files.createDirectories(reportDir)

if (runtimeOnly) {
    skip("source contract validation profile", "runtime-only mode skips repo-wide source validators")
} else {
    runMeasured("JSON and JS syntax validation", ::testJsonAndSyntax)
    runMeasured("critical progression surfaces", ::testCriticalSurfaces)
    runMeasured("progression parenting and economy validation") { testBcValidator("progression parenting and economy contracts validate", "validate-player-progression-contracts") }
    runMeasured("pack contract validation") { testBcValidator("pack contract validates", "validate-pack-contract") }
    runMeasured("contract completeness classification") { testBcValidator("contract completeness is classified", "contract-completeness-report", "--check", "--no-write") }
    runMeasured("autonomous contract validation") { testBcValidator("autonomous contract validators pass", "validate-autonomous-contracts") }
    runMeasured("quest book validation", ::testQuestBook)
    runMeasured("Wares and villager trade validation", ::testWaresAndTrades)
    runMeasured("repo loot data validation", ::testLootData)
    runMeasured("generated recipe graph validation", ::testGeneratedRecipeGraph)
    runMeasured("generated loot dump validation", ::testGeneratedDumpLoot)
}
runMeasured("runtime core tag regression validation", ::testRuntimeCoreTagRegressions)
runMeasured("engine and world performance log analysis", ::testEngineWorldPerformanceLogs)
if (runtimeOnly) {
    skip("source asset and tooling validation profile", "runtime-only mode skips repo-wide asset/tool validators")
} else {
    runMeasured("Realistic Hands validation") { testBcValidator("Realistic Hands validates", "validate-realistic-hands") }
    runMeasured("KubeJS asset validation") { testBcValidator("KubeJS custom assets validate", "validate-kubejs-assets") }
    runMeasured("chemistry identity validation") { testBcValidator("chemistry identity matrix validates", "validate-chemistry-identity") }
    runMeasured("dev dump health validation", ::testDevDumpHealth)
    runMeasured("plank regression static validation", ::testPlankRegressionStaticAndExports)
}

metrics["performance"] = mapOf(
    "budgetsMs" to performanceBudgetsMs.mapValues { it.value["budget"] },
    "hardLimitsMs" to performanceBudgetsMs.mapValues { it.value["hard"] },
    "results" to performanceResults,
)

val summary = linkedMapOf<String, Any?>(
    "generatedAt" to Instant.now().toString(),
    "repo" to repo.toString(),
    "instance" to instance.toString(),
    "explicitInstance" to explicitInstance,
    "strictRuntime" to strictRuntime,
    "strictDataDumps" to strictDataDumps,
    "runtimeOnly" to runtimeOnly,
    "runtimeEvidenceClaim" to if (strictRuntime) "strict-runtime" else "opportunistic-runtime",
    "dataDumpEvidenceClaim" to if (strictDataDumps) "strict-vanilla-dump" else "opportunistic-vanilla-dump",
    "dataDumpEvidenceScope" to "vanilla /dump output under dump/data_raw, separate from KubeJS audit dumps under kubejs/config",
    "passes" to passes.size,
    "hardFailures" to hardFailures.size,
    "softFindings" to softFindings.size,
    "skips" to skips.size,
    "metrics" to metrics,
)

fun jsonEncode(value: Any?): String = when (value) {
    null -> "null"
    is String -> "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\""
    is Number, is Boolean -> value.toString()
    is Map<*, *> -> value.entries.joinToString(prefix = "{", postfix = "}") { jsonEncode(it.key.toString()) + ":" + jsonEncode(it.value) }
    is Iterable<*> -> value.joinToString(prefix = "[", postfix = "]") { jsonEncode(it) }
    else -> jsonEncode(value.toString())
}

val report = buildString {
    appendLine("# Automated Pack Test Report")
    appendLine()
    appendLine("Generated: ${summary["generatedAt"]}")
    appendLine()
    appendLine("Repo: `${summary["repo"]}`")
    appendLine()
    appendLine("Instance: `${summary["instance"]}`")
    appendLine()
    appendLine("Validation profile: `${if (runtimeOnly) "runtime-only" else "full-pack-suite"}`")
    appendLine()
    appendLine("Runtime evidence mode: `${if (strictRuntime) "strict" else "opportunistic"}`")
    appendLine()
    appendLine("Data dump evidence mode: `${if (strictDataDumps) "strict" else "opportunistic"}`")
    appendLine()
    appendLine("## Result")
    append(table(listOf(listOf("Class", "Count"), listOf("Passes", passes.size.toString()), listOf("Hard failures", hardFailures.size.toString()), listOf("Soft findings", softFindings.size.toString()), listOf("Skipped", skips.size.toString()))))
    appendLine("## Hard Failures")
    append(table(listOf(listOf("Test", "Detail")) + hardFailures.map { listOf(it.name, it.detail) }))
    appendLine("## Soft Findings")
    append(table(listOf(listOf("Rank", "Test", "Detail")) + softFindings.map { listOf(it.severity, it.name, it.detail) }))
    appendLine("## Passes")
    append(table(listOf(listOf("Test", "Detail")) + passes.map { listOf(it.name, it.detail) }))
    appendLine("## Skipped")
    append(table(listOf(listOf("Test", "Detail")) + skips.map { listOf(it.name, it.detail) }))
    appendLine("## Metrics")
    appendLine()
    appendLine("```json")
    appendLine(jsonEncode(metrics))
    appendLine("```")
}

Files.writeString(reportDir.resolve("automated_test_report.md"), report)
Files.writeString(reportDir.resolve("automated_test_summary.json"), jsonEncode(summary) + "\n")

if (hardFailures.isNotEmpty()) {
    System.err.println("\n${hardFailures.size} hard failure(s). See ${rel(reportDir.resolve("automated_test_report.md"))}")
    exitProcess(1)
}
println("\npack test suite passed with ${softFindings.size} soft finding(s). See ${rel(reportDir.resolve("automated_test_report.md"))}")

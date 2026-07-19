#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.security.MessageDigest
import kotlin.io.path.exists

val root = Paths.get("").toAbsolutePath().normalize()
val failures = mutableListOf<String>()
val findings = mutableListOf<String>()
val passes = mutableListOf<String>()

fun exists(relPath: String): Boolean = root.resolve(relPath).exists()
fun full(relPath: String): Path = root.resolve(relPath)
fun read(relPath: String): String = Files.readString(full(relPath))
fun readJson(relPath: String): Any? = parseJson(read(relPath))
fun ok(name: String, detail: String = "") {
    passes += name
    println("ok - $name${if (detail.isNotBlank()) " ($detail)" else ""}")
}
fun fail(name: String, detail: String) {
    failures += name
    System.err.println("FAIL - $name: $detail")
}
fun finding(name: String, detail: String, severity: String = "SHOULD") {
    findings += name
    System.err.println("$severity - $name: $detail")
}
fun walk(relRoot: String, predicate: (String) -> Boolean = { true }, out: MutableList<String> = mutableListOf()): List<String> {
    val rootPath = full(relRoot)
    if (!rootPath.exists()) return out
    Files.walk(rootPath).use { stream ->
        stream.filter { Files.isRegularFile(it) }.forEach {
            val rel = root.relativize(it).toString().replace('\\', '/')
            if (predicate(rel)) out.add(rel)
        }
    }
    return out
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
fun arraysEqual(a: List<String>, b: List<String>): Boolean = a == b
fun getByPath(value: Any?, keys: List<String>): Any? {
    var current = value
    for (key in keys) current = (current as? Map<*, *>)?.get(key)
    return current
}
fun parseIndex(indexText: String): List<Pair<String, String>> =
    Regex("""\[\[files\]\]\s+file = "([^"]+)"\s+hash = "([0-9a-f]+)"""").findAll(indexText).map { it.groupValues[1] to it.groupValues[2] }.toList()
fun countCodeFiles(absRoot: Path): Int {
    if (!absRoot.exists()) return 0
    Files.walk(absRoot).use { stream ->
        return stream.filter { Files.isRegularFile(it) && (it.fileName.toString().endsWith(".kt") || it.fileName.toString().endsWith(".java")) }.count().toInt()
    }
}
fun countTestFiles(absRoot: Path): Int = countCodeFiles(absRoot.resolve("src/test"))
fun jsonObject(value: Any?): Map<String, Any?> = value as? Map<String, Any?> ?: emptyMap()
fun jsonArray(value: Any?): List<Any?> = value as? List<Any?> ?: emptyList()
fun jsonString(value: Any?): String? = value as? String
fun jsonNumber(value: Any?): Number? = value as? Number

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
            val key = parseString(); skipWhitespace(); expect(':'); result[key] = parseValue(); skipWhitespace()
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
            skipWhitespace()
            result += parseValue(); skipWhitespace()
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
                    out.append(when (esc) {
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
                    })
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
        val raw = text.substring(start, index)
        return if (raw.contains('.')) raw.toDouble() else raw.toLong()
    }
    private fun parseLiteral(token: String, value: Any?): Any? { require(text.startsWith(token, index)); index += token.length; return value }
    private fun skipWhitespace() { while (index < text.length && text[index].isWhitespace()) index += 1 }
    private fun expect(ch: Char) { require(index < text.length && text[index] == ch) { "expected $ch" }; index += 1 }
    private fun peek(ch: Char): Boolean = index < text.length && text[index] == ch
}
fun parseJson(text: String): Any? = JsonParser(text).parse()

fun validateContainsRule(rule: Map<String, Any?>, owner: String) {
    val file = jsonString(rule["file"]) ?: return fail("${owner} marker file exists", "<missing file>")
    if (!exists(file)) return fail("${owner} marker file exists", file)
    val text = read(file)
    val missingAll = jsonArray(rule["all"]).mapNotNull(::jsonString).filterNot(text::contains)
    val anyNeedles = jsonArray(rule["any"]).mapNotNull(::jsonString)
    val anyHits = anyNeedles.isEmpty() || anyNeedles.any(text::contains)
    val presentAbsent = jsonArray(rule["absent"]).mapNotNull(::jsonString).filter(text::contains)
    if (missingAll.isNotEmpty() || !anyHits || presentAbsent.isNotEmpty()) {
        val parts = mutableListOf<String>()
        if (missingAll.isNotEmpty()) parts += "missing=${missingAll.joinToString(", ")}"
        if (!anyHits) parts += "none of any=${anyNeedles.joinToString(", ")}"
        if (presentAbsent.isNotEmpty()) parts += "forbidden=${presentAbsent.joinToString(", ")}"
        fail("${owner} markers hold in $file", parts.joinToString(" "))
    } else ok("${owner} markers hold in $file")
}

val contract = try {
    jsonObject(readJson("tools/pack_contract.json")).also { ok("pack contract parses", jsonString(it["schema"]) ?: "") }
} catch (error: Exception) {
    fail("pack contract parses", error.message ?: error.javaClass.simpleName)
    emptyMap()
}

fun validatePackVersions() {
    val pack = if (exists("pack.toml")) read("pack.toml") else ""
    if (pack.isBlank()) return fail("pack.toml exists", "missing pack.toml")
    val mc = Regex("""minecraft = "([^"]+)"""").find(pack)?.groupValues?.getOrNull(1)
    val forge = Regex("""forge = "([^"]+)"""").find(pack)?.groupValues?.getOrNull(1)
    if (mc == jsonString(jsonObject(contract["pack"])["minecraft"])) ok("Minecraft version contract matches pack.toml", mc ?: "") else fail("Minecraft version contract matches pack.toml", "${mc ?: "<missing>"} != ${jsonString(jsonObject(contract["pack"])["minecraft"])}")
    if (forge == jsonString(jsonObject(contract["pack"])["forge"])) ok("Forge version contract matches pack.toml", forge ?: "") else fail("Forge version contract matches pack.toml", "${forge ?: "<missing>"} != ${jsonString(jsonObject(contract["pack"])["forge"])}")
}

fun validateSourceSurface() {
    val sourceSurface = jsonObject(contract["sourceSurface"])
    val roots = jsonArray(sourceSurface["authoritativeRoots"]).mapNotNull(::jsonString)
    val missingRoots = roots.filterNot(::exists)
    if (missingRoots.isEmpty()) ok("authoritative source roots exist", "${roots.size} roots") else fail("authoritative source roots exist", missingRoots.joinToString(", "))
    val total = roots.sumOf { walk(it).size }
    val minTotal = jsonNumber(sourceSurface["minimumTotalFiles"])?.toInt() ?: 0
    if (total >= minTotal) ok("source surface minimum file count", "$total >= $minTotal") else fail("source surface minimum file count", "$total < $minTotal")
    for ((rootName, minValue) in jsonObject(sourceSurface["rootFileMinimums"])) {
        val count = walk(rootName).size
        val min = jsonNumber(minValue)?.toInt() ?: continue
        if (count >= min) ok("$rootName file count floor", "$count >= $min") else fail("$rootName file count floor", "$count < $min")
    }
    val minimums = jsonObject(sourceSurface["kubejsMinimums"])
    val jsCount = walk("kubejs", predicate = { it.endsWith(".js") }).size
    val jsonCount = walk("kubejs", predicate = { it.endsWith(".json") }).size
    val minJs = jsonNumber(minimums["js"])?.toInt() ?: 0
    val minJson = jsonNumber(minimums["json"])?.toInt() ?: 0
    if (jsCount >= minJs) ok("KubeJS JS surface floor", "$jsCount files") else fail("KubeJS JS surface floor", "$jsCount < $minJs")
    if (jsonCount >= minJson) ok("KubeJS JSON surface floor", "$jsonCount files") else fail("KubeJS JSON surface floor", "$jsonCount < $minJson")
    val expectedDocs = jsonArray(sourceSurface["livingDocs"]).mapNotNull(::jsonString)
    val actualDocs = walk("docs", predicate = { it.endsWith(".md") }).map { Paths.get(it).fileName.toString() }.sorted()
    val missingDocs = expectedDocs.filterNot(actualDocs::contains)
    val extraDocs = actualDocs.filterNot(expectedDocs::contains)
    if (missingDocs.isEmpty() && extraDocs.isEmpty()) ok("docs contain exactly the five living summaries", actualDocs.joinToString(", "))
    else fail("docs contain exactly the five living summaries", "missing=${missingDocs.joinToString(", ").ifBlank { "none" }} extra=${extraDocs.joinToString(", ").ifBlank { "none" }}")
}

fun validatePackwiz(): Map<String, String> {
    val packwiz = jsonObject(contract["packwiz"])
    val indexRel = jsonString(packwiz["indexFile"]) ?: "index.toml"
    val packRel = jsonString(packwiz["packFile"]) ?: "pack.toml"
    if (!exists(indexRel)) {
        fail("packwiz index exists", indexRel)
        return emptyMap()
    }
    val entries = parseIndex(read(indexRel))
    val indexByFile = entries.associate { it.first to it.second }
    val excludedHits = entries.filter { entry -> jsonArray(packwiz["excludedIndexPrefixes"]).mapNotNull(::jsonString).any { prefix -> entry.first.startsWith(prefix) } }
    if (excludedHits.isEmpty()) ok("packwiz index excludes generated/export/tool/runtime roots") else fail("packwiz index excludes generated/export/tool/runtime roots", excludedHits.take(20).joinToString(", ") { it.first })
    val missing = mutableListOf<String>()
    val badHashes = mutableListOf<String>()
    for ((file, hash) in entries) {
        if (!exists(file)) missing += file
        else {
            val actual = sha256(file)
            if (actual != hash) badHashes += "$file: $actual != $hash"
        }
    }
    if (missing.isEmpty()) ok("packwiz indexed files exist", "${entries.size} entries") else fail("packwiz indexed files exist", missing.take(40).joinToString("\n"))
    if (badHashes.isEmpty()) ok("packwiz indexed file hashes match", "${entries.size} entries") else fail("packwiz indexed file hashes match", badHashes.take(40).joinToString("\n"))
    if (exists(packRel)) {
        val declaredHash = Regex("""\[index][\s\S]*?hash = "([0-9a-f]+)"""").find(read(packRel))?.groupValues?.getOrNull(1)
        val actualHash = sha256(indexRel)
        if (declaredHash != null && declaredHash != actualHash) finding("pack.toml index hash is stale", "$declaredHash != $actualHash", jsonString(packwiz["hashDriftSeverity"]) ?: "SHOULD")
        else if (declaredHash != null) ok("pack.toml index hash matches index.toml")
    }
    return indexByFile
}

fun validateMods(indexByFile: Map<String, String>) {
    val mods = jsonObject(contract["mods"])
    val manifests = walk("mods", predicate = { it.endsWith(".pw.toml") })
    val jars = walk("mods", predicate = { it.endsWith(".jar") })
    val minManifest = jsonNumber(mods["minimumManifestCount"])?.toInt() ?: 0
    val minJar = jsonNumber(mods["minimumBundledJarCount"])?.toInt() ?: 0
    if (manifests.size >= minManifest) ok("pack manifest count floor", "${manifests.size} manifests") else fail("pack manifest count floor", "${manifests.size} < $minManifest")
    if (jars.size >= minJar) ok("bundled custom jar count floor", "${jars.size} jars") else fail("bundled custom jar count floor", "${jars.size} < $minJar")
    for (file in jsonArray(mods["requiredManifests"]).mapNotNull(::jsonString)) if (exists(file)) ok("required manifest exists: $file") else fail("required manifest exists", file)
    for (file in jsonArray(mods["requiredBundledJars"]).mapNotNull(::jsonString)) {
        when {
            !exists(file) -> fail("required bundled jar exists", file)
            !indexByFile.containsKey(file) -> fail("required bundled jar is indexed", file)
            else -> ok("required bundled jar exists and is indexed: $file")
        }
    }
    val forbidden = jsonArray(mods["forbiddenFiles"]).mapNotNull(::jsonString).filter(::exists)
    if (forbidden.isEmpty()) ok("forbidden retired/bypass files are absent") else fail("forbidden retired/bypass files are absent", forbidden.joinToString(", "))
}

fun validateProgressionCatalog() {
    val catalog = try { jsonObject(readJson("kubejs/config/bc_expert_graph_catalog.json")) } catch (error: Exception) {
        fail("expert graph catalog parses", error.message ?: error.javaClass.simpleName)
        return
    }
    val progression = jsonObject(contract["progression"])
    val tierOrder = jsonArray(catalog["tierOrder"]).mapNotNull(::jsonString)
    val expectedTierOrder = jsonArray(progression["tierOrder"]).mapNotNull(::jsonString)
    if (arraysEqual(tierOrder, expectedTierOrder)) ok("progression tier order matches contract", "${tierOrder.size} tiers") else fail("progression tier order matches contract", "$tierOrder != $expectedTierOrder")
    val coins = jsonArray(catalog["coinTiers"]).mapNotNull { jsonString(jsonObject(it)["item"]) }
    val expectedCoins = jsonArray(progression["coinTiers"]).mapNotNull(::jsonString)
    if (arraysEqual(coins, expectedCoins)) ok("coin tier order matches contract", "${coins.size} tiers") else fail("coin tier order matches contract", "$coins != $expectedCoins")
    val casings = jsonArray(catalog["machineTiers"]).mapNotNull { jsonString(jsonObject(it)["casing"]) }
    val expectedCasings = jsonArray(progression["machineCasings"]).mapNotNull(::jsonString)
    if (arraysEqual(casings, expectedCasings)) ok("machine casing ladder matches contract", "${casings.size} casings") else fail("machine casing ladder matches contract", "$casings != $expectedCasings")
    val bloodGates = jsonArray(catalog["bloodMagicTiers"]).mapNotNull { jsonString(jsonObject(it)["gate"]) }
    val missingGates = jsonArray(progression["bloodMagicGates"]).mapNotNull(::jsonString).filterNot(bloodGates::contains)
    if (missingGates.isEmpty()) ok("Blood Magic gate catalog covers contract", "${bloodGates.size} gates") else fail("Blood Magic gate catalog covers contract", missingGates.joinToString(", "))
}

fun validateSystems() {
    for (systemValue in jsonArray(contract["systems"])) {
        val system = jsonObject(systemValue)
        val owner = "system ${jsonString(system["id"]) ?: "UNKNOWN"}"
        val missingFiles = jsonArray(system["requiredFiles"]).mapNotNull(::jsonString).filterNot(::exists)
        val missingDirs = jsonArray(system["requiredDirs"]).mapNotNull(::jsonString).filterNot(::exists)
        if (missingFiles.isEmpty()) ok("$owner required files exist", "${jsonArray(system["requiredFiles"]).size} files") else fail("$owner required files exist", missingFiles.joinToString(", "))
        if (missingDirs.isEmpty()) ok("$owner required dirs exist", "${jsonArray(system["requiredDirs"]).size} dirs") else fail("$owner required dirs exist", missingDirs.joinToString(", "))
        for (rule in jsonArray(system["contains"]).map(::jsonObject)) validateContainsRule(rule, owner)
        for (jsonRuleValue in jsonArray(system["jsonMinimums"])) {
            val jsonRule = jsonObject(jsonRuleValue)
            val file = jsonString(jsonRule["file"]) ?: continue
            val pathKeys = jsonArray(jsonRule["path"]).mapNotNull(::jsonString)
            val minLength = jsonNumber(jsonRule["minLength"])?.toInt() ?: 0
            if (!exists(file)) {
                fail("$owner JSON minimum source exists", file)
                continue
            }
            try {
                val value = getByPath(readJson(file), pathKeys)
                val count = (value as? List<*>)?.size ?: -1
                if (count >= minLength) ok("$owner JSON minimum $file:${pathKeys.joinToString(".")}", "$count >= $minLength") else fail("$owner JSON minimum $file:${pathKeys.joinToString(".")}", "$count < $minLength")
            } catch (error: Exception) {
                fail("$owner JSON minimum parses", "$file: ${error.message ?: error.javaClass.simpleName}")
            }
        }
    }
}

fun validateValidationTiers() {
    for (tierValue in jsonArray(contract["validationTiers"])) {
        val tier = jsonObject(tierValue)
        val missing = jsonArray(tier["requiredTools"]).mapNotNull(::jsonString).filterNot(::exists)
        val tierId = jsonString(tier["id"]) ?: "UNKNOWN"
        if (missing.isEmpty()) ok("validation tier $tierId has required tools", jsonString(tier["name"]) ?: "") else fail("validation tier $tierId has required tools", missing.joinToString(", "))
    }
}

fun validateCustomMods(indexByFile: Map<String, String>) {
    val customMods = jsonObject(contract["customMods"])
    val sourceRoot = System.getenv("BC_CUSTOM_MODS_DIR") ?: jsonString(customMods["sourceRoot"])
    if (sourceRoot.isNullOrBlank() || !Paths.get(sourceRoot).exists()) return fail("custom mod source root exists", sourceRoot ?: "<missing>")
    ok("custom mod source root exists", sourceRoot)
    for (modValue in jsonArray(customMods["entries"])) {
        val mod = jsonObject(modValue)
        val modId = jsonString(mod["id"]) ?: "UNKNOWN"
        val modRoot = Paths.get(sourceRoot).resolve(jsonString(mod["repo"]) ?: "")
        if (!modRoot.exists()) {
            fail("custom mod source exists: $modId", modRoot.toString())
            continue
        }
        val hasBuild = modRoot.resolve("build.gradle").exists() || modRoot.resolve("build.gradle.kts").exists()
        if (hasBuild) ok("custom mod build file exists: $modId") else fail("custom mod build file exists: $modId", modRoot.toString())
        val codeFiles = countCodeFiles(modRoot.resolve("src"))
        val testFiles = countTestFiles(modRoot)
        val minCode = jsonNumber(mod["minCodeFiles"])?.toInt() ?: 0
        val minTest = jsonNumber(mod["minTestFiles"])?.toInt() ?: 0
        if (codeFiles >= minCode) ok("custom mod code surface: $modId", "$codeFiles >= $minCode") else fail("custom mod code surface: $modId", "$codeFiles < $minCode")
        if (testFiles >= minTest) ok("custom mod test surface: $modId", "$testFiles >= $minTest") else fail("custom mod test surface: $modId", "$testFiles < $minTest")
        val jar = jsonString(mod["jar"]) ?: ""
        if (!exists(jar)) fail("custom mod bundled jar exists: $modId", jar) else if (!indexByFile.containsKey(jar)) fail("custom mod bundled jar is indexed: $modId", jar) else ok("custom mod bundled jar exists and is indexed: $modId")
    }
}

validatePackVersions()
validateSourceSurface()
val indexByFile = validatePackwiz()
validateMods(indexByFile)
validateProgressionCatalog()
validateSystems()
validateValidationTiers()
validateCustomMods(indexByFile)

println("\npack contract audit: ${passes.size} pass(es), ${findings.size} finding(s), ${failures.size} hard failure(s)")
if (failures.isNotEmpty()) kotlin.system.exitProcess(1)

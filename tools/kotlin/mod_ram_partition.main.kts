#!/usr/bin/env kotlin

import java.io.ByteArrayOutputStream
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardCopyOption
import java.time.Instant
import java.util.ArrayDeque
import java.util.Comparator
import java.util.concurrent.TimeUnit
import java.util.jar.JarFile
import kotlin.io.path.createDirectories
import kotlin.io.path.exists
import kotlin.math.abs
import kotlin.math.max
import kotlin.system.exitProcess

data class Config(
    val basePort: Int,
    val runRoot: Path,
    val bootstrapMode: String,
    val seedStrategy: String,
    val settleSeconds: Int,
    val sampleCount: Int,
    val maxDepth: Int,
    val minDeltaMiB: Double,
    val minFreeGiB: Double,
    val keepRuns: Boolean,
    val resume: Boolean,
)

data class JarInfo(
    val fileName: String,
    val path: Path,
    val jarSizeMiB: Double,
    val weight: Double,
    val providedModIds: Set<String>,
    val mandatoryDeps: Set<String>,
)

data class PendingNode(
    val id: String,
    val mode: String,
    val depth: Int,
    val seedJarNames: List<String>,
)

data class SamplePoint(
    val index: Int,
    val vmRssMiB: Double,
    val vmHwmMiB: Double,
)

data class MeasurementResult(
    val status: String,
    val classifier: String?,
    val runtimeDir: String,
    val evidenceDir: String,
    val removedJarNames: List<String>,
    val forcedClosureJarNames: List<String>,
    val heapLimitGiB: Int,
    val medianVmRssMiB: Double?,
    val maxVmHwmMiB: Double?,
    val samples: List<SamplePoint>,
    val durationMs: Long,
    val ready: Boolean,
)

data class BaselineState(
    val epoch: Int,
    val heapLimitGiB: Int,
    val medianVmRssMiB: Double,
    val maxVmHwmMiB: Double,
    val evidenceDir: String,
)

data class NodeResult(
    val nodeId: String,
    val mode: String,
    val depth: Int,
    val seedJarNames: List<String>,
    val measuredRemovedJarNames: List<String>,
    val forcedClosureJarNames: List<String>,
    val status: String,
    val classifier: String?,
    val heapLimitGiB: Int,
    val baselineEpoch: Int?,
    val medianVmRssMiB: Double?,
    val deltaVmRssMiB: Double?,
    val evidenceDir: String,
    val runtimeDir: String,
    val durationMs: Long,
    val rerunOfNodeId: String? = null,
)

data class ResumeState(
    val mode: String,
    val baseline: BaselineState?,
    val completedResults: Int,
    val periodicBaselineChecks: Int,
    val lastMeasuredNodeId: String?,
)

val platformDependencyModIds = setOf("forge", "minecraft")

fun usage(message: String? = null): Nothing {
    if (message != null) System.err.println(message)
    System.err.println(
        "Usage: tools/bc test scenario mod_ram_partition [--port N] [--run-root PATH] [--bootstrap-mode always|once|never] [--seed-strategy bisect|smallest_islands] [--settle-seconds N] [--sample-count N] [--max-depth N] [--min-delta-mib N] [--min-free-gb N] [--keep-runs] [--resume]",
    )
    exitProcess(2)
}

fun parseConfig(args: Array<String>): Config {
    var basePort = System.getenv("BC_HARNESS_ACTUAL_PORT")?.toIntOrNull() ?: 25572
    var runRoot = System.getenv("BC_HARNESS_RUN_ROOT")?.takeIf(String::isNotBlank)?.let(Paths::get)
        ?: Paths.get(System.getProperty("user.home"), ".cache", "bc", "mod-ram-partition")
    var bootstrapMode = "once"
    var seedStrategy = "bisect"
    var settleSeconds = 60
    var sampleCount = 5
    var maxDepth = 6
    var minDeltaMiB = 128.0
    var minFreeGiB = 3.0
    var keepRuns = false
    var resume = false
    var index = 0
    while (index < args.size) {
        when (args[index]) {
            "--port" -> {
                basePort = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--port needs an integer")
                index += 2
            }
            "--run-root" -> {
                runRoot = Paths.get(args.getOrNull(index + 1) ?: usage("--run-root needs a path"))
                index += 2
            }
            "--bootstrap-mode" -> {
                bootstrapMode = args.getOrNull(index + 1) ?: usage("--bootstrap-mode needs always, once, or never")
                if (bootstrapMode !in setOf("always", "once", "never")) usage("invalid bootstrap mode: $bootstrapMode")
                index += 2
            }
            "--seed-strategy" -> {
                seedStrategy = args.getOrNull(index + 1) ?: usage("--seed-strategy needs bisect or smallest_islands")
                if (seedStrategy !in setOf("bisect", "smallest_islands")) usage("invalid seed strategy: $seedStrategy")
                index += 2
            }
            "--settle-seconds" -> {
                settleSeconds = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--settle-seconds needs an integer")
                index += 2
            }
            "--sample-count" -> {
                sampleCount = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--sample-count needs an integer")
                index += 2
            }
            "--max-depth" -> {
                maxDepth = args.getOrNull(index + 1)?.toIntOrNull() ?: usage("--max-depth needs an integer")
                index += 2
            }
            "--min-delta-mib" -> {
                minDeltaMiB = args.getOrNull(index + 1)?.toDoubleOrNull() ?: usage("--min-delta-mib needs a number")
                index += 2
            }
            "--min-free-gb" -> {
                minFreeGiB = args.getOrNull(index + 1)?.toDoubleOrNull() ?: usage("--min-free-gb needs a number")
                index += 2
            }
            "--keep-runs" -> {
                keepRuns = true
                index += 1
            }
            "--resume" -> {
                resume = true
                index += 1
            }
            "--help" -> usage()
            else -> usage("unknown argument: ${args[index]}")
        }
    }
    if (basePort <= 0 || settleSeconds <= 0 || sampleCount <= 0 || maxDepth < 0 || minDeltaMiB < 0.0 || minFreeGiB <= 0.0) usage("numeric arguments must be positive")
    return Config(
        basePort = basePort,
        runRoot = runRoot.toAbsolutePath().normalize(),
        bootstrapMode = bootstrapMode,
        seedStrategy = seedStrategy,
        settleSeconds = settleSeconds,
        sampleCount = sampleCount,
        maxDepth = maxDepth,
        minDeltaMiB = minDeltaMiB,
        minFreeGiB = minFreeGiB,
        keepRuns = keepRuns,
        resume = resume,
    )
}

fun islandWeight(island: Set<String>, weightsByJar: Map<String, Double>): Double = island.sumOf { weightsByJar[it] ?: 0.0 }

fun removableIslandsForStrategy(
    inventory: List<JarInfo>,
    retainedFoundationJarNames: Set<String>,
    adjacency: Map<String, Set<String>>,
    weightsByJar: Map<String, Double>,
    seedStrategy: String,
): List<Set<String>> {
    val removableSeeds = inventory.map { it.fileName }.filterNot { it in retainedFoundationJarNames }.ifEmpty { inventory.map { it.fileName } }
    val islands = connectedSeedGroups(removableSeeds.toSet(), adjacency)
    return when (seedStrategy) {
        "smallest_islands" -> islands.sortedWith(compareBy<Set<String>>({ it.size }, { islandWeight(it, weightsByJar) }, { it.sorted().joinToString(",") }))
        else -> islands.sortedByDescending { islandWeight(it, weightsByJar) }
    }
}

fun deleteTree(path: Path) {
    if (!Files.exists(path)) return
    Files.walk(path).use { stream ->
        stream.sorted(Comparator.reverseOrder()).forEach { Files.deleteIfExists(it) }
    }
}

fun ensureFreeSpace(path: Path, minFreeGiB: Double) {
    val target = (if (path.exists()) path else path.parent ?: path).toAbsolutePath().normalize()
    target.createDirectories()
    val usableGiB = target.toFile().usableSpace.toDouble() / (1024.0 * 1024.0 * 1024.0)
    if (usableGiB + 0.001 < minFreeGiB) {
        error(
            "run root has only %.2f GiB free, below required %.2f GiB: %s. Use --run-root on a larger filesystem, for example %s".format(
                usableGiB,
                minFreeGiB,
                target,
                Paths.get(System.getProperty("user.home"), ".cache", "bc-mod-ram-partition").toAbsolutePath().normalize(),
            ),
        )
    }
}

fun q(value: String?): String = if (value == null) "null" else "\"" + value
    .replace("\\", "\\\\")
    .replace("\"", "\\\"")
    .replace("\n", "\\n") + "\""

fun json(value: Any?): String = when (value) {
    null -> "null"
    is String -> q(value)
    is Boolean, is Int, is Long, is Double -> value.toString()
    is Number -> value.toString()
    is Map<*, *> -> value.entries.joinToString(prefix = "{", postfix = "}") { (key, entryValue) -> "${q(key.toString())}:${json(entryValue)}" }
    is Iterable<*> -> value.joinToString(prefix = "[", postfix = "]") { json(it) }
    else -> q(value.toString())
}

fun writeJson(path: Path, value: Any?) {
    path.parent?.createDirectories()
    Files.writeString(path, json(value) + "\n")
}

fun parseJson(text: String): Any? {
    class JsonParser(private val raw: String) {
        private var index = 0

        fun parse(): Any? {
            skipWhitespace()
            val value = parseValue()
            skipWhitespace()
            return value
        }

        private fun parseValue(): Any? {
            skipWhitespace()
            if (index >= raw.length) error("unexpected end of JSON")
            return when (val ch = raw[index]) {
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
            if (peek('}')) {
                index += 1
                return result
            }
            while (true) {
                skipWhitespace()
                val key = parseString()
                skipWhitespace()
                expect(':')
                result[key] = parseValue()
                skipWhitespace()
                when {
                    peek('}') -> {
                        index += 1
                        return result
                    }
                    peek(',') -> index += 1
                    else -> error("expected , or }")
                }
            }
        }

        private fun parseArray(): List<Any?> {
            val result = mutableListOf<Any?>()
            expect('[')
            skipWhitespace()
            if (peek(']')) {
                index += 1
                return result
            }
            while (true) {
                result += parseValue()
                skipWhitespace()
                when {
                    peek(']') -> {
                        index += 1
                        return result
                    }
                    peek(',') -> index += 1
                    else -> error("expected , or ]")
                }
            }
        }

        private fun parseString(): String {
            expect('"')
            val out = StringBuilder()
            while (index < raw.length) {
                val ch = raw[index++]
                when (ch) {
                    '"' -> return out.toString()
                    '\\' -> {
                        val esc = raw[index++]
                        out.append(
                            when (esc) {
                                '"', '\\', '/' -> esc
                                'b' -> '\b'
                                'f' -> '\u000C'
                                'n' -> '\n'
                                'r' -> '\r'
                                't' -> '\t'
                                'u' -> {
                                    val hex = raw.substring(index, index + 4)
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
            if (raw[index] == '-') index += 1
            while (index < raw.length && raw[index].isDigit()) index += 1
            if (index < raw.length && raw[index] == '.') {
                index += 1
                while (index < raw.length && raw[index].isDigit()) index += 1
            }
            val value = raw.substring(start, index)
            return if (value.contains('.')) value.toDouble() else value.toLong()
        }

        private fun parseLiteral(token: String, value: Any?): Any? {
            if (!raw.startsWith(token, index)) error("expected $token")
            index += token.length
            return value
        }

        private fun skipWhitespace() {
            while (index < raw.length && raw[index].isWhitespace()) index += 1
        }

        private fun expect(ch: Char) {
            if (index >= raw.length || raw[index] != ch) error("expected $ch")
            index += 1
        }

        private fun peek(ch: Char): Boolean = index < raw.length && raw[index] == ch
    }
    return JsonParser(text).parse()
}

fun jsonObject(value: Any?): Map<String, Any?> = value as? Map<String, Any?> ?: emptyMap()
fun jsonArray(value: Any?): List<Any?> = value as? List<Any?> ?: emptyList()
fun jsonString(value: Any?): String? = value as? String
fun jsonInt(value: Any?): Int? = when (value) {
    is Int -> value
    is Long -> value.toInt()
    is Double -> value.toInt()
    else -> null
}
fun jsonDouble(value: Any?): Double? = when (value) {
    is Double -> value
    is Long -> value.toDouble()
    is Int -> value.toDouble()
    else -> null
}
fun jsonBoolean(value: Any?): Boolean? = value as? Boolean

fun readJsonIfExists(path: Path): Any? = if (path.exists()) parseJson(Files.readString(path)) else null

fun runCommand(command: List<String>, workdir: Path, timeoutSeconds: Long = 900, extraEnv: Map<String, String> = emptyMap()): Pair<Int, String> {
    val process = ProcessBuilder(command)
        .directory(workdir.toFile())
        .redirectErrorStream(true)
        .apply { environment().putAll(extraEnv) }
        .start()
    val output = ByteArrayOutputStream()
    val reader = Thread {
        process.inputStream.use { it.copyTo(output) }
    }.apply {
        isDaemon = true
        start()
    }
    if (!process.waitFor(timeoutSeconds, TimeUnit.SECONDS)) {
        process.destroy()
        if (!process.waitFor(10, TimeUnit.SECONDS)) process.destroyForcibly()
        reader.join(10_000)
        return 124 to output.toString(Charsets.UTF_8)
    }
    reader.join(10_000)
    return process.exitValue() to output.toString(Charsets.UTF_8)
}

fun cloneRuntime(source: Path, destination: Path): Pair<Int, String> {
    deleteTree(destination)
    destination.parent?.createDirectories()
    return runCommand(listOf("cp", "-a", "--reflink=auto", "${source}/.", destination.toString()), source.parent ?: source)
}

fun setServerPort(path: Path, port: Int) {
    val lines = if (path.exists()) Files.readAllLines(path).toMutableList() else mutableListOf()
    val index = lines.indexOfFirst { it.startsWith("server-port=") }
    if (index >= 0) lines[index] = "server-port=$port" else lines += "server-port=$port"
    Files.writeString(path, lines.joinToString("\n", postfix = "\n"))
}

fun configureJvmArgs(path: Path, heapLimitGiB: Int) {
    val existing = if (path.exists()) Files.readAllLines(path).toMutableList() else mutableListOf()
    val output = mutableListOf<String>()
    var sawXms = false
    var sawXmx = false
    var sawNmt = false
    var sawUnlock = false
    var sawEncoding = false
    existing.forEach { line ->
        when {
            line.startsWith("-Xms") -> {
                output += "-Xms2G"
                sawXms = true
            }
            line.startsWith("-Xmx") -> {
                output += "-Xmx${heapLimitGiB}G"
                sawXmx = true
            }
            line.startsWith("-XX:NativeMemoryTracking=") -> {
                output += "-XX:NativeMemoryTracking=summary"
                sawNmt = true
            }
            line == "-XX:+UnlockDiagnosticVMOptions" -> {
                output += line
                sawUnlock = true
            }
            line == "-Dfile.encoding=UTF-8" -> {
                output += line
                sawEncoding = true
            }
            else -> output += line
        }
    }
    if (!sawXms) output += "-Xms2G"
    if (!sawXmx) output += "-Xmx${heapLimitGiB}G"
    if (!sawUnlock) output += "-XX:+UnlockDiagnosticVMOptions"
    if (!sawNmt) output += "-XX:NativeMemoryTracking=summary"
    if (!sawEncoding) output += "-Dfile.encoding=UTF-8"
    Files.writeString(path, output.filter { it.isNotBlank() }.joinToString("\n", postfix = "\n"))
}

fun parseModsToml(jar: Path): Pair<Set<String>, Set<String>> {
    val provided = linkedSetOf<String>()
    val deps = linkedSetOf<String>()
    JarFile(jar.toFile()).use { zip ->
        val entry = zip.getEntry("META-INF/mods.toml") ?: return provided to deps
        val lines = zip.getInputStream(entry).bufferedReader().readLines()
        var currentSection: String? = null
        var currentDependencyOwner: String? = null
        var currentDependencyTarget: String? = null
        var currentDependencyMandatory = false
        var currentDependencySide = "BOTH"
        fun flushDependency() {
            if (currentSection == "dependency" &&
                currentDependencyOwner != null &&
                currentDependencyTarget != null &&
                currentDependencyMandatory &&
                currentDependencySide.uppercase() != "CLIENT"
            ) {
                deps += currentDependencyTarget!!
            }
            currentDependencyTarget = null
            currentDependencyMandatory = false
            currentDependencySide = "BOTH"
        }
        lines.forEach { raw ->
            val line = raw.substringBefore('#').trim()
            when {
                line == "[[mods]]" -> {
                    flushDependency()
                    currentSection = "mods"
                    currentDependencyOwner = null
                }
                line.startsWith("[[dependencies.") && line.endsWith("]]") -> {
                    flushDependency()
                    currentSection = "dependency"
                    currentDependencyOwner = line.removePrefix("[[dependencies.").removeSuffix("]]").trim()
                }
                '=' in line -> {
                    val key = line.substringBefore('=').trim()
                    val value = line.substringAfter('=').trim().trim('"')
                    when {
                        currentSection == "mods" && key == "modId" && value.isNotBlank() -> provided += value
                        currentSection == "dependency" && key == "modId" -> currentDependencyTarget = value
                        currentSection == "dependency" && key == "mandatory" -> currentDependencyMandatory = value.equals("true", ignoreCase = true)
                        currentSection == "dependency" && key == "side" -> currentDependencySide = value
                    }
                }
            }
        }
        flushDependency()
    }
    return provided to deps
}

fun inspectJar(jar: Path): JarInfo {
    val (providedModIds, mandatoryDeps) = parseModsToml(jar)
    var totalEntries = 0
    var worldgenEntries = 0
    var dataJsonEntries = 0
    var configEntries = 0
    JarFile(jar.toFile()).use { zip ->
        val entries = zip.entries()
        while (entries.hasMoreElements()) {
            val entry = entries.nextElement()
            if (entry.isDirectory) continue
            totalEntries += 1
            val name = entry.name
            if (name.startsWith("data/") && name.endsWith(".json")) dataJsonEntries += 1
            if (name.contains("/worldgen/")) worldgenEntries += 1
            if (name.startsWith("META-INF/") || name.startsWith("config/")) configEntries += 1
        }
    }
    val sizeMiB = jar.toFile().length().toDouble() / (1024.0 * 1024.0)
    val weight = sizeMiB * 1024.0 + worldgenEntries * 6.0 + dataJsonEntries * 0.5 + totalEntries * 0.05 + configEntries * 0.5
    return JarInfo(
        fileName = jar.fileName.toString(),
        path = jar,
        jarSizeMiB = ((sizeMiB * 100.0).toInt() / 100.0),
        weight = weight,
        providedModIds = providedModIds,
        mandatoryDeps = mandatoryDeps,
    )
}

fun closureForSeed(
    seed: Set<String>,
    inventory: List<JarInfo>,
    providersByModId: Map<String, Set<String>>,
    retainedJarNames: Set<String>,
): Set<String> {
    val removed = seed.toMutableSet()
    var changed = true
    while (changed) {
        changed = false
        inventory.forEach { jar ->
            if (jar.fileName in removed) return@forEach
            val invalid = jar.mandatoryDeps.any { dep ->
                val providers = providersByModId[dep].orEmpty()
                providers.isNotEmpty() && providers.all { it in removed }
            }
            if (invalid && !(jar.fileName in retainedJarNames && jar.fileName !in seed)) {
                removed += jar.fileName
                changed = true
            }
        }
    }
    return removed
}

fun splitWeightedGroups(groups: List<Set<String>>, weightsByJar: Map<String, Double>): Pair<List<String>, List<String>> {
    val left = mutableListOf<String>()
    val right = mutableListOf<String>()
    var leftWeight = 0.0
    var rightWeight = 0.0
    groups.sortedByDescending { group -> group.sumOf { weightsByJar[it] ?: 0.0 } }.forEach { group ->
        val groupWeight = group.sumOf { weightsByJar[it] ?: 0.0 }
        if (leftWeight <= rightWeight) {
            left += group.sorted()
            leftWeight += groupWeight
        } else {
            right += group.sorted()
            rightWeight += groupWeight
        }
    }
    return left to right
}

fun buildJarDependencyAdjacency(
    inventory: List<JarInfo>,
    providersByModId: Map<String, Set<String>>,
): Map<String, Set<String>> {
    val adjacency = buildMap<String, MutableSet<String>> {
        inventory.forEach { jar -> getOrPut(jar.fileName) { linkedSetOf() } }
        inventory.forEach { consumer ->
            consumer.mandatoryDeps.forEach { dep ->
                if (dep in platformDependencyModIds) return@forEach
                providersByModId[dep].orEmpty().forEach { provider ->
                    if (provider == consumer.fileName) return@forEach
                    getOrPut(consumer.fileName) { linkedSetOf() } += provider
                    getOrPut(provider) { linkedSetOf() } += consumer.fileName
                }
            }
        }
    }
    return adjacency.mapValues { it.value.toSet() }
}

fun connectedSeedGroups(seed: Set<String>, adjacency: Map<String, Set<String>>): List<Set<String>> {
    val remaining = seed.toMutableSet()
    val groups = mutableListOf<Set<String>>()
    while (remaining.isNotEmpty()) {
        val start = remaining.first()
        val queue = ArrayDeque<String>()
        val group = linkedSetOf<String>()
        queue += start
        remaining -= start
        while (queue.isNotEmpty()) {
            val current = queue.removeFirst()
            group += current
            adjacency[current].orEmpty().forEach { neighbor ->
                if (neighbor in remaining) {
                    remaining -= neighbor
                    queue += neighbor
                }
            }
        }
        groups += group
    }
    return groups
}

fun splitConnectedSeedGroup(
    group: Set<String>,
    weightsByJar: Map<String, Double>,
    adjacency: Map<String, Set<String>>,
): Pair<List<String>, List<String>> {
    if (group.size <= 1) return group.toList() to emptyList()
    val ordered = group.sortedByDescending { weightsByJar[it] ?: 0.0 }
    val left = linkedSetOf(ordered.first())
    val right = linkedSetOf(ordered.drop(1).firstOrNull { it !in left } ?: return ordered to emptyList())
    var leftWeight = weightsByJar[left.first()] ?: 0.0
    var rightWeight = weightsByJar[right.first()] ?: 0.0
    val unassigned = group - left - right

    fun frontier(side: Set<String>, other: Set<String>, remaining: Set<String>): List<String> =
        side
            .flatMap { adjacency[it].orEmpty() }
            .filter { it in remaining && it !in other }
            .distinct()
            .sortedByDescending { weightsByJar[it] ?: 0.0 }

    val mutableUnassigned = unassigned.toMutableSet()
    while (mutableUnassigned.isNotEmpty()) {
        val chooseLeft = leftWeight <= rightWeight
        val target = if (chooseLeft) left else right
        val other = if (chooseLeft) right else left
        val candidates = frontier(target, other, mutableUnassigned)
        val next = candidates.firstOrNull() ?: mutableUnassigned.maxByOrNull { weightsByJar[it] ?: 0.0 }!!
        if (chooseLeft) {
            left += next
            leftWeight += weightsByJar[next] ?: 0.0
        } else {
            right += next
            rightWeight += weightsByJar[next] ?: 0.0
        }
        mutableUnassigned -= next
    }
    return left.toList() to right.toList()
}

fun splitSeeds(seed: List<String>, weightsByJar: Map<String, Double>, adjacency: Map<String, Set<String>>): Pair<List<String>, List<String>> {
    if (seed.size <= 1) return seed to emptyList()
    val groups = connectedSeedGroups(seed.toSet(), adjacency)
    if (groups.size > 1) return splitWeightedGroups(groups, weightsByJar)
    return splitConnectedSeedGroup(groups.single(), weightsByJar, adjacency)
}

fun median(values: List<Double>): Double {
    val sorted = values.sorted()
    return if (sorted.size % 2 == 1) sorted[sorted.size / 2]
    else (sorted[sorted.size / 2 - 1] + sorted[sorted.size / 2]) / 2.0
}

fun readProcStatusMiB(pid: Long): Pair<Double, Double>? {
    val path = Paths.get("/proc/$pid/status")
    if (!path.exists()) return null
    val text = Files.readString(path)
    val rss = Regex("""(?m)^VmRSS:\s+(\d+)\s+kB$""").find(text)?.groupValues?.get(1)?.toDoubleOrNull()?.div(1024.0)
    val hwm = Regex("""(?m)^VmHWM:\s+(\d+)\s+kB$""").find(text)?.groupValues?.get(1)?.toDoubleOrNull()?.div(1024.0)
    return if (rss != null && hwm != null) rss to hwm else null
}

fun serverJvmPid(rootPid: Long): Long? {
    val root = ProcessHandle.of(rootPid).orElse(null) ?: return null
    val descendants = root.descendants().toList()
    val javaDescendant = descendants
        .sortedByDescending { it.pid() }
        .firstOrNull { handle ->
            val command = runCatching { handle.info().command().orElse("") }.getOrDefault("")
            command.contains("/java") || command.endsWith("java")
        }
    return javaDescendant?.pid() ?: runCatching {
        val rootCommand = root.info().command().orElse("")
        if (rootCommand.contains("/java") || rootCommand.endsWith("java")) root.pid() else null
    }.getOrNull()
}

fun tailText(path: Path, limit: Long = 512_000): String {
    if (!path.exists()) return ""
    val file = path.toFile()
    file.inputStream().use { input ->
        val skip = (file.length() - limit).coerceAtLeast(0)
        input.skip(skip)
        return input.readBytes().toString(Charsets.UTF_8)
    }
}

fun readFullTextIfExists(path: Path, limit: Long = 4_000_000): String {
    if (!path.exists()) return ""
    val size = runCatching { Files.size(path) }.getOrDefault(0L)
    return if (size <= limit) Files.readString(path) else tailText(path, limit)
}

fun classifyFailure(text: String, timedOut: Boolean): String =
    when {
        Regex("""OutOfMemoryError|Java heap space|GC overhead limit exceeded|unable to create native thread|Cannot reserve memory""", RegexOption.IGNORE_CASE).containsMatchIn(text) -> "oom_or_heap_pressure"
        Regex("""Missing or unsupported mandatory dependencies|Mod Loading has failed|requires.*(?:mod|dependency)|NoClassDefFoundError|ClassNotFoundException|Unknown registry key|Failed to parse .*worldgen|Failed to load datapacks|Unbound values in registry""", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL)).containsMatchIn(text) -> "dependency_boot_failure"
        Regex("""Preparing crash report|This crash report has been saved|Encountered an unexpected exception|\[main/FATAL]""", RegexOption.IGNORE_CASE).containsMatchIn(text) -> "hard_log_failure"
        timedOut -> "startup_timeout"
        else -> "unclassified_boot_failure"
    }

fun terminalFailureWindow(text: String): String {
    val markers = listOf(
        "Failed to load datapacks",
        "Unknown registry key",
        "Unbound values in registry",
        "Failed to parse ",
        "Mod Loading has failed",
        "Missing or unsupported mandatory dependencies",
        "NoClassDefFoundError",
        "ClassNotFoundException",
    )
    val index = markers
        .map { marker -> text.lastIndexOf(marker) }
        .filter { it >= 0 }
        .maxOrNull()
        ?: return text
    val start = (index - 32_000).coerceAtLeast(0)
    return text.substring(start)
}

fun inferMissingClassInternalName(text: String): String? {
    val matches = Regex("""(?:NoClassDefFoundError|ClassNotFoundException):\s+([A-Za-z0-9_/$]+)""")
        .findAll(text)
        .map { it.groupValues[1] }
        .toList()
    return matches.firstOrNull { '/' in it }
        ?: matches.firstOrNull { '.' in it }
        ?: matches.firstOrNull()
}

fun jarContainsClass(jar: Path, internalName: String): Boolean =
    runCatching {
        JarFile(jar.toFile()).use { zip -> zip.getEntry("$internalName.class") != null }
    }.getOrDefault(false)

fun inferMissingClassProviderJar(
    text: String,
    inventory: List<JarInfo>,
    cache: MutableMap<String, String?>,
): String? {
    val internalName = inferMissingClassInternalName(terminalFailureWindow(text)) ?: return null
    if (cache.containsKey(internalName)) return cache[internalName]
    val matches = inventory.filter { jarContainsClass(it.path, internalName) }.map { it.fileName }
    val provider = matches.singleOrNull()
    cache[internalName] = provider
    return provider
}

fun inferFailureNamespaces(text: String): Set<String> {
    val window = terminalFailureWindow(text)
    val namespaces = linkedSetOf<String>()
    Regex("""Unknown registry key .*?:\s*([a-z0-9_\-.]+):[a-z0-9_./-]+""", RegexOption.IGNORE_CASE)
        .findAll(window)
        .forEach { namespaces += it.groupValues[1] }
    Regex("""(?:Failed to parse|Errors in element|Unbound values in registry[^\[]*\[)(.*)""", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
        .findAll(window)
        .forEach { match ->
            Regex("""([a-z0-9_\-.]+):[a-z0-9_./-]+""", RegexOption.IGNORE_CASE)
                .findAll(match.groupValues[1])
                .forEach { namespaces += it.groupValues[1] }
        }
    return namespaces
}

fun inferProviderJarsForFailure(
    text: String,
    inventory: List<JarInfo>,
    providersByModId: Map<String, Set<String>>,
    cache: MutableMap<String, String?>,
): Set<String> {
    val providers = linkedSetOf<String>()
    inferMissingClassProviderJar(text, inventory, cache)?.let { providers += it }
    inferFailureNamespaces(text).forEach { namespace ->
        providersByModId[namespace].orEmpty().forEach { providers += it }
    }
    return providers
}

fun retryNodeSuffix(providerJarNames: List<String>): String {
    val tokens = providerJarNames
        .take(4)
        .map { it.substringBefore('.') }
        .map { raw ->
            raw.lowercase()
                .replace(Regex("""[^a-z0-9]+"""), "-")
                .trim('-')
                .ifBlank { "provider" }
        }
    val base = tokens.joinToString("-").take(72).ifBlank { "provider" }
    val extra = providerJarNames.size - tokens.size
    return if (extra > 0) "$base-plus$extra" else base
}

fun runJcmd(pid: Long, command: List<String>, outPath: Path) {
    val result = runCatching { runCommand(command, Paths.get("").toAbsolutePath().normalize(), timeoutSeconds = 60) }.getOrNull()
    if (result == null) {
        Files.writeString(outPath, "failed to execute ${command.joinToString(" ")}\n")
        return
    }
    val (exitCode, output) = result
    Files.writeString(outPath, "exit=$exitCode\n$output")
}

fun measureRuntime(
    config: Config,
    preparedDir: Path,
    nodeId: String,
    removedJarNames: Set<String>,
    heapLimitGiB: Int,
    port: Int,
    keepRuns: Boolean,
): MeasurementResult {
    val runtimesDir = config.runRoot.resolve("runtimes").also { it.createDirectories() }
    val evidenceDir = config.runRoot.resolve("evidence").resolve(nodeId).also { it.createDirectories() }
    val runtimeDir = runtimesDir.resolve(nodeId)
    val started = System.nanoTime()
    val clone = cloneRuntime(preparedDir, runtimeDir)
    if (clone.first != 0) {
        Files.writeString(evidenceDir.resolve("clone.log"), clone.second)
        return MeasurementResult(
            status = "failed",
            classifier = "runtime_clone_failure",
            runtimeDir = runtimeDir.toString(),
            evidenceDir = evidenceDir.toString(),
            removedJarNames = removedJarNames.sorted(),
            forcedClosureJarNames = emptyList(),
            heapLimitGiB = heapLimitGiB,
            medianVmRssMiB = null,
            maxVmHwmMiB = null,
            samples = emptyList(),
            durationMs = (System.nanoTime() - started) / 1_000_000,
            ready = false,
        )
    }
    Files.writeString(evidenceDir.resolve("clone.log"), clone.second)
    val modsDir = runtimeDir.resolve("mods")
    removedJarNames.forEach { jarName ->
        Files.deleteIfExists(modsDir.resolve(jarName))
    }
    Files.writeString(evidenceDir.resolve("removed-mods.txt"), removedJarNames.sorted().joinToString("\n", postfix = "\n"))
    configureJvmArgs(runtimeDir.resolve("user_jvm_args.txt"), heapLimitGiB)
    setServerPort(runtimeDir.resolve("server.properties"), port)
    val logPath = evidenceDir.resolve("server-console.log")
    val process = ProcessBuilder("./run.sh", "nogui")
        .directory(runtimeDir.toFile())
        .redirectErrorStream(true)
        .redirectOutput(logPath.toFile())
        .start()
    var ready = false
    var timedOut = false
    try {
        val deadline = System.currentTimeMillis() + 900_000L
        val readyPattern = Regex("""Done \([\d.]+s\)!|Dedicated server took .* seconds to load""", RegexOption.IGNORE_CASE)
        while (System.currentTimeMillis() < deadline && process.isAlive) {
            if (readyPattern.containsMatchIn(tailText(logPath))) {
                ready = true
                break
            }
            Thread.sleep(1000)
        }
        if (!ready) timedOut = process.isAlive
        if (!ready) {
            val latest = runtimeDir.resolve("logs/latest.log")
            if (latest.exists()) Files.copy(latest, evidenceDir.resolve("latest.log"), StandardCopyOption.REPLACE_EXISTING)
            val combined = tailText(logPath) + "\n" + if (latest.exists()) tailText(latest) else ""
            return MeasurementResult(
                status = "failed",
                classifier = classifyFailure(combined, timedOut),
                runtimeDir = runtimeDir.toString(),
                evidenceDir = evidenceDir.toString(),
                removedJarNames = removedJarNames.sorted(),
                forcedClosureJarNames = emptyList(),
                heapLimitGiB = heapLimitGiB,
                medianVmRssMiB = null,
                maxVmHwmMiB = null,
                samples = emptyList(),
                durationMs = (System.nanoTime() - started) / 1_000_000,
                ready = false,
            )
        }
        Thread.sleep(config.settleSeconds * 1000L)
        val sampleDelayMs = max(5, config.settleSeconds / max(1, config.sampleCount)).toLong() * 1000L
        val samples = mutableListOf<SamplePoint>()
        repeat(config.sampleCount) { sampleIndex ->
            val jvmPid = serverJvmPid(process.pid()) ?: process.pid()
            readProcStatusMiB(jvmPid)?.let { (rss, hwm) ->
                samples += SamplePoint(sampleIndex + 1, ((rss * 100.0).toInt() / 100.0), ((hwm * 100.0).toInt() / 100.0))
            }
            if (sampleIndex + 1 < config.sampleCount) Thread.sleep(sampleDelayMs)
        }
        val heapInfoPath = evidenceDir.resolve("jcmd-gc-heap-info.txt")
        val nmtPath = evidenceDir.resolve("jcmd-native-memory-summary.txt")
        val flagsPath = evidenceDir.resolve("jcmd-vm-flags.txt")
        val jvmPid = serverJvmPid(process.pid()) ?: process.pid()
        runJcmd(jvmPid, listOf("jcmd", jvmPid.toString(), "GC.heap_info"), heapInfoPath)
        runJcmd(jvmPid, listOf("jcmd", jvmPid.toString(), "VM.native_memory", "summary"), nmtPath)
        runJcmd(jvmPid, listOf("jcmd", jvmPid.toString(), "VM.flags"), flagsPath)
        val medianRss = samples.takeIf { it.isNotEmpty() }?.map { it.vmRssMiB }?.let(::median)
        val maxHwm = samples.maxOfOrNull { it.vmHwmMiB }
        Files.writeString(
            evidenceDir.resolve("metrics.json"),
            json(
                mapOf(
                    "status" to "passed",
                    "ready" to true,
                    "heap_limit_gib" to heapLimitGiB,
                    "median_vm_rss_mib" to medianRss,
                    "max_vm_hwm_mib" to maxHwm,
                    "samples" to samples.map { mapOf("index" to it.index, "vm_rss_mib" to it.vmRssMiB, "vm_hwm_mib" to it.vmHwmMiB) },
                ),
            ) + "\n",
        )
        process.outputStream.bufferedWriter().use { writer ->
            writer.appendLine("stop")
            writer.flush()
        }
        process.waitFor(20, TimeUnit.SECONDS)
        val latest = runtimeDir.resolve("logs/latest.log")
        if (latest.exists()) Files.copy(latest, evidenceDir.resolve("latest.log"), StandardCopyOption.REPLACE_EXISTING)
        return MeasurementResult(
            status = "passed",
            classifier = null,
            runtimeDir = runtimeDir.toString(),
            evidenceDir = evidenceDir.toString(),
            removedJarNames = removedJarNames.sorted(),
            forcedClosureJarNames = emptyList(),
            heapLimitGiB = heapLimitGiB,
            medianVmRssMiB = medianRss,
            maxVmHwmMiB = maxHwm,
            samples = samples,
            durationMs = (System.nanoTime() - started) / 1_000_000,
            ready = true,
        )
    } finally {
        if (process.isAlive) {
            process.destroy()
            if (!process.waitFor(20, TimeUnit.SECONDS)) process.destroyForcibly()
        }
        if (!keepRuns) deleteTree(runtimeDir)
    }
}

fun measurementResultWithClosure(result: MeasurementResult, seed: Set<String>): MeasurementResult =
    result.copy(forcedClosureJarNames = (result.removedJarNames.toSet() - seed).sorted())

fun writeHarnessSummary(runRoot: Path, summary: Map<String, Any?>) {
    val summaryText = json(summary) + "\n"
    Files.writeString(runRoot.resolve("summary.json"), summaryText)
    val latestSummaryPath = System.getenv("BC_HARNESS_LATEST_SUMMARY_PATH")?.takeIf { it.isNotBlank() }?.let(Paths::get)
    val summaryPath = System.getenv("BC_HARNESS_SUMMARY_PATH")?.takeIf { it.isNotBlank() }?.let(Paths::get)
    latestSummaryPath?.parent?.createDirectories()
    summaryPath?.parent?.createDirectories()
    if (latestSummaryPath != null) Files.writeString(latestSummaryPath, summaryText)
    if (summaryPath != null) Files.writeString(summaryPath, summaryText)
}

fun writeHarnessStatus(runRoot: Path, status: String, phase: String, extra: Map<String, Any?> = emptyMap()) {
    val payload = mapOf(
        "status" to status,
        "phase" to phase,
        "scenario" to "mod_ram_partition",
        "run_root" to runRoot.toString(),
        "updated_at" to Instant.now().toString(),
    ) + extra
    val text = json(payload) + "\n"
    val latestStatusPath = System.getenv("BC_HARNESS_LATEST_STATUS_PATH")?.takeIf { it.isNotBlank() }?.let(Paths::get)
    val statusPath = System.getenv("BC_HARNESS_STATUS_PATH")?.takeIf { it.isNotBlank() }?.let(Paths::get)
    latestStatusPath?.parent?.createDirectories()
    statusPath?.parent?.createDirectories()
    if (latestStatusPath != null) Files.writeString(latestStatusPath, text)
    if (statusPath != null) Files.writeString(statusPath, text)
}

fun resultToMap(result: NodeResult): Map<String, Any?> = mapOf(
    "node_id" to result.nodeId,
    "mode" to result.mode,
    "depth" to result.depth,
    "seed_jar_names" to result.seedJarNames,
    "measured_removed_jar_names" to result.measuredRemovedJarNames,
    "forced_closure_jar_names" to result.forcedClosureJarNames,
    "status" to result.status,
    "classifier" to result.classifier,
    "heap_limit_gib" to result.heapLimitGiB,
    "baseline_epoch" to result.baselineEpoch,
    "median_vm_rss_mib" to result.medianVmRssMiB,
    "delta_vm_rss_mib" to result.deltaVmRssMiB,
    "evidence_dir" to result.evidenceDir,
    "runtime_dir" to result.runtimeDir,
    "duration_ms" to result.durationMs,
    "rerun_of_node_id" to result.rerunOfNodeId,
)

fun baselineToMap(baseline: BaselineState?): Map<String, Any?>? = baseline?.let {
    mapOf(
        "epoch" to it.epoch,
        "heap_limit_gib" to it.heapLimitGiB,
        "median_vm_rss_mib" to it.medianVmRssMiB,
        "max_vm_hwm_mib" to it.maxVmHwmMiB,
        "evidence_dir" to it.evidenceDir,
    )
}

fun pendingNodeToMap(node: PendingNode): Map<String, Any?> = mapOf(
    "id" to node.id,
    "mode" to node.mode,
    "depth" to node.depth,
    "seed_jar_names" to node.seedJarNames,
)

fun summaryMap(
    mode: String,
    config: Config,
    baseline: BaselineState?,
    retainedFoundationJarNames: List<String>,
    pending: List<PendingNode>,
    results: List<NodeResult>,
): Map<String, Any?> {
    val attribution = results
        .filter { it.mode == "attribution" && it.status == "passed" && it.deltaVmRssMiB != null }
        .sortedByDescending { it.deltaVmRssMiB ?: 0.0 }
        .take(20)
        .map {
            mapOf(
                "node_id" to it.nodeId,
                "delta_vm_rss_mib" to it.deltaVmRssMiB,
                "seed_jar_names" to it.seedJarNames,
                "measured_removed_jar_names" to it.measuredRemovedJarNames,
                "forced_closure_jar_names" to it.forcedClosureJarNames,
                "depth" to it.depth,
                "evidence_dir" to it.evidenceDir,
            )
        }
    val rescue = results
        .filter { it.mode == "rescue" && it.status == "passed" }
        .sortedWith(compareBy<NodeResult> { it.measuredRemovedJarNames.size }.thenBy { it.depth })
        .take(20)
        .map {
            mapOf(
                "node_id" to it.nodeId,
                "removed_count" to it.measuredRemovedJarNames.size,
                "seed_jar_names" to it.seedJarNames,
                "measured_removed_jar_names" to it.measuredRemovedJarNames,
                "evidence_dir" to it.evidenceDir,
            )
        }
    return mapOf(
        "scenario" to "mod_ram_partition",
        "mode" to mode,
        "status" to if (pending.isEmpty()) "completed" else "partial",
        "baseline" to baselineToMap(baseline),
        "retained_foundation_jar_names" to retainedFoundationJarNames,
        "pending_nodes" to pending.map(::pendingNodeToMap),
        "completed_results" to results.size,
        "config" to mapOf(
            "run_root" to config.runRoot.toString(),
            "bootstrap_mode" to config.bootstrapMode,
            "seed_strategy" to config.seedStrategy,
            "settle_seconds" to config.settleSeconds,
            "sample_count" to config.sampleCount,
            "max_depth" to config.maxDepth,
            "min_delta_mib" to config.minDeltaMiB,
            "min_free_gb" to config.minFreeGiB,
            "keep_runs" to config.keepRuns,
            "resume" to config.resume,
        ),
        "top_attribution_deltas" to attribution,
        "rescue_candidates" to rescue,
    )
}

fun main() {
    val config = parseConfig(args)
    val preparedDir = config.runRoot.resolve("prepared")
    val queuePath = config.runRoot.resolve("queue.json")
    val resultsPath = config.runRoot.resolve("results.json")
    val inventoryPath = config.runRoot.resolve("inventory.json")
    val dependencyPath = config.runRoot.resolve("dependency-closure.json")
    val dependencyGraphPath = config.runRoot.resolve("dependency-graph.json")
    val dependencyIslandsPath = config.runRoot.resolve("dependency-islands.json")
    val resumePath = config.runRoot.resolve("resume-state.json")
    val commandsPath = config.runRoot.resolve("commands.log")
    val summaryTextPath = config.runRoot.resolve("summary.txt")

    if (!config.resume && config.bootstrapMode != "never" && !config.keepRuns) {
        deleteTree(config.runRoot)
    }
    config.runRoot.createDirectories()
    ensureFreeSpace(config.runRoot, config.minFreeGiB)
    writeHarnessStatus(config.runRoot, "running", "bootstrap")

    fun appendCommand(command: String) {
        Files.writeString(commandsPath, "$command\n", Charsets.UTF_8, *if (commandsPath.exists()) arrayOf(java.nio.file.StandardOpenOption.APPEND) else arrayOf(java.nio.file.StandardOpenOption.CREATE))
    }

    when (config.bootstrapMode) {
        "always" -> {
            appendCommand("tools/bc internal prepare-server-runtime --server-dir ${preparedDir} --port ${config.basePort} --reset-runtime")
            val result = runCommand(listOf("tools/bc", "internal", "prepare-server-runtime", "--server-dir", preparedDir.toString(), "--port", config.basePort.toString(), "--reset-runtime"), Paths.get("").toAbsolutePath().normalize())
            if (result.first != 0) {
                Files.writeString(config.runRoot.resolve("prepare-runtime.log"), result.second)
                writeHarnessStatus(config.runRoot, "failed", "bootstrap", mapOf("error" to "prepare-server-runtime failed"))
                exitProcess(result.first)
            }
        }
        "once" -> if (!preparedDir.resolve("run.sh").exists()) {
            appendCommand("tools/bc internal prepare-server-runtime --server-dir ${preparedDir} --port ${config.basePort} --reset-runtime")
            val result = runCommand(listOf("tools/bc", "internal", "prepare-server-runtime", "--server-dir", preparedDir.toString(), "--port", config.basePort.toString(), "--reset-runtime"), Paths.get("").toAbsolutePath().normalize())
            if (result.first != 0) {
                Files.writeString(config.runRoot.resolve("prepare-runtime.log"), result.second)
                writeHarnessStatus(config.runRoot, "failed", "bootstrap", mapOf("error" to "prepare-server-runtime failed"))
                exitProcess(result.first)
            }
        }
        "never" -> if (!preparedDir.resolve("run.sh").exists()) usage("prepared runtime missing for --bootstrap-mode never: $preparedDir")
    }

    val inventory = Files.list(preparedDir.resolve("mods")).use { stream ->
        stream.filter { Files.isRegularFile(it) && it.fileName.toString().endsWith(".jar") }
            .toList()
            .sortedBy { it.fileName.toString().lowercase() }
            .map(::inspectJar)
    }
    val weightsByJar = inventory.associate { it.fileName to it.weight }
    val providersByModId = buildMap<String, MutableSet<String>> {
        inventory.forEach { jar ->
            jar.providedModIds.forEach { modId -> getOrPut(modId) { linkedSetOf() } += jar.fileName }
        }
    }.mapValues { it.value.toSet() }
    val jarDependencyAdjacency = buildJarDependencyAdjacency(inventory, providersByModId)
    val reverseDependencyCountByJar = mutableMapOf<String, Int>().withDefault { 0 }
    inventory.forEach { consumer ->
        consumer.mandatoryDeps.forEach { dep ->
            if (dep in platformDependencyModIds) return@forEach
            providersByModId[dep].orEmpty().forEach { provider ->
                reverseDependencyCountByJar[provider] = reverseDependencyCountByJar.getValue(provider) + 1
            }
        }
    }
    val retainedFoundationJarNames = inventory
        .filter { reverseDependencyCountByJar.getValue(it.fileName) >= 8 }
        .map { it.fileName }
        .toMutableSet()
    val missingClassProviderCache = mutableMapOf<String, String?>()
    writeJson(
        inventoryPath,
        inventory.map {
            mapOf(
                "file_name" to it.fileName,
                "jar_size_mib" to it.jarSizeMiB,
                "weight" to it.weight,
                "provided_mod_ids" to it.providedModIds.sorted(),
                "mandatory_deps" to it.mandatoryDeps.sorted(),
                "reverse_dependency_count" to reverseDependencyCountByJar.getValue(it.fileName),
                "retained_foundation" to (it.fileName in retainedFoundationJarNames),
            )
        },
    )
    writeJson(
        dependencyGraphPath,
        inventory.associate { jar ->
            jar.fileName to mapOf(
                "neighbors" to jarDependencyAdjacency[jar.fileName].orEmpty().sorted(),
                "weight" to jar.weight,
                "provided_mod_ids" to jar.providedModIds.sorted(),
                "mandatory_deps" to jar.mandatoryDeps.sorted(),
            )
        },
    )

    val removableIslands = removableIslandsForStrategy(
        inventory = inventory,
        retainedFoundationJarNames = retainedFoundationJarNames,
        adjacency = jarDependencyAdjacency,
        weightsByJar = weightsByJar,
        seedStrategy = config.seedStrategy,
    )
    writeJson(
        dependencyIslandsPath,
        removableIslands.mapIndexed { index, island ->
            mapOf(
                "island_id" to "island-${index + 1}",
                "jar_count" to island.size,
                "total_weight" to islandWeight(island, weightsByJar),
                "jar_names" to island.sorted(),
            )
        },
    )
    val initialQueue = removableIslands.mapIndexed { index, island ->
        PendingNode("attrib-island-${index + 1}", "attribution", 1, island.sorted())
    }

    var pending = if (config.resume && queuePath.exists()) {
        jsonArray(readJsonIfExists(queuePath)).map { item ->
            val obj = jsonObject(item)
            PendingNode(
                id = jsonString(obj["id"]) ?: error("queue item missing id"),
                mode = jsonString(obj["mode"]) ?: "attribution",
                depth = jsonInt(obj["depth"]) ?: 0,
                seedJarNames = jsonArray(obj["seed_jar_names"]).mapNotNull(::jsonString),
            )
        }.toMutableList()
    } else initialQueue.toMutableList()
    var results = if (config.resume && resultsPath.exists()) {
        jsonArray(readJsonIfExists(resultsPath)).map { item ->
            val obj = jsonObject(item)
            NodeResult(
                nodeId = jsonString(obj["node_id"]) ?: error("result missing node_id"),
                mode = jsonString(obj["mode"]) ?: "attribution",
                depth = jsonInt(obj["depth"]) ?: 0,
                seedJarNames = jsonArray(obj["seed_jar_names"]).mapNotNull(::jsonString),
                measuredRemovedJarNames = jsonArray(obj["measured_removed_jar_names"]).mapNotNull(::jsonString),
                forcedClosureJarNames = jsonArray(obj["forced_closure_jar_names"]).mapNotNull(::jsonString),
                status = jsonString(obj["status"]) ?: "failed",
                classifier = jsonString(obj["classifier"]),
                heapLimitGiB = jsonInt(obj["heap_limit_gib"]) ?: 6,
                baselineEpoch = jsonInt(obj["baseline_epoch"]),
                medianVmRssMiB = jsonDouble(obj["median_vm_rss_mib"]),
                deltaVmRssMiB = jsonDouble(obj["delta_vm_rss_mib"]),
                evidenceDir = jsonString(obj["evidence_dir"]) ?: "",
                runtimeDir = jsonString(obj["runtime_dir"]) ?: "",
                durationMs = (obj["duration_ms"] as? Number)?.toLong() ?: 0L,
                rerunOfNodeId = jsonString(obj["rerun_of_node_id"]),
            )
        }.toMutableList()
    } else mutableListOf()
    var baseline = if (config.resume && resumePath.exists()) {
        jsonObject(readJsonIfExists(resumePath)).let { state ->
            jsonObject(state["baseline"]).takeIf { it.isNotEmpty() }?.let { base ->
                BaselineState(
                    epoch = jsonInt(base["epoch"]) ?: 1,
                    heapLimitGiB = jsonInt(base["heap_limit_gib"]) ?: 6,
                    medianVmRssMiB = jsonDouble(base["median_vm_rss_mib"]) ?: 0.0,
                    maxVmHwmMiB = jsonDouble(base["max_vm_hwm_mib"]) ?: 0.0,
                    evidenceDir = jsonString(base["evidence_dir"]) ?: "",
                )
            }
        }
    } else null
    var mode = if (config.resume && resumePath.exists()) jsonString(jsonObject(readJsonIfExists(resumePath))["mode"]) ?: "attribution" else "attribution"
    var periodicBaselineChecks = if (config.resume && resumePath.exists()) jsonInt(jsonObject(readJsonIfExists(resumePath))["periodicBaselineChecks"]) ?: 0 else 0
    var successfulAttributionRuns = results.count { it.mode == "attribution" && it.status == "passed" }
    var lastMeasuredNodeId = if (config.resume && resumePath.exists()) jsonString(jsonObject(readJsonIfExists(resumePath))["lastMeasuredNodeId"]) else null

    fun persistState() {
        writeJson(queuePath, pending.map(::pendingNodeToMap))
        writeJson(resultsPath, results.map(::resultToMap))
        val closure = mutableMapOf<String, Any?>()
        pending.forEach { node ->
            val actual = closureForSeed(node.seedJarNames.toSet(), inventory, providersByModId, retainedFoundationJarNames)
            closure[node.id] = mapOf(
                "seed_jar_names" to node.seedJarNames,
                "measured_removed_jar_names" to actual.sorted(),
                "forced_closure_jar_names" to (actual - node.seedJarNames.toSet()).sorted(),
            )
        }
        writeJson(dependencyPath, closure)
        writeJson(
            resumePath,
            mapOf(
                "mode" to mode,
                "baseline" to baselineToMap(baseline),
                "completedResults" to results.size,
                "periodicBaselineChecks" to periodicBaselineChecks,
                "lastMeasuredNodeId" to lastMeasuredNodeId,
            ),
        )
        val summary = summaryMap(mode, config, baseline, retainedFoundationJarNames.sorted(), pending, results)
        writeHarnessSummary(config.runRoot, summary)
        Files.writeString(
            summaryTextPath,
            buildString {
                appendLine("mod_ram_partition mode=$mode status=${if (pending.isEmpty()) "completed" else "partial"}")
                baseline?.let { appendLine("baseline epoch=${it.epoch} heap=${it.heapLimitGiB}GiB median_vm_rss_mib=${"%.2f".format(it.medianVmRssMiB)}") }
                results.takeLast(20).forEach { result ->
                    appendLine("${result.nodeId} mode=${result.mode} status=${result.status} delta_vm_rss_mib=${result.deltaVmRssMiB ?: "UNKNOWN"} classifier=${result.classifier ?: "none"}")
                }
            },
        )
    }

    fun runBaseline(epoch: Int, heapLimitGiB: Int): BaselineState? {
        val result = measureRuntime(config, preparedDir, "baseline-epoch-$epoch", emptySet(), heapLimitGiB, config.basePort, config.keepRuns)
        if (result.status != "passed" || result.medianVmRssMiB == null || result.maxVmHwmMiB == null) return null
        return BaselineState(epoch, heapLimitGiB, result.medianVmRssMiB, result.maxVmHwmMiB, result.evidenceDir)
    }

    if (baseline == null) {
        writeHarnessStatus(config.runRoot, "running", "baseline")
        val sixGiBBaseline = runBaseline(1, 6)
        baseline = if (sixGiBBaseline != null) sixGiBBaseline else runBaseline(1, 8)
        if (baseline == null) {
            mode = "rescue"
            pending = initialQueue.map { it.copy(id = it.id.replace("attrib", "rescue"), mode = "rescue") }.toMutableList()
        } else if (baseline!!.heapLimitGiB == 8) {
            Files.writeString(config.runRoot.resolve("baseline-note.txt"), "default 6 GiB baseline failed; using 8 GiB disposable-runtime heap for attribution\n")
        }
        persistState()
    }

    fun enqueueChildren(node: PendingNode) {
        if (node.depth >= config.maxDepth || node.seedJarNames.size <= 1) return
        if (config.seedStrategy == "smallest_islands") return
        val (left, right) = splitSeeds(node.seedJarNames, weightsByJar, jarDependencyAdjacency)
        if (left.isNotEmpty()) pending += PendingNode("${node.mode}-${node.id}-l", node.mode, node.depth + 1, left)
        if (right.isNotEmpty()) pending += PendingNode("${node.mode}-${node.id}-r", node.mode, node.depth + 1, right)
    }

    while (pending.isNotEmpty()) {
        val node = if (config.seedStrategy == "smallest_islands") pending.removeFirst() else pending.removeLast()
        writeHarnessStatus(config.runRoot, "running", "measure", mapOf("node" to node.id, "mode" to node.mode))
        val seed = node.seedJarNames.toSet()
        val actualRemoved = closureForSeed(seed, inventory, providersByModId, retainedFoundationJarNames)
        val measurement = measurementResultWithClosure(
            measureRuntime(config, preparedDir, node.id, actualRemoved, baseline?.heapLimitGiB ?: 8, config.basePort + results.size + 1, config.keepRuns),
            seed,
        )
        val result = if (measurement.status == "passed") {
            val delta = if (mode == "attribution" && baseline != null && measurement.medianVmRssMiB != null) {
                ((baseline!!.medianVmRssMiB - measurement.medianVmRssMiB) * 100.0).toInt() / 100.0
            } else null
            NodeResult(
                nodeId = node.id,
                mode = node.mode,
                depth = node.depth,
                seedJarNames = node.seedJarNames,
                measuredRemovedJarNames = measurement.removedJarNames,
                forcedClosureJarNames = measurement.forcedClosureJarNames,
                status = "passed",
                classifier = null,
                heapLimitGiB = measurement.heapLimitGiB,
                baselineEpoch = baseline?.epoch,
                medianVmRssMiB = measurement.medianVmRssMiB,
                deltaVmRssMiB = delta,
                evidenceDir = measurement.evidenceDir,
                runtimeDir = measurement.runtimeDir,
                durationMs = measurement.durationMs,
            )
        } else {
            NodeResult(
                nodeId = node.id,
                mode = node.mode,
                depth = node.depth,
                seedJarNames = node.seedJarNames,
                measuredRemovedJarNames = measurement.removedJarNames,
                forcedClosureJarNames = measurement.forcedClosureJarNames,
                status = "failed",
                classifier = measurement.classifier,
                heapLimitGiB = measurement.heapLimitGiB,
                baselineEpoch = baseline?.epoch,
                medianVmRssMiB = null,
                deltaVmRssMiB = null,
                evidenceDir = measurement.evidenceDir,
                runtimeDir = measurement.runtimeDir,
                durationMs = measurement.durationMs,
            )
        }
        results += result
        if (result.status == "passed") {
            lastMeasuredNodeId = result.nodeId
            if (result.mode == "attribution") successfulAttributionRuns += 1
        }

        when {
            result.mode == "rescue" -> {
                if (result.status == "passed" && result.seedJarNames.size > 1 && result.depth < config.maxDepth) enqueueChildren(node)
                if (result.status != "passed" && result.seedJarNames.size > 1 && result.depth < config.maxDepth) enqueueChildren(node)
            }
            result.status == "passed" && (result.deltaVmRssMiB ?: 0.0) >= config.minDeltaMiB && result.seedJarNames.size > 1 && result.depth < config.maxDepth -> enqueueChildren(node)
            result.status != "passed" && result.seedJarNames.size > 1 && result.depth < config.maxDepth -> enqueueChildren(node)
        }

        if (result.status == "failed" && result.classifier == "dependency_boot_failure") {
            val evidencePath = Paths.get(result.evidenceDir)
            val failureText = buildString {
                append(readFullTextIfExists(evidencePath.resolve("server-console.log")))
                append('\n')
                append(readFullTextIfExists(evidencePath.resolve("latest.log")))
            }
            val inferredProviders = inferProviderJarsForFailure(failureText, inventory, providersByModId, missingClassProviderCache)
                .filter { it in result.measuredRemovedJarNames && it !in retainedFoundationJarNames }
                .sorted()
            if (inferredProviders.isNotEmpty()) {
                retainedFoundationJarNames += inferredProviders
                val adjustedSeed = node.seedJarNames.filterNot { it in inferredProviders }
                val suffix = retryNodeSuffix(inferredProviders)
                pending += PendingNode("${node.id}-retain-$suffix", node.mode, node.depth, adjustedSeed)
            }
        }

        if (mode == "attribution" && successfulAttributionRuns > 0 && successfulAttributionRuns % 8 == 0 && baseline != null) {
            periodicBaselineChecks += 1
            val refreshed = runBaseline(baseline!!.epoch + 1, baseline!!.heapLimitGiB)
            if (refreshed != null) {
                val drift = abs(refreshed.medianVmRssMiB - baseline!!.medianVmRssMiB) / max(1.0, baseline!!.medianVmRssMiB)
                if (drift > 0.05 && lastMeasuredNodeId != null) {
                    baseline = refreshed
                    val previous = results.lastOrNull { it.nodeId == lastMeasuredNodeId }
                    if (previous != null) {
                        val rerunMeasurement = measurementResultWithClosure(
                            measureRuntime(config, preparedDir, "${previous.nodeId}-baseline-rerun-${baseline!!.epoch}", previous.measuredRemovedJarNames.toSet(), baseline!!.heapLimitGiB, config.basePort + results.size + 1, config.keepRuns),
                            previous.seedJarNames.toSet(),
                        )
                        if (rerunMeasurement.status == "passed") {
                            results.remove(previous)
                            results += previous.copy(
                                nodeId = previous.nodeId,
                                baselineEpoch = baseline!!.epoch,
                                medianVmRssMiB = rerunMeasurement.medianVmRssMiB,
                                deltaVmRssMiB = rerunMeasurement.medianVmRssMiB?.let { ((baseline!!.medianVmRssMiB - it) * 100.0).toInt() / 100.0 },
                                evidenceDir = rerunMeasurement.evidenceDir,
                                runtimeDir = rerunMeasurement.runtimeDir,
                                durationMs = rerunMeasurement.durationMs,
                                rerunOfNodeId = previous.nodeId,
                            )
                        }
                    }
                } else {
                    baseline = refreshed
                }
            }
        }
        persistState()
    }

    val finalSummary = summaryMap(mode, config, baseline, retainedFoundationJarNames.sorted(), pending, results)
    writeHarnessSummary(config.runRoot, finalSummary)
    writeHarnessStatus(config.runRoot, "passed", "complete", mapOf("mode" to mode, "completed_results" to results.size))
    println("mod_ram_partition completed mode=$mode baseline_heap=${baseline?.heapLimitGiB ?: "UNKNOWN"}GiB results=${results.size}")
}

main()

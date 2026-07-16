#!/usr/bin/env kotlin

import java.io.BufferedInputStream
import java.io.DataInputStream
import java.io.EOFException
import java.io.RandomAccessFile
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.util.zip.GZIPInputStream
import java.util.zip.InflaterInputStream
import kotlin.io.path.createDirectories
import kotlin.io.path.exists
import kotlin.io.path.isDirectory
import kotlin.system.exitProcess

val CUTOFF_Y = 64
val MIN_FULL_CHUNKS = 9
val MIN_UNDERGROUND_UNEARTHED_PER_CHUNK = 1_000L
val MIN_ABOVEGROUND_UNEARTHED_PER_CHUNK = 100L
val MIN_ABOVEGROUND_REGOLITH_PER_CHUNK = 5L
val MAX_UNDERGROUND_ROCK_RATIO = 0.0001
val MAX_ABOVEGROUND_ROCK_RATIO = 0.001
val MAX_ABOVEGROUND_SURFACE_HOST_RATIO = 0.05

private val vanillaRockHosts = setOf(
    "minecraft:stone",
    "minecraft:granite",
    "minecraft:diorite",
    "minecraft:andesite",
    "minecraft:deepslate",
    "minecraft:tuff",
)
private val vanillaSurfaceHosts = setOf(
    "minecraft:dirt",
    "minecraft:grass_block",
    "minecraft:coarse_dirt",
    "minecraft:podzol",
    "minecraft:mycelium",
)

data class BandCounts(
    var total: Long = 0,
    var unearthed: Long = 0,
    var regolith: Long = 0,
    val vanillaRock: MutableMap<String, Long> = vanillaRockHosts.associateWith { 0L }.toMutableMap(),
    val vanillaSurface: MutableMap<String, Long> = vanillaSurfaceHosts.associateWith { 0L }.toMutableMap(),
) {
    val vanillaRockTotal: Long get() = vanillaRock.values.sum()
    val vanillaSurfaceTotal: Long get() = vanillaSurface.values.sum()
}

data class RockLocationCounts(
    val bySectionY: MutableMap<Int, Long> = sortedMapOf(),
    val byBlockY: MutableMap<Int, Long> = sortedMapOf(),
    val byChunk: MutableMap<String, Long> = mutableMapOf(),
)

private fun usage(message: String? = null): Nothing {
    if (message != null) System.err.println(message)
    System.err.println("Usage: tools/bc test unearthed-replacement --instance PATH [--world PATH] [--output PATH]")
    exitProcess(2)
}

private fun readNbtPayload(type: Int, input: DataInputStream): Any? = when (type) {
    0 -> null
    1 -> input.readByte()
    2 -> input.readShort()
    3 -> input.readInt()
    4 -> input.readLong()
    5 -> input.readFloat()
    6 -> input.readDouble()
    7 -> ByteArray(input.readInt().also { require(it >= 0) }).also(input::readFully)
    8 -> input.readUTF()
    9 -> {
        val elementType = input.readUnsignedByte()
        val size = input.readInt()
        require(size >= 0) { "negative NBT list length" }
        List(size) { readNbtPayload(elementType, input) }
    }
    10 -> buildMap<String, Any?> {
        while (true) {
            val childType = input.readUnsignedByte()
            if (childType == 0) break
            put(input.readUTF(), readNbtPayload(childType, input))
        }
    }
    11 -> IntArray(input.readInt().also { require(it >= 0) }) { input.readInt() }
    12 -> LongArray(input.readInt().also { require(it >= 0) }) { input.readLong() }
    else -> error("unsupported NBT tag type $type")
}

@Suppress("UNCHECKED_CAST")
private fun readNbt(input: DataInputStream): Map<String, Any?> {
    val rootType = input.readUnsignedByte()
    require(rootType == 10) { "expected compound NBT root, got type $rootType" }
    input.readUTF()
    return readNbtPayload(rootType, input) as Map<String, Any?>
}

private fun compound(value: Any?): Map<String, Any?> = value as? Map<String, Any?> ?: emptyMap()
private fun list(value: Any?): List<Any?> = value as? List<Any?> ?: emptyList()
private fun number(value: Any?): Number? = value as? Number

private fun paletteCounts(blockStates: Map<String, Any?>): Map<String, Long> {
    val palette = list(blockStates["palette"]).map { compound(it)["Name"] as? String ?: "UNKNOWN" }
    if (palette.isEmpty()) return emptyMap()
    val counts = LongArray(palette.size)
    val data = blockStates["data"] as? LongArray
    if (data == null) {
        counts[0] = 4096
    } else {
        val bits = maxOf(4, 32 - Integer.numberOfLeadingZeros(palette.size - 1))
        val valuesPerLong = 64 / bits
        val mask = (1L shl bits) - 1L
        repeat(4096) { blockIndex ->
            val storageIndex = blockIndex / valuesPerLong
            if (storageIndex < data.size) {
                val paletteIndex = ((data[storageIndex] ushr ((blockIndex % valuesPerLong) * bits)) and mask).toInt()
                if (paletteIndex in counts.indices) counts[paletteIndex]++
            }
        }
    }
    return palette.indices.associate { palette[it] to counts[it] }
}

private fun vanillaRockCountsByLocalY(blockStates: Map<String, Any?>): LongArray {
    val palette = list(blockStates["palette"]).map { compound(it)["Name"] as? String ?: "UNKNOWN" }
    val counts = LongArray(16)
    if (palette.isEmpty()) return counts
    val data = blockStates["data"] as? LongArray
    if (data == null) {
        if (palette[0] in vanillaRockHosts) counts.fill(256)
        return counts
    }
    val bits = maxOf(4, 32 - Integer.numberOfLeadingZeros(palette.size - 1))
    val valuesPerLong = 64 / bits
    val mask = (1L shl bits) - 1L
    repeat(4096) { blockIndex ->
        val storageIndex = blockIndex / valuesPerLong
        if (storageIndex < data.size) {
            val paletteIndex = ((data[storageIndex] ushr ((blockIndex % valuesPerLong) * bits)) and mask).toInt()
            if (paletteIndex in palette.indices && palette[paletteIndex] in vanillaRockHosts) {
                counts[blockIndex ushr 8]++
            }
        }
    }
    return counts
}

private fun countSection(
    root: Map<String, Any?>,
    underground: BandCounts,
    aboveground: BandCounts,
    undergroundLocations: RockLocationCounts,
) {
    val chunkKey = "${number(root["xPos"])?.toInt() ?: 0},${number(root["zPos"])?.toInt() ?: 0}"
    for (sectionValue in list(root["sections"])) {
        val section = compound(sectionValue)
        val sectionY = number(section["Y"])?.toInt() ?: continue
        val blockStates = compound(section["block_states"])
        if (blockStates.isEmpty()) continue
        val band = if (sectionY * 16 < CUTOFF_Y) underground else aboveground
        if (band === underground) {
            vanillaRockCountsByLocalY(blockStates).forEachIndexed { localY, count ->
                if (count > 0) undergroundLocations.byBlockY.merge(sectionY * 16 + localY, count, Long::plus)
            }
        }
        for ((block, count) in paletteCounts(blockStates)) {
            band.total += count
            if (block.startsWith("unearthed:")) {
                band.unearthed += count
                if ("regolith" in block || "overgrown" in block) band.regolith += count
            }
            if (block in vanillaRockHosts) {
                band.vanillaRock[block] = band.vanillaRock.getValue(block) + count
                if (band === underground && count > 0) {
                    undergroundLocations.bySectionY.merge(sectionY, count, Long::plus)
                    undergroundLocations.byChunk.merge(chunkKey, count, Long::plus)
                }
            }
            if (block in vanillaSurfaceHosts) band.vanillaSurface[block] = band.vanillaSurface.getValue(block) + count
        }
    }
}

private fun readRegion(
    path: Path,
    underground: BandCounts,
    aboveground: BandCounts,
    undergroundLocations: RockLocationCounts,
): Int {
    var fullChunks = 0
    RandomAccessFile(path.toFile(), "r").use { region ->
        if (region.length() < 4096) return 0
        val locations = ByteArray(4096)
        region.readFully(locations)
        repeat(1024) { index ->
            val base = index * 4
            val sector = ((locations[base].toInt() and 0xff) shl 16) or
                ((locations[base + 1].toInt() and 0xff) shl 8) or
                (locations[base + 2].toInt() and 0xff)
            if (sector == 0) return@repeat
            try {
                region.seek(sector.toLong() * 4096L)
                val length = region.readInt()
                if (length <= 1 || length > 16 * 1024 * 1024) return@repeat
                val compression = region.readUnsignedByte()
                require(compression and 0x80 == 0) { "external chunk streams are unsupported: $path slot $index" }
                val payload = ByteArray(length - 1)
                region.readFully(payload)
                val raw = when (compression) {
                    1 -> GZIPInputStream(payload.inputStream())
                    2 -> InflaterInputStream(payload.inputStream())
                    3 -> payload.inputStream()
                    else -> error("unknown chunk compression $compression in $path slot $index")
                }
                val root = DataInputStream(BufferedInputStream(raw)).use(::readNbt)
                if (root["Status"] != "minecraft:full") return@repeat
                fullChunks++
                countSection(root, underground, aboveground, undergroundLocations)
            } catch (error: EOFException) {
                throw IllegalStateException("truncated region chunk in $path slot $index", error)
            }
        }
    }
    return fullChunks
}

private fun ratio(numerator: Long, denominator: Long): Double = if (denominator <= 0) 1.0 else numerator.toDouble() / denominator
private fun jsonEscape(value: String): String = buildString {
    for (char in value) append(when (char) {
        '\\' -> "\\\\"
        '"' -> "\\\""
        '\n' -> "\\n"
        '\r' -> "\\r"
        '\t' -> "\\t"
        else -> char
    })
}
private fun json(value: Any?): String = when (value) {
    null -> "null"
    is String -> "\"${jsonEscape(value)}\""
    is Number, is Boolean -> value.toString()
    is Map<*, *> -> value.entries.joinToString(prefix = "{", postfix = "}") { json(it.key.toString()) + ":" + json(it.value) }
    is Iterable<*> -> value.joinToString(prefix = "[", postfix = "]") { json(it) }
    else -> json(value.toString())
}

var instance: Path? = null
var world: Path? = null
var output: Path? = null
var index = 0
while (index < args.size) {
    when (args[index]) {
        "--instance" -> { instance = Paths.get(args.getOrNull(index + 1) ?: usage("--instance needs a path")).toAbsolutePath().normalize(); index += 2 }
        "--world" -> { world = Paths.get(args.getOrNull(index + 1) ?: usage("--world needs a path")).toAbsolutePath().normalize(); index += 2 }
        "--output" -> { output = Paths.get(args.getOrNull(index + 1) ?: usage("--output needs a path")).toAbsolutePath().normalize(); index += 2 }
        "--help" -> usage()
        else -> usage("unknown argument: ${args[index]}")
    }
}
if (instance == null && world == null) usage("--instance or --world is required")
val worldPath = world ?: instance!!.resolve("world")
val regionPath = if (worldPath!!.resolve("region").isDirectory()) worldPath!!.resolve("region") else worldPath
if (!regionPath!!.isDirectory()) usage("Overworld region directory does not exist: $regionPath")
val outputPath = output ?: (instance ?: worldPath!!)!!.resolve("validation-evidence/unearthed-replacement-audit.json")

val underground = BandCounts()
val aboveground = BandCounts()
val undergroundLocations = RockLocationCounts()
var fullChunks = 0
Files.list(regionPath).use { paths ->
    paths.filter { it.fileName.toString().matches(Regex("r\\.-?\\d+\\.-?\\d+\\.mca")) }
        .sorted()
        .forEach { fullChunks += readRegion(it, underground, aboveground, undergroundLocations) }
}

val undergroundRockRatio = ratio(underground.vanillaRockTotal, underground.vanillaRockTotal + underground.unearthed)
val abovegroundRockRatio = ratio(aboveground.vanillaRockTotal, aboveground.vanillaRockTotal + aboveground.unearthed)
val abovegroundSurfaceRatio = ratio(aboveground.vanillaSurfaceTotal, aboveground.vanillaSurfaceTotal + aboveground.regolith)
val checks = linkedMapOf(
    "full_chunk_evidence" to (fullChunks >= MIN_FULL_CHUNKS),
    "underground_unearthed_evidence" to (underground.unearthed >= fullChunks * MIN_UNDERGROUND_UNEARTHED_PER_CHUNK),
    "underground_vanilla_rock_ratio" to (undergroundRockRatio <= MAX_UNDERGROUND_ROCK_RATIO),
    "aboveground_unearthed_evidence" to (aboveground.unearthed >= fullChunks * MIN_ABOVEGROUND_UNEARTHED_PER_CHUNK),
    "aboveground_vanilla_rock_ratio" to (abovegroundRockRatio <= MAX_ABOVEGROUND_ROCK_RATIO),
    "aboveground_regolith_evidence" to (aboveground.regolith >= fullChunks * MIN_ABOVEGROUND_REGOLITH_PER_CHUNK),
    "aboveground_surface_host_ratio" to (abovegroundSurfaceRatio <= MAX_ABOVEGROUND_SURFACE_HOST_RATIO),
)
val passed = checks.values.all { it }
val report = linkedMapOf<String, Any?>(
    "schema" to "bc.unearthed_replacement_audit.v1",
    "status" to if (passed) "passed" else "failed",
    "world" to worldPath.toString(),
    "cutoffY" to CUTOFF_Y,
    "fullChunks" to fullChunks,
    "thresholds" to linkedMapOf(
        "minFullChunks" to MIN_FULL_CHUNKS,
        "minUndergroundUnearthedPerChunk" to MIN_UNDERGROUND_UNEARTHED_PER_CHUNK,
        "maxUndergroundRockRatio" to MAX_UNDERGROUND_ROCK_RATIO,
        "minAbovegroundUnearthedPerChunk" to MIN_ABOVEGROUND_UNEARTHED_PER_CHUNK,
        "maxAbovegroundRockRatio" to MAX_ABOVEGROUND_ROCK_RATIO,
        "minAbovegroundRegolithPerChunk" to MIN_ABOVEGROUND_REGOLITH_PER_CHUNK,
        "maxAbovegroundSurfaceHostRatio" to MAX_ABOVEGROUND_SURFACE_HOST_RATIO,
    ),
    "underground" to linkedMapOf(
        "unearthed" to underground.unearthed,
        "vanillaRock" to underground.vanillaRock,
        "vanillaRockRatio" to undergroundRockRatio,
        "vanillaRockBySectionY" to undergroundLocations.bySectionY,
        "vanillaRockByBlockY" to undergroundLocations.byBlockY,
        "topVanillaRockChunks" to undergroundLocations.byChunk.entries
            .sortedByDescending { it.value }
            .take(20)
            .associate { it.key to it.value },
    ),
    "aboveground" to linkedMapOf(
        "unearthed" to aboveground.unearthed,
        "regolithOrOvergrown" to aboveground.regolith,
        "vanillaRock" to aboveground.vanillaRock,
        "vanillaRockRatio" to abovegroundRockRatio,
        "vanillaSurface" to aboveground.vanillaSurface,
        "vanillaSurfaceHostRatio" to abovegroundSurfaceRatio,
    ),
    "checks" to checks,
)
outputPath.parent?.createDirectories()
Files.writeString(outputPath, json(report) + "\n")

for ((name, ok) in checks) println("${if (ok) "ok" else "FAIL"} - $name")
println("Unearthed replacement audit: ${if (passed) "passed" else "failed"}; full=$fullChunks undergroundRockRatio=$undergroundRockRatio abovegroundRockRatio=$abovegroundRockRatio surfaceHostRatio=$abovegroundSurfaceRatio")
println("evidence: $outputPath")
exitProcess(if (passed) 0 else 1)

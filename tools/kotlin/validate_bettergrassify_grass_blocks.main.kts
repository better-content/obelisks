#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import kotlin.system.exitProcess

val repo = Paths.get("").toAbsolutePath().normalize()
val grassCompatPath = repo.resolve("kubejs/server_scripts/10_tags/40_dirt_grass_compat.js")
val betterGrassConfigPath = repo.resolve("config/bettergrass.json5")

fun fail(message: String): Nothing {
    System.err.println("FAIL - $message")
    exitProcess(1)
}

fun readRequired(path: Path): String {
    if (!Files.isRegularFile(path)) fail("missing ${repo.relativize(path).toString().replace('\\', '/')}")
    return Files.readString(path)
}

fun parseQuotedEntries(listSource: String): List<String> =
    Regex("""'([^']+)'|"([^"]+)"""")
        .findAll(listSource)
        .map { match -> match.groupValues[1].ifEmpty { match.groupValues[2] } }
        .toList()

val grassCompatText = readRequired(grassCompatPath)
val grassEntriesMatch = Regex("""var\s+grassLikeEntries\s*=\s*\[(.*?)]""", setOf(RegexOption.DOT_MATCHES_ALL))
    .find(grassCompatText)
    ?: fail("could not locate grassLikeEntries in ${repo.relativize(grassCompatPath).toString().replace('\\', '/')}")
val authoredGrassEntries = parseQuotedEntries(grassEntriesMatch.groupValues[1])

val expectedMoreBlocks = authoredGrassEntries.filterNot {
    it == "minecraft:grass_block" || it.startsWith("unearthed:overgrown_")
}

val betterGrassText = readRequired(betterGrassConfigPath)
val moreBlocksMatch = Regex(""""moreBlocks"\s*:\s*\[(.*?)]""", setOf(RegexOption.DOT_MATCHES_ALL))
    .find(betterGrassText)
    ?: fail("could not locate moreBlocks in ${repo.relativize(betterGrassConfigPath).toString().replace('\\', '/')}")
val configuredMoreBlocks = parseQuotedEntries(moreBlocksMatch.groupValues[1])

val duplicateExpected = expectedMoreBlocks.groupingBy { it }.eachCount().filterValues { it > 1 }.keys.sorted()
if (duplicateExpected.isNotEmpty()) fail("grassLikeEntries contains duplicate BetterGrassify candidates: ${duplicateExpected.joinToString(", ")}")

val duplicateConfigured = configuredMoreBlocks.groupingBy { it }.eachCount().filterValues { it > 1 }.keys.sorted()
if (duplicateConfigured.isNotEmpty()) fail("config/bettergrass.json5 moreBlocks contains duplicates: ${duplicateConfigured.joinToString(", ")}")

val missing = expectedMoreBlocks.filterNot(configuredMoreBlocks::contains)
val unexpected = configuredMoreBlocks.filterNot(expectedMoreBlocks::contains)

if (missing.isNotEmpty() || unexpected.isNotEmpty()) {
    val details = buildList {
        if (missing.isNotEmpty()) add("missing=${missing.joinToString(", ")}")
        if (unexpected.isNotEmpty()) add("unexpected=${unexpected.joinToString(", ")}")
    }
    fail("BetterGrassify grass block coverage drifted: ${details.joinToString("; ")}")
}

println("BetterGrassify grass block coverage validates (${configuredMoreBlocks.size} non-overgrown entries)")

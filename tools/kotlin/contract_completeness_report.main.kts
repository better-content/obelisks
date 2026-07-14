#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import kotlin.io.path.createDirectories
import kotlin.io.path.exists
import kotlin.system.exitProcess

val root = Paths.get("").toAbsolutePath().normalize()
val argsSet = args.toSet()
val writeReports = !argsSet.contains("--no-write")
val checkMode = argsSet.contains("--check")
val reportDir = root.resolve("generated/validation")
val contractPath = root.resolve("tools/pack_contract.json")

fun existsAny(ref: String?): Boolean = ref != null && (Paths.get(ref).exists() || root.resolve(ref).exists())
fun readJson(file: Path): Any? = parseJson(Files.readString(file))
fun jsonObject(value: Any?): Map<String, Any?> = value as? Map<String, Any?> ?: emptyMap()
fun jsonArray(value: Any?): List<Any?> = value as? List<Any?> ?: emptyList()
fun jsonString(value: Any?): String? = value as? String

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
        val result = linkedMapOf<String, Any?>(); expect('{'); skipWhitespace()
        if (peek('}')) { index += 1; return result }
        while (true) {
            skipWhitespace()
            val key = parseString(); skipWhitespace(); expect(':'); result[key] = parseValue(); skipWhitespace()
            when { peek('}') -> { index += 1; return result }; peek(',') -> index += 1; else -> error("expected , or }") }
        }
    }
    private fun parseArray(): List<Any?> {
        val result = mutableListOf<Any?>(); expect('['); skipWhitespace()
        if (peek(']')) { index += 1; return result }
        while (true) {
            skipWhitespace()
            result += parseValue(); skipWhitespace()
            when { peek(']') -> { index += 1; return result }; peek(',') -> index += 1; else -> error("expected , or ]") }
        }
    }
    private fun parseString(): String {
        expect('"'); val out = StringBuilder()
        while (index < text.length) {
            val ch = text[index++]
            when (ch) {
                '"' -> return out.toString()
                '\\' -> out.append(when (val esc = text[index++]) {
                    '"', '\\', '/' -> esc
                    'b' -> '\b'
                    'f' -> '\u000C'
                    'n' -> '\n'
                    'r' -> '\r'
                    't' -> '\t'
                    'u' -> { val hex = text.substring(index, index + 4); index += 4; hex.toInt(16).toChar() }
                    else -> error("bad escape: $esc")
                })
                else -> out.append(ch)
            }
        }
        error("unterminated string")
    }
    private fun parseNumber(): Number {
        val start = index
        if (text[index] == '-') index += 1
        while (index < text.length && text[index].isDigit()) index += 1
        if (index < text.length && text[index] == '.') { index += 1; while (index < text.length && text[index].isDigit()) index += 1 }
        if (index < text.length && (text[index] == 'e' || text[index] == 'E')) {
            index += 1
            if (index < text.length && (text[index] == '+' || text[index] == '-')) index += 1
            while (index < text.length && text[index].isDigit()) index += 1
        }
        val raw = text.substring(start, index)
        return if (raw.contains('.') || raw.contains('e', true)) raw.toDouble() else raw.toLong()
    }
    private fun parseLiteral(token: String, value: Any?): Any? {
        require(text.startsWith(token, index)) { "expected $token at $index" }
        index += token.length
        return value
    }
    private fun skipWhitespace() { while (index < text.length && text[index].isWhitespace()) index += 1 }
    private fun expect(ch: Char) {
        require(index < text.length && text[index] == ch) { "expected $ch at $index but found ${text.getOrNull(index)}" }
        index += 1
    }
    private fun peek(ch: Char): Boolean = index < text.length && text[index] == ch
}
fun parseJson(text: String): Any? = JsonParser(text).parse()

fun mdTable(rows: List<List<Any?>>): String {
    if (rows.isEmpty()) return "_None._\n"
    val widths = IntArray(rows.maxOf { it.size })
    for (row in rows) for (i in row.indices) widths[i] = maxOf(widths[i], row[i].toString().length)
    fun line(row: List<Any?>) = "| " + row.mapIndexed { i, cell -> cell.toString().padEnd(widths[i]) }.joinToString(" | ") + " |"
    return buildString {
        appendLine(line(rows.first()))
        appendLine("| " + widths.joinToString(" | ") { "-".repeat(maxOf(3, it)) } + " |")
        rows.drop(1).forEach { appendLine(line(it)) }
    }
}

val errors = mutableListOf<String>()
val warnings = mutableListOf<String>()
val contract = try {
    jsonObject(readJson(contractPath))
} catch (error: Exception) {
    System.err.println("FAIL - contract completeness input parses: ${error.message ?: error.javaClass.simpleName}")
    exitProcess(1)
}

val completeness = jsonObject(contract["completeness"])
val dimensions = jsonArray(completeness["dimensions"]).map(::jsonObject)
val allowedStatuses = jsonArray(completeness["allowedStatuses"]).mapNotNull(::jsonString).toSet()
val strongStatuses = jsonArray(completeness["strongStatuses"]).mapNotNull(::jsonString).toSet()
val systems = jsonArray(contract["systems"]).mapNotNull { jsonString(jsonObject(it)["id"]) }.toSet()
val tiers = jsonArray(contract["validationTiers"]).mapNotNull { jsonString(jsonObject(it)["id"]) }.toSet()
val referencedSystems = mutableSetOf<String>()
val referencedTiers = mutableSetOf<String>()

if (dimensions.isEmpty()) errors += "contract.completeness.dimensions is empty"
if (allowedStatuses.isEmpty()) errors += "contract.completeness.allowedStatuses is empty"

for (dimension in dimensions) {
    val label = jsonString(dimension["id"]) ?: "<missing id>"
    val status = jsonString(dimension["status"])
    if (jsonString(dimension["id"]).isNullOrBlank()) errors += "completeness dimension missing id"
    if (status !in allowedStatuses) errors += "$label: invalid status ${status ?: "<missing>"}"
    if (jsonString(dimension["claim"]).isNullOrBlank()) errors += "$label: missing claim"
    for (systemRef in jsonArray(dimension["systemRefs"]).mapNotNull(::jsonString)) {
        if (systemRef !in systems) errors += "$label: unknown systemRef $systemRef"
        referencedSystems += systemRef
    }
    for (tierRef in jsonArray(dimension["tierRefs"]).mapNotNull(::jsonString)) {
        if (tierRef !in tiers) errors += "$label: unknown tierRef $tierRef"
        referencedTiers += tierRef
    }
    val evidence = jsonArray(dimension["evidence"]).mapNotNull(::jsonString)
    val validators = jsonArray(dimension["validators"]).mapNotNull(::jsonString)
    if (evidence.isEmpty()) errors += "$label: no evidence listed"
    if (validators.isEmpty()) errors += "$label: no validators listed"
    for (ref in evidence + validators) if (!existsAny(ref)) errors += "$label: evidence/validator missing: $ref"
    val weakStatus = status != null && status !in strongStatuses
    val openRequirements = jsonArray(dimension["openRequirements"]).mapNotNull(::jsonString)
    if (weakStatus && openRequirements.isEmpty()) errors += "$label: weak status $status must list openRequirements"
    if (!weakStatus && openRequirements.isNotEmpty()) warnings += "$label: strong status $status still lists openRequirements"
}

for (system in systems) if (system !in referencedSystems) errors += "system is not referenced by any completeness dimension: $system"
for (tier in tiers) if (tier !in referencedTiers) errors += "validation tier is not referenced by any completeness dimension: $tier"

val statusCounts = dimensions.groupingBy { jsonString(it["status"]) ?: "<missing>" }.eachCount().toSortedMap()
val strongDimensions = dimensions.filter { jsonString(it["status"]) in strongStatuses }
val weakDimensions = dimensions.filter { jsonString(it["status"]) !in strongStatuses }
val openRequirements = weakDimensions.flatMap { dimension ->
    jsonArray(dimension["openRequirements"]).mapNotNull(::jsonString).map { requirement ->
        listOf(jsonString(dimension["id"]) ?: "", jsonString(dimension["status"]) ?: "", requirement)
    }
}

val generatedAt = java.time.Instant.now().toString()
val summaryJson = buildString {
    appendLine("{")
    appendLine("  \"generatedAt\": \"$generatedAt\",")
    appendLine("  \"schema\": \"bc.contract_completeness_report.v1\",")
    appendLine("  \"contract\": \"tools/pack_contract.json\",")
    appendLine("  \"dimensions\": ${dimensions.size},")
    appendLine("  \"strongDimensions\": ${strongDimensions.size},")
    appendLine("  \"weakDimensions\": ${weakDimensions.size},")
    appendLine("  \"errors\": ${errors.size},")
    appendLine("  \"warnings\": ${warnings.size}")
    appendLine("}")
}
val report = buildString {
    appendLine("# Contract Completeness Report")
    appendLine()
    appendLine("Generated: `$generatedAt`")
    appendLine()
    appendLine("Contract: `tools/pack_contract.json`")
    appendLine()
    appendLine("## Summary")
    appendLine()
    append(mdTable(listOf(
        listOf("Metric", "Count"),
        listOf("Dimensions classified", dimensions.size),
        listOf("Strong proof dimensions", strongDimensions.size),
        listOf("Explicit weak/open dimensions", weakDimensions.size),
        listOf("Open requirements", openRequirements.size),
        listOf("Errors", errors.size),
        listOf("Warnings", warnings.size)
    )))
    appendLine("## Status Counts")
    appendLine()
    append(mdTable(listOf(listOf("Status", "Count")) + statusCounts.map { listOf(it.key, it.value) }))
    appendLine("## Dimension Matrix")
    appendLine()
    append(mdTable(listOf(listOf("Dimension", "Status", "Tiers", "Systems", "Open requirements")) + dimensions.map {
        listOf(
            jsonString(it["id"]) ?: "",
            jsonString(it["status"]) ?: "",
            jsonArray(it["tierRefs"]).mapNotNull(::jsonString).joinToString(", ").ifBlank { "-" },
            jsonArray(it["systemRefs"]).mapNotNull(::jsonString).joinToString(", ").ifBlank { "-" },
            jsonArray(it["openRequirements"]).size
        )
    }))
    appendLine("## Open Requirements")
    appendLine()
    append(mdTable(listOf(listOf("Dimension", "Status", "Requirement")) + openRequirements))
    appendLine("## Errors")
    appendLine()
    append(mdTable(listOf(listOf("Error")) + errors.map { listOf(it) }))
    appendLine("## Warnings")
    appendLine()
    append(mdTable(listOf(listOf("Warning")) + warnings.map { listOf(it) }))
}

if (writeReports) {
    reportDir.createDirectories()
    Files.writeString(reportDir.resolve("contract_completeness_summary.json"), summaryJson)
    Files.writeString(reportDir.resolve("contract_completeness_report.md"), report)
}

println("contract completeness: ${dimensions.size} dimensions classified; ${strongDimensions.size} strong, ${weakDimensions.size} explicit open; ${errors.size} error(s), ${warnings.size} warning(s)")
if (writeReports) println("wrote generated/validation/contract_completeness_report.md")
if (errors.isNotEmpty()) exitProcess(1)
if (!checkMode && errors.isNotEmpty()) exitProcess(1)

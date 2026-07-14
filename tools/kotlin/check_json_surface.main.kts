#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import kotlin.system.exitProcess

val root = Paths.get("").toAbsolutePath().normalize()

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
        expect('{'); skip()
        val map = linkedMapOf<String, Any?>()
        if (peek() == '}') { index++; return map }
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
        expect('['); skip()
        val list = mutableListOf<Any?>()
        if (peek() == ']') { index++; return list }
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

fun walk(rootDir: Path, predicate: (Path) -> Boolean = { true }): List<Path> {
    if (!Files.exists(rootDir)) return emptyList()
    return Files.walk(rootDir).use { stream -> stream.filter { Files.isRegularFile(it) && predicate(it) }.toList() }
}

val files = (
    walk(root.resolve("kubejs/data")) { it.toString().endsWith(".json") } +
    walk(root.resolve("config/classselector")) { it.toString().endsWith(".json") } +
    listOf(root.resolve("kubejs/config/bc_expert_graph_catalog.json"))
).filter(Files::exists).sortedBy { root.relativize(it).toString() }

val errors = mutableListOf<String>()
for (file in files) {
    try {
        JsonParser(Files.readString(file)).parse()
    } catch (error: Exception) {
        errors += "${root.relativize(file)}: ${error.message ?: error.javaClass.simpleName}"
    }
}

if (errors.isEmpty()) {
    println("ok - all repo JSON parses (${files.size} files)")
    exitProcess(0)
}

System.err.println("FAIL - all repo JSON parses")
System.err.println(errors.take(20).joinToString("\n"))
exitProcess(1)

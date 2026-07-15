#!/usr/bin/env kotlin
@file:DependsOn("org.mozilla:rhino:1.7.15")

import org.mozilla.javascript.CompilerEnvirons
import org.mozilla.javascript.ErrorReporter
import org.mozilla.javascript.EvaluatorException
import org.mozilla.javascript.Parser
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import kotlin.system.exitProcess

val root = Paths.get("").toAbsolutePath().normalize()

class CollectingReporter : ErrorReporter {
    val errors = mutableListOf<String>()
    override fun warning(message: String?, sourceName: String?, line: Int, lineSource: String?, lineOffset: Int) = Unit
    override fun error(message: String?, sourceName: String?, line: Int, lineSource: String?, lineOffset: Int) {
        errors += "${sourceName ?: "<unknown>"}:$line:$lineOffset ${message ?: "syntax error"}"
    }
    override fun runtimeError(message: String?, sourceName: String?, line: Int, lineSource: String?, lineOffset: Int): EvaluatorException =
        EvaluatorException(message, sourceName, line, lineSource, lineOffset)
}

fun walk(rootDir: Path, predicate: (Path) -> Boolean = { true }): List<Path> {
    if (!Files.exists(rootDir)) return emptyList()
    return Files.walk(rootDir).use { stream -> stream.filter { Files.isRegularFile(it) && predicate(it) }.toList() }
}

val files = (
    walk(root.resolve("kubejs")) { it.toString().endsWith(".js") } +
    walk(root.resolve("tools")) { it.toString().endsWith(".js") }
).sortedBy { root.relativize(it).toString() }

val reporter = CollectingReporter()
val env = CompilerEnvirons().apply {
    errorReporter = reporter
    languageVersion = org.mozilla.javascript.Context.VERSION_ES6
    isStrictMode = false
    isReservedKeywordAsIdentifier = true
}
val parser = Parser(env, reporter)
val collapsedBcKeywordPattern = Regex("\\b(?:return|in|throw|typeof|void|delete|await|yield)BC[A-Za-z0-9_]*\\b")
val lintErrors = mutableListOf<String>()

for (file in files) {
    val source = Files.readString(file)
    try {
        parser.parse(source, root.relativize(file).toString(), 1)
    } catch (_: Exception) {
        // reporter captures syntax errors; parse may still throw after reporting.
    }
    source.lineSequence().forEachIndexed { index, line ->
        collapsedBcKeywordPattern.findAll(line).forEach { match ->
            lintErrors += "${root.relativize(file)}:${index + 1}:${match.range.first + 1} collapsed JavaScript keyword and BC identifier: ${match.value}"
        }
    }
}

if (reporter.errors.isEmpty() && lintErrors.isEmpty()) {
    println("ok - all KubeJS JS parses with Rhino (${"%d".format(files.size)} files)")
    exitProcess(0)
}

System.err.println("FAIL - all KubeJS JS parses with Rhino")
System.err.println((reporter.errors + lintErrors).take(20).joinToString("\n"))
exitProcess(1)

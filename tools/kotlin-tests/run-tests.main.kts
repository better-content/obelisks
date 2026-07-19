#!/usr/bin/env kotlin

import java.io.ByteArrayOutputStream
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardCopyOption
import java.util.Comparator
import java.util.concurrent.TimeUnit
import kotlin.concurrent.thread
import kotlin.io.path.createDirectories
import kotlin.io.path.exists
import kotlin.system.exitProcess

data class TestCase(val name: String, val run: () -> Unit)

val root = Paths.get("").toAbsolutePath().normalize()
val testTempRoot = Paths.get(System.getProperty("user.home"), ".cache", "bc", "test-temp").toAbsolutePath().normalize()
val tests = mutableListOf<TestCase>()
val activeFilter = System.getenv("BC_KOTLIN_TEST_FILTER")?.trim()?.takeIf { it.isNotEmpty() }

fun createTestTempDirectory(prefix: String): Path {
    testTempRoot.createDirectories()
    return Files.createTempDirectory(testTempRoot, prefix)
}

fun test(name: String, block: () -> Unit) {
    if (activeFilter != null && !name.contains(activeFilter, ignoreCase = true)) return
    tests += TestCase(name, block)
}

// Retired runtime tests are deliberately not registered. Keep no runtime command
// invocation in the active Kotlin suite while the one-world replacement is designed.
fun retiredTest(name: String, block: () -> Unit) = Unit

fun runCommand(
    vararg args: String,
    workdir: Path = root,
    timeoutSeconds: Long = 300,
    extraEnv: Map<String, String> = emptyMap(),
): Pair<Int, String> {
    val process = ProcessBuilder(args.toList())
        .directory(workdir.toFile())
        .redirectErrorStream(true)
        .apply { environment().putAll(extraEnv) }
        .start()
    val buffer = ByteArrayOutputStream()
    val reader = thread(start = true, isDaemon = true, name = "bc-kotlin-test-reader") {
        process.inputStream.use { it.copyTo(buffer) }
    }
    if (!process.waitFor(timeoutSeconds, TimeUnit.SECONDS)) {
        process.destroy()
        if (!process.waitFor(10, TimeUnit.SECONDS)) {
            process.destroyForcibly()
            process.waitFor(10, TimeUnit.SECONDS)
        }
        reader.join(10_000)
        return 124 to buildString {
            appendLine("command timed out after ${timeoutSeconds}s: ${args.joinToString(" ")}")
            val output = buffer.toString(Charsets.UTF_8)
            if (output.isNotBlank()) append(output)
        }.trim()
    }
    reader.join(10_000)
    return process.exitValue() to buffer.toString(Charsets.UTF_8)
}

fun assertTrue(value: Boolean, message: String) {
    if (!value) error(message)
}

fun assertContains(text: String, needle: String, message: String) {
    assertTrue(text.contains(needle), "$message\nMissing: $needle\nOutput:\n$text")
}

fun assertNotContains(text: String, needle: String, message: String) {
    assertTrue(!text.contains(needle), "$message\nUnexpected: $needle\nOutput:\n$text")
}

fun deleteTree(path: Path) {
    if (!Files.exists(path)) return
    Files.walk(path).use { stream ->
        stream.sorted(Comparator.reverseOrder()).forEach { Files.deleteIfExists(it) }
    }
}

fun parseJson(text: String): Any? {
    class JsonParser(private val raw: String) {
        private var index = 0

        fun parse(): Any? {
            skipWhitespace()
            val value = parseValue()
            skipWhitespace()
            if (index != raw.length) error("unexpected trailing JSON content at index $index")
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
fun jsonString(value: Any?): String? = value as? String
fun jsonNumber(value: Any?): Number? = value as? Number
fun jsonArray(value: Any?): List<Any?> = value as? List<Any?> ?: emptyList()

fun readJson(path: Path): Map<String, Any?> = jsonObject(parseJson(Files.readString(path)))
fun parseJsonObject(text: String): Map<String, Any?> = jsonObject(parseJson(text))

fun waitForHarnessRunDir(harnessRoot: Path, timeoutMs: Long = 10_000): Path {
    val deadline = System.currentTimeMillis() + timeoutMs
    while (System.currentTimeMillis() < deadline) {
        val lockPath = Files.walk(harnessRoot).use { stream ->
            stream.filter { it.fileName.toString() == "lock.json" }.findFirst().orElse(null)
        }
        if (lockPath != null) return lockPath.parent
        Thread.sleep(100)
    }
    error("timed out waiting for harness lock under $harnessRoot")
}

fun copyTree(source: Path, target: Path) {
    Files.walk(source).use { stream ->
        stream.forEach { current ->
            val relative = source.relativize(current)
            val destination = if (relative.toString().isEmpty()) target else target.resolve(relative.toString())
            if (Files.isDirectory(current)) {
                destination.createDirectories()
            } else {
                destination.parent?.createDirectories()
                Files.copy(current, destination, StandardCopyOption.REPLACE_EXISTING)
            }
        }
    }
}

fun startBackground(
    args: List<String>,
    workdir: Path = root,
    extraEnv: Map<String, String> = emptyMap(),
): Process {
    return ProcessBuilder(args)
        .directory(workdir.toFile())
        .redirectErrorStream(true)
        .apply { environment().putAll(extraEnv) }
        .start()
}

fun ephemeralPort(): Int = java.net.ServerSocket(0).use { it.localPort }

fun firstHarnessRunDir(harnessRoot: Path): Path =
    Files.list(harnessRoot).use { entries ->
        entries
            .filter { Files.isDirectory(it) }
            .filter { it.fileName.toString() != "port-reservations" }
            .filter { Files.exists(it.resolve("status.json")) || Files.exists(it.resolve("lock.json")) }
            .findFirst()
            .orElseThrow { IllegalStateException("missing harness run directory under $harnessRoot") }
    }

fun harnessOwnerPid(harnessRoot: Path): Long =
    jsonNumber(readJson(firstHarnessRunDir(harnessRoot).resolve("lock.json"))["pid"])?.toLong()
        ?: error("missing harness owner pid under $harnessRoot")

fun terminateHarnessOwner(harnessRoot: Path, force: Boolean) {
    val pid = harnessOwnerPid(harnessRoot)
    val handle = ProcessHandle.of(pid).orElse(null) ?: return
    if (force) handle.destroyForcibly() else handle.destroy()
    handle.onExit().get(10, TimeUnit.SECONDS)
}

test("help shows public commands") {
    val (exit, output) = runCommand("tools/bc", "--help")
    assertTrue(exit == 0, "help should exit 0, got $exit")
    assertContains(output, "tools/bc test fast", "help should list fast test")
    assertContains(output, "tools/bc test static", "help should list static test")
    assertContains(output, "tools/bc test kotlin", "help should list Kotlin tests")
    assertContains(output, "tools/bc test smoke", "help should list the single-world smoke")
    assertNotContains(output, "tools/bc test scenario", "help must not list removed runtime scenarios")
    assertContains(output, "tools/bc build sync server", "help should list build sync server")
    assertContains(output, "tools/bc build bundle release", "help should list tested release bundles")
    assertContains(output, "tools/bc graph item ITEM_ID", "help should list graph item")
    assertContains(output, "tools/bc graph route ITEM_ID", "help should list graph route")
    assertContains(output, "tools/bc doctor env", "help should list doctor env")
}

test("release bundle help is bounded") {
    val (helpExit, helpOutput) = runCommand("tools/bc", "build", "bundle", "release", "--help")
    assertTrue(helpExit == 0, "release bundle help should exit 0, got $helpExit")
    assertContains(helpOutput, "refreshes packwiz metadata", "release help should describe manifest refresh")
    assertContains(helpOutput, "reserves the next persistent Playtest version", "release help should describe automatic versioning")
    assertContains(helpOutput, "better-content-playtest-v<N>-{curseforge,server}.zip", "release help should describe paired versioned archive names")
    assertNotContains(helpOutput, "fresh server smoke", "release help must not claim runtime validation")
}

test("graph help shows subcommands") {
    val (exit, output) = runCommand("tools/bc", "graph", "--help")
    assertTrue(exit == 0, "graph help should exit 0, got $exit")
    assertContains(output, "Usage: tools/bc graph <item|route|blockers>", "graph help should show graph usage")
    assertContains(output, "item ITEM_ID", "graph help should show item subcommand")
    assertContains(output, "route ITEM_ID", "graph help should show route subcommand")
    assertContains(output, "blockers ITEM_ID", "graph help should show blockers subcommand")
}

test("graph item without id is usage error") {
    val (exit, output) = runCommand("tools/bc", "graph", "item")
    assertTrue(exit == 2, "graph item without id should exit 2, got $exit")
    assertContains(output, "graph item requires ITEM_ID", "graph item usage error should be specific")
}

test("graph item json returns producer and consumer counts") {
    val (exit, output) = runCommand("tools/bc", "--json", "graph", "item", "minecraft:glass")
    assertTrue(exit == 0, "graph item json should exit 0, got $exit")
    val json = parseJsonObject(output)
    val details = jsonObject(json["details"])
    assertTrue(jsonString(json["command"]) == "graph item", "graph item json should identify its command: $json")
    assertTrue(jsonString(json["status"]) == "success", "graph item json should report success: $json")
    assertTrue(jsonString(details["item"]) == "minecraft:glass", "graph item json should report the item: $json")
    assertTrue(jsonNumber(details["producerCount"]) != null, "graph item json should report producerCount: $json")
    assertTrue(jsonNumber(details["consumerCount"]) != null, "graph item json should report consumerCount: $json")
}

test("graph route json returns a structured route") {
    val (exit, output) = runCommand("tools/bc", "--json", "graph", "route", "kubejs:seared_machine_casing")
    assertTrue(exit == 0, "graph route json should exit 0, got $exit")
    val json = parseJsonObject(output)
    val details = jsonObject(json["details"])
    val route = jsonArray(details["route"])
    assertTrue(jsonString(json["command"]) == "graph route", "graph route json should identify its command: $json")
    assertTrue(details["reachable"] == true, "graph route json should report reachability: $json")
    assertTrue(route.isNotEmpty(), "graph route json should include a non-empty route array: $json")
    assertTrue(
        route.any { step ->
            when (step) {
                is Map<*, *> -> step.values.any { it == "kubejs:seared_machine_casing" }
                is String -> step == "kubejs:seared_machine_casing"
                else -> false
            }
        },
        "graph route json should include the target route step: $json",
    )
}

test("graph blockers json returns explicit blocker data") {
    val (exit, output) = runCommand("tools/bc", "--json", "graph", "blockers", "minecraft:bedrock")
    assertTrue(exit == 0, "graph blockers json should exit 0, got $exit")
    assertContains(output, "\"command\":\"graph blockers\"", "graph blockers json should identify its command")
    assertContains(output, "\"item\":\"minecraft:bedrock\"", "graph blockers json should report the item")
    assertTrue(
        output.contains("\"reachable\":true") || output.contains("\"blockers\":["),
        "graph blockers json should include either an explicit reachable response or a blockers array\nOutput:\n$output",
    )
    if (output.contains("\"reachable\":false")) {
        assertTrue(
            output.contains("\"kind\":\"no-producer\"") || output.contains("\"kind\":\"candidate\""),
            "graph blockers json should include either no-producer or candidate blockers when unreachable\nOutput:\n$output",
        )
    }
}

retiredTest("runtime without instance is usage error") {
    val (exit, output) = runCommand("tools/bc", "test", "runtime")
    assertTrue(exit == 2, "runtime without instance should exit 2, got $exit")
    assertContains(output, "test runtime requires --instance PATH", "runtime usage error should be specific")
}

retiredTest("Unearthed replacement without a world is usage error") {
    val (exit, output) = runCommand("tools/bc", "test", "unearthed-replacement")
    assertTrue(exit == 2, "Unearthed replacement without a world should exit 2, got $exit")
    assertContains(output, "requires --instance PATH or --world PATH", "Unearthed replacement usage error should be specific")
}

retiredTest("scenario help shows scenarios") {
    val (exit, output) = runCommand("tools/bc", "test", "scenario", "--help")
    assertTrue(exit == 0, "scenario help should exit 0, got $exit")
    assertContains(output, "fast [--repo ID|PATH] [--list-repos]", "scenario help should show fast usage")
    assertContains(output, "full [--workspace [--repo ID|PATH] [--list-repos]]", "scenario help should show full workspace usage")
    assertContains(output, "--bootstrap-mode always|once|never", "scenario help should show bootstrap mode")
    assertContains(output, "Scenarios:", "scenario help should list scenarios")
    assertContains(output, "opening_progression", "scenario help should include opening_progression")
    assertContains(output, "worldgen_sampling", "scenario help should include worldgen_sampling")
}

test("fast repo listing shows workspace inventory") {
    val (exit, output) = runCommand("tools/bc", "test", "fast", "--list-repos")
    assertTrue(exit == 0, "test fast --list-repos should exit 0, got $exit")
    assertContains(output, "workspace fast repo selection:", "fast listing should show repo heading")
    assertContains(output, "pack", "fast listing should include pack")
    assertContains(output, "better-content-fixes", "fast listing should include nested repos")
}

retiredTest("full repo listing honors repo filters and meaningful full lanes") {
    val (exit, output) = runCommand("tools/bc", "test", "full", "--workspace", "--list-repos", "--repo", "pack", "--repo", "class-selector")
    assertTrue(exit == 0, "test full --workspace --list-repos with filters should exit 0, got $exit")
    assertContains(output, "pack", "filtered full listing should include pack")
    assertContains(output, "class-selector", "filtered full listing should include selected repo")
    assertNotContains(output, "rpg-stats", "filtered full listing should exclude unselected repos")
}

retiredTest("full repo listing without workspace flag is a usage error") {
    val (exit, output) = runCommand("tools/bc", "test", "full", "--list-repos")
    assertTrue(exit == 2, "test full --list-repos without --workspace should exit 2, got $exit")
    assertContains(output, "test full workspace selection requires --workspace", "full listing without --workspace should explain the requirement")
}

test("unknown workspace repo filter is a usage error") {
    val (exit, output) = runCommand("tools/bc", "test", "fast", "--list-repos", "--repo", "not-a-real-repo")
    assertTrue(exit == 2, "unknown workspace repo filter should exit 2, got $exit")
    assertContains(output, "unknown repo filter(s): not-a-real-repo", "unknown repo filter error should be specific")
}

retiredTest("unknown scenario is a usage error") {
    val (exit, output) = runCommand("tools/bc", "test", "scenario", "not_a_real_scenario")
    assertTrue(exit == 2, "unknown scenario should exit 2, got $exit")
    assertContains(output, "unknown scenario: not_a_real_scenario", "unknown scenario error should be specific")
}

retiredTest("multiple scenario cycles are rejected") {
    val (exit, output) = runCommand("tools/bc", "test", "scenario", "opening_progression", "--cycles", "2")
    assertTrue(exit == 2, "multiple cycles should exit 2, got $exit")
    assertContains(output, "use --cycles 1", "multiple cycles should explain the one-world limit")
}

test("doctor repo succeeds") {
    val (exit, output) = runCommand("tools/bc", "doctor", "repo")
    assertTrue(exit == 0, "doctor repo should exit 0, got $exit")
    assertContains(output, "repo check passed", "doctor repo should pass")
}

test("build sync server dry-run works") {
    val temp = createTestTempDirectory("bc-kotlin-test-sync-server")
    try {
        val (exit, output) = runCommand("tools/bc", "--json", "build", "sync", "server", "--dir", temp.toString(), "--dry-run")
        assertTrue(exit == 0, "server sync dry-run should exit 0, got $exit")
        assertContains(output, "\"status\":\"success\"", "server sync dry-run should report success JSON")
        assertContains(output, "\"command\":\"build sync server\"", "server sync dry-run should identify its command")
        assertTrue(Files.list(temp).use { !it.findAny().isPresent }, "server sync dry-run should not populate destination $temp")
    } finally {
        deleteTree(temp)
    }
}

test("build sync client dry-run works") {
    val temp = createTestTempDirectory("bc-kotlin-test-sync-client")
    try {
        val (exit, output) = runCommand("tools/bc", "--json", "build", "sync", "client", "--dir", temp.toString(), "--dry-run")
        assertTrue(exit == 0, "client sync dry-run should exit 0, got $exit")
        assertContains(output, "\"status\":\"success\"", "client sync dry-run should report success JSON")
        assertContains(output, "\"command\":\"build sync client\"", "client sync dry-run should identify its command")
        assertTrue(Files.list(temp).use { !it.findAny().isPresent }, "client sync dry-run should not populate destination $temp")
    } finally {
        deleteTree(temp)
    }
}

test("public static lane passes") {
    val (exit, output) = runCommand("tools/bc", "--json", "test", "static", timeoutSeconds = 900)
    assertTrue(exit == 0, "test static should exit 0, got $exit")
    assertContains(output, "\"status\":\"success\"", "test static should report success JSON")
    assertContains(output, "\"command\":\"test static\"", "test static should identify its command")
    assertContains(output, "\"evidenceLevel\":\"source\"", "test static should report source evidence")
}

test("single-world smoke validates bounded options without launching") {
    val (badIdleExit, badIdleOutput) = runCommand("tools/bc", "test", "smoke", "--idle-seconds", "301")
    assertTrue(badIdleExit == 2, "smoke should reject an out-of-range idle duration, got $badIdleExit")
    assertContains(badIdleOutput, "--idle-seconds must be between 0 and 300", "smoke should report its idle bound")
    val (badBootstrapExit, badBootstrapOutput) = runCommand("tools/bc", "test", "smoke", "--bootstrap-mode", "twice")
    assertTrue(badBootstrapExit == 2, "smoke should reject invalid bootstrap mode, got $badBootstrapExit")
    assertContains(badBootstrapOutput, "invalid bootstrap mode: twice", "smoke should report invalid bootstrap mode")
}

test("public fast lane passes when recursive kotlin step is disabled") {
    val (exit, output) = runCommand(
        "tools/bc",
        "--json",
        "test",
        "fast",
        "--repo",
        "pack",
        timeoutSeconds = 900,
        extraEnv = mapOf("BC_SKIP_KOTLIN_TESTS" to "1"),
    )
    assertTrue(exit == 0, "test fast --repo pack should exit 0 with kotlin recursion disabled, got $exit")
    assertContains(output, "\"status\":\"success\"", "test fast should report success JSON")
    assertContains(output, "\"command\":\"test fast\"", "test fast should identify its command")
    assertContains(output, "workspace fast passed for 1 repo(s)", "test fast should report passing workspace summary")
}

test("doctor runtime without instance is usage error") {
    val (exit, output) = runCommand("tools/bc", "doctor", "runtime")
    assertTrue(exit == 2, "doctor runtime without instance should exit 2, got $exit")
    assertContains(output, "doctor runtime requires --instance PATH", "doctor runtime usage error should be specific")
}

test("doctor runtime accepts a minimal runtime shape") {
    val temp = createTestTempDirectory("bc-kotlin-test-runtime-doctor")
    try {
        temp.resolve("mods").createDirectories()
        temp.resolve("logs").createDirectories()
        temp.resolve("kubejs/config").createDirectories()
        Files.writeString(temp.resolve("logs/latest.log"), "")
        Files.writeString(temp.resolve("run.sh"), "placeholder\n")
        val (exit, output) = runCommand("tools/bc", "doctor", "runtime", "--instance", temp.toString())
        assertTrue(exit == 0, "doctor runtime should exit 0 for a minimal runtime shape, got $exit")
        assertContains(output, "runtime check passed", "doctor runtime should report a passing summary")
    } finally {
        deleteTree(temp)
    }
}

retiredTest("smoke rejects non-numeric port") {
    val (exit, output) = runCommand("tools/bc", "test", "smoke", "--port", "abc")
    assertTrue(exit == 2, "smoke with non-numeric port should exit 2, got $exit")
    assertContains(output, "--port needs a number", "smoke should reject non-numeric ports")
}

test("runtime mod prune removes source jars") {
    val temp = createTestTempDirectory("bc-kotlin-test-prune-runtime-mods")
    val dest = temp.resolve("mods/synthetic-fixture-sources.jar")
    try {
        Files.createDirectories(dest.parent)
        Files.write(dest, byteArrayOf())
        val (exit, output) = runCommand("tools/bc", "internal", "prune-runtime-mods", "--target-dir", temp.toString(), "--side", "server", "--apply")
        assertTrue(exit == 1, "internal prune-runtime-mods should report missing expected runtime mods on an incomplete temp dir, got $exit")
        assertTrue(!Files.exists(dest), "prune-runtime-mods should remove source jars from runtime mods")
        assertContains(output, "runtime mod prune:", "prune-runtime-mods should report runtime mod summary")
    } finally {
        deleteTree(temp)
    }
}

test("internal kotlin tool surface validator runs through bc") {
    val (exit, output) = runCommand("tools/bc", "internal", "validate-kotlin-tool-surface")
    assertTrue(exit == 0, "internal validate-kotlin-tool-surface should exit 0, got $exit")
    assertContains(output, "kotlin tool surface validates", "internal validate-kotlin-tool-surface should report validator summary")
}

retiredTest("internal worldgen sampling contract validator runs through bc") {
    val (exit, output) = runCommand("tools/bc", "internal", "validate-worldgen-sampling-contracts")
    assertTrue(exit == 0, "internal validate-worldgen-sampling-contracts should exit 0, got $exit")
    assertContains(output, "worldgen sampling contracts validate", "worldgen sampling contract validator should report success")
}

test("internal kubejs assets validator runs through bc") {
    val (exit, output) = runCommand("tools/bc", "internal", "validate-kubejs-assets")
    assertTrue(exit == 0, "internal validate-kubejs-assets should exit 0, got $exit")
    assertContains(output, "kubejs assets validate", "internal validate-kubejs-assets should report validator summary")
}

test("internal autonomous contracts validator runs through bc") {
    val (exit, output) = runCommand("tools/bc", "internal", "validate-autonomous-contracts")
    assertTrue(exit == 0, "internal validate-autonomous-contracts should exit 0, got $exit")
    assertContains(output, "autonomous contract validators:", "internal validate-autonomous-contracts should report validator summary")
    assertContains(output, "0 hard failure(s)", "internal validate-autonomous-contracts should report no hard failures")
}

test("internal pack contract validator runs through bc") {
    val (exit, output) = runCommand("tools/bc", "internal", "validate-pack-contract")
    assertTrue(exit in setOf(0, 1), "internal validate-pack-contract should exit 0 or 1, got $exit")
    assertContains(output, "pack contract audit:", "internal validate-pack-contract should report contract audit summary")
}

test("internal contract completeness report runs through bc") {
    val (exit, output) = runCommand("tools/bc", "internal", "contract-completeness-report", "--check", "--no-write")
    assertTrue(exit == 0, "internal contract-completeness-report --check --no-write should exit 0, got $exit")
    assertContains(output, "contract completeness:", "internal contract-completeness-report should report classification summary")
}

test("internal realistic hands validator runs through bc") {
    val (exit, output) = runCommand("tools/bc", "internal", "validate-realistic-hands")
    assertTrue(exit == 0, "internal validate-realistic-hands should exit 0, got $exit")
    assertContains(output, "Realistic Hands validates", "internal validate-realistic-hands should report validator summary")
}

test("internal dynamic trees coverage validator runs through bc") {
    val (exit, output) = runCommand("tools/bc", "internal", "validate-dynamic-trees-coverage")
    assertTrue(exit == 0, "internal validate-dynamic-trees-coverage should exit 0, got $exit")
    assertContains(output, "Dynamic Trees coverage validates", "internal validate-dynamic-trees-coverage should report validator summary")
}

test("internal js syntax check runs through bc") {
    val (exit, output) = runCommand("tools/bc", "internal", "check-js-syntax")
    assertTrue(exit == 0, "internal check-js-syntax should exit 0, got $exit")
    assertContains(output, "Rhino", "internal check-js-syntax should report Rhino-based syntax validation")
}

test("internal json surface check runs through bc") {
    val (exit, output) = runCommand("tools/bc", "internal", "check-json-surface")
    assertTrue(exit == 0, "internal check-json-surface should exit 0, got $exit")
    assertContains(output, "all repo JSON parses", "internal check-json-surface should report JSON surface validation")
}

test("internal BetterGrassify grass block validator runs through bc") {
    val (exit, output) = runCommand("tools/bc", "internal", "validate-bettergrassify-grass-blocks")
    assertTrue(exit == 0, "internal validate-bettergrassify-grass-blocks should exit 0, got $exit")
    assertContains(output, "BetterGrassify grass block coverage validates", "internal validate-bettergrassify-grass-blocks should report validator summary")
}

test("internal burnt sync check runs through bc") {
    val (exit, output) = runCommand("tools/bc", "internal", "sync-burnt-coverage-tags", "--check")
    assertTrue(exit == 0, "internal sync-burnt-coverage-tags --check should exit 0, got $exit")
    assertContains(output, "missing_rows", "internal sync-burnt-coverage-tags should report missing_rows")
}

test("internal chemistry identity validator runs through bc") {
    val (exit, output) = runCommand("tools/bc", "internal", "validate-chemistry-identity")
    assertTrue(exit == 0, "internal validate-chemistry-identity should exit 0, got $exit")
    assertContains(output, "chemistry identity matrix validates", "internal validate-chemistry-identity should report validator summary")
}

test("internal player progression contracts validator runs through bc") {
    val (exit, output) = runCommand("tools/bc", "internal", "validate-player-progression-contracts")
    assertTrue(exit == 0, "internal validate-player-progression-contracts should exit 0, got $exit")
    assertContains(output, "player progression contract validators:", "internal validate-player-progression-contracts should report validator summary")
}

test("internal LC TFTH DH contract validator runs through bc") {
    val (exit, output) = runCommand("tools/bc", "internal", "validate-lc-tfth-dh-contracts")
    assertTrue(exit == 0, "internal validate-lc-tfth-dh-contracts should exit 0, got $exit")
    assertContains(output, "LC/C2ME/DH contract validators:", "internal validate-lc-tfth-dh-contracts should report validator summary")
}

test("no active python or shell source files remain under tools") {
    val offenders = Files.walk(root.resolve("tools")).use { stream ->
        stream
            .filter { Files.isRegularFile(it) }
            .filter { !it.startsWith(root.resolve("tools/quarantine")) }
            .map { root.relativize(it).toString().replace('\\', '/') }
            .filter { it.endsWith(".py") || it.endsWith(".sh") }
            .toList()
    }
    assertTrue(offenders.isEmpty(), "active tools surface should not contain .py or .sh files: $offenders")
}

retiredTest("worldgen sampling rejects invalid profile with usage error") {
    val (exit, output) = runCommand("tools/bc", "test", "scenario", "worldgen_sampling", "--profile", "bad")
    assertTrue(exit == 2, "worldgen_sampling with invalid profile should exit 2, got $exit")
    assertContains(output, "invalid profile: bad", "worldgen_sampling should reject invalid profile")
}

retiredTest("opening progression rejects invalid bootstrap mode with usage error") {
    val harnessRoot = createTestTempDirectory("bc-kotlin-test-opening-invalid-bootstrap-harness")
    val runRoot = createTestTempDirectory("bc-kotlin-test-opening-invalid-bootstrap-run")
    try {
        val (exit, output) = runCommand(
            "tools/bc",
            "test",
            "scenario",
            "opening_progression",
            "--bootstrap-mode",
            "bad",
            "--run-root",
            runRoot.toString(),
            extraEnv = mapOf("BC_HARNESS_ROOT" to harnessRoot.toString()),
        )
        assertTrue(exit == 2, "opening_progression with invalid bootstrap mode should exit 2, got $exit")
        assertContains(output, "invalid bootstrap mode: bad", "opening_progression should reject invalid bootstrap mode")
    } finally {
        deleteTree(harnessRoot)
        deleteTree(runRoot)
    }
}

test("fast duplicate invocation fails immediately with harness diagnostics") {
    val harnessRoot = createTestTempDirectory("bc-kotlin-test-harness-fast-dup")
    val process = startBackground(
        listOf("tools/bc", "test", "fast", "--repo", "pack"),
        extraEnv = mapOf(
            "BC_HARNESS_ROOT" to harnessRoot.toString(),
            "BC_TEST_WORKSPACE_STUB_MODE" to "pass",
            "BC_TEST_WORKSPACE_STUB_SLEEP_MS" to "4000",
        ),
    )
    try {
        waitForHarnessRunDir(harnessRoot)
        val (exit, output) = runCommand(
            "tools/bc",
            "test",
            "fast",
            "--repo",
            "pack",
            extraEnv = mapOf(
                "BC_HARNESS_ROOT" to harnessRoot.toString(),
                "BC_TEST_WORKSPACE_STUB_MODE" to "pass",
                "BC_TEST_WORKSPACE_STUB_SLEEP_MS" to "4000",
            ),
        )
        assertTrue(exit == 1, "second fast invocation should fail with active lock, got $exit")
        assertContains(output, "active run already holds this harness lock", "duplicate fast run should report harness lock")
        assertContains(output, "status=", "duplicate fast run should include status path diagnostics")
    } finally {
        if (Files.exists(harnessRoot) && Files.list(harnessRoot).use { it.findAny().isPresent }) {
            runCatching { terminateHarnessOwner(harnessRoot, force = true) }
        }
        process.destroyForcibly()
        process.waitFor(10, TimeUnit.SECONDS)
        deleteTree(harnessRoot)
    }
}

retiredTest("full workspace writes repo progress into status and summary") {
    val harnessRoot = createTestTempDirectory("bc-kotlin-test-harness-full-progress")
    try {
        val (exit, output) = runCommand(
            "tools/bc",
            "test",
            "full",
            "--workspace",
            "--repo",
            "pack",
            extraEnv = mapOf(
                "BC_HARNESS_ROOT" to harnessRoot.toString(),
                "BC_TEST_WORKSPACE_STUB_MODE" to "pass",
                "BC_TEST_WORKSPACE_STUB_SLEEP_MS" to "50",
            ),
        )
        assertTrue(exit == 0, "workspace full should succeed under stub mode, got $exit")
        assertContains(output, "==> [1/1] pack", "workspace full should report repo progress")
        assertContains(output, "PASS pack", "workspace full should report repo success")
        val statusPath = firstHarnessRunDir(harnessRoot).resolve("status.json")
        val summaryPath = statusPath.parent.resolve("summary.json")
        val status = readJson(statusPath)
        val summary = readJson(summaryPath)
        assertTrue(jsonString(status["status"]) == "passed", "workspace full status should finish passed: $status")
        assertTrue(jsonString(summary["status"]) == "passed", "workspace full summary should finish passed: $summary")
        assertTrue(jsonArray(summary["repo_runs"]).isNotEmpty(), "workspace full summary should record repo runs")
    } finally {
        deleteTree(harnessRoot)
    }
}

retiredTest("smoke auto-remaps occupied ports and records requested and actual port") {
    val harnessRoot = createTestTempDirectory("bc-kotlin-test-harness-smoke-port")
    val runtimeDir = createTestTempDirectory("bc-kotlin-test-smoke-runtime")
    val requestedPort = ephemeralPort()
    java.net.ServerSocket(requestedPort).use { _ ->
        val (exit, output) = runCommand(
            "tools/bc",
            "test",
            "smoke",
            "--server-dir",
            runtimeDir.toString(),
            "--port",
            requestedPort.toString(),
            extraEnv = mapOf(
                "BC_HARNESS_ROOT" to harnessRoot.toString(),
                "BC_TEST_FAKE_SMOKE" to "1",
            ),
        )
        assertTrue(exit == 0, "smoke should auto-remap occupied port, got $exit")
        assertContains(output, "using ", "smoke should report remapped port")
    }
    try {
        val statusPath = firstHarnessRunDir(harnessRoot).resolve("status.json")
        val summaryPath = statusPath.parent.resolve("summary.json")
        val status = readJson(statusPath)
        val summary = readJson(summaryPath)
        val actualPort = jsonNumber(status["actual_port"])?.toInt()
        assertTrue(jsonNumber(status["requested_port"])?.toInt() == requestedPort, "smoke status should record requested port: $status")
        assertTrue(actualPort != null && actualPort != requestedPort, "smoke status should record a remapped actual port: $status")
        assertTrue(actualPort in (requestedPort + 1)..(requestedPort + 50), "smoke actual port should stay within remap window: $status")
        assertTrue(jsonNumber(summary["actual_port"])?.toInt() == actualPort, "smoke summary should record the same remapped actual port: $summary")
    } finally {
        deleteTree(harnessRoot)
        deleteTree(runtimeDir)
    }
}

retiredTest("local validation runtimes use a deterministic world seed") {
    val source = Files.readString(root.resolve("tools/bc.main.kts"))
    assertContains(
        source,
        "level-seed=better-content-validation-v1",
        "local smoke bootstraps should pin a deterministic validation seed",
    )
    assertContains(
        source,
        ".filterNot { onlineMode && it.startsWith(\"level-seed=\") }",
        "published authenticated server bundles must not force the validation seed",
    )
}

retiredTest("smoke startup timeouts capture JVM diagnostics") {
    val source = Files.readString(root.resolve("tools/bc.main.kts"))
    for (artifact in listOf("thread-dump.txt", "heap-info.txt", "native-memory-summary.txt", "process-status.txt")) {
        assertContains(source, artifact, "smoke timeout diagnostics should include $artifact")
    }
    assertContains(
        source,
        "captureSmokeStartupDiagnostics(running, evidenceDir)",
        "the smoke timeout path should capture diagnostics before stopping the server",
    )
}

retiredTest("opening progression remaps occupied ports and refreshes latest status artifacts") {
    val harnessRoot = createTestTempDirectory("bc-kotlin-test-harness-opening-pass")
    val runRoot = createTestTempDirectory("bc-kotlin-test-opening-pass")
    val requestedPort = ephemeralPort()
    java.net.ServerSocket(requestedPort).use { _ ->
        val (exit, output) = runCommand(
            "tools/bc",
            "test",
            "scenario",
            "opening_progression",
            "--cycles",
            "1",
            "--port",
            requestedPort.toString(),
            "--run-root",
            runRoot.toString(),
            extraEnv = mapOf(
                "BC_HARNESS_ROOT" to harnessRoot.toString(),
                "BC_TEST_OPENING_PROGRESS_FAKE" to "pass",
            ),
        )
        assertTrue(exit == 0, "opening_progression should succeed under fake mode, got $exit")
        assertContains(output, "using ", "opening_progression should report remapped port")
    }
    try {
        val latestStatus = runRoot.resolve("latest-status.json")
        val latestSummary = runRoot.resolve("latest-summary.json")
        assertTrue(latestStatus.exists(), "opening_progression should refresh latest-status.json")
        assertTrue(latestSummary.exists(), "opening_progression should refresh latest-summary.json")
        val summary = readJson(latestSummary)
        val cycles = jsonArray(summary["cycles"])
        val actualPort = jsonNumber(summary["actual_port"])?.toInt()
        assertTrue(jsonString(summary["status"]) == "passed", "opening_progression summary should pass: $summary")
        assertTrue(actualPort != null && actualPort != requestedPort, "opening_progression summary should record a remapped port: $summary")
        assertTrue(actualPort in (requestedPort + 1)..(requestedPort + 50), "opening_progression summary should keep remapped port in range: $summary")
        assertTrue(cycles.isNotEmpty(), "opening_progression summary should include cycle results")
    } finally {
        deleteTree(harnessRoot)
        deleteTree(runRoot)
    }
}

test("stale lock with dead pid is reclaimed automatically") {
    val harnessRoot = createTestTempDirectory("bc-kotlin-test-harness-stale-lock")
    val process = startBackground(
        listOf("tools/bc", "test", "fast", "--repo", "pack"),
        extraEnv = mapOf(
            "BC_HARNESS_ROOT" to harnessRoot.toString(),
            "BC_TEST_WORKSPACE_STUB_MODE" to "pass",
            "BC_TEST_WORKSPACE_STUB_SLEEP_MS" to "15000",
        ),
    )
    try {
        waitForHarnessRunDir(harnessRoot)
        terminateHarnessOwner(harnessRoot, force = true)
        process.destroyForcibly()
        process.waitFor(10, TimeUnit.SECONDS)
        val (exit, output) = runCommand(
            "tools/bc",
            "test",
            "fast",
            "--repo",
            "pack",
            extraEnv = mapOf(
                "BC_HARNESS_ROOT" to harnessRoot.toString(),
                "BC_TEST_WORKSPACE_STUB_MODE" to "pass",
                "BC_TEST_WORKSPACE_STUB_SLEEP_MS" to "10",
            ),
        )
        assertTrue(exit == 0, "fast run should reclaim stale lock, got $exit")
        assertContains(output, "workspace fast passed for 1 repo(s)", "fast run should continue after stale lock reclaim")
    } finally {
        deleteTree(harnessRoot)
    }
}

retiredTest("opening progression failure writes final summary with phase reason and evidence path") {
    val harnessRoot = createTestTempDirectory("bc-kotlin-test-harness-opening-fail")
    val runRoot = createTestTempDirectory("bc-kotlin-test-opening-fail")
    try {
        val (exit, _) = runCommand(
            "tools/bc",
            "test",
            "scenario",
            "opening_progression",
            "--cycles",
            "1",
            "--run-root",
            runRoot.toString(),
            extraEnv = mapOf(
                "BC_HARNESS_ROOT" to harnessRoot.toString(),
                "BC_TEST_OPENING_PROGRESS_FAKE" to "fail",
            ),
        )
        assertTrue(exit == 1, "opening_progression fake failure should exit 1, got $exit")
        val summary = readJson(runRoot.resolve("latest-summary.json"))
        val cycles = jsonArray(summary["cycles"]).map(::jsonObject)
        assertTrue(jsonString(summary["status"]) == "failed", "opening_progression summary should fail: $summary")
        assertTrue(cycles.isNotEmpty(), "opening_progression failure should record cycles")
        val cycle = cycles.first()
        assertTrue(jsonString(cycle["status"]) == "failed", "cycle should record failure: $cycle")
        assertTrue(!jsonString(cycle["failure_reason"]).isNullOrBlank(), "cycle failure should include reason: $cycle")
        val evidenceDir = jsonString(cycle["evidence_dir"])
        assertTrue(!evidenceDir.isNullOrBlank(), "cycle failure should include evidence dir: $cycle")
        assertTrue(Path.of(evidenceDir!!).exists(), "cycle evidence dir should exist: $cycle")
    } finally {
        deleteTree(harnessRoot)
        deleteTree(runRoot)
    }
}

test("interrupt clears lock ownership and leaves final aborted status") {
    val harnessRoot = createTestTempDirectory("bc-kotlin-test-harness-interrupt")
    val process = startBackground(
        listOf("tools/bc", "test", "fast", "--repo", "pack"),
        extraEnv = mapOf(
            "BC_HARNESS_ROOT" to harnessRoot.toString(),
            "BC_TEST_WORKSPACE_STUB_MODE" to "pass",
            "BC_TEST_WORKSPACE_STUB_SLEEP_MS" to "15000",
        ),
    )
    try {
        val deadline = System.currentTimeMillis() + 10_000
        while (System.currentTimeMillis() < deadline && Files.list(harnessRoot).use { !it.findAny().isPresent }) {
            Thread.sleep(100)
        }
        terminateHarnessOwner(harnessRoot, force = false)
        process.destroy()
        process.waitFor(10, TimeUnit.SECONDS)
        val runDir = firstHarnessRunDir(harnessRoot)
        val lockPath = runDir.resolve("lock.json")
        val lockDeadline = System.currentTimeMillis() + 10_000
        while (System.currentTimeMillis() < lockDeadline && lockPath.exists()) {
            Thread.sleep(100)
        }
        val status = readJson(runDir.resolve("status.json"))
        assertTrue(jsonString(status["status"]) == "aborted", "interrupted fast run should leave aborted status: $status")
        assertTrue(!lockPath.exists(), "interrupted fast run should clear lock ownership")
    } finally {
        runCatching { if (Files.exists(harnessRoot) && Files.list(harnessRoot).use { it.findAny().isPresent }) terminateHarnessOwner(harnessRoot, force = true) }
        process.destroyForcibly()
        process.waitFor(5, TimeUnit.SECONDS)
        deleteTree(harnessRoot)
    }
}

retiredTest("worldgen sampling rejects invalid bootstrap mode with usage error") {
    val (exit, output) = runCommand("tools/bc", "test", "scenario", "worldgen_sampling", "--profile", "quick", "--bootstrap-mode", "bad")
    assertTrue(exit == 2, "worldgen_sampling with invalid bootstrap mode should exit 2, got $exit")
    assertContains(output, "invalid bootstrap mode: bad", "worldgen_sampling should reject invalid bootstrap mode")
}

test("kotlin test filter runs only matching cases") {
    val (exit, output) = runCommand("tools/bc", "test", "kotlin", "--filter", "doctor repo succeeds")
    assertTrue(exit == 0, "test kotlin --filter should exit 0, got $exit")
    assertContains(output, "ok - doctor repo succeeds", "filtered kotlin tests should include the requested case")
    assertContains(output, "tests: 1, failures: 0", "filtered kotlin tests should run exactly one case")
    assertNotContains(output, "ok - help shows public commands", "filtered kotlin tests should exclude non-matching cases")
}

if (tests.isEmpty()) {
    System.err.println("FAIL - no tests matched filter: ${activeFilter ?: "ALL"}")
    exitProcess(1)
}

var failures = 0
for (case in tests) {
    try {
        case.run()
        println("ok - ${case.name}")
    } catch (error: Throwable) {
        failures += 1
        System.err.println("FAIL - ${case.name}: ${error.message}")
    }
}

println("tests: ${tests.size}, failures: $failures")
exitProcess(if (failures == 0) 0 else 1)

#!/usr/bin/env kotlin

import java.io.ByteArrayOutputStream
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.util.Comparator
import java.util.concurrent.TimeUnit
import kotlin.concurrent.thread
import kotlin.io.path.createDirectories
import kotlin.system.exitProcess

data class TestCase(val name: String, val run: () -> Unit)

val root = Paths.get("").toAbsolutePath().normalize()
val tests = mutableListOf<TestCase>()
val activeFilter = System.getenv("BTM_KOTLIN_TEST_FILTER")?.trim()?.takeIf { it.isNotEmpty() }

fun test(name: String, block: () -> Unit) {
    if (activeFilter != null && !name.contains(activeFilter, ignoreCase = true)) return
    tests += TestCase(name, block)
}

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
    val reader = thread(start = true, isDaemon = true, name = "btm-kotlin-test-reader") {
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

test("help shows public commands") {
    val (exit, output) = runCommand("tools/btm", "--help")
    assertTrue(exit == 0, "help should exit 0, got $exit")
    assertContains(output, "tools/btm test fast", "help should list fast test")
    assertContains(output, "tools/btm test full", "help should list full test")
    assertContains(output, "tools/btm test static", "help should list static test")
    assertContains(output, "tools/btm build sync server", "help should list build sync server")
    assertContains(output, "tools/btm graph item ITEM_ID", "help should list graph item")
    assertContains(output, "tools/btm graph route ITEM_ID", "help should list graph route")
    assertContains(output, "tools/btm doctor env", "help should list doctor env")
}

test("graph help shows subcommands") {
    val (exit, output) = runCommand("tools/btm", "graph", "--help")
    assertTrue(exit == 0, "graph help should exit 0, got $exit")
    assertContains(output, "Usage: tools/btm graph <item|route|blockers>", "graph help should show graph usage")
    assertContains(output, "item ITEM_ID", "graph help should show item subcommand")
    assertContains(output, "route ITEM_ID", "graph help should show route subcommand")
    assertContains(output, "blockers ITEM_ID", "graph help should show blockers subcommand")
}

test("graph item without id is usage error") {
    val (exit, output) = runCommand("tools/btm", "graph", "item")
    assertTrue(exit == 2, "graph item without id should exit 2, got $exit")
    assertContains(output, "graph item requires ITEM_ID", "graph item usage error should be specific")
}

test("graph item json returns producer and consumer counts") {
    val (exit, output) = runCommand("tools/btm", "--json", "graph", "item", "minecraft:glass")
    assertTrue(exit == 0, "graph item json should exit 0, got $exit")
    assertContains(output, "\"command\":\"graph item\"", "graph item json should identify its command")
    assertContains(output, "\"status\":\"success\"", "graph item json should report success")
    assertContains(output, "\"item\":\"minecraft:glass\"", "graph item json should report the item")
    assertContains(output, "\"producerCount\":", "graph item json should report producerCount")
    assertContains(output, "\"consumerCount\":", "graph item json should report consumerCount")
}

test("graph route json returns a structured route") {
    val (exit, output) = runCommand("tools/btm", "--json", "graph", "route", "kubejs:seared_machine_casing")
    assertTrue(exit == 0, "graph route json should exit 0, got $exit")
    assertContains(output, "\"command\":\"graph route\"", "graph route json should identify its command")
    assertContains(output, "\"reachable\":true", "graph route json should report reachability")
    assertContains(output, "\"route\":[", "graph route json should include a route array")
    assertContains(output, "\"item\":\"kubejs:seared_machine_casing\"", "graph route json should include the target route step")
}

test("graph blockers json returns explicit blocker data") {
    val (exit, output) = runCommand("tools/btm", "--json", "graph", "blockers", "minecraft:bedrock")
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

test("runtime without instance is usage error") {
    val (exit, output) = runCommand("tools/btm", "test", "runtime")
    assertTrue(exit == 2, "runtime without instance should exit 2, got $exit")
    assertContains(output, "test runtime requires --instance PATH", "runtime usage error should be specific")
}

test("scenario help shows scenarios") {
    val (exit, output) = runCommand("tools/btm", "test", "scenario", "--help")
    assertTrue(exit == 0, "scenario help should exit 0, got $exit")
    assertContains(output, "fast [--repo ID|PATH] [--list-repos]", "scenario help should show fast usage")
    assertContains(output, "full [--workspace [--repo ID|PATH] [--list-repos]]", "scenario help should show full workspace usage")
    assertContains(output, "--bootstrap-mode always|once|never", "scenario help should show bootstrap mode")
    assertContains(output, "Headless Scenarios:", "scenario help should list headless scenarios")
    assertContains(output, "Headful Scenarios:", "scenario help should list headful scenarios")
    assertContains(output, "opening_progression", "scenario help should include opening_progression")
    assertContains(output, "worldgen_sampling", "scenario help should include worldgen_sampling")
    assertContains(output, "client_smoke", "scenario help should include client_smoke")
}

test("fast repo listing shows workspace inventory") {
    val (exit, output) = runCommand("tools/btm", "test", "fast", "--list-repos")
    assertTrue(exit == 0, "test fast --list-repos should exit 0, got $exit")
    assertContains(output, "workspace fast repo selection:", "fast listing should show repo heading")
    assertContains(output, "pack", "fast listing should include pack")
    assertContains(output, "bound-to-matter-fixes", "fast listing should include nested repos")
}

test("full repo listing honors repo filters and meaningful full lanes") {
    val (exit, output) = runCommand("tools/btm", "test", "full", "--workspace", "--list-repos", "--repo", "pack", "--repo", "class-selector")
    assertTrue(exit == 0, "test full --workspace --list-repos with filters should exit 0, got $exit")
    assertContains(output, "pack", "filtered full listing should include pack")
    assertContains(output, "class-selector", "filtered full listing should include selected repo")
    assertNotContains(output, "rpg-stats", "filtered full listing should exclude unselected repos")
}

test("full repo listing without workspace flag is a usage error") {
    val (exit, output) = runCommand("tools/btm", "test", "full", "--list-repos")
    assertTrue(exit == 2, "test full --list-repos without --workspace should exit 2, got $exit")
    assertContains(output, "test full workspace selection requires --workspace", "full listing without --workspace should explain the requirement")
}

test("unknown workspace repo filter is a usage error") {
    val (exit, output) = runCommand("tools/btm", "test", "fast", "--list-repos", "--repo", "not-a-real-repo")
    assertTrue(exit == 2, "unknown workspace repo filter should exit 2, got $exit")
    assertContains(output, "unknown repo filter(s): not-a-real-repo", "unknown repo filter error should be specific")
}

test("unknown scenario is a usage error") {
    val (exit, output) = runCommand("tools/btm", "test", "scenario", "not_a_real_scenario")
    assertTrue(exit == 2, "unknown scenario should exit 2, got $exit")
    assertContains(output, "unknown scenario: not_a_real_scenario", "unknown scenario error should be specific")
}

test("doctor repo succeeds") {
    val (exit, output) = runCommand("tools/btm", "doctor", "repo")
    assertTrue(exit == 0, "doctor repo should exit 0, got $exit")
    assertContains(output, "repo check passed", "doctor repo should pass")
}

test("build sync server dry-run works") {
    val temp = Files.createTempDirectory("btm-kotlin-test-sync-server")
    try {
        val (exit, output) = runCommand("tools/btm", "--json", "build", "sync", "server", "--dir", temp.toString(), "--dry-run")
        assertTrue(exit == 0, "server sync dry-run should exit 0, got $exit")
        assertContains(output, "\"status\":\"success\"", "server sync dry-run should report success JSON")
        assertContains(output, "\"command\":\"build sync server\"", "server sync dry-run should identify its command")
    } finally {
        deleteTree(temp)
    }
}

test("build sync client dry-run works") {
    val temp = Files.createTempDirectory("btm-kotlin-test-sync-client")
    try {
        val (exit, output) = runCommand("tools/btm", "--json", "build", "sync", "client", "--dir", temp.toString(), "--dry-run")
        assertTrue(exit == 0, "client sync dry-run should exit 0, got $exit")
        assertContains(output, "\"status\":\"success\"", "client sync dry-run should report success JSON")
        assertContains(output, "\"command\":\"build sync client\"", "client sync dry-run should identify its command")
    } finally {
        deleteTree(temp)
    }
}

test("public static lane passes") {
    val (exit, output) = runCommand("tools/btm", "--json", "test", "static", timeoutSeconds = 900)
    assertTrue(exit == 0, "test static should exit 0, got $exit")
    assertContains(output, "\"status\":\"success\"", "test static should report success JSON")
    assertContains(output, "\"command\":\"test static\"", "test static should identify its command")
    assertContains(output, "\"evidenceLevel\":\"source\"", "test static should report source evidence")
}

test("public fast lane passes when recursive kotlin step is disabled") {
    val (exit, output) = runCommand(
        "tools/btm",
        "--json",
        "test",
        "fast",
        "--repo",
        "pack",
        timeoutSeconds = 900,
        extraEnv = mapOf("BTM_SKIP_KOTLIN_TESTS" to "1"),
    )
    assertTrue(exit == 0, "test fast --repo pack should exit 0 with kotlin recursion disabled, got $exit")
    assertContains(output, "\"status\":\"success\"", "test fast should report success JSON")
    assertContains(output, "\"command\":\"test fast\"", "test fast should identify its command")
    assertContains(output, "workspace fast passed for 1 repo(s)", "test fast should report passing workspace summary")
}

test("doctor runtime without instance is usage error") {
    val (exit, output) = runCommand("tools/btm", "doctor", "runtime")
    assertTrue(exit == 2, "doctor runtime without instance should exit 2, got $exit")
    assertContains(output, "doctor runtime requires --instance PATH", "doctor runtime usage error should be specific")
}

test("doctor runtime accepts a minimal runtime shape") {
    val temp = Files.createTempDirectory("btm-kotlin-test-runtime-doctor")
    try {
        temp.resolve("mods").createDirectories()
        temp.resolve("logs").createDirectories()
        temp.resolve("kubejs/config").createDirectories()
        Files.writeString(temp.resolve("logs/latest.log"), "")
        Files.writeString(temp.resolve("run.sh"), "placeholder\n")
        val (exit, output) = runCommand("tools/btm", "doctor", "runtime", "--instance", temp.toString())
        assertTrue(exit == 0, "doctor runtime should exit 0 for a minimal runtime shape, got $exit")
        assertContains(output, "runtime check passed", "doctor runtime should report a passing summary")
    } finally {
        deleteTree(temp)
    }
}

test("smoke rejects non-numeric port") {
    val (exit, output) = runCommand("tools/btm", "test", "smoke", "--port", "abc")
    assertTrue(exit == 2, "smoke with non-numeric port should exit 2, got $exit")
    assertContains(output, "--port needs a number", "smoke should reject non-numeric ports")
}

test("runtime mod prune removes source jars") {
    val temp = Files.createTempDirectory("btm-kotlin-test-prune-runtime-mods")
    val dest = temp.resolve("mods/synthetic-fixture-sources.jar")
    try {
        Files.createDirectories(dest.parent)
        Files.write(dest, byteArrayOf())
        val (exit, output) = runCommand("tools/btm", "internal", "prune-runtime-mods", "--target-dir", temp.toString(), "--side", "server", "--apply")
        assertTrue(exit == 1, "internal prune-runtime-mods should report missing expected runtime mods on an incomplete temp dir, got $exit")
        assertTrue(!Files.exists(dest), "prune-runtime-mods should remove source jars from runtime mods")
        assertContains(output, "runtime mod prune:", "prune-runtime-mods should report runtime mod summary")
    } finally {
        deleteTree(temp)
    }
}

test("internal kotlin tool surface validator runs through btm") {
    val (exit, output) = runCommand("tools/btm", "internal", "validate-kotlin-tool-surface")
    assertTrue(exit == 0, "internal validate-kotlin-tool-surface should exit 0, got $exit")
    assertContains(output, "kotlin tool surface validates", "internal validate-kotlin-tool-surface should report validator summary")
}

test("internal worldgen sampling contract validator runs through btm") {
    val (exit, output) = runCommand("tools/btm", "internal", "validate-worldgen-sampling-contracts")
    assertTrue(exit == 0, "internal validate-worldgen-sampling-contracts should exit 0, got $exit")
    assertContains(output, "worldgen sampling contracts validate", "worldgen sampling contract validator should report success")
}

test("internal client smoke contract validator runs through btm") {
    val (exit, output) = runCommand("tools/btm", "internal", "validate-client-smoke-contracts")
    assertTrue(exit == 0, "internal validate-client-smoke-contracts should exit 0, got $exit")
    assertContains(output, "client smoke contracts validate", "client smoke contract validator should report success")
}

test("internal kubejs assets validator runs through btm") {
    val (exit, output) = runCommand("tools/btm", "internal", "validate-kubejs-assets")
    assertTrue(exit == 0, "internal validate-kubejs-assets should exit 0, got $exit")
    assertContains(output, "kubejs assets validate", "internal validate-kubejs-assets should report validator summary")
}

test("internal autonomous contracts validator runs through btm") {
    val (exit, output) = runCommand("tools/btm", "internal", "validate-autonomous-contracts")
    assertTrue(exit == 0, "internal validate-autonomous-contracts should exit 0, got $exit")
    assertContains(output, "autonomous contract validators:", "internal validate-autonomous-contracts should report validator summary")
    assertContains(output, "0 hard failure(s)", "internal validate-autonomous-contracts should report no hard failures")
}

test("internal pack contract validator runs through btm") {
    val (exit, output) = runCommand("tools/btm", "internal", "validate-pack-contract")
    assertTrue(exit in setOf(0, 1), "internal validate-pack-contract should exit 0 or 1, got $exit")
    assertContains(output, "pack contract audit:", "internal validate-pack-contract should report contract audit summary")
}

test("internal contract completeness report runs through btm") {
    val (exit, output) = runCommand("tools/btm", "internal", "contract-completeness-report", "--check", "--no-write")
    assertTrue(exit == 0, "internal contract-completeness-report --check --no-write should exit 0, got $exit")
    assertContains(output, "contract completeness:", "internal contract-completeness-report should report classification summary")
}

test("internal realistic hands validator runs through btm") {
    val (exit, output) = runCommand("tools/btm", "internal", "validate-realistic-hands")
    assertTrue(exit == 0, "internal validate-realistic-hands should exit 0, got $exit")
    assertContains(output, "Realistic Hands validates", "internal validate-realistic-hands should report validator summary")
}

test("internal js syntax check runs through btm") {
    val (exit, output) = runCommand("tools/btm", "internal", "check-js-syntax")
    assertTrue(exit == 0, "internal check-js-syntax should exit 0, got $exit")
    assertContains(output, "Rhino", "internal check-js-syntax should report Rhino-based syntax validation")
}

test("internal json surface check runs through btm") {
    val (exit, output) = runCommand("tools/btm", "internal", "check-json-surface")
    assertTrue(exit == 0, "internal check-json-surface should exit 0, got $exit")
    assertContains(output, "all repo JSON parses", "internal check-json-surface should report JSON surface validation")
}

test("internal burnt sync check runs through btm") {
    val (exit, output) = runCommand("tools/btm", "internal", "sync-burnt-coverage-tags", "--check")
    assertTrue(exit == 0, "internal sync-burnt-coverage-tags --check should exit 0, got $exit")
    assertContains(output, "missing_rows", "internal sync-burnt-coverage-tags should report missing_rows")
}

test("internal chemistry identity validator runs through btm") {
    val (exit, output) = runCommand("tools/btm", "internal", "validate-chemistry-identity")
    assertTrue(exit == 0, "internal validate-chemistry-identity should exit 0, got $exit")
    assertContains(output, "chemistry identity matrix validates", "internal validate-chemistry-identity should report validator summary")
}

test("internal player progression contracts validator runs through btm") {
    val (exit, output) = runCommand("tools/btm", "internal", "validate-player-progression-contracts")
    assertTrue(exit == 0, "internal validate-player-progression-contracts should exit 0, got $exit")
    assertContains(output, "player progression contract validators:", "internal validate-player-progression-contracts should report validator summary")
}

test("internal LC TFTH DH contract validator runs through btm") {
    val (exit, output) = runCommand("tools/btm", "internal", "validate-lc-tfth-dh-contracts")
    assertTrue(exit == 0, "internal validate-lc-tfth-dh-contracts should exit 0, got $exit")
    assertContains(output, "LC/TFTH/DH contract validators:", "internal validate-lc-tfth-dh-contracts should report validator summary")
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

test("headful scenario enforcement rejects client smoke on headless path") {
    val (exit, output) = runCommand("tools/btm", "test", "scenario", "client_smoke", "--profile", "quick")
    assertTrue(exit == 2, "client_smoke on headless path should exit 2, got $exit")
    assertContains(output, "scenario 'client_smoke' is headful", "client_smoke should require scenario-headful")
}

test("worldgen sampling rejects invalid profile with usage error") {
    val (exit, output) = runCommand("tools/btm", "test", "scenario", "worldgen_sampling", "--profile", "bad")
    assertTrue(exit == 2, "worldgen_sampling with invalid profile should exit 2, got $exit")
    assertContains(output, "invalid profile: bad", "worldgen_sampling should reject invalid profile")
}

test("client smoke rejects invalid profile with usage error") {
    val (exit, output) = runCommand("tools/btm", "test", "scenario-headful", "client_smoke", "--profile", "bad")
    assertTrue(exit == 2, "client_smoke with invalid profile should exit 2, got $exit")
    assertContains(output, "invalid profile: bad", "client_smoke should reject invalid profile")
}

test("opening progression rejects invalid bootstrap mode with usage error") {
    val (exit, output) = runCommand("tools/btm", "test", "scenario", "opening_progression", "--bootstrap-mode", "bad")
    assertTrue(exit == 2, "opening_progression with invalid bootstrap mode should exit 2, got $exit")
    assertContains(output, "invalid bootstrap mode: bad", "opening_progression should reject invalid bootstrap mode")
}

test("worldgen sampling rejects invalid bootstrap mode with usage error") {
    val (exit, output) = runCommand("tools/btm", "test", "scenario", "worldgen_sampling", "--profile", "quick", "--bootstrap-mode", "bad")
    assertTrue(exit == 2, "worldgen_sampling with invalid bootstrap mode should exit 2, got $exit")
    assertContains(output, "invalid bootstrap mode: bad", "worldgen_sampling should reject invalid bootstrap mode")
}

test("client smoke rejects invalid bootstrap mode with usage error") {
    val (exit, output) = runCommand("tools/btm", "test", "scenario-headful", "client_smoke", "--profile", "quick", "--bootstrap-mode", "bad")
    assertTrue(exit == 2, "client_smoke with invalid bootstrap mode should exit 2, got $exit")
    assertContains(output, "invalid bootstrap mode: bad", "client_smoke should reject invalid bootstrap mode")
}

test("kotlin test filter runs only matching cases") {
    val (exit, output) = runCommand("tools/btm", "test", "kotlin", "--filter", "doctor repo succeeds")
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

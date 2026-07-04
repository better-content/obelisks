#!/usr/bin/env kotlin

import java.io.ByteArrayOutputStream
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.util.Comparator
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

fun runCommand(vararg args: String, workdir: Path = root): Pair<Int, String> {
    val process = ProcessBuilder(args.toList())
        .directory(workdir.toFile())
        .redirectErrorStream(true)
        .start()
    val buffer = ByteArrayOutputStream()
    process.inputStream.copyTo(buffer)
    val exit = process.waitFor()
    return exit to buffer.toString(Charsets.UTF_8)
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
    assertContains(output, "tools/btm test static", "help should list static test")
    assertContains(output, "tools/btm build sync server", "help should list build sync server")
    assertContains(output, "tools/btm doctor env", "help should list doctor env")
}

test("runtime without instance is usage error") {
    val (exit, output) = runCommand("tools/btm", "test", "runtime")
    assertTrue(exit == 2, "runtime without instance should exit 2, got $exit")
    assertContains(output, "test runtime requires --instance PATH", "runtime usage error should be specific")
}

test("scenario help shows scenarios") {
    val (exit, output) = runCommand("tools/btm", "test", "scenario", "--help")
    assertTrue(exit == 0, "scenario help should exit 0, got $exit")
    assertContains(output, "Headless Scenarios:", "scenario help should list headless scenarios")
    assertContains(output, "Headful Scenarios:", "scenario help should list headful scenarios")
    assertContains(output, "opening_progression", "scenario help should include opening_progression")
    assertContains(output, "worldgen_sampling", "scenario help should include worldgen_sampling")
    assertContains(output, "client_smoke", "scenario help should include client_smoke")
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
    } finally {
        deleteTree(temp)
    }
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
    assertContains(output, "autonomous contract validators: 89 pass(es), 0 hard failure(s)", "internal validate-autonomous-contracts should match expected summary")
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

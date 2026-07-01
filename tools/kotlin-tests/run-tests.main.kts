#!/usr/bin/env kotlin

import java.io.ByteArrayOutputStream
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import kotlin.system.exitProcess

data class TestCase(val name: String, val run: () -> Unit)

val root = Paths.get("").toAbsolutePath().normalize()
val tests = mutableListOf<TestCase>()

fun test(name: String, block: () -> Unit) {
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
        runCommand("bash", "-lc", "rm -rf '${temp.toString().replace("'", "'\\''")}'")
    }
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
        runCommand("bash", "-lc", "rm -rf '${temp.toString().replace("'", "'\\''")}'")
    }
}

test("internal kubejs assets validator runs through btm") {
    val (exit, output) = runCommand("tools/btm", "internal", "validate-kubejs-assets")
    assertTrue(exit == 0, "internal validate-kubejs-assets should exit 0, got $exit")
    assertContains(output, "kubejs assets validate", "internal validate-kubejs-assets should report validator summary")
}

test("internal autonomous contracts validator runs through btm") {
    val (exit, output) = runCommand("tools/btm", "internal", "validate-autonomous-contracts")
    assertTrue(exit == 0, "internal validate-autonomous-contracts should exit 0, got $exit")
    assertContains(output, "autonomous contract validators: 87 pass(es), 0 hard failure(s)", "internal validate-autonomous-contracts should match expected summary")
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

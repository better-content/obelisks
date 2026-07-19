#!/usr/bin/env kotlin

import java.io.ByteArrayOutputStream
import java.io.File
import java.net.URI
import java.net.ServerSocket
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardCopyOption
import java.security.MessageDigest
import java.time.Instant
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.UUID
import kotlin.io.path.createDirectories
import kotlin.io.path.exists
import kotlin.io.path.isDirectory
import kotlin.io.path.isExecutable
import kotlin.io.path.name
import kotlin.system.exitProcess

data class ArtifactRef(val path: String, val kind: String = "file")
data class ValidationFinding(val severity: String, val message: String)
data class RunningProcess(val process: Process, val logPath: Path, val stdin: java.io.BufferedWriter? = null)
data class HardFindingMatch(val lineNumber: Int, val line: String)
data class HardFinding(val key: String, val label: String, var count: Int = 0, val matches: MutableList<HardFindingMatch> = mutableListOf())
data class HardScanResult(
    val ok: Boolean,
    val logPath: String?,
    val instanceDir: String?,
    val failedRecipeCount: Int?,
    val parseErrorCount: Int,
    val findings: List<HardFinding>,
)
data class PackwizEntry(
    val path: String,
    val dir: String,
    val filename: String,
    val side: String,
    val mode: String,
    val url: String,
    val hash: String,
    val hashFormat: String,
    val cfProject: String?,
    val cfFile: String?,
)
data class VersionRule(val action: String, val osName: String?, val hasFeatures: Boolean)
data class VersionArtifact(val path: String?, val url: String?)
data class VersionDownloads(
    val artifact: VersionArtifact? = null,
    val classifiers: Map<String, VersionArtifact> = emptyMap(),
    val clientUrl: String? = null,
)
data class VersionLibrary(
    val name: String?,
    val rules: List<VersionRule>,
    val downloads: VersionDownloads,
    val nativesLinux: String?,
)
data class VersionArgumentEntry(val values: List<String>, val rules: List<VersionRule>)
data class VersionModel(
    val id: String?,
    val inheritsFrom: String?,
    val mainClass: String?,
    val type: String?,
    val assetIndexId: String?,
    val assets: String?,
    val downloadsClientUrl: String?,
    val libraries: List<VersionLibrary>,
    val gameArgs: List<VersionArgumentEntry>,
    val jvmArgs: List<VersionArgumentEntry>,
    val minecraftArguments: String?,
)
data class CommandResult(
    val command: String,
    val status: String,
    val summary: String,
    val details: Map<String, Any?> = emptyMap(),
    val findings: List<ValidationFinding> = emptyList(),
    val artifacts: List<ArtifactRef> = emptyList(),
    val metrics: Map<String, Any?> = emptyMap(),
    val nextSteps: List<String> = emptyList(),
    val mutated: Boolean = false,
    val evidenceLevel: String = "none",
    val exitCode: Int = 0,
)

data class ProcessRun(val exitCode: Int, val output: String)
data class PlaytestRelease(val version: Int, val baseName: String)
data class WorkspaceRepoDefinition(
    val id: String,
    val path: String,
    val kind: String,
    val command: List<String>,
)
data class HarnessPaths(
    val dir: Path,
    val lock: Path,
    val status: Path,
    val summary: Path,
    val pids: Path,
)
data class HarnessLockConflict(
    val message: String,
    val details: Map<String, Any?>,
)
data class HarnessSpec(
    val keySeed: String,
    val runKind: String,
    val command: String,
    val repoOrScenario: String,
    val workDirOrRunRoot: String,
    val requestedPort: Int? = null,
    val actualPort: Int? = null,
    val reservedPortPath: Path? = null,
    val phase: String = "starting",
    val evidencePaths: List<String> = emptyList(),
    val latestStatusPath: Path? = null,
    val latestSummaryPath: Path? = null,
)
data class CycleResult(
    val index: Int,
    var status: String = "FAIL",
    val phases: MutableList<String> = mutableListOf(),
    var failureClass: String? = null,
    var reason: String? = null,
    var serverDir: String? = null,
    var clientDir: String? = null,
    var evidenceDir: String? = null,
    var port: Int? = null,
)
data class RecipeStackRef(
    val kind: String,
    val id: String,
    val count: Double? = null,
    val chance: Double? = null,
)
data class RecipeGraphHit(
    val id: String,
    val type: String,
    val machines: List<String>,
    val inputs: List<RecipeStackRef>,
    val outputs: List<RecipeStackRef>,
    val catalysts: List<RecipeStackRef>,
    val fluidsIn: List<RecipeStackRef>,
    val fluidsOut: List<RecipeStackRef>,
    val parsed: Boolean,
)

val root: Path = Paths.get("").toAbsolutePath().normalize()
val toolsDir: Path = root.resolve("tools")
val  bcPath: Path = toolsDir.resolve("bc")
val  bcMainPath: Path = toolsDir.resolve("bc.main.kts")
val workspaceInventoryPath: Path = toolsDir.resolve("workspace_test_inventory.json")
val migrationMatrixPath: Path = root.resolve("TOOL_MIGRATION_MATRIX.md")

fun cachePath(vararg parts: String): Path =
    parts.fold(Paths.get(System.getProperty("user.home"), ".cache", "bc")) { path, part -> path.resolve(part) }
        .toAbsolutePath()
        .normalize()

val defaultServerDir = root.resolve("server-instance").toString()
val defaultExportsDir = root.resolve("generated/exports").toString()
val mcVersion = "1.20.1"
val forgeVersion = "47.4.13"
val forgeCoord = "$mcVersion-$forgeVersion"
val defaultServerPort = 25565
val harnessRoot: Path = System.getenv("BC_HARNESS_ROOT")?.takeIf { it.isNotBlank() }?.let(::resolveUserPath) ?: cachePath("harness")

val managedPaths = listOf(
    "LICENSE",
    "coin.png",
    "config",
    "datapacks",
    "defaultconfigs",
    "globalresources",
    "index.toml",
    "kubejs",
    "mods",
    "pack.toml",
    "recipe-policies.yml",
    "resourcepacks",
    "shaderpacks",
)

val runtimeExcludes = listOf(
    ".codex",
    ".git",
    ".idea",
    ".runtime",
    "server-instance",
    "server-template",
    "world",
    "saves",
    "logs",
    "crash-reports",
    "screenshots",
    "backups",
    "options.txt",
    "optionsof.txt",
    "servers.dat",
    "launcher_accounts.json",
    "launcher_profiles.json",
    "usercache.json",
    "usernamecache.json",
    "session.lock",
    "eula.txt",
)

val clientOnlyModGlobs = listOf(
    "ambientsounds*",
    "bettergrassify*",
    "configured*",
    "controlling*",
    "DistantHorizons*",
    "embeddium*",
    "emi*",
    "entityculling*",
    "hold-my-items*",
    "mouse-tweaks*",
    "no-more-popups*",
    "no-recipe-book*",
    "oculus*",
    "presence-footsteps*",
    "shoulder-surfing*",
    "sound-physics*",
    "the-one-probe*",
    "true-darkness*",
    "darkness*",
)

val rawArgs = args.toList()
val jsonOutput = rawArgs.contains("--json")
val quiet = rawArgs.contains("--quiet")
val filteredArgs = rawArgs.filterNot { it == "--json" || it == "--quiet" }
val httpClient: HttpClient = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.ALWAYS).build()
val hardPatterns = listOf(
    Triple("kubejs_recipe_parse_error", "KubeJS recipe parse errors", Regex("Error parsing recipe", RegexOption.IGNORE_CASE)),
    Triple("invalid_empty_fluid", "Invalid empty fluid errors", Regex("Invalid empty fluid", RegexOption.IGNORE_CASE)),
    Triple("crash_report_marker", "Crash report markers", Regex("crash report|this crash report has been saved|preparing crash report", RegexOption.IGNORE_CASE)),
    Triple("jvm_fatal", "JVM fatal errors", Regex("OutOfMemoryError|hs_err_pid|fatal error has been detected", RegexOption.IGNORE_CASE)),
    Triple("modernfix_watchdog", "ModernFix watchdog signatures", Regex("modernfix.*watchdog|watchdog.*modernfix|server thread dump", RegexOption.IGNORE_CASE)),
    Triple("c2me_thread_guard", "C2ME/thread-guard signatures", Regex("(ThreadingDetector|PalettedContainer|BulkSectionAccess|safe.?random|random.*wrong thread|accessing legacyrandomsource|CheckedThreadLocalRandom|Chunk not there when requested).*\\b(Exception|Error|FATAL|ReportedException|IllegalStateException)\\b|\\b(Exception|Error|FATAL|ReportedException|IllegalStateException)\\b.*(ThreadingDetector|PalettedContainer|BulkSectionAccess|safe.?random|random.*wrong thread|accessing legacyrandomsource|CheckedThreadLocalRandom|Chunk not there when requested)", RegexOption.IGNORE_CASE)),
)
val kubeJsErrorPattern = Regex("""\[[^\]]+/ERROR]|\[ERROR]""")
val hardPatternIgnores = mapOf(
    "modernfix_watchdog" to listOf(
        Regex("""Option 'mixin\.feature\.integrated_server_watchdog' overriden \(by user configuration\) to 'false'""", RegexOption.IGNORE_CASE),
    ),
)

fun mainHelp(): String = """
Usage: tools/bc [--json] [--quiet] <command> ...

Public commands:
  tools/bc test fast [--repo ID|PATH] [--list-repos]
  tools/bc test static
  tools/bc test kotlin [--filter NAME]
  tools/bc test smoke [--run-root PATH] [--bootstrap-mode always|once|never] [--port N] [--idle-seconds N]
  tools/bc build sync server --dir PATH --dry-run|--apply
  tools/bc build sync client --dir PATH --dry-run|--apply
  tools/bc build bundle curseforge [--exports-dir PATH]
  tools/bc build bundle server [--exports-dir PATH] [--server-tree-dir PATH] [--server-zip PATH] [--clean]
  tools/bc build bundle release [--exports-dir PATH] [--resume-current]
  tools/bc graph item ITEM_ID [--producers|--consumers|--all] [--limit N] [--type RECIPE_TYPE] [--graph PATH]
  tools/bc graph route ITEM_ID [--graph PATH] [--sources PATH] [--spine PATH]
  tools/bc graph blockers ITEM_ID [--graph PATH] [--sources PATH] [--spine PATH] [--limit N]
  tools/bc inspect item ITEM_ID [--recipes|--uses|--all] [--limit N] [--type RECIPE_TYPE] [--graph PATH]
  tools/bc doctor env
  tools/bc doctor repo
  tools/bc doctor runtime --instance PATH
""".trimIndent()

fun graphHelp(): String = """
Usage: tools/bc graph <item|route|blockers> ...

Commands:
  item ITEM_ID [--producers|--consumers|--all] [--limit N] [--type RECIPE_TYPE] [--graph PATH]
  route ITEM_ID [--graph PATH] [--sources PATH] [--spine PATH]
  blockers ITEM_ID [--graph PATH] [--sources PATH] [--spine PATH] [--limit N]

Queries retained runtime recipe evidence from generated/runtime-dumps/recipes.json and progression inputs from kubejs/config/progression_reachability_sources.json plus kubejs/config/player_progression_regression.json.

Examples:
  tools/bc graph item minecraft:glass
  tools/bc graph route kubejs:seared_machine_casing
  tools/bc graph blockers minecraft:bedrock --limit 10
""".trimIndent()

fun inspectHelp(): String = """
Usage: tools/bc inspect item ITEM_ID [--recipes|--uses|--all] [--limit N] [--type RECIPE_TYPE] [--graph PATH]

Queries retained runtime recipe evidence from generated/runtime-dumps/recipes.json.

Examples:
  tools/bc inspect item minecraft:iron_ingot
  tools/bc inspect item kubejs:andesite_machine_casing --recipes
  tools/bc inspect item pneumaticcraft:printed_circuit_board --uses --limit 40
  tools/bc inspect item minecraft:glass --type minecraft:crafting_shaped
""".trimIndent()

fun testHelp(): String = """
Usage: tools/bc test <fast|static|kotlin|smoke> ...

Commands:
  fast [--repo ID|PATH] [--list-repos]
  static
  kotlin [--filter NAME]
  smoke [--run-root PATH] [--bootstrap-mode always|once|never] [--port N] [--idle-seconds N]
""".trimIndent()

fun buildHelp(): String = """
Usage: tools/bc build <sync|bundle> ...

Commands:
  sync server --dir PATH --dry-run|--apply
  sync client --dir PATH --dry-run|--apply
  bundle curseforge [--exports-dir PATH]
  bundle server [--exports-dir PATH] [--server-tree-dir PATH] [--server-zip PATH] [--clean]
  bundle release [--exports-dir PATH] [--resume-current]

The release bundle command reserves the next persistent Playtest version, then
refreshes packwiz metadata in the current source tree, runs static validation, exports both
archives as better-content-playtest-v<N>-{curseforge,server}.zip, and verifies their
required contents. Runtime validation is intentionally outside this workflow.
""".trimIndent()

fun doctorHelp(): String = """
Usage: tools/bc doctor <env|repo|runtime> ...

Commands:
  env
  repo
  runtime --instance PATH
""".trimIndent()

fun internalHelp(): String = """
Usage: tools/bc internal <resolve-packwiz-downloads|prune-runtime-mods|prepare-client-runtime|minecraft-client-argfile|sync-burnt-coverage-tags|generate-completionist-quests|audit-ftbq-layout|check-js-syntax|check-json-surface|validate-bettergrassify-grass-blocks|validate-pack-contract|contract-completeness-report|validate-kubejs-assets|validate-autonomous-contracts|validate-realistic-hands|validate-dynamic-trees-coverage|validate-chemistry-identity|validate-synthesis-pipeline|validate-player-progression-contracts|validate-progression-reachability|validate-burnt-coverage|validate-lc-tfth-dh-contracts|validate-kotlin-tool-surface|validate-tool-doc-surface|verify-pack-fast> ...
""".trimIndent()

fun usageError(message: String, help: String = mainHelp()): CommandResult =
    CommandResult(
        command = filteredArgs.joinToString(" ").ifBlank { "help" },
        status = "failure",
        summary = message,
        findings = listOf(ValidationFinding("error", message)),
        nextSteps = listOf(help),
        exitCode = 2,
    )

fun internalFailure(message: String): CommandResult =
    CommandResult(
        command = filteredArgs.joinToString(" ").ifBlank { "help" },
        status = "failure",
        summary = message,
        findings = listOf(ValidationFinding("error", message)),
        exitCode = 4,
    )

fun prereqFailure(message: String, findings: List<ValidationFinding> = listOf(ValidationFinding("error", message))): CommandResult =
    CommandResult(
        command = filteredArgs.joinToString(" ").ifBlank { "help" },
        status = "failure",
        summary = message,
        findings = findings,
        exitCode = 3,
        evidenceLevel = "environment",
    )

fun success(
    command: String,
    summary: String,
    details: Map<String, Any?> = emptyMap(),
    findings: List<ValidationFinding> = emptyList(),
    artifacts: List<ArtifactRef> = emptyList(),
    metrics: Map<String, Any?> = emptyMap(),
    nextSteps: List<String> = emptyList(),
    mutated: Boolean = false,
    evidenceLevel: String = "none",
): CommandResult = CommandResult(
    command = command,
    status = "success",
    summary = summary,
    details = details,
    findings = findings,
    artifacts = artifacts,
    metrics = metrics,
    nextSteps = nextSteps,
    mutated = mutated,
    evidenceLevel = evidenceLevel,
    exitCode = 0,
)

fun findCommandPath(command: String): String? {
    val candidate = Paths.get(command)
    if (command.contains(File.separatorChar) || candidate.nameCount > 1) {
        return if (Files.isExecutable(candidate) && !Files.isDirectory(candidate)) candidate.toAbsolutePath().normalize().toString() else null
    }
    for (entry in System.getenv("PATH").orEmpty().split(File.pathSeparator).filter { it.isNotBlank() }) {
        val resolved = Paths.get(entry).resolve(command)
        if (Files.isExecutable(resolved) && !Files.isDirectory(resolved)) {
            return resolved.toAbsolutePath().normalize().toString()
        }
    }
    return null
}

fun commandExists(command: String): Boolean = findCommandPath(command) != null

fun userLocalExecutable(vararg parts: String): String? {
    val home = System.getProperty("user.home") ?: return null
    val candidate = Paths.get(home, *parts)
    return if (Files.isExecutable(candidate) && !Files.isDirectory(candidate)) candidate.toAbsolutePath().normalize().toString() else null
}

fun findJava17Path(): String? {
    val candidates = buildList {
        System.getenv("JAVA17")?.takeIf { it.isNotBlank() }?.let { add(Paths.get(it)) }
        System.getenv("JAVA_HOME")?.takeIf { it.isNotBlank() }?.let { add(Paths.get(it).resolve("bin/java")) }
        userLocalExecutable(".local", "opt", "temurin-17", "bin", "java")?.let { add(Paths.get(it)) }
        findCommandPath("java")?.let { add(Paths.get(it)) }
    }.distinct()
    for (candidate in candidates) {
        if (!Files.isExecutable(candidate)) continue
        val version = readCommand(listOf(candidate.toString(), "-version"))
        if (Regex("""version "17\.|openjdk version "17\.""" ).containsMatchIn(version)) {
            return candidate.toAbsolutePath().normalize().toString()
        }
    }
    return null
}

fun readCommand(command: List<String>): String =
    try {
        val process = ProcessBuilder(command).redirectErrorStream(true).start()
        val output = process.inputStream.bufferedReader().readText().trim()
        process.waitFor()
        output
    } catch (_: Exception) {
        ""
    }

fun detectJava17(): Boolean {
    return findJava17Path() != null
}

fun ensureCommands(vararg commands: String): List<ValidationFinding> =
    commands.mapNotNull { command ->
        if (commandExists(command)) null else ValidationFinding("error", "missing required command: $command")
    }

fun runProcess(
    command: List<String>,
    extraEnv: Map<String, String> = emptyMap(),
    stream: Boolean = !jsonOutput && !quiet,
    workDir: Path = root,
): ProcessRun {
    val builder = ProcessBuilder(command)
    builder.directory(workDir.toFile())
    builder.redirectErrorStream(true)
    builder.environment().putAll(extraEnv)
    val process = builder.start()
    val output = if (stream) {
        process.inputStream.copyTo(System.out)
        ""
    } else {
        val buffer = ByteArrayOutputStream()
        process.inputStream.copyTo(buffer)
        buffer.toString(Charsets.UTF_8)
    }
    val exitCode = process.waitFor()
    return ProcessRun(exitCode, output.trim())
}

fun javaTempEnvironment(runtimeDir: Path): Map<String, String> {
    val tempDir = runtimeDir.resolve(".java-tmp").toAbsolutePath().normalize()
    tempDir.createDirectories()
    val option = "-Djava.io.tmpdir=$tempDir"
    val existing = System.getenv("JAVA_TOOL_OPTIONS")?.trim().orEmpty()
    return mapOf("JAVA_TOOL_OPTIONS" to if (existing.isBlank()) option else "$existing $option")
}

fun outputSnippet(output: String): String? {
    if (output.isBlank()) return null
    val lines = output.lines().filter { it.isNotBlank() }
    if (lines.isEmpty()) return null
    return lines.takeLast(25).joinToString("\n")
}

fun jsonEscape(text: String): String = buildString {
    for (ch in text) {
        when (ch) {
            '\\' -> append("\\\\")
            '"' -> append("\\\"")
            '\b' -> append("\\b")
            '\u000C' -> append("\\f")
            '\n' -> append("\\n")
            '\r' -> append("\\r")
            '\t' -> append("\\t")
            else -> {
                if (ch.code < 0x20) {
                    append("\\u%04x".format(ch.code))
                } else {
                    append(ch)
                }
            }
        }
    }
}

fun toJson(value: Any?): String = when (value) {
    null -> "null"
    is String -> "\"${jsonEscape(value)}\""
    is Number, is Boolean -> value.toString()
    is ValidationFinding -> toJson(mapOf("severity" to value.severity, "message" to value.message))
    is ArtifactRef -> toJson(mapOf("path" to value.path, "kind" to value.kind))
    is Map<*, *> -> value.entries.joinToString(prefix = "{", postfix = "}") { (k, v) ->
        "\"${jsonEscape(k.toString())}\":${toJson(v)}"
    }
    is Iterable<*> -> value.joinToString(prefix = "[", postfix = "]") { toJson(it) }
    is Array<*> -> value.joinToString(prefix = "[", postfix = "]") { toJson(it) }
    else -> "\"${jsonEscape(value.toString())}\""
}

fun writeJsonFile(path: Path, value: Any?) {
    path.parent?.createDirectories()
    Files.writeString(path, toJson(value) + "\n")
}

fun readJsonFile(path: Path): Map<String, Any?> =
    if (!path.exists()) emptyMap() else runCatching { jsonObject(parseJson(Files.readString(path))) }.getOrElse { emptyMap() }

fun isoTimestamp(): String = Instant.now().toString()

fun currentPid(): Long = ProcessHandle.current().pid()

fun isZombiePid(pid: Long): Boolean {
    val statusPath = Path.of("/proc", pid.toString(), "status")
    if (!statusPath.exists()) return false
    return runCatching {
        Files.readAllLines(statusPath).firstOrNull { it.startsWith("State:") }?.contains("\tZ") == true
    }.getOrDefault(false)
}

fun isPidAlive(pid: Long?): Boolean =
    pid != null && pid > 0 && ProcessHandle.of(pid).map { it.isAlive }.orElse(false) && !isZombiePid(pid)

fun stableHash(text: String): String {
    val digest = MessageDigest.getInstance("SHA-256")
    val encoded = digest.digest(text.toByteArray(Charsets.UTF_8))
    return encoded.joinToString("") { "%02x".format(it) }
}

fun harnessKey(seed: String): String {
    val slug = seed.lowercase().replace(Regex("[^a-z0-9]+"), "-").trim('-').take(72).ifBlank { "run" }
    return "$slug-${stableHash(seed).take(12)}"
}

fun resolveHarnessPaths(seed: String): HarnessPaths {
    val dir = harnessRoot.resolve(harnessKey(seed))
    return HarnessPaths(
        dir = dir,
        lock = dir.resolve("lock.json"),
        status = dir.resolve("status.json"),
        summary = dir.resolve("summary.json"),
        pids = dir.resolve("pids.json"),
    )
}

fun syncLatestPointer(target: Path?, source: Path) {
    if (target == null) return
    target.parent?.createDirectories()
    Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING)
}

data class ReservedPort(
    val port: Int,
    val path: Path?,
)

fun tryReleaseStalePortReservation(path: Path): Boolean {
    val lockFile = path.resolve("owner.json")
    val pid = jsonNumber(readJsonFile(lockFile)["pid"])?.toLong()
    if (pid != null && isPidAlive(pid)) return false
    return runCatching {
        Files.deleteIfExists(lockFile)
        Files.deleteIfExists(path)
        true
    }.getOrDefault(false)
}

fun releasePortReservation(path: Path?) {
    if (path == null) return
    runCatching {
        Files.deleteIfExists(path.resolve("owner.json"))
        Files.deleteIfExists(path)
    }
}

fun reserveAvailablePort(requestedPort: Int, maxOffset: Int = 50): ReservedPort? {
    val reservationRoot = harnessRoot.resolve("port-reservations")
    reservationRoot.createDirectories()
    for (candidate in requestedPort..(requestedPort + maxOffset)) {
        val reservationPath = reservationRoot.resolve(candidate.toString())
        val reserved = runCatching {
            Files.createDirectory(reservationPath)
            writeJsonFile(
                reservationPath.resolve("owner.json"),
                mapOf("pid" to currentPid(), "port" to candidate, "reserved_at" to isoTimestamp()),
            )
            true
        }.getOrElse { error ->
            if (error is FileAlreadyExistsException && tryReleaseStalePortReservation(reservationPath)) {
                runCatching {
                    Files.createDirectory(reservationPath)
                    writeJsonFile(
                        reservationPath.resolve("owner.json"),
                        mapOf("pid" to currentPid(), "port" to candidate, "reserved_at" to isoTimestamp()),
                    )
                    true
                }.getOrDefault(false)
            } else {
                false
            }
        }
        if (!reserved) continue
        try {
            ServerSocket(candidate).use { return ReservedPort(candidate, reservationPath) }
        } catch (_: Exception) {
            releasePortReservation(reservationPath)
        }
    }
    return null
}

class HarnessRun(
    val spec: HarnessSpec,
    val paths: HarnessPaths,
) {
    private val ownerPid = currentPid()
    private var finished = false
    private var lastStatus = linkedMapOf<String, Any?>(
        "status" to "starting",
        "command" to spec.command,
        "pid" to ownerPid,
        "started_at" to isoTimestamp(),
        "updated_at" to isoTimestamp(),
        "repo_or_scenario" to spec.repoOrScenario,
        "work_dir_or_run_root" to spec.workDirOrRunRoot,
        "requested_port" to spec.requestedPort,
        "actual_port" to spec.actualPort,
        "phase" to spec.phase,
        "evidence_paths" to spec.evidencePaths,
        "last_error" to null,
        "child_pids" to emptyList<Long>(),
    )
    private val shutdownHook = Thread {
        if (!finished) {
            finalizeState("aborted", lastError = "harness interrupted", preserveSummary = true)
        }
    }

    init {
        paths.dir.createDirectories()
        writeJsonFile(paths.lock, mapOf(
            "key" to paths.dir.fileName.toString(),
            "command" to spec.command,
            "run_kind" to spec.runKind,
            "pid" to ownerPid,
            "started_at" to lastStatus["started_at"],
            "status_path" to paths.status.toString(),
            "summary_path" to paths.summary.toString(),
            "work_dir_or_run_root" to spec.workDirOrRunRoot,
            "requested_port" to spec.requestedPort,
            "actual_port" to spec.actualPort,
            "evidence_paths" to spec.evidencePaths,
        ))
        writeJsonFile(paths.pids, mapOf("owner_pid" to ownerPid, "child_pids" to emptyList<Long>()))
        flushStatus()
        writeJsonFile(paths.summary, mapOf(
            "status" to "starting",
            "command" to spec.command,
            "started_at" to lastStatus["started_at"],
            "repo_or_scenario" to spec.repoOrScenario,
            "work_dir_or_run_root" to spec.workDirOrRunRoot,
            "requested_port" to spec.requestedPort,
            "actual_port" to spec.actualPort,
        ))
        syncPointers()
        Runtime.getRuntime().addShutdownHook(shutdownHook)
    }

    private fun flushStatus() {
        lastStatus["updated_at"] = isoTimestamp()
        writeJsonFile(paths.status, lastStatus)
        syncLatestPointer(spec.latestStatusPath, paths.status)
    }

    private fun syncPointers() {
        syncLatestPointer(spec.latestStatusPath, paths.status)
        syncLatestPointer(spec.latestSummaryPath, paths.summary)
    }

    fun announce(remapped: Boolean = false) {
        if (jsonOutput || quiet) return
        val portText = spec.actualPort?.let {
            if (remapped && spec.requestedPort != null && spec.requestedPort != spec.actualPort) {
                " port ${spec.requestedPort}->$it"
            } else {
                " port $it"
            }
        }.orEmpty()
        println("==> ${spec.runKind} ${paths.status}$portText")
    }

    fun updateStatus(
        status: String? = null,
        phase: String? = null,
        evidencePaths: List<String>? = null,
        lastError: String? = null,
        childPids: List<Long>? = null,
        extra: Map<String, Any?> = emptyMap(),
    ) {
        status?.let { lastStatus["status"] = it }
        phase?.let { lastStatus["phase"] = it }
        if (evidencePaths != null) lastStatus["evidence_paths"] = evidencePaths
        if (lastError != null || extra.containsKey("last_error")) lastStatus["last_error"] = lastError
        if (childPids != null) {
            lastStatus["child_pids"] = childPids
            writeJsonFile(paths.pids, mapOf("owner_pid" to ownerPid, "child_pids" to childPids))
        }
        for ((key, value) in extra) lastStatus[key] = value
        flushStatus()
    }

    fun finalizeState(
        status: String,
        lastError: String? = null,
        summaryExtra: Map<String, Any?> = emptyMap(),
        preserveSummary: Boolean = false,
    ) {
        if (finished) return
        finished = true
        updateStatus(status = status, lastError = lastError)
        val baseSummary = if (preserveSummary) readJsonFile(paths.summary).toMutableMap() else linkedMapOf()
        baseSummary["status"] = status
        baseSummary["command"] = spec.command
        baseSummary["repo_or_scenario"] = spec.repoOrScenario
        baseSummary["work_dir_or_run_root"] = spec.workDirOrRunRoot
        baseSummary["requested_port"] = spec.requestedPort
        baseSummary["actual_port"] = spec.actualPort
        baseSummary["started_at"] = lastStatus["started_at"]
        baseSummary["updated_at"] = isoTimestamp()
        if (lastError != null) baseSummary["last_error"] = lastError
        for ((key, value) in summaryExtra) baseSummary[key] = value
        writeJsonFile(paths.summary, baseSummary)
        syncPointers()
        releasePortReservation(spec.reservedPortPath)
        clearLock()
        runCatching { Runtime.getRuntime().removeShutdownHook(shutdownHook) }
    }

    private fun clearLock() {
        val lock = readJsonFile(paths.lock)
        val lockPid = jsonNumber(lock["pid"])?.toLong()
        val lockOwnerAlive = isPidAlive(lockPid)
        if (lockPid == null || lockPid == ownerPid || !lockOwnerAlive) {
            Files.deleteIfExists(paths.lock)
        }
    }
}

fun startHarnessRun(spec: HarnessSpec): Pair<HarnessRun?, HarnessLockConflict?> {
    val paths = resolveHarnessPaths(spec.keySeed)
    paths.dir.createDirectories()
    if (paths.lock.exists()) {
        val lock = readJsonFile(paths.lock)
        val lockPid = jsonNumber(lock["pid"])?.toLong()
        if (isPidAlive(lockPid)) {
            val statusPath = jsonString(lock["status_path"]) ?: paths.status.toString()
            val evidence = jsonStringList(lock["evidence_paths"])
            val message = buildString {
                append("active run already holds this harness lock")
                append(" (pid=${lockPid ?: "UNKNOWN"})")
                lock["command"]?.let { append(", command=$it") }
                append(", status=$statusPath")
                if (evidence.isNotEmpty()) append(", evidence=${evidence.joinToString(",")}")
            }
            return null to HarnessLockConflict(
                message,
                mapOf(
                    "activePid" to lockPid,
                    "activeCommand" to jsonString(lock["command"]),
                    "statusPath" to statusPath,
                    "evidencePaths" to evidence,
                    "lockPath" to paths.lock.toString(),
                ),
            )
        }
        Files.deleteIfExists(paths.lock)
    }
    return HarnessRun(spec, paths) to null
}

fun printResult(result: CommandResult) {
    if (jsonOutput) {
        val payload = linkedMapOf<String, Any?>(
            "command" to result.command,
            "status" to result.status,
            "summary" to result.summary,
            "details" to result.details,
            "findings" to result.findings,
            "artifacts" to result.artifacts,
            "metrics" to result.metrics,
            "nextSteps" to result.nextSteps,
            "mutated" to result.mutated,
            "evidenceLevel" to result.evidenceLevel,
        )
        println(toJson(payload))
        return
    }

    if (result.summary.isNotBlank()) {
        println(result.summary)
    }
    if (result.findings.isNotEmpty()) {
        for (finding in result.findings) {
            println("${finding.severity.uppercase()}: ${finding.message}")
        }
    }
    if (result.nextSteps.isNotEmpty()) {
        for (step in result.nextSteps) {
            println(step)
        }
    }
}

fun classifyBuildExit(exitCode: Int, output: String): Int {
    if (exitCode == 0) return 0
    if (exitCode == 2) return 2
    val prereqMarkers = listOf(
        "required command not found",
        "packwiz not found",
        "Java 17 was not found",
        "Kotlin was not found",
        "No such file or directory",
    )
    return if (prereqMarkers.any { output.contains(it, ignoreCase = true) }) 3 else 4
}

fun wrapProcessResult(
    commandName: String,
    processCommand: List<String>,
    summaryOnSuccess: String,
    evidenceLevel: String,
    mutated: Boolean = false,
    exitMapper: (Int, String) -> Int,
    artifacts: List<ArtifactRef> = emptyList(),
    details: Map<String, Any?> = emptyMap(),
): CommandResult {
    val run = runProcess(processCommand)
    val snippet = outputSnippet(run.output)
    val mappedExit = exitMapper(run.exitCode, run.output)
    return if (mappedExit == 0) {
        success(
            command = commandName,
            summary = summaryOnSuccess,
            details = details + listOfNotNull(snippet?.let { "capturedOutput" to it }).toMap(),
            artifacts = artifacts,
            mutated = mutated,
            evidenceLevel = evidenceLevel,
        )
    } else {
        CommandResult(
            command = commandName,
            status = "failure",
            summary = "$commandName failed with exit $mappedExit",
            details = details + listOfNotNull(snippet?.let { "capturedOutput" to it }).toMap(),
            findings = listOf(ValidationFinding("error", "$commandName failed with exit $mappedExit")),
            artifacts = artifacts,
            mutated = mutated,
            evidenceLevel = evidenceLevel,
            exitCode = mappedExit,
        )
    }
}

fun envMap(base: Map<String, String> = emptyMap()): MutableMap<String, String> =
    System.getenv().toMutableMap().apply { putAll(base) }

fun timestamp(): String = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"))

fun resolveUserPath(input: String): Path {
    val raw = Paths.get(input)
    return if (raw.isAbsolute) raw.normalize() else root.resolve(input).normalize()
}

fun deleteTree(path: Path) {
    if (!path.exists()) return
    Files.walk(path).use { stream ->
        stream.sorted(Comparator.reverseOrder()).forEach { Files.deleteIfExists(it) }
    }
}

fun copyTree(source: Path, destination: Path) {
    if (!source.exists()) return
    Files.walk(source).use { stream ->
        stream.forEach { entry ->
            val relative = source.relativize(entry)
            val target = if (relative.toString().isEmpty()) destination else destination.resolve(relative.toString())
            when {
                Files.isSymbolicLink(entry) -> {
                    target.parent?.createDirectories()
                    Files.deleteIfExists(target)
                    Files.createSymbolicLink(target, Files.readSymbolicLink(entry))
                }
                Files.isDirectory(entry) -> target.createDirectories()
                else -> {
                    target.parent?.createDirectories()
                    Files.copy(entry, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.COPY_ATTRIBUTES)
                }
            }
        }
    }
}

fun moveReplace(source: Path, destination: Path) {
    deleteTree(destination)
    destination.parent?.createDirectories()
    try {
        Files.move(source, destination, StandardCopyOption.REPLACE_EXISTING)
    } catch (_: Exception) {
        copyTree(source, destination)
        deleteTree(source)
    }
}

fun ensureLinkedOrCopiedDirectory(path: Path, target: Path) {
    if (Files.isSymbolicLink(path) && runCatching { Files.readSymbolicLink(path) == target }.getOrDefault(false)) return
    if (path.exists()) deleteTree(path)
    path.parent?.createDirectories()
    try {
        Files.createSymbolicLink(path, target)
    } catch (_: Exception) {
        copyTree(target, path)
    }
}

fun extractZipEntry(archive: Path, entryName: String, destination: Path): ProcessRun = try {
    java.util.zip.ZipFile(archive.toFile()).use { zip ->
        val entry = zip.getEntry(entryName) ?: return ProcessRun(1, "missing zip entry $entryName in $archive")
        destination.parent?.createDirectories()
        zip.getInputStream(entry).use { input ->
            Files.copy(input, destination, StandardCopyOption.REPLACE_EXISTING)
        }
    }
    ProcessRun(0, destination.toString())
} catch (error: Exception) {
    ProcessRun(1, "failed to extract $entryName from $archive: ${error.message}")
}

fun requireJava17Path(): String {
    return findJava17Path() ?: throw IllegalStateException("Java 17 was not found")
}

fun findForgeInstaller(): Path {
    val candidates = listOf(
        root.resolve("server-instance/forge-$forgeCoord-installer.jar"),
        root.resolve("server-template/forge-$forgeCoord-installer.jar"),
        root.resolve("forge-$forgeCoord-installer.jar"),
    )
    candidates.firstOrNull { it.exists() }?.let { return it }
    val discovered = Files.walk(root, 3).use { stream ->
        stream
            .filter { Files.isRegularFile(it) && it.fileName.toString() == "forge-$forgeCoord-installer.jar" }
            .findFirst()
            .orElse(null)
    }
    if (discovered != null) return discovered
    throw IllegalStateException("forge-$forgeCoord-installer.jar not found under repo/server roots")
}

fun writeLocalServerProperties(path: Path, port: Int, onlineMode: Boolean) {
    path.parent?.createDirectories()
    val text = """
allow-flight=true
difficulty=normal
enable-command-block=true
enable-query=false
enable-rcon=false
enforce-secure-profile=${if (onlineMode) "true" else "false"}
gamemode=survival
level-seed=better-content-validation-v1
level-name=world
max-players=8
motd=${if (onlineMode) "Better Content server bundle" else "Better Content local agent runtime"}
online-mode=${if (onlineMode) "true" else "false"}
pvp=true
server-ip=
server-port=$port
simulation-distance=6
spawn-protection=0
view-distance=12
white-list=false
""".trimIndent()
        .lineSequence()
        .filterNot { onlineMode && it.startsWith("level-seed=") }
        .joinToString("\n", postfix = "\n")
    Files.writeString(path, text)
}

fun setServerPort(path: Path, port: Int) {
    if (!path.exists()) {
        writeLocalServerProperties(path, port, onlineMode = false)
        return
    }
    val lines = Files.readAllLines(path).toMutableList()
    var replaced = false
    for (index in lines.indices) {
        if (lines[index].startsWith("server-port=")) {
            lines[index] = "server-port=$port"
            replaced = true
        }
    }
    if (!replaced) lines += "server-port=$port"
    Files.write(path, lines.map { "$it\n" }.joinToString("").toByteArray(Charsets.UTF_8))
}

fun runKotlinScript(script: Path, scriptArgs: List<String> = emptyList(), extraEnv: Map<String, String> = emptyMap()): ProcessRun {
    if (!script.exists()) return ProcessRun(4, "missing Kotlin script: $script")
    return runProcess(listOf("kotlin", script.toString()) + scriptArgs, extraEnv)
}

fun shaHex(path: Path, algorithm: String): String {
    val digest = MessageDigest.getInstance(algorithm)
    Files.newInputStream(path).use { input ->
        val buffer = ByteArray(8192)
        while (true) {
            val read = input.read(buffer)
            if (read <= 0) break
            digest.update(buffer, 0, read)
        }
    }
    return digest.digest().joinToString("") { "%02x".format(it) }
}

fun parsePackwizToml(file: Path): PackwizEntry {
    val text = Files.readString(file)
    var section = ""
    val values = linkedMapOf<String, String>()
    for (rawLine in text.lineSequence()) {
        val line = rawLine.replace(Regex("#.*$"), "").trim()
        if (line.isEmpty()) continue
        val sectionMatch = Regex("""^\[([^\]]+)]$""").matchEntire(line)
        if (sectionMatch != null) {
            section = sectionMatch.groupValues[1]
            continue
        }
        val kv = Regex("""^([A-Za-z0-9_-]+)\s*=\s*(.+)$""").matchEntire(line) ?: continue
        val key = if (section.isBlank()) kv.groupValues[1] else "$section.${kv.groupValues[1]}"
        var value = kv.groupValues[2].trim()
        if (value.startsWith("\"") && value.endsWith("\"")) {
            value = value.substring(1, value.length - 1).replace("\\\"", "\"")
        }
        values[key] = value
    }
    return PackwizEntry(
        path = root.relativize(file).toString(),
        dir = root.relativize(file.parent).toString(),
        filename = values["filename"].orEmpty(),
        side = values["side"] ?: "both",
        mode = values["download.mode"].orEmpty(),
        url = values["download.url"].orEmpty(),
        hash = values["download.hash"].orEmpty(),
        hashFormat = values["download.hash-format"].orEmpty(),
        cfProject = values["update.curseforge.project-id"],
        cfFile = values["update.curseforge.file-id"],
    )
}

fun packwizFiles(): List<Path> =
    listOf("mods", "resourcepacks", "shaderpacks").flatMap { dir ->
        val abs = root.resolve(dir)
        if (!abs.exists() || !abs.isDirectory()) emptyList()
        else Files.list(abs).use { stream ->
            stream.filter { entry -> entry.fileName.toString().endsWith(".pw.toml") }.toList()
        }
    }.sortedBy { it.toString() }

fun includeForSide(entry: PackwizEntry, wantedSide: String): Boolean {
    if (wantedSide == "both") return true
    if (entry.side != "both" && entry.side != wantedSide) return false
    if (wantedSide != "server") return true
    val basename = entry.path.substringAfterLast('/').removeSuffix(".pw.toml")
    return clientOnlyModGlobs.none { glob ->
        val regex = Regex("^" + Regex.escape(glob).replace("\\*", ".*").replace("\\?", ".") + "$", RegexOption.IGNORE_CASE)
        regex.matches(entry.filename) || regex.matches(basename) || regex.matches("mods/${entry.filename}")
    }
}

fun downloadUrl(entry: PackwizEntry): String? =
    when {
        entry.url.isNotBlank() -> entry.url
        entry.mode == "metadata:curseforge" && !entry.cfProject.isNullOrBlank() && !entry.cfFile.isNullOrBlank() ->
            "https://www.curseforge.com/api/v1/mods/${entry.cfProject}/files/${entry.cfFile}/download"
        else -> null
    }

fun isRuntimeModArtifact(name: String): Boolean {
    if (!(name.endsWith(".jar") || name.endsWith(".so"))) return false
    val lower = name.lowercase()
    return !(lower.endsWith("-sources.jar") || lower.endsWith("-source.jar") || lower.endsWith("-javadoc.jar"))
}

fun normalizeHash(format: String): String? {
    val normalized = format.lowercase().replace("-", "")
    return if (normalized in setOf("sha1", "sha256", "sha512", "md5")) normalized else null
}

fun existingOk(file: Path, entry: PackwizEntry): Boolean {
    if (!file.exists()) return false
    val algo = normalizeHash(entry.hashFormat) ?: return true
    return runCatching { shaHex(file, algo.uppercase()).equals(entry.hash, ignoreCase = true) }.getOrElse { false }
}

fun downloadTo(url: String, destination: Path): ProcessRun {
    destination.parent?.createDirectories()
    val temp = destination.resolveSibling("${destination.fileName}.tmp-${UUID.randomUUID()}")
    return try {
        val request = HttpRequest.newBuilder(URI.create(url)).header("User-Agent", "better-content-agent-runtime/1.0").build()
        val response = httpClient.send(request, HttpResponse.BodyHandlers.ofFile(temp))
        if (response.statusCode() !in 200..299) {
            Files.deleteIfExists(temp)
            ProcessRun(1, "download failed: $url: HTTP ${response.statusCode()}")
        } else {
            Files.move(temp, destination, StandardCopyOption.REPLACE_EXISTING)
            ProcessRun(0, "downloaded $destination")
        }
    } catch (error: Exception) {
        Files.deleteIfExists(temp)
        ProcessRun(1, "download failed: $url: ${error.message}")
    }
}

fun resolvePackwizDownloads(targetDir: Path, side: String, apply: Boolean, cacheDir: Path = root.resolve("generated/cache/packwiz-downloads")): ProcessRun {
    val dryRun = !apply
    if (side !in setOf("server", "client", "both")) return ProcessRun(2, "--side must be server, client, or both")
    val output = mutableListOf<String>()
    var present = 0
    var cached = 0
    var downloaded = 0
    var skipped = 0
    val entries = packwizFiles().map(::parsePackwizToml).filter { includeForSide(it, side) }
    for (entry in entries) {
        if (entry.filename.isBlank()) return ProcessRun(1, "${entry.path}: missing filename")
        val dest = targetDir.resolve(entry.dir).resolve(entry.filename)
        val cachePath = cacheDir.resolve(entry.dir).resolve(entry.filename)
        if (existingOk(dest, entry)) {
            present += 1
            output += "present ${targetDir.relativize(dest)}"
            continue
        }
        val url = downloadUrl(entry)
        if (url.isNullOrBlank()) {
            skipped += 1
            output += "skip ${entry.path}: no supported download URL"
            continue
        }
        if (dryRun) {
            output += if (existingOk(cachePath, entry)) "would restore ${targetDir.relativize(dest)} <- cache" else "would download ${targetDir.relativize(dest)} <- $url"
            continue
        }
        dest.parent?.createDirectories()
        if (existingOk(cachePath, entry)) {
            cachePath.parent?.createDirectories()
            Files.copy(cachePath, dest, StandardCopyOption.REPLACE_EXISTING)
            cached += 1
            output += "cached ${targetDir.relativize(dest)}"
            continue
        }
        cachePath.parent?.createDirectories()
        val download = downloadTo(url, cachePath)
        if (download.exitCode != 0) return ProcessRun(1, output.plus(download.output).joinToString("\n"))
        val algo = normalizeHash(entry.hashFormat)
        if (algo != null && entry.hash.isNotBlank()) {
            val actual = shaHex(cachePath, algo.uppercase())
            if (!actual.equals(entry.hash, ignoreCase = true)) {
                return ProcessRun(1, "${cachePath}: $algo mismatch expected ${entry.hash} got $actual")
            }
        }
        Files.copy(cachePath, dest, StandardCopyOption.REPLACE_EXISTING)
        downloaded += 1
        output += "downloaded ${targetDir.relativize(dest)}"
    }
    output += "packwiz downloads: entries=${entries.size} present=$present cached=$cached downloaded=$downloaded skipped=$skipped mode=${if (dryRun) "dry-run" else "apply"} side=$side cache=$cacheDir"
    return ProcessRun(0, output.joinToString("\n"))
}

fun pruneRuntimeMods(targetDir: Path, side: String, apply: Boolean): ProcessRun {
    if (side !in setOf("server", "client")) return ProcessRun(2, "--side must be server or client")
    val sourceModsDir = root.resolve("mods")
    val targetModsDir = targetDir.resolve("mods")
    val actual = if (targetModsDir.exists()) Files.list(targetModsDir).use { stream -> stream.filter { Files.isRegularFile(it) && (it.fileName.toString().endsWith(".jar") || it.fileName.toString().endsWith(".so")) }.map { it.fileName.toString() }.toList() } else emptyList()
    val expected = linkedSetOf<String>()
    var excluded = 0
    if (sourceModsDir.exists()) {
        Files.list(sourceModsDir).use { stream ->
            stream.forEach { entry ->
                val name = entry.fileName.toString()
                when {
                    isRuntimeModArtifact(name) -> {
                        val excludedOnServer = side == "server" && clientOnlyModGlobs.any { glob ->
                            val regex = Regex("^" + Regex.escape(glob).replace("\\*", ".*").replace("\\?", ".") + "$", RegexOption.IGNORE_CASE)
                            regex.matches(name) || regex.matches("mods/$name")
                        }
                        if (excludedOnServer) excluded += 1 else expected += name
                    }
                    name.endsWith(".pw.toml") -> {
                        val parsed = parsePackwizToml(entry)
                        if ((parsed.side == "both" || parsed.side == side) && parsed.filename.isNotBlank()) {
                            val excludedOnServer = side == "server" && clientOnlyModGlobs.any { glob ->
                                val regex = Regex("^" + Regex.escape(glob).replace("\\*", ".*").replace("\\?", ".") + "$", RegexOption.IGNORE_CASE)
                                regex.matches(parsed.filename) || regex.matches("mods/${parsed.filename}")
                            }
                            if (excludedOnServer) excluded += 1 else expected += parsed.filename
                        }
                    }
                }
            }
        }
    }
    val unexpected = actual.filter { it !in expected }.sorted()
    val output = mutableListOf<String>()
    if (apply) {
        unexpected.forEach {
            output += "remove mods/$it"
            Files.deleteIfExists(targetModsDir.resolve(it))
        }
    } else {
        unexpected.forEach { output += "would remove mods/$it" }
    }
    val finalActual = if (targetModsDir.exists()) Files.list(targetModsDir).use { stream -> stream.filter { Files.isRegularFile(it) && (it.fileName.toString().endsWith(".jar") || it.fileName.toString().endsWith(".so")) }.map { it.fileName.toString() }.toList() } else emptyList()
    val finalUnexpected = finalActual.filter { it !in expected }.sorted()
    val finalRuntimeActual = finalActual.filter(::isRuntimeModArtifact)
    val missing = expected.filter { it !in finalRuntimeActual }.sorted()
    output += "runtime mod prune: side=$side expected=${expected.size} actual=${finalActual.size} unexpected=${finalUnexpected.size} missing=${missing.size} excluded=$excluded removed=${if (apply) unexpected.size else 0} mode=${if (apply) "apply" else "dry-run"}"
    if (missing.isNotEmpty()) output += "missing expected runtime mods: ${missing.take(40).joinToString(", ")}${if (missing.size > 40) ", ... (${missing.size - 40} more)" else ""}"
    return ProcessRun(if (finalUnexpected.isEmpty() && missing.isEmpty()) 0 else 1, output.joinToString("\n"))
}

fun walkFiles(rootDir: Path, predicate: (Path) -> Boolean = { true }): List<Path> {
    if (!rootDir.exists()) return emptyList()
    return Files.walk(rootDir).use { stream -> stream.filter { Files.isRegularFile(it) && predicate(it) }.toList() }
}

fun pruneEmptyDirectories(rootDir: Path) {
    if (!rootDir.exists()) return
    Files.walk(rootDir).use { stream ->
        stream
            .filter { Files.isDirectory(it) }
            .toList()
            .sortedByDescending { it.nameCount }
            .forEach { dir ->
                if (dir != rootDir && Files.list(dir).use { children -> !children.findAny().isPresent }) {
                    Files.deleteIfExists(dir)
                }
            }
    }
}

fun shouldExcludeManagedFile(side: String, managedPath: String, relative: Path): Boolean {
    if (side != "server" || managedPath != "mods") return false
    val fileName = relative.fileName?.toString() ?: return false
    return clientOnlyModGlobs.any { pattern ->
        root.fileSystem.getPathMatcher("glob:$pattern").matches(Paths.get(fileName))
    }
}

fun newestFile(files: List<Path>): Path? = files.maxByOrNull { runCatching { Files.getLastModifiedTime(it).toMillis() }.getOrElse { 0L } }

fun addFinding(findings: MutableMap<String, HardFinding>, key: String, label: String, lineNumber: Int, line: String) {
    val finding = findings.getOrPut(key) { HardFinding(key, label) }
    finding.count += 1
    if (finding.matches.size < 20) finding.matches += HardFindingMatch(lineNumber, line)
}

fun scanHardFailures(logPath: Path?, instanceDir: Path?): HardScanResult {
    if (logPath == null || !logPath.exists()) {
        return HardScanResult(false, logPath?.toString(), instanceDir?.toString(), null, 0, listOf(HardFinding("missing_log", "Missing log", 1, mutableListOf(HardFindingMatch(0, "missing log: ${logPath ?: "UNKNOWN"}")))))
    }
    val findingsByKey = linkedMapOf<String, HardFinding>()
    var failedRecipeCount = 0
    var parseErrorCount = 0
    val logsToScan = mutableListOf(logPath to false)
    if (instanceDir != null) {
        for (name in listOf("server.log", "startup.log", "client.log")) {
            val kubeLog = instanceDir.resolve("logs/kubejs/$name")
            if (kubeLog.exists()) logsToScan += kubeLog to true
        }
    }
    for ((path, isKubeJsLog) in logsToScan.distinctBy { it.first.toAbsolutePath().normalize() }) {
        val sourcePrefix = instanceDir?.let { runCatching { it.relativize(path).toString() }.getOrNull() } ?: path.toString()
        Files.readAllLines(path).forEachIndexed { index, rawLine ->
            val lineNumber = index + 1
            val line = if (path == logPath) rawLine else "$sourcePrefix:$lineNumber: $rawLine"
            if (Regex("Error parsing recipe", RegexOption.IGNORE_CASE).containsMatchIn(rawLine)) parseErrorCount += 1
            Regex("""with (\d+) failed recipes""", RegexOption.IGNORE_CASE).find(rawLine)?.groupValues?.getOrNull(1)?.toIntOrNull()?.let {
                if (it > 0) {
                    failedRecipeCount = maxOf(failedRecipeCount, it)
                    addFinding(findingsByKey, "kubejs_failed_recipes", "KubeJS failed recipe count", lineNumber, line)
                }
            }
            if (isKubeJsLog && kubeJsErrorPattern.containsMatchIn(rawLine)) {
                addFinding(findingsByKey, "kubejs_script_error", "KubeJS script log errors", lineNumber, line)
            }
            for ((key, label, pattern) in hardPatterns) {
                val ignored = hardPatternIgnores[key].orEmpty().any { it.containsMatchIn(rawLine) }
                if (!ignored && pattern.containsMatchIn(rawLine)) addFinding(findingsByKey, key, label, lineNumber, line)
            }
        }
    }
    if (instanceDir != null) {
        val crashFiles = walkFiles(instanceDir.resolve("crash-reports")) { it.fileName.toString().matches(Regex("""crash-.*\.txt""")) }
        val newestCrash = newestFile(crashFiles)
        if (newestCrash != null && Files.getLastModifiedTime(newestCrash).toMillis() > Files.getLastModifiedTime(logPath).toMillis()) {
            addFinding(findingsByKey, "newer_crash_report", "Crash report newer than log", 0, instanceDir.relativize(newestCrash).toString())
        }
    }
    return HardScanResult(findingsByKey.isEmpty(), logPath.toString(), instanceDir?.toString(), failedRecipeCount, parseErrorCount, findingsByKey.values.toList())
}

class JsonParser(private val text: String) {
    private var index = 0

    fun parse(): Any? {
        skipWhitespace()
        val value = parseValue()
        skipWhitespace()
        return value
    }

    private fun parseValue(): Any? {
        skipWhitespace()
        if (index >= text.length) error("unexpected end of JSON")
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
                else -> error("expected , or } in object")
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
                else -> error("expected , or ] in array")
            }
        }
    }

    private fun parseString(): String {
        expect('"')
        val out = StringBuilder()
        while (index < text.length) {
            val ch = text[index++]
            when (ch) {
                '"' -> return out.toString()
                '\\' -> {
                    val esc = text[index++]
                    out.append(
                        when (esc) {
                            '"', '\\', '/' -> esc
                            'b' -> '\b'
                            'f' -> '\u000C'
                            'n' -> '\n'
                            'r' -> '\r'
                            't' -> '\t'
                            'u' -> {
                                val hex = text.substring(index, index + 4)
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
        if (text[index] == '-') index += 1
        while (index < text.length && text[index].isDigit()) index += 1
        if (index < text.length && text[index] == '.') {
            index += 1
            while (index < text.length && text[index].isDigit()) index += 1
        }
        if (index < text.length && (text[index] == 'e' || text[index] == 'E')) {
            index += 1
            if (index < text.length && (text[index] == '+' || text[index] == '-')) index += 1
            while (index < text.length && text[index].isDigit()) index += 1
        }
        val raw = text.substring(start, index)
        return if (raw.contains('.') || raw.contains('e', true)) raw.toDouble() else raw.toLong()
    }

    private fun parseLiteral(token: String, value: Any?): Any? {
        if (!text.startsWith(token, index)) error("expected $token")
        index += token.length
        return value
    }

    private fun skipWhitespace() {
        while (index < text.length && text[index].isWhitespace()) index += 1
    }

    private fun expect(ch: Char) {
        if (index >= text.length || text[index] != ch) error("expected $ch")
        index += 1
    }

    private fun peek(ch: Char): Boolean = index < text.length && text[index] == ch
}

fun parseJson(text: String): Any? = JsonParser(text).parse()

fun jsonObject(value: Any?): Map<String, Any?> = value as? Map<String, Any?> ?: emptyMap()
fun jsonArray(value: Any?): List<Any?> = value as? List<Any?> ?: emptyList()
fun jsonString(value: Any?): String? = value as? String
fun jsonBoolean(value: Any?): Boolean? = value as? Boolean
fun jsonNumber(value: Any?): Number? = value as? Number
fun jsonStringList(value: Any?): List<String> = jsonArray(value).mapNotNull(::jsonString)
fun jsonDouble(value: Any?): Double? = when (value) {
    is Number -> value.toDouble()
    is String -> value.toDoubleOrNull()
    else -> null
}

fun repoText(relPath: String): String = Files.readString(root.resolve(relPath))
fun repoExists(relPath: String): Boolean = root.resolve(relPath).exists()
fun repoJson(relPath: String): Any? = parseJson(repoText(relPath))
fun repoHasFile(relPath: String): Boolean = repoExists(relPath) && runCatching { Files.size(root.resolve(relPath)) > 0 }.getOrElse { false }
fun repoWalk(relRoot: String, predicate: (String) -> Boolean = { true }): List<String> =
    walkFiles(root.resolve(relRoot)).map { root.relativize(it).toString().replace(File.separatorChar, '/') }.filter(predicate)

fun jsSection(text: String, name: String): String {
    val start = text.indexOf("var $name = [")
    if (start < 0) return ""
    val bodyStart = text.indexOf('[', start)
    val end = text.indexOf("\n]", bodyStart)
    return if (end < 0) "" else text.substring(bodyStart + 1, end)
}

fun idsFromJsSection(sectionText: String): List<String> =
    Regex("""\{\s*id: '([^']+)'""").findAll(sectionText).map { it.groupValues[1] }.toList()

fun mapKeysFromJsObject(text: String, varName: String): List<String> {
    val start = text.indexOf("var $varName = {")
    if (start < 0) return emptyList()
    val bodyStart = text.indexOf('{', start)
    val end = text.indexOf("\n}", bodyStart)
    if (end < 0) return emptyList()
    return Regex("""^\s*([a-z0-9_]+):""", setOf(RegexOption.MULTILINE)).findAll(text.substring(bodyStart + 1, end)).map { it.groupValues[1] }.toList()
}
fun repoPath(relPath: String): Path = root.resolve(relPath)
fun repoRead(relPath: String): String = Files.readString(repoPath(relPath))
fun repoReadJson(relPath: String): Any? = parseJson(repoRead(relPath))
fun repoRel(path: Path): String = root.relativize(path).toString().replace(File.separatorChar, '/')
fun displayPath(path: Path): String =
    runCatching { root.relativize(path).toString().replace(File.separatorChar, '/') }.getOrElse { path.toString() }

fun stackRef(value: Any?): RecipeStackRef? {
    val obj = jsonObject(value)
    val id = jsonString(obj["id"]) ?: return null
    return RecipeStackRef(
        kind = jsonString(obj["kind"]) ?: "unknown",
        id = id,
        count = jsonDouble(obj["count"]) ?: jsonDouble(obj["amount"]),
        chance = jsonDouble(obj["chance"]),
    )
}

fun stackRefs(value: Any?): List<RecipeStackRef> = jsonArray(value).mapNotNull(::stackRef)

fun recipeGraphHit(value: Any?): RecipeGraphHit {
    val obj = jsonObject(value)
    val machines = jsonArray(obj["machines"]).mapNotNull { machine ->
        val machineObj = jsonObject(machine)
        jsonString(machineObj["label"]) ?: jsonString(machineObj["id"])
    }
    return RecipeGraphHit(
        id = jsonString(obj["id"]) ?: "UNKNOWN",
        type = jsonString(obj["type"]) ?: jsonString(obj["category"]) ?: "UNKNOWN",
        machines = machines,
        inputs = stackRefs(obj["inputs"]),
        outputs = stackRefs(obj["outputs"]),
        catalysts = stackRefs(obj["catalysts"]),
        fluidsIn = stackRefs(obj["fluids_in"]),
        fluidsOut = stackRefs(obj["fluids_out"]),
        parsed = jsonBoolean(obj["parsed"]) ?: false,
    )
}

fun stackMatches(stack: RecipeStackRef, query: String): Boolean {
    val normalizedQuery = query.removePrefix("#")
    return stack.id == normalizedQuery || stack.id == query
}

fun stackText(stack: RecipeStackRef): String {
    val amount = stack.count?.let {
        val text = if (it % 1.0 == 0.0) it.toLong().toString() else it.toString()
        if (text == "1") "" else "${text}x "
    }.orEmpty()
    val chance = stack.chance?.takeIf { it < 1.0 }?.let { " @ ${"%.1f".format(it * 100.0)}%" }.orEmpty()
    val prefix = if (stack.kind == "tag") "#" else ""
    return "$amount$prefix${stack.id}$chance"
}

fun stackListText(stacks: List<RecipeStackRef>): String =
    if (stacks.isEmpty()) "none" else stacks.joinToString(", ", limit = 8, truncated = "...") { stackText(it) }

fun hitDetails(hit: RecipeGraphHit): Map<String, Any?> = mapOf(
    "id" to hit.id,
    "type" to hit.type,
    "machines" to hit.machines,
    "inputs" to hit.inputs.map { mapOf("kind" to it.kind, "id" to it.id, "count" to it.count, "chance" to it.chance) },
    "outputs" to hit.outputs.map { mapOf("kind" to it.kind, "id" to it.id, "count" to it.count, "chance" to it.chance) },
    "catalysts" to hit.catalysts.map { mapOf("kind" to it.kind, "id" to it.id, "count" to it.count, "chance" to it.chance) },
    "fluidsIn" to hit.fluidsIn.map { mapOf("kind" to it.kind, "id" to it.id, "count" to it.count, "chance" to it.chance) },
    "fluidsOut" to hit.fluidsOut.map { mapOf("kind" to it.kind, "id" to it.id, "count" to it.count, "chance" to it.chance) },
    "parsed" to hit.parsed,
)

fun formatRecipeHit(hit: RecipeGraphHit): String {
    val machine = hit.machines.firstOrNull() ?: hit.type
    val inputs = (hit.inputs + hit.fluidsIn + hit.catalysts).let(::stackListText)
    val outputs = (hit.outputs + hit.fluidsOut).let(::stackListText)
    return buildString {
        appendLine("- ${hit.id}")
        appendLine("  type: ${hit.type}")
        appendLine("  machine: $machine")
        appendLine("  in: $inputs")
        append("  out: $outputs")
    }
}

fun loadRecipeGraph(path: Path): Pair<Map<String, Any?>, List<RecipeGraphHit>> {
    if (!path.exists()) error("recipe graph not found: $path; run tools/bc build dumps or tools/bc test smoke to refresh runtime evidence")
    val graph = jsonObject(parseJson(Files.readString(path)))
    if (jsonString(graph["schema"]) != "bc.recipe_graph.v1") {
        error("unsupported recipe graph schema in $path: ${jsonString(graph["schema"]) ?: "<missing>"}")
    }
    val recipes = jsonArray(graph["recipes"]).map(::recipeGraphHit)
    return graph to recipes
}

fun queryRecipeGraphItem(
    itemId: String,
    graphPath: Path,
    typeFilter: String?,
): Triple<Map<String, Any?>, List<RecipeGraphHit>, Pair<List<RecipeGraphHit>, List<RecipeGraphHit>>> {
    val (graph, recipes) = loadRecipeGraph(graphPath)
    val filtered = typeFilter?.let { type -> recipes.filter { it.type == type || it.type.contains(type, ignoreCase = true) } } ?: recipes
    val producers = filtered.filter { hit -> (hit.outputs + hit.fluidsOut).any { stackMatches(it, itemId) } }
    val consumers = filtered.filter { hit -> (hit.inputs + hit.fluidsIn + hit.catalysts).any { stackMatches(it, itemId) } }
    return Triple(graph, recipes, producers to consumers)
}

fun handleGraph(subArgs: List<String>): CommandResult {
    if (subArgs.isEmpty() || subArgs == listOf("--help")) {
        return success("graph", graphHelp(), evidenceLevel = "retained-runtime")
    }
    val command = subArgs.first()
    return when (command) {
        "item" -> {
            val itemId = subArgs.getOrNull(1) ?: return usageError("graph item requires ITEM_ID", graphHelp())
            var mode = "all"
            var limit = 25
            var typeFilter: String? = null
            var graphPath = root.resolve("generated/runtime-dumps/recipes.json")
            val rest = subArgs.drop(2)
            var index = 0
            while (index < rest.size) {
                when (rest[index]) {
                    "--producers" -> {
                        mode = "producers"
                        index += 1
                    }
                    "--consumers" -> {
                        mode = "consumers"
                        index += 1
                    }
                    "--all" -> {
                        mode = "all"
                        index += 1
                    }
                    "--limit" -> {
                        val raw = rest.getOrNull(index + 1) ?: return usageError("--limit needs a number", graphHelp())
                        limit = raw.toIntOrNull() ?: return usageError("--limit needs a number", graphHelp())
                        if (limit <= 0) return usageError("--limit must be positive", graphHelp())
                        index += 2
                    }
                    "--type" -> {
                        typeFilter = rest.getOrNull(index + 1) ?: return usageError("--type needs a recipe type", graphHelp())
                        index += 2
                    }
                    "--graph" -> {
                        graphPath = resolveUserPath(rest.getOrNull(index + 1) ?: return usageError("--graph needs a path", graphHelp()))
                        index += 2
                    }
                    "--help" -> return success("graph item", graphHelp(), evidenceLevel = "retained-runtime")
                    else -> return usageError("unknown argument: ${rest[index]}", graphHelp())
                }
            }
            val (graph, recipes, pair) = queryRecipeGraphItem(itemId, graphPath, typeFilter)
            val (producers, consumers) = pair
            val shownProducers = producers.take(limit)
            val shownConsumers = consumers.take(limit)
            val generatedAt = jsonString(graph["generated_at"]) ?: jsonString(graph["generatedAt"]) ?: "UNKNOWN"
            val producerSection = if (mode in setOf("producers", "all")) {
                buildString {
                    appendLine("Producers for $itemId: ${producers.size}${if (producers.size > shownProducers.size) " (showing ${shownProducers.size})" else ""}")
                    if (shownProducers.isEmpty()) appendLine("- none")
                    else appendLine(shownProducers.joinToString("\n") { formatRecipeHit(it) })
                }
            } else ""
            val consumerSection = if (mode in setOf("consumers", "all")) {
                buildString {
                    appendLine("Consumers for $itemId: ${consumers.size}${if (consumers.size > shownConsumers.size) " (showing ${shownConsumers.size})" else ""}")
                    if (shownConsumers.isEmpty()) appendLine("- none")
                    else appendLine(shownConsumers.joinToString("\n") { formatRecipeHit(it) })
                }
            } else ""
            success(
                command = "graph item",
                summary = listOf(
                    "Recipe graph: ${displayPath(graphPath)} ($generatedAt, ${recipes.size} recipes)",
                    producerSection.trimEnd(),
                    consumerSection.trimEnd(),
                ).filter { it.isNotBlank() }.joinToString("\n\n"),
                details = mapOf(
                    "item" to itemId,
                    "mode" to mode,
                    "limit" to limit,
                    "typeFilter" to typeFilter,
                    "graph" to graphPath.toString(),
                    "generatedAt" to generatedAt,
                    "recipeCount" to recipes.size,
                    "producerCount" to producers.size,
                    "consumerCount" to consumers.size,
                    "producers" to shownProducers.map(::hitDetails),
                    "consumers" to shownConsumers.map(::hitDetails),
                ),
                evidenceLevel = "retained-runtime",
            )
        }
        "route" -> {
            val itemId = subArgs.getOrNull(1) ?: return usageError("graph route requires ITEM_ID", graphHelp())
            var graphPath = root.resolve("generated/runtime-dumps/recipes.json")
            var sourcesPath = root.resolve("kubejs/config/progression_reachability_sources.json")
            var spinePath = root.resolve("kubejs/config/player_progression_regression.json")
            val rest = subArgs.drop(2)
            var index = 0
            while (index < rest.size) {
                when (rest[index]) {
                    "--graph" -> {
                        graphPath = resolveUserPath(rest.getOrNull(index + 1) ?: return usageError("--graph needs a path", graphHelp()))
                        index += 2
                    }
                    "--sources" -> {
                        sourcesPath = resolveUserPath(rest.getOrNull(index + 1) ?: return usageError("--sources needs a path", graphHelp()))
                        index += 2
                    }
                    "--spine" -> {
                        spinePath = resolveUserPath(rest.getOrNull(index + 1) ?: return usageError("--spine needs a path", graphHelp()))
                        index += 2
                    }
                    "--help" -> return success("graph route", graphHelp(), evidenceLevel = "retained-runtime")
                    else -> return usageError("unknown argument: ${rest[index]}", graphHelp())
                }
            }
            val context = loadReachabilityContext(graphPath, sourcesPath, spinePath)
            val (reachable, reason, iterations) = solveReachability(context.recipes, context.source)
            if (itemId !in reachable) {
                return CommandResult(
                    command = "graph route",
                    status = "failure",
                    summary = "$itemId is not reachable from accepted retained-runtime seeds; run tools/bc graph blockers $itemId for blocker details",
                    details = mapOf(
                        "item" to itemId,
                        "reachable" to false,
                        "graph" to graphPath.toString(),
                        "sources" to sourcesPath.toString(),
                        "spine" to spinePath.toString(),
                        "iterations" to iterations,
                        "route" to emptyList<Any>(),
                    ),
                    findings = listOf(ValidationFinding("error", "$itemId is not reachable from accepted retained-runtime seeds")),
                    evidenceLevel = "retained-runtime",
                    exitCode = 1,
                )
            }
            val route = buildReachabilityRoute(itemId, reason)
            success(
                command = "graph route",
                summary = buildString {
                    appendLine("$itemId is reachable from accepted retained-runtime seeds in $iterations iteration(s)")
                    append(route.joinToString("\n") { step ->
                        val recipe = (step["recipe"] as? String)?.let { " <= $it" }.orEmpty()
                        "${step["item"]} [${step["kind"]}]$recipe"
                    })
                }.trim(),
                details = mapOf(
                    "item" to itemId,
                    "reachable" to true,
                    "graph" to graphPath.toString(),
                    "sources" to sourcesPath.toString(),
                    "spine" to spinePath.toString(),
                    "iterations" to iterations,
                    "route" to route,
                ),
                evidenceLevel = "retained-runtime",
            )
        }
        "blockers" -> {
            val itemId = subArgs.getOrNull(1) ?: return usageError("graph blockers requires ITEM_ID", graphHelp())
            var graphPath = root.resolve("generated/runtime-dumps/recipes.json")
            var sourcesPath = root.resolve("kubejs/config/progression_reachability_sources.json")
            var spinePath = root.resolve("kubejs/config/player_progression_regression.json")
            var limit = 5
            val rest = subArgs.drop(2)
            var index = 0
            while (index < rest.size) {
                when (rest[index]) {
                    "--graph" -> {
                        graphPath = resolveUserPath(rest.getOrNull(index + 1) ?: return usageError("--graph needs a path", graphHelp()))
                        index += 2
                    }
                    "--sources" -> {
                        sourcesPath = resolveUserPath(rest.getOrNull(index + 1) ?: return usageError("--sources needs a path", graphHelp()))
                        index += 2
                    }
                    "--spine" -> {
                        spinePath = resolveUserPath(rest.getOrNull(index + 1) ?: return usageError("--spine needs a path", graphHelp()))
                        index += 2
                    }
                    "--limit" -> {
                        val raw = rest.getOrNull(index + 1) ?: return usageError("--limit needs a number", graphHelp())
                        limit = raw.toIntOrNull() ?: return usageError("--limit needs a number", graphHelp())
                        if (limit <= 0) return usageError("--limit must be positive", graphHelp())
                        index += 2
                    }
                    "--help" -> return success("graph blockers", graphHelp(), evidenceLevel = "retained-runtime")
                    else -> return usageError("unknown argument: ${rest[index]}", graphHelp())
                }
            }
            val context = loadReachabilityContext(graphPath, sourcesPath, spinePath)
            val (reachable, reason, iterations) = solveReachability(context.recipes, context.source)
            val blockers = blockedRecipeEntries(itemId, context.recipes, context.source, reachable, limit)
            if (itemId in reachable) {
                return success(
                    command = "graph blockers",
                    summary = "$itemId is already reachable from accepted retained-runtime seeds; run tools/bc graph route $itemId for one deterministic route",
                    details = mapOf(
                        "item" to itemId,
                        "reachable" to true,
                        "graph" to graphPath.toString(),
                        "sources" to sourcesPath.toString(),
                        "spine" to spinePath.toString(),
                        "iterations" to iterations,
                        "blockers" to emptyList<Any>(),
                    ),
                    evidenceLevel = "retained-runtime",
                )
            }
            success(
                command = "graph blockers",
                summary = buildString {
                    appendLine("$itemId is not reachable from accepted retained-runtime seeds after $iterations iteration(s)")
                    append(
                        blockers.joinToString("\n") { blocker ->
                            when (blocker["kind"]) {
                                "no-producer" -> "- ${blocker["message"]}"
                                else -> "- ${blocker["recipe"]} [${blocker["type"]}] missing " + listOf(
                                    "items=${(blocker["missingItems"] as List<*>).joinToString(", ")}",
                                    "tags=${(blocker["missingTags"] as List<*>).joinToString(", ")}",
                                    "machines=${(blocker["missingMachines"] as List<*>).joinToString(", ")}",
                                    "fluids=${(blocker["missingFluids"] as List<*>).joinToString(", ")}",
                                ).filterNot { it.endsWith("=") }.joinToString("; ")
                            }
                        },
                    )
                }.trim(),
                details = mapOf(
                    "item" to itemId,
                    "reachable" to false,
                    "graph" to graphPath.toString(),
                    "sources" to sourcesPath.toString(),
                    "spine" to spinePath.toString(),
                    "iterations" to iterations,
                    "blockers" to blockers,
                ),
                evidenceLevel = "retained-runtime",
            )
        }
        else -> usageError("unknown graph command: $command", graphHelp())
    }
}

fun handleInspect(subArgs: List<String>): CommandResult {
    if (subArgs.isEmpty() || subArgs == listOf("--help")) {
        return success("inspect", inspectHelp(), evidenceLevel = "retained-runtime")
    }
    if (subArgs.first() != "item") return usageError("unknown inspect command: ${subArgs.first()}", inspectHelp())
    val itemId = subArgs.getOrNull(1) ?: return usageError("inspect item requires ITEM_ID", inspectHelp())
    var mode = "all"
    var limit = 25
    var typeFilter: String? = null
    var graphPath = root.resolve("generated/runtime-dumps/recipes.json")
    val rest = subArgs.drop(2)
    var index = 0
    while (index < rest.size) {
        when (rest[index]) {
            "--recipes" -> {
                mode = "recipes"
                index += 1
            }
            "--uses" -> {
                mode = "uses"
                index += 1
            }
            "--all" -> {
                mode = "all"
                index += 1
            }
            "--limit" -> {
                val raw = rest.getOrNull(index + 1) ?: return usageError("--limit needs a number", inspectHelp())
                limit = raw.toIntOrNull() ?: return usageError("--limit needs a number", inspectHelp())
                if (limit <= 0) return usageError("--limit must be positive", inspectHelp())
                index += 2
            }
            "--type" -> {
                typeFilter = rest.getOrNull(index + 1) ?: return usageError("--type needs a recipe type", inspectHelp())
                index += 2
            }
            "--graph" -> {
                graphPath = resolveUserPath(rest.getOrNull(index + 1) ?: return usageError("--graph needs a path", inspectHelp()))
                index += 2
            }
            "--help" -> return success("inspect item", inspectHelp(), evidenceLevel = "retained-runtime")
            else -> return usageError("unknown argument: ${rest[index]}", inspectHelp())
        }
    }
    val (graph, recipes, pair) = queryRecipeGraphItem(itemId, graphPath, typeFilter)
    val (recipeHits, useHits) = pair
    val shownRecipes = recipeHits.take(limit)
    val shownUses = useHits.take(limit)
    val generatedAt = jsonString(graph["generated_at"]) ?: jsonString(graph["generatedAt"]) ?: "UNKNOWN"
    val recipeSection = if (mode in setOf("recipes", "all")) {
        buildString {
            appendLine("Recipes producing $itemId: ${recipeHits.size}${if (recipeHits.size > shownRecipes.size) " (showing ${shownRecipes.size})" else ""}")
            if (shownRecipes.isEmpty()) appendLine("- none")
            else appendLine(shownRecipes.joinToString("\n") { formatRecipeHit(it) })
        }
    } else ""
    val usesSection = if (mode in setOf("uses", "all")) {
        buildString {
            appendLine("Uses consuming $itemId: ${useHits.size}${if (useHits.size > shownUses.size) " (showing ${shownUses.size})" else ""}")
            if (shownUses.isEmpty()) appendLine("- none")
            else appendLine(shownUses.joinToString("\n") { formatRecipeHit(it) })
        }
    } else ""
    val summary = listOf(
        "Recipe graph: ${displayPath(graphPath)} ($generatedAt, ${recipes.size} recipes)",
        recipeSection.trimEnd(),
        usesSection.trimEnd(),
    ).filter { it.isNotBlank() }.joinToString("\n\n")
    return success(
        command = "inspect item",
        summary = summary,
        details = mapOf(
            "item" to itemId,
            "mode" to mode,
            "limit" to limit,
            "typeFilter" to typeFilter,
            "graph" to graphPath.toString(),
            "generatedAt" to generatedAt,
            "recipeCount" to recipes.size,
            "recipesProducingCount" to recipeHits.size,
            "usesConsumingCount" to useHits.size,
            "recipesProducing" to shownRecipes.map(::hitDetails),
            "usesConsuming" to shownUses.map(::hitDetails),
        ),
        evidenceLevel = "retained-runtime",
    )
}

fun loadWorkspaceRepoDefinitions(): List<WorkspaceRepoDefinition> {
    val rootObject = jsonObject(repoReadJson("tools/workspace_test_inventory.json"))
    return jsonArray(rootObject["repos"]).map { entry ->
        val repo = jsonObject(entry)
        WorkspaceRepoDefinition(
            id = jsonString(repo["id"]) ?: error("workspace repo entry missing id"),
            path = jsonString(repo["path"]) ?: error("workspace repo entry missing path"),
            kind = jsonString(repo["kind"]) ?: "unknown",
            command = jsonStringList(repo["fastCommand"]).ifEmpty { error("workspace repo entry missing fastCommand") },
        )
    }
}

fun parseRepoFilters(args: List<String>, mode: String): Pair<List<String>, Boolean> {
    val filters = mutableListOf<String>()
    var listOnly = false
    var index = 0
    while (index < args.size) {
        when (args[index]) {
            "--repo" -> {
                val raw = args.getOrNull(index + 1) ?: return emptyList<String>() to listOnly
                filters += raw.split(',').map(String::trim).filter(String::isNotBlank)
                index += 2
            }
            "--list-repos" -> {
                listOnly = true
                index += 1
            }
            "--help" -> return filters to listOnly
            else -> error("unknown argument for test $mode: ${args[index]}")
        }
    }
    return filters to listOnly
}

fun repoMatchesFilter(repo: WorkspaceRepoDefinition, filter: String): Boolean {
    val normalized = filter.trim().trimEnd('/').replace('\\', '/')
    val repoPath = repo.path.trimEnd('/').replace('\\', '/')
    return normalized == repo.id || normalized == repoPath || normalized == Paths.get(repoPath).fileName.toString()
}

fun selectWorkspaceRepos(mode: String, filters: List<String>): Pair<List<WorkspaceRepoDefinition>, List<String>> {
    val repos = loadWorkspaceRepoDefinitions()
    val eligible = repos
    if (filters.isEmpty()) return eligible to emptyList()
    val selected = eligible.filter { repo -> filters.any { repoMatchesFilter(repo, it) } }
    val unmatched = filters.filterNot { filter -> eligible.any { repoMatchesFilter(it, filter) } }
    return selected to unmatched
}

fun formatWorkspaceRepoList(mode: String, repos: List<WorkspaceRepoDefinition>): String = buildString {
    appendLine("workspace $mode repo selection:")
    repos.forEach { repo ->
        appendLine("  ${repo.id.padEnd(34)} ${repo.path} :: ${repo.command.joinToString(" ")}")
    }
}

fun runWorkspaceLane(mode: String, filters: List<String>, listOnly: Boolean): ProcessRun {
    val (selected, unmatched) = selectWorkspaceRepos(mode, filters)
    if (unmatched.isNotEmpty()) return ProcessRun(2, "unknown repo filter(s): ${unmatched.joinToString(", ")}")
    if (selected.isEmpty()) return ProcessRun(2, "no workspace repos matched test $mode selection")
    if (listOnly) return ProcessRun(0, formatWorkspaceRepoList(mode, selected))

    val output = mutableListOf<String>()
    for (repo in selected) {
        val workDir = root.resolve(repo.path).normalize()
        val command = repo.command
        val run = runProcess(command, stream = false, workDir = workDir)
        output += buildString {
            appendLine("==> ${repo.id} (${repoRel(workDir)})")
            appendLine(command.joinToString(" "))
            if (run.output.isNotBlank()) append(run.output)
        }.trim()
        if (run.exitCode != 0) return ProcessRun(run.exitCode, output.joinToString("\n\n"))
    }
    return ProcessRun(0, output.joinToString("\n\n"))
}

fun sha256(path: Path): String {
    val digest = MessageDigest.getInstance("SHA-256")
    Files.newInputStream(path).use { input ->
        val buffer = ByteArray(8192)
        while (true) {
            val read = input.read(buffer)
            if (read < 0) break
            if (read > 0) digest.update(buffer, 0, read)
        }
    }
    return digest.digest().joinToString("") { "%02x".format(it) }
}

fun parseIndexEntries(indexText: String): List<Pair<String, String>> =
    Regex("""\[\[files\]\]\s+file = "([^"]+)"\s+hash = "([0-9a-f]+)"""").findAll(indexText).map {
        it.groupValues[1] to it.groupValues[2]
    }.toList()

fun countCodeFiles(absRoot: Path): Int =
    if (!absRoot.exists()) 0 else walkFiles(absRoot) { it.fileName.toString().endsWith(".kt") || it.fileName.toString().endsWith(".java") }.size

fun countTestFiles(absRoot: Path): Int = countCodeFiles(absRoot.resolve("src/test"))

fun arraysEqual(a: List<String>?, b: List<String>?): Boolean = a != null && b != null && a == b

fun getByPath(value: Any?, keys: List<String>): Any? {
    var current: Any? = value
    for (key in keys) {
        current = jsonObject(current)[key]
    }
    return current
}

data class NativeValidatorResult(val exitCode: Int, val output: String)

fun versionRuleList(value: Any?): List<VersionRule> =
    jsonArray(value).mapNotNull { rule ->
        val obj = jsonObject(rule)
        val action = jsonString(obj["action"]) ?: return@mapNotNull null
        val osName = jsonString(jsonObject(obj["os"])["name"])
        val hasFeatures = obj["features"] != null
        VersionRule(action, osName, hasFeatures)
    }

fun versionArtifact(value: Any?): VersionArtifact? {
    val obj = jsonObject(value)
    if (obj.isEmpty()) return null
    return VersionArtifact(jsonString(obj["path"]), jsonString(obj["url"]))
}

fun versionLibrary(value: Any?): VersionLibrary? {
    val obj = jsonObject(value)
    if (obj.isEmpty()) return null
    val downloads = jsonObject(obj["downloads"])
    val classifiers = jsonObject(downloads["classifiers"]).mapValues { versionArtifact(it.value) ?: VersionArtifact(null, null) }
    return VersionLibrary(
        name = jsonString(obj["name"]),
        rules = versionRuleList(obj["rules"]),
        downloads = VersionDownloads(
            artifact = versionArtifact(downloads["artifact"]),
            classifiers = classifiers,
        ),
        nativesLinux = jsonString(jsonObject(obj["natives"])["linux"]),
    )
}

fun versionArgumentEntries(value: Any?): List<VersionArgumentEntry> =
    jsonArray(value).mapNotNull { entry ->
        when (entry) {
            is String -> VersionArgumentEntry(listOf(entry), emptyList())
            is Map<*, *> -> {
                val obj = jsonObject(entry)
                val values = when (val raw = obj["value"]) {
                    is String -> listOf(raw)
                    is List<*> -> raw.map { it.toString() }
                    else -> emptyList()
                }
                VersionArgumentEntry(values, versionRuleList(obj["rules"]))
            }
            else -> null
        }
    }

fun parseVersionModel(text: String): VersionModel {
    val obj = jsonObject(parseJson(text))
    val downloads = jsonObject(obj["downloads"])
    val assetIndex = jsonObject(obj["assetIndex"])
    return VersionModel(
        id = jsonString(obj["id"]),
        inheritsFrom = jsonString(obj["inheritsFrom"]),
        mainClass = jsonString(obj["mainClass"]),
        type = jsonString(obj["type"]),
        assetIndexId = jsonString(assetIndex["id"]),
        assets = jsonString(obj["assets"]),
        downloadsClientUrl = jsonString(jsonObject(downloads["client"])["url"]),
        libraries = jsonArray(obj["libraries"]).mapNotNull(::versionLibrary),
        gameArgs = versionArgumentEntries(jsonObject(obj["arguments"])["game"]),
        jvmArgs = versionArgumentEntries(jsonObject(obj["arguments"])["jvm"]),
        minecraftArguments = jsonString(obj["minecraftArguments"]),
    )
}

fun isVanillaVersionId(id: String): Boolean = Regex("""^\d+\.\d+(?:\.\d+)?$""").matches(id)

fun isForgeLaunch(version: VersionModel): Boolean =
    version.gameArgs.any { entry -> entry.values.any { it == "--launchTarget" || it == "forgeclient" } }

fun loadMergedVersion(clientDir: Path, versionId: String, inherited: MutableList<String> = mutableListOf()): VersionModel {
    val file = clientDir.resolve("versions/$versionId/$versionId.json")
    require(file.exists()) { "missing version JSON: $file" }
    val version = parseVersionModel(Files.readString(file))
    val withDownload = if (isVanillaVersionId(versionId) && version.libraries.isEmpty() && version.downloadsClientUrl == null) {
        version
    } else version
    val parentId = withDownload.inheritsFrom ?: return withDownload
    inherited += parentId
    val parent = loadMergedVersion(clientDir, parentId, inherited)
    return VersionModel(
        id = withDownload.id ?: parent.id,
        inheritsFrom = withDownload.inheritsFrom,
        mainClass = withDownload.mainClass ?: parent.mainClass,
        type = withDownload.type ?: parent.type,
        assetIndexId = withDownload.assetIndexId ?: parent.assetIndexId,
        assets = withDownload.assets ?: parent.assets,
        downloadsClientUrl = withDownload.downloadsClientUrl ?: parent.downloadsClientUrl,
        libraries = parent.libraries + withDownload.libraries,
        gameArgs = parent.gameArgs + withDownload.gameArgs,
        jvmArgs = parent.jvmArgs + withDownload.jvmArgs,
        minecraftArguments = withDownload.minecraftArguments ?: parent.minecraftArguments,
    )
}

fun allowed(rules: List<VersionRule>): Boolean {
    if (rules.isEmpty()) return true
    var result = false
    for (rule in rules) {
        if (rule.osName != null && rule.osName != "linux") continue
        if (rule.hasFeatures) continue
        result = rule.action == "allow"
    }
    return result
}

fun replaceVars(text: String, replacements: Map<String, String>): String =
    Regex("""\$\{([^}]+)}""").replace(text) { match -> replacements[match.groupValues[1]] ?: "" }

fun mavenPath(name: String): String {
    val parts = name.split(':')
    if (parts.size < 3) return ""
    val group = parts[0].replace('.', '/')
    val artifact = parts[1]
    val version = parts[2]
    val classifier = parts.getOrNull(3)
    val file = if (classifier.isNullOrBlank()) "$artifact-$version.jar" else "$artifact-$version-$classifier.jar"
    return "$group/$artifact/$version/$file"
}

fun normalizeArtifact(library: VersionLibrary): VersionArtifact? {
    library.downloads.artifact?.path?.let { return library.downloads.artifact }
    val name = library.name ?: return library.downloads.artifact
    val path = mavenPath(name)
    if (path.isBlank()) return library.downloads.artifact
    return VersionArtifact(path, library.downloads.artifact?.url)
}

fun offlineUuid(name: String): String {
    val bytes = MessageDigest.getInstance("MD5").digest("OfflinePlayer:$name".toByteArray())
    val hex = bytes.joinToString("") { "%02x".format(it) }
    return "${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}"
}

fun quoteArgfile(value: String): String =
    if (Regex("""^[A-Za-z0-9_./:=+@,%${'$'}{}-]+$""").matches(value)) value else "\"${value.replace("\\", "\\\\").replace("\"", "\\\"")}\""

fun splitServer(server: String): Pair<String, String> {
    val idx = server.lastIndexOf(':')
    require(idx >= 1) { "--server must be HOST:PORT" }
    return server.substring(0, idx) to server.substring(idx + 1)
}

fun extractArchive(archive: Path, destination: Path): ProcessRun {
    val unzip = runProcess(listOf("unzip", "-oq", archive.toString(), "-d", destination.toString()), stream = false)
    if (unzip.exitCode == 0) return unzip
    destination.createDirectories()
    val builder = ProcessBuilder("jar", "xf", archive.toString())
    builder.directory(destination.toFile())
    builder.redirectErrorStream(true)
    val process = builder.start()
    val buffer = ByteArrayOutputStream()
    process.inputStream.copyTo(buffer)
    val exit = process.waitFor()
    return ProcessRun(exit, buffer.toString(Charsets.UTF_8).trim())
}

fun mirrorRepoDatapacks(worldDir: Path) {
    val targetRoot = worldDir.resolve("datapacks")
    targetRoot.createDirectories()
    val sourceRoot = root.resolve("datapacks")
    if (!sourceRoot.exists()) return
    Files.list(sourceRoot).use { stream ->
        stream.forEach { datapack ->
            val target = targetRoot.resolve(datapack.fileName.toString())
            deleteTree(target)
            copyTree(datapack, target)
        }
    }
}

fun generateMinecraftClientArgfile(clientDir: Path, versionId: String, username: String, server: String, out: Path): ProcessRun {
    val inherited = mutableListOf<String>()
    val version = loadMergedVersion(clientDir, versionId, inherited)
    val librariesDir = clientDir.resolve("libraries")
    val assetsDir = clientDir.resolve("assets")
    val nativesDir = clientDir.resolve("natives/$versionId")
    out.parent?.createDirectories()
    nativesDir.createDirectories()
    val classpath = mutableListOf<String>()
    for (library in version.libraries) {
        if (!allowed(library.rules)) continue
        val artifact = normalizeArtifact(library) ?: continue
        artifact.path ?: continue
        val file = librariesDir.resolve(artifact.path)
        if (!file.exists() && !artifact.url.isNullOrBlank()) {
            val download = downloadTo(artifact.url, file)
            if (download.exitCode != 0) return download
        }
        if (file.exists()) classpath += file.toString()
        val nativeArtifact = library.nativesLinux?.let { library.downloads.classifiers[it] }
        if (nativeArtifact?.path != null) {
            val nativeJar = librariesDir.resolve(nativeArtifact.path)
            if (!nativeJar.exists() && !nativeArtifact.url.isNullOrBlank()) {
                val download = downloadTo(nativeArtifact.url, nativeJar)
                if (download.exitCode != 0) return download
            }
            if (nativeJar.exists()) {
                val extract = extractArchive(nativeJar, nativesDir)
                if (extract.exitCode != 0) return extract
            }
        }
    }
    for (id in listOf(versionId) + inherited) {
        if (isForgeLaunch(version) && isVanillaVersionId(id)) continue
        val jar = clientDir.resolve("versions/$id/$id.jar")
        if (jar.exists()) classpath += jar.toString()
    }
    if (classpath.isEmpty()) return ProcessRun(1, "no classpath entries found under $librariesDir")
    val assetIndex = version.assetIndexId ?: version.assets ?: "1.20"
    val replacements = mapOf(
        "auth_player_name" to username,
        "version_name" to versionId,
        "game_directory" to clientDir.toString(),
        "assets_root" to assetsDir.toString(),
        "assets_index_name" to assetIndex,
        "auth_uuid" to offlineUuid(username),
        "auth_access_token" to "0",
        "clientid" to UUID.randomUUID().toString(),
        "auth_xuid" to "0",
        "user_type" to "legacy",
        "version_type" to (version.type ?: "forge"),
        "natives_directory" to nativesDir.toString(),
        "launcher_name" to "better-content-direct",
        "launcher_version" to "1",
        "classpath" to classpath.joinToString(":"),
        "classpath_separator" to ":",
        "library_directory" to librariesDir.toString(),
    )
    fun expand(entries: List<VersionArgumentEntry>): List<String> =
        entries.filter { allowed(it.rules) }.flatMap { it.values }.map { replaceVars(it, replacements) }
    val jvmArgs = expand(version.jvmArgs).map {
        if (!it.startsWith("-DignoreList=") || inherited.none(::isVanillaVersionId)) it else {
            val existing = it.removePrefix("-DignoreList=").split(',').filter { s -> s.isNotBlank() }.toMutableList()
            inherited.filter(::isVanillaVersionId).map { id -> "$id.jar" }.forEach { jar -> if (jar !in existing) existing += jar }
            "-DignoreList=${existing.joinToString(",")}"
        }
    }
    val fileArgs = mutableListOf<String>()
    fileArgs += jvmArgs
    if (jvmArgs.none { it == replacements.getValue("classpath") }) {
        fileArgs += listOf("-cp", replacements.getValue("classpath"))
    }
    fileArgs += (version.mainClass ?: return ProcessRun(1, "missing mainClass in $versionId"))
    val gameArgs = if (version.gameArgs.isNotEmpty()) expand(version.gameArgs) else (version.minecraftArguments ?: "").split(Regex("""\s+""")).filter { it.isNotBlank() }.map { replaceVars(it, replacements) }
    fileArgs += gameArgs
    if (server.isNotBlank()) {
        val (host, port) = splitServer(server)
        fileArgs += listOf("--quickPlayMultiplayer", "$host:$port")
    }
    Files.writeString(out, fileArgs.joinToString("\n") { quoteArgfile(it) } + "\n")
    return ProcessRun(0, out.toString())
}

val playtestVersionPattern = Regex("""(?m)^version\s*=\s*"Playtest v([1-9][0-9]*)"\s*$""")

fun currentPlaytestRelease(): PlaytestRelease {
    val packToml = root.resolve("pack.toml")
    val text = Files.readString(packToml)
    val match = playtestVersionPattern.find(text)
        ?: error("pack.toml version must use the form: Playtest v<N>")
    val version = match.groupValues[1].toIntOrNull()
        ?: error("pack.toml Playtest version is outside the supported integer range")
    return PlaytestRelease(version, "better-content-playtest-v$version")
}

fun nextPlaytestRelease(current: PlaytestRelease = currentPlaytestRelease()): PlaytestRelease {
    val version = Math.addExact(current.version, 1)
    return PlaytestRelease(version, "better-content-playtest-v$version")
}

fun reserveNextPlaytestRelease(): PlaytestRelease {
    val next = nextPlaytestRelease()
    val packToml = root.resolve("pack.toml")
    val text = Files.readString(packToml)
    val updated = playtestVersionPattern.replace(text, "version = \"Playtest v${next.version}\"")
    Files.writeString(packToml, updated)
    return next
}

fun releaseArchivePaths(exportsDir: Path, release: PlaytestRelease): Pair<Path, Path> =
    exportsDir.resolve("${release.baseName}-curseforge.zip") to exportsDir.resolve("${release.baseName}-server.zip")

fun refuseExistingReleaseArchives(vararg archives: Path): ProcessRun? {
    val existing = archives.filter { it.exists() }
    return if (existing.isEmpty()) null else ProcessRun(
        1,
        "refusing to overwrite existing release archive(s):\n${existing.joinToString("\n")}",
    )
}

fun syncManaged(side: String, targetDir: Path, apply: Boolean): ProcessRun {
    val output = mutableListOf<String>()
    targetDir.createDirectories()
    managedPaths.forEach { managedPath ->
        val source = root.resolve(managedPath)
        if (!source.exists()) return@forEach
        val destination = targetDir.resolve(managedPath)
        if (!Files.isDirectory(source)) {
            output += "${if (apply) "COPY" else "WOULD COPY"} $managedPath"
            if (apply) {
                destination.parent?.createDirectories()
                Files.copy(source, destination, StandardCopyOption.REPLACE_EXISTING)
            }
            return@forEach
        }

        val sourceFiles = walkFiles(source).filterNot { file ->
            shouldExcludeManagedFile(side, managedPath, source.relativize(file))
        }
        val sourceRelative = sourceFiles.map { source.relativize(it) }
        val sourceByRelative = sourceRelative.zip(sourceFiles).toMap()
        val targetFiles = walkFiles(destination)
        val targetRelative = targetFiles.map { destination.relativize(it) }

        targetRelative.filter { it !in sourceByRelative.keys }.sortedByDescending { it.nameCount }.forEach { relative ->
            output += "${if (apply) "DELETE" else "WOULD DELETE"} $managedPath/$relative"
            if (apply) Files.deleteIfExists(destination.resolve(relative))
        }
        sourceRelative.sortedBy { it.toString() }.forEach { relative ->
            output += "${if (apply) "COPY" else "WOULD COPY"} $managedPath/$relative"
            if (apply) {
                val from = sourceByRelative.getValue(relative)
                val to = destination.resolve(relative)
                to.parent?.createDirectories()
                Files.copy(from, to, StandardCopyOption.REPLACE_EXISTING)
            }
        }
        if (apply) pruneEmptyDirectories(destination)
    }
    output += "${if (apply) "Synced" else "Dry run complete for"} $side target: $targetDir"
    return ProcessRun(0, output.joinToString("\n"))
}

fun bootstrapServerRuntime(serverDir: Path, port: Int, reset: Boolean): ProcessRun {
    val bundleWorkRoot = serverDir.parent.resolve("${serverDir.fileName}.bundle-work")
    val exportsDir = bundleWorkRoot.resolve("exports")
    val serverTreeDir = exportsDir.resolve("server-tree/better-content-server")
    val serverZip = exportsDir.resolve("${currentPlaytestRelease().baseName}-server.zip")
    val extractRoot = bundleWorkRoot.resolve("unzipped")
    if (reset) {
        deleteTree(bundleWorkRoot)
        deleteTree(serverDir)
    }
    val bundle = buildServerBundle(exportsDir, serverTreeDir, serverZip, clean = true)
    if (bundle.exitCode != 0) {
        deleteTree(bundleWorkRoot)
        return bundle
    }
    val extracted = extractArchive(serverZip, extractRoot)
    if (extracted.exitCode != 0) {
        deleteTree(bundleWorkRoot)
        return extracted
    }
    val extractedServerDir = extractRoot.resolve(serverTreeDir.fileName.toString())
    if (!extractedServerDir.exists()) {
        deleteTree(bundleWorkRoot)
        return ProcessRun(1, "server bundle zip did not contain ${serverTreeDir.fileName}")
    }
    moveReplace(extractedServerDir, serverDir)
    val runSh = serverDir.resolve("run.sh")
    if (runSh.exists()) {
        runProcess(listOf("chmod", "+x", runSh.toString()), stream = false)
    }
    serverDir.resolve("generated/runtime-dumps").createDirectories()
    mirrorRepoDatapacks(serverDir.resolve("world"))
    Files.writeString(serverDir.resolve("eula.txt"), "eula=true\n")
    writeLocalServerProperties(serverDir.resolve("server.properties"), port, onlineMode = false)
    val userJvm = serverDir.resolve("user_jvm_args.txt")
    if (!userJvm.exists()) {
        Files.writeString(userJvm, "-Xms4G\n-Xmx16G\n-XX:+UseG1GC\n-Dfile.encoding=UTF-8\n")
    }
    deleteTree(bundleWorkRoot)
    return ProcessRun(0, "Bootstrapped server runtime: $serverDir")
}

fun injectValidationProbe(runtimeDir: Path, contract: Path): ProcessRun {
    if (!runtimeDir.resolve("run.sh").exists()) return ProcessRun(2, "prepared runtime missing: $runtimeDir")
    if (!contract.exists()) return ProcessRun(2, "progression validation contract missing: $contract")
    val probeRoot = root.resolve("tools/runtime-probe")
    val wrapper = root.resolve("generated/custom-mod-sources/pillager-campaigns/gradlew")
    if (!probeRoot.resolve("build.gradle.kts").exists() || !wrapper.exists()) {
        return ProcessRun(2, "validation probe build surface is incomplete")
    }
    val build = runProcess(listOf(wrapper.toString(), "-p", probeRoot.toString(), "reobfJar"), stream = false)
    if (build.exitCode != 0) return ProcessRun(build.exitCode, "validation probe build failed\n${build.output}")
    val jar = probeRoot.resolve("build/reobfJar/output.jar")
    if (!jar.exists()) return ProcessRun(1, "validation probe reobfJar did not produce $jar")
    val mods = runtimeDir.resolve("mods")
    mods.createDirectories()
    val deployed = mods.resolve("bc-validation-probe-0.1.0.jar")
    Files.copy(jar, deployed, StandardCopyOption.REPLACE_EXISTING)
    val configDir = runtimeDir.resolve("config/bc-validation-probe")
    configDir.createDirectories()
    Files.copy(contract, configDir.resolve("progression_milestones.json"), StandardCopyOption.REPLACE_EXISTING)
    return ProcessRun(0, "Injected validation probe: $deployed\nsha256=${sha256(deployed)}\ncontract=${configDir.resolve("progression_milestones.json")}")
}

fun bootstrapClientRuntime(clientDir: Path): ProcessRun {
    val sync = syncManaged("client", clientDir, apply = true)
    if (sync.exitCode != 0) return sync
    val javaBin = requireJava17Path()
    val installer = try { findForgeInstaller() } catch (_: Exception) { null }
    listOf("logs", "saves", "versions", "libraries", "assets").forEach { clientDir.resolve(it).createDirectories() }
    val prismRoot = resolveUserPath(System.getenv("BC_PRISM_ROOT") ?: "${System.getProperty("user.home")}/.local/share/PrismLauncher")
    val prismLibraries = prismRoot.resolve("libraries")
    if (prismLibraries.exists()) ensureLinkedOrCopiedDirectory(clientDir.resolve("libraries"), prismLibraries)
    val prismAssets = prismRoot.resolve("assets")
    if (prismAssets.exists()) ensureLinkedOrCopiedDirectory(clientDir.resolve("assets"), prismAssets)
    val vanillaMeta = prismRoot.resolve("meta/net.minecraft/$mcVersion.json")
    if (vanillaMeta.exists()) {
        val dest = clientDir.resolve("versions/$mcVersion/$mcVersion.json")
        dest.parent.createDirectories()
        Files.copy(vanillaMeta, dest, StandardCopyOption.REPLACE_EXISTING)
    }
    val vanillaVersionJson = clientDir.resolve("versions/$mcVersion/$mcVersion.json")
    if (!vanillaVersionJson.exists()) {
        val manifest = clientDir.resolve("versions/version_manifest_v2.json")
        val manifestDownload = downloadTo("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json", manifest)
        if (manifestDownload.exitCode != 0) return manifestDownload
        val versionEntry = jsonArray(jsonObject(parseJson(Files.readString(manifest)))["versions"])
            .map(::jsonObject)
            .firstOrNull { jsonString(it["id"]) == mcVersion }
            ?: return ProcessRun(1, "Minecraft $mcVersion is missing from Mojang version manifest")
        val versionUrl = jsonString(versionEntry["url"])
            ?: return ProcessRun(1, "Minecraft $mcVersion version entry has no metadata URL")
        vanillaVersionJson.parent.createDirectories()
        val versionDownload = downloadTo(versionUrl, vanillaVersionJson)
        if (versionDownload.exitCode != 0) return versionDownload
    }
    val vanillaJar = prismRoot.resolve("libraries/com/mojang/minecraft/$mcVersion/minecraft-$mcVersion-client.jar")
    if (vanillaJar.exists()) {
        val dest = clientDir.resolve("versions/$mcVersion/$mcVersion.jar")
        dest.parent.createDirectories()
        try {
            Files.deleteIfExists(dest)
            Files.createSymbolicLink(dest, vanillaJar)
        } catch (_: Exception) {
            Files.copy(vanillaJar, dest, StandardCopyOption.REPLACE_EXISTING)
        }
    }
    for (jarCache in listOf(root.resolve("server-template/mods"), root.resolve("server-instance/mods"))) {
        if (!jarCache.exists()) continue
        if (runCatching { jarCache.toRealPath() == clientDir.resolve("mods").toRealPath() }.getOrDefault(false)) continue
        walkFiles(jarCache) { isRuntimeModArtifact(it.fileName.toString()) }.forEach { file ->
            val rel = jarCache.relativize(file)
            val dest = clientDir.resolve("mods").resolve(rel.toString())
            if (!dest.exists()) {
                dest.parent?.createDirectories()
                Files.copy(file, dest, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.COPY_ATTRIBUTES)
            }
        }
    }
    if (installer != null) {
        Files.copy(installer, clientDir.resolve("forge-$forgeCoord-installer.jar"), StandardCopyOption.REPLACE_EXISTING)
    }
    val forgeMeta = prismRoot.resolve("meta/net.minecraftforge/$forgeVersion.json")
    if (forgeMeta.exists()) {
        val forge = jsonObject(parseJson(Files.readString(forgeMeta)))
        val forgeClientId = "$mcVersion-forge-$forgeVersion"
        val dest = clientDir.resolve("versions/$forgeClientId/$forgeClientId.json")
        dest.parent.createDirectories()
        val out = linkedMapOf<String, Any?>(
            "id" to forgeClientId,
            "inheritsFrom" to mcVersion,
            "type" to "release",
            "mainClass" to jsonString(forge["mainClass"]),
            "minecraftArguments" to jsonString(forge["minecraftArguments"]),
            "libraries" to jsonArray(forge["libraries"]),
        )
        Files.writeString(dest, toJson(out) + "\n")
    }
    if (installer != null) {
        val forgeClientId = "$mcVersion-forge-$forgeVersion"
        val unzip = extractZipEntry(
            clientDir.resolve("forge-$forgeCoord-installer.jar"),
            "version.json",
            clientDir.resolve("versions/$forgeClientId/$forgeClientId.json"),
        )
        if (unzip.exitCode != 0) return unzip
        val launcherProfiles = clientDir.resolve("launcher_profiles.json")
        if (!launcherProfiles.exists()) {
            Files.writeString(launcherProfiles, "{\"profiles\":{},\"settings\":{},\"version\":3}\n")
        }
        val forgeClientJar = clientDir.resolve("libraries/net/minecraftforge/forge/$forgeCoord/forge-$forgeCoord-client.jar")
        if (!forgeClientJar.exists()) {
            val install = runProcess(
                listOf(javaBin, "-jar", clientDir.resolve("forge-$forgeCoord-installer.jar").toString(), "--installClient", clientDir.toString()),
                extraEnv = javaTempEnvironment(clientDir),
            )
            if (install.exitCode != 0) return install
        }
    }
    val resolve = resolvePackwizDownloads(clientDir, "client", apply = true)
    if (resolve.exitCode != 0) return resolve
    val prune = pruneRuntimeMods(clientDir, "client", apply = true)
    if (prune.exitCode != 0) return prune
    Files.writeString(
        clientDir.resolve("README.agent-runtime.txt"),
        """
Better Content direct client runtime

Minecraft: $mcVersion
Forge: $forgeVersion

Managed content is synced from:
  $root

Launch through:
  $root/tools/bc test scenario ...

This directory is runtime state. Do not commit saves, logs, screenshots, options,
account files, assets, libraries, or downloaded versions.
""".trimIndent() + "\n",
    )
    return ProcessRun(0, "Bootstrapped client runtime: $clientDir")
}

fun startServerProcess(serverDir: Path, port: Int, extraArgs: List<String> = listOf("nogui"), logPath: Path): RunningProcess {
    val javaPath = requireJava17Path()
    val javaDir = Paths.get(javaPath).parent.toString()
    require(serverDir.isDirectory()) { "server directory does not exist: $serverDir" }
    require(serverDir.resolve("run.sh").exists()) { "missing executable run.sh in $serverDir" }
    setServerPort(serverDir.resolve("server.properties"), port)
    val builder = ProcessBuilder(listOf("./run.sh") + extraArgs)
    builder.directory(serverDir.toFile())
    builder.redirectErrorStream(true)
    builder.environment()["PATH"] = "$javaDir:${System.getenv("PATH") ?: ""}"
    builder.environment()["BC_SERVER_PORT"] = port.toString()
    builder.redirectOutput(logPath.toFile())
    val process = builder.start()
    return RunningProcess(process, logPath, process.outputStream.bufferedWriter())
}

fun tailText(path: Path, limit: Long = 256_000): String {
    if (!path.exists()) return ""
    val file = path.toFile()
    file.inputStream().use { input ->
        val skip = (file.length() - limit).coerceAtLeast(0)
        input.skip(skip)
        return input.readBytes().toString(Charsets.UTF_8)
    }
}

fun waitForLogPattern(logs: List<Path>, pattern: Regex, timeoutSeconds: Int, process: Process, phase: String) {
    val deadline = System.currentTimeMillis() + timeoutSeconds * 1000L
    while (System.currentTimeMillis() < deadline) {
        if (!process.isAlive) {
            error("$phase process exited with ${process.exitValue()}")
        }
        if (logs.any { pattern.containsMatchIn(tailText(it, 512_000)) }) {
            return
        }
        Thread.sleep(1000)
    }
    error("$phase timed out after ${timeoutSeconds}s")
}

fun waitForFiles(paths: List<Path>, timeoutSeconds: Int, process: Process, phase: String) {
    val deadline = System.currentTimeMillis() + timeoutSeconds * 1000L
    while (System.currentTimeMillis() < deadline) {
        if (!process.isAlive) {
            error("$phase process exited with ${process.exitValue()}")
        }
        if (paths.all { it.exists() }) return
        Thread.sleep(1000)
    }
    val missing = paths.filterNot { it.exists() }.joinToString(", ")
    error("$phase timed out after ${timeoutSeconds}s waiting for $missing")
}

fun captureSmokeStartupDiagnostics(running: RunningProcess, evidenceDir: Path) {
    val jvm = runCatching {
        running.process.toHandle().descendants()
            .filter { handle -> handle.isAlive && handle.info().command().orElse("").endsWith("java") }
            .findFirst()
            .orElse(null)
    }.getOrNull() ?: return
    val pid = jvm.pid()
    val commands = listOf(
        "thread-dump.txt" to listOf("jcmd", pid.toString(), "Thread.print", "-l"),
        "heap-info.txt" to listOf("jcmd", pid.toString(), "GC.heap_info"),
        "native-memory-summary.txt" to listOf("jcmd", pid.toString(), "VM.native_memory", "summary"),
    )
    for ((name, command) in commands) {
        val output = evidenceDir.resolve(name)
        runCatching {
            val process = ProcessBuilder(command).redirectErrorStream(true).redirectOutput(output.toFile()).start()
            if (!process.waitFor(30, java.util.concurrent.TimeUnit.SECONDS)) {
                process.destroy()
                if (!process.waitFor(5, java.util.concurrent.TimeUnit.SECONDS)) process.destroyForcibly()
            }
        }
    }
    val procStatus = Paths.get("/proc/$pid/status")
    if (procStatus.exists()) {
        Files.copy(procStatus, evidenceDir.resolve("process-status.txt"), StandardCopyOption.REPLACE_EXISTING)
    }
}

fun sendCommand(runningProcess: RunningProcess?, command: String) {
    runningProcess?.stdin?.apply {
        write(command)
        newLine()
        flush()
    }
}

fun stopProcess(runningProcess: RunningProcess?, stopCommand: String? = null) {
    if (runningProcess == null) return
    if (!runningProcess.process.isAlive) return
    try {
        if (stopCommand != null && runningProcess.stdin != null) {
            sendCommand(runningProcess, stopCommand)
            runningProcess.process.waitFor(60, java.util.concurrent.TimeUnit.SECONDS)
        }
    } catch (_: Exception) {
    }
    if (runningProcess.process.isAlive) {
        runningProcess.process.destroy()
        if (!runningProcess.process.waitFor(20, java.util.concurrent.TimeUnit.SECONDS)) {
            runningProcess.process.destroyForcibly()
        }
    }
}

fun runStaticValidation(): ProcessRun {
    return runKotlinScript(root.resolve("tools/kotlin/static_validation.main.kts"))
}

// Runtime test entrypoints are intentionally removed. These inert definitions keep
// retired dispatcher branches compilable while the public command guard rejects them.
data class RetiredScenario(val name: String, val script: String)
val scenarios: Map<String, RetiredScenario> = emptyMap()
val defaultDumpRefreshServerDir: String = cachePath("retired-dump-refresh").toString()
fun runPackFullLane(): ProcessRun = ProcessRun(2, "test full has been removed; use test fast")

fun runPackSuite(instance: Path, strictDataDumps: Boolean, runtimeOnly: Boolean = false): ProcessRun {
    val env = mutableMapOf("BC_INSTANCE" to instance.toString(), "BC_STRICT_RUNTIME" to "1")
    if (strictDataDumps) env["BC_STRICT_DATA_DUMPS"] = "1"
    if (runtimeOnly) env["BC_RUNTIME_ONLY"] = "1"
    return runKotlinScript(root.resolve("tools/kotlin/pack_test_suite.main.kts"), extraEnv = env)
}

fun runUnearthedReplacementAudit(instance: Path?, world: Path?, output: Path): ProcessRun {
    val args = mutableListOf<String>()
    if (instance != null) args += listOf("--instance", instance.toString())
    if (world != null) args += listOf("--world", world.toString())
    args += listOf("--output", output.toString())
    return runKotlinScript(root.resolve("tools/kotlin/audit_unearthed_replacement.main.kts"), args)
}

fun runStepSequence(steps: List<Pair<String, () -> ProcessRun>>): ProcessRun {
    val output = mutableListOf<String>()
    for ((label, step) in steps) {
        val run = step()
        if (run.output.isNotBlank()) output += "==> $label\n${run.output}"
        if (run.exitCode != 0) return ProcessRun(run.exitCode, output.joinToString("\n\n"))
    }
    return ProcessRun(0, output.joinToString("\n\n"))
}

fun runPackFastLane(): ProcessRun = runStepSequence(
    buildList {
        if (System.getenv("BC_SKIP_KOTLIN_TESTS") != "1") {
            add("kotlin tests" to { runKotlinTests(null) })
        }
        add("static validation" to { runStaticValidation() })
    },
)

fun runChemistryIdentityValidation(): ProcessRun {
    val failures = mutableListOf<String>()
    fun fail(message: String) { failures += message }

    val matrixPath = "kubejs/server_scripts/40_recipe_add/55_realistic_ores_identity_outputs.js"
    val tagPath = "kubejs/server_scripts/10_tags/60_realistic_ores_deposit_tags.js"
    val startupPath = "kubejs/startup_scripts/10_items_blocks/30_progression_items.js"
    val shaderBlockPropertiesPath = "shaderpacks/ComplementaryReimagined_r5.7.1/shaders/block.properties"
    val modelDir = "kubejs/assets/kubejs/models/item"
    val textureDir = "kubejs/assets/kubejs/textures/item"
    val blockModelDir = "kubejs/assets/kubejs/models/block"
    val blockTextureDir = "kubejs/assets/kubejs/textures/block"

    if (!repoExists(matrixPath)) {
        fail("missing $matrixPath")
    } else {
        val text = repoText(matrixPath)
        val solventSection = jsSection(text, "BC_RO_SOLVENTS")
        val ballSection = jsSection(text, "BC_RO_BALLS")
        val depositSection = jsSection(text, "BC_RO_DEPOSITS")
        val retentionSection = Regex("""var\s+BC_RO_RETENTION = \{([\s\S]*?)\n\}""").find(text)?.groupValues?.getOrNull(1) ?: ""
        val solvents = idsFromJsSection(solventSection)
        val balls = idsFromJsSection(ballSection)
        val deposits = idsFromJsSection(depositSection)
        val depositObjects = Regex("""\{\s*\n?([\s\S]*?)\n\s*\}""").findAll(depositSection).map { it.groupValues[1] }.toList()

        if (solvents.size != 6) fail("expected 6 solvents, found ${solvents.size}: ${solvents.joinToString(", ")}")
        if (balls.size != 8) fail("expected 8 balls, found ${balls.size}: ${balls.joinToString(", ")}")
        if (deposits.size != 22) fail("expected 22 deposits, found ${deposits.size}")
        if (repoExists(tagPath)) {
            val tagDeposits = mapKeysFromJsObject(repoText(tagPath), "BC_DEPOSIT_SOURCE_BLOCKS")
            val missingFromMatrix = tagDeposits.filterNot(deposits::contains)
            val extraInMatrix = deposits.filterNot(tagDeposits::contains)
            if (missingFromMatrix.isNotEmpty()) fail("deposit tag catalog missing from matrix: ${missingFromMatrix.joinToString(", ")}")
            if (extraInMatrix.isNotEmpty()) fail("matrix deposits not in tag catalog: ${extraInMatrix.joinToString(", ")}")
        }
        for (solvent in solvents) {
            if (!retentionSection.contains("$solvent: {")) fail("missing retention row for $solvent")
            val row = Regex("""$solvent: \{([^}]+)\}""").find(retentionSection)?.groupValues?.getOrNull(1) ?: ""
            for (ball in balls) if (!row.contains("$ball:")) fail("missing retention chance for $solvent/$ball")
        }
        for (solvent in solvents) if (!depositSection.contains("$solvent:")) fail("deposit matrix does not mention solvent output key $solvent")
        for (objectText in depositObjects) {
            val id = Regex("""id: '([^']+)'""").find(objectText)?.groupValues?.getOrNull(1) ?: "UNKNOWN"
            val solventOutputs = solvents.map { solvent -> Regex("""$solvent: '([^']+)'""").find(objectText)?.groupValues?.getOrNull(1).orEmpty() }
            val missingSolventOutputs = solvents.filterIndexed { index, _ -> solventOutputs[index].isBlank() }
            if (missingSolventOutputs.isNotEmpty()) fail("$id missing solvent outputs: ${missingSolventOutputs.joinToString(", ")}")
            val distinctOutputs = solventOutputs.filter(String::isNotBlank).toSet()
            if (distinctOutputs.size < 5) fail("$id has weak acid identity spread: ${distinctOutputs.size} distinct solvent outputs")
            for (key in listOf("ferrous", "nonferrous", "hard", "rare", "blood", "ae", "gangue", "trace")) {
                if (!objectText.contains("$key:")) fail("$id missing ball-bias output key $key")
            }
        }
        if (Regex("""kubejs:[^']+""").containsMatchIn(depositSection)) fail("deposit matrix contains kubejs direct output")
        val bareChemlibFluidRefs = Regex("""fluid:\s*'chemlib:([a-z0-9_]+)'""").findAll(text).map { it.groupValues[1] }.filterNot { it.endsWith("_fluid") }.toSet()
        if (bareChemlibFluidRefs.isNotEmpty()) fail("Chemlib fluid recipe references must use source fluid IDs ending in _fluid: ${bareChemlibFluidRefs.joinToString(", ")}")
        if (!text.contains("for (var d = 0; d < BC_RO_DEPOSITS.length; d++)")) fail("missing deposit loop for matrix recipe generation")
        if (!text.contains("for (var s = 0; s < BC_RO_SOLVENTS.length; s++)")) fail("missing solvent loop for matrix recipe generation")
        if (!text.contains("for (var b = 0; b < BC_RO_BALLS.length; b++)")) fail("missing ball loop for matrix recipe generation")
        if (!text.contains("id('kubejs:realistic_ores/acid_ball/' + dep.id + '/' + solvent.id + '/' + ball.id)")) fail("matrix recipe IDs are not deposit/solvent/ball-specific")
    }

    val acidVatScript = "kubejs/server_scripts/40_recipe_add/60_acid_vat_deposit_slurries.js"
    if (repoExists(acidVatScript)) fail("retired Acid Vat deposit slurry script still exists")
    val kubejsFiles = repoWalk("kubejs") { it.endsWith(".js") }
    for (relPath in kubejsFiles) {
        val scriptText = repoText(relPath)
        if (scriptText.contains("acid_vat:")) fail("retired acid_vat reference in $relPath")
        val bareFluidOfRefs = Regex("""Fluid\.of\(\s*['"]chemlib:([a-z0-9_]+)['"]""").findAll(scriptText).map { it.groupValues[1] }.filterNot { it.endsWith("_fluid") }
        val bareJsonFluidRefs = Regex("""fluid:\s*['"]chemlib:([a-z0-9_]+)['"]""").findAll(scriptText).map { it.groupValues[1] }.filterNot { it.endsWith("_fluid") }
        val bareFluidRefs = (bareFluidOfRefs + bareJsonFluidRefs).toSet()
        if (bareFluidRefs.isNotEmpty()) fail("Chemlib source fluid references in $relPath must end in _fluid: ${bareFluidRefs.joinToString(", ")}")
    }
    if (repoExists(shaderBlockPropertiesPath)) {
        val shaderText = repoText(shaderBlockPropertiesPath)
        val shaderSpecialLine = Regex("""^block\.20000=.*$""", RegexOption.MULTILINE).find(shaderText)?.value.orEmpty()
        for (stale in listOf("kubejs:power_grid_machine_casing", "kubejs:oc2r_machine_casing", "kubejs:ae2_machine_casing")) {
            if (shaderSpecialLine.contains(stale)) fail("shader special block list still references stale casing ID $stale")
        }
        for (current in listOf("kubejs:electrical_machine_casing", "kubejs:raw_impossible_casing", "kubejs:impossible_machine_casing")) {
            if (!shaderSpecialLine.contains(current)) fail("shader special block list missing current casing ID $current")
        }
    }

    for (staleAsset in listOf(
        "kubejs/assets/kubejs/blockstates/ae2_machine_casing.json",
        "kubejs/assets/kubejs/blockstates/oc2r_machine_casing.json",
        "kubejs/assets/kubejs/blockstates/power_grid_machine_casing.json",
        "kubejs/assets/kubejs/models/block/ae2_machine_casing.json",
        "kubejs/assets/kubejs/models/block/oc2r_machine_casing.json",
        "kubejs/assets/kubejs/models/block/power_grid_machine_casing.json",
        "kubejs/assets/kubejs/models/item/ae2_machine_casing.json",
        "kubejs/assets/kubejs/models/item/oc2r_machine_casing.json",
        "kubejs/assets/kubejs/models/item/power_grid_machine_casing.json",
        "kubejs/assets/kubejs/textures/block/ae2_machine_casing_front.png",
        "kubejs/assets/kubejs/textures/block/ae2_machine_casing_back.png",
        "kubejs/assets/kubejs/textures/block/ae2_machine_casing_side.png",
        "kubejs/assets/kubejs/textures/block/ae2_machine_casing_top.png",
        "kubejs/assets/kubejs/textures/block/ae2_machine_casing_bottom.png",
        "kubejs/assets/kubejs/textures/block/oc2r_machine_casing_front.png",
        "kubejs/assets/kubejs/textures/block/oc2r_machine_casing_back.png",
        "kubejs/assets/kubejs/textures/block/oc2r_machine_casing_side.png",
        "kubejs/assets/kubejs/textures/block/oc2r_machine_casing_top.png",
        "kubejs/assets/kubejs/textures/block/oc2r_machine_casing_bottom.png",
        "kubejs/assets/kubejs/textures/block/power_grid_machine_casing_front.png",
        "kubejs/assets/kubejs/textures/block/power_grid_machine_casing_back.png",
        "kubejs/assets/kubejs/textures/block/power_grid_machine_casing_side.png",
        "kubejs/assets/kubejs/textures/block/power_grid_machine_casing_top.png",
        "kubejs/assets/kubejs/textures/block/power_grid_machine_casing_bottom.png",
    )) if (repoExists(staleAsset)) fail("stale renamed casing asset remains: $staleAsset")

    for (currentCasing in listOf("seared_machine_casing", "andesite_machine_casing", "brass_machine_casing", "airtight_machine_casing", "electrical_machine_casing", "space_machine_casing", "raw_impossible_casing", "impossible_machine_casing")) {
        val blockstate = "kubejs/assets/kubejs/blockstates/$currentCasing.json"
        val blockModel = "$blockModelDir/$currentCasing.json"
        val itemModel = "kubejs/assets/kubejs/models/item/$currentCasing.json"
        if (!repoHasFile(blockstate)) fail("missing blockstate for $currentCasing")
        if (!repoHasFile(blockModel)) fail("missing block model for $currentCasing") else {
            val modelText = repoText(blockModel)
            for (face in listOf("front", "back", "side", "top", "bottom")) if (!modelText.contains("kubejs:block/${currentCasing}_$face")) fail("block model for $currentCasing does not use its $face texture")
        }
        if (!repoHasFile(itemModel)) fail("missing item model for $currentCasing") else if (!repoText(itemModel).contains("kubejs:block/$currentCasing")) fail("item model for $currentCasing does not inherit its block model")
        for (face in listOf("front", "back", "side", "top", "bottom")) if (!repoHasFile("$blockTextureDir/${currentCasing}_$face.png")) fail("missing block texture for ${currentCasing}_$face")
    }

    if (!repoExists(startupPath) || !repoText(startupPath).contains("event.create('phosphoric_acid_fluid')")) fail("missing kubejs phosphoric acid fluid registration")
    for (id in listOf("andesite_grinding_ball", "iron_grinding_ball", "brass_grinding_ball", "steel_grinding_ball", "nickel_grinding_ball", "titanium_grinding_ball", "blood_infused_grinding_ball", "fluix_grinding_ball")) {
        val model = "$modelDir/$id.json"
        val texture = "$textureDir/$id.png"
        if (!repoHasFile(model)) fail("missing model for $id") else if (!repoText(model).contains("kubejs:item/$id")) fail("model for $id does not use dedicated kubejs texture")
        if (!repoHasFile(texture)) fail("missing texture for $id")
    }

    val manufacturedPassPath = "kubejs/server_scripts/30_recipe_replace/130_manufactured_plate_recipe_pass.js"
    if (!repoExists(manufacturedPassPath)) fail("missing manufactured plate recipe pass") else {
        val manufacturedText = repoText(manufacturedPassPath)
        if (manufacturedText.contains("id('kubejs:powergrid/mechanical_crafting/integrated_circuit_nonrecursive')")) fail("Power Grid integrated circuit should not retain the retired KubeJS mechanical-crafting rewrite")
    }
    val recursiveReplacePattern = Regex("""bc(?:Plate|Mat|Late|Eco|Aesthetic|Closure|Create)?Replace(?:Outputs)?\(\s*event,\s*\[[^\]]*'powergrid:integrated_circuit'[^\]]*\]\s*,\s*\[[^\]]*minecraft:redstone[^\]]*\]\s*,\s*(?:BC_[A-Z_]+\.)?(?:powerCircuit|circuit)""")
    val recursiveDirectReplacePattern = Regex("""replaceInput\(\s*\{\s*output:\s*['"]powergrid:integrated_circuit['"][^)]*minecraft:redstone[^)]*powergrid:integrated_circuit""")
    for (relPath in kubejsFiles) {
        val scriptText = repoText(relPath)
        if (recursiveReplacePattern.containsMatchIn(scriptText) || recursiveDirectReplacePattern.containsMatchIn(scriptText)) fail("Power Grid integrated circuit redstone replacement would recurse in $relPath")
    }

    return if (failures.isEmpty()) ProcessRun(0, "ok - chemistry identity matrix validates") else ProcessRun(1, failures.joinToString("\n") { "FAIL - $it" })
}

fun runSynthesisPipelineValidation(): ProcessRun {
    val failures = mutableListOf<String>()
    fun fail(message: String) { failures += message }
    fun text(relPath: String): String = repoText(relPath)
    fun exists(relPath: String): Boolean = repoExists(relPath)
    val coreFiles = listOf(
        "kubejs/server_scripts/40_recipe_add/55_realistic_ores_identity_outputs.js",
        "kubejs/server_scripts/40_recipe_add/56_alchemistry_dissolver_create_port.js",
        "kubejs/config/alchemistry_dissolver_port.json",
        "kubejs/server_scripts/40_recipe_add/58_create_pncr_molecular_synthesis.js",
        "kubejs/server_scripts/40_recipe_add/59_formulaic_synthesis_magic_routes.js",
        "kubejs/server_scripts/30_recipe_replace/95_acid_and_nether_grout_unification.js",
        "kubejs/server_scripts/30_recipe_replace/140_latent_chemlib_power_gates.js",
        "kubejs/data/latent_chemlib/reaction_rules/default.json",
        "kubejs/data/latent_chemlib/material_coefficients/default.json",
        "kubejs/data/latent_chemlib/nuclear_decay/default.json",
        "kubejs/data/latent_chemlib/scheduler_profiles/default.json",
    )
    coreFiles.filterNot(::exists).forEach { fail("missing synthesis pipeline file: $it") }
    val startupItemsFile = "kubejs/startup_scripts/10_items_blocks/30_progression_items.js"
    val gasItemInputs = setOf("chemlib:acetylene", "chemlib:ammonia", "chemlib:ammonium", "chemlib:argon", "chemlib:butane", "chemlib:carbon_dioxide", "chemlib:carbon_monoxide", "chemlib:chlorine", "chemlib:ethane", "chemlib:ethylene", "chemlib:fluorine", "chemlib:helium", "chemlib:hexane", "chemlib:hydrogen", "chemlib:hydrogen_sulfide", "chemlib:krypton", "chemlib:methane", "chemlib:neon", "chemlib:nitric_oxide", "chemlib:nitrogen", "chemlib:nitrogen_dioxide", "chemlib:oxygen", "chemlib:pentane", "chemlib:propane", "chemlib:radon", "chemlib:sulfur_dioxide", "chemlib:sulfur_trioxide", "chemlib:xenon")

    if (exists(coreFiles[0])) {
        val fileText = text(coreFiles[0])
        for (needle in listOf("for (var d = 0; d < BC_RO_DEPOSITS.length; d++)", "for (var s = 0; s < BC_RO_SOLVENTS.length; s++)", "for (var b = 0; b < BC_RO_BALLS.length; b++)")) if (!fileText.contains(needle)) fail("ore acid/ball matrix loop missing: $needle")
        for (solvent in listOf("ethanol", "acetic", "sulfuric", "hydrochloric", "nitric", "phosphoric")) if (!fileText.contains("id: '$solvent'")) fail("ore solvent missing: $solvent")
        for (ball in listOf("andesite", "iron", "brass", "steel", "nickel", "titanium", "blood_infused", "fluix")) if (!fileText.contains("id: '$ball'")) fail("grinding ball missing: $ball")
        for (exported in listOf("global.BC_RO_SOLVENTS", "global.BC_RO_BALLS", "global.BC_RO_DEPOSITS")) if (!fileText.contains(exported)) fail("realistic ore table export missing: $exported")
        for (needle in listOf("BC_RO_SOLVENT_GAS_PRODUCTS", "bcRoAddGasSideProducts", "chemlib:nitrogen_dioxide")) if (!fileText.contains(needle)) fail("ore solvent gas side-product marker missing: $needle")
    }
    if (exists(coreFiles[1])) {
        val fileText = text(coreFiles[1])
        for (needle in listOf("JsonIO.read", "create:mixing", "bcAdpRetention", "bcAdpAddGasSideProduct", "kubejs:alchemistry_dissolver_port/")) if (!fileText.contains(needle)) fail("Alchemistry dissolver Create port script missing $needle")
    }
    if (exists(coreFiles[2])) {
        val table = jsonObject(repoJson(coreFiles[2]))
        val recipes = jsonArray(table["recipes"]).map(::jsonObject)
        if (recipes.size < 1000) fail("Alchemistry dissolver Create port too sparse: ${recipes.size}")
        for (acid in listOf("acetic", "sulfuric", "hydrochloric", "nitric", "phosphoric")) if (recipes.none { jsonString(it["acid"]) == acid }) fail("Alchemistry dissolver Create port missing acid family: $acid")
        for (ball in listOf("andesite", "iron", "brass", "steel", "titanium")) if (recipes.none { jsonString(it["ball"]) == ball }) fail("Alchemistry dissolver Create port missing grinding ball family: $ball")
        for (recipe in recipes) {
            val recipeId = jsonString(recipe["id"]) ?: "UNKNOWN"
            val input = jsonObject(recipe["input"])
            if (input.isEmpty() || (jsonString(input["item"]).isNullOrBlank() && jsonString(input["tag"]).isNullOrBlank())) fail("Alchemistry dissolver port recipe has no input: $recipeId")
            if (gasItemInputs.contains(jsonString(input["item"]))) fail("Alchemistry dissolver port uses loose gas item input: $recipeId ${jsonString(input["item"])}")
            val results = jsonArray(recipe["results"]).map(::jsonObject)
            if (results.isEmpty()) fail("Alchemistry dissolver port recipe has no outputs: $recipeId")
            for (result in results) {
                val item = jsonString(result["item"])
                if (item.isNullOrBlank() || item == "minecraft:air" || item.startsWith("alchemistry:")) fail("Alchemistry dissolver port has invalid output in $recipeId: $item")
            }
        }
    }
    if (exists("mods/alchemistry.pw.toml") || exists("mods/alchemylib.pw.toml")) fail("Alchemistry/AlchemyLib packwiz entries must stay removed; dissolver parity is provided by Create mixing")
    if (exists("index.toml")) {
        val index = text("index.toml")
        if (index.contains("mods/alchemistry.pw.toml") || index.contains("mods/alchemylib.pw.toml")) fail("index.toml still references Alchemistry/AlchemyLib")
    }
    if (exists(coreFiles[3])) {
        val fileText = text(coreFiles[3])
        if (!fileText.contains("function bcChemGas(original)")) fail("molecular synthesis gas helper is missing")
        if (fileText.contains("var BC_CHEM_SEALED_CELL = 'latent_chemlib:sealed_chemical_cell'")) fail("molecular synthesis still defines sealed-cell gas bridge")
        if (fileText.contains("latent_chemlib:sealed_chemical_cell")) fail("molecular synthesis still consumes sealed chemical cells directly")
        if (!fileText.contains("return { item: original }")) fail("molecular synthesis gas helper no longer returns explicit gas items")
        for (gasNeedle in listOf("bcChemGas('chemlib:oxygen')", "bcChemGas('chemlib:hydrogen')", "bcChemGas('chemlib:chlorine')", "bcChemGas('chemlib:nitrogen_dioxide')", "bcChemGas('chemlib:sulfur_trioxide')", "bcChemGas('chemlib:ethylene')")) if (!fileText.contains(gasNeedle)) fail("molecular synthesis no longer routes gas through explicit gas helper call: $gasNeedle")
        for (molecule in listOf("hydrogen_sulfide", "nitric_oxide", "ammonium_chloride", "diammonium_phosphate", "arsenic_sulfide", "mercury_sulfide", "iron_ii_oxide")) if (!fileText.contains("'$molecule'")) fail("special molecular route missing: $molecule")
        for (route in listOf("ethanol_from_sugar", "acetic_acid_from_ethanol", "sulfur_dioxide", "sulfur_trioxide", "sulfuric_acid_from_sulfur_trioxide", "hydrochloric_acid_from_chlorine", "nitric_oxide", "nitrogen_dioxide", "nitric_acid_from_nitrogen_dioxide", "phosphoric_acid_fluid")) if (!fileText.contains("'$route'")) fail("acid progression route missing: $route")
    }
    if (exists(coreFiles[4])) {
        val fileText = text(coreFiles[4])
        for (needle in listOf("BC_SYN_ELEMENTS", "BC_SYN_FAMILIES", "BC_SYN_COMPOUND_ALIASES", "BC_SYN_SIDE_GASES", "bcSynBloodAlchemy", "bcSynBloodArc", "bcSynArsImbuement", "bloodmagic:alchemytable", "bloodmagic:arc", "addedoutput", "ars_nouveau:imbuement", "pneumaticcraft:thermo_plant", "create:mixing")) if (!fileText.contains(needle)) fail("formulaic synthesis/magic route missing $needle")
        if (fileText.contains("type: 'pneumaticcraft:pressure_chamber'")) fail("formulaic PNCR synthesis must not bypass acid fluids with pressure chamber item-only recipes")
        if (fileText.contains("lower-throughput alternatives")) fail("Blood Magic synthesis is still documented as a lower-throughput tech substitute")
        for (needle in listOf("var outputCount = typeof output ===", "if (outputCount > 1) result.count = outputCount", "BC_SYN_MAGIC_CUTTING_FLUIDS", "sanguine_acetic_cutting_fluid", "sanguine_sulfuric_cutting_fluid", "sanguine_hydrochloric_cutting_fluid", "sanguine_nitric_cutting_fluid", "sanguine_phosphoric_cutting_fluid", "chemlib:carbon_dioxide", "chemlib:sulfur_dioxide", "chemlib:nitrogen_dioxide", "chemlib:hydrogen_sulfide", "{ item: elementId, count: 4 }", "{ item: dep.primary, count: 4 }", "{ item: dep.trace, count: 2 }", "{ item: dep.hard, count: 2 }", "{ item: dep.rare, count: 2 }")) if (!fileText.contains(needle)) fail("manual high-yield Blood Magic synthesis marker missing: $needle")
        for (element in listOf("beryllium", "tungsten", "uranium", "thorium", "platinum", "palladium")) if (!fileText.contains("'$element'")) fail("formulaic synthesis element missing hard-material identity: $element")
    }
    if (exists(startupItemsFile)) {
        val fileText = text(startupItemsFile)
        for (needle in listOf("['sanguine_acetic_cutting_fluid', 'Sanguine Acetic Cutting Fluid', 64]", "['sanguine_sulfuric_cutting_fluid', 'Sanguine Sulfuric Cutting Fluid', 256]", "['sanguine_hydrochloric_cutting_fluid', 'Sanguine Hydrochloric Cutting Fluid', 256]", "['sanguine_nitric_cutting_fluid', 'Sanguine Nitric Cutting Fluid', 1024]", "['sanguine_phosphoric_cutting_fluid', 'Sanguine Phosphoric Cutting Fluid', 1024]", ".maxDamage(magicCuttingFluids[m][2])")) if (!fileText.contains(needle)) fail("magic acid cutting fluid durability marker missing: $needle")
    } else fail("missing synthesis startup item file: $startupItemsFile")
    if (exists(coreFiles[5])) {
        val fileText = text(coreFiles[5])
        for (needle in listOf("event.remove({ id: 'powergrid:mixing/acid' })", "event.remove({ output: Fluid.of('powergrid:acid', 1) })", "id('kubejs:powergrid/sequenced_assembly/battery_sulfuric')", "fluid: 'chemlib:sulfuric_acid_fluid'", "id('kubejs:powergrid/mixing/etched_circuit_board_hydrochloric')", "fluid: 'chemlib:hydrochloric_acid_fluid'")) if (!fileText.contains(needle)) fail("Power Grid acid contextual replacement missing: $needle")
        if (fileText.contains("replaceOutput({}, Fluid.of('powergrid:acid'")) fail("Power Grid acid must not be blanket-replaced as one universal ChemLib acid")
    }
    if (exists(coreFiles[6])) {
        val fileText = text(coreFiles[6])
        if (!fileText.contains("latent_chemlib:sealed_chemical_cell") || (!fileText.contains("global.bcFactoryCrafting(") && !fileText.contains("result: { item: 'latent_chemlib:sealed_chemical_cell'"))) fail("sealed chemical cell recipe is missing from Latent ChemLib gates")
    }
    if (exists(coreFiles[7])) {
        val rules = repoJson(coreFiles[7])
        val list = when (rules) {
            is List<*> -> rules.map(::jsonObject)
            else -> jsonArray(jsonObject(rules)["rules"]).map(::jsonObject)
        }
        if (list.size < 20) fail("latent reaction rules must define a usable fusion/capture traversal spine")
        val ids = list.mapNotNull { jsonString(it["id"]) }
        if (ids.toSet().size != ids.size) fail("latent reaction rules contain duplicate IDs")
        val fusion = ids.count { ":fusion/" in it }
        val capture = ids.count { ":capture/" in it }
        if (list.size > 240) fail("latent reaction rules exceed tick-budget cap: ${list.size}")
        if (fusion < 50) fail("latent fusion rules too sparse: $fusion")
        if (capture < 117) fail("latent capture rules do not span the periodic table: $capture")
        if (ids.any { ":decay/" in it }) fail("latent nuclear decay must live in nuclear_decay data, not generic reaction rules")
        if ("latent_chemlib:fusion/hydrogen_to_helium" !in ids) fail("latent fusion rules must preserve hydrogen to helium as the light-element fusion entry")
        for (rule in list) for (key in listOf("id", "input_chemical", "min_mass", "output_mass_ratio")) if (!rule.containsKey(key)) fail("reaction rule missing $key: $rule")
    }
    if (exists(coreFiles[9])) {
        val decayRules = repoJson(coreFiles[9])
        val list = when (decayRules) {
            is List<*> -> decayRules.map(::jsonObject)
            else -> jsonArray(jsonObject(decayRules)["rules"]).map(::jsonObject)
        }
        if (list.size < 30) fail("latent nuclear decay rules must define a heavy-element half-life table")
        val ids = list.mapNotNull { jsonString(it["id"]) }
        if (ids.toSet().size != ids.size) fail("latent nuclear decay rules contain duplicate IDs")
        for (rule in list) {
            for (key in listOf("id", "input_chemical", "output_chemical", "isotope", "half_life_seconds", "output_mass_ratio")) if (!rule.containsKey(key)) fail("nuclear decay rule missing $key: $rule")
            if ((jsonNumber(rule["half_life_seconds"])?.toDouble() ?: 0.0) <= 0.0) fail("nuclear decay rule has invalid half-life: ${jsonString(rule["id"])}")
            val ratio = jsonNumber(rule["output_mass_ratio"])?.toDouble() ?: 0.0
            if (ratio <= 0.0 || ratio > 1.0) fail("nuclear decay rule has invalid mass ratio: ${jsonString(rule["id"])}")
        }
        if (list.none { jsonString(it["id"]) == "latent_chemlib:nuclear_decay/oganesson_to_livermorium" && (jsonNumber(it["half_life_seconds"])?.toDouble() ?: Double.MAX_VALUE) <= 0.001 }) fail("nuclear decay table must preserve near-immediate Og-294 decay")
        if (list.none { jsonString(it["id"]) == "latent_chemlib:nuclear_decay/uranium_to_thorium" && (jsonNumber(it["half_life_seconds"])?.toDouble() ?: 0.0) > 1.0e17 }) fail("nuclear decay table must preserve real U-238 geological half-life scale")
    }
    if (exists(coreFiles[10])) {
        val profile = jsonObject(repoJson(coreFiles[10]))
        for (key in listOf("cloud_updates_per_second", "neighbor_ops_per_second", "escape_scans_per_second", "nuclear_surface_scans_per_second", "nuclear_stack_evaluations_per_second", "nuclear_state_evaluations_per_second", "nuclear_mutations_per_second", "nuclear_radiation_emissions_per_second", "nuclear_heat_emissions_per_second")) {
            val value = jsonNumber(profile[key])?.toInt() ?: 0
            if (value <= 0) fail("scheduler profile missing positive integer $key")
        }
    }
    if (exists(coreFiles[8])) {
        val coeffs = jsonObject(repoJson(coreFiles[8]))
        for (key in listOf("moderators", "absorbers", "containment")) {
            val values = jsonArray(coeffs[key])
            if (values.isEmpty()) fail("material coefficient group missing or empty: $key")
        }
    }
    return if (failures.isEmpty()) ProcessRun(0, "ok - synthesis pipeline validates") else ProcessRun(1, failures.joinToString("\n") { "FAIL - $it" })
}

fun runPlayerProgressionContractsValidation(): ProcessRun {
    val failures = mutableListOf<String>()
    val passes = mutableListOf<String>()
    fun ok(name: String, detail: String = "") {
        passes += name
        println("ok - $name${if (detail.isNotBlank()) " ($detail)" else ""}")
    }
    fun fail(name: String, detail: String) {
        failures += name
        System.err.println("FAIL - $name: $detail")
    }
    fun unique(values: List<String>): List<String> = values.filter { it.isNotBlank() }.distinct()
    fun itemNeedle(item: String): String = Regex.escape(item)
    fun containsItem(text: String, item: String): Boolean = Regex("""(^|[^a-zA-Z0-9_:/.-])${itemNeedle(item)}([^a-zA-Z0-9_:/.-]|$)""").containsMatchIn(text)
    fun sourceSurfaceText(files: List<String>): String = files.filter(::repoExists).joinToString("\n") { "$it\n${repoRead(it)}" }

    fun villagerBuyResultItems(): Set<String> {
        val file = "kubejs/server_scripts/35_villager_trades/10_coin_villager_trades.js"
        if (!repoExists(file)) return emptySet()
        val text = repoRead(file)
        val items = mutableSetOf<String>()
        jsSection(text, "BC_30_ITEMS").let { section ->
            Regex("""\[\s*'([^']+:[^']+)'\s*,""").findAll(section).forEach { items += it.groupValues[1] }
        }
        for (table in listOf("BC_INDUSTRIAL_IRON_MARKET", "BC_GOLD_MARKET", "BC_PLATINUM_MARKET", "BC_WANDERER_MARKET")) {
            jsSection(text, table).let { section ->
                Regex("""\[[^\]]*?'([^']+:[^']+)'\s*]""").findAll(section).forEach { items += it.groupValues[1] }
                Regex("""\[[^,\n]+,\s*[^,\n]+,\s*[^,\n]+,\s*'([^']+:[^']+)'\s*[,|\]]""").findAll(section).forEach { items += it.groupValues[1] }
            }
        }
        Regex(""" bcTrade\([^,]+,\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*['"]([^'"]+:[^'"]+)['"]""").findAll(text).forEach { items += it.groupValues[1] }
        return items
    }

    fun validateSourceAssertions(milestones: List<Map<String, Any?>>) {
        val problems = mutableListOf<String>()
        var assertionCount = 0
        for (milestone in milestones) {
            val milestoneId = jsonString(milestone["id"]) ?: "UNKNOWN"
            for (assertionAny in jsonArray(milestone["sourceAssertions"])) {
                val assertion = jsonObject(assertionAny)
                assertionCount += 1
                val file = jsonString(assertion["file"])
                if (file.isNullOrBlank() || !repoExists(file)) {
                    problems += "$milestoneId: missing source assertion file ${file ?: "<missing>"}"
                    continue
                }
                val text = repoRead(file)
                val missingAll = jsonArray(assertion["all"]).mapNotNull(::jsonString).filterNot(text::contains)
                val anyNeedles = jsonArray(assertion["any"]).mapNotNull(::jsonString)
                val missingAny = anyNeedles.isNotEmpty() && anyNeedles.none(text::contains)
                val presentAbsent = jsonArray(assertion["absent"]).mapNotNull(::jsonString).filter(text::contains)
                if (missingAll.isNotEmpty()) problems += "$milestoneId: $file missing ${missingAll.joinToString(", ")}"
                if (missingAny) problems += "$milestoneId: $file lacks any of ${anyNeedles.joinToString(", ")}"
                if (presentAbsent.isNotEmpty()) problems += "$milestoneId: $file contains forbidden ${presentAbsent.joinToString(", ")}"
            }
        }
        if (problems.isEmpty()) ok("player progression source assertions hold", "$assertionCount assertions") else fail("player progression source assertions hold", problems.take(80).joinToString("\n"))
    }

    fun loadRetainedRecipeGraph(): Map<String, Any?>? {
        val dumpPath = "generated/runtime-dumps/recipes.json"
        if (!repoExists(dumpPath)) return null
        return try {
            val dump = jsonObject(repoReadJson(dumpPath))
            if (jsonString(dump["schema"]) == "bc.recipe_graph.v1") dump else null
        } catch (_: Exception) {
            null
        }
    }

    fun validateBypassSurfaces(manifest: Map<String, Any?>) {
        val forbidden = jsonArray(manifest["forbiddenBypassOutputs"]).mapNotNull(::jsonString)
        val surfaces = jsonArray(manifest["forbiddenBypassSurfaces"]).mapNotNull(::jsonString)
        val problems = mutableListOf<String>()
        if ("starting_options" in surfaces) {
            val text = sourceSurfaceText(listOf("config/classselector/embark.json", "config/classselector/kits.json"))
            for (item in forbidden) if (containsItem(text, item)) problems += "starting_options -> $item"
        }
        if ("repo_loot" in surfaces) {
            for (file in repoWalk("kubejs/data") { it.contains("/loot_tables/") && it.endsWith(".json") }) {
                val text = repoRead(file)
                for (item in forbidden) if (containsItem(text, item)) problems += "$file -> $item"
            }
        }
        if ("wares_loot" in surfaces) {
            for (file in repoWalk("kubejs/data/wares/loot_tables") { it.endsWith(".json") }) {
                val text = repoRead(file)
                for (item in forbidden) if (containsItem(text, item)) problems += "$file -> $item"
            }
        }
        if ("generated_quest_rewards" in surfaces) {
            for (file in repoWalk("generated/ftbquests") { it.endsWith(".snbt") || it.endsWith(".json") }) {
                val text = repoRead(file)
                val rewardSections = Regex("""rewards:\s*\[([\s\S]*?)\]\s*(?:tasks:|}|$)""").findAll(text).joinToString("\n") { it.groupValues[1] }
                for (item in forbidden) if (containsItem(rewardSections, item)) problems += "$file rewards -> $item"
            }
        }
        if ("villager_buy_results" in surfaces) {
            val buys = villagerBuyResultItems()
            for (item in forbidden) if (item in buys) problems += "villager_buy_results -> $item"
        }
        if (problems.isEmpty()) ok("future milestone outputs are absent from bypass reward surfaces", "${forbidden.size} forbidden outputs") else fail("future milestone outputs are absent from bypass reward surfaces", problems.take(100).joinToString("\n"))
    }

    fun validateRuntimeGraphReadiness(manifest: Map<String, Any?>) {
        val dumpPath = "generated/runtime-dumps/recipes.json"
        if (!repoExists(dumpPath)) {
            ok("effective player progression graph check is runtime-ready", "no retained recipes.json")
            return
        }
        val dump = try {
            jsonObject(repoReadJson(dumpPath))
        } catch (error: Exception) {
            fail("retained effective recipe graph parses", error.message ?: error.javaClass.simpleName)
            return
        }
        if (jsonString(dump["schema"]) != "bc.recipe_graph.v1") {
            ok("effective player progression graph check is runtime-ready", "retained dump schema=${jsonString(dump["schema"]) ?: "<missing>"}")
            return
        }
        val produced = mutableSetOf<String>()
        for (recipe in jsonArray(dump["recipes"]).map(::jsonObject)) {
            for (output in jsonArray(recipe["outputs"]).map(::jsonObject)) {
                if (jsonString(output["kind"]) == "item") jsonString(output["id"])?.let { produced += it }
            }
        }
        val runtimeOutputs = unique(jsonArray(manifest["milestones"]).flatMap { milestone -> jsonArray(jsonObject(milestone)["outputs"]).mapNotNull(::jsonString) })
            .filter { it.startsWith("kubejs:") || it.startsWith("create:") || it.startsWith("bloodmagic:") || it.startsWith("ae2:") || it.startsWith("compressedcreativity:") }
        val missing = runtimeOutputs.filterNot(produced::contains)
        val present = runtimeOutputs.size - missing.size
        if (missing.isEmpty()) ok("retained effective recipe graph covers player progression milestone outputs", "${runtimeOutputs.size} outputs")
        else ok("effective player progression graph check is runtime-ready", "$present/${runtimeOutputs.size} retained outputs; refresh a strict runtime dump for hard route reachability")
    }

    fun validatePrimaryCraftingSpine(manifest: Map<String, Any?>, milestones: List<Map<String, Any?>>) {
        val spine = jsonObject(manifest["primaryCraftingSpine"])
        val milestoneSet = milestones.mapNotNull { jsonString(it["id"]) }.toSet()
        val checkpointProblems = mutableListOf<String>()
        var checkpointCount = 0
        for (checkpointAny in jsonArray(spine["sourceCheckpoints"])) {
            val checkpoint = jsonObject(checkpointAny)
            checkpointCount += 1
            val checkpointId = jsonString(checkpoint["id"]) ?: "<missing id>"
            val milestone = jsonString(checkpoint["milestone"])
            if (jsonString(checkpoint["id"]).isNullOrBlank()) checkpointProblems += "<missing id>: checkpoint id is required"
            if (milestone.isNullOrBlank() || milestone !in milestoneSet) checkpointProblems += "$checkpointId: unknown milestone ${milestone ?: "<missing>"}"
            val sourceFiles = jsonArray(checkpoint["sourceFiles"]).mapNotNull(::jsonString)
            for (file in sourceFiles.filterNot(::repoExists)) checkpointProblems += "$checkpointId: missing source file $file"
            val sourceText = sourceSurfaceText(sourceFiles)
            val missingOutputs = jsonArray(checkpoint["requiredOutputs"]).mapNotNull(::jsonString).filterNot { containsItem(sourceText, it) }
            val missingGates = jsonArray(checkpoint["requiredGateItems"]).mapNotNull(::jsonString).filterNot { containsItem(sourceText, it) }
            if (missingOutputs.isNotEmpty()) checkpointProblems += "$checkpointId: missing progression outputs ${missingOutputs.joinToString(", ")}"
            if (missingGates.isNotEmpty()) checkpointProblems += "$checkpointId: missing gate inputs ${missingGates.joinToString(", ")}"
        }
        if (checkpointProblems.isEmpty()) ok("primary crafting spine source checkpoints are progression-routed", "$checkpointCount checkpoints") else fail("primary crafting spine source checkpoints are progression-routed", checkpointProblems.take(100).joinToString("\n"))

        val sourceFiles = repoWalk("kubejs/server_scripts") { it.endsWith(".js") } + repoWalk("kubejs/data") { it.endsWith(".json") }
        val sourceText = sourceSurfaceText(sourceFiles)
        val surfaceProblems = mutableListOf<String>()
        for (surfaceAny in jsonArray(spine["sourceRecipeSurfaces"])) {
            val surface = jsonObject(surfaceAny)
            val surfaceId = jsonString(surface["id"]) ?: "<missing id>"
            val needles = jsonArray(surface["needles"]).mapNotNull(::jsonString)
            if (jsonString(surface["id"]).isNullOrBlank() || needles.isEmpty()) {
                surfaceProblems += "$surfaceId: missing needles"
                continue
            }
            if (needles.none(sourceText::contains)) surfaceProblems += "$surfaceId: missing any of ${needles.joinToString(" | ")}"
        }
        if (surfaceProblems.isEmpty()) ok("primary crafting recipe surfaces are represented in authored progression scripts", "${jsonArray(spine["sourceRecipeSurfaces"]).size} surfaces") else fail("primary crafting recipe surfaces are represented in authored progression scripts", surfaceProblems.take(100).joinToString("\n"))

        val dump = loadRetainedRecipeGraph()
        if (dump == null) {
            ok("primary crafting spine retained runtime evidence is ready", "no retained recipe graph")
            return
        }
        val recipeTypes = jsonArray(dump["recipes"]).map(::jsonObject).mapNotNull { jsonString(it["type"]) }.toSet()
        val produced = mutableSetOf<String>()
        for (recipe in jsonArray(dump["recipes"]).map(::jsonObject)) {
            for (output in jsonArray(recipe["outputs"]).map(::jsonObject)) if (jsonString(output["kind"]) == "item") jsonString(output["id"])?.let { produced += it }
        }
        val missingRuntimeSurfaces = jsonArray(spine["runtimeRecipeSurfaces"]).mapNotNull(::jsonString).filterNot(recipeTypes::contains)
        val missingRuntimeOutputs = jsonArray(spine["runtimeProducedMachineOutputs"]).mapNotNull(::jsonString).filter { it !in produced && !containsItem(sourceText, it) }
        val runtimeProblems = mutableListOf<String>()
        if (missingRuntimeSurfaces.isNotEmpty()) runtimeProblems += "missing recipe types: ${missingRuntimeSurfaces.joinToString(", ")}"
        if (missingRuntimeOutputs.isNotEmpty()) runtimeProblems += "missing produced machine outputs: ${missingRuntimeOutputs.joinToString(", ")}"
        if (runtimeProblems.isEmpty()) ok("retained runtime graph covers primary crafting spine surfaces", "${jsonArray(spine["runtimeRecipeSurfaces"]).size} recipe types, ${jsonArray(spine["runtimeProducedMachineOutputs"]).size} outputs") else fail("retained runtime graph covers primary crafting spine surfaces", runtimeProblems.joinToString("\n"))
    }

    val manifest = try {
        jsonObject(repoReadJson("kubejs/config/player_progression_regression.json")).also {
            if (jsonString(it["schema"]) == "bc.player_progression_regression.v1") ok("player progression regression manifest parses", jsonString(it["schema"]) ?: "") else fail("player progression regression manifest schema is current", jsonString(it["schema"]) ?: "<missing>")
        }
    } catch (error: Exception) {
        fail("player progression regression manifest parses", error.message ?: error.javaClass.simpleName)
        mapOf("milestones" to emptyList<Any>())
    }
    val catalog = try {
        jsonObject(repoReadJson("kubejs/config/bc_expert_graph_catalog.json")).also {
            ok("expert graph catalog parses for player progression contracts", "${jsonArray(it["tierOrder"]).size} tiers")
        }
    } catch (error: Exception) {
        fail("expert graph catalog parses for player progression contracts", error.message ?: error.javaClass.simpleName)
        mapOf("tierOrder" to emptyList<Any>(), "machineTiers" to emptyList<Any>())
    }

    val milestones = jsonArray(manifest["milestones"]).map(::jsonObject)
    val milestoneIds = milestones.mapNotNull { jsonString(it["id"]) }
    val duplicateMilestones = milestoneIds.filterIndexed { index, id -> milestoneIds.indexOf(id) != index }.distinct()
    if (duplicateMilestones.isEmpty()) ok("player progression milestone IDs are unique", "${milestoneIds.size} milestones") else fail("player progression milestone IDs are unique", duplicateMilestones.joinToString(", "))
    val expectedTierOrder = jsonArray(manifest["expectedTierOrder"]).mapNotNull(::jsonString)
    val catalogTierOrder = jsonArray(catalog["tierOrder"]).mapNotNull(::jsonString)
    if (expectedTierOrder == catalogTierOrder) ok("player progression manifest tier order matches expert catalog", "${catalogTierOrder.size} tiers") else fail("player progression manifest tier order matches expert catalog", "$expectedTierOrder != $catalogTierOrder")
    val tierSet = catalogTierOrder.toSet()
    val unknownTiers = milestones.mapNotNull { milestone ->
        val tier = jsonString(milestone["tier"])
        val id = jsonString(milestone["id"])
        if (tier != null && id != null && tier !in tierSet) "$id:$tier" else null
    }
    if (unknownTiers.isEmpty()) ok("player progression milestone tiers are catalog tiers") else fail("player progression milestone tiers are catalog tiers", unknownTiers.joinToString(", "))
    val idSet = milestoneIds.toSet()
    val missingPrevious = milestones.mapNotNull { milestone ->
        val id = jsonString(milestone["id"]) ?: return@mapNotNull null
        val previous = jsonString(milestone["requiresPrevious"]) ?: return@mapNotNull null
        if (previous !in idSet) "$id->$previous" else null
    }
    if (missingPrevious.isEmpty()) ok("player progression milestone predecessor refs resolve") else fail("player progression milestone predecessor refs resolve", missingPrevious.joinToString(", "))
    val machineMilestones = milestones.filter { milestone -> jsonArray(milestone["outputs"]).mapNotNull(::jsonString).any { it.startsWith("kubejs:") && it.endsWith("_casing") } }
    val manifestCasings = machineMilestones.flatMap { jsonArray(it["outputs"]).mapNotNull(::jsonString) }.filter { it.startsWith("kubejs:") && it.endsWith("_casing") }
    val catalogCasings = jsonArray(catalog["machineTiers"]).map(::jsonObject).mapNotNull { jsonString(it["casing"]) }
    if (manifestCasings == catalogCasings) ok("player progression machine milestones mirror casing catalog", "${manifestCasings.size} casings") else fail("player progression machine milestones mirror casing catalog", "$manifestCasings != $catalogCasings")
    val sparseMilestones = milestones.mapNotNull { milestone ->
        val id = jsonString(milestone["id"]) ?: return@mapNotNull null
        if (jsonArray(milestone["outputs"]).isEmpty() || jsonArray(milestone["route"]).isEmpty() || jsonArray(milestone["sourceAssertions"]).isEmpty()) id else null
    }
    if (sparseMilestones.isEmpty()) ok("player progression milestones carry outputs, route notes, and source assertions") else fail("player progression milestones carry outputs, route notes, and source assertions", sparseMilestones.joinToString(", "))

    validateSourceAssertions(milestones)
    validatePrimaryCraftingSpine(manifest, milestones)
    validateBypassSurfaces(manifest)
    validateRuntimeGraphReadiness(manifest)
    val parentingValidation = runKotlinScript(root.resolve("tools/kotlin/validate_progression_contracts.main.kts"))
    if (parentingValidation.exitCode == 0) {
        ok("era parenting and economy manifests validate", parentingValidation.output.trim().ifBlank { "ok" })
    } else {
        fail("era parenting and economy manifests validate", parentingValidation.output.trim().ifBlank { "validation failed" })
    }

    val output = buildString {
        appendLine()
        append("player progression contract validators: ${passes.size} pass(es), ${failures.size} hard failure(s)")
    }
    return ProcessRun(if (failures.isEmpty()) 0 else 1, output)
}

data class ReachabilityRecipe(
    val id: String,
    val type: String,
    val inputs: List<Map<String, Any?>>,
    val outputs: List<Map<String, Any?>>,
    val fluidsIn: List<Map<String, Any?>>,
    val manual: Boolean = false,
)

data class ReachabilityContext(
    val source: Map<String, Any?>,
    val spine: Map<String, Any?>,
    val runtimeRecipes: List<ReachabilityRecipe>,
    val manualRecipes: List<ReachabilityRecipe>,
    val recipes: List<ReachabilityRecipe>,
)

fun uniqueNonBlank(values: List<String>): List<String> = values.filter { it.isNotBlank() }.distinct()

fun reachabilityItemEntry(id: String): Map<String, Any?> = mapOf("kind" to "item", "id" to id, "count" to 1)

fun loadReachabilitySource(path: Path): Map<String, Any?> {
    val source = jsonObject(parseJson(Files.readString(path)))
    if (jsonString(source["schema"]) != "bc.progression_reachability_sources.v1") {
        error("unsupported progression reachability source schema in $path: ${jsonString(source["schema"]) ?: "<missing>"}")
    }
    return source
}

fun loadProgressionSpine(path: Path): Map<String, Any?> {
    val spine = jsonObject(parseJson(Files.readString(path)))
    if (jsonString(spine["schema"]) != "bc.player_progression_regression.v1") {
        error("unsupported player progression spine schema in $path: ${jsonString(spine["schema"]) ?: "<missing>"}")
    }
    return spine
}

fun loadReachabilityRuntimeRecipes(path: Path): List<ReachabilityRecipe> {
    val (_, recipes) = loadRecipeGraph(path)
    return recipes.map {
        ReachabilityRecipe(
            id = it.id,
            type = it.type,
            inputs = it.inputs.map { stack -> mapOf("kind" to stack.kind, "id" to stack.id, "count" to stack.count, "chance" to stack.chance) },
            outputs = it.outputs.map { stack -> mapOf("kind" to stack.kind, "id" to stack.id, "count" to stack.count, "chance" to stack.chance) },
            fluidsIn = it.fluidsIn.map { stack -> mapOf("kind" to stack.kind, "id" to stack.id, "amount" to stack.count, "chance" to stack.chance) },
            manual = false,
        )
    }
}

fun normalizeManualEdges(edges: List<Any?>): List<ReachabilityRecipe> =
    edges.map(::jsonObject).map {
        ReachabilityRecipe(
            id = jsonString(it["id"]) ?: "UNKNOWN",
            type = "bc:manual_progression_edge",
            inputs = jsonArray(it["inputs"]).mapNotNull(::jsonString).map(::reachabilityItemEntry),
            outputs = jsonArray(it["outputs"]).mapNotNull(::jsonString).map(::reachabilityItemEntry),
            fluidsIn = jsonArray(it["fluidsIn"]).mapNotNull(::jsonString).map { fluid -> mapOf("kind" to "fluid", "id" to fluid, "amount" to 1000) },
            manual = true,
        )
    }

fun outputItems(recipe: ReachabilityRecipe): List<String> =
    uniqueNonBlank(recipe.outputs.filter { jsonString(it["kind"]) == "item" }.mapNotNull { jsonString(it["id"]) })

fun reachabilityTagProviders(source: Map<String, Any?>): Map<String, List<String>> =
    jsonObject(source["tagProviders"]).mapValues { jsonArray(it.value).mapNotNull(::jsonString) }

fun expandTagInputs(recipe: ReachabilityRecipe, tagProviders: Map<String, List<String>>): Pair<List<List<String>>, List<String>> {
    val missingTags = mutableListOf<String>()
    val alternatives = mutableListOf<List<String>>()
    for (input in recipe.inputs) {
        when (jsonString(input["kind"])) {
            "item" -> jsonString(input["id"])?.let { alternatives += listOf(it) }
            "tag" -> {
                val tagId = jsonString(input["id"]) ?: continue
                val providers = tagProviders[tagId].orEmpty()
                if (providers.isEmpty()) missingTags += tagId else alternatives += providers
            }
        }
    }
    return alternatives to missingTags
}

fun canSatisfyAlternatives(alternatives: List<List<String>>, reachable: Set<String>): List<String>? {
    val chosen = mutableListOf<String>()
    for (options in alternatives) {
        val item = options.firstOrNull { it in reachable } ?: return null
        chosen += item
    }
    return chosen
}

fun recipeMachineRequirement(recipe: ReachabilityRecipe, source: Map<String, Any?>): String? {
    val freeRecipeTypes = jsonArray(source["freeRecipeTypes"]).mapNotNull(::jsonString)
    if (recipe.type in freeRecipeTypes) return null
    return jsonString(jsonObject(source["machineUnlocks"])[recipe.type])
}

fun loadReachabilityContext(
    graphPath: Path = root.resolve("generated/runtime-dumps/recipes.json"),
    sourcesPath: Path = root.resolve("kubejs/config/progression_reachability_sources.json"),
    spinePath: Path = root.resolve("kubejs/config/player_progression_regression.json"),
): ReachabilityContext {
    val source = loadReachabilitySource(sourcesPath)
    val spine = loadProgressionSpine(spinePath)
    val runtimeRecipes = loadReachabilityRuntimeRecipes(graphPath)
    val manualRecipes = normalizeManualEdges(jsonArray(source["manualEdges"]))
    return ReachabilityContext(
        source = source,
        spine = spine,
        runtimeRecipes = runtimeRecipes,
        manualRecipes = manualRecipes,
        recipes = runtimeRecipes + manualRecipes,
    )
}

fun solveReachability(recipes: List<ReachabilityRecipe>, source: Map<String, Any?>): Triple<Set<String>, Map<String, Map<String, Any?>>, Int> {
    val reachable = jsonArray(source["seedItems"]).mapNotNull(::jsonString).toMutableSet()
    val reachableFluids = jsonArray(source["seedFluids"]).mapNotNull(::jsonString).toMutableSet()
    val reason = mutableMapOf<String, Map<String, Any?>>()
    reachable.forEach { reason[it] = mapOf("kind" to "seed") }
    reachableFluids.forEach { reason["fluid:$it"] = mapOf("kind" to "seed") }
    val tagProviders = reachabilityTagProviders(source)
    var changed = true
    var iterations = 0
    while (changed && iterations < 500) {
        changed = false
        iterations += 1
        for (recipe in recipes) {
            val outputs = outputItems(recipe)
            if (outputs.isEmpty() || outputs.all { it in reachable }) continue
            val (alternatives, missingTags) = expandTagInputs(recipe, tagProviders)
            if (missingTags.isNotEmpty()) continue
            val chosenInputs = canSatisfyAlternatives(alternatives, reachable) ?: continue
            val missingFluid = recipe.fluidsIn.firstOrNull { jsonString(it["kind"]) == "fluid" && jsonString(it["id"]) !in reachableFluids }
            if (missingFluid != null) continue
            val machine = recipeMachineRequirement(recipe, source)
            if (machine != null && machine !in reachable) continue
            for (item in outputs) {
                if (item in reachable) continue
                reachable += item
                changed = true
                reason[item] = mapOf(
                    "kind" to if (recipe.manual) "manual" else "recipe",
                    "recipe" to recipe.id,
                    "type" to recipe.type,
                    "inputs" to uniqueNonBlank(chosenInputs + listOfNotNull(machine)),
                    "fluids" to uniqueNonBlank(recipe.fluidsIn.mapNotNull { jsonString(it["id"]) }),
                )
            }
        }
    }
    return Triple(reachable, reason, iterations)
}

fun explainReachability(item: String, reason: Map<String, Map<String, Any?>>, depth: Int = 0, seen: MutableSet<String> = mutableSetOf()): List<String> {
    if (!seen.add(item)) return listOf("${"  ".repeat(depth)}$item (cycle)")
    val r = reason[item] ?: return listOf("${"  ".repeat(depth)}$item (unreached)")
    if (jsonString(r["kind"]) == "seed") return listOf("${"  ".repeat(depth)}$item <= source")
    val lines = mutableListOf("${"  ".repeat(depth)}$item <= ${jsonString(r["recipe"]) ?: "UNKNOWN"} [${jsonString(r["type"]) ?: "UNKNOWN"}]")
    for (dep in jsonArray(r["inputs"]).mapNotNull(::jsonString)) lines += explainReachability(dep, reason, depth + 1, seen)
    return lines
}

fun blockedRecipeEntries(target: String, recipes: List<ReachabilityRecipe>, source: Map<String, Any?>, reachable: Set<String>, limit: Int = 5): List<Map<String, Any?>> {
    val producing = recipes.filter { target in outputItems(it) }
    if (producing.isEmpty()) {
        return listOf(mapOf("kind" to "no-producer", "message" to "no recipe or manual edge produces target"))
    }
    val tagProviders = reachabilityTagProviders(source)
    return producing.take(limit).map { recipe ->
        val (alternatives, missingTags) = expandTagInputs(recipe, tagProviders)
        val missingItems = mutableListOf<String>()
        for (options in alternatives) if (options.none { it in reachable }) missingItems += options.joinToString("|")
        val missingFluids = recipe.fluidsIn.mapNotNull { jsonString(it["id"]) }.filterNot(reachable::contains)
        val machine = recipeMachineRequirement(recipe, source)?.takeIf { it !in reachable }
        mapOf(
            "kind" to "candidate",
            "recipe" to recipe.id,
            "type" to recipe.type,
            "missingItems" to uniqueNonBlank(missingItems),
            "missingTags" to uniqueNonBlank(missingTags),
            "missingMachines" to listOfNotNull(machine),
            "missingFluids" to uniqueNonBlank(missingFluids),
            "manual" to recipe.manual,
        )
    }
}

fun reachabilityTargets(source: Map<String, Any?>, spine: Map<String, Any?>): List<String> = uniqueNonBlank(
    jsonArray(source["targets"]).mapNotNull(::jsonString) +
        jsonArray(spine["milestones"]).flatMap { jsonArray(jsonObject(it)["outputs"]).mapNotNull(::jsonString) } +
        jsonArray(jsonObject(spine["primaryCraftingSpine"])["runtimeProducedMachineOutputs"]).mapNotNull(::jsonString),
)

fun buildReachabilityRoute(item: String, reason: Map<String, Map<String, Any?>>): List<Map<String, Any?>> {
    val ordered = linkedMapOf<String, Map<String, Any?>>()
    fun visit(current: String, seen: MutableSet<String>) {
        if (!seen.add(current) || current in ordered) return
        val step = reason[current] ?: return
        for (dep in jsonArray(step["inputs"]).mapNotNull(::jsonString)) visit(dep, seen)
        ordered[current] = mapOf(
            "item" to current,
            "kind" to (jsonString(step["kind"]) ?: "UNKNOWN"),
            "recipe" to jsonString(step["recipe"]),
            "type" to jsonString(step["type"]),
            "inputs" to jsonArray(step["inputs"]).mapNotNull(::jsonString),
            "fluids" to jsonArray(step["fluids"]).mapNotNull(::jsonString),
        )
    }
    visit(item, mutableSetOf())
    return ordered.values.toList()
}

fun runProgressionReachabilityValidation(): ProcessRun {
    val failures = mutableListOf<String>()
    val passes = mutableListOf<String>()
    fun ok(name: String, detail: String = "") {
        passes += name
        println("ok - $name${if (detail.isNotBlank()) " ($detail)" else ""}")
    }
    fun fail(name: String, detail: String) {
        failures += name
        System.err.println("FAIL - $name: $detail")
    }
    val source = try {
        loadReachabilitySource(root.resolve("kubejs/config/progression_reachability_sources.json")).also {
            ok("progression reachability source manifest parses", jsonString(it["schema"]) ?: "")
        }
    } catch (error: Exception) {
        fail("progression reachability source manifest parses", error.message ?: error.javaClass.simpleName)
        emptyMap()
    }
    val spine = try {
        loadProgressionSpine(root.resolve("kubejs/config/player_progression_regression.json")).also {
            ok("player progression manifest loaded for reachability targets", "${jsonArray(it["milestones"]).size} milestones")
        }
    } catch (error: Exception) {
        fail("player progression manifest loaded for reachability targets", error.message ?: error.javaClass.simpleName)
        emptyMap()
    }
    val runtimeRecipes = try {
        if (!repoExists("generated/runtime-dumps/recipes.json")) emptyList()
        else loadReachabilityRuntimeRecipes(root.resolve("generated/runtime-dumps/recipes.json")).also {
            ok("runtime recipe graph loaded for reachability", "${it.size} recipes")
        }
    } catch (error: Exception) {
        fail("runtime recipe graph schema is current", error.message ?: error.javaClass.simpleName)
        emptyList()
    }
    val manualRecipes = normalizeManualEdges(jsonArray(source["manualEdges"]))
    val recipes = runtimeRecipes + manualRecipes
    ok("progression solver recipe corpus assembled", "${runtimeRecipes.size} runtime, ${manualRecipes.size} manual")
    val targets = reachabilityTargets(source, spine)
    ok("progression reachability target set assembled", "${targets.size} targets")
    val (reachable, reason, iterations) = solveReachability(recipes, source)
    ok("progression reachability fixed point computed", "${reachable.size} items in $iterations iteration(s)")
    val missingTargets = targets.filterNot(reachable::contains)
    if (missingTargets.isEmpty()) ok("primary progression targets are recursively reachable from accepted sources", "${targets.size} targets")
    else {
        val details = missingTargets.take(40).joinToString("\n") { item ->
            "$item\n  ${blockedRecipeEntries(item, recipes, source, reachable).joinToString("\n  ") { blocker ->
                when (blocker["kind"]) {
                    "no-producer" -> blocker["message"].toString()
                    else -> {
                        val missing = buildList {
                            addAll((blocker["missingItems"] as List<*>).map { it.toString() })
                            addAll((blocker["missingTags"] as List<*>).map { "tag:$it" })
                            addAll((blocker["missingMachines"] as List<*>).map { "machine:$it" })
                            addAll((blocker["missingFluids"] as List<*>).map { "fluid:$it" })
                        }
                        "${blocker["recipe"]} [${blocker["type"]}] missing ${missing.joinToString(", ").ifBlank { "<none>" }}"
                    }
                }
            }}"
        }
        fail("primary progression targets are recursively reachable from accepted sources", details)
    }
    val traceTargets = listOf("kubejs:seared_machine_casing", "kubejs:andesite_machine_casing", "kubejs:brass_machine_casing", "kubejs:airtight_machine_casing", "pneumaticcraft:printed_circuit_board", "bloodmagic:archmagebloodorb").filter(reachable::contains)
    val output = buildString {
        for (item in traceTargets) {
            appendLine()
            appendLine("route - $item")
            appendLine(explainReachability(item, reason).take(60).joinToString("\n"))
        }
        appendLine()
        append("progression reachability validators: ${passes.size} pass(es), ${failures.size} hard failure(s)")
    }
    return ProcessRun(if (failures.isEmpty()) 0 else 1, output)
}

fun runBurntCoverageValidation(): ProcessRun {
    val maintainedTagIds = listOf(
        "burnt:plants_will_burn",
        "burnt:grass_blocks",
        "burnt:fire_resistant",
        "minecraft:logs",
        "minecraft:logs_that_burn",
        "minecraft:leaves",
        "minecraft:crops",
        "minecraft:wooden_buttons",
        "minecraft:wooden_pressure_plates",
        "minecraft:wooden_doors",
        "minecraft:wooden_trapdoors",
        "minecraft:wooden_fences",
        "minecraft:fence_gates",
        "minecraft:wooden_slabs",
        "minecraft:wooden_stairs",
        "forge:mushroom_blocks",
        "minecraft:wool_carpets",
    )
    val emitterDependencies = mapOf(
        "burnt:burning_grass" to listOf("burnt:grass_blocks"),
        "burnt:burning_logs" to listOf("minecraft:logs", "minecraft:logs_that_burn"),
        "burnt:burning_stripped_logs" to listOf("minecraft:logs", "minecraft:logs_that_burn"),
        "burnt:burning_stripped_wood" to listOf("minecraft:logs", "minecraft:logs_that_burn"),
        "burnt:burning_wood" to listOf("minecraft:logs", "minecraft:logs_that_burn"),
        "burnt:burning_planks" to listOf("minecraft:planks"),
        "burnt:burning_leaves" to listOf("minecraft:leaves"),
        "burnt:burning_doors" to listOf("minecraft:wooden_doors"),
        "burnt:burning_fences" to listOf("minecraft:wooden_fences"),
        "burnt:burning_fence_gates" to listOf("minecraft:fence_gates"),
        "burnt:burning_slabs" to listOf("minecraft:wooden_slabs"),
        "burnt:burning_stairs" to listOf("minecraft:wooden_stairs"),
        "burnt:stairs_fire" to listOf("minecraft:wooden_stairs"),
        "burnt:wood_fire" to listOf("minecraft:logs", "minecraft:planks"),
    )
    fun fail(message: String): ProcessRun = ProcessRun(1, "FAIL - $message")
    fun localTagPath(tagId: String): String {
        val parts = tagId.split(':', limit = 2)
        require(parts.size == 2) { "invalid tag id: $tagId" }
        return "kubejs/data/${parts[0]}/tags/blocks/${parts[1]}.json"
    }
    fun localTagIds(): Set<String> {
        val rootDir = root.resolve("kubejs/data")
        if (!rootDir.exists()) return emptySet()
        val tagIds = mutableSetOf<String>()
        Files.list(rootDir).use { namespaces ->
            namespaces.filter { Files.isDirectory(it) }.forEach { namespaceDir ->
                val tagDir = namespaceDir.resolve("tags/blocks")
                if (!tagDir.exists()) return@forEach
                Files.list(tagDir).use { entries ->
                    entries.filter { Files.isRegularFile(it) && it.fileName.toString().endsWith(".json") }.forEach { entry ->
                        tagIds += "${namespaceDir.fileName}:${entry.fileName.toString().removeSuffix(".json")}"
                    }
                }
            }
        }
        return tagIds
    }
    fun upstreamTagIds(): Set<String> {
        val tagIds = mutableSetOf<String>()
        for (modDir in listOf(root.resolve("generated/cache/packwiz-downloads/mods"), root.resolve("mods"))) {
            if (!modDir.exists()) continue
            Files.list(modDir).use { entries ->
                entries.filter { Files.isRegularFile(it) && it.fileName.toString().endsWith(".jar") }.forEach { jarPath ->
                    val result = runProcess(listOf("jar", "tf", jarPath.toString()), stream = false)
                    if (result.exitCode != 0) throw IllegalStateException("could not read tag list from $jarPath: ${result.output}")
                    result.output.lineSequence().forEach { line ->
                        val match = Regex("""^data/([^/]+)/tags/blocks/(.+)\.json$""").find(line) ?: return@forEach
                        tagIds += "${match.groupValues[1]}:${match.groupValues[2]}"
                    }
                }
            }
        }
        return tagIds
    }
    fun maintainedTagValues(tagId: String): List<String> {
        val relPath = localTagPath(tagId)
        if (!repoExists(relPath)) throw IllegalStateException("maintained tag file is missing: $relPath")
        val parsed = jsonObject(repoReadJson(relPath))
        val values = jsonArray(parsed["values"]).mapNotNull(::jsonString)
        if (values.isEmpty()) throw IllegalStateException("maintained tag is empty: $tagId")
        return values
    }
    fun extractConfigTagRefs(): List<Pair<String, String>> {
        val emittersDir = root.resolve("config/adpother/Emitters")
        val refs = mutableListOf<Pair<String, String>>()
        if (emittersDir.exists()) {
            Files.list(emittersDir).use { entries ->
                entries.filter { Files.isRegularFile(it) && it.fileName.toString().startsWith("burnt$") && it.fileName.toString().endsWith(".cfg") }.forEach { filePath ->
                    val content = Files.readString(filePath)
                    Regex("""S:id=(#[A-Za-z0-9_:.\/-]+)""").findAll(content).forEach { refs += filePath.toString() to it.groupValues[1].removePrefix("#") }
                }
            }
        }
        val breakables = root.resolve("config/adpother/Breakables/burnt\$burnt_blocks.cfg")
        if (breakables.exists()) {
            val content = Files.readString(breakables)
            Regex("""S:id=(#[A-Za-z0-9_:.\/-]+)""").findAll(content).forEach { refs += breakables.toString() to it.groupValues[1].removePrefix("#") }
        }
        return refs
    }
    val syncCheck = runBurntCoverageTagSync(writeChanges = false)
    val syncOutput = syncCheck.output.trim()
    if (syncCheck.exitCode != 0) return fail("burnt sync check drifted or failed\n$syncOutput")
    val output = mutableListOf("ok - burnt sync check")
    val localTags = localTagIds()
    val upstreamTags = try {
        upstreamTagIds()
    } catch (error: Exception) {
        return fail(error.message ?: error.javaClass.simpleName)
    }
    val allTags = localTags + upstreamTags
    val maintainedValues = mutableMapOf<String, List<String>>()
    try {
        for (tagId in maintainedTagIds) maintainedValues[tagId] = maintainedTagValues(tagId)
    } catch (error: Exception) {
        return fail(error.message ?: error.javaClass.simpleName)
    }
    output += "ok - maintained Burnt compatibility tags (${maintainedTagIds.size})"
    for ((filePath, tagId) in extractConfigTagRefs()) {
        val relFile = root.relativize(Paths.get(filePath)).toString().replace(File.separatorChar, '/')
        if (tagId !in allTags) return fail("adpother references missing tag $tagId in $relFile")
        for (dependency in emitterDependencies[tagId].orEmpty()) {
            val values = maintainedValues[dependency]
            if (values.isNullOrEmpty() && dependency !in upstreamTags) {
                return fail("adpother tag $tagId depends on empty maintained tag $dependency")
            }
        }
    }
    output += "ok - adpother Burnt tag references resolve"
    return ProcessRun(0, output.joinToString("\n"))
}

fun runtimeKubejsDumpFiles(configDir: Path): List<Path> {
    if (!configDir.exists()) return emptyList()
    val wantedExact = setOf(
        "food_effect_index.json",
        "food_effect_summary.json",
        "full_recipe_index_manifest.json",
        "known_bypass_candidate_recipes.json",
        "progression_recipe_mentions.json",
        "recipe_audit_summary.json",
        "valuable_material_usage_recipes.json",
    )
    return Files.list(configDir).use { entries ->
        entries
            .filter { Files.isRegularFile(it) }
            .filter { path ->
                val name = path.fileName.toString()
                name in wantedExact || Regex("""^full_recipe_index_\d{4}\.json$""").matches(name)
            }
            .sorted(Comparator.comparing<Path, String> { it.fileName.toString() })
            .toList()
    }
}

fun clearRuntimeDumpInputs(serverDir: Path) {
    deleteTree(serverDir.resolve("generated/runtime-dumps"))
    serverDir.resolve("generated/runtime-dumps").createDirectories()
    val configDir = serverDir.resolve("kubejs/config")
    for (file in runtimeKubejsDumpFiles(configDir)) {
        Files.deleteIfExists(file)
    }
}

fun promoteRuntimeDumpArtifacts(serverDir: Path): ProcessRun {
    val runtimeDumpDir = serverDir.resolve("generated/runtime-dumps")
    val runtimeConfigDir = serverDir.resolve("kubejs/config")
    val targetDumpDir = root.resolve("generated/runtime-dumps")
    val targetConfigDumpDir = targetDumpDir.resolve("kubejs-config")
    if (!runtimeDumpDir.exists()) return ProcessRun(1, "missing runtime dump dir: $runtimeDumpDir")

    val directDumpNames = listOf(
        "recipes.json",
        "registries.json",
        "tags.json",
        "mods.json",
        "block_hardness_probe.json",
    )
    val output = mutableListOf<String>()

    targetDumpDir.createDirectories()
    deleteTree(targetConfigDumpDir)
    targetConfigDumpDir.createDirectories()

    for (name in directDumpNames) {
        val source = runtimeDumpDir.resolve(name)
        val target = targetDumpDir.resolve(name)
        Files.deleteIfExists(target)
        if (source.exists()) {
            Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.COPY_ATTRIBUTES)
            output += "copied ${serverDir.relativize(source)} -> ${root.relativize(target)}"
        }
    }

    for (source in runtimeKubejsDumpFiles(runtimeConfigDir)) {
        val target = targetConfigDumpDir.resolve(source.fileName.toString())
        Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.COPY_ATTRIBUTES)
        output += "copied ${serverDir.relativize(source)} -> ${root.relativize(target)}"
    }

    val retainedRefresh = runRetainedRuntimeDumpRefresh()
    output += retainedRefresh.output.trim()
    if (retainedRefresh.exitCode != 0) return ProcessRun(retainedRefresh.exitCode, output.filter { it.isNotBlank() }.joinToString("\n"))

    Files.deleteIfExists(root.resolve("generated/runtime-dumps/realistic_hands_audit.json"))

    val realisticAudit = runKotlinScript(root.resolve("tools/kotlin/audit_realistic_hands.main.kts"))
    output += realisticAudit.output.trim()
    if (realisticAudit.exitCode != 0) return ProcessRun(realisticAudit.exitCode, output.filter { it.isNotBlank() }.joinToString("\n"))

    return ProcessRun(0, output.filter { it.isNotBlank() }.joinToString("\n"))
}

fun runDumpRefresh(serverDir: Path, port: Int, reset: Boolean): ProcessRun {
    val stamp = timestamp()
    val bootstrap = bootstrapServerRuntime(serverDir, port, reset)
    if (bootstrap.exitCode != 0) return bootstrap
    clearRuntimeDumpInputs(serverDir)
    val evidenceDir = serverDir.resolve("validation-evidence/$stamp")
    evidenceDir.createDirectories()
    val serverLog = evidenceDir.resolve("server-console.log")
    val latestLog = serverDir.resolve("logs/latest.log")
    val running = startServerProcess(serverDir, port, listOf("nogui"), serverLog)
    try {
        val donePattern = Regex("""Done \([\d.]+s\)! For help, type "help"""")
        val fatalPattern = Regex("""Missing or unsupported mandatory dependencies|Mod Loading has failed|Failed to start the minecraft server|Encountered an unexpected exception|Preparing crash report|This crash report has been saved|\[main/FATAL\]""")
        val deadline = System.currentTimeMillis() + 900_000L
        while (System.currentTimeMillis() < deadline) {
            if (!running.process.isAlive) return ProcessRun(1, "server exited before Done marker")
            val text = tailText(serverLog, 256_000)
            if (fatalPattern.containsMatchIn(text)) return ProcessRun(1, "server emitted a hard startup failure")
            if (donePattern.containsMatchIn(text)) break
            Thread.sleep(2000)
        }
        waitForFiles(
            listOf(
                serverDir.resolve("generated/runtime-dumps/recipes.json"),
                serverDir.resolve("generated/runtime-dumps/registries.json"),
                serverDir.resolve("generated/runtime-dumps/block_hardness_probe.json"),
                serverDir.resolve("kubejs/config/full_recipe_index_manifest.json"),
                serverDir.resolve("kubejs/config/food_effect_index.json"),
            ),
            timeoutSeconds = 120,
            process = running.process,
            phase = "dump refresh",
        )
        sendCommand(running, "stop")
        running.process.waitFor()
    } finally {
        stopProcess(running)
    }
    val scan = scanHardFailures(latestLog, serverDir)
    if (!scan.ok) {
        val output = buildString {
            appendLine("FAIL - hard log failure scan (${scan.logPath ?: "UNKNOWN"})")
            for (finding in scan.findings) {
                appendLine("FAIL - ${finding.label}: ${finding.count}")
                for (match in finding.matches) {
                    val prefix = if (match.lineNumber > 0) "${match.lineNumber}:" else ""
                    appendLine("  $prefix${match.line}")
                }
            }
        }.trim()
        return ProcessRun(1, output)
    }
    return promoteRuntimeDumpArtifacts(serverDir)
}

fun runLcTfthDhContractsValidation(): ProcessRun =
    runKotlinScript(root.resolve("tools/kotlin/validate_lc_tfth_dh_contracts.main.kts"))

fun runToolDocSurfaceValidation(): ProcessRun {
    val failures = mutableListOf<String>()
    fun fail(message: String) {
        failures += message
    }

    val agentsPath = "AGENTS.md"
    val runtimeValidationPath = "docs/runtime_validation.md"
    val performancePath = "docs/performance_and_mods.md"
    val docsReadmePath = "docs/README.md"
    val agentsText = repoRead(agentsPath)
    val runtimeText = repoRead(runtimeValidationPath)
    val performanceText = repoRead(performancePath)
    val docsReadmeText = repoRead(docsReadmePath)

    val expectedAgentCommands = listOf(
        "Validation: `tools/bc test static`",
        "Kotlin test runner: `tools/bc test kotlin`",
        "Fast workspace checks: `tools/bc test fast`",
        "One-world server/client smoke: `tools/bc test smoke --bootstrap-mode always`",
    )
    for (line in expectedAgentCommands) {
        if (!agentsText.contains(line)) fail("$agentsPath missing documented command: $line")
    }

    for (command in listOf("tools/bc test static", "tools/bc test kotlin", "tools/bc test fast", "tools/bc test smoke --bootstrap-mode always")) {
        if (!runtimeText.contains(command)) fail("$runtimeValidationPath missing supported command: `$command`")
    }
    if (!runtimeText.contains("one Xvfb-backed client")) {
        fail("$runtimeValidationPath must describe the single client lifecycle smoke")
    }

    val docsList = Regex("""- `([^`]+)`:""").findAll(docsReadmeText).map { it.groupValues[1] }.toList()
    val expectedDocs = listOf("README.md", "progression.md", "content_systems.md", "runtime_validation.md", "performance_and_mods.md")
    if (docsList != expectedDocs) {
        fail("$docsReadmePath living-doc index drift: expected ${expectedDocs.joinToString(", ")}, found ${docsList.joinToString(", ")}")
    }

    return if (failures.isEmpty()) ProcessRun(0, "ok - tool doc surface matches live tools/bc command surface")
    else ProcessRun(1, failures.joinToString("\n") { "FAIL - $it" })
}

fun runSmokeValidation(serverDir: Path, port: Int, reset: Boolean, bootstrapMode: String = "always", harness: HarnessRun? = null): ProcessRun {
    val stamp = timestamp()
    val fakeMode = System.getenv("BC_TEST_FAKE_SMOKE")
    if (fakeMode == "1") {
        val evidenceDir = serverDir.resolve("validation-evidence/$stamp")
        evidenceDir.createDirectories()
        harness?.updateStatus(
            status = "running",
            phase = "runtime_validation",
            evidencePaths = listOf(evidenceDir.toString()),
            extra = mapOf("server_dir" to serverDir.toString()),
        )
        writeJsonFile(
            harness?.paths?.summary ?: evidenceDir.resolve("summary.json"),
            mapOf(
                "status" to "passed",
                "server_dir" to serverDir.toString(),
                "requested_port" to harness?.spec?.requestedPort,
                "actual_port" to port,
                "evidence_paths" to listOf(evidenceDir.toString()),
            ),
        )
        return ProcessRun(0, "fake smoke passed")
    }
    when (bootstrapMode) {
        "always", "once" -> {
            harness?.updateStatus(status = "running", phase = "bootstrap")
            val bootstrap = bootstrapServerRuntime(serverDir, port, reset)
            if (bootstrap.exitCode != 0) return bootstrap
        }
        "never" -> {
            if (reset) return ProcessRun(2, "--reset-runtime cannot be combined with --bootstrap-mode never")
            if (!serverDir.resolve("run.sh").exists()) return ProcessRun(2, "prepared runtime missing for bootstrap-mode never: $serverDir")
        }
        else -> return ProcessRun(2, "invalid bootstrap mode: $bootstrapMode")
    }
    val prune = pruneRuntimeMods(serverDir, "server", apply = false)
    if (prune.exitCode != 0) return prune
    val evidenceDir = serverDir.resolve("validation-evidence/$stamp")
    evidenceDir.createDirectories()
    harness?.updateStatus(
        status = "running",
        phase = "start_server",
        evidencePaths = listOf(evidenceDir.toString(), serverDir.resolve("logs/latest.log").toString()),
        extra = mapOf("server_dir" to serverDir.toString()),
    )
    val serverLog = evidenceDir.resolve("server-console.log")
    val latestLog = serverDir.resolve("logs/latest.log")
    val running = startServerProcess(serverDir, port, listOf("nogui"), serverLog)
    harness?.updateStatus(childPids = listOf(running.process.pid()))
    try {
        val donePattern = Regex("""Done \([\d.]+s\)! For help, type "help"""")
        val fatalPattern = Regex("""Missing or unsupported mandatory dependencies|Mod Loading has failed|Failed to start the minecraft server|Encountered an unexpected exception|Preparing crash report|This crash report has been saved|\[main/FATAL\]""")
        val deadline = System.currentTimeMillis() + 900_000L
        var reachedDone = false
        harness?.updateStatus(status = "running", phase = "wait_ready")
        while (System.currentTimeMillis() < deadline) {
            if (!running.process.isAlive) {
                return ProcessRun(1, "server exited before Done marker")
            }
            val text = tailText(serverLog, 256_000)
            if (fatalPattern.containsMatchIn(text)) {
                return ProcessRun(1, "server emitted a hard startup failure")
            }
            if (donePattern.containsMatchIn(text)) {
                reachedDone = true
                break
            }
            Thread.sleep(2000)
        }
        if (!reachedDone) {
            captureSmokeStartupDiagnostics(running, evidenceDir)
            return ProcessRun(1, "server startup timed out before Done marker")
        }
        harness?.updateStatus(status = "running", phase = "runtime_validation")
        stopProcess(running, "stop")
    } finally {
        harness?.updateStatus(status = "running", phase = "shutdown")
        stopProcess(running)
    }
    val scan = scanHardFailures(latestLog, serverDir)
    if (!scan.ok) {
        val output = buildString {
            appendLine("FAIL - hard log failure scan (${scan.logPath ?: "UNKNOWN"})")
            for (finding in scan.findings) {
                appendLine("FAIL - ${finding.label}: ${finding.count}")
                for (match in finding.matches) {
                    val prefix = if (match.lineNumber > 0) "${match.lineNumber}:" else ""
                    appendLine("  $prefix${match.line}")
                }
            }
        }.trim()
        return ProcessRun(1, output)
    }
    harness?.updateStatus(status = "running", phase = "unearthed_replacement_audit")
    val unearthedAuditPath = evidenceDir.resolve("unearthed-replacement-audit.json")
    val unearthedAudit = runUnearthedReplacementAudit(serverDir, null, unearthedAuditPath)
    if (unearthedAudit.exitCode != 0) return unearthedAudit
    harness?.updateStatus(status = "running", phase = "runtime_validation")
    val suite = runPackSuite(serverDir, strictDataDumps = false, runtimeOnly = true)
    if (suite.exitCode == 0) {
        writeJsonFile(
            harness?.paths?.summary ?: evidenceDir.resolve("summary.json"),
            mapOf(
                "status" to "passed",
                "server_dir" to serverDir.toString(),
                "requested_port" to harness?.spec?.requestedPort,
                "actual_port" to port,
                "evidence_paths" to listOf(evidenceDir.toString(), latestLog.toString(), unearthedAuditPath.toString()),
            ),
        )
    }
    return ProcessRun(suite.exitCode, listOf(unearthedAudit.output, suite.output).filter(String::isNotBlank).joinToString("\n\n"))
}

fun startSmokeClient(clientDir: Path, port: Int, evidenceDir: Path): Pair<RunningProcess, Process> {
    val versionId = "$mcVersion-forge-$forgeVersion"
    val argfile = evidenceDir.resolve("client.args")
    val argfileRun = generateMinecraftClientArgfile(clientDir, versionId, "SmokeClient", "127.0.0.1:$port", argfile)
    require(argfileRun.exitCode == 0) { argfileRun.output }
    val display = ":${100 + (port % 100)}"
    val xvfbLog = evidenceDir.resolve("xvfb.log")
    val xvfb = ProcessBuilder(listOf("Xvfb", display, "-screen", "0", "1280x720x24", "-nolisten", "tcp"))
        .redirectErrorStream(true)
        .redirectOutput(xvfbLog.toFile())
        .start()
    Thread.sleep(500)
    if (!xvfb.isAlive) error("Xvfb exited before the smoke client started")
    val clientLog = evidenceDir.resolve("client-console.log")
    val client = ProcessBuilder(listOf(requireJava17Path(), "@${argfile}"))
        .directory(clientDir.toFile())
        .redirectErrorStream(true)
        .redirectOutput(clientLog.toFile())
    client.environment()["DISPLAY"] = display
    client.environment()["LIBGL_ALWAYS_SOFTWARE"] = "1"
    client.environment().putAll(javaTempEnvironment(clientDir))
    return RunningProcess(client.start(), clientLog) to xvfb
}

fun runSingleWorldSmoke(runRoot: Path, port: Int, bootstrapMode: String, idleSeconds: Int, harness: HarnessRun? = null): ProcessRun {
    if (idleSeconds !in 0..300) return ProcessRun(2, "--idle-seconds must be between 0 and 300")
    val serverDir = runRoot.resolve("server")
    val clientDir = runRoot.resolve("client")
    val stamp = timestamp()
    val evidenceDir = runRoot.resolve("evidence/$stamp")
    evidenceDir.createDirectories()
    fun bootstrap(): ProcessRun = when (bootstrapMode) {
        "always" -> {
            val server = bootstrapServerRuntime(serverDir, port, reset = true)
            if (server.exitCode != 0) server else bootstrapClientRuntime(clientDir)
        }
        "once" -> {
            val server = if (serverDir.resolve("run.sh").exists()) ProcessRun(0, "reusing prepared server runtime") else bootstrapServerRuntime(serverDir, port, reset = true)
            if (server.exitCode != 0) server
            else if (clientDir.resolve("versions").exists()) ProcessRun(0, "reusing prepared client runtime") else bootstrapClientRuntime(clientDir)
        }
        "never" -> if (serverDir.resolve("run.sh").exists() && clientDir.resolve("versions").exists()) ProcessRun(0, "using prepared runtimes") else ProcessRun(2, "prepared server and client runtimes are required for bootstrap-mode never")
        else -> ProcessRun(2, "invalid bootstrap mode: $bootstrapMode")
    }
    harness?.updateStatus(status = "running", phase = "bootstrap", evidencePaths = listOf(evidenceDir.toString()))
    val prepared = bootstrap()
    if (prepared.exitCode != 0) return prepared
    val prune = pruneRuntimeMods(serverDir, "server", apply = false)
    if (prune.exitCode != 0) return prune
    val serverLog = evidenceDir.resolve("server-console.log")
    val server = startServerProcess(serverDir, port, listOf("nogui"), serverLog)
    var client: RunningProcess? = null
    var xvfb: Process? = null
    harness?.updateStatus(status = "running", phase = "wait_server", childPids = listOf(server.process.pid()))
    try {
        waitForLogPattern(listOf(serverLog), Regex("""Done \([\d.]+s\)! For help, type \"help\""""), 900, server.process, "server startup")
        harness?.updateStatus(status = "running", phase = "start_client", childPids = listOf(server.process.pid()))
        val started = startSmokeClient(clientDir, port, evidenceDir)
        client = started.first
        xvfb = started.second
        harness?.updateStatus(status = "running", phase = "wait_join", childPids = listOf(server.process.pid(), client.process.pid(), xvfb.pid()))
        waitForLogPattern(listOf(serverLog), Regex("""SmokeClient joined the game"""), 300, client.process, "client join")
        val hardDuringJoin = scanHardFailures(serverLog, serverDir)
        if (!hardDuringJoin.ok) return ProcessRun(1, "hard server log failure after client join")
        harness?.updateStatus(status = "running", phase = "settle")
        val deadline = System.currentTimeMillis() + idleSeconds * 1000L
        while (System.currentTimeMillis() < deadline) {
            if (!server.process.isAlive) return ProcessRun(1, "server exited during settle")
            if (!client.process.isAlive) return ProcessRun(1, "client exited during settle")
            Thread.sleep(1000)
        }
        sendCommand(server, "kick SmokeClient smoke complete")
        waitForLogPattern(listOf(serverLog), Regex("""SmokeClient lost connection"""), 60, server.process, "client disconnect")
        val serverScan = scanHardFailures(serverLog, serverDir)
        val clientScan = scanHardFailures(client.logPath, clientDir)
        if (!serverScan.ok || !clientScan.ok) return ProcessRun(1, "hard log failure after lifecycle smoke")
        writeJsonFile(evidenceDir.resolve("summary.json"), mapOf("status" to "passed", "serverDir" to serverDir.toString(), "clientDir" to clientDir.toString(), "port" to port, "idleSeconds" to idleSeconds, "evidence" to listOf(serverLog.toString(), client.logPath.toString())))
        return ProcessRun(0, "single-world server/client smoke passed")
    } catch (error: Throwable) {
        captureSmokeStartupDiagnostics(server, evidenceDir)
        return ProcessRun(1, error.message ?: error::class.java.simpleName)
    } finally {
        harness?.updateStatus(status = "running", phase = "shutdown")
        stopProcess(client)
        xvfb?.let { if (it.isAlive) it.destroyForcibly() }
        stopProcess(server, "stop")
    }
}

fun runKotlinTests(filter: String?): ProcessRun {
    val script = root.resolve("tools/kotlin-tests/run-tests.main.kts")
    if (!script.exists()) {
        return ProcessRun(4, "missing Kotlin test runner: $script")
    }
    val command = mutableListOf("kotlin", script.toString())
    val extraEnv = buildMap<String, String> {
        if (!filter.isNullOrBlank()) put("BC_KOTLIN_TEST_FILTER", filter)
    }
    return runProcess(command, extraEnv = extraEnv)
}

fun runPackContractValidation(): ProcessRun =
    runKotlinScript(root.resolve("tools/kotlin/validate_pack_contract.main.kts"))

fun runContractCompletenessReport(checkMode: Boolean, writeReports: Boolean): ProcessRun {
    val args = mutableListOf<String>()
    if (checkMode) args += "--check"
    if (!writeReports) args += "--no-write"
    return runKotlinScript(root.resolve("tools/kotlin/contract_completeness_report.main.kts"), args)
}

fun runKubejsAssetsValidation(): ProcessRun =
    runKotlinScript(root.resolve("tools/kotlin/validate_kubejs_assets.main.kts"))

fun runBetterGrassifyGrassBlocksValidation(): ProcessRun =
    runKotlinScript(root.resolve("tools/kotlin/validate_bettergrassify_grass_blocks.main.kts"))

fun runAutonomousContractsValidation(): ProcessRun =
    runKotlinScript(root.resolve("tools/kotlin/validate_autonomous_contracts.main.kts"))

fun runRealisticHandsValidation(): ProcessRun =
    runKotlinScript(root.resolve("tools/kotlin/validate_realistic_hands.main.kts"))

fun runDynamicTreesCoverageValidation(): ProcessRun =
    runKotlinScript(root.resolve("tools/kotlin/validate_dynamic_trees_coverage.main.kts"))

fun runCompletionistQuestGeneration(): ProcessRun =
    runKotlinScript(root.resolve("tools/kotlin/generate_completionist_quests.main.kts"))

fun runRetainedRuntimeDumpRefresh(): ProcessRun =
    runKotlinScript(root.resolve("tools/kotlin/refresh_retained_runtime_dumps.main.kts"))

fun runJsSyntaxCheck(): ProcessRun =
    runKotlinScript(root.resolve("tools/kotlin/check_js_syntax.main.kts"))

fun runJsonSurfaceCheck(): ProcessRun =
    runKotlinScript(root.resolve("tools/kotlin/check_json_surface.main.kts"))

fun runBurntCoverageTagSync(
    recommendationsPath: Path = root.resolve("generated/runtime-dumps/burnt-coverage-recommended-tags-high-confidence.json"),
    evidencePath: Path = root.resolve("generated/runtime-dumps/burnt-coverage-missing-high-confidence.tsv"),
    blockExclusionsPath: Path = root.resolve("tools/burnt_coverage_block_tag_exclusions.json"),
    writeChanges: Boolean,
): ProcessRun {
    val maintainedTagIds = listOf(
        "burnt:plants_will_burn",
        "burnt:grass_blocks",
        "burnt:fire_resistant",
        "minecraft:logs",
        "minecraft:logs_that_burn",
        "minecraft:leaves",
        "minecraft:crops",
        "minecraft:wooden_buttons",
        "minecraft:wooden_pressure_plates",
        "minecraft:wooden_doors",
        "minecraft:wooden_trapdoors",
        "minecraft:wooden_fences",
        "minecraft:fence_gates",
        "minecraft:wooden_slabs",
        "minecraft:wooden_stairs",
        "forge:mushroom_blocks",
        "minecraft:wool_carpets",
    )
    fun fail(message: String): ProcessRun = ProcessRun(1, message)
    if (!recommendationsPath.exists()) return fail("Recommendations file not found: $recommendationsPath")
    if (!evidencePath.exists()) return fail("Evidence file not found: $evidencePath")
    val recommendations = jsonObject(parseJson(Files.readString(recommendationsPath)))
    val exclusions = if (blockExclusionsPath.exists()) jsonObject(parseJson(Files.readString(blockExclusionsPath))).keys else emptySet()
    val knownBlockIds = mutableSetOf<String>()
    var jarScanFailure: String? = null
    for (modsDir in listOf(root.resolve("generated/cache/packwiz-downloads/mods"), root.resolve("mods"))) {
        if (!modsDir.exists()) continue
        Files.list(modsDir).use { entries ->
            entries.filter { Files.isRegularFile(it) && it.fileName.toString().endsWith(".jar") }.forEach { jarPath ->
                val result = runProcess(listOf("jar", "tf", jarPath.toString()), stream = false)
                if (result.exitCode != 0) {
                    jarScanFailure = "Could not list jar contents for $jarPath: ${result.output}"
                    return@forEach
                }
                result.output.lineSequence().forEach { line ->
                    val match = Regex("""^assets/([^/]+)/blockstates/(.+)\.json$""").find(line) ?: return@forEach
                    knownBlockIds += "${match.groupValues[1]}:${match.groupValues[2]}"
                }
            }
        }
        if (jarScanFailure != null) return fail(jarScanFailure!!)
    }
    val kubejsAssets = root.resolve("kubejs/assets")
    if (kubejsAssets.exists()) {
        walkFiles(kubejsAssets) { it.toString().contains("${File.separator}blockstates${File.separator}") && it.fileName.toString().endsWith(".json") }
            .forEach { file ->
                val rel = kubejsAssets.relativize(file).toString().replace(File.separatorChar, '/')
                val match = Regex("""^([^/]+)/blockstates/(.+)\.json$""").find(rel) ?: return@forEach
                knownBlockIds += "${match.groupValues[1]}:${match.groupValues[2]}"
            }
    }
    fun tagPath(tagId: String): Path {
        val parts = tagId.split(':', limit = 2)
        return root.resolve("kubejs/data/${parts[0]}/tags/blocks/${parts[1]}.json")
    }
    fun readTagValues(tagId: String): List<String> {
        val path = tagPath(tagId)
        if (!path.exists()) return emptyList()
        val parsed = jsonObject(parseJson(Files.readString(path)))
        return jsonArray(parsed["values"]).mapNotNull(::jsonString)
    }
    fun sortUnique(values: List<String>): List<String> = values.toSortedSet().toList()
    val changed = mutableListOf<String>()
    val missingRows = Files.readAllLines(evidencePath).drop(1).count { it.isNotBlank() }
    for (tagId in maintainedTagIds) {
        val currentValues = readTagValues(tagId)
        val recommendedValues = jsonArray(recommendations[tagId]).mapNotNull(::jsonString)
            .filter { value -> value.startsWith("minecraft:") || (value !in exclusions && value in knownBlockIds) }
        val merged = sortUnique(currentValues + recommendedValues)
        if (merged != currentValues) {
            changed += "$tagId\t+${merged.size - currentValues.size}\t${repoRel(tagPath(tagId))}"
            if (writeChanges) {
                tagPath(tagId).parent.createDirectories()
                Files.writeString(tagPath(tagId), toJson(linkedMapOf("replace" to false, "values" to merged)) + "\n")
            }
        }
    }
    val output = buildString {
        changed.forEach { appendLine(it) }
        appendLine("missing_rows\t$missingRows")
    }.trim()
    return ProcessRun(if (!writeChanges && changed.isNotEmpty()) 1 else 0, output)
}

fun exportCurseforgeBundle(exportsDir: Path, clientZip: Path): ProcessRun {
    exportsDir.createDirectories()
    refuseExistingReleaseArchives(clientZip)?.let { return it }
    return runProcess(
        listOf(
            "packwiz",
            "curseforge",
            "export",
            "-o",
            clientZip.toString(),
            "-s",
            "client",
            "-y",
        ),
        workDir = root,
    )
}

fun buildServerBundle(exportsDir: Path, serverTreeDir: Path, serverZip: Path, clean: Boolean): ProcessRun {
    if (clean && serverTreeDir.exists()) {
        deleteTree(serverTreeDir)
    }
    val sync = syncManaged("server", serverTreeDir, apply = true)
    if (sync.exitCode != 0) return sync
    val resolve = resolvePackwizDownloads(serverTreeDir, "server", apply = true)
    if (resolve.exitCode != 0) return resolve
    val prune = pruneRuntimeMods(serverTreeDir, "server", apply = true)
    if (prune.exitCode != 0) return prune
    val installer = findForgeInstaller()
    Files.copy(installer, serverTreeDir.resolve(installer.fileName), StandardCopyOption.REPLACE_EXISTING)
    val javaBin = requireJava17Path()
    if (!serverTreeDir.resolve("run.sh").exists() || !serverTreeDir.resolve("libraries/net/minecraftforge/forge/$forgeCoord").exists()) {
        val install = runProcess(
            listOf(javaBin, "-jar", serverTreeDir.resolve("forge-$forgeCoord-installer.jar").toString(), "--installServer"),
            extraEnv = javaTempEnvironment(serverTreeDir),
            stream = false,
            workDir = serverTreeDir,
        )
        if (install.exitCode != 0) return install
    }
    deleteTree(serverTreeDir.resolve(".java-tmp"))
    Files.deleteIfExists(serverTreeDir.resolve(installer.fileName))
    Files.deleteIfExists(serverTreeDir.resolve("forge-$forgeCoord-installer.jar.log"))
    mirrorRepoDatapacks(serverTreeDir.resolve("world"))
    deleteTree(serverTreeDir.resolve("world"))
    deleteTree(serverTreeDir.resolve("logs"))
    deleteTree(serverTreeDir.resolve("crash-reports"))
    mirrorRepoDatapacks(serverTreeDir.resolve("world"))
    Files.writeString(
        serverTreeDir.resolve("SERVER_README.txt"),
        """
Better Content complete server bundle

Minecraft: $mcVersion
Forge: $forgeVersion

Before first launch:
1. Review eula.txt and set eula=true if you accept Mojang's EULA.
2. Review server.properties. This bundle defaults to authenticated play with online-mode=true.
3. Optionally edit user_jvm_args.txt.
4. Start with: ./run.sh nogui

This bundle is generated from the repository source plus server-side packwiz downloads.
""".trimIndent() + "\n",
    )
    Files.writeString(serverTreeDir.resolve("eula.txt"), "eula=false\n")
    writeLocalServerProperties(serverTreeDir.resolve("server.properties"), defaultServerPort, onlineMode = true)
    Files.writeString(serverTreeDir.resolve("user_jvm_args.txt"), "-Xms4G\n-Xmx16G\n-XX:+UseG1GC\n-Dfile.encoding=UTF-8\n")
    serverZip.parent.createDirectories()
    Files.deleteIfExists(serverZip)
    val archive = runProcess(
        listOf(
            "zip",
            "-q",
            "-r",
            serverZip.toString(),
            serverTreeDir.fileName.toString(),
        ),
        workDir = serverTreeDir.parent,
    )
    return if (archive.exitCode == 0) ProcessRun(0, "Complete server tree exported to $serverZip") else archive
}

fun verifyReleaseBundleArchives(clientZip: Path, serverZip: Path): ProcessRun {
    val failures = mutableListOf<String>()
    fun inspect(archive: Path, requiredEntries: List<String>) {
        if (!archive.exists()) {
            failures += "missing archive: $archive"
            return
        }
        try {
            java.util.zip.ZipFile(archive.toFile()).use { zip ->
                for (entryName in requiredEntries) {
                    val entry = zip.getEntry(entryName)
                    if (entry == null || entry.isDirectory || entry.size == 0L) {
                        failures += "$archive is missing non-empty entry $entryName"
                    }
                }
            }
        } catch (error: Exception) {
            failures += "$archive is unreadable: ${error.message ?: error.javaClass.simpleName}"
        }
    }
    inspect(
        clientZip,
        listOf(
            "manifest.json",
            "overrides/options.txt",
            "overrides/config/ftbquests/quests/chapter_groups.snbt",
        ),
    )
    if (clientZip.exists() && root.resolve("options.txt").exists()) {
        try {
            java.util.zip.ZipFile(clientZip.toFile()).use { zip ->
                val entry = zip.getEntry("overrides/options.txt")
                if (entry != null) {
                    val bundled = zip.getInputStream(entry).use { it.readBytes() }
                    val source = Files.readAllBytes(root.resolve("options.txt"))
                    if (!bundled.contentEquals(source)) failures += "$clientZip does not contain the exact repo-root options.txt"
                }
            }
        } catch (error: Exception) {
            failures += "could not compare bundled options.txt: ${error.message ?: error.javaClass.simpleName}"
        }
    }
    inspect(
        serverZip,
        listOf(
            "better-content-server/SERVER_README.txt",
            "better-content-server/run.sh",
            "better-content-server/config/ftbquests/quests/chapter_groups.snbt",
        ),
    )
    return if (failures.isEmpty()) {
        ProcessRun(0, "release bundle archives verify\nclient=$clientZip\nserver=$serverZip")
    } else {
        ProcessRun(1, failures.joinToString("\n"))
    }
}

fun handleDoctor(subArgs: List<String>): CommandResult {
    if (subArgs.isEmpty() || subArgs == listOf("--help")) {
        return success("doctor", doctorHelp(), evidenceLevel = "environment")
    }
    return when (subArgs.first()) {
        "env" -> {
            val findings = mutableListOf<ValidationFinding>()
            val required = listOf("kotlin", "java", "rg")
            for (command in required) {
                if (!commandExists(command)) {
                    findings += ValidationFinding("error", "missing required command: $command")
                }
            }
            if (!detectJava17()) {
                findings += ValidationFinding("error", "java is present but Java 17 was not detected")
            }
            if (!commandExists("packwiz")) {
                findings += ValidationFinding("warning", "packwiz is missing; build bundle curseforge will not work")
            }
            val details = linkedMapOf<String, Any?>(
                "repoRoot" to root.toString(),
                "kotlin" to readCommand(listOf("kotlin", "-version")).ifBlank { null },
                "java" to findJava17Path()?.let { readCommand(listOf(it, "-version")).lineSequence().firstOrNull()?.ifBlank { null } },
                "java17" to findJava17Path(),
                "rg" to findCommandPath("rg"),
                "packwiz" to findCommandPath("packwiz"),
            )
            if (findings.any { it.severity == "error" }) {
                prereqFailure("environment check failed", findings).copy(command = "doctor env", details = details)
            } else {
                success(
                    command = "doctor env",
                    summary = "environment check passed",
                    details = details,
                    findings = findings,
                    evidenceLevel = "environment",
                )
            }
        }
        "repo" -> {
            val requiredPaths = listOf(
                "AGENTS.md",
                "kubejs",
                "config",
                "defaultconfigs",
                "datapacks",
                "docs",
                "tools/bc",
                "tools/bc.main.kts",
                "TOOL_MIGRATION_MATRIX.md",
            )
            val findings = requiredPaths.mapNotNull { rel ->
                val path = root.resolve(rel)
                if (path.exists()) null else ValidationFinding("error", "missing required repo path: $rel")
            }.toMutableList()
            val quarantineDir = toolsDir.resolve("quarantine")
            val activeLegacySources = Files.walk(toolsDir).use { stream ->
                stream
                    .filter(Files::isRegularFile)
                    .filter { !it.startsWith(quarantineDir) }
                    .filter {
                        val name = it.fileName.toString()
                        name.endsWith(".py") || name.endsWith(".sh") || name.endsWith(".mjs")
                    }
                    .count()
            }
            val quarantinedLegacySources = if (quarantineDir.exists()) {
                Files.walk(quarantineDir).use { stream ->
                    stream
                        .filter(Files::isRegularFile)
                        .filter {
                            val name = it.fileName.toString()
                            name.endsWith(".py") || name.endsWith(".sh") || name.endsWith(".mjs")
                        }
                        .count()
                }
            } else {
                0L
            }
            if (activeLegacySources > 0) {
                findings += ValidationFinding("warning", "active legacy tool source files remain under tools/: $activeLegacySources")
            }
            val details = mapOf(
                "repoRoot" to root.toString(),
                "migrationMatrix" to migrationMatrixPath.toString(),
                "activeLegacyToolSources" to activeLegacySources,
                "quarantinedLegacyToolSources" to quarantinedLegacySources,
            )
            if (findings.any { it.severity == "error" }) {
                prereqFailure("repo check failed", findings).copy(command = "doctor repo", details = details)
            } else {
                success(
                    command = "doctor repo",
                    summary = "repo check passed",
                    details = details,
                    findings = findings,
                    artifacts = listOf(ArtifactRef(migrationMatrixPath.toString())),
                    evidenceLevel = "source",
                )
            }
        }
        "runtime" -> {
            var instance: String? = null
            val rest = subArgs.drop(1)
            var index = 0
            while (index < rest.size) {
                when (rest[index]) {
                    "--instance" -> {
                        instance = rest.getOrNull(index + 1) ?: return usageError("--instance needs a path", doctorHelp())
                        index += 2
                    }
                    "--help" -> return success("doctor runtime", doctorHelp(), evidenceLevel = "environment")
                    else -> return usageError("unknown argument: ${rest[index]}", doctorHelp())
                }
            }
            if (instance.isNullOrBlank()) {
                return usageError("doctor runtime requires --instance PATH", doctorHelp())
            }
            val instancePath = root.resolve(instance).normalize().let { if (Paths.get(instance).isAbsolute) Paths.get(instance).normalize() else it }
            if (!instancePath.exists() || !instancePath.isDirectory()) {
                return prereqFailure("runtime instance does not exist: $instancePath")
                    .copy(command = "doctor runtime")
            }
            val checks = linkedMapOf(
                "modsDir" to instancePath.resolve("mods").exists(),
                "latestLog" to instancePath.resolve("logs/latest.log").exists(),
                "kubejsConfig" to instancePath.resolve("kubejs/config").exists(),
                "runSh" to instancePath.resolve("run.sh").exists(),
            )
            val findings = checks.filterValues { !it }.keys.map {
                ValidationFinding("warning", "runtime path is missing expected entry: $it")
            }
            success(
                command = "doctor runtime",
                summary = if (findings.isEmpty()) "runtime check passed" else "runtime check completed with warnings",
                details = mapOf("instance" to instancePath.toString(), "checks" to checks),
                findings = findings,
                artifacts = listOf(ArtifactRef(instancePath.toString(), "directory")),
                evidenceLevel = "runtime-inspection",
            )
        }
        else -> usageError("unknown doctor command: ${subArgs.first()}", doctorHelp())
    }
}

fun handleInternal(subArgs: List<String>): CommandResult {
    if (subArgs.isEmpty() || subArgs == listOf("--help")) return success("internal", internalHelp(), evidenceLevel = "source")
    return when (subArgs.first()) {
        "resolve-packwiz-downloads" -> {
            var targetDir: String? = null
            var cacheDir: String? = null
            var side = "both"
            var apply = false
            var index = 1
            while (index < subArgs.size) {
                when (subArgs[index]) {
                    "--target-dir" -> { targetDir = subArgs.getOrNull(index + 1) ?: return usageError("--target-dir is required", internalHelp()); index += 2 }
                    "--cache-dir" -> { cacheDir = subArgs.getOrNull(index + 1) ?: return usageError("--cache-dir needs a path", internalHelp()); index += 2 }
                    "--side" -> { side = subArgs.getOrNull(index + 1) ?: return usageError("--side needs server, client, or both", internalHelp()); index += 2 }
                    "--apply" -> { apply = true; index += 1 }
                    "--dry-run" -> { apply = false; index += 1 }
                    else -> return usageError("unknown argument: ${subArgs[index]}", internalHelp())
                }
            }
            val run = resolvePackwizDownloads(resolveUserPath(targetDir ?: return usageError("--target-dir is required", internalHelp())), side, apply, cacheDir?.let(::resolveUserPath) ?: root.resolve("generated/cache/packwiz-downloads"))
            CommandResult("internal resolve-packwiz-downloads", if (run.exitCode == 0) "success" else "failure", run.output, exitCode = if (run.exitCode == 2) 2 else if (run.exitCode == 0) 0 else 1)
        }
        "prune-runtime-mods" -> {
            var targetDir: String? = null
            var side = "server"
            var apply = false
            var index = 1
            while (index < subArgs.size) {
                when (subArgs[index]) {
                    "--target-dir" -> { targetDir = subArgs.getOrNull(index + 1) ?: return usageError("--target-dir is required", internalHelp()); index += 2 }
                    "--side" -> { side = subArgs.getOrNull(index + 1) ?: return usageError("--side needs server or client", internalHelp()); index += 2 }
                    "--apply" -> { apply = true; index += 1 }
                    "--dry-run" -> { apply = false; index += 1 }
                    else -> return usageError("unknown argument: ${subArgs[index]}", internalHelp())
                }
            }
            val run = pruneRuntimeMods(resolveUserPath(targetDir ?: return usageError("--target-dir is required", internalHelp())), side, apply)
            CommandResult("internal prune-runtime-mods", if (run.exitCode == 0) "success" else "failure", run.output, exitCode = if (run.exitCode == 2) 2 else if (run.exitCode == 0) 0 else 1)
        }
        "log-hard-failure-scan" -> {
            var log: String? = null
            var instance: String? = null
            var index = 1
            while (index < subArgs.size) {
                when (subArgs[index]) {
                    "--log" -> { log = subArgs.getOrNull(index + 1) ?: return usageError("--log needs a path", internalHelp()); index += 2 }
                    "--instance" -> { instance = subArgs.getOrNull(index + 1) ?: return usageError("--instance needs a path", internalHelp()); index += 2 }
                    else -> return usageError("unknown argument: ${subArgs[index]}", internalHelp())
                }
            }
            val scan = scanHardFailures(log?.let(::resolveUserPath), instance?.let(::resolveUserPath))
            val output = if (scan.ok) {
                "ok - hard log failure scan (${scan.logPath})\nok - KubeJS recipe parse health (${scan.parseErrorCount} parse errors, ${scan.failedRecipeCount} failed recipes)"
            } else buildString {
                appendLine("FAIL - hard log failure scan (${scan.logPath ?: "UNKNOWN"})")
                for (finding in scan.findings) {
                    appendLine("FAIL - ${finding.label}: ${finding.count}")
                    for (match in finding.matches) {
                        val prefix = if (match.lineNumber > 0) "${match.lineNumber}:" else ""
                        appendLine("  $prefix${match.line}")
                    }
                }
            }.trim()
            CommandResult("internal log-hard-failure-scan", if (scan.ok) "success" else "failure", output, exitCode = if (scan.ok) 0 else 1)
        }
        "prepare-client-runtime" -> {
            var clientDir: String? = null
            var index = 1
            while (index < subArgs.size) {
                when (subArgs[index]) {
                    "--client-dir" -> { clientDir = subArgs.getOrNull(index + 1) ?: return usageError("--client-dir is required", internalHelp()); index += 2 }
                    else -> return usageError("unknown argument: ${subArgs[index]}", internalHelp())
                }
            }
            val path = resolveUserPath(clientDir ?: return usageError("--client-dir is required", internalHelp()))
            val run = bootstrapClientRuntime(path)
            CommandResult("internal prepare-client-runtime", if (run.exitCode == 0) "success" else "failure", run.output, artifacts = listOf(ArtifactRef(path.toString(), "directory")), exitCode = if (run.exitCode == 0) 0 else 1, mutated = true)
        }
        "minecraft-client-argfile" -> {
            var clientDir: String? = null
            var versionId: String? = null
            var username = "AgentClient"
            var server = ""
            var out: String? = null
            var index = 1
            while (index < subArgs.size) {
                when (subArgs[index]) {
                    "--client-dir" -> { clientDir = subArgs.getOrNull(index + 1) ?: return usageError("--client-dir is required", internalHelp()); index += 2 }
                    "--version-id" -> { versionId = subArgs.getOrNull(index + 1) ?: return usageError("--version-id is required", internalHelp()); index += 2 }
                    "--username" -> { username = subArgs.getOrNull(index + 1) ?: return usageError("--username needs a value", internalHelp()); index += 2 }
                    "--server" -> { server = subArgs.getOrNull(index + 1) ?: return usageError("--server needs HOST:PORT", internalHelp()); index += 2 }
                    "--out" -> { out = subArgs.getOrNull(index + 1) ?: return usageError("--out is required", internalHelp()); index += 2 }
                    else -> return usageError("unknown argument: ${subArgs[index]}", internalHelp())
                }
            }
            val run = generateMinecraftClientArgfile(resolveUserPath(clientDir ?: return usageError("--client-dir is required", internalHelp())), versionId ?: return usageError("--version-id is required", internalHelp()), username, server, resolveUserPath(out ?: return usageError("--out is required", internalHelp())))
            CommandResult("internal minecraft-client-argfile", if (run.exitCode == 0) "success" else "failure", run.output, exitCode = if (run.exitCode == 0) 0 else 1)
        }
        "sync-burnt-coverage-tags" -> {
            var recommendations = root.resolve("generated/runtime-dumps/burnt-coverage-recommended-tags-high-confidence.json")
            var evidence = root.resolve("generated/runtime-dumps/burnt-coverage-missing-high-confidence.tsv")
            var exclusions = root.resolve("tools/burnt_coverage_block_tag_exclusions.json")
            var writeChanges = true
            var index = 1
            while (index < subArgs.size) {
                when (subArgs[index]) {
                    "--recommendations" -> { recommendations = resolveUserPath(subArgs.getOrNull(index + 1) ?: return usageError("--recommendations needs a path", internalHelp())); index += 2 }
                    "--evidence" -> { evidence = resolveUserPath(subArgs.getOrNull(index + 1) ?: return usageError("--evidence needs a path", internalHelp())); index += 2 }
                    "--block-exclusions" -> { exclusions = resolveUserPath(subArgs.getOrNull(index + 1) ?: return usageError("--block-exclusions needs a path", internalHelp())); index += 2 }
                    "--check" -> { writeChanges = false; index += 1 }
                    else -> return usageError("unknown argument: ${subArgs[index]}", internalHelp())
                }
            }
            val run = runBurntCoverageTagSync(recommendations, evidence, exclusions, writeChanges)
            CommandResult("internal sync-burnt-coverage-tags", if (run.exitCode == 0) "success" else "failure", run.output, exitCode = if (run.exitCode == 0) 0 else 1)
        }
        "generate-completionist-quests" -> {
            val run = runCompletionistQuestGeneration()
            CommandResult("internal generate-completionist-quests", if (run.exitCode == 0) "success" else "failure", run.output, exitCode = if (run.exitCode == 0) 0 else 1, mutated = run.exitCode == 0, evidenceLevel = "source")
        }
        "audit-ftbq-layout" -> {
            val run = runKotlinScript(root.resolve("tools/kotlin/audit_ftbq_layout.main.kts"), subArgs.drop(1))
            CommandResult("internal audit-ftbq-layout", if (run.exitCode == 0) "success" else "failure", run.output, exitCode = if (run.exitCode == 0) 0 else 1)
        }
        "check-js-syntax" -> {
            val run = runJsSyntaxCheck()
            CommandResult("internal check-js-syntax", if (run.exitCode == 0) "success" else "failure", run.output, exitCode = if (run.exitCode == 0) 0 else 1)
        }
        "check-json-surface" -> {
            val run = runJsonSurfaceCheck()
            CommandResult("internal check-json-surface", if (run.exitCode == 0) "success" else "failure", run.output, exitCode = if (run.exitCode == 0) 0 else 1)
        }
        "validate-bettergrassify-grass-blocks" -> {
            val run = runBetterGrassifyGrassBlocksValidation()
            CommandResult("internal validate-bettergrassify-grass-blocks", if (run.exitCode == 0) "success" else "failure", run.output, exitCode = if (run.exitCode == 0) 0 else 1)
        }
        "validate-pack-contract" -> {
            val run = runPackContractValidation()
            CommandResult("internal validate-pack-contract", if (run.exitCode == 0) "success" else "failure", run.output, exitCode = if (run.exitCode == 0) 0 else 1)
        }
        "contract-completeness-report" -> {
            var checkMode = false
            var writeReports = true
            var index = 1
            while (index < subArgs.size) {
                when (subArgs[index]) {
                    "--check" -> { checkMode = true; index += 1 }
                    "--no-write" -> { writeReports = false; index += 1 }
                    else -> return usageError("unknown argument: ${subArgs[index]}", internalHelp())
                }
            }
            val run = runContractCompletenessReport(checkMode, writeReports)
            CommandResult("internal contract-completeness-report", if (run.exitCode == 0) "success" else "failure", run.output, exitCode = if (run.exitCode == 0) 0 else 1)
        }
        "validate-kubejs-assets" -> {
            val run = runKubejsAssetsValidation()
            CommandResult("internal validate-kubejs-assets", if (run.exitCode == 0) "success" else "failure", run.output, exitCode = if (run.exitCode == 0) 0 else 1)
        }
        "validate-autonomous-contracts" -> {
            val run = runAutonomousContractsValidation()
            CommandResult("internal validate-autonomous-contracts", if (run.exitCode == 0) "success" else "failure", run.output, exitCode = if (run.exitCode == 0) 0 else 1)
        }
        "validate-realistic-hands" -> {
            val run = runRealisticHandsValidation()
            CommandResult("internal validate-realistic-hands", if (run.exitCode == 0) "success" else "failure", run.output, exitCode = if (run.exitCode == 0) 0 else 1)
        }
        "validate-dynamic-trees-coverage" -> {
            val run = runDynamicTreesCoverageValidation()
            CommandResult("internal validate-dynamic-trees-coverage", if (run.exitCode == 0) "success" else "failure", run.output, exitCode = if (run.exitCode == 0) 0 else 1)
        }
        "validate-chemistry-identity" -> {
            val run = runChemistryIdentityValidation()
            CommandResult("internal validate-chemistry-identity", if (run.exitCode == 0) "success" else "failure", run.output, exitCode = if (run.exitCode == 0) 0 else 1)
        }
        "validate-synthesis-pipeline" -> {
            val run = runSynthesisPipelineValidation()
            CommandResult("internal validate-synthesis-pipeline", if (run.exitCode == 0) "success" else "failure", run.output, exitCode = if (run.exitCode == 0) 0 else 1)
        }
        "validate-player-progression-contracts" -> {
            val run = runPlayerProgressionContractsValidation()
            CommandResult("internal validate-player-progression-contracts", if (run.exitCode == 0) "success" else "failure", run.output, exitCode = if (run.exitCode == 0) 0 else 1)
        }
        "validate-progression-reachability" -> {
            val run = runProgressionReachabilityValidation()
            CommandResult("internal validate-progression-reachability", if (run.exitCode == 0) "success" else "failure", run.output, exitCode = if (run.exitCode == 0) 0 else 1)
        }
        "validate-burnt-coverage" -> {
            val run = runBurntCoverageValidation()
            CommandResult("internal validate-burnt-coverage", if (run.exitCode == 0) "success" else "failure", run.output, exitCode = if (run.exitCode == 0) 0 else 1)
        }
        "validate-lc-tfth-dh-contracts" -> {
            val run = runLcTfthDhContractsValidation()
            CommandResult("internal validate-lc-tfth-dh-contracts", if (run.exitCode == 0) "success" else "failure", run.output, exitCode = if (run.exitCode == 0) 0 else 1)
        }
        "validate-kotlin-tool-surface" -> {
            val run = runKotlinScript(root.resolve("tools/kotlin/validate_kotlin_tool_surface.main.kts"))
            CommandResult("internal validate-kotlin-tool-surface", if (run.exitCode == 0) "success" else "failure", run.output, exitCode = if (run.exitCode == 0) 0 else 1)
        }
        "validate-tool-doc-surface" -> {
            val run = runToolDocSurfaceValidation()
            CommandResult("internal validate-tool-doc-surface", if (run.exitCode == 0) "success" else "failure", run.output, exitCode = if (run.exitCode == 0) 0 else 1)
        }
        "verify-pack-fast" -> {
            val run = runPackFastLane()
            CommandResult("internal verify-pack-fast", if (run.exitCode == 0) "success" else "failure", run.output, exitCode = if (run.exitCode == 0) 0 else if (run.exitCode == 3) 3 else 1)
        }
        else -> usageError("unknown internal command: ${subArgs.first()}", internalHelp())
    }
}

fun runWorkspaceVerification(mode: String, rawArgs: List<String>): CommandResult {
    val filters = mutableListOf<String>()
    var listOnly = false
    var index = 0
    while (index < rawArgs.size) {
        when (rawArgs[index]) {
            "--repo" -> {
                val raw = rawArgs.getOrNull(index + 1) ?: return usageError("--repo needs an ID or path", testHelp())
                filters += raw.split(',').map(String::trim).filter(String::isNotBlank)
                index += 2
            }
            "--list-repos" -> {
                listOnly = true
                index += 1
            }
            "--help" -> return success("test $mode", testHelp(), evidenceLevel = "source")
            else -> return usageError("unknown argument for test $mode: ${rawArgs[index]}", testHelp())
        }
    }
    val (selectedRepos, unmatched) = selectWorkspaceRepos(mode, filters)
    if (unmatched.isNotEmpty()) {
        return usageError("unknown repo filter(s): ${unmatched.joinToString(", ")}", testHelp())
    }
    if (selectedRepos.isEmpty()) {
        return usageError("no workspace repos selected for test $mode", testHelp())
    }
    if (listOnly) {
        return success(
            command = "test $mode",
            summary = formatWorkspaceRepoList(mode, selectedRepos).trim(),
            details = mapOf(
                "mode" to mode,
                "filters" to filters,
                "repos" to selectedRepos.map { mapOf("id" to it.id, "path" to it.path, "kind" to it.kind, "command" to it.command) },
            ),
            artifacts = listOf(ArtifactRef(workspaceInventoryPath.toString())),
            evidenceLevel = "source",
        )
    }

    val scope = if (filters.isEmpty()) "all" else filters.sorted().joinToString(",")
    val (harness, conflict) = startHarnessRun(
        HarnessSpec(
            keySeed = "test-$mode:$scope",
            runKind = "test $mode",
            command = "test $mode",
            repoOrScenario = "workspace",
            workDirOrRunRoot = root.toString(),
        ),
    )
    if (conflict != null) {
        return CommandResult(
            command = "test $mode",
            status = "failure",
            summary = conflict.message,
            findings = listOf(ValidationFinding("error", conflict.message)),
            details = conflict.details,
            artifacts = listOf(ArtifactRef(workspaceInventoryPath.toString()), ArtifactRef(resolveHarnessPaths("test-$mode:$scope").status.toString())),
            exitCode = 1,
            evidenceLevel = "source",
        )
    }
    harness!!
    harness.announce()

    val repoRuns = mutableListOf<Map<String, Any?>>()
    val stubMode = System.getenv("BC_TEST_WORKSPACE_STUB_MODE")
    val stubSleepMs = System.getenv("BC_TEST_WORKSPACE_STUB_SLEEP_MS")?.toLongOrNull() ?: 0L
    try {
        for ((repoIndex, repo) in selectedRepos.withIndex()) {
            val command = repo.command
            val workDir = if (repo.path == ".") root else root.resolve(repo.path)
            harness.updateStatus(
                status = "running",
                phase = "repo",
                extra = mapOf(
                    "current_repo" to repo.id,
                    "current_command" to command.joinToString(" "),
                    "repo_index" to repoIndex + 1,
                    "repo_total" to selectedRepos.size,
                ),
            )
            if (!jsonOutput && !quiet) println("==> [${repoIndex + 1}/${selectedRepos.size}] ${repo.id}")
            if (!workDir.exists() || !workDir.isDirectory()) {
                harness.finalizeState(
                    "failed",
                    lastError = "workspace repo path missing for ${repo.id}",
                    summaryExtra = mapOf("failed_repo" to repo.id, "repo_runs" to repoRuns),
                )
                return CommandResult(
                    command = "test $mode",
                    status = "failure",
                    summary = "workspace repo path missing for ${repo.id}",
                    findings = listOf(ValidationFinding("error", "workspace repo path missing for ${repo.id}: ${repo.path}")),
                    details = mapOf("mode" to mode, "repo" to repo.id, "path" to repo.path),
                    artifacts = listOf(ArtifactRef(workspaceInventoryPath.toString()), ArtifactRef(harness.paths.status.toString()), ArtifactRef(harness.paths.summary.toString())),
                    exitCode = 1,
                    evidenceLevel = "source",
                )
            }
            val run = when {
                stubMode == "pass" || stubMode == "fail" -> {
                    if (stubSleepMs > 0) Thread.sleep(stubSleepMs)
                    val exit = if (stubMode == "fail" && repoIndex == selectedRepos.lastIndex) 1 else 0
                    ProcessRun(exit, "stubbed $mode for ${repo.id}")
                }
                else -> runProcess(command, stream = false, workDir = workDir)
            }
            val repoEntry = mapOf(
                "id" to repo.id,
                "path" to repo.path,
                "command" to command,
                "exitCode" to run.exitCode,
                "outputSnippet" to outputSnippet(run.output),
            )
            repoRuns += repoEntry
            writeJsonFile(
                harness.paths.summary,
                mapOf(
                    "status" to "running",
                    "command" to "test $mode",
                    "repo_or_scenario" to "workspace",
                    "work_dir_or_run_root" to root.toString(),
                    "requested_port" to null,
                    "actual_port" to null,
                    "repo_runs" to repoRuns,
                    "current_repo" to repo.id,
                    "repo_index" to repoIndex + 1,
                    "repo_total" to selectedRepos.size,
                    "updated_at" to isoTimestamp(),
                ),
            )
            if (run.exitCode == 0) {
                if (!jsonOutput && !quiet) println("PASS ${repo.id}")
            } else {
                if (!jsonOutput && !quiet) println("FAIL ${repo.id}")
                harness.finalizeState(
                    "failed",
                    lastError = "${repo.id} ${mode} lane failed with exit ${run.exitCode}",
                    summaryExtra = mapOf("failed_repo" to repo.id, "repo_runs" to repoRuns),
                    preserveSummary = true,
                )
                return CommandResult(
                    command = "test $mode",
                    status = "failure",
                    summary = "workspace $mode failed in ${repo.id}",
                    findings = listOf(ValidationFinding("error", "${repo.id} ${mode} lane failed with exit ${run.exitCode}")),
                    details = mapOf("mode" to mode, "failedRepo" to repo.id, "repoRuns" to repoRuns),
                    artifacts = listOf(ArtifactRef(workspaceInventoryPath.toString()), ArtifactRef(harness.paths.status.toString()), ArtifactRef(harness.paths.summary.toString())),
                    exitCode = classifyBuildExit(run.exitCode, run.output),
                    evidenceLevel = "source",
                )
            }
        }
        harness.finalizeState("passed", summaryExtra = mapOf("repo_runs" to repoRuns), preserveSummary = true)
    } catch (error: Throwable) {
        harness.finalizeState("failed", lastError = error.message ?: error::class.java.simpleName, summaryExtra = mapOf("repo_runs" to repoRuns), preserveSummary = true)
        throw error
    }
    return success(
        command = "test $mode",
        summary = "workspace $mode passed for ${selectedRepos.size} repo(s)",
        details = mapOf("mode" to mode, "repoRuns" to repoRuns),
        artifacts = listOf(ArtifactRef(workspaceInventoryPath.toString()), ArtifactRef(harness.paths.status.toString()), ArtifactRef(harness.paths.summary.toString())),
        evidenceLevel = "source",
    )
}

fun runFullCommand(rawArgs: List<String>): CommandResult {
    if (rawArgs.isEmpty()) {
        val keySeed = "test-full:pack"
        val (harness, conflict) = startHarnessRun(
            HarnessSpec(
                keySeed = keySeed,
                runKind = "test full",
                command = "test full",
                repoOrScenario = "pack",
                workDirOrRunRoot = root.toString(),
            ),
        )
        if (conflict != null) {
            return CommandResult(
                command = "test full",
                status = "failure",
                summary = conflict.message,
                findings = listOf(ValidationFinding("error", conflict.message)),
                details = conflict.details,
                artifacts = listOf(ArtifactRef(resolveHarnessPaths(keySeed).status.toString())),
                exitCode = 1,
                evidenceLevel = "scenario-runtime",
            )
        }
        harness!!
        harness.announce()
        harness.updateStatus(status = "running", phase = "pack-full")
        val run = try {
            runPackFullLane()
        } catch (error: Throwable) {
            harness.finalizeState("failed", lastError = error.message ?: error::class.java.simpleName, preserveSummary = true)
            throw error
        }
        return if (run.exitCode == 0) {
            harness.finalizeState("passed", preserveSummary = true)
            success(
                command = "test full",
                summary = "pack full passed",
                artifacts = listOf(ArtifactRef(harness.paths.status.toString()), ArtifactRef(harness.paths.summary.toString())),
                evidenceLevel = "scenario-runtime",
            )
        } else {
            val mappedExit = classifyBuildExit(run.exitCode, run.output)
            harness.finalizeState("failed", lastError = "pack full lane failed with exit $mappedExit", summaryExtra = listOfNotNull(outputSnippet(run.output)?.let { "capturedOutput" to it }).toMap(), preserveSummary = true)
            CommandResult(
                command = "test full",
                status = "failure",
                summary = "pack full failed",
                findings = listOf(ValidationFinding("error", "pack full lane failed with exit ${run.exitCode}")),
                details = listOfNotNull(outputSnippet(run.output)?.let { "capturedOutput" to it }).toMap(),
                artifacts = listOf(ArtifactRef(harness.paths.status.toString()), ArtifactRef(harness.paths.summary.toString())),
                exitCode = mappedExit,
                evidenceLevel = "scenario-runtime",
            )
        }
    }

    if (rawArgs == listOf("--help")) {
        return success("test full", testHelp(), evidenceLevel = "source")
    }

    if ("--workspace" !in rawArgs) {
        val invalidArgs = rawArgs.joinToString(" ")
        return usageError(
            "test full workspace selection requires --workspace before repo filters or listing: $invalidArgs",
            testHelp(),
        )
    }

    val workspaceArgs = rawArgs.filterNot { it == "--workspace" }
    return runWorkspaceVerification("full", workspaceArgs)
}

fun argValue(args: List<String>, flag: String): String? {
    val index = args.indexOf(flag)
    return if (index >= 0) args.getOrNull(index + 1) else null
}

fun replaceFlagValue(args: List<String>, flag: String, value: String): List<String> {
    val output = mutableListOf<String>()
    var index = 0
    var replaced = false
    while (index < args.size) {
        if (args[index] == flag) {
            output += flag
            output += value
            index += 2
            replaced = true
        } else {
            output += args[index]
            index += 1
        }
    }
    if (!replaced) {
        output += flag
        output += value
    }
    return output
}

fun scenarioDefaultRunRoot(name: String, args: List<String>): Path {
    val explicit = argValue(args, "--run-root")
    if (explicit != null) return resolveUserPath(explicit)
    return when (name) {
        "opening_progression" -> cachePath("opening-progression")
        "progression_milestones" -> cachePath("progression-milestones")
        "worldgen_sampling" -> cachePath("dimension-worldgen")
        "pillager_campaigns" -> cachePath("pillager-campaigns")
        else -> cachePath("scenario-$name")
    }.toAbsolutePath().normalize()
}

fun scenarioRequestedPort(name: String, args: List<String>): Int? =
    argValue(args, "--port")?.toIntOrNull() ?: when (name) {
        "pillager_campaigns" -> null
        else -> defaultServerPort
    }

fun handleSingleWorldSmoke(rawArgs: List<String>): CommandResult {
    val missing = ensureCommands("java", "Xvfb")
    if (missing.isNotEmpty()) return prereqFailure("single-world smoke prerequisites missing", missing)
    var runRoot = cachePath("smoke").toString()
    var requestedPort = defaultServerPort
    var bootstrapMode = "always"
    var idleSeconds = 30
    var index = 0
    while (index < rawArgs.size) {
        when (rawArgs[index]) {
            "--run-root" -> { runRoot = rawArgs.getOrNull(index + 1) ?: return usageError("--run-root needs a path", testHelp()); index += 2 }
            "--port" -> { requestedPort = rawArgs.getOrNull(index + 1)?.toIntOrNull() ?: return usageError("--port needs a number", testHelp()); if (requestedPort !in 1..65535) return usageError("invalid --port: $requestedPort", testHelp()); index += 2 }
            "--bootstrap-mode" -> { bootstrapMode = rawArgs.getOrNull(index + 1) ?: return usageError("--bootstrap-mode needs always, once, or never", testHelp()); if (bootstrapMode !in setOf("always", "once", "never")) return usageError("invalid bootstrap mode: $bootstrapMode", testHelp()); index += 2 }
            "--idle-seconds" -> { idleSeconds = rawArgs.getOrNull(index + 1)?.toIntOrNull() ?: return usageError("--idle-seconds needs a number", testHelp()); if (idleSeconds !in 0..300) return usageError("--idle-seconds must be between 0 and 300", testHelp()); index += 2 }
            "--help" -> return success("test smoke", testHelp(), evidenceLevel = "fresh-runtime")
            else -> return usageError("unknown argument: ${rawArgs[index]}", testHelp())
        }
    }
    val rootPath = resolveUserPath(runRoot)
    val reserved = reserveAvailablePort(requestedPort) ?: return CommandResult("test smoke", "failure", "no free port found in $requestedPort..${requestedPort + 50}", exitCode = 1, evidenceLevel = "fresh-runtime")
    val (harness, conflict) = startHarnessRun(HarnessSpec(
        keySeed = "test-smoke:${rootPath.toAbsolutePath().normalize()}", runKind = "test smoke", command = "test smoke", repoOrScenario = "single-world-smoke", workDirOrRunRoot = rootPath.toString(), requestedPort = requestedPort, actualPort = reserved.port, reservedPortPath = reserved.path,
    ))
    if (conflict != null) {
        releasePortReservation(reserved.path)
        return CommandResult("test smoke", "failure", conflict.message, findings = listOf(ValidationFinding("error", conflict.message)), details = conflict.details, exitCode = 1, evidenceLevel = "fresh-runtime")
    }
    harness!!
    harness.announce(remapped = reserved.port != requestedPort)
    val run = try { runSingleWorldSmoke(rootPath, reserved.port, bootstrapMode, idleSeconds, harness) } catch (error: Throwable) { ProcessRun(1, error.message ?: error::class.java.simpleName) }
    val artifacts = listOf(ArtifactRef(rootPath.toString(), "directory"), ArtifactRef(harness.paths.status.toString()), ArtifactRef(harness.paths.summary.toString()))
    return if (run.exitCode == 0) {
        harness.finalizeState("passed", preserveSummary = true)
        success("test smoke", "single-world server/client smoke passed", artifacts = artifacts, details = mapOf("runRoot" to rootPath.toString(), "requestedPort" to requestedPort, "actualPort" to reserved.port, "bootstrapMode" to bootstrapMode, "idleSeconds" to idleSeconds), mutated = true, evidenceLevel = "fresh-runtime")
    } else {
        harness.finalizeState("failed", lastError = run.output, preserveSummary = true)
        CommandResult("test smoke", "failure", "test smoke failed", findings = listOf(ValidationFinding("error", run.output.ifBlank { "single-world smoke failed" })), artifacts = artifacts, details = mapOf("runRoot" to rootPath.toString(), "requestedPort" to requestedPort, "actualPort" to reserved.port, "bootstrapMode" to bootstrapMode, "idleSeconds" to idleSeconds), exitCode = if (run.exitCode == 2) 2 else 1, mutated = true, evidenceLevel = "fresh-runtime")
    }
}

fun handleTest(subArgs: List<String>): CommandResult {
    if (subArgs.isEmpty() || subArgs == listOf("--help")) {
        return success("test", testHelp(), evidenceLevel = "source")
    }
    if (subArgs.first() !in setOf("fast", "static", "kotlin", "smoke")) {
        return usageError("unknown test command: ${subArgs.first()}", testHelp())
    }
    if (subArgs.first() == "smoke") return handleSingleWorldSmoke(subArgs.drop(1))
    return when (subArgs.first()) {
        "fast" -> runWorkspaceVerification("fast", subArgs.drop(1))
        "full" -> runFullCommand(subArgs.drop(1))
        "static" -> {
            val missing = ensureCommands("kotlin")
            if (missing.isNotEmpty()) return prereqFailure("static validation prerequisites missing", missing)
            val run = runStaticValidation()
            val exitCode = if (run.exitCode == 0) 0 else if (run.exitCode == 2) 2 else 1
            if (exitCode == 0) success(
                command = "test static",
                summary = "static validation passed",
                artifacts = listOf(
                    ArtifactRef(root.resolve("generated/validation/automated_test_summary.json").toString()),
                    ArtifactRef(root.resolve("generated/validation/automated_test_report.md").toString()),
                ),
                evidenceLevel = "source",
            ) else CommandResult(
                command = "test static",
                status = "failure",
                summary = "test static failed with exit $exitCode",
                findings = listOf(ValidationFinding("error", "test static failed with exit $exitCode")),
                details = listOfNotNull(outputSnippet(run.output)?.let { "capturedOutput" to it }).toMap(),
                exitCode = exitCode,
                evidenceLevel = "source",
            )
        }
        "runtime" -> {
            val missing = ensureCommands("kotlin")
            if (missing.isNotEmpty()) return prereqFailure("runtime validation prerequisites missing", missing)
            var instance: String? = null
            var strict = false
            val rest = subArgs.drop(1)
            var index = 0
            while (index < rest.size) {
                when (rest[index]) {
                    "--instance" -> {
                        instance = rest.getOrNull(index + 1) ?: return usageError("--instance needs a path", testHelp())
                        index += 2
                    }
                    "--strict-data-dumps" -> {
                        strict = true
                        index += 1
                    }
                    "--help" -> return success("test runtime", testHelp(), evidenceLevel = "runtime")
                    else -> return usageError("unknown argument: ${rest[index]}", testHelp())
                }
            }
            if (instance.isNullOrBlank()) {
                return usageError("test runtime requires --instance PATH", testHelp())
            }
            val instancePath = resolveUserPath(instance!!)
            if (!instancePath.exists() || !instancePath.isDirectory()) return usageError("runtime instance does not exist: $instancePath", testHelp())
            val run = runPackSuite(instancePath, strict)
            val exitCode = if (run.exitCode == 0) 0 else if (run.exitCode == 2) 2 else 1
            if (exitCode == 0) success(
                command = "test runtime",
                summary = "runtime validation passed",
                artifacts = listOf(
                    ArtifactRef(root.resolve("generated/validation/automated_test_summary.json").toString()),
                    ArtifactRef(root.resolve("generated/validation/automated_test_report.md").toString()),
                ),
                details = mapOf("instance" to instancePath.toString(), "strictDataDumps" to strict),
                evidenceLevel = "strict-runtime",
            ) else CommandResult(
                command = "test runtime",
                status = "failure",
                summary = "test runtime failed with exit $exitCode",
                findings = listOf(ValidationFinding("error", "test runtime failed with exit $exitCode")),
                details = mapOf("instance" to instancePath.toString(), "strictDataDumps" to strict) + listOfNotNull(outputSnippet(run.output)?.let { "capturedOutput" to it }).toMap(),
                exitCode = exitCode,
                evidenceLevel = "strict-runtime",
            )
        }
        "unearthed-replacement" -> {
            var instance: Path? = null
            var world: Path? = null
            var output: Path? = null
            val rest = subArgs.drop(1)
            var index = 0
            while (index < rest.size) {
                when (rest[index]) {
                    "--instance" -> {
                        instance = resolveUserPath(rest.getOrNull(index + 1) ?: return usageError("--instance needs a path", testHelp()))
                        index += 2
                    }
                    "--world" -> {
                        world = resolveUserPath(rest.getOrNull(index + 1) ?: return usageError("--world needs a path", testHelp()))
                        index += 2
                    }
                    "--output" -> {
                        output = resolveUserPath(rest.getOrNull(index + 1) ?: return usageError("--output needs a path", testHelp()))
                        index += 2
                    }
                    "--help" -> return success("test unearthed-replacement", testHelp(), evidenceLevel = "runtime")
                    else -> return usageError("unknown argument: ${rest[index]}", testHelp())
                }
            }
            if (instance == null && world == null) {
                return usageError("test unearthed-replacement requires --instance PATH or --world PATH", testHelp())
            }
            if (instance != null && (!instance!!.exists() || !instance!!.isDirectory())) {
                return usageError("runtime instance does not exist: $instance", testHelp())
            }
            if (world != null && (!world!!.exists() || !world!!.isDirectory())) {
                return usageError("world does not exist: $world", testHelp())
            }
            val outputPath = output ?: (instance ?: world!!).resolve("validation-evidence/unearthed-replacement-audit.json")
            val run = runUnearthedReplacementAudit(instance, world, outputPath)
            if (run.exitCode == 0) success(
                command = "test unearthed-replacement",
                summary = "Unearthed underground and aboveground replacement audit passed",
                artifacts = listOf(ArtifactRef(outputPath.toString())),
                details = mapOf("instance" to instance?.toString(), "world" to world?.toString()),
                evidenceLevel = "runtime",
            ) else CommandResult(
                command = "test unearthed-replacement",
                status = "failure",
                summary = "Unearthed replacement audit failed",
                findings = listOf(ValidationFinding("error", "Unearthed underground or aboveground replacement regressed")),
                details = mapOf("instance" to instance?.toString(), "world" to world?.toString()) + listOfNotNull(outputSnippet(run.output)?.let { "capturedOutput" to it }).toMap(),
                artifacts = listOf(ArtifactRef(outputPath.toString())),
                exitCode = 1,
                evidenceLevel = "runtime",
            )
        }
        "smoke" -> {
            val missing = ensureCommands("kotlin", "java")
            if (missing.isNotEmpty()) return prereqFailure("smoke validation prerequisites missing", missing)
            var serverDir = cachePath("agent-validate-smoke").toString()
            var port = "25565"
            var reset = false
            var bootstrapMode = "always"
            val rest = subArgs.drop(1)
            var index = 0
            while (index < rest.size) {
                when (rest[index]) {
                    "--server-dir" -> {
                        serverDir = rest.getOrNull(index + 1) ?: return usageError("--server-dir needs a path", testHelp())
                        index += 2
                    }
                    "--port" -> {
                        port = rest.getOrNull(index + 1) ?: return usageError("--port needs a number", testHelp())
                        if (!port.all(Char::isDigit)) return usageError("--port needs a number", testHelp())
                        index += 2
                    }
                    "--reset-runtime" -> {
                        reset = true
                        index += 1
                    }
                    "--bootstrap-mode" -> {
                        bootstrapMode = rest.getOrNull(index + 1) ?: return usageError("--bootstrap-mode needs always, once, or never", testHelp())
                        if (bootstrapMode !in setOf("always", "once", "never")) return usageError("invalid bootstrap mode: $bootstrapMode", testHelp())
                        index += 2
                    }
                    "--help" -> return success("test smoke", testHelp(), evidenceLevel = "fresh-runtime")
                    else -> return usageError("unknown argument: ${rest[index]}", testHelp())
                }
            }
            val serverPath = resolveUserPath(serverDir)
            val requestedPort = port.toInt()
            val inheritedPort = System.getenv("BC_HARNESS_ALLOW_PORT")?.toIntOrNull()
            val reservedPort = (if (inheritedPort == requestedPort) ReservedPort(requestedPort, null) else reserveAvailablePort(requestedPort))
                ?: return CommandResult(
                    command = "test smoke",
                    status = "failure",
                    summary = "no free port found in ${requestedPort}..${requestedPort + 50}",
                    findings = listOf(ValidationFinding("error", "no free port found in ${requestedPort}..${requestedPort + 50}")),
                    details = mapOf("serverDir" to serverPath.toString(), "requestedPort" to requestedPort),
                    exitCode = 1,
                    evidenceLevel = "fresh-runtime",
                )
            val (harness, conflict) = startHarnessRun(
                HarnessSpec(
                    keySeed = "test-smoke:${serverPath.toAbsolutePath().normalize()}",
                    runKind = "test smoke",
                    command = "test smoke",
                    repoOrScenario = "smoke",
                    workDirOrRunRoot = serverPath.toString(),
                    requestedPort = requestedPort,
                    actualPort = reservedPort.port,
                    reservedPortPath = reservedPort.path,
                ),
            )
            if (conflict != null) {
                releasePortReservation(reservedPort.path)
                return CommandResult(
                    command = "test smoke",
                    status = "failure",
                    summary = conflict.message,
                    findings = listOf(ValidationFinding("error", conflict.message)),
                    details = conflict.details,
                    artifacts = listOf(ArtifactRef(resolveHarnessPaths("test-smoke:${serverPath.toAbsolutePath().normalize()}").status.toString())),
                    exitCode = 1,
                    evidenceLevel = "fresh-runtime",
                )
            }
            harness!!
            harness.announce(remapped = reservedPort.port != requestedPort)
            if (reservedPort.port != requestedPort && !jsonOutput && !quiet) {
                println("note: requested port $requestedPort was busy; using ${reservedPort.port}")
            }
            harness.updateStatus(
                status = "running",
                phase = "bootstrap",
                lastError = if (reservedPort.port != requestedPort) "requested port $requestedPort remapped to ${reservedPort.port}" else null,
                extra = mapOf("port_note" to if (reservedPort.port != requestedPort) "remapped" else "requested"),
            )
            val run = try {
                runSmokeValidation(serverPath, reservedPort.port, reset, bootstrapMode, harness)
            } catch (error: Throwable) {
                harness.finalizeState("failed", lastError = error.message ?: error::class.java.simpleName, preserveSummary = true)
                throw error
            }
            val exitCode = if (run.exitCode == 0) 0 else 1
            if (exitCode == 0) success(
                command = "test smoke",
                summary = "smoke validation passed",
                artifacts = listOf(ArtifactRef(serverPath.toString(), "directory"), ArtifactRef(harness.paths.status.toString()), ArtifactRef(harness.paths.summary.toString())),
                details = mapOf("serverDir" to serverPath.toString(), "requestedPort" to requestedPort, "actualPort" to reservedPort.port, "resetRuntime" to reset, "bootstrapMode" to bootstrapMode),
                mutated = true,
                evidenceLevel = "fresh-runtime",
            ).also {
                harness.finalizeState("passed", preserveSummary = true)
            } else CommandResult(
                command = "test smoke",
                status = "failure",
                summary = "test smoke failed with exit $exitCode",
                findings = listOf(ValidationFinding("error", "test smoke failed with exit $exitCode")),
                details = mapOf("serverDir" to serverPath.toString(), "requestedPort" to requestedPort, "actualPort" to reservedPort.port, "resetRuntime" to reset, "bootstrapMode" to bootstrapMode) + listOfNotNull(outputSnippet(run.output)?.let { "capturedOutput" to it }).toMap(),
                artifacts = listOf(ArtifactRef(harness.paths.status.toString()), ArtifactRef(harness.paths.summary.toString())),
                exitCode = exitCode,
                evidenceLevel = "fresh-runtime",
                mutated = true,
            ).also {
                harness.finalizeState("failed", lastError = "test smoke failed with exit $exitCode", summaryExtra = listOfNotNull(outputSnippet(run.output)?.let { "capturedOutput" to it }).toMap(), preserveSummary = true)
            }
        }
        "scenario" -> {
            val missing = ensureCommands("kotlin")
            if (missing.isNotEmpty()) return prereqFailure("scenario prerequisites missing", missing)
            val name = subArgs.getOrNull(1) ?: return usageError("test scenario requires a scenario name", testHelp())
            if (name == "--help") return success("test scenario", testHelp(), evidenceLevel = "scenario-runtime")
            val scenario = scenarios[name] ?: return usageError("unknown scenario: $name", testHelp())
            var passthroughArgs = subArgs.drop(2)
            val requestedCycles = passthroughArgs.windowed(2).firstOrNull { it[0] == "--cycles" }?.get(1)?.toIntOrNull()
            if (requestedCycles != null && requestedCycles > 1) {
                return usageError("--cycles $requestedCycles violates the one-world validation rule; use --cycles 1", testHelp())
            }
            val runRoot = scenarioDefaultRunRoot(name, passthroughArgs)
            val requestedPort = scenarioRequestedPort(name, passthroughArgs)
            val reservedPort = requestedPort?.let {
                reserveAvailablePort(it) ?: return CommandResult(
                    command = "test scenario $name",
                    status = "failure",
                    summary = "no free port found in ${it}..${it + 50}",
                    findings = listOf(ValidationFinding("error", "no free port found in ${it}..${it + 50}")),
                    details = mapOf("scenario" to name, "requestedPort" to it, "runRoot" to runRoot.toString()),
                    exitCode = 1,
                    evidenceLevel = "scenario-runtime",
                )
            }
            if (reservedPort != null) {
                passthroughArgs = replaceFlagValue(passthroughArgs, "--port", reservedPort.port.toString())
            }
            val latestStatus = runRoot.resolve("latest-status.json")
            val latestSummary = runRoot.resolve("latest-summary.json")
            val keySeed = "scenario:$name:${runRoot.toAbsolutePath().normalize()}"
            val commandName = "test scenario $name"
            val (harness, conflict) = startHarnessRun(
                HarnessSpec(
                    keySeed = keySeed,
                    runKind = commandName,
                    command = commandName,
                    repoOrScenario = scenario.name,
                    workDirOrRunRoot = runRoot.toString(),
                    requestedPort = requestedPort,
                    actualPort = reservedPort?.port,
                    reservedPortPath = reservedPort?.path,
                    latestStatusPath = latestStatus,
                    latestSummaryPath = latestSummary,
                ),
            )
            if (conflict != null) {
                releasePortReservation(reservedPort?.path)
                return CommandResult(
                    command = commandName,
                    status = "failure",
                    summary = conflict.message,
                    findings = listOf(ValidationFinding("error", conflict.message)),
                    details = conflict.details,
                    artifacts = listOf(ArtifactRef(resolveHarnessPaths(keySeed).status.toString())),
                    exitCode = 1,
                    evidenceLevel = "scenario-runtime",
                    mutated = true,
                )
            }
            harness!!
            harness.announce(remapped = requestedPort != null && reservedPort?.port != requestedPort)
            if (requestedPort != null && reservedPort != null && reservedPort.port != requestedPort && !jsonOutput && !quiet) {
                println("note: requested port $requestedPort was busy; using ${reservedPort.port}")
            }
            harness.updateStatus(status = "running", phase = "bootstrap")
            val processCommand = listOf("kotlin", scenario.script) + passthroughArgs
            val processEnv = buildMap<String, String> {
                put("BC_HARNESS_STATUS_PATH", harness.paths.status.toString())
                put("BC_HARNESS_SUMMARY_PATH", harness.paths.summary.toString())
                put("BC_HARNESS_PIDS_PATH", harness.paths.pids.toString())
                put("BC_HARNESS_LOCK_PATH", harness.paths.lock.toString())
                put("BC_HARNESS_LATEST_STATUS_PATH", latestStatus.toString())
                put("BC_HARNESS_LATEST_SUMMARY_PATH", latestSummary.toString())
                put("BC_HARNESS_REQUESTED_PORT", requestedPort?.toString() ?: "")
                put("BC_HARNESS_ACTUAL_PORT", reservedPort?.port?.toString() ?: "")
                put("BC_HARNESS_ALLOW_PORT", reservedPort?.port?.toString() ?: "")
                put("BC_HARNESS_RUN_ROOT", runRoot.toString())
                put("BC_HARNESS_SCENARIO", name)
            }
            val run = runProcess(processCommand, extraEnv = processEnv, stream = !jsonOutput && !quiet)
            val mappedExit = when (run.exitCode) { 0 -> 0; 2 -> 2; else -> 1 }
            return if (mappedExit == 0) {
                harness.finalizeState("passed", preserveSummary = true)
                success(
                    command = commandName,
                    summary = "scenario $name passed",
                    details = mapOf("scenario" to scenario.name, "script" to scenario.script, "args" to passthroughArgs, "requestedPort" to requestedPort, "actualPort" to reservedPort?.port, "runRoot" to runRoot.toString()),
                    artifacts = listOf(ArtifactRef(harness.paths.status.toString()), ArtifactRef(harness.paths.summary.toString()), ArtifactRef(latestStatus.toString()), ArtifactRef(latestSummary.toString())),
                    evidenceLevel = "scenario-runtime",
                    mutated = true,
                )
            } else {
                harness.finalizeState("failed", lastError = "$commandName failed with exit $mappedExit", summaryExtra = listOfNotNull(outputSnippet(run.output)?.let { "capturedOutput" to it }).toMap(), preserveSummary = true)
                CommandResult(
                    command = commandName,
                    status = "failure",
                    summary = "$commandName failed with exit $mappedExit",
                    details = mapOf("scenario" to scenario.name, "script" to scenario.script, "args" to passthroughArgs, "requestedPort" to requestedPort, "actualPort" to reservedPort?.port, "runRoot" to runRoot.toString()) + listOfNotNull(outputSnippet(run.output)?.let { "capturedOutput" to it }).toMap(),
                    findings = listOf(ValidationFinding("error", "$commandName failed with exit $mappedExit")),
                    artifacts = listOf(ArtifactRef(harness.paths.status.toString()), ArtifactRef(harness.paths.summary.toString()), ArtifactRef(latestStatus.toString()), ArtifactRef(latestSummary.toString())),
                    exitCode = mappedExit,
                    evidenceLevel = "scenario-runtime",
                    mutated = true,
                )
            }
        }
        "kotlin" -> {
            var filter: String? = null
            val rest = subArgs.drop(1)
            var index = 0
            while (index < rest.size) {
                when (rest[index]) {
                    "--filter" -> {
                        filter = rest.getOrNull(index + 1) ?: return usageError("--filter needs a value", testHelp())
                        index += 2
                    }
                    "--help" -> return success("test kotlin", testHelp(), evidenceLevel = "source")
                    else -> return usageError("unknown argument: ${rest[index]}", testHelp())
                }
            }
            val missing = ensureCommands("kotlin")
            if (missing.isNotEmpty()) return prereqFailure("kotlin test prerequisites missing", missing)
            val run = runKotlinTests(filter)
            val exitCode = if (run.exitCode == 0) 0 else 1
            if (exitCode == 0) success(
                command = "test kotlin",
                summary = "kotlin tests passed",
                details = listOfNotNull(outputSnippet(run.output)?.let { "capturedOutput" to it }).toMap(),
                evidenceLevel = "source",
            ) else CommandResult(
                command = "test kotlin",
                status = "failure",
                summary = "test kotlin failed with exit $exitCode",
                findings = listOf(ValidationFinding("error", "test kotlin failed with exit $exitCode")),
                details = listOfNotNull(outputSnippet(run.output)?.let { "capturedOutput" to it }).toMap(),
                exitCode = exitCode,
                evidenceLevel = "source",
            )
        }
        else -> usageError("unknown test command: ${subArgs.first()}", testHelp())
    }
}

fun handleBuild(subArgs: List<String>): CommandResult {
    if (subArgs.isEmpty() || subArgs == listOf("--help")) {
        return success("build", buildHelp(), evidenceLevel = "build")
    }
    if (subArgs.first() !in setOf("sync", "bundle")) {
        return usageError("unknown build command: ${subArgs.first()}", buildHelp())
    }
    return when (subArgs.first()) {
        "sync" -> {
            val side = subArgs.getOrNull(1) ?: return usageError("build sync requires server or client", buildHelp())
            if (side !in setOf("server", "client")) return usageError("build sync requires server or client", buildHelp())
            var dir: String? = null
            var mode: String? = null
            val rest = subArgs.drop(2)
            var index = 0
            while (index < rest.size) {
                when (rest[index]) {
                    "--dir" -> {
                        dir = rest.getOrNull(index + 1) ?: return usageError("--dir needs a path", buildHelp())
                        index += 2
                    }
                    "--dry-run", "--apply" -> {
                        if (mode != null) return usageError("choose exactly one of --dry-run or --apply", buildHelp())
                        mode = rest[index]
                        index += 1
                    }
                    "--help" -> return success("build sync", buildHelp(), evidenceLevel = "build")
                    else -> return usageError("unknown argument: ${rest[index]}", buildHelp())
                }
            }
            if (dir.isNullOrBlank()) return usageError("build sync $side requires --dir PATH", buildHelp())
            if (mode == null) return usageError("build sync $side requires --dry-run or --apply", buildHelp())
            val targetPath = resolveUserPath(dir!!)
            val run = syncManaged(side, targetPath, mode == "--apply")
            val exitCode = classifyBuildExit(run.exitCode, run.output)
            if (exitCode == 0) success(
                command = "build sync $side",
                summary = "sync $side ${if (mode == "--apply") "applied" else "planned"}",
                artifacts = listOf(ArtifactRef(targetPath.toString(), "directory")),
                details = mapOf("side" to side, "dir" to targetPath.toString(), "mode" to mode) + listOfNotNull(outputSnippet(run.output)?.let { "capturedOutput" to it }).toMap(),
                mutated = mode == "--apply",
                evidenceLevel = "build",
            ) else CommandResult(
                command = "build sync $side",
                status = "failure",
                summary = "build sync $side failed with exit $exitCode",
                findings = listOf(ValidationFinding("error", "build sync $side failed with exit $exitCode")),
                details = mapOf("side" to side, "dir" to targetPath.toString(), "mode" to mode) + listOfNotNull(outputSnippet(run.output)?.let { "capturedOutput" to it }).toMap(),
                artifacts = listOf(ArtifactRef(targetPath.toString(), "directory")),
                exitCode = exitCode,
                mutated = mode == "--apply",
                evidenceLevel = "build",
            )
        }
        "dumps" -> {
            val missing = ensureCommands("kotlin", "java")
            if (missing.isNotEmpty()) return prereqFailure("dump refresh prerequisites missing", missing)
            var serverDir = defaultDumpRefreshServerDir
            var port = "25565"
            var reset = false
            val rest = subArgs.drop(1)
            var index = 0
            while (index < rest.size) {
                when (rest[index]) {
                    "--server-dir" -> {
                        serverDir = rest.getOrNull(index + 1) ?: return usageError("--server-dir needs a path", buildHelp())
                        index += 2
                    }
                    "--port" -> {
                        port = rest.getOrNull(index + 1) ?: return usageError("--port needs a number", buildHelp())
                        if (!port.all(Char::isDigit)) return usageError("--port needs a number", buildHelp())
                        index += 2
                    }
                    "--reset-runtime" -> {
                        reset = true
                        index += 1
                    }
                    "--help" -> return success("build dumps", buildHelp(), evidenceLevel = "build")
                    else -> return usageError("unknown argument: ${rest[index]}", buildHelp())
                }
            }
            val serverPath = resolveUserPath(serverDir)
            val run = runDumpRefresh(serverPath, port.toInt(), reset)
            val exitCode = if (run.exitCode == 0) 0 else 1
            if (exitCode == 0) success(
                command = "build dumps",
                summary = "runtime dumps regenerated",
                artifacts = listOf(
                    ArtifactRef(serverPath.toString(), "directory"),
                    ArtifactRef(root.resolve("generated/runtime-dumps").toString(), "directory"),
                ),
                details = mapOf("serverDir" to serverPath.toString(), "port" to port.toInt(), "resetRuntime" to reset) + listOfNotNull(outputSnippet(run.output)?.let { "capturedOutput" to it }).toMap(),
                mutated = true,
                evidenceLevel = "fresh-runtime",
            ) else CommandResult(
                command = "build dumps",
                status = "failure",
                summary = "build dumps failed with exit $exitCode",
                findings = listOf(ValidationFinding("error", "build dumps failed with exit $exitCode")),
                details = mapOf("serverDir" to serverPath.toString(), "port" to port.toInt(), "resetRuntime" to reset) + listOfNotNull(outputSnippet(run.output)?.let { "capturedOutput" to it }).toMap(),
                artifacts = listOf(ArtifactRef(serverPath.toString(), "directory")),
                exitCode = exitCode,
                mutated = true,
                evidenceLevel = "fresh-runtime",
            )
        }
        "bundle" -> {
            val target = subArgs.getOrNull(1) ?: return usageError("build bundle requires curseforge, server, or release", buildHelp())
            return when (target) {
                "curseforge" -> {
                    val prereqs = ensureCommands("packwiz")
                    if (prereqs.isNotEmpty()) return prereqFailure("bundle prerequisites missing", prereqs)
                    var exportsDir = defaultExportsDir
                    val rest = subArgs.drop(2)
                    var index = 0
                    while (index < rest.size) {
                        when (rest[index]) {
                            "--exports-dir" -> {
                                exportsDir = rest.getOrNull(index + 1) ?: return usageError("--exports-dir needs a path", buildHelp())
                                index += 2
                            }
                            "--help" -> return success("build bundle curseforge", buildHelp(), evidenceLevel = "build")
                            else -> return usageError("unknown argument: ${rest[index]}", buildHelp())
                        }
                    }
                    val exportsPath = resolveUserPath(exportsDir)
                    val release = currentPlaytestRelease()
                    val (clientZip, _) = releaseArchivePaths(exportsPath, release)
                    val run = exportCurseforgeBundle(exportsPath, clientZip)
                    val exitCode = classifyBuildExit(run.exitCode, run.output)
                    if (exitCode == 0) success(
                        command = "build bundle curseforge",
                        summary = "CurseForge bundle export completed",
                        artifacts = listOf(ArtifactRef(clientZip.toString())),
                        details = mapOf("target" to "curseforge", "exportsDir" to exportsPath.toString(), "version" to release.version, "clientZip" to clientZip.toString()) + listOfNotNull(outputSnippet(run.output)?.let { "capturedOutput" to it }).toMap(),
                        mutated = true,
                        evidenceLevel = "build",
                    ) else CommandResult(
                        command = "build bundle curseforge",
                        status = "failure",
                        summary = "build bundle curseforge failed with exit $exitCode",
                        findings = listOf(ValidationFinding("error", run.output.ifBlank { "build bundle curseforge failed with exit $exitCode" })),
                        details = mapOf("target" to "curseforge", "exportsDir" to exportsPath.toString()) + listOfNotNull(outputSnippet(run.output)?.let { "capturedOutput" to it }).toMap(),
                        artifacts = listOf(ArtifactRef(clientZip.toString())),
                        exitCode = exitCode,
                        mutated = true,
                        evidenceLevel = "build",
                    )
                }
                "server" -> {
                    val prereqs = ensureCommands("packwiz", "zip")
                    if (prereqs.isNotEmpty()) return prereqFailure("bundle prerequisites missing", prereqs)
                    if (!detectJava17()) return prereqFailure("Java 17 is required for build bundle server")
                    try {
                        findForgeInstaller()
                    } catch (error: Exception) {
                        return prereqFailure(error.message ?: "Forge installer is missing")
                    }
                    var exportsDir = defaultExportsDir
                    var serverTreeDir: String? = null
                    var serverZip: String? = null
                    var clean = false
                    val rest = subArgs.drop(2)
                    var index = 0
                    while (index < rest.size) {
                        when (rest[index]) {
                            "--exports-dir" -> {
                                exportsDir = rest.getOrNull(index + 1) ?: return usageError("--exports-dir needs a path", buildHelp())
                                index += 2
                            }
                            "--server-tree-dir" -> {
                                serverTreeDir = rest.getOrNull(index + 1) ?: return usageError("--server-tree-dir needs a path", buildHelp())
                                index += 2
                            }
                            "--server-zip" -> {
                                serverZip = rest.getOrNull(index + 1) ?: return usageError("--server-zip needs a path", buildHelp())
                                index += 2
                            }
                            "--clean" -> {
                                clean = true
                                index += 1
                            }
                            "--help" -> return success("build bundle server", buildHelp(), evidenceLevel = "build")
                            else -> return usageError("unknown argument: ${rest[index]}", buildHelp())
                        }
                    }
                    val exportsPath = resolveUserPath(exportsDir)
                    val serverTreePath = resolveUserPath(serverTreeDir ?: exportsPath.resolve("server-tree/better-content-server").toString())
                    val release = currentPlaytestRelease()
                    val serverZipPath = resolveUserPath(serverZip ?: exportsPath.resolve("${release.baseName}-server.zip").toString())
                    val run = refuseExistingReleaseArchives(serverZipPath)
                        ?: buildServerBundle(exportsPath, serverTreePath, serverZipPath, clean)
                    val exitCode = classifyBuildExit(run.exitCode, run.output)
                    if (exitCode == 0) success(
                        command = "build bundle server",
                        summary = "server bundle export completed",
                        artifacts = listOf(ArtifactRef(exportsPath.toString(), "directory"), ArtifactRef(serverZipPath.toString())),
                        details = mapOf("target" to "server", "exportsDir" to exportsPath.toString(), "serverTreeDir" to serverTreePath.toString(), "serverZip" to serverZipPath.toString(), "version" to release.version, "clean" to clean) + listOfNotNull(outputSnippet(run.output)?.let { "capturedOutput" to it }).toMap(),
                        mutated = true,
                        evidenceLevel = "build",
                    ) else CommandResult(
                        command = "build bundle server",
                        status = "failure",
                        summary = "build bundle server failed with exit $exitCode",
                        findings = listOf(ValidationFinding("error", run.output.ifBlank { "build bundle server failed with exit $exitCode" })),
                        details = mapOf("target" to "server", "exportsDir" to exportsPath.toString(), "serverTreeDir" to serverTreePath.toString(), "serverZip" to serverZipPath.toString(), "clean" to clean) + listOfNotNull(outputSnippet(run.output)?.let { "capturedOutput" to it }).toMap(),
                        artifacts = listOf(ArtifactRef(exportsPath.toString(), "directory"), ArtifactRef(serverZipPath.toString())),
                        exitCode = exitCode,
                        mutated = true,
                        evidenceLevel = "build",
                    )
                }
                "release" -> {
                    val prereqs = ensureCommands("packwiz", "zip")
                    if (prereqs.isNotEmpty()) return prereqFailure("release bundle prerequisites missing", prereqs)
                    if (!detectJava17()) return prereqFailure("Java 17 is required for release bundles")
                    try {
                        findForgeInstaller()
                    } catch (error: Exception) {
                        return prereqFailure(error.message ?: "Forge installer is missing")
                    }
                    var exportsDir = defaultExportsDir
                    var resumeCurrent = false
                    val rest = subArgs.drop(2)
                    var index = 0
                    while (index < rest.size) {
                        when (rest[index]) {
                            "--exports-dir" -> {
                                exportsDir = rest.getOrNull(index + 1) ?: return usageError("--exports-dir needs a path", buildHelp())
                                index += 2
                            }
                            "--resume-current" -> {
                                resumeCurrent = true
                                index += 1
                            }
                            "--help" -> return success("build bundle release", buildHelp(), evidenceLevel = "build")
                            else -> return usageError("unknown argument: ${rest[index]}", buildHelp())
                        }
                    }
                    val exportsPath = resolveUserPath(exportsDir)
                    val nextRelease = if (resumeCurrent) currentPlaytestRelease() else nextPlaytestRelease()
                    val (clientZip, serverZip) = releaseArchivePaths(exportsPath, nextRelease)
                    refuseExistingReleaseArchives(clientZip, serverZip)?.let { refusal ->
                        return CommandResult(
                            command = "build bundle release",
                            status = "failure",
                            summary = "release version v${nextRelease.version} is already in use",
                            findings = listOf(ValidationFinding("error", refusal.output)),
                            artifacts = listOf(ArtifactRef(exportsPath.toString(), "directory")),
                            exitCode = refusal.exitCode,
                            evidenceLevel = "build",
                        )
                    }
                    val release = if (resumeCurrent) currentPlaytestRelease() else reserveNextPlaytestRelease()
                    val serverTree = exportsPath.resolve("server-tree/better-content-server")
                    val run = runStepSequence(buildList {
                        add("refresh packwiz metadata" to {
                            runProcess(listOf("packwiz", "refresh"), workDir = root, stream = false)
                        })
                        add("static validation" to { runStaticValidation() })
                        add("CurseForge export" to { exportCurseforgeBundle(exportsPath, clientZip) })
                        add("complete server export" to { buildServerBundle(exportsPath, serverTree, serverZip, clean = true) })
                        add("archive verification" to { verifyReleaseBundleArchives(clientZip, serverZip) })
                    })
                    val exitCode = classifyBuildExit(run.exitCode, run.output)
                    if (exitCode == 0) success(
                        command = "build bundle release",
                        summary = "release bundles completed",
                        artifacts = listOf(ArtifactRef(clientZip.toString()), ArtifactRef(serverZip.toString())),
                        details = mapOf(
                            "exportsDir" to exportsPath.toString(),
                            "version" to release.version,
                            "clientZip" to clientZip.toString(),
                            "serverZip" to serverZip.toString(),
                            "resumedCurrent" to resumeCurrent,
                        ) + listOfNotNull(outputSnippet(run.output)?.let { "capturedOutput" to it }).toMap(),
                        mutated = true,
                        evidenceLevel = "build",
                    ) else CommandResult(
                        command = "build bundle release",
                        status = "failure",
                        summary = "release bundle workflow failed with exit $exitCode",
                        findings = listOf(ValidationFinding("error", "release bundle workflow failed with exit $exitCode")),
                        details = mapOf(
                            "exportsDir" to exportsPath.toString(),
                            "version" to release.version,
                            "clientZip" to clientZip.toString(),
                            "serverZip" to serverZip.toString(),
                        ) + listOfNotNull(outputSnippet(run.output)?.let { "capturedOutput" to it }).toMap(),
                        artifacts = listOf(ArtifactRef(clientZip.toString()), ArtifactRef(serverZip.toString())),
                        exitCode = exitCode,
                        mutated = true,
                        evidenceLevel = "build",
                    )
                }
                else -> usageError("unknown bundle target: $target", buildHelp())
            }
        }
        else -> usageError("unknown build command: ${subArgs.first()}", buildHelp())
    }
}

val result = try {
    when {
        filteredArgs.isEmpty() || filteredArgs == listOf("--help") -> success("help", mainHelp(), evidenceLevel = "source")
        filteredArgs.first() == "test" -> handleTest(filteredArgs.drop(1))
        filteredArgs.first() == "build" -> handleBuild(filteredArgs.drop(1))
        filteredArgs.first() == "graph" -> handleGraph(filteredArgs.drop(1))
        filteredArgs.first() == "inspect" -> handleInspect(filteredArgs.drop(1))
        filteredArgs.first() == "doctor" -> handleDoctor(filteredArgs.drop(1))
        filteredArgs.first() == "internal" -> handleInternal(filteredArgs.drop(1))
        else -> usageError("unknown command: ${filteredArgs.first()}")
    }
} catch (error: Exception) {
    internalFailure(error.message ?: error.javaClass.simpleName)
}

printResult(result)
exitProcess(result.exitCode)

#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import kotlin.io.path.createDirectories
import kotlin.io.path.exists
import kotlin.system.exitProcess

data class ScenarioConfig(
    val lane: String,
    val runRoot: Path,
)

data class LaneResult(
    val lane: String,
    val status: String,
    val observedOutcome: String,
    val command: List<String>,
    val exitCode: Int,
    val logPath: String,
    val assertionFailures: List<String>,
    val warbandId: String = "UNKNOWN",
    val rallyPresenceState: String = "UNKNOWN",
    val captainId: String = "UNKNOWN",
    val captainState: String = "UNKNOWN",
    val campaignId: String = "UNKNOWN",
)

val laneTests = linkedMapOf(
    "rally" to listOf(
        "--tests", "com.gerald.pillagercampaigns.system.PillagerCampaignEngineRallyTest",
        "--tests", "com.gerald.pillagercampaigns.PillagerCampaignsEventsFormatTest",
        "--tests", "com.gerald.pillagercampaigns.gametest.PillagerCampaignsGameTests.warlordMaterializationCommandRecordsPresenceAttempt",
    ),
    "nemesis_cycle" to listOf(
        "--tests", "com.gerald.pillagercampaigns.system.PillagerCampaignEngineTest.resolving campaign defeat sends captain into recovery with history",
        "--tests", "com.gerald.pillagercampaigns.system.PillagerCampaignEngineTest.captain victory strengthens warband and preserves captain identity",
        "--tests", "com.gerald.pillagercampaigns.system.PillagerCampaignEngineTest.promotion occurs after repeated success thresholds",
    ),
    "warlord_collapse" to listOf(
        "--tests", "com.gerald.pillagercampaigns.system.PillagerCampaignEngineTest.collapse warband marks home officers dead without rewriting captain history as player defeat",
        "--tests", "com.gerald.pillagercampaigns.gametest.PillagerCampaignsGameTests.warbandCollapseResolvesCampaignAndKillsHomeOfficer",
    ),
    "multiplayer_bias" to listOf(
        "--tests", "com.gerald.pillagercampaigns.system.PillagerCampaignEngineTest.assignment weight prefers grudges and rejects protected targets",
    ),
)

fun usage(message: String? = null): Nothing {
    if (message != null) System.err.println(message)
    System.err.println("Usage: tools/btm test scenario pillager_campaigns [--lane rally|nemesis_cycle|warlord_collapse|multiplayer_bias] [--run-root PATH]")
    exitProcess(2)
}

fun parseConfig(args: Array<String>): ScenarioConfig {
    var lane = "nemesis_cycle"
    var runRoot = Paths.get("/tmp/btm-pillager-campaigns")
    var index = 0
    while (index < args.size) {
        when (args[index]) {
            "--lane" -> {
                lane = args.getOrNull(index + 1) ?: usage("--lane requires a value")
                index += 2
            }
            "--run-root" -> {
                runRoot = Paths.get(args.getOrNull(index + 1) ?: usage("--run-root requires a path")).toAbsolutePath().normalize()
                index += 2
            }
            "--help" -> usage()
            else -> usage("unknown argument: ${args[index]}")
        }
    }
    if (lane !in laneTests.keys) usage("unknown lane: $lane")
    return ScenarioConfig(lane, runRoot)
}

fun runCommand(command: List<String>, workdir: Path, logPath: Path): Int {
    val builder = ProcessBuilder(command)
        .directory(workdir.toFile())
        .redirectErrorStream(true)
        .redirectOutput(logPath.toFile())
    return builder.start().waitFor()
}

fun writeJson(path: Path, result: LaneResult) {
    val failuresJson = result.assertionFailures.joinToString(",") { "\"${it.replace("\"", "\\\"")}\"" }
    val commandJson = result.command.joinToString(",") { "\"${it.replace("\"", "\\\"")}\"" }
    val json = """
        {
          "scenario": "pillager_campaigns",
          "lane": "${result.lane}",
          "status": "${result.status}",
          "observed_outcome": "${result.observedOutcome}",
          "warband_id": "${result.warbandId}",
          "rally_presence_state": "${result.rallyPresenceState}",
          "captain_id": "${result.captainId}",
          "captain_state": "${result.captainState}",
          "campaign_id": "${result.campaignId}",
          "command": [$commandJson],
          "exit_code": ${result.exitCode},
          "log_path": "${result.logPath.replace("\\", "\\\\")}",
          "assertion_failures": [$failuresJson]
        }
    """.trimIndent()
    Files.writeString(path, "$json\n")
}

val root = Paths.get("").toAbsolutePath().normalize()
val modRoot = root.resolve("generated/custom-mod-sources/pillager-campaigns")
if (!modRoot.exists()) usage("pillager campaigns source root missing: $modRoot")
val config = parseConfig(args)
val laneRoot = config.runRoot.resolve(config.lane)
laneRoot.createDirectories()
val logPath = laneRoot.resolve("gradle-test.log")
val summaryPath = laneRoot.resolve("summary.json")
val testArgs = laneTests.getValue(config.lane)
val command = listOf("./gradlew", "test") + testArgs

println("pillager_campaigns lane=${config.lane}")
val exit = runCommand(command, modRoot, logPath)
val failures = if (exit == 0) emptyList() else listOf("Gradle test lane failed; inspect ${logPath.toAbsolutePath()}")
val result = LaneResult(
    lane = config.lane,
    status = if (exit == 0) "PASS" else "FAIL",
    observedOutcome = if (exit == 0) "lane_passed" else "lane_failed",
    command = command,
    exitCode = exit,
    logPath = logPath.toAbsolutePath().toString(),
    assertionFailures = failures,
)
writeJson(summaryPath, result)
println("summary=${summaryPath.toAbsolutePath()}")
exitProcess(exit)

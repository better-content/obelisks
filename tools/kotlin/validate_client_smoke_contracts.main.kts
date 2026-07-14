#!/usr/bin/env kotlin

import java.nio.file.Files
import java.nio.file.Paths
import kotlin.system.exitProcess

val contractPath = Paths.get("").toAbsolutePath().normalize().resolve("tools/client_smoke_contract.json")
if (!Files.isRegularFile(contractPath)) {
    System.err.println("FAIL - missing tools/client_smoke_contract.json")
    exitProcess(1)
}
val text = Files.readString(contractPath)
val requiredNeedles = listOf(
    "\"schema\": \"bc.client_smoke_contract.v1\"",
    "\"scenario\": \"client_smoke\"",
    "\"quick\"",
    "\"release\"",
    "\"requiresHeadful\": true",
    "\"client_join_attempt\"",
    "\"nonblank_ui_evidence\"",
)
val missing = requiredNeedles.filterNot(text::contains)
if (missing.isNotEmpty()) {
    System.err.println("FAIL - client smoke contract is missing: ${missing.joinToString(", ")}")
    exitProcess(1)
}
println("client smoke contracts validate")

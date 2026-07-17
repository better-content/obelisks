package io.github.bettercontent.validation

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.mojang.brigadier.arguments.StringArgumentType
import com.mojang.brigadier.builder.LiteralArgumentBuilder
import com.mojang.logging.LogUtils
import net.minecraft.commands.CommandSourceStack
import net.minecraft.commands.Commands
import net.minecraft.network.chat.Component
import net.minecraft.resources.ResourceLocation
import net.minecraftforge.common.MinecraftForge
import net.minecraftforge.event.RegisterCommandsEvent
import net.minecraftforge.fml.common.Mod
import net.minecraftforge.fml.loading.FMLPaths
import net.minecraftforge.registries.ForgeRegistries
import org.slf4j.Logger
import java.nio.file.Files

@Mod(ValidationProbeMod.MOD_ID)
class ValidationProbeMod {
    init {
        MinecraftForge.EVENT_BUS.addListener(ValidationProbeCommands::register)
    }

    companion object {
        const val MOD_ID = "bc_validation_probe"
        val LOGGER: Logger = LogUtils.getLogger()
    }
}

object ValidationProbeCommands {
    private const val resultPrefix = "BC_VALIDATION_PROBE_RESULT "

    fun register(event: RegisterCommandsEvent) {
        event.dispatcher.register(
            Commands.literal("bcvalidate")
                .requires { it.hasPermission(4) }
                .then(LiteralArgumentBuilder.literal<CommandSourceStack>("ping").executes { context ->
                    emit(context.source, "ping", "passed", emptyList(), emptyList(), listOf("ping"))
                    1
                })
                .then(
                    Commands.literal("phase")
                        .then(Commands.argument("id", StringArgumentType.word()).executes { context ->
                            validatePhase(context.source, StringArgumentType.getString(context, "id"))
                        }),
                )
                .then(LiteralArgumentBuilder.literal<CommandSourceStack>("all").executes { context ->
                    validateAll(context.source)
                }),
        )
    }

    private fun validateAll(source: CommandSourceStack): Int {
        val root = loadContract(source) ?: return 0
        var failed = 0
        var passed = 0
        root.getAsJsonArray("phases")
            ?.map { it.asJsonObject }
            ?.forEach { phase ->
                if (validatePhaseObject(source, phase.get("id")?.asString ?: "UNKNOWN", phase)) passed += 1 else failed += 1
            }
        emit(source, "all", if (failed == 0) "passed" else "failed", listOfNotNull(if (failed == 0) null else "$failed phase(s) failed"), emptyList(), listOf("summary"), mapOf("passed" to passed, "failed" to failed))
        return if (failed == 0) 1 else 0
    }

    private fun loadContract(source: CommandSourceStack): JsonObject? {
        val contractPath = FMLPaths.CONFIGDIR.get().resolve("bc-validation-probe/progression_milestones.json")
        if (!Files.exists(contractPath)) {
            emit(source, "contract", "failed", listOf("missing contract: $contractPath"), emptyList(), listOf("contract"))
            return null
        }
        return Files.newBufferedReader(contractPath).use { JsonParser.parseReader(it).asJsonObject }
    }

    private fun validatePhase(source: CommandSourceStack, phaseId: String): Int {
        val root = loadContract(source) ?: return 0
        val phase = root.getAsJsonArray("phases")
            ?.map { it.asJsonObject }
            ?.firstOrNull { it.get("id")?.asString == phaseId }
        if (phase == null) {
            emit(source, phaseId, "failed", listOf("unknown phase"), emptyList(), listOf("contract"))
            return 0
        }
        return if (validatePhaseObject(source, phaseId, phase)) 1 else 0
    }

    private fun validatePhaseObject(source: CommandSourceStack, phaseId: String, phase: JsonObject): Boolean {
        val errors = mutableListOf<String>()
        val recipes = mutableListOf<String>()
        val checks = mutableListOf<String>()
        phase.stringList("expectedOutputs").forEach { output ->
            val key = ResourceLocation.tryParse(output)
            if (key == null) {
                errors += "invalid expected output id $output"
            } else if (ForgeRegistries.ITEMS.getValue(key) == null && ForgeRegistries.BLOCKS.getValue(key) == null) {
                errors += "missing item/block $output"
            }
        }
        checks += "registry"
        val expectedTypes = phase.stringList("recipeTypes")
        phase.stringList("recipeIds").forEachIndexed { index, recipeId ->
            val key = ResourceLocation.tryParse(recipeId)
            val recipe = key?.let { source.server.recipeManager.byKey(it).orElse(null) }
            if (key == null || recipe == null) {
                errors += "missing recipe $recipeId"
            } else {
                recipes += recipeId
                val typeId = ForgeRegistries.RECIPE_TYPES.getKey(recipe.type)?.toString() ?: recipe.type.toString()
                val expectedType = expectedTypes.getOrNull(index) ?: expectedTypes.firstOrNull()
                if (expectedType != null && typeId != expectedType) errors += "$recipeId type $typeId != $expectedType"
                if (recipe.ingredients.isEmpty()) {
                    if (typeId == "minecraft:crafting") {
                        errors += "$recipeId has no exposed ingredients"
                    } else {
                        checks += "craftability_deferred:$typeId"
                    }
                }
                val result = recipe.getResultItem(source.server.registryAccess())
                if (!result.isEmpty) {
                    val resultId = ForgeRegistries.ITEMS.getKey(result.item)?.toString()
                    val acceptedOutputs = (phase.stringList("expectedOutputs") + phase.stringList("acceptedRecipeOutputs")).toSet()
                    if (resultId != null && resultId !in acceptedOutputs) {
                        errors += "$recipeId result $resultId is not one of expected/accepted outputs"
                    }
                }
            }
        }
        checks += "recipe"
        checks += "craftability"
        phase.stringList("dataChecks").forEach { path ->
            val probePath = FMLPaths.GAMEDIR.get().resolve(path)
            if (!Files.exists(probePath)) errors += "missing data check path $path"
        }
        if (phase.stringList("dataChecks").isNotEmpty()) checks += "data"
        emit(source, phaseId, if (errors.isEmpty()) "passed" else "failed", errors, recipes, checks)
        return errors.isEmpty()
    }

    private fun JsonObject.stringList(name: String): List<String> =
        getAsJsonArray(name)?.mapNotNull { element -> element.takeIf { it.isJsonPrimitive }?.asString } ?: emptyList()

    private fun emit(source: CommandSourceStack, phase: String, status: String, errors: List<String>, recipes: List<String>, checks: List<String>, counts: Map<String, Int> = emptyMap()) {
        val json = JsonObject().apply {
            addProperty("schema", "bc.progression_validation_probe.v1")
            addProperty("phase", phase)
            addProperty("status", status)
            add("errors", errors.toJsonArray())
            add("recipes", recipes.toJsonArray())
            add("checks", checks.toJsonArray())
            counts.forEach { (name, value) -> addProperty(name, value) }
        }
        ValidationProbeMod.LOGGER.info("{}{}", resultPrefix, json)
        source.sendSuccess({ Component.literal("$phase: $status") }, true)
    }

    private fun List<String>.toJsonArray() = com.google.gson.JsonArray().also { array -> forEach(array::add) }
}

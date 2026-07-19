package io.github.tconaffixes

import net.minecraft.ChatFormatting
import net.minecraft.nbt.CompoundTag
import net.minecraft.nbt.ListTag
import net.minecraft.nbt.Tag
import net.minecraft.network.chat.Component
import net.minecraft.resources.ResourceLocation
import net.minecraft.util.RandomSource
import net.minecraft.world.Container
import net.minecraft.world.item.ItemStack
import net.minecraftforge.event.entity.player.ItemTooltipEvent
import net.minecraftforge.event.entity.player.PlayerEvent
import net.minecraftforge.eventbus.api.SubscribeEvent
import net.minecraftforge.fml.ModList
import net.minecraftforge.registries.ForgeRegistries
import slimeknights.tconstruct.library.modifiers.ModifierId
import slimeknights.tconstruct.library.tools.nbt.ToolStack
import kotlin.math.roundToInt

object TConAffixRewards {
    private const val TCON_MODID = "tconstruct"
    internal const val AFFIXES_TAG = "dimensiondrink_affixes"
    internal const val TIC_MULTIPLIERS_TAG = "tic_multipliers"
    private const val TIC_MATERIALS_TAG = "tic_materials"
    private const val TIC_STATS_TAG = "tic_stats"

    private const val MAX_PREFIXES = 3
    private const val MAX_SUFFIXES = 3

    internal enum class PartFamily {
        MELEE_HEAD,
        TOOL_HEAD,
        HANDLE,
        BINDING,
        BOW,
        RANGED,
        ARMOR,
        SHIELD
    }

    internal enum class AffixKind(val id: String) {
        PREFIX("prefix"),
        SUFFIX("suffix")
    }

    internal data class PartProfile(
        val itemId: String,
        val family: PartFamily,
        val weight: Int = 100
    )

    internal data class Tier(
        val rank: Int,
        val name: String,
        val minPercent: Double,
        val maxPercent: Double,
        val weight: Int
    )

    internal data class StatLine(
        val stat: String,
        val scale: Double = 1.0
    )

    internal data class ModifierGrant(
        val id: String,
        val level: Int = 1
    )

    internal data class AffixDefinition(
        val id: String,
        val name: String,
        val kind: AffixKind,
        val group: String,
        val weight: Int,
        val families: Set<PartFamily>,
        val stats: List<StatLine>,
        val modifiers: List<ModifierGrant>,
        val tiers: List<Tier>
    ) {
        fun allows(family: PartFamily): Boolean = family in families
    }

    private val allFamilies = enumValues<PartFamily>().toSet()
    private val weaponFamilies = setOf(PartFamily.MELEE_HEAD, PartFamily.TOOL_HEAD, PartFamily.HANDLE, PartFamily.BINDING)
    private val headFamilies = setOf(PartFamily.MELEE_HEAD, PartFamily.TOOL_HEAD)
    private val weaponAndBowFamilies = weaponFamilies + PartFamily.BOW
    private val rangedFamilies = setOf(PartFamily.BOW, PartFamily.RANGED)
    private val armorFamilies = setOf(PartFamily.ARMOR, PartFamily.SHIELD)

    internal val partProfiles = listOf(
        PartProfile("tconstruct:pick_head", PartFamily.TOOL_HEAD, 120),
        PartProfile("tconstruct:small_blade", PartFamily.MELEE_HEAD, 120),
        PartProfile("tconstruct:hammer_head", PartFamily.TOOL_HEAD, 80),
        PartProfile("tconstruct:small_axe_head", PartFamily.TOOL_HEAD, 100),
        PartProfile("tconstruct:broad_axe_head", PartFamily.TOOL_HEAD, 70),
        PartProfile("tconstruct:broad_blade", PartFamily.MELEE_HEAD, 90),
        PartProfile("tconstruct:adze_head", PartFamily.TOOL_HEAD, 95),
        PartProfile("tconstruct:large_plate", PartFamily.ARMOR, 55),
        PartProfile("tconstruct:tool_binding", PartFamily.BINDING, 90),
        PartProfile("tconstruct:tough_binding", PartFamily.BINDING, 75),
        PartProfile("tconstruct:tool_handle", PartFamily.HANDLE, 120),
        PartProfile("tconstruct:tough_handle", PartFamily.HANDLE, 80),
        PartProfile("tconstruct:bow_limb", PartFamily.BOW, 85),
        PartProfile("tconstruct:bow_grip", PartFamily.BOW, 85),
        PartProfile("tconstruct:bowstring", PartFamily.BOW, 70),
        PartProfile("tconstruct:arrow_head", PartFamily.RANGED, 82),
        PartProfile("tconstruct:arrow_shaft", PartFamily.RANGED, 82),
        PartProfile("tconstruct:fletching", PartFamily.RANGED, 78),
        PartProfile("tconstruct:helmet_plating", PartFamily.ARMOR, 70),
        PartProfile("tconstruct:chestplate_plating", PartFamily.ARMOR, 70),
        PartProfile("tconstruct:leggings_plating", PartFamily.ARMOR, 70),
        PartProfile("tconstruct:boots_plating", PartFamily.ARMOR, 70),
        PartProfile("tconstruct:maille", PartFamily.ARMOR, 60),
        PartProfile("tconstruct:shield_core", PartFamily.SHIELD, 72)
    )

    private val commonTiers = listOf(
        Tier(1, "sovereign", 0.18, 0.24, 6),
        Tier(2, "exalted", 0.14, 0.18, 14),
        Tier(3, "potent", 0.10, 0.14, 32),
        Tier(4, "tempered", 0.06, 0.10, 58),
        Tier(5, "faint", 0.03, 0.06, 100)
    )

    private val defenseTiers = listOf(
        Tier(1, "sovereign", 0.16, 0.22, 6),
        Tier(2, "exalted", 0.12, 0.16, 14),
        Tier(3, "potent", 0.09, 0.12, 32),
        Tier(4, "tempered", 0.05, 0.09, 58),
        Tier(5, "faint", 0.03, 0.05, 100)
    )

    private val speedTiers = listOf(
        Tier(1, "sovereign", 0.12, 0.17, 7),
        Tier(2, "exalted", 0.09, 0.12, 16),
        Tier(3, "potent", 0.065, 0.09, 36),
        Tier(4, "tempered", 0.04, 0.065, 64),
        Tier(5, "faint", 0.02, 0.04, 110)
    )

    private val hybridTiers = listOf(
        Tier(1, "sovereign", 0.12, 0.17, 5),
        Tier(2, "exalted", 0.09, 0.12, 12),
        Tier(3, "potent", 0.065, 0.09, 28),
        Tier(4, "tempered", 0.04, 0.065, 56),
        Tier(5, "faint", 0.02, 0.04, 100)
    )

    internal val affixPool = listOf(
        affix("vital_temper", "Vital Temper", AffixKind.PREFIX, "damage", 115, weaponFamilies, commonTiers, "tconstruct:attack_damage"),
        affix("keened_edge", "Keened Edge", AffixKind.PREFIX, "speed", 95, weaponAndBowFamilies, speedTiers, "tconstruct:attack_speed"),
        affix("delvers_cut", "Delver's Cut", AffixKind.PREFIX, "mining", 125, setOf(PartFamily.TOOL_HEAD, PartFamily.BINDING), commonTiers, "tconstruct:mining_speed"),
        affix("patient_core", "Patient Core", AffixKind.PREFIX, "durability", 145, allFamilies, commonTiers, "tconstruct:durability"),
        affix("drawn_pulse", "Drawn Pulse", AffixKind.PREFIX, "draw", 110, setOf(PartFamily.BOW, PartFamily.HANDLE), speedTiers, "tconstruct:draw_speed"),
        affix("true_flight", "True Flight", AffixKind.PREFIX, "projectile", 105, rangedFamilies + PartFamily.HANDLE, commonTiers, "tconstruct:projectile_damage"),
        affix("laminated_guard", "Laminated Guard", AffixKind.PREFIX, "armor", 130, setOf(PartFamily.ARMOR, PartFamily.BINDING, PartFamily.SHIELD), defenseTiers, "tconstruct:armor"),
        affix("tempered_marrow", "Tempered Marrow", AffixKind.PREFIX, "toughness", 95, setOf(PartFamily.ARMOR, PartFamily.HANDLE, PartFamily.SHIELD), defenseTiers, "tconstruct:armor_toughness"),
        affix("rooted_balance", "Rooted Balance", AffixKind.PREFIX, "knockback", 75, setOf(PartFamily.ARMOR, PartFamily.HANDLE, PartFamily.BINDING, PartFamily.SHIELD), defenseTiers, "tconstruct:knockback_resistance"),
        affix(
            "fontbound_assault",
            "Fontbound Assault",
            AffixKind.PREFIX,
            "damage_speed",
            42,
            weaponFamilies,
            hybridTiers,
            StatLine("tconstruct:attack_damage", 1.0),
            StatLine("tconstruct:attack_speed", 0.55)
        ),
        affix(
            "quarrywrights_patience",
            "Quarrywright's Patience",
            AffixKind.PREFIX,
            "mining_durability",
            48,
            setOf(PartFamily.TOOL_HEAD, PartFamily.BINDING),
            hybridTiers,
            StatLine("tconstruct:mining_speed", 0.9),
            StatLine("tconstruct:durability", 0.75)
        ),
        affix(
            "bowyers_lattice",
            "Bowyer's Lattice",
            AffixKind.PREFIX,
            "bow_hybrid",
            52,
            rangedFamilies,
            hybridTiers,
            StatLine("tconstruct:projectile_damage", 1.0),
            StatLine("tconstruct:draw_speed", 0.65)
        ),
        affix(
            "bastion_plate",
            "Bastion Plate",
            AffixKind.PREFIX,
            "armor_hybrid",
            46,
            armorFamilies + PartFamily.ARMOR,
            hybridTiers,
            StatLine("tconstruct:armor", 1.0),
            StatLine("tconstruct:armor_toughness", 0.65)
        ),
        affix("of_the_red_line", "of the Red Line", AffixKind.SUFFIX, "damage_suffix", 90, weaponFamilies, commonTiers, "tconstruct:attack_damage"),
        affix("of_quick_hands", "of Quick Hands", AffixKind.SUFFIX, "speed_suffix", 95, weaponAndBowFamilies, speedTiers, "tconstruct:attack_speed"),
        affix("of_deep_cuts", "of Deep Cuts", AffixKind.SUFFIX, "mining_suffix", 100, headFamilies, commonTiers, "tconstruct:mining_speed"),
        affix("of_long_service", "of Long Service", AffixKind.SUFFIX, "durability_suffix", 135, allFamilies, commonTiers, "tconstruct:durability"),
        affix("of_the_still_breath", "of the Still Breath", AffixKind.SUFFIX, "draw_suffix", 90, setOf(PartFamily.BOW), speedTiers, "tconstruct:draw_speed"),
        affix("of_sure_arcs", "of Sure Arcs", AffixKind.SUFFIX, "projectile_suffix", 95, rangedFamilies, commonTiers, "tconstruct:projectile_damage"),
        affix("of_interlocked_rings", "of Interlocked Rings", AffixKind.SUFFIX, "armor_suffix", 110, armorFamilies + PartFamily.ARMOR, defenseTiers, "tconstruct:armor"),
        affix("of_the_anchor", "of the Anchor", AffixKind.SUFFIX, "knockback_suffix", 85, setOf(PartFamily.ARMOR, PartFamily.HANDLE, PartFamily.SHIELD), defenseTiers, "tconstruct:knockback_resistance"),
        affix(
            "of_blood_and_breath",
            "of Blood and Breath",
            AffixKind.SUFFIX,
            "damage_durability_suffix",
            34,
            weaponFamilies,
            hybridTiers,
            StatLine("tconstruct:attack_damage", 0.8),
            StatLine("tconstruct:durability", 0.9)
        ),
        affix(
            "of_clean_geometry",
            "of Clean Geometry",
            AffixKind.SUFFIX,
            "mining_speed_suffix",
            38,
            setOf(PartFamily.TOOL_HEAD, PartFamily.BINDING),
            hybridTiers,
            StatLine("tconstruct:mining_speed", 0.85),
            StatLine("tconstruct:attack_speed", 0.45)
        ),
        affix(
            "of_bound_plates",
            "of Bound Plates",
            AffixKind.SUFFIX,
            "armor_knockback_suffix",
            40,
            setOf(PartFamily.ARMOR, PartFamily.SHIELD),
            hybridTiers,
            StatLine("tconstruct:armor", 0.75),
            StatLine("tconstruct:knockback_resistance", 0.9)
        ),
        affix(
            "of_the_taut_string",
            "of the Taut String",
            AffixKind.SUFFIX,
            "bow_speed_suffix",
            42,
            rangedFamilies,
            hybridTiers,
            StatLine("tconstruct:draw_speed", 0.8),
            StatLine("tconstruct:attack_speed", 0.55)
        ),
        affix("gravehook", "Gravehook", AffixKind.PREFIX, "magnetic", 58, setOf(PartFamily.TOOL_HEAD, PartFamily.HANDLE, PartFamily.BINDING), hybridTiers, modifier("tconstruct:magnetic")),
        affix("charward", "Charward", AffixKind.PREFIX, "autosmelt", 38, setOf(PartFamily.TOOL_HEAD), hybridTiers, modifier("tconstruct:autosmelt")),
        affix("waycleaver", "Waycleaver", AffixKind.PREFIX, "exchanging", 34, setOf(PartFamily.TOOL_HEAD, PartFamily.BINDING), hybridTiers, modifier("tconstruct:exchanging")),
        affix("sundercall", "Sundercall", AffixKind.PREFIX, "severing", 46, setOf(PartFamily.MELEE_HEAD), hybridTiers, modifier("tconstruct:severing")),
        affix("red_lantern", "Red Lantern", AffixKind.PREFIX, "sweeping", 42, setOf(PartFamily.MELEE_HEAD), hybridTiers, modifier("tconstruct:sweeping_edge")),
        affix("gorepoint", "Gorepoint", AffixKind.PREFIX, "piercing", 45, setOf(PartFamily.MELEE_HEAD, PartFamily.RANGED), hybridTiers, modifier("tconstruct:piercing")),
        affix("emberspite", "Emberspite", AffixKind.PREFIX, "fiery", 48, setOf(PartFamily.MELEE_HEAD, PartFamily.RANGED), hybridTiers, modifier("tconstruct:fiery")),
        affix("frostwrit", "Frostwrit", AffixKind.PREFIX, "freezing", 43, rangedFamilies, hybridTiers, modifier("tconstruct:freezing")),
        affix("graveglass", "Graveglass", AffixKind.PREFIX, "scope", 37, rangedFamilies, hybridTiers, modifier("tconstruct:scope")),
        affix("left_hand_lesson", "Left-Hand Lesson", AffixKind.PREFIX, "sinistral", 35, rangedFamilies, hybridTiers, modifier("tconstruct:sinistral")),
        affix("quarry_echo", "Quarry Echo", AffixKind.PREFIX, "momentum", 50, setOf(PartFamily.TOOL_HEAD, PartFamily.HANDLE), hybridTiers, modifier("tconstruct:momentum")),
        affix("deep_choir", "Deep Choir", AffixKind.PREFIX, "dwarven", 36, setOf(PartFamily.TOOL_HEAD), hybridTiers, modifier("tconstruct:dwarven")),
        affix("skywake", "Skywake", AffixKind.PREFIX, "double_jump", 30, setOf(PartFamily.ARMOR), hybridTiers, modifier("tconstruct:double_jump")),
        affix("gravebound", "Gravebound", AffixKind.PREFIX, "bouncy", 28, setOf(PartFamily.ARMOR), hybridTiers, modifier("tconstruct:bouncy")),
        affix("heelspur", "Heelspur", AffixKind.PREFIX, "soulspeed", 32, setOf(PartFamily.ARMOR), hybridTiers, modifier("tconstruct:soulspeed")),
        affix("mirror_ward", "Mirror Ward", AffixKind.PREFIX, "reflecting", 27, armorFamilies, hybridTiers, modifier("tconstruct:reflecting")),
        affix("bulwark_latch", "Bulwark Latch", AffixKind.PREFIX, "shield_strap", 40, setOf(PartFamily.SHIELD), hybridTiers, modifier("tconstruct:shield_strap")),
        affix("duelers_reflex", "Dueler's Reflex", AffixKind.PREFIX, "offhand", 33, setOf(PartFamily.HANDLE, PartFamily.SHIELD), hybridTiers, modifier("tconstruct:offhand_attack")),
        affix("of_the_bone_rack", "of the Bone Rack", AffixKind.SUFFIX, "tool_magnet_suffix", 54, setOf(PartFamily.TOOL_HEAD, PartFamily.HANDLE), hybridTiers, modifier("tconstruct:magnetic")),
        affix("of_live_coals", "of Live Coals", AffixKind.SUFFIX, "tool_fire_suffix", 41, setOf(PartFamily.MELEE_HEAD, PartFamily.RANGED), hybridTiers, modifier("tconstruct:fiery")),
        affix("of_the_white_rime", "of the White Rime", AffixKind.SUFFIX, "ranged_ice_suffix", 39, rangedFamilies, hybridTiers, modifier("tconstruct:freezing")),
        affix("of_split_routes", "of Split Routes", AffixKind.SUFFIX, "offhand_suffix", 31, setOf(PartFamily.HANDLE, PartFamily.BINDING), hybridTiers, modifier("tconstruct:offhand_attack")),
        affix("of_trophy_cables", "of Trophy Cables", AffixKind.SUFFIX, "ranged_scope_suffix", 34, rangedFamilies, hybridTiers, modifier("tconstruct:scope")),
        affix("of_the_ash_path", "of the Ash Path", AffixKind.SUFFIX, "tool_route_suffix", 29, setOf(PartFamily.TOOL_HEAD, PartFamily.BINDING), hybridTiers, modifier("tconstruct:exchanging")),
        affix("of_held_breath", "of Held Breath", AffixKind.SUFFIX, "armor_air_suffix", 26, setOf(PartFamily.ARMOR), hybridTiers, modifier("tconstruct:double_jump")),
        affix("of_the_vaulted_shoulder", "of the Vaulted Shoulder", AffixKind.SUFFIX, "armor_guard_suffix", 25, armorFamilies, hybridTiers, modifier("tconstruct:reflecting"))
    )

    private val statDisplayNames = mapOf(
        "tconstruct:durability" to "Durability",
        "tconstruct:attack_damage" to "Attack Damage",
        "tconstruct:attack_speed" to "Attack Speed",
        "tconstruct:mining_speed" to "Mining Speed",
        "tconstruct:projectile_damage" to "Projectile Damage",
        "tconstruct:draw_speed" to "Draw Speed",
        "tconstruct:armor" to "Armor",
        "tconstruct:armor_toughness" to "Armor Toughness",
        "tconstruct:knockback_resistance" to "Knockback Resistance"
    )

    private val modifierDisplayNames = mapOf(
        "tconstruct:magnetic" to "Magnetic",
        "tconstruct:autosmelt" to "Autosmelt",
        "tconstruct:exchanging" to "Exchanging",
        "tconstruct:severing" to "Severing",
        "tconstruct:sweeping_edge" to "Sweeping Edge",
        "tconstruct:piercing" to "Piercing",
        "tconstruct:fiery" to "Fiery",
        "tconstruct:freezing" to "Freezing",
        "tconstruct:scope" to "Scope",
        "tconstruct:sinistral" to "Sinistral",
        "tconstruct:momentum" to "Momentum",
        "tconstruct:dwarven" to "Dwarven",
        "tconstruct:double_jump" to "Double Jump",
        "tconstruct:bouncy" to "Bouncy",
        "tconstruct:soulspeed" to "Soul Speed",
        "tconstruct:reflecting" to "Reflecting",
        "tconstruct:shield_strap" to "Shield Strap",
        "tconstruct:offhand_attack" to "Offhand Attack"
    )

    fun rollAffixedPart(random: RandomSource): ItemStack? {
        if (!ModList.get().isLoaded(TCON_MODID)) return null
        val candidates = partProfiles.mapNotNull { profile ->
            val item = ForgeRegistries.ITEMS.getValue(ResourceLocation.tryParse(profile.itemId) ?: return@mapNotNull null)
                ?.takeUnless { it.defaultInstance.isEmpty }
                ?: return@mapNotNull null
            profile to item
        }
        if (candidates.isEmpty()) return null

        val (profile, item) = weightedPick(candidates, random) { it.first.weight } ?: return null
        val stack = ItemStack(item)
        val sourcePart = ForgeRegistries.ITEMS.getKey(stack.item)?.toString() ?: profile.itemId
        val affixes = rollAffixes(sourcePart, profile.family, random)
        writeToolAffixes(stack, affixes)
        applyMultipliers(stack, affixes)
        return stack
    }

    @SubscribeEvent
    fun onItemCrafted(event: PlayerEvent.ItemCraftedEvent) {
        if (!ModList.get().isLoaded(TCON_MODID)) return
        val result = event.crafting
        if (!looksLikeTConTool(result)) return
        transferAffixes(result, collectInputStacks(event.inventory))
    }

    @SubscribeEvent
    fun onTooltip(event: ItemTooltipEvent) {
        val affixes = existingToolAffixes(event.itemStack)
        if (affixes.isEmpty()) return
        event.toolTip += Component.translatable("tooltip.dimensiondrink.affixes").withStyle(ChatFormatting.DARK_RED)
        affixes.forEach { affix ->
            event.toolTip += Component.literal(formatAffixLine(affix)).withStyle(
                if (affix.getString("kind") == AffixKind.PREFIX.id) ChatFormatting.RED else ChatFormatting.LIGHT_PURPLE
            )
        }
    }

    internal fun rollAffixes(sourcePart: String, family: PartFamily, random: RandomSource): List<CompoundTag> {
        val targetCount = affixCountForRoll(random.nextFloat())
        val chosen = mutableListOf<AffixDefinition>()
        var prefixCount = 0
        var suffixCount = 0

        repeat(targetCount * 8) {
            if (chosen.size >= targetCount) return@repeat
            val usedGroups = chosen.map { it.group }.toSet()
            val candidates = affixPool.filter { definition ->
                definition.allows(family) &&
                    definition.group !in usedGroups &&
                    when (definition.kind) {
                        AffixKind.PREFIX -> prefixCount < MAX_PREFIXES
                        AffixKind.SUFFIX -> suffixCount < MAX_SUFFIXES
                    }
            }
            val definition = weightedPick(candidates, random) { it.weight } ?: return@repeat
            chosen += definition
            when (definition.kind) {
                AffixKind.PREFIX -> prefixCount++
                AffixKind.SUFFIX -> suffixCount++
            }
        }

        return chosen.map { definition ->
            val tier = weightedPick(definition.tiers, random) { it.weight } ?: definition.tiers.last()
            createAffix(definition, tier, sourcePart, random)
        }
    }

    internal fun affixCountForRoll(roll: Float): Int {
        return when {
            roll < 0.03f -> 6
            roll < 0.10f -> 5
            roll < 0.25f -> 4
            roll < 0.50f -> 3
            roll < 0.78f -> 2
            else -> 1
        }
    }

    internal fun createAffix(stat: String, percent: Double, sourcePart: String): CompoundTag {
        return CompoundTag().apply {
            putString("id", "legacy:$stat")
            putString("name", statDisplayName(stat))
            putString("kind", AffixKind.PREFIX.id)
            putString("tier_name", "legacy")
            putInt("tier", 0)
            putString("source_part", sourcePart)
            putString("stat", stat)
            putDouble("percent", percent)
            put("rolls", rollList(listOf(stat to percent)))
        }
    }

    internal fun createAffix(definition: AffixDefinition, tier: Tier, sourcePart: String, random: RandomSource): CompoundTag {
        val rolls = definition.stats.map { line ->
            val percent = randomPercent(random, tier.minPercent, tier.maxPercent) * line.scale
            line.stat to percent
        }
        return CompoundTag().apply {
            putString("id", definition.id)
            putString("name", definition.name)
            putString("kind", definition.kind.id)
            putString("group", definition.group)
            putString("tier_name", tier.name)
            putInt("tier", tier.rank)
            putString("source_part", sourcePart)
            if (rolls.size == 1) {
                putString("stat", rolls.single().first)
                putDouble("percent", rolls.single().second)
            }
            put("rolls", rollList(rolls))
            if (definition.modifiers.isNotEmpty()) {
                put("modifier_grants", modifierList(definition.modifiers))
            }
        }
    }

    internal fun transferAffixes(result: ItemStack, inputs: Iterable<ItemStack>): Boolean {
        val previousMultipliers = currentTConMultipliers(result)
        val existingAffixes = existingToolAffixes(result)
        val inputAffixes = inputs
            .filterNot(::looksLikeTConTool)
            .flatMap(::existingToolAffixes)
        if (inputAffixes.isEmpty()) return false

        val merged = mergeAffixes(existingAffixes, inputAffixes)
        writeToolAffixes(result, merged)
        applyGrantedModifiers(result, existingAffixes, merged)
        applyMultipliers(result, merged)
        refreshTConTool(result, previousMultipliers)
        return true
    }

    internal fun mergeAffixes(existing: List<CompoundTag>, input: List<CompoundTag>): List<CompoundTag> {
        val replacingParts = input.mapNotNull { it.getString("source_part").takeIf(String::isNotBlank) }.toSet()
        return buildList {
            existing
                .filterNot { it.getString("source_part") in replacingParts }
                .forEach { add(it.copy()) }
            input.forEach { add(it.copy()) }
        }
    }

    internal fun multiplierTag(affixes: List<CompoundTag>): CompoundTag {
        return CompoundTag().apply {
            affixes
                .flatMap(::rolls)
                .groupBy { it.first }
                .forEach { (stat, statRolls) ->
                    val multiplier = statRolls.fold(1.0) { acc, (_, percent) -> acc * (1.0 + percent) }
                    putFloat(stat, multiplier.toFloat())
                }
        }
    }

    private fun collectInputStacks(inventory: Container): List<ItemStack> {
        val stacks = mutableListOf<ItemStack>()
        for (slot in 0 until inventory.containerSize) {
            stacks += inventory.getItem(slot)
        }
        return stacks
    }

    internal fun existingToolAffixes(stack: ItemStack): List<CompoundTag> {
        val tag = stack.tag ?: return emptyList()
        if (!tag.contains(AFFIXES_TAG, Tag.TAG_LIST.toInt())) return emptyList()
        val list = tag.getList(AFFIXES_TAG, Tag.TAG_COMPOUND.toInt())
        return buildList {
            for (index in 0 until list.size) {
                add(list.getCompound(index).copy())
            }
        }
    }

    internal fun writeToolAffixes(stack: ItemStack, affixes: List<CompoundTag>) {
        val list = ListTag()
        affixes.forEach { list.add(it.copy()) }
        stack.orCreateTag.put(AFFIXES_TAG, list)
    }

    internal fun applyMultipliers(stack: ItemStack, affixes: List<CompoundTag>) {
        val tag = stack.orCreateTag
        val multipliers = multiplierTag(affixes)
        if (multipliers.isEmpty) {
            tag.remove(TIC_MULTIPLIERS_TAG)
        } else {
            tag.put(TIC_MULTIPLIERS_TAG, multipliers)
        }
    }

    internal fun grantedModifiers(affix: CompoundTag): List<ModifierGrant> {
        if (!affix.contains("modifier_grants", Tag.TAG_LIST.toInt())) return emptyList()
        val list = affix.getList("modifier_grants", Tag.TAG_COMPOUND.toInt())
        return buildList {
            for (index in 0 until list.size) {
                val entry = list.getCompound(index)
                val id = entry.getString("id")
                val level = entry.getInt("level")
                if (id.isNotBlank() && level > 0) {
                    add(ModifierGrant(id, level))
                }
            }
        }
    }

    internal fun aggregateGrantedModifierLevels(affixes: List<CompoundTag>): Map<String, Int> {
        return buildMap {
            affixes.flatMap(::grantedModifiers).forEach { grant ->
                put(grant.id, (get(grant.id) ?: 0) + grant.level)
            }
        }
    }

    internal fun applyGrantedModifiers(stack: ItemStack, previousAffixes: List<CompoundTag>, nextAffixes: List<CompoundTag>) {
        if (!looksLikeTConTool(stack)) return
        val previous = aggregateGrantedModifierLevels(previousAffixes)
        val next = aggregateGrantedModifierLevels(nextAffixes)
        if (previous.isEmpty() && next.isEmpty()) return

        val tool = ToolStack.from(stack)
        (previous.keys + next.keys).forEach { id ->
            val modifierId = ModifierId.tryParse(id) ?: return@forEach
            val currentLevel = tool.getUpgrades().getLevel(modifierId)
            val targetLevel = next[id] ?: 0
            when {
                targetLevel > currentLevel -> tool.addModifier(modifierId, targetLevel - currentLevel)
                targetLevel < currentLevel -> tool.removeModifier(modifierId, currentLevel - targetLevel)
            }
        }
    }

    internal fun rolls(affix: CompoundTag): List<Pair<String, Double>> {
        if (affix.contains("rolls", Tag.TAG_LIST.toInt())) {
            val list = affix.getList("rolls", Tag.TAG_COMPOUND.toInt())
            return buildList {
                for (index in 0 until list.size) {
                    val roll = list.getCompound(index)
                    add(roll.getString("stat") to roll.getDouble("percent"))
                }
            }
        }
        val stat = affix.getString("stat")
        if (stat.isBlank()) return emptyList()
        return listOf(stat to affix.getDouble("percent"))
    }

    internal fun definition(id: String): AffixDefinition? = affixPool.firstOrNull { it.id == id }

    internal fun looksLikeTConTool(stack: ItemStack): Boolean {
        if (stack.isEmpty) return false
        val tag = stack.tag ?: return false
        return tag.contains(TIC_MATERIALS_TAG, Tag.TAG_LIST.toInt()) || tag.contains(TIC_STATS_TAG, Tag.TAG_COMPOUND.toInt())
    }

    internal fun refreshTConTool(stack: ItemStack) {
        refreshTConTool(stack, CompoundTag())
    }

    internal fun refreshTConTool(stack: ItemStack, previousMultipliers: CompoundTag) {
        if (!looksLikeTConTool(stack)) return
        val tag = stack.tag ?: return
        if (!tag.contains(TIC_STATS_TAG, Tag.TAG_COMPOUND.toInt())) return

        val stats = tag.getCompound(TIC_STATS_TAG).copy()
        val nextMultipliers = currentTConMultipliers(stack)
        val statKeys = (previousMultipliers.allKeys + nextMultipliers.allKeys).toSet()
        statKeys.forEach { stat ->
            if (!stats.contains(stat, Tag.TAG_ANY_NUMERIC.toInt())) return@forEach
            val raw = stats.getFloat(stat)
            val previous = previousMultipliers.getFloat(stat).takeUnless { it == 0.0f } ?: 1.0f
            val next = nextMultipliers.getFloat(stat).takeUnless { it == 0.0f } ?: 1.0f
            stats.putFloat(stat, (raw / previous) * next)
        }
        tag.put(TIC_STATS_TAG, stats)
    }

    internal fun currentTConMultipliers(stack: ItemStack): CompoundTag {
        val tag = stack.tag ?: return CompoundTag()
        if (!tag.contains(TIC_MULTIPLIERS_TAG, Tag.TAG_COMPOUND.toInt())) return CompoundTag()
        return tag.getCompound(TIC_MULTIPLIERS_TAG).copy()
    }

    private fun affix(
        id: String,
        name: String,
        kind: AffixKind,
        group: String,
        weight: Int,
        families: Set<PartFamily>,
        tiers: List<Tier>,
        stat: String
    ): AffixDefinition {
        return affix(id, name, kind, group, weight, families, tiers, StatLine(stat))
    }

    private fun affix(
        id: String,
        name: String,
        kind: AffixKind,
        group: String,
        weight: Int,
        families: Set<PartFamily>,
        tiers: List<Tier>,
        vararg stats: StatLine
    ): AffixDefinition {
        return affix(id, name, kind, group, weight, families, tiers, stats = stats.toList(), modifiers = emptyList())
    }

    private fun affix(
        id: String,
        name: String,
        kind: AffixKind,
        group: String,
        weight: Int,
        families: Set<PartFamily>,
        tiers: List<Tier>,
        vararg modifiers: ModifierGrant
    ): AffixDefinition {
        return affix(id, name, kind, group, weight, families, tiers, stats = emptyList(), modifiers = modifiers.toList())
    }

    private fun affix(
        id: String,
        name: String,
        kind: AffixKind,
        group: String,
        weight: Int,
        families: Set<PartFamily>,
        tiers: List<Tier>,
        stats: List<StatLine>,
        modifiers: List<ModifierGrant>
    ): AffixDefinition {
        require(weight > 0) { "Affix $id must have positive weight" }
        require(stats.isNotEmpty() || modifiers.isNotEmpty()) { "Affix $id must modify stats or grant modifiers" }
        require(tiers.isNotEmpty()) { "Affix $id must have tiers" }
        return AffixDefinition(id, name, kind, group, weight, families, stats, modifiers, tiers)
    }

    private fun modifier(id: String, level: Int = 1): ModifierGrant {
        require(level > 0) { "Modifier $id must have positive level" }
        return ModifierGrant(id, level)
    }

    private fun rollList(rolls: List<Pair<String, Double>>): ListTag {
        return ListTag().apply {
            rolls.forEach { (stat, percent) ->
                add(CompoundTag().apply {
                    putString("stat", stat)
                    putDouble("percent", percent)
                })
            }
        }
    }

    private fun modifierList(modifiers: List<ModifierGrant>): ListTag {
        return ListTag().apply {
            modifiers.forEach { grant ->
                add(CompoundTag().apply {
                    putString("id", grant.id)
                    putInt("level", grant.level)
                })
            }
        }
    }

    private fun rollsDisplay(affix: CompoundTag): String {
        val stats = rolls(affix).map { (stat, percent) ->
            "+${(percent * 100.0).roundToInt()}% ${statDisplayName(stat)}"
        }
        val modifiers = grantedModifiers(affix).map { grant ->
            "${modifierDisplayName(grant.id)} ${romanNumeral(grant.level)}"
        }
        return (stats + modifiers).joinToString(", ")
    }

    private fun formatAffixLine(affix: CompoundTag): String {
        val tier = affix.getInt("tier").takeIf { it > 0 }?.let { "T$it " } ?: ""
        val name = affix.getString("name").ifBlank { "Font Affix" }
        return "$tier$name: ${rollsDisplay(affix)}"
    }

    private fun statDisplayName(stat: String): String {
        return statDisplayNames[stat]
            ?: stat.substringAfter(':')
                .replace('_', ' ')
                .split(' ')
                .joinToString(" ") { word -> word.replaceFirstChar { it.titlecase() } }
    }

    private fun modifierDisplayName(id: String): String {
        return modifierDisplayNames[id]
            ?: id.substringAfter(':')
                .replace('_', ' ')
                .split(' ')
                .joinToString(" ") { word -> word.replaceFirstChar { it.titlecase() } }
    }

    private fun romanNumeral(value: Int): String {
        return when (value.coerceAtLeast(1)) {
            1 -> "I"
            2 -> "II"
            3 -> "III"
            4 -> "IV"
            5 -> "V"
            else -> value.toString()
        }
    }

    private fun randomPercent(random: RandomSource, min: Double, max: Double): Double {
        return min + (random.nextDouble() * (max - min))
    }

    private fun <T> weightedPick(values: List<T>, random: RandomSource, weight: (T) -> Int): T? {
        val totalWeight = values.sumOf { weight(it).coerceAtLeast(0) }
        if (totalWeight <= 0) return null
        var cursor = random.nextInt(totalWeight)
        values.forEach { value ->
            cursor -= weight(value).coerceAtLeast(0)
            if (cursor < 0) return value
        }
        return values.lastOrNull()
    }
}

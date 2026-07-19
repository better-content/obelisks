package io.github.tconaffixes

import net.minecraft.resources.ResourceLocation
import net.minecraft.world.entity.Mob
import net.minecraft.world.entity.item.ItemEntity
import net.minecraft.world.level.storage.loot.LootPool
import net.minecraft.world.level.storage.loot.entries.LootItem
import net.minecraft.world.level.storage.loot.predicates.LootItemRandomChanceCondition
import net.minecraft.world.level.storage.loot.providers.number.ConstantValue
import net.minecraftforge.event.LootTableLoadEvent
import net.minecraftforge.event.entity.living.LivingDropsEvent
import net.minecraftforge.eventbus.api.SubscribeEvent

object GlobalAffixLoot {
    private const val HOSTILE_DROP_CHANCE = 0.01f
    private const val CHEST_CACHE_CHANCE = 0.03f

    @SubscribeEvent
    fun onLivingDrops(event: LivingDropsEvent) {
        val level = event.entity.level()
        if (level.isClientSide || event.entity !is Mob || event.entity.type.category != net.minecraft.world.entity.MobCategory.MONSTER) return
        if (level.random.nextFloat() >= HOSTILE_DROP_CHANCE) return
        val part = TConAffixRewards.rollAffixedPart(level.random) ?: return
        event.drops += ItemEntity(level, event.entity.x, event.entity.y, event.entity.z, part)
    }

    @SubscribeEvent
    fun onLootTableLoad(event: LootTableLoadEvent) {
        val id: ResourceLocation = event.name
        if (!id.path.startsWith("chests/")) return
        event.table.addPool(
            LootPool.lootPool()
                .name("tconaffixes:affixed_part_cache")
                .setRolls(ConstantValue.exactly(1f))
                .`when`(LootItemRandomChanceCondition.randomChance(CHEST_CACHE_CHANCE))
                .add(LootItem.lootTableItem(AffixItems.CACHE.get()))
                .build()
        )
    }
}

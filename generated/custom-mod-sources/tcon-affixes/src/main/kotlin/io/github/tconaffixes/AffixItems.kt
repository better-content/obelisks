package io.github.tconaffixes

import net.minecraft.server.level.ServerPlayer
import net.minecraft.sounds.SoundEvents
import net.minecraft.sounds.SoundSource
import net.minecraft.world.InteractionHand
import net.minecraft.world.InteractionResultHolder
import net.minecraft.world.entity.player.Player
import net.minecraft.world.item.Item
import net.minecraft.world.item.ItemStack
import net.minecraft.world.level.Level
import net.minecraftforge.registries.DeferredRegister
import net.minecraftforge.registries.ForgeRegistries
import net.minecraftforge.registries.RegistryObject

object AffixItems {
    val REGISTRY: DeferredRegister<Item> = DeferredRegister.create(ForgeRegistries.ITEMS, TConAffixesMod.MOD_ID)
    val CACHE: RegistryObject<Item> = REGISTRY.register("affixed_part_cache") { AffixedPartCacheItem() }
}

private class AffixedPartCacheItem : Item(Properties().stacksTo(16)) {
    override fun use(level: Level, player: Player, hand: InteractionHand): InteractionResultHolder<ItemStack> {
        val held = player.getItemInHand(hand)
        if (level.isClientSide) return InteractionResultHolder.sidedSuccess(held, true)

        val reward = TConAffixRewards.rollAffixedPart(level.random)
            ?: return InteractionResultHolder.fail(held)
        held.shrink(1)
        val serverPlayer = player as ServerPlayer
        if (!serverPlayer.inventory.add(reward)) {
            serverPlayer.drop(reward, false)
        }
        level.playSound(null, player.blockPosition(), SoundEvents.BUNDLE_DROP_CONTENTS, SoundSource.PLAYERS, 0.65f, 1.05f)
        return InteractionResultHolder.consume(held)
    }
}

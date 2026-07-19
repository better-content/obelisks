package io.github.tconaffixes

import net.minecraftforge.common.MinecraftForge
import net.minecraftforge.fml.common.Mod
import net.minecraftforge.fml.javafmlmod.FMLJavaModLoadingContext

@Mod(TConAffixesMod.MOD_ID)
class TConAffixesMod {
    init {
        AffixItems.REGISTRY.register(FMLJavaModLoadingContext.get().modEventBus)
        MinecraftForge.EVENT_BUS.register(TConAffixRewards)
        MinecraftForge.EVENT_BUS.register(GlobalAffixLoot)
    }

    companion object {
        const val MOD_ID = "tconaffixes"
    }
}

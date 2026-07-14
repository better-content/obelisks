// MoreJS brewing registry edits: vanilla reagents are not the discovery layer.
// Potions are finished from food-derived extracts produced by kitchen/kettle/keg recipes.

var BcPotions = Java.loadClass('net.minecraft.world.item.alchemy.Potions')

MoreJSEvents.registerPotionBrewing(function (event) {
    var removals = [
        [BcPotions.WATER, 'minecraft:nether_wart', BcPotions.AWKWARD],
        ['minecraft:sugar', BcPotions.SWIFTNESS],
        ['minecraft:golden_carrot', BcPotions.NIGHT_VISION],
        ['minecraft:pufferfish', BcPotions.WATER_BREATHING],
        ['minecraft:magma_cream', BcPotions.FIRE_RESISTANCE],
        ['minecraft:ghast_tear', BcPotions.REGENERATION],
        ['minecraft:blaze_powder', BcPotions.STRENGTH],
        ['minecraft:spider_eye', BcPotions.POISON],
        ['minecraft:rabbit_foot', BcPotions.LEAPING],
        ['minecraft:glistering_melon_slice', BcPotions.HEALING],
        ['minecraft:phantom_membrane', BcPotions.SLOW_FALLING],
        ['minecraft:turtle_helmet', BcPotions.TURTLE_MASTER]
    ]

    for (var i = 0; i < removals.length; i++) {
        if (removals[i].length === 3) {
            event.removeByPotion(removals[i][0], Ingredient.of(removals[i][1]), removals[i][2])
        } else {
            event.removeByPotion(BcPotions.AWKWARD, Ingredient.of(removals[i][0]), removals[i][1])
        }
    }

    var corruptions = [
        [BcPotions.WATER, BcPotions.WEAKNESS],
        [BcPotions.AWKWARD, BcPotions.WEAKNESS],
        [BcPotions.NIGHT_VISION, BcPotions.INVISIBILITY],
        [BcPotions.SWIFTNESS, BcPotions.SLOWNESS],
        [BcPotions.LEAPING, BcPotions.SLOWNESS],
        [BcPotions.HEALING, BcPotions.HARMING],
        [BcPotions.POISON, BcPotions.HARMING]
    ]

    for (var c = 0; c < corruptions.length; c++) {
        event.removeByPotion(corruptions[c][0], Ingredient.of('minecraft:fermented_spider_eye'), corruptions[c][1])
    }

    event.addPotionBrewing(Ingredient.of('kubejs:stabilized_reagent'), BcPotions.WATER, BcPotions.AWKWARD)
    event.addPotionBrewing(Ingredient.of('kubejs:caffeine_extract'), BcPotions.AWKWARD, BcPotions.SWIFTNESS)
    event.addPotionBrewing(Ingredient.of('kubejs:vision_extract'), BcPotions.AWKWARD, BcPotions.NIGHT_VISION)
    event.addPotionBrewing(Ingredient.of('kubejs:brine_extract'), BcPotions.AWKWARD, BcPotions.WATER_BREATHING)
    event.addPotionBrewing(Ingredient.of('kubejs:heatproof_extract'), BcPotions.AWKWARD, BcPotions.FIRE_RESISTANCE)
    event.addPotionBrewing(Ingredient.of('kubejs:rose_hip_extract'), BcPotions.AWKWARD, BcPotions.REGENERATION)
    event.addPotionBrewing(Ingredient.of('kubejs:fermented_pomegranate_extract'), BcPotions.AWKWARD, BcPotions.STRENGTH)
    event.addPotionBrewing(Ingredient.of('kubejs:toxic_extract'), BcPotions.AWKWARD, BcPotions.POISON)
    event.addPotionBrewing(Ingredient.of('kubejs:leaping_extract'), BcPotions.AWKWARD, BcPotions.LEAPING)
    event.addPotionBrewing(Ingredient.of('kubejs:melon_life_extract'), BcPotions.AWKWARD, BcPotions.HEALING)
    event.addPotionBrewing(Ingredient.of('kubejs:featherlight_extract'), BcPotions.AWKWARD, BcPotions.SLOW_FALLING)
    event.addPotionBrewing(Ingredient.of('kubejs:turtle_guard_extract'), BcPotions.AWKWARD, BcPotions.TURTLE_MASTER)
    event.addPotionBrewing(Ingredient.of('kubejs:weakening_extract'), BcPotions.WATER, BcPotions.WEAKNESS)
    event.addPotionBrewing(Ingredient.of('kubejs:weakening_extract'), BcPotions.AWKWARD, BcPotions.WEAKNESS)
    event.addPotionBrewing(Ingredient.of('kubejs:shadow_extract'), BcPotions.NIGHT_VISION, BcPotions.INVISIBILITY)
    event.addPotionBrewing(Ingredient.of('kubejs:slowness_extract'), BcPotions.SWIFTNESS, BcPotions.SLOWNESS)
    event.addPotionBrewing(Ingredient.of('kubejs:slowness_extract'), BcPotions.LEAPING, BcPotions.SLOWNESS)
    event.addPotionBrewing(Ingredient.of('kubejs:harm_extract'), BcPotions.HEALING, BcPotions.HARMING)
    event.addPotionBrewing(Ingredient.of('kubejs:harm_extract'), BcPotions.POISON, BcPotions.HARMING)
})

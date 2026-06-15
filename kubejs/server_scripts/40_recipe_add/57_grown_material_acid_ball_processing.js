// Grown material chemistry mirrors Realistic Ores: solvent selects extract family,
// grinding media selects recovery bias. These routes make farms and animal loops
// feed chemistry without turning them into simple grid shortcuts.

var BTM_GROWN_MATERIALS = [
    { id: 'wheat_starch', input: 'minecraft:wheat', primary: 'minecraft:sugar', ethanol: 'chemlib:carbon', acetic: 'chemlib:carbon_dioxide', sulfuric: 'chemlib:sulfur', hydrochloric: 'chemlib:hydrogen', nitric: 'chemlib:nitrogen', phosphoric: 'chemlib:phosphorus', gangue: 'minecraft:wheat_seeds', ferrous: 'chemlib:iron', nonferrous: 'chemlib:potassium', hard: 'chemlib:magnesium', rare: 'chemlib:phosphorus', blood: 'minecraft:bone_meal', ae: 'chemlib:silicon', trace: 'chemlib:potassium' },
    { id: 'potato_starch', input: 'minecraft:potato', primary: 'minecraft:sugar', ethanol: 'chemlib:carbon', acetic: 'chemlib:carbon_dioxide', sulfuric: 'chemlib:sulfur', hydrochloric: 'chemlib:chlorine', nitric: 'chemlib:nitrogen', phosphoric: 'chemlib:phosphorus', gangue: 'minecraft:poisonous_potato', ferrous: 'chemlib:iron', nonferrous: 'chemlib:potassium', hard: 'chemlib:magnesium', rare: 'chemlib:phosphorus', blood: 'minecraft:bone_meal', ae: 'chemlib:silicon', trace: 'chemlib:potassium' },
    { id: 'carrot_root', input: 'minecraft:carrot', primary: 'minecraft:orange_dye', ethanol: 'minecraft:sugar', acetic: 'chemlib:carbon', sulfuric: 'chemlib:sulfur', hydrochloric: 'chemlib:chlorine', nitric: 'chemlib:nitrogen', phosphoric: 'chemlib:phosphorus', gangue: 'minecraft:bone_meal', ferrous: 'chemlib:iron', nonferrous: 'chemlib:potassium', hard: 'chemlib:magnesium', rare: 'minecraft:gold_nugget', blood: 'minecraft:redstone', ae: 'chemlib:silicon', trace: 'chemlib:potassium' },
    { id: 'beet_sugar_pigment', input: 'minecraft:beetroot', primary: 'minecraft:red_dye', ethanol: 'minecraft:sugar', acetic: 'chemlib:carbon', sulfuric: 'chemlib:sulfur', hydrochloric: 'chemlib:chlorine', nitric: 'chemlib:nitrogen', phosphoric: 'chemlib:phosphorus', gangue: 'minecraft:beetroot_seeds', ferrous: 'chemlib:iron', nonferrous: 'chemlib:potassium', hard: 'chemlib:magnesium', rare: 'minecraft:redstone', blood: 'minecraft:redstone', ae: 'chemlib:silicon', trace: 'chemlib:iron' },
    { id: 'sugar_cane_fiber', input: 'minecraft:sugar_cane', primary: 'minecraft:sugar', ethanol: 'minecraft:paper', acetic: 'chemlib:carbon_dioxide', sulfuric: 'chemlib:sulfur', hydrochloric: 'chemlib:hydrogen', nitric: 'chemlib:nitrogen', phosphoric: 'chemlib:phosphorus', gangue: 'minecraft:paper', ferrous: 'chemlib:iron', nonferrous: 'chemlib:potassium', hard: 'chemlib:silicon', rare: 'chemlib:phosphorus', blood: 'minecraft:bone_meal', ae: 'chemlib:silicon', trace: 'chemlib:silicon' },
    { id: 'bamboo_silica', input: 'minecraft:bamboo', primary: 'minecraft:stick', ethanol: 'minecraft:paper', acetic: 'chemlib:carbon', sulfuric: 'chemlib:sulfur', hydrochloric: 'chemlib:silicon_dioxide', nitric: 'chemlib:nitrogen', phosphoric: 'chemlib:phosphorus', gangue: 'minecraft:paper', ferrous: 'chemlib:iron', nonferrous: 'chemlib:potassium', hard: 'chemlib:silicon', rare: 'chemlib:silicon_dioxide', blood: 'minecraft:bone_meal', ae: 'chemlib:silicon', trace: 'chemlib:silicon' },
    { id: 'cactus_mucilage', input: 'minecraft:cactus', primary: 'minecraft:green_dye', ethanol: 'chemlib:carbon', acetic: 'chemlib:carbon_dioxide', sulfuric: 'chemlib:sulfur', hydrochloric: 'chemlib:chlorine', nitric: 'chemlib:nitrogen', phosphoric: 'chemlib:phosphorus', gangue: 'minecraft:green_dye', ferrous: 'chemlib:iron', nonferrous: 'chemlib:potassium', hard: 'chemlib:magnesium', rare: 'minecraft:slime_ball', blood: 'minecraft:bone_meal', ae: 'chemlib:silicon', trace: 'minecraft:slime_ball' },
    { id: 'kelp_iodine_brinery', input: 'minecraft:kelp', primary: 'minecraft:dried_kelp', ethanol: 'chemlib:carbon', acetic: 'chemlib:sodium', sulfuric: 'chemlib:sulfur', hydrochloric: 'chemlib:chlorine', nitric: 'chemlib:nitrogen', phosphoric: 'chemlib:phosphorus', gangue: 'minecraft:dried_kelp', ferrous: 'chemlib:iron', nonferrous: 'chemlib:potassium', hard: 'chemlib:magnesium', rare: 'chemlib:iodine', blood: 'minecraft:bone_meal', ae: 'chemlib:silicon', trace: 'chemlib:sodium' },
    { id: 'cocoa_alkaloids', input: 'minecraft:cocoa_beans', primary: 'minecraft:brown_dye', ethanol: 'minecraft:sugar', acetic: 'chemlib:carbon', sulfuric: 'chemlib:sulfur', hydrochloric: 'chemlib:hydrogen', nitric: 'chemlib:nitrogen', phosphoric: 'chemlib:phosphorus', gangue: 'minecraft:brown_dye', ferrous: 'chemlib:iron', nonferrous: 'chemlib:potassium', hard: 'chemlib:magnesium', rare: 'chemlib:nitrogen', blood: 'minecraft:redstone', ae: 'chemlib:silicon', trace: 'chemlib:nitrogen' },
    { id: 'glow_berry_extract', input: 'minecraft:glow_berries', primary: 'minecraft:glowstone_dust', ethanol: 'minecraft:sugar', acetic: 'chemlib:carbon', sulfuric: 'chemlib:sulfur', hydrochloric: 'chemlib:hydrogen', nitric: 'chemlib:nitrogen', phosphoric: 'chemlib:phosphorus', gangue: 'minecraft:yellow_dye', ferrous: 'chemlib:iron', nonferrous: 'chemlib:potassium', hard: 'chemlib:magnesium', rare: 'minecraft:glowstone_dust', blood: 'minecraft:redstone', ae: 'chemlib:silicon', trace: 'minecraft:glowstone_dust' },
    { id: 'oak_lignin_resin', input: 'minecraft:oak_log', primary: 'minecraft:charcoal', ethanol: 'chemlib:carbon', acetic: 'chemlib:carbon_dioxide', sulfuric: 'chemlib:sulfur', hydrochloric: 'chemlib:hydrogen', nitric: 'chemlib:nitrogen', phosphoric: 'chemlib:phosphorus', gangue: 'minecraft:stick', ferrous: 'chemlib:iron', nonferrous: 'chemlib:potassium', hard: 'chemlib:silicon', rare: 'minecraft:charcoal', blood: 'minecraft:soul_sand', ae: 'chemlib:silicon', trace: 'chemlib:carbon' },
    { id: 'flower_pigments', input: 'minecraft:poppy', primary: 'minecraft:red_dye', ethanol: 'minecraft:red_dye', acetic: 'chemlib:carbon', sulfuric: 'chemlib:sulfur', hydrochloric: 'chemlib:chlorine', nitric: 'chemlib:nitrogen', phosphoric: 'chemlib:phosphorus', gangue: 'minecraft:bone_meal', ferrous: 'chemlib:iron', nonferrous: 'chemlib:potassium', hard: 'chemlib:aluminum', rare: 'minecraft:redstone', blood: 'minecraft:redstone', ae: 'chemlib:silicon', trace: 'chemlib:aluminum' },
    { id: 'mushroom_chitin', input: 'minecraft:brown_mushroom', primary: 'minecraft:brown_dye', ethanol: 'chemlib:carbon', acetic: 'chemlib:carbon_dioxide', sulfuric: 'chemlib:sulfur', hydrochloric: 'chemlib:hydrogen', nitric: 'chemlib:nitrogen', phosphoric: 'chemlib:phosphorus', gangue: 'minecraft:bone_meal', ferrous: 'chemlib:iron', nonferrous: 'chemlib:potassium', hard: 'chemlib:magnesium', rare: 'chemlib:phosphorus', blood: 'minecraft:soul_sand', ae: 'chemlib:silicon', trace: 'chemlib:nitrogen' },
    { id: 'honeycomb_wax', input: 'minecraft:honeycomb', primary: 'minecraft:sugar', ethanol: 'minecraft:honeycomb', acetic: 'chemlib:carbon', sulfuric: 'chemlib:sulfur', hydrochloric: 'chemlib:hydrogen', nitric: 'chemlib:nitrogen', phosphoric: 'chemlib:phosphorus', gangue: 'minecraft:honeycomb', ferrous: 'chemlib:iron', nonferrous: 'chemlib:potassium', hard: 'chemlib:magnesium', rare: 'minecraft:slime_ball', blood: 'minecraft:redstone', ae: 'chemlib:silicon', trace: 'chemlib:carbon' },
    { id: 'meat_protein', input: 'minecraft:beef', primary: 'minecraft:bone_meal', ethanol: 'chemlib:carbon', acetic: 'chemlib:carbon_dioxide', sulfuric: 'chemlib:sulfur', hydrochloric: 'chemlib:hydrogen', nitric: 'chemlib:nitrogen', phosphoric: 'chemlib:phosphorus', gangue: 'minecraft:bone_meal', ferrous: 'chemlib:iron', nonferrous: 'chemlib:potassium', hard: 'chemlib:calcium', rare: 'chemlib:phosphorus', blood: 'minecraft:redstone', ae: 'chemlib:silicon', trace: 'chemlib:nitrogen' },
    { id: 'fish_oils', input: 'minecraft:cod', primary: 'minecraft:bone_meal', ethanol: 'chemlib:carbon', acetic: 'chemlib:sodium', sulfuric: 'chemlib:sulfur', hydrochloric: 'chemlib:chlorine', nitric: 'chemlib:nitrogen', phosphoric: 'chemlib:phosphorus', gangue: 'minecraft:bone_meal', ferrous: 'chemlib:iron', nonferrous: 'chemlib:potassium', hard: 'chemlib:calcium', rare: 'chemlib:phosphorus', blood: 'minecraft:redstone', ae: 'chemlib:silicon', trace: 'chemlib:sodium' },
    { id: 'hide_collagen', input: 'minecraft:leather', primary: 'minecraft:string', ethanol: 'chemlib:carbon', acetic: 'chemlib:carbon_dioxide', sulfuric: 'chemlib:sulfur', hydrochloric: 'chemlib:hydrogen', nitric: 'chemlib:nitrogen', phosphoric: 'chemlib:phosphorus', gangue: 'minecraft:string', ferrous: 'chemlib:iron', nonferrous: 'chemlib:potassium', hard: 'chemlib:calcium', rare: 'minecraft:slime_ball', blood: 'minecraft:redstone', ae: 'chemlib:silicon', trace: 'chemlib:nitrogen' },
    { id: 'bone_mineral', input: 'minecraft:bone', primary: 'minecraft:bone_meal', ethanol: 'chemlib:calcium', acetic: 'chemlib:calcium_carbonate', sulfuric: 'chemlib:calcium_sulfate', hydrochloric: 'chemlib:calcium_chloride', nitric: 'chemlib:calcium_nitrate', phosphoric: 'chemlib:phosphorus', gangue: 'minecraft:bone_meal', ferrous: 'chemlib:iron', nonferrous: 'chemlib:potassium', hard: 'chemlib:calcium', rare: 'chemlib:phosphorus', blood: 'minecraft:redstone', ae: 'chemlib:silicon', trace: 'chemlib:calcium' },
    { id: 'feather_keratin', input: 'minecraft:feather', primary: 'minecraft:string', ethanol: 'chemlib:carbon', acetic: 'chemlib:carbon_dioxide', sulfuric: 'chemlib:sulfur', hydrochloric: 'chemlib:hydrogen', nitric: 'chemlib:nitrogen', phosphoric: 'chemlib:phosphorus', gangue: 'minecraft:string', ferrous: 'chemlib:iron', nonferrous: 'chemlib:potassium', hard: 'chemlib:calcium', rare: 'chemlib:sulfur', blood: 'minecraft:redstone', ae: 'chemlib:silicon', trace: 'chemlib:sulfur' },
    { id: 'venom_rot', input: 'minecraft:spider_eye', primary: 'minecraft:fermented_spider_eye', ethanol: 'chemlib:carbon', acetic: 'chemlib:carbon_dioxide', sulfuric: 'chemlib:sulfur', hydrochloric: 'chemlib:hydrogen', nitric: 'chemlib:nitrogen', phosphoric: 'chemlib:phosphorus', gangue: 'minecraft:fermented_spider_eye', ferrous: 'chemlib:iron', nonferrous: 'chemlib:potassium', hard: 'chemlib:magnesium', rare: 'minecraft:redstone', blood: 'minecraft:redstone', ae: 'chemlib:silicon', trace: 'chemlib:nitrogen' }
]

function btmGrowExists(id) {
    if (!id) return false
    try { return Item.exists(id) } catch (e) { return false }
}

function btmGrowPush(results, id, count, chance) {
    if (!btmGrowExists(id) || results.length >= 6) return
    var result = { item: id }
    if (count && count > 1) result.count = count
    if (chance && chance < 1) result.chance = Math.max(0.01, Math.min(0.99, chance))
    results.push(result)
}

function btmGrowBallProduct(def, ball) {
    if (ball.bias === 'general') return def.trace || def.primary
    return def[ball.bias] || def.trace || def.primary
}

function btmGrowResults(def, solvent, ball) {
    var results = []
    btmGrowPush(results, def.primary, ball.primaryBonus > 0 ? 2 : 1, null)
    btmGrowPush(results, def[solvent.id], 1, solvent.secondary + ball.secondaryBonus)
    btmGrowPush(results, btmGrowBallProduct(def, ball), 1, 0.35 + ball.secondaryBonus)
    btmGrowPush(results, def.trace, 1, solvent.trace + ball.traceBonus)
    var retained = global.BTM_RO_RETENTION[solvent.id][ball.id]
    if (retained && btmGrowExists(ball.item)) results.push({ item: ball.item, chance: retained })
    return results
}

function btmGrowRecipe(event, def, solvent, ball) {
    if (!btmGrowExists(def.input) || !btmGrowExists(ball.item)) return
    var recipe = {
        type: 'create:mixing',
        ingredients: [
            { item: def.input },
            { item: ball.item },
            { fluid: solvent.fluid, amount: solvent.amount }
        ],
        results: btmGrowResults(def, solvent, ball),
        processingTime: solvent.time
    }
    if (!recipe.results.length) return
    if (solvent.heat) recipe.heatRequirement = solvent.heat
    event.custom(recipe).id('kubejs:grown_materials/acid_ball/' + def.id + '/' + solvent.id + '/' + ball.id)
}

ServerEvents.recipes(function (event) {
    if (!global.BTM_RO_SOLVENTS || !global.BTM_RO_BALLS || !global.BTM_RO_RETENTION) return
    for (var d = 0; d < BTM_GROWN_MATERIALS.length; d++) {
        for (var s = 0; s < global.BTM_RO_SOLVENTS.length; s++) {
            for (var b = 0; b < global.BTM_RO_BALLS.length; b++) {
                btmGrowRecipe(event, BTM_GROWN_MATERIALS[d], global.BTM_RO_SOLVENTS[s], global.BTM_RO_BALLS[b])
            }
        }
    }
})

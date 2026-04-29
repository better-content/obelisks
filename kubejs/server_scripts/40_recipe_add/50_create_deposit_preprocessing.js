// Create ore preprocessing for the starter Realistic Ores deposit subset.
// Conceptual chain: deposit -> crushed deposit -> washed concentrate -> TCon/Foundry input.

var BTM_CREATE_DEPOSITS = [
    { id: 'coal_measures', tag: 'kubejs:deposit_blocks/coal_measures', crushed: 'realisticores:crushed_coal_measures', wash: [{ item: 'minecraft:coal', count: 2 }, { item: 'chemlib:carbon', chance: 0.35 }, { item: 'create:crushed_raw_iron', chance: 0.20 }], fluid: 'forge:molten_iron', amount: 90, temp: 800 },
    { id: 'ironstone', tag: 'kubejs:deposit_blocks/ironstone', crushed: 'realisticores:crushed_ironstone', wash: [{ item: 'create:crushed_raw_iron', count: 2 }, { item: 'create:crushed_raw_nickel', chance: 0.40 }, { item: 'chemlib:chromium', chance: 0.18 }], fluid: 'forge:molten_iron', amount: 180, temp: 800 },
    { id: 'copper_sulfide', tag: 'kubejs:deposit_blocks/copper_sulfide', crushed: 'realisticores:crushed_copper_sulfide_ore', wash: [{ item: 'create:crushed_raw_copper', count: 2 }, { item: 'create:crushed_raw_iron', chance: 0.35 }, { item: 'create:crushed_raw_gold', chance: 0.12 }, { item: 'chemlib:sulfur', chance: 0.30 }], fluid: 'forge:molten_copper', amount: 180, temp: 500 },
    { id: 'tin', tag: 'kubejs:deposit_blocks/tin', crushed: 'realisticores:crushed_tin_ore', wash: [{ item: 'create:crushed_raw_tin', count: 2 }, { item: 'minecraft:quartz', chance: 0.40 }, { item: 'chemlib:tungsten', chance: 0.12 }], fluid: 'forge:molten_tin', amount: 180, temp: 225 },
    { id: 'zinc', tag: 'kubejs:deposit_blocks/zinc', crushed: 'realisticores:crushed_zinc_ore', wash: [{ item: 'create:crushed_raw_zinc', count: 2 }, { item: 'create:crushed_raw_lead', chance: 0.30 }, { item: 'chemlib:cadmium', chance: 0.12 }], fluid: 'forge:molten_zinc', amount: 180, temp: 420 },
    { id: 'lead_zinc_vein', tag: 'kubejs:deposit_blocks/lead_zinc_vein', crushed: 'realisticores:crushed_lead_zinc_vein', wash: [{ item: 'create:crushed_raw_lead', count: 2 }, { item: 'create:crushed_raw_zinc', chance: 0.45 }, { item: 'create:crushed_raw_silver', chance: 0.25 }], fluid: 'forge:molten_lead', amount: 180, temp: 420 },
    { id: 'quartz_vein', tag: 'kubejs:deposit_blocks/quartz_vein', crushed: 'realisticores:crushed_quartz_vein', wash: [{ item: 'minecraft:quartz', count: 3 }, { item: 'chemlib:silicon', chance: 0.35 }, { item: 'create:crushed_raw_gold', chance: 0.12 }, { item: 'create:crushed_raw_copper', chance: 0.12 }], fluid: 'forge:molten_quartz', amount: 100, temp: 700 },
    { id: 'bauxite_laterite', tag: 'kubejs:deposit_blocks/bauxite_laterite', crushed: 'realisticores:crushed_bauxite_laterite', wash: [{ item: 'create:crushed_raw_aluminum', count: 2 }, { item: 'create:crushed_raw_iron', chance: 0.35 }, { item: 'create:crushed_raw_nickel', chance: 0.20 }], fluid: 'forge:molten_aluminum', amount: 180, temp: 660 },
    { id: 'nickel_sulfide', tag: 'kubejs:deposit_blocks/nickel_sulfide', crushed: 'realisticores:crushed_nickel_sulfide_ore', wash: [{ item: 'create:crushed_raw_nickel', count: 2 }, { item: 'create:crushed_raw_iron', chance: 0.35 }, { item: 'chemlib:sulfur', chance: 0.35 }, { item: 'chemlib:platinum', chance: 0.08 }], fluid: 'forge:molten_nickel', amount: 180, temp: 700 },
    { id: 'tin_tungsten_greisen', tag: 'kubejs:deposit_blocks/tin_tungsten_greisen', crushed: 'realisticores:crushed_tin_tungsten_greisen', wash: [{ item: 'create:crushed_raw_tin', count: 1 }, { item: 'chemlib:tungsten', count: 1 }, { item: 'chemlib:silicon', chance: 0.35 }], fluid: 'forge:molten_tin', amount: 120, temp: 700 },
    { id: 'titanium_iron_oxide', tag: 'kubejs:deposit_blocks/titanium_iron_oxide', crushed: 'realisticores:crushed_titanium_iron_oxide_ore', wash: [{ item: 'chemlib:titanium', count: 2 }, { item: 'create:crushed_raw_iron', count: 1 }, { item: 'chemlib:oxygen', chance: 0.25 }] },
    { id: 'kimberlite_pipe', tag: 'kubejs:deposit_blocks/kimberlite_pipe', crushed: 'realisticores:crushed_kimberlite_pipe', wash: [{ item: 'chemlib:carbon', count: 2 }, { item: 'minecraft:diamond', chance: 0.18 }, { item: 'chemlib:magnesium', chance: 0.30 }] },
    { id: 'emerald_schist_beryl', tag: 'kubejs:deposit_blocks/emerald_schist_beryl', crushed: 'realisticores:crushed_emerald_schist_beryl_vein', wash: [{ item: 'minecraft:emerald', chance: 0.25 }, { item: 'chemlib:beryllium', count: 1 }, { item: 'chemlib:aluminum', chance: 0.45 }] },
    { id: 'corundum_beryl_vein', tag: 'kubejs:deposit_blocks/corundum_beryl_vein', crushed: 'realisticores:crushed_corundum_beryl_gem_vein', wash: [{ item: 'minecraft:amethyst_shard', count: 2 }, { item: 'chemlib:aluminum', count: 1 }, { item: 'chemlib:beryllium', chance: 0.30 }] },
    { id: 'uranium_ore', tag: 'kubejs:deposit_blocks/uranium_ore', crushed: 'realisticores:crushed_uranium_ore', wash: [{ item: 'chemlib:uranium', count: 2 }, { item: 'chemlib:lead', chance: 0.30 }, { item: 'chemlib:thorium', chance: 0.20 }] },
    { id: 'thorium_ore', tag: 'kubejs:deposit_blocks/thorium_ore', crushed: 'realisticores:crushed_thorium_ore', wash: [{ item: 'chemlib:thorium', count: 2 }, { item: 'chemlib:uranium', chance: 0.20 }, { item: 'chemlib:lead', chance: 0.30 }] },
    { id: 'cupriferous_redbed_redstone_vein', tag: 'kubejs:deposit_blocks/cupriferous_redbed_redstone_vein', crushed: 'realisticores:crushed_cupriferous_redbed_redstone_vein', wash: [{ item: 'minecraft:redstone', count: 3 }, { item: 'create:crushed_raw_copper', chance: 0.55 }, { item: 'create:crushed_raw_iron', chance: 0.25 }] },
    { id: 'lazurite_vein', tag: 'kubejs:deposit_blocks/lazurite_vein', crushed: 'realisticores:crushed_lazurite_vein', wash: [{ item: 'minecraft:lapis_lazuli', count: 3 }, { item: 'chemlib:sodium', chance: 0.35 }, { item: 'chemlib:aluminum', chance: 0.35 }] },
    { id: 'phosphate_rock', tag: 'kubejs:deposit_blocks/phosphate_rock', crushed: 'realisticores:crushed_phosphate_rock', wash: [{ item: 'chemlib:phosphorus', count: 2 }, { item: 'chemlib:calcium', count: 1 }, { item: 'chemlib:oxygen', chance: 0.35 }] },
    { id: 'soul_bearing_black_shale_soulstone_vein', tag: 'kubejs:deposit_blocks/soul_bearing_black_shale_soulstone_vein', crushed: 'realisticores:crushed_soul_bearing_black_shale_soulstone_vein', wash: [{ item: 'chemlib:carbon', count: 2 }, { item: 'minecraft:soul_sand', chance: 0.45 }, { item: 'chemlib:sulfur', chance: 0.30 }] },
    { id: 'sulfur_bearing_pyrite_ore', tag: 'kubejs:deposit_blocks/sulfur_bearing_pyrite_ore', crushed: 'realisticores:crushed_sulfur_bearing_pyrite_ore', wash: [{ item: 'chemlib:sulfur', count: 3 }, { item: 'create:crushed_raw_iron', chance: 0.65 }, { item: 'create:crushed_raw_copper', chance: 0.20 }, { item: 'create:crushed_raw_gold', chance: 0.08 }] }
]
function btmResult(entry) {
    var result = { item: entry.item }
    if (entry.count) result.count = entry.count
    if (entry.chance) result.chance = entry.chance
    return result
}

ServerEvents.recipes(function (event) {
    for (var i = 0; i < BTM_CREATE_DEPOSITS.length; i++) {
        var dep = BTM_CREATE_DEPOSITS[i]

        event.custom({
            type: 'create:crushing',
            ingredients: [{ tag: dep.tag }],
            processingTime: 400,
            results: [
                { item: dep.crushed, count: 2 },
                { item: dep.crushed, chance: 0.50 },
                { item: 'create:experience_nugget', chance: 0.50 },
                { item: 'minecraft:cobbled_deepslate', chance: 0.12 }
            ]
        }).id('kubejs:create/crushing/deposits/' + dep.id)

        var washResults = []
        for (var j = 0; j < dep.wash.length; j++) washResults.push(btmResult(dep.wash[j]))
        event.custom({
            type: 'create:splashing',
            ingredients: [{ item: dep.crushed }],
            results: washResults
        }).id('kubejs:create/splashing/deposits/' + dep.id)

        if (dep.fluid) {
            event.custom({
                type: 'tconstruct:melting',
                ingredient: { item: dep.crushed },
                result: { amount: dep.amount, tag: dep.fluid },
                temperature: dep.temp,
                time: 120
            }).id('kubejs:tconstruct/melting/crushed_deposit/' + dep.id)

            event.custom({
                type: 'tconstruct:ore_melting',
                ingredient: { item: dep.crushed },
                result: { amount: dep.amount + 90, tag: dep.fluid },
                rate: 'metal',
                temperature: dep.temp,
                time: 160
            }).id('kubejs:tconstruct/ore_melting/crushed_deposit/' + dep.id)
        }
    }
})

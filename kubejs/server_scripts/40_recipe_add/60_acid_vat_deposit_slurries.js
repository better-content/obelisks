// Acid Vat dissolver-parity layer for all confirmed Realistic Ores deposits.
// Alchemistry remains reference/compat data; Acid Vat is the authored chemical route.

var BTM_ACID_VAT_DEPOSITS = [
    { id: 'coal_measures', crushed: 'realisticores:crushed_coal_measures', acid: 'chemlib:acetic_acid_fluid', time: 120, results: [{ item: 'chemlib:carbon', count: 16 }, { item: 'chemlib:iron', count: 2 }] },
    { id: 'ironstone', crushed: 'realisticores:crushed_ironstone', acid: 'chemlib:sulfuric_acid_fluid', time: 90, results: [{ item: 'chemlib:iron', count: 18 }, { item: 'chemlib:nickel', count: 4 }, { item: 'chemlib:chromium', count: 2 }] },
    { id: 'copper_sulfide', crushed: 'realisticores:crushed_copper_sulfide_ore', acid: 'chemlib:sulfuric_acid_fluid', time: 90, results: [{ item: 'chemlib:copper', count: 18 }, { item: 'chemlib:iron', count: 4 }, { item: 'chemlib:gold', count: 1 }, { item: 'chemlib:sulfur', count: 6 }] },
    { id: 'tin', crushed: 'realisticores:crushed_tin_ore', acid: 'chemlib:hydrochloric_acid_fluid', time: 110, results: [{ item: 'chemlib:tin', count: 18 }, { item: 'chemlib:silicon', count: 4 }, { item: 'chemlib:tungsten', count: 1 }] },
    { id: 'zinc', crushed: 'realisticores:crushed_zinc_ore', acid: 'chemlib:hydrochloric_acid_fluid', time: 110, results: [{ item: 'chemlib:zinc', count: 18 }, { item: 'chemlib:lead', count: 3 }, { item: 'chemlib:cadmium', count: 1 }] },
    { id: 'lead_zinc_vein', crushed: 'realisticores:crushed_lead_zinc_vein', acid: 'chemlib:nitric_acid_fluid', time: 120, results: [{ item: 'chemlib:lead', count: 18 }, { item: 'chemlib:zinc', count: 6 }, { item: 'chemlib:silver', count: 3 }] },
    { id: 'quartz_vein', crushed: 'realisticores:crushed_quartz_vein', acid: 'chemlib:hydrochloric_acid_fluid', time: 120, results: [{ item: 'chemlib:silicon', count: 16 }, { item: 'chemlib:gold', count: 1 }, { item: 'chemlib:copper', count: 2 }] },
    { id: 'bauxite_laterite', crushed: 'realisticores:crushed_bauxite_laterite', acid: 'chemlib:sulfuric_acid_fluid', time: 130, results: [{ item: 'chemlib:aluminum', count: 18 }, { item: 'chemlib:iron', count: 5 }, { item: 'chemlib:nickel', count: 3 }] },
    { id: 'nickel_sulfide', crushed: 'realisticores:crushed_nickel_sulfide_ore', acid: 'chemlib:sulfuric_acid_fluid', time: 130, results: [{ item: 'chemlib:nickel', count: 18 }, { item: 'chemlib:iron', count: 4 }, { item: 'chemlib:platinum', count: 1 }, { item: 'chemlib:sulfur', count: 6 }] },
    { id: 'tin_tungsten_greisen', crushed: 'realisticores:crushed_tin_tungsten_greisen', acid: 'chemlib:hydrochloric_acid_fluid', time: 140, results: [{ item: 'chemlib:tin', count: 10 }, { item: 'chemlib:tungsten', count: 8 }, { item: 'chemlib:silicon', count: 6 }] },
    { id: 'titanium_iron_oxide', crushed: 'realisticores:crushed_titanium_iron_oxide_ore', acid: 'chemlib:sulfuric_acid_fluid', time: 140, results: [{ item: 'chemlib:titanium', count: 12 }, { item: 'chemlib:iron', count: 10 }, { item: 'chemlib:oxygen', count: 6 }] },
    { id: 'kimberlite_pipe', crushed: 'realisticores:crushed_kimberlite_pipe', acid: 'chemlib:hydrochloric_acid_fluid', time: 160, results: [{ item: 'chemlib:carbon', count: 10 }, { item: 'minecraft:diamond', count: 1 }, { item: 'chemlib:magnesium', count: 4 }, { item: 'chemlib:iron', count: 3 }] },
    { id: 'emerald_schist_beryl', crushed: 'realisticores:crushed_emerald_schist_beryl_vein', acid: 'chemlib:hydrochloric_acid_fluid', time: 160, results: [{ item: 'minecraft:emerald', count: 1 }, { item: 'chemlib:beryllium', count: 5 }, { item: 'chemlib:aluminum', count: 7 }, { item: 'chemlib:silicon', count: 5 }] },
    { id: 'corundum_beryl_vein', crushed: 'realisticores:crushed_corundum_beryl_gem_vein', acid: 'chemlib:hydrochloric_acid_fluid', time: 160, results: [{ item: 'minecraft:amethyst_shard', count: 2 }, { item: 'chemlib:aluminum', count: 10 }, { item: 'chemlib:beryllium', count: 4 }, { item: 'chemlib:oxygen', count: 6 }] },
    { id: 'uranium_ore', crushed: 'realisticores:crushed_uranium_ore', acid: 'chemlib:nitric_acid_fluid', time: 180, results: [{ item: 'chemlib:uranium', count: 14 }, { item: 'chemlib:lead', count: 4 }, { item: 'chemlib:thorium', count: 2 }] },
    { id: 'thorium_ore', crushed: 'realisticores:crushed_thorium_ore', acid: 'chemlib:nitric_acid_fluid', time: 180, results: [{ item: 'chemlib:thorium', count: 14 }, { item: 'chemlib:uranium', count: 2 }, { item: 'chemlib:lead', count: 4 }] },
    { id: 'cupriferous_redbed_redstone_vein', crushed: 'realisticores:crushed_cupriferous_redbed_redstone_vein', acid: 'chemlib:sulfuric_acid_fluid', time: 130, results: [{ item: 'minecraft:redstone', count: 10 }, { item: 'chemlib:copper', count: 8 }, { item: 'chemlib:iron', count: 3 }] },
    { id: 'lazurite_vein', crushed: 'realisticores:crushed_lazurite_vein', acid: 'chemlib:hydrochloric_acid_fluid', time: 130, results: [{ item: 'minecraft:lapis_lazuli', count: 10 }, { item: 'chemlib:sodium', count: 4 }, { item: 'chemlib:aluminum', count: 4 }, { item: 'chemlib:silicon', count: 4 }] },
    { id: 'phosphate_rock', crushed: 'realisticores:crushed_phosphate_rock', acid: 'chemlib:sulfuric_acid_fluid', time: 120, results: [{ item: 'chemlib:phosphorus', count: 12 }, { item: 'chemlib:calcium', count: 8 }, { item: 'chemlib:oxygen', count: 8 }] },
    { id: 'soul_bearing_black_shale_soulstone_vein', crushed: 'realisticores:crushed_soul_bearing_black_shale_soulstone_vein', acid: 'chemlib:acetic_acid_fluid', time: 150, results: [{ item: 'chemlib:carbon', count: 14 }, { item: 'chemlib:sulfur', count: 5 }, { item: 'minecraft:soul_sand', count: 2 }] },
    { id: 'sulfur_bearing_pyrite_ore', crushed: 'realisticores:crushed_sulfur_bearing_pyrite_ore', acid: 'chemlib:sulfuric_acid_fluid', time: 120, results: [{ item: 'chemlib:sulfur', count: 14 }, { item: 'chemlib:iron', count: 8 }, { item: 'chemlib:copper', count: 2 }, { item: 'chemlib:gold', count: 1 }] }
]

function btmAcidInput(ingredient) {
    return { count: 1, ingredient: ingredient }
}

function btmAcidVatRecipe(event, dep, ingredient, suffix, slurryId) {
    event.custom({
        type: 'acid_vat:acid_vat',
        input: btmAcidInput(ingredient),
        acid: dep.acid,
        acid_amount: suffix === 'block' ? 500 : 250,
        processing_time: suffix === 'block' ? dep.time + 60 : dep.time,
        slurry_amount: suffix === 'block' ? 500 : 250,
        slurry_id: slurryId
    }).id('kubejs:acid_vat/deposits/' + dep.id + '/' + suffix)
}

ServerEvents.recipes(function (event) {
    if (!Platform.isLoaded('acid_vat')) return

    for (var i = 0; i < BTM_ACID_VAT_DEPOSITS.length; i++) {
        var dep = BTM_ACID_VAT_DEPOSITS[i]
        var slurryId = 'acid_vat:btm_' + dep.id + '_slurry'

        btmAcidVatRecipe(event, dep, { item: dep.crushed }, 'crushed', slurryId)
        btmAcidVatRecipe(event, dep, { tag: 'kubejs:deposit_blocks/' + dep.id }, 'block', slurryId)

        event.custom({
            type: 'acid_vat:centrifuge',
            slurry_id: slurryId,
            slurry_amount: 250,
            processing_time: 120,
            results: dep.results
        }).id('kubejs:acid_vat/centrifuge/deposits/' + dep.id)
    }
})

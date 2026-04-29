// Deposit source tags for Realistic Ores. These tags are consumed by TCon, Create,
// and Acid Vat recipe generators.

var BTM_DEPOSIT_SOURCE_BLOCKS = {
    coal_measures: ['realisticores:coal_measures', 'realisticores:deepslate_coal_measures'],
    ironstone: ['realisticores:ironstone', 'realisticores:deepslate_ironstone'],
    copper_sulfide: ['realisticores:copper_sulfide_ore', 'realisticores:deepslate_copper_sulfide_ore'],
    tin: ['realisticores:tin_ore', 'realisticores:deepslate_tin_ore'],
    zinc: ['realisticores:zinc_ore', 'realisticores:deepslate_zinc_ore'],
    lead_zinc_vein: ['realisticores:lead_zinc_vein', 'realisticores:deepslate_lead_zinc_vein'],
    quartz_vein: ['realisticores:quartz_vein', 'realisticores:deepslate_quartz_vein'],
    bauxite_laterite: ['realisticores:bauxite_laterite', 'realisticores:deepslate_bauxite_laterite'],
    nickel_sulfide: ['realisticores:nickel_sulfide_ore', 'realisticores:deepslate_nickel_sulfide_ore'],
    tin_tungsten_greisen: ['realisticores:tin_tungsten_greisen', 'realisticores:deepslate_tin_tungsten_greisen'],
    titanium_iron_oxide: ['realisticores:titanium_iron_oxide_ore', 'realisticores:deepslate_titanium_iron_oxide_ore'],
    kimberlite_pipe: ['realisticores:kimberlite_pipe', 'realisticores:deepslate_kimberlite_pipe'],
    emerald_schist_beryl: ['realisticores:emerald_schist_beryl_vein', 'realisticores:deepslate_emerald_schist_beryl_vein'],
    corundum_beryl_vein: ['realisticores:corundum_beryl_gem_vein', 'realisticores:deepslate_corundum_beryl_gem_vein'],
    uranium_ore: ['realisticores:uranium_ore', 'realisticores:deepslate_uranium_ore'],
    thorium_ore: ['realisticores:thorium_ore', 'realisticores:deepslate_thorium_ore'],
    cupriferous_redbed_redstone_vein: ['realisticores:cupriferous_redbed_redstone_vein', 'realisticores:deepslate_cupriferous_redbed_redstone_vein'],
    lazurite_vein: ['realisticores:lazurite_vein', 'realisticores:deepslate_lazurite_vein'],
    phosphate_rock: ['realisticores:phosphate_rock', 'realisticores:deepslate_phosphate_rock'],
    soul_bearing_black_shale_soulstone_vein: ['realisticores:soul_bearing_black_shale_soulstone_vein', 'realisticores:deepslate_soul_bearing_black_shale_soulstone_vein'],
    sulfur_bearing_pyrite_ore: ['realisticores:sulfur_bearing_pyrite_ore', 'realisticores:deepslate_sulfur_bearing_pyrite_ore']
}

function btmAddDepositTags(event) {
    for (var id in BTM_DEPOSIT_SOURCE_BLOCKS) {
        var tag = 'kubejs:deposit_blocks/' + id
        var blocks = BTM_DEPOSIT_SOURCE_BLOCKS[id]
        for (var i = 0; i < blocks.length; i++) event.add(tag, blocks[i])
    }
}

ServerEvents.tags('item', function (event) { btmAddDepositTags(event) })
ServerEvents.tags('block', function (event) { btmAddDepositTags(event) })

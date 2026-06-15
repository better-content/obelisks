// Expands machine casings from milestone keys into repeated factory materials.
// Keep this after the graph closure pass so these explicit recipes are the final
// EMI-facing shape for high-signal machines and infrastructure.

var BTM_CASING_ECO = {
    seared: 'kubejs:seared_machine_casing',
    scorched: 'tconstruct:scorched_bricks',
    andesite: 'kubejs:andesite_machine_casing',
    brass: 'kubejs:brass_machine_casing',
    airtight: 'kubejs:airtight_machine_casing',
    electrical: 'kubejs:electrical_machine_casing',
    circuited: 'kubejs:electrical_machine_casing',
    space: 'kubejs:space_machine_casing',
    rawImpossible: 'kubejs:raw_impossible_casing',
    impossible: 'kubejs:impossible_machine_casing',
    impossibleCircuit: 'kubejs:impossible_circuit',
    pressureSeal: 'kubejs:pressure_seal',
    compressorCore: 'kubejs:rotational_compressor_core',
    skySteelSheet: 'kubejs:sky_steel_sheet',
    ironPlate: '#forge:plates/iron',
    copperPlate: '#forge:plates/copper',
    brassPlate: '#forge:plates/brass',
    goldPlate: '#forge:plates/gold',
    zincPlate: '#forge:plates/zinc',
    steelPlate: '#forge:plates/steel',
    glass: '#forge:glass',
    redstoneRelay: 'powergrid:redstone_relay',
    circuit: 'powergrid:integrated_circuit',
    pcb: 'pneumaticcraft:printed_circuit_board',
    transistor: 'pneumaticcraft:transistor',
    aluminumOxide: 'chemlib:aluminum_oxide',
    copperSulfate: 'chemlib:copper_ii_sulfate',
    copperChloride: 'chemlib:copper_chloride',
    siliconDioxide: 'chemlib:silicon_dioxide',
    sodiumHydroxide: 'chemlib:sodium_hydroxide',
    pvc: 'chemlib:polyvinyl_chloride',
    titaniumOxide: 'chemlib:titanium_oxide'
}

function btmEcoExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmEcoIngredientExists(input) {
    if (!input || typeof input !== 'string') return true
    if (input.charAt(0) === '#') return true
    if (input.indexOf(':') < 0) return true
    return btmEcoExists(input)
}

function btmEcoCanCraft(recipe) {
    if (!btmEcoExists(recipe.output)) return false
    for (var key in recipe.keys) {
        if (!btmEcoIngredientExists(recipe.keys[key])) return false
    }
    return true
}

function btmEcoAddShaped(event, recipe) {
    if (!btmEcoCanCraft(recipe)) return
    event.remove({ output: recipe.output })
    if (recipe.output.indexOf('tconstruct:') === 0) {
        var output = recipe.output
        if (recipe.count && recipe.count > 1) output = recipe.count + 'x ' + recipe.output
        event.shaped(output, recipe.pattern, recipe.keys).id(recipe.id)
        return
    }
    global.btmCreateMechanicalCrafting(event, recipe.id, recipe.output, recipe.count || 1, recipe.pattern, recipe.keys, true)
}

function btmEcoAddMany(event, recipes) {
    for (var i = 0; i < recipes.length; i++) btmEcoAddShaped(event, recipes[i])
}

function btmEcoRecipe(output, pattern, keys, id, count) {
    return {
        output: output,
        pattern: pattern,
        keys: keys,
        id: id,
        count: count || 1
    }
}

ServerEvents.recipes(function (event) {
    btmEcoAddMany(event, [
        btmEcoRecipe('tconstruct:smeltery_controller', ['BGB', 'GCG', 'BGB'], { B: 'tconstruct:seared_bricks', G: 'tconstruct:seared_glass', C: BTM_CASING_ECO.seared }, 'kubejs:casing_ecosystem/seared/smeltery_controller'),
        btmEcoRecipe('tconstruct:seared_melter', ['GCG', 'BHB', 'BBB'], { G: 'tconstruct:seared_glass', C: BTM_CASING_ECO.seared, B: 'tconstruct:seared_bricks', H: 'tconstruct:seared_heater' }, 'kubejs:casing_ecosystem/seared/melter'),
        btmEcoRecipe('tconstruct:seared_heater', ['BBB', 'BCB', 'BFB'], { B: 'tconstruct:seared_brick', C: BTM_CASING_ECO.seared, F: 'minecraft:furnace' }, 'kubejs:casing_ecosystem/seared/heater'),
        btmEcoRecipe('tconstruct:seared_table', ['BBB', ' C ', 'B B'], { B: 'tconstruct:seared_brick', C: BTM_CASING_ECO.seared }, 'kubejs:casing_ecosystem/seared/table'),
        btmEcoRecipe('tconstruct:seared_basin', ['B B', 'BCB', 'BBB'], { B: 'tconstruct:seared_brick', C: BTM_CASING_ECO.seared }, 'kubejs:casing_ecosystem/seared/basin'),
        btmEcoRecipe('tconstruct:seared_drain', ['BGB', 'GCG', 'BGB'], { B: 'tconstruct:seared_brick', G: 'tconstruct:seared_glass', C: BTM_CASING_ECO.seared }, 'kubejs:casing_ecosystem/seared/drain'),
        btmEcoRecipe('tconstruct:seared_faucet', [' I ', 'ICI', ' I '], { I: '#forge:ingots/copper', C: BTM_CASING_ECO.seared }, 'kubejs:casing_ecosystem/seared/faucet'),
        btmEcoRecipe('tconstruct:seared_channel', ['B B', ' C ', 'B B'], { B: 'tconstruct:seared_brick', C: BTM_CASING_ECO.seared }, 'kubejs:casing_ecosystem/seared/channel', 2),
        btmEcoRecipe('tconstruct:seared_chute', ['B B', 'BCB', ' G '], { B: 'tconstruct:seared_brick', C: BTM_CASING_ECO.seared, G: 'tconstruct:seared_glass' }, 'kubejs:casing_ecosystem/seared/chute'),
        btmEcoRecipe('tconstruct:seared_casting_tank', ['GCG', 'GBG', 'GCG'], { G: 'tconstruct:seared_glass', C: BTM_CASING_ECO.seared, B: 'tconstruct:seared_bricks' }, 'kubejs:casing_ecosystem/seared/casting_tank'),
        btmEcoRecipe('tconstruct:seared_fuel_tank', ['GCG', 'GBG', 'GCG'], { G: 'tconstruct:seared_glass', C: BTM_CASING_ECO.seared, B: 'minecraft:coal_block' }, 'kubejs:casing_ecosystem/seared/fuel_tank'),
        btmEcoRecipe('tconstruct:seared_fuel_gauge', ['GCG', 'RBR', 'GCG'], { G: 'tconstruct:seared_glass', C: BTM_CASING_ECO.seared, R: 'minecraft:redstone', B: 'tconstruct:seared_bricks' }, 'kubejs:casing_ecosystem/seared/fuel_gauge'),
        btmEcoRecipe('create:basin', ['A A', 'ICI', 'AAA'], { A: 'create:andesite_alloy', I: BTM_CASING_ECO.ironPlate, C: BTM_CASING_ECO.seared }, 'kubejs:casing_ecosystem/seared/create_basin'),
        btmEcoRecipe('create:depot', [' I ', ' C ', ' A '], { I: BTM_CASING_ECO.ironPlate, C: BTM_CASING_ECO.seared, A: 'create:andesite_alloy' }, 'kubejs:casing_ecosystem/seared/create_depot'),
        btmEcoRecipe('create:chute', [' I ', ' C ', ' I '], { I: BTM_CASING_ECO.ironPlate, C: BTM_CASING_ECO.seared }, 'kubejs:casing_ecosystem/seared/create_chute', 2),
        btmEcoRecipe('create:andesite_funnel', [' I ', ' C ', ' D '], { I: BTM_CASING_ECO.ironPlate, C: BTM_CASING_ECO.seared, D: 'create:depot' }, 'kubejs:casing_ecosystem/seared/andesite_funnel'),
        btmEcoRecipe('create:andesite_tunnel', ['IFI', ' C ', 'IFI'], { I: BTM_CASING_ECO.ironPlate, F: 'create:andesite_funnel', C: BTM_CASING_ECO.seared }, 'kubejs:casing_ecosystem/seared/andesite_tunnel')
    ])

    btmEcoAddMany(event, [
        btmEcoRecipe('tconstruct:foundry_controller', ['BGB', 'GCG', 'BGB'], { B: 'tconstruct:scorched_bricks', G: 'tconstruct:scorched_glass', C: 'tconstruct:scorched_brick' }, 'kubejs:casing_ecosystem/scorched/foundry_controller'),
        btmEcoRecipe('tconstruct:scorched_alloyer', ['GCG', 'BHB', 'BBB'], { G: 'tconstruct:scorched_glass', C: 'tconstruct:scorched_brick', B: 'tconstruct:scorched_bricks', H: 'minecraft:blast_furnace' }, 'kubejs:casing_ecosystem/scorched/alloyer'),
        btmEcoRecipe('tconstruct:scorched_table', ['BBB', ' C ', 'B B'], { B: 'tconstruct:scorched_brick', C: 'tconstruct:scorched_brick' }, 'kubejs:casing_ecosystem/scorched/table'),
        btmEcoRecipe('tconstruct:scorched_basin', ['B B', 'BCB', 'BBB'], { B: 'tconstruct:scorched_brick', C: 'tconstruct:scorched_brick' }, 'kubejs:casing_ecosystem/scorched/basin'),
        btmEcoRecipe('tconstruct:scorched_drain', ['BGB', 'GCG', 'BGB'], { B: 'tconstruct:scorched_brick', G: 'tconstruct:scorched_glass', C: 'tconstruct:scorched_brick' }, 'kubejs:casing_ecosystem/scorched/drain'),
        btmEcoRecipe('tconstruct:scorched_faucet', [' I ', 'ICI', ' I '], { I: '#forge:ingots/brass', C: 'tconstruct:scorched_brick' }, 'kubejs:casing_ecosystem/scorched/faucet'),
        btmEcoRecipe('tconstruct:scorched_channel', ['B B', ' C ', 'B B'], { B: 'tconstruct:scorched_brick', C: 'tconstruct:scorched_brick' }, 'kubejs:casing_ecosystem/scorched/channel', 2),
        btmEcoRecipe('tconstruct:scorched_chute', ['B B', 'BCB', ' G '], { B: 'tconstruct:scorched_brick', C: 'tconstruct:scorched_brick', G: 'tconstruct:scorched_glass' }, 'kubejs:casing_ecosystem/scorched/chute'),
        btmEcoRecipe('tconstruct:scorched_fuel_tank', ['GCG', 'GBG', 'GCG'], { G: 'tconstruct:scorched_glass', C: 'tconstruct:scorched_brick', B: 'minecraft:blaze_powder' }, 'kubejs:casing_ecosystem/scorched/fuel_tank'),
        btmEcoRecipe('tconstruct:scorched_fuel_gauge', ['GCG', 'RBR', 'GCG'], { G: 'tconstruct:scorched_glass', C: 'tconstruct:scorched_brick', R: 'minecraft:redstone', B: 'tconstruct:scorched_bricks' }, 'kubejs:casing_ecosystem/scorched/fuel_gauge'),
        btmEcoRecipe('tconstruct:scorched_ingot_tank', ['GCG', 'GBG', 'GCG'], { G: 'tconstruct:scorched_glass', C: 'tconstruct:scorched_brick', B: 'tconstruct:scorched_bricks' }, 'kubejs:casing_ecosystem/scorched/ingot_tank'),
        btmEcoRecipe('tconstruct:scorched_anvil', ['III', ' C ', 'B B'], { I: '#forge:ingots/cobalt', C: 'tconstruct:scorched_brick', B: 'tconstruct:scorched_bricks' }, 'kubejs:casing_ecosystem/scorched/anvil'),
        btmEcoRecipe('tconstruct:scorched_duct', ['B B', 'RCR', 'B B'], { B: 'tconstruct:scorched_brick', R: 'minecraft:redstone', C: 'tconstruct:scorched_brick' }, 'kubejs:casing_ecosystem/scorched/duct'),
        btmEcoRecipe('tconstruct:scorched_fluid_cannon', [' N ', 'BCB', ' R '], { N: '#forge:nuggets/cobalt', B: 'tconstruct:scorched_brick', C: 'tconstruct:scorched_brick', R: 'minecraft:redstone' }, 'kubejs:casing_ecosystem/scorched/fluid_cannon'),
        btmEcoRecipe('create:fluid_tank', ['CPC', 'GSG', 'CPC'], { C: BTM_CASING_ECO.copperPlate, P: 'create:fluid_pipe', G: BTM_CASING_ECO.glass, S: BTM_CASING_ECO.scorched }, 'kubejs:casing_ecosystem/scorched/fluid_tank'),
        btmEcoRecipe('create:item_drain', [' G ', 'PSP', ' C '], { G: 'minecraft:iron_bars', P: 'create:fluid_pipe', S: BTM_CASING_ECO.scorched, C: BTM_CASING_ECO.copperPlate }, 'kubejs:casing_ecosystem/scorched/item_drain'),
        btmEcoRecipe('create:spout', [' P ', 'TST', ' C '], { P: 'create:fluid_pipe', T: 'create:fluid_tank', S: BTM_CASING_ECO.scorched, C: BTM_CASING_ECO.copperPlate }, 'kubejs:casing_ecosystem/scorched/spout')
    ])

    btmEcoAddMany(event, [
        btmEcoRecipe('create:millstone', [' S ', 'ACA', ' S '], { S: 'minecraft:smooth_stone', A: BTM_CASING_ECO.andesite, C: 'create:cogwheel' }, 'kubejs:casing_ecosystem/andesite/millstone'),
        btmEcoRecipe('create:encased_fan', [' I ', 'SCS', ' I '], { I: BTM_CASING_ECO.ironPlate, S: 'create:shaft', C: BTM_CASING_ECO.andesite }, 'kubejs:casing_ecosystem/andesite/encased_fan'),
        btmEcoRecipe('create:mechanical_press', [' S ', ' C ', ' I '], { S: 'create:shaft', C: BTM_CASING_ECO.andesite, I: 'minecraft:iron_block' }, 'kubejs:casing_ecosystem/andesite/mechanical_press'),
        btmEcoRecipe('create:mechanical_mixer', [' S ', ' C ', ' W '], { S: 'create:shaft', C: BTM_CASING_ECO.andesite, W: 'create:whisk' }, 'kubejs:casing_ecosystem/andesite/mechanical_mixer'),
        btmEcoRecipe('create:mechanical_saw', [' S ', ' C ', ' B '], { S: 'create:shaft', C: BTM_CASING_ECO.andesite, B: 'minecraft:iron_axe' }, 'kubejs:casing_ecosystem/andesite/mechanical_saw'),
        btmEcoRecipe('create:mechanical_drill', [' S ', ' C ', ' P '], { S: 'create:shaft', C: BTM_CASING_ECO.andesite, P: BTM_CASING_ECO.ironPlate }, 'kubejs:casing_ecosystem/andesite/mechanical_drill'),
        btmEcoRecipe('create:mechanical_crafter', ['ACA', 'CCC', 'AEA'], { A: 'create:andesite_alloy', C: BTM_CASING_ECO.andesite, E: 'create:electron_tube' }, 'kubejs:casing_ecosystem/andesite/mechanical_crafter', 3),
        btmEcoRecipe('create:crushing_wheel', ['AAA', 'ACA', 'AAA'], { A: 'create:andesite_alloy', C: BTM_CASING_ECO.andesite }, 'kubejs:casing_ecosystem/andesite/crushing_wheel'),
        btmEcoRecipe('create:mechanical_piston', [' P ', 'SCS', ' A '], { P: 'create:piston_extension_pole', S: 'create:shaft', C: BTM_CASING_ECO.andesite, A: 'create:andesite_alloy' }, 'kubejs:casing_ecosystem/andesite/mechanical_piston'),
        btmEcoRecipe('create:sticky_mechanical_piston', [' L ', ' P ', ' C '], { L: 'minecraft:slime_ball', P: 'create:mechanical_piston', C: BTM_CASING_ECO.andesite }, 'kubejs:casing_ecosystem/andesite/sticky_mechanical_piston'),
        btmEcoRecipe('create:gearshift', [' R ', 'SCS', ' R '], { R: 'minecraft:redstone', S: 'create:shaft', C: BTM_CASING_ECO.andesite }, 'kubejs:casing_ecosystem/andesite/gearshift'),
        btmEcoRecipe('create:clutch', [' I ', 'SCS', ' I '], { I: BTM_CASING_ECO.ironPlate, S: 'create:shaft', C: BTM_CASING_ECO.andesite }, 'kubejs:casing_ecosystem/andesite/clutch')
    ])

    btmEcoAddMany(event, [
        btmEcoRecipe('create:steam_engine', [' G ', ' B ', ' C '], { G: BTM_CASING_ECO.goldPlate, B: BTM_CASING_ECO.brass, C: '#forge:storage_blocks/copper' }, 'kubejs:casing_ecosystem/brass/steam_engine'),
        btmEcoRecipe('create:rotation_speed_controller', [' B ', 'PCP', ' G '], { B: BTM_CASING_ECO.brassPlate, P: 'create:precision_mechanism', C: BTM_CASING_ECO.brass, G: 'create:large_cogwheel' }, 'kubejs:casing_ecosystem/brass/rotation_speed_controller'),
        btmEcoRecipe('create:mechanical_arm', [' B ', 'PCP', ' H '], { B: BTM_CASING_ECO.brassPlate, P: 'create:precision_mechanism', C: BTM_CASING_ECO.brass, H: 'create:brass_hand' }, 'kubejs:casing_ecosystem/brass/mechanical_arm'),
        btmEcoRecipe('create:stockpile_switch', [' G ', 'RCR', ' B '], { G: BTM_CASING_ECO.glass, R: BTM_CASING_ECO.redstoneRelay, C: BTM_CASING_ECO.brass, B: BTM_CASING_ECO.brassPlate }, 'kubejs:casing_ecosystem/brass/stockpile_switch'),
        btmEcoRecipe('create:content_observer', [' G ', 'RCR', ' E '], { G: BTM_CASING_ECO.glass, R: BTM_CASING_ECO.redstoneRelay, C: BTM_CASING_ECO.brass, E: 'create:electron_tube' }, 'kubejs:casing_ecosystem/brass/content_observer'),
        btmEcoRecipe('create:brass_funnel', [' B ', ' C ', ' F '], { B: BTM_CASING_ECO.brassPlate, C: BTM_CASING_ECO.brass, F: 'create:andesite_funnel' }, 'kubejs:casing_ecosystem/brass/brass_funnel'),
        btmEcoRecipe('create:brass_tunnel', ['BFB', ' C ', 'BFB'], { B: BTM_CASING_ECO.brassPlate, F: 'create:brass_funnel', C: BTM_CASING_ECO.brass }, 'kubejs:casing_ecosystem/brass/brass_tunnel'),
        btmEcoRecipe('create:smart_chute', [' R ', ' C ', ' H '], { R: BTM_CASING_ECO.redstoneRelay, C: BTM_CASING_ECO.brass, H: 'create:chute' }, 'kubejs:casing_ecosystem/brass/smart_chute'),
        btmEcoRecipe('create:display_link', ['ERE', 'PCP', 'BBB'], { E: 'create:electron_tube', R: BTM_CASING_ECO.redstoneRelay, P: 'create:precision_mechanism', C: BTM_CASING_ECO.brass, B: BTM_CASING_ECO.brassPlate }, 'kubejs:casing_ecosystem/brass/display_link'),
        btmEcoRecipe('create:display_board', ['GGG', 'PCP', 'BBB'], { G: BTM_CASING_ECO.glass, P: 'create:precision_mechanism', C: BTM_CASING_ECO.brass, B: BTM_CASING_ECO.brassPlate }, 'kubejs:casing_ecosystem/brass/display_board'),
        btmEcoRecipe('create:portable_storage_interface', ['BFB', 'PAP', 'BFB'], { B: BTM_CASING_ECO.brassPlate, F: 'create:brass_funnel', P: 'create:precision_mechanism', A: BTM_CASING_ECO.brass }, 'kubejs:casing_ecosystem/brass/portable_storage_interface'),
        btmEcoRecipe('create:portable_fluid_interface', ['BFB', 'PAP', 'BFB'], { B: BTM_CASING_ECO.brassPlate, F: 'create:fluid_pipe', P: 'create:precision_mechanism', A: BTM_CASING_ECO.brass }, 'kubejs:casing_ecosystem/brass/portable_fluid_interface'),
        btmEcoRecipe('create:packager', ['BFB', 'PAP', 'BFB'], { B: BTM_CASING_ECO.brassPlate, F: 'create:brass_funnel', P: 'create:precision_mechanism', A: BTM_CASING_ECO.brass }, 'kubejs:casing_ecosystem/brass/packager'),
        btmEcoRecipe('create:stock_link', ['ERE', 'PBP', 'CRC'], { E: 'create:electron_tube', R: BTM_CASING_ECO.redstoneRelay, P: 'create:precision_mechanism', B: BTM_CASING_ECO.brass, C: BTM_CASING_ECO.brassPlate }, 'kubejs:casing_ecosystem/brass/stock_link'),
        btmEcoRecipe('create:stock_ticker', ['GLG', 'RBR', 'PDP'], { G: BTM_CASING_ECO.glass, L: 'create:stock_link', R: BTM_CASING_ECO.redstoneRelay, B: BTM_CASING_ECO.brass, P: 'create:precision_mechanism', D: 'create:display_board' }, 'kubejs:casing_ecosystem/brass/stock_ticker'),
        btmEcoRecipe('createdieselgenerators:engine_piston', ['AIA', ' S ', 'ZBZ'], { A: 'create:andesite_alloy', I: BTM_CASING_ECO.ironPlate, S: 'create:shaft', Z: '#forge:ingots/zinc', B: BTM_CASING_ECO.brass }, 'kubejs:casing_ecosystem/brass/engine_piston'),
        btmEcoRecipe('createdieselgenerators:diesel_engine', [' Q ', 'PBP', 'SFS'], { Q: 'minecraft:flint_and_steel', P: 'createdieselgenerators:engine_piston', B: BTM_CASING_ECO.brass, S: 'minecraft:polished_blackstone_slab', F: 'create:fluid_tank' }, 'kubejs:casing_ecosystem/brass/diesel_engine')
    ])

    btmEcoAddMany(event, [
        btmEcoRecipe('pneumaticcraft:reinforced_pressure_tube', ['STS', 'TAT', 'STS'], { S: BTM_CASING_ECO.pressureSeal, T: 'pneumaticcraft:pressure_tube', A: BTM_CASING_ECO.airtight }, 'kubejs:casing_ecosystem/airtight/reinforced_pressure_tube', 8),
        btmEcoRecipe('pneumaticcraft:advanced_pressure_tube', ['PTP', 'TAT', 'PTP'], { P: BTM_CASING_ECO.pvc, T: 'pneumaticcraft:reinforced_pressure_tube', A: BTM_CASING_ECO.airtight }, 'kubejs:casing_ecosystem/airtight/advanced_pressure_tube', 4),
        btmEcoRecipe('pneumaticcraft:pressure_chamber_valve', ['RGR', 'GAG', 'RGR'], { R: 'pneumaticcraft:reinforced_bricks', G: BTM_CASING_ECO.glass, A: BTM_CASING_ECO.airtight }, 'kubejs:casing_ecosystem/airtight/pressure_chamber_valve'),
        btmEcoRecipe('pneumaticcraft:refinery', [' T ', 'PAP', 'SCS'], { T: 'pneumaticcraft:small_tank', P: 'pneumaticcraft:pressure_tube', A: BTM_CASING_ECO.airtight, S: BTM_CASING_ECO.pressureSeal, C: BTM_CASING_ECO.compressorCore }, 'kubejs:casing_ecosystem/airtight/refinery'),
        btmEcoRecipe('pneumaticcraft:refinery_output', [' T ', 'PAP', ' S '], { T: 'pneumaticcraft:small_tank', P: 'pneumaticcraft:pressure_tube', A: BTM_CASING_ECO.airtight, S: BTM_CASING_ECO.pressureSeal }, 'kubejs:casing_ecosystem/airtight/refinery_output'),
        btmEcoRecipe('pneumaticcraft:thermopneumatic_processing_plant', ['HTH', 'PAP', 'SCS'], { H: 'pneumaticcraft:heat_pipe', T: 'pneumaticcraft:small_tank', P: 'pneumaticcraft:pressure_tube', A: BTM_CASING_ECO.airtight, S: BTM_CASING_ECO.pressureSeal, C: BTM_CASING_ECO.compressorCore }, 'kubejs:casing_ecosystem/airtight/thermopneumatic_processing_plant'),
        btmEcoRecipe('pneumaticcraft:fluid_mixer', ['MTM', 'PAP', 'SCS'], { M: 'pneumaticcraft:turbine_blade', T: 'pneumaticcraft:small_tank', P: 'pneumaticcraft:pressure_tube', A: BTM_CASING_ECO.airtight, S: BTM_CASING_ECO.pressureSeal, C: BTM_CASING_ECO.compressorCore }, 'kubejs:casing_ecosystem/airtight/fluid_mixer'),
        btmEcoRecipe('pneumaticcraft:charging_station', [' G ', 'PAP', 'SCS'], { G: BTM_CASING_ECO.glass, P: 'pneumaticcraft:pressure_tube', A: BTM_CASING_ECO.airtight, S: BTM_CASING_ECO.pressureSeal, C: BTM_CASING_ECO.compressorCore }, 'kubejs:casing_ecosystem/airtight/charging_station'),
        btmEcoRecipe('pneumaticcraft:security_station', ['GCG', 'PAP', 'SSS'], { G: BTM_CASING_ECO.glass, C: BTM_CASING_ECO.circuit, P: 'pneumaticcraft:pressure_tube', A: BTM_CASING_ECO.airtight, S: BTM_CASING_ECO.pressureSeal }, 'kubejs:casing_ecosystem/airtight/security_station'),
        btmEcoRecipe('pneumaticcraft:etching_tank', ['GAG', 'STS', 'GNG'], { G: BTM_CASING_ECO.glass, A: BTM_CASING_ECO.airtight, S: BTM_CASING_ECO.pressureSeal, T: 'pneumaticcraft:small_tank', N: BTM_CASING_ECO.sodiumHydroxide }, 'kubejs:casing_ecosystem/airtight/etching_tank'),
        btmEcoRecipe('pneumaticcraft:assembly_controller', ['GCG', 'PAP', 'SSS'], { G: BTM_CASING_ECO.glass, C: BTM_CASING_ECO.circuit, P: 'pneumaticcraft:pressure_tube', A: BTM_CASING_ECO.airtight, S: BTM_CASING_ECO.pressureSeal }, 'kubejs:casing_ecosystem/airtight/assembly_controller'),
        btmEcoRecipe('pneumaticcraft:assembly_platform', ['SSS', 'PAP', 'III'], { S: BTM_CASING_ECO.pressureSeal, P: 'pneumaticcraft:pressure_tube', A: BTM_CASING_ECO.airtight, I: 'pneumaticcraft:ingot_iron_compressed' }, 'kubejs:casing_ecosystem/airtight/assembly_platform'),
        btmEcoRecipe('pneumaticcraft:assembly_laser', [' R ', 'PAP', 'SCS'], { R: 'minecraft:redstone', P: 'pneumaticcraft:pressure_tube', A: BTM_CASING_ECO.airtight, S: BTM_CASING_ECO.pressureSeal, C: BTM_CASING_ECO.circuit }, 'kubejs:casing_ecosystem/airtight/assembly_laser'),
        btmEcoRecipe('pneumaticcraft:assembly_drill', [' D ', 'PAP', 'SCS'], { D: 'minecraft:diamond', P: 'pneumaticcraft:pressure_tube', A: BTM_CASING_ECO.airtight, S: BTM_CASING_ECO.pressureSeal, C: BTM_CASING_ECO.compressorCore }, 'kubejs:casing_ecosystem/airtight/assembly_drill')
    ])

    btmEcoAddMany(event, [
        btmEcoRecipe('powergrid:battery', ['ZSZ', 'CAC', 'ZSZ'], { Z: BTM_CASING_ECO.zincPlate, S: BTM_CASING_ECO.copperSulfate, C: 'powergrid:capacitor', A: BTM_CASING_ECO.electrical }, 'kubejs:casing_ecosystem/electrical/battery'),
        btmEcoRecipe('powergrid:portable_battery', [' C ', 'BAB', ' Z '], { C: 'powergrid:capacitor', B: 'powergrid:battery', A: BTM_CASING_ECO.electrical, Z: BTM_CASING_ECO.zincPlate }, 'kubejs:casing_ecosystem/electrical/portable_battery'),
        btmEcoRecipe('powergrid:electric_motor', [' W ', 'CAC', ' S '], { W: 'powergrid:wire', C: 'powergrid:copper_coil', A: BTM_CASING_ECO.electrical, S: 'create:shaft' }, 'kubejs:casing_ecosystem/electrical/electric_motor'),
        btmEcoRecipe('powergrid:constant_speed_motor', ['RCR', 'MAM', 'RCR'], { R: BTM_CASING_ECO.redstoneRelay, C: 'powergrid:capacitor', M: 'powergrid:electric_motor', A: BTM_CASING_ECO.electrical }, 'kubejs:casing_ecosystem/electrical/constant_speed_motor'),
        btmEcoRecipe('powergrid:generator_housing', ['IOI', 'CAC', 'III'], { I: BTM_CASING_ECO.ironPlate, O: BTM_CASING_ECO.aluminumOxide, C: 'powergrid:copper_coil', A: BTM_CASING_ECO.electrical }, 'kubejs:casing_ecosystem/electrical/generator_housing'),
        btmEcoRecipe('powergrid:vertical_generator_housing', ['ICI', 'CAC', 'III'], { I: BTM_CASING_ECO.ironPlate, C: 'powergrid:generator_commutator', A: BTM_CASING_ECO.electrical }, 'kubejs:casing_ecosystem/electrical/vertical_generator_housing'),
        btmEcoRecipe('powergrid:generator_clutch', [' S ', 'CAC', ' S '], { S: 'create:shaft', C: 'powergrid:generator_commutator', A: BTM_CASING_ECO.electrical }, 'kubejs:casing_ecosystem/electrical/generator_clutch'),
        btmEcoRecipe('powergrid:relay', [' W ', 'RAR', ' W '], { W: 'powergrid:wire', R: BTM_CASING_ECO.redstoneRelay, A: BTM_CASING_ECO.electrical }, 'kubejs:casing_ecosystem/electrical/relay'),
        btmEcoRecipe('powergrid:relay_dpdt', ['RWR', 'WAW', 'RWR'], { R: 'powergrid:relay', W: 'powergrid:wire', A: BTM_CASING_ECO.electrical }, 'kubejs:casing_ecosystem/electrical/relay_dpdt'),
        btmEcoRecipe('powergrid:current_gauge', [' G ', 'CAC', ' W '], { G: BTM_CASING_ECO.glass, C: 'powergrid:copper_coil', A: BTM_CASING_ECO.electrical, W: 'powergrid:wire' }, 'kubejs:casing_ecosystem/electrical/current_gauge'),
        btmEcoRecipe('powergrid:voltage_gauge', [' G ', 'CAC', ' R '], { G: BTM_CASING_ECO.glass, C: 'powergrid:capacitor', A: BTM_CASING_ECO.electrical, R: BTM_CASING_ECO.redstoneRelay }, 'kubejs:casing_ecosystem/electrical/voltage_gauge'),
        btmEcoRecipe('powergrid:power_gauge', ['GVG', 'CAC', ' W '], { G: BTM_CASING_ECO.glass, V: 'powergrid:voltage_gauge', C: 'powergrid:current_gauge', A: BTM_CASING_ECO.electrical, W: 'powergrid:wire' }, 'kubejs:casing_ecosystem/electrical/power_gauge'),
        btmEcoRecipe('powergrid:device_connector', [' W ', 'CAC', ' W '], { W: 'powergrid:wire_connector', C: BTM_CASING_ECO.circuit, A: BTM_CASING_ECO.electrical }, 'kubejs:casing_ecosystem/electrical/device_connector'),
        btmEcoRecipe('powergrid:heavy_wire_connector', ['WWW', 'CAC', 'WWW'], { W: 'powergrid:wire_connector', C: 'powergrid:conductive_casing', A: BTM_CASING_ECO.electrical }, 'kubejs:casing_ecosystem/electrical/heavy_wire_connector')
    ])

    btmEcoAddMany(event, [
        btmEcoRecipe('oc2r:computer', ['GPG', 'CAC', 'ISI'], { G: BTM_CASING_ECO.glass, P: BTM_CASING_ECO.pcb, C: BTM_CASING_ECO.circuit, A: BTM_CASING_ECO.circuited, I: BTM_CASING_ECO.ironPlate, S: BTM_CASING_ECO.siliconDioxide }, 'kubejs:casing_ecosystem/circuited/computer'),
        btmEcoRecipe('oc2r:network_hub', ['NCN', 'PAP', 'NEN'], { N: 'oc2r:network_connector', C: BTM_CASING_ECO.circuit, P: BTM_CASING_ECO.pcb, A: BTM_CASING_ECO.circuited, E: BTM_CASING_ECO.copperChloride }, 'kubejs:casing_ecosystem/circuited/network_hub'),
        btmEcoRecipe('oc2r:disk_drive', ['GPG', 'SAS', 'III'], { G: BTM_CASING_ECO.glass, P: BTM_CASING_ECO.pcb, S: 'oc2r:silicon_wafer', A: BTM_CASING_ECO.circuited, I: BTM_CASING_ECO.ironPlate }, 'kubejs:casing_ecosystem/circuited/disk_drive'),
        btmEcoRecipe('oc2r:monitor', ['GGG', 'PAP', 'CCC'], { G: BTM_CASING_ECO.glass, P: BTM_CASING_ECO.pcb, A: BTM_CASING_ECO.circuited, C: BTM_CASING_ECO.circuit }, 'kubejs:casing_ecosystem/circuited/monitor'),
        btmEcoRecipe('oc2r:charger', [' W ', 'BAB', ' W '], { W: 'powergrid:wire', B: 'powergrid:battery', A: BTM_CASING_ECO.circuited }, 'kubejs:casing_ecosystem/circuited/charger'),
        btmEcoRecipe('oc2r:pci_card_cage', ['IPI', 'PAP', 'IPI'], { I: BTM_CASING_ECO.ironPlate, P: BTM_CASING_ECO.pcb, A: BTM_CASING_ECO.circuited }, 'kubejs:casing_ecosystem/circuited/pci_card_cage'),
        btmEcoRecipe('oc2r:bus_interface', ['BCB', 'PAP', 'BCB'], { B: 'oc2r:bus_cable', C: BTM_CASING_ECO.circuit, P: BTM_CASING_ECO.pcb, A: BTM_CASING_ECO.circuited }, 'kubejs:casing_ecosystem/circuited/bus_interface'),
        btmEcoRecipe('oc2r:redstone_interface', ['RCR', 'PAP', 'RCR'], { R: BTM_CASING_ECO.redstoneRelay, C: BTM_CASING_ECO.circuit, P: BTM_CASING_ECO.pcb, A: BTM_CASING_ECO.circuited }, 'kubejs:casing_ecosystem/circuited/redstone_interface'),
        btmEcoRecipe('oc2r:block_operations_module', [' T ', 'PAP', ' C '], { T: BTM_CASING_ECO.transistor, P: BTM_CASING_ECO.pcb, A: BTM_CASING_ECO.circuited, C: BTM_CASING_ECO.circuit }, 'kubejs:casing_ecosystem/circuited/block_operations_module'),
        btmEcoRecipe('oc2r:inventory_operations_module', [' H ', 'PAP', ' C '], { H: 'minecraft:hopper', P: BTM_CASING_ECO.pcb, A: BTM_CASING_ECO.circuited, C: BTM_CASING_ECO.circuit }, 'kubejs:casing_ecosystem/circuited/inventory_operations_module'),
        btmEcoRecipe('oc2r:network_interface_card', [' N ', 'PAP', ' C '], { N: 'oc2r:network_connector', P: BTM_CASING_ECO.pcb, A: BTM_CASING_ECO.circuited, C: BTM_CASING_ECO.circuit }, 'kubejs:casing_ecosystem/circuited/network_interface_card'),
        btmEcoRecipe('oc2r:redstone_interface_card', [' R ', 'PAP', ' C '], { R: BTM_CASING_ECO.redstoneRelay, P: BTM_CASING_ECO.pcb, A: BTM_CASING_ECO.circuited, C: BTM_CASING_ECO.circuit }, 'kubejs:casing_ecosystem/circuited/redstone_interface_card'),
        btmEcoRecipe('oc2r:cpu_tier_2', ['STS', 'PAP', 'STS'], { S: 'oc2r:silicon_wafer', T: BTM_CASING_ECO.transistor, P: BTM_CASING_ECO.pcb, A: BTM_CASING_ECO.circuited }, 'kubejs:casing_ecosystem/circuited/cpu_tier_2'),
        btmEcoRecipe('oc2r:hard_drive_large', ['SSS', 'PAP', 'SSS'], { S: 'oc2r:silicon_wafer', P: BTM_CASING_ECO.pcb, A: BTM_CASING_ECO.circuited }, 'kubejs:casing_ecosystem/circuited/hard_drive_large'),
        btmEcoRecipe('oc2r:memory_large', ['STS', 'PAP', 'STS'], { S: 'oc2r:silicon_wafer', T: BTM_CASING_ECO.transistor, P: BTM_CASING_ECO.pcb, A: BTM_CASING_ECO.circuited }, 'kubejs:casing_ecosystem/circuited/memory_large')
    ])

    btmEcoAddMany(event, [
        btmEcoRecipe('creatingspace:mechanical_electrolyzer', [' V ', 'PCP', ' E '], { V: 'create:fluid_valve', P: BTM_CASING_ECO.electrical, C: BTM_CASING_ECO.space, E: 'powergrid:electric_motor' }, 'kubejs:casing_ecosystem/space/mechanical_electrolyzer'),
        btmEcoRecipe('creatingspace:air_liquefier', ['TPT', 'PCP', 'TPT'], { T: 'creatingspace:cryogenic_tank', P: BTM_CASING_ECO.electrical, C: BTM_CASING_ECO.space }, 'kubejs:casing_ecosystem/space/air_liquefier'),
        btmEcoRecipe('creatingspace:oxygen_sealer', ['GPG', 'SCS', 'GPG'], { G: BTM_CASING_ECO.glass, P: 'pneumaticcraft:pressure_tube', S: BTM_CASING_ECO.pressureSeal, C: BTM_CASING_ECO.space }, 'kubejs:casing_ecosystem/space/oxygen_sealer'),
        btmEcoRecipe('creatingspace:rocket_engine', [' S ', 'ICI', 'RCR'], { S: 'create:shaft', I: 'creatingspace:inconel_sheet', C: BTM_CASING_ECO.space, R: 'creatingspace:rocket_casing' }, 'kubejs:casing_ecosystem/space/rocket_engine'),
        btmEcoRecipe('creatingspace:rocket_controls', ['GPG', 'CAC', 'RCR'], { G: BTM_CASING_ECO.glass, P: BTM_CASING_ECO.pcb, C: BTM_CASING_ECO.circuit, A: BTM_CASING_ECO.space, R: 'creatingspace:rocket_casing' }, 'kubejs:casing_ecosystem/space/rocket_controls'),
        btmEcoRecipe('creatingspace:rocket_generator', ['PEP', 'RCR', 'PBP'], { P: BTM_CASING_ECO.electrical, E: 'powergrid:electric_motor', R: 'creatingspace:rocket_casing', C: BTM_CASING_ECO.space, B: 'powergrid:battery' }, 'kubejs:casing_ecosystem/space/rocket_generator'),
        btmEcoRecipe('creatingspace:cryogenic_tank', ['SGS', 'GCG', 'SGS'], { S: 'creatingspace:inconel_sheet', G: BTM_CASING_ECO.glass, C: BTM_CASING_ECO.space }, 'kubejs:casing_ecosystem/space/cryogenic_tank'),
        btmEcoRecipe('creatingspace:flight_recorder', ['GPG', 'CAC', 'SRS'], { G: BTM_CASING_ECO.glass, P: BTM_CASING_ECO.pcb, C: BTM_CASING_ECO.space, A: BTM_CASING_ECO.circuited, S: 'creatingspace:inconel_sheet', R: BTM_CASING_ECO.redstoneRelay }, 'kubejs:casing_ecosystem/space/flight_recorder'),
        btmEcoRecipe('creatingspace:flow_meter', ['GPG', 'SCS', 'GPG'], { G: BTM_CASING_ECO.glass, P: 'create:fluid_pipe', S: 'creatingspace:inconel_sheet', C: BTM_CASING_ECO.space }, 'kubejs:casing_ecosystem/space/flow_meter'),
        btmEcoRecipe('creatingspace:engine_blueprint', [' P ', 'CAC', ' P '], { P: 'minecraft:paper', C: BTM_CASING_ECO.circuit, A: BTM_CASING_ECO.space }, 'kubejs:casing_ecosystem/space/engine_blueprint'),
        btmEcoRecipe('creatingspace:power_pack', ['SBS', 'BCB', 'SBS'], { S: 'creatingspace:inconel_sheet', B: 'powergrid:battery', C: BTM_CASING_ECO.space }, 'kubejs:casing_ecosystem/space/power_pack'),
        btmEcoRecipe('creatingspace:exhaust_pack', ['SPS', 'PCP', 'SPS'], { S: 'creatingspace:hastelloy_sheet', P: 'pneumaticcraft:pressure_tube', C: BTM_CASING_ECO.space }, 'kubejs:casing_ecosystem/space/exhaust_pack'),
        btmEcoRecipe('creatingspace:copper_oxygen_backtank', ['SPS', 'TCT', 'SPS'], { S: BTM_CASING_ECO.pressureSeal, P: 'pneumaticcraft:pressure_tube', T: 'pneumaticcraft:small_tank', C: BTM_CASING_ECO.space }, 'kubejs:casing_ecosystem/space/copper_oxygen_backtank'),
        btmEcoRecipe('creatingspace:netherite_oxygen_backtank', ['SPS', 'TCT', 'SPS'], { S: 'minecraft:netherite_ingot', P: 'pneumaticcraft:reinforced_pressure_tube', T: 'creatingspace:copper_oxygen_backtank', C: BTM_CASING_ECO.space }, 'kubejs:casing_ecosystem/space/netherite_oxygen_backtank'),
        btmEcoRecipe('creatingspace:advanced_spacesuit_fabric', ['TST', 'SCS', 'TOT'], { T: 'kubejs:titanium_thermal_plate', S: 'creatingspace:basic_spacesuit_fabric', C: BTM_CASING_ECO.space, O: BTM_CASING_ECO.titaniumOxide }, 'kubejs:casing_ecosystem/space/advanced_spacesuit_fabric')
    ])

    btmEcoAddMany(event, [
        btmEcoRecipe('ae2:cell_component_64k', ['SPS', 'PRP', 'SPS'], { S: BTM_CASING_ECO.skySteelSheet, P: 'ae2:calculation_processor', R: BTM_CASING_ECO.rawImpossible }, 'kubejs:casing_ecosystem/raw_impossible/cell_component_64k'),
        btmEcoRecipe('ae2:cell_component_256k', ['SPS', 'PRP', 'SPS'], { S: BTM_CASING_ECO.skySteelSheet, P: 'ae2:engineering_processor', R: BTM_CASING_ECO.rawImpossible }, 'kubejs:casing_ecosystem/raw_impossible/cell_component_256k'),
        btmEcoRecipe('ae2:spatial_cell_component_16', ['SPS', 'PRP', 'SPS'], { S: 'ae2:sky_stone_block', P: 'ae2:engineering_processor', R: BTM_CASING_ECO.rawImpossible }, 'kubejs:casing_ecosystem/raw_impossible/spatial_cell_component_16'),
        btmEcoRecipe('ae2:spatial_cell_component_128', ['SPS', 'PRP', 'SPS'], { S: BTM_CASING_ECO.skySteelSheet, P: 'ae2:engineering_processor', R: BTM_CASING_ECO.rawImpossible }, 'kubejs:casing_ecosystem/raw_impossible/spatial_cell_component_128'),
        btmEcoRecipe('ae2:item_cell_housing', ['SGS', 'GRG', 'SGS'], { S: BTM_CASING_ECO.skySteelSheet, G: 'ae2:quartz_glass', R: BTM_CASING_ECO.rawImpossible }, 'kubejs:casing_ecosystem/raw_impossible/item_cell_housing'),
        btmEcoRecipe('ae2:fluid_cell_housing', ['SGS', 'GRG', 'SGS'], { S: BTM_CASING_ECO.skySteelSheet, G: 'ae2:quartz_glass', R: BTM_CASING_ECO.rawImpossible }, 'kubejs:casing_ecosystem/raw_impossible/fluid_cell_housing')
    ])

    btmEcoAddMany(event, [
        btmEcoRecipe('ae2:controller', ['SFS', 'PIP', 'SFS'], { S: BTM_CASING_ECO.skySteelSheet, F: 'ae2:fluix_crystal', P: 'ae2:engineering_processor', I: BTM_CASING_ECO.impossible }, 'kubejs:casing_ecosystem/impossible/controller'),
        btmEcoRecipe('ae2:drive', ['SPS', 'CIC', 'SPS'], { S: BTM_CASING_ECO.skySteelSheet, P: 'ae2:engineering_processor', C: BTM_CASING_ECO.impossibleCircuit, I: BTM_CASING_ECO.impossible }, 'kubejs:casing_ecosystem/impossible/drive'),
        btmEcoRecipe('ae2:energy_acceptor', ['SFS', 'FIF', 'SFS'], { S: BTM_CASING_ECO.skySteelSheet, F: 'ae2:fluix_crystal', I: BTM_CASING_ECO.impossible }, 'kubejs:casing_ecosystem/impossible/energy_acceptor'),
        btmEcoRecipe('ae2:interface', ['SPS', 'CIC', 'SPS'], { S: BTM_CASING_ECO.skySteelSheet, P: 'ae2:logic_processor', C: BTM_CASING_ECO.impossibleCircuit, I: BTM_CASING_ECO.impossible }, 'kubejs:casing_ecosystem/impossible/interface'),
        btmEcoRecipe('ae2:io_port', ['SPS', 'DID', 'SPS'], { S: BTM_CASING_ECO.skySteelSheet, P: 'ae2:engineering_processor', D: 'ae2:drive', I: BTM_CASING_ECO.impossible }, 'kubejs:casing_ecosystem/impossible/io_port'),
        btmEcoRecipe('ae2:spatial_io_port', ['SPS', 'DID', 'SPS'], { S: BTM_CASING_ECO.skySteelSheet, P: 'ae2:engineering_processor', D: 'ae2:spatial_cell_component_16', I: BTM_CASING_ECO.impossible }, 'kubejs:casing_ecosystem/impossible/spatial_io_port'),
        btmEcoRecipe('ae2:condenser', ['SFS', 'CIC', 'SFS'], { S: BTM_CASING_ECO.skySteelSheet, F: 'ae2:fluix_crystal', C: 'ae2:calculation_processor', I: BTM_CASING_ECO.impossible }, 'kubejs:casing_ecosystem/impossible/condenser'),
        btmEcoRecipe('ae2:molecular_assembler', ['SGS', 'PIP', 'SGS'], { S: BTM_CASING_ECO.skySteelSheet, G: 'ae2:quartz_glass', P: BTM_CASING_ECO.impossibleCircuit, I: BTM_CASING_ECO.impossible }, 'kubejs:casing_ecosystem/impossible/molecular_assembler'),
        btmEcoRecipe('ae2:pattern_provider', ['SPS', 'CIC', 'SPS'], { S: BTM_CASING_ECO.skySteelSheet, P: 'ae2:blank_pattern', C: BTM_CASING_ECO.impossibleCircuit, I: BTM_CASING_ECO.impossible }, 'kubejs:casing_ecosystem/impossible/pattern_provider'),
        btmEcoRecipe('ae2:cell_workbench', ['SGS', 'CIC', 'SPS'], { S: BTM_CASING_ECO.skySteelSheet, G: BTM_CASING_ECO.glass, C: 'ae2:calculation_processor', I: BTM_CASING_ECO.impossible, P: BTM_CASING_ECO.impossibleCircuit }, 'kubejs:casing_ecosystem/impossible/cell_workbench'),
        btmEcoRecipe('ae2:crafting_unit', ['SPS', 'CIC', 'SPS'], { S: BTM_CASING_ECO.skySteelSheet, P: 'ae2:calculation_processor', C: BTM_CASING_ECO.impossibleCircuit, I: BTM_CASING_ECO.impossible }, 'kubejs:casing_ecosystem/impossible/crafting_unit'),
        btmEcoRecipe('ae2:wireless_access_point', [' F ', 'PIP', ' S '], { F: 'ae2:wireless_receiver', P: 'ae2:fluix_crystal', I: BTM_CASING_ECO.impossible, S: BTM_CASING_ECO.skySteelSheet }, 'kubejs:casing_ecosystem/impossible/wireless_access_point'),
        btmEcoRecipe('ae2:annihilation_plane', ['SFS', 'CIC', 'SFS'], { S: BTM_CASING_ECO.skySteelSheet, F: 'ae2:annihilation_core', C: BTM_CASING_ECO.impossibleCircuit, I: BTM_CASING_ECO.impossible }, 'kubejs:casing_ecosystem/impossible/annihilation_plane'),
        btmEcoRecipe('ae2:formation_plane', ['SFS', 'CIC', 'SFS'], { S: BTM_CASING_ECO.skySteelSheet, F: 'ae2:formation_core', C: BTM_CASING_ECO.impossibleCircuit, I: BTM_CASING_ECO.impossible }, 'kubejs:casing_ecosystem/impossible/formation_plane'),
        btmEcoRecipe('ae2:pattern_encoding_terminal', ['SPS', 'TIT', 'SCS'], { S: BTM_CASING_ECO.skySteelSheet, P: 'ae2:blank_pattern', T: 'ae2:terminal', I: BTM_CASING_ECO.impossible, C: BTM_CASING_ECO.impossibleCircuit }, 'kubejs:casing_ecosystem/impossible/pattern_encoding_terminal')
    ])
})

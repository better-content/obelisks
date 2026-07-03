// Dimension proof gates for external reward graph starts.
// Meteor dimensions provide native material proofs for route tools; they do not
// become labels for the main Create, AE2, PNCR, OC2R, or side-magic spines.

var BTM_DIM_PROOF_ADDED = 0

function btmDimProofShaped(event, output, pattern, keys, recipeId, count) {
    event.remove({ output: output })
    event.shaped(count ? Item.of(output, count) : output, pattern, keys).id(recipeId)
    BTM_DIM_PROOF_ADDED++
}

function btmDimProofMechanical(event, output, pattern, keys, recipeId, count) {
    event.remove({ output: output })
    global.btmFactoryCrafting(event, recipeId, output, count || 1, pattern, keys, true)
    BTM_DIM_PROOF_ADDED++
}

ServerEvents.recipes(function (event) {
    BTM_DIM_PROOF_ADDED = 0

    // Aether -> air travel and expedition mobility.
    btmDimProofMechanical(event, 'hangglider:glider_wing', [
        '  S',
        ' SA',
        'SAA'
    ], {
        S: 'aether:skyroot_stick',
        A: 'aether:blue_aercloud'
    }, 'kubejs:dimension_graph/aether/glider_wing')

    btmDimProofMechanical(event, 'hangglider:glider_framework', [
        ' Z ',
        'IAI',
        'I I'
    ], {
        Z: 'aether:zanite_gemstone',
        I: '#forge:plates/iron',
        A: 'aether:aerogel'
    }, 'kubejs:dimension_graph/aether/glider_framework')

    btmDimProofMechanical(event, 'hangglider:hang_glider', [
        'WFW',
        ' A ',
        ' B '
    ], {
        W: 'hangglider:glider_wing',
        F: 'hangglider:glider_framework',
        A: 'aether:aerogel',
        B: 'kubejs:brass_machine_casing'
    }, 'kubejs:dimension_graph/aether/hang_glider')

    btmDimProofMechanical(event, 'hangglider:reinforced_hang_glider', [
        'EGE',
        'SCS',
        'EGE'
    ], {
        E: 'minecraft:elytra',
        G: 'hangglider:hang_glider',
        S: 'kubejs:sky_steel_sheet',
        C: 'kubejs:impossible_machine_casing'
    }, 'kubejs:dimension_graph/aether/reinforced_hang_glider')

    btmDimProofMechanical(event, 'immersive_aircraft:sail', [
        'AAA',
        'SBS',
        'AAA'
    ], {
        A: 'aether:blue_aercloud',
        S: 'minecraft:string',
        B: 'aether:ambrosium_shard'
    }, 'kubejs:dimension_graph/aether/aircraft_sail')

    btmDimProofMechanical(event, 'immersive_aircraft:hull', [
        'SZS',
        'PAP',
        'SZS'
    ], {
        S: 'aether:skyroot_log',
        Z: 'aether:zanite_gemstone',
        P: '#forge:plates/iron',
        A: 'aether:aerogel'
    }, 'kubejs:dimension_graph/aether/aircraft_hull')

    btmDimProofMechanical(event, 'immersive_aircraft:propeller', [
        ' Q ',
        'PAP',
        ' Q '
    ], {
        Q: 'aether:quicksoil_glass',
        P: '#forge:plates/iron',
        A: 'aether:aerogel'
    }, 'kubejs:dimension_graph/aether/aircraft_propeller')

    btmDimProofMechanical(event, 'immersive_aircraft:airship', [
        'SSS',
        'HHH',
        'BCE'
    ], {
        S: 'immersive_aircraft:sail',
        H: 'immersive_aircraft:hull',
        B: 'kubejs:brass_machine_casing',
        C: 'aether:aerogel',
        E: 'immersive_aircraft:engine'
    }, 'kubejs:dimension_graph/aether/airship')

    btmDimProofMechanical(event, 'immersive_aircraft:biplane', [
        ' H ',
        'HEP',
        ' B '
    ], {
        H: 'immersive_aircraft:hull',
        E: 'immersive_aircraft:engine',
        P: 'immersive_aircraft:propeller',
        B: 'kubejs:brass_machine_casing'
    }, 'kubejs:dimension_graph/aether/biplane')

    btmDimProofMechanical(event, 'immersive_aircraft:gyrodyne', [
        ' S ',
        'HPH',
        ' B '
    ], {
        S: 'immersive_aircraft:sail',
        H: 'immersive_aircraft:hull',
        P: 'immersive_aircraft:propeller',
        B: 'kubejs:brass_machine_casing'
    }, 'kubejs:dimension_graph/aether/gyrodyne')

    btmDimProofMechanical(event, 'immersive_aircraft:quadrocopter', [
        'PBP',
        'BEB',
        'PBP'
    ], {
        P: 'immersive_aircraft:propeller',
        B: 'kubejs:brass_machine_casing',
        E: 'immersive_aircraft:engine'
    }, 'kubejs:dimension_graph/aether/quadrocopter')

    btmDimProofMechanical(event, 'immersive_aircraft:cargo_airship', [
        'CAC',
        'CHC',
        ' B '
    ], {
        C: 'minecraft:chest',
        A: 'immersive_aircraft:airship',
        H: 'immersive_aircraft:hull',
        B: 'kubejs:electrical_machine_casing'
    }, 'kubejs:dimension_graph/aether/cargo_airship')

    // Everdawn -> light-side expedition support. Basic Thirst bowls, bottles,
    // buckets, and early water purification stay outside this gate.
    btmDimProofShaped(event, 'cold_sweat:waterskin', [
        ' B ',
        'LPL',
        ' L '
    ], {
        B: 'blue_skies:brewberry',
        L: '#forge:leather',
        P: 'blue_skies:pyrope_gem'
    }, 'kubejs:dimension_graph/everdawn/waterskin', 2)

    btmDimProofShaped(event, 'brewinandchewin:keg', [
        'PUP',
        'ICI',
        'PUP'
    ], {
        P: 'blue_skies:lunar_planks',
        U: 'blue_skies:polished_umber',
        I: '#forge:plates/iron',
        C: 'minecraft:honeycomb'
    }, 'kubejs:dimension_graph/everdawn/keg')

    // Everbright -> dark-side expedition support. These routes deliberately stay
    // on scouting, reagent, and fieldcraft outputs instead of assigning the dark
    // magic spine to the dimension itself.
    btmDimProofShaped(event, 'minecraft:soul_torch', [
        ' M ',
        ' S '
    ], {
        M: 'blue_skies:moonstone',
        S: 'blue_skies:starlit_stick'
    }, 'kubejs:dimension_graph/everbright/soul_torch', 4)

    btmDimProofShaped(event, 'minecraft:fermented_spider_eye', [
        ' M ',
        'SES',
        ' A '
    ], {
        M: 'minecraft:brown_mushroom',
        S: 'minecraft:sugar',
        E: 'minecraft:spider_eye',
        A: 'blue_skies:aquite'
    }, 'kubejs:dimension_graph/everbright/fermented_spider_eye', 2)

    console.info('[dimension-proof-graph-starts] registered ' + BTM_DIM_PROOF_ADDED + ' recipe gates')
})

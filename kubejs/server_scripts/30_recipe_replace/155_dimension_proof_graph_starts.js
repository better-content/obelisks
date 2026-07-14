// Dimension proof gates for external reward graph starts.
// Dimension Drink dimensions provide native material proofs for route tools; they do not
// become labels for the main Create, AE2, PNCR, OC2R, or side-magic spines.

var BC_DIM_PROOF_ADDED = 0

function bcDimProofShaped(event, output, pattern, keys, recipeId, count) {
    event.remove({ output: output })
    event.shaped(count ? Item.of(output, count) : output, pattern, keys).id(recipeId)
    BC_DIM_PROOF_ADDED++
}

function bcDimProofMechanical(event, output, pattern, keys, recipeId, count) {
    event.remove({ output: output })
    global.bcFactoryCrafting(event, recipeId, output, count || 1, pattern, keys, true)
    BC_DIM_PROOF_ADDED++
}

ServerEvents.recipes(function (event) {
    BC_DIM_PROOF_ADDED = 0

    // Aether -> air travel and expedition mobility.
     bcDimProofMechanical(event, 'hangglider:glider_wing', [
        '  S',
        ' SA',
        'SAA'
    ], {
        S: 'aether:skyroot_stick',
        A: 'aether:blue_aercloud'
    }, 'kubejs:dimension_graph/aether/glider_wing')

     bcDimProofMechanical(event, 'hangglider:glider_framework', [
        ' Z ',
        'IAI',
        'I I'
    ], {
        Z: 'aether:zanite_gemstone',
        I: '#forge:plates/iron',
        A: 'aether:aerogel'
    }, 'kubejs:dimension_graph/aether/glider_framework')

     bcDimProofMechanical(event, 'hangglider:hang_glider', [
        'WFW',
        ' A ',
        ' B '
    ], {
        W: 'hangglider:glider_wing',
        F: 'hangglider:glider_framework',
        A: 'aether:aerogel',
        B: 'kubejs:brass_machine_casing'
    }, 'kubejs:dimension_graph/aether/hang_glider')

     bcDimProofMechanical(event, 'hangglider:reinforced_hang_glider', [
        'EGE',
        'SCS',
        'EGE'
    ], {
        E: 'minecraft:elytra',
        G: 'hangglider:hang_glider',
        S: 'kubejs:sky_steel_sheet',
        C: 'kubejs:impossible_machine_casing'
    }, 'kubejs:dimension_graph/aether/reinforced_hang_glider')

    console.info('[dimension-proof-graph-starts] registered ' + BC_DIM_PROOF_ADDED + ' recipe gates')
})

// Blood Magic offers attentive, LP-paid batch alternatives for essential Create
// materials. These are not free bypasses: slates and LP replace automation.

function btmBmManualAlchemy(event, id, inputs, output, syphon, ticks, tier) {
    event.custom({
        type: 'bloodmagic:alchemytable',
        input: inputs,
        output: output,
        syphon: syphon,
        ticks: ticks,
        upgradeLevel: tier
    }).id('kubejs:bloodmagic/manual_create_yield/' + id)
}

ServerEvents.recipes(function (event) {
    if (!Platform.isLoaded('bloodmagic') || !Platform.isLoaded('create')) return

    btmBmManualAlchemy(event, 'andesite_alloy_batch', [
        { item: 'minecraft:andesite' },
        { item: 'minecraft:andesite' },
        { item: 'minecraft:iron_ingot' },
        { item: 'chemlib:zinc_ingot' },
        { item: 'bloodmagic:blankslate' }
    ], { item: 'create:andesite_alloy', count: 6 }, 1600, 120, 1)

    btmBmManualAlchemy(event, 'brass_ingot_batch', [
        { item: 'minecraft:copper_ingot' },
        { item: 'minecraft:copper_ingot' },
        { item: 'chemlib:zinc_ingot' },
        { item: 'chemlib:zinc_ingot' },
        { item: 'bloodmagic:reinforcedslate' }
    ], { item: 'create:brass_ingot', count: 4 }, 4200, 160, 2)

    btmBmManualAlchemy(event, 'precision_mechanism_pair', [
        { item: 'create:brass_sheet' },
        { item: 'create:cogwheel' },
        { item: 'create:large_cogwheel' },
        { item: 'create:electron_tube' },
        { item: 'bloodmagic:infusedslate' }
    ], { item: 'create:precision_mechanism', count: 2 }, 12000, 220, 3)

    btmBmManualAlchemy(event, 'pressure_seal_batch', [
        { item: 'minecraft:dried_kelp' },
        { item: 'minecraft:dried_kelp' },
        { item: 'minecraft:slime_ball' },
        { item: 'minecraft:slime_ball' },
        { item: 'bloodmagic:blankslate' }
    ], { item: 'kubejs:pressure_seal', count: 4 }, 2600, 140, 1)
})

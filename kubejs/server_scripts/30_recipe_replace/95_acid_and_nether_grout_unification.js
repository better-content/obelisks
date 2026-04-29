ServerEvents.recipes(event => {
    // Manual fluid unification (Almost Unified does not handle these fluid recipe ingredients).
    event.replaceInput({}, Fluid.of('the_finley_dimension_remastered:acid', 1), Fluid.of('chemlib:nitric_acid_fluid', 1))
    event.replaceInput({}, Fluid.of('powergrid:acid', 1), Fluid.of('chemlib:sulfuric_acid_fluid', 1))
    event.replaceOutput({}, Fluid.of('powergrid:acid', 1), Fluid.of('chemlib:sulfuric_acid_fluid', 1))

    // Remove TConstruct nether grout crafting + furnace-style processing into scorched brick.
    event.remove({ output: 'tconstruct:nether_grout', type: 'minecraft:crafting_shaped' })
    event.remove({ output: 'tconstruct:nether_grout', type: 'minecraft:crafting_shapeless' })
    event.remove({ input: 'tconstruct:nether_grout', type: 'minecraft:smelting' })
    event.remove({ input: 'tconstruct:nether_grout', type: 'minecraft:blasting' })

    // Remove flint + magma casting table shortcut for scorched bricks.
    event.remove({ id: 'tconstruct:smeltery/casting/scorched/brick_composite' })

    // New nether grout path through Create mixing.
    event.custom({
        type: 'create:mixing',
        ingredients: [
            { item: 'minecraft:soul_sand' },
            { item: 'minecraft:soul_sand' },
            { item: 'minecraft:soul_sand' },
            { item: 'minecraft:soul_sand' },
            { item: 'undergarden:deepsoil' },
            { item: 'undergarden:deepsoil' },
            { item: 'undergarden:deepsoil' },
            { item: 'undergarden:deepsoil' },
            { item: 'blue_skies:crystal_sand' },
            { item: 'blue_skies:crystal_sand' },
            { item: 'blue_skies:crystal_sand' },
            { item: 'blue_skies:crystal_sand' }
        ],
        results: [{ item: 'tconstruct:nether_grout', count: 12 }]
    }).id('kubejs:create/mixing/nether_grout')
})

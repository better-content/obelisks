ServerEvents.recipes(event => {
    event.replaceInput(
        { output: 'tconstruct:grout' },
        'minecraft:clay_ball',
        'minecraft:netherrack'
    )

    event.replaceInput(
        { output: 'tconstruct:grout' },
        'minecraft:clay',
        'minecraft:netherrack'
    )
})

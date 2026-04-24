ServerEvents.recipes(event => {
    const COOLING_TICKS = 15 * 60 * 20
    const IRON_MB = 18 * 144

    event.custom({
        type: 'tconstruct:casting_basin',
        cast: {
            item: 'quark:charcoal_block'
        },
        cast_consumed: true,
        fluid: {
            name: 'tconstruct:molten_iron',
            amount: IRON_MB
        },
        result: {
            item: 'tconstruct:steel_block'
        },
        cooling_time: COOLING_TICKS
    })
})

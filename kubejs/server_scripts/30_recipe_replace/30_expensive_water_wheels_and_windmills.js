// Forge 1.20.1 / KubeJS 6+
// Replace Create shafts in water wheel + windmill bearing recipes with andesite casing.

ServerEvents.recipes(event => {
    const shaft = 'create:shaft'
    const casing = 'create:andesite_casing'

    event.replaceInput(
        { id: 'create:crafting/kinetics/water_wheel' },
        shaft,
        casing
    )

    event.replaceInput(
        { id: 'create:crafting/kinetics/windmill_bearing' },
        shaft,
        casing
    )

    // Optional: uncomment if you also want large water wheels changed.
    /*
     * event.replaceInput(
     *  { id: 'create:crafting/kinetics/large_water_wheel' },
     *  shaft,
     *  casing
)
*/
})

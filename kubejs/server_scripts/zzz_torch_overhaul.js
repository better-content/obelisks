// Forge 1.20.1 + KubeJS 6
// Disables vanilla torch recipes and replaces all uses with Realistic Torches.
// File prefixed with zzz_ to ensure late load.

ServerEvents.recipes(event => {
    const VANILLA = 'minecraft:torch'
    const UNLIT   = 'realistictorches:unlit_torch'
    const LIT     = 'realistictorches:lit_torch'

    // ------------------------------------------------------------------
    // 1) Remove every recipe that outputs vanilla torch
    // ------------------------------------------------------------------
    event.forEachRecipe({ output: VANILLA }, r => {
        console.log(`[kubejs] removing vanilla torch recipe: ${r.getId()}`)
    })
    event.remove({ output: VANILLA })

    // ------------------------------------------------------------------
    // 2) Replace vanilla torch everywhere else in recipes
    //    - As ingredient -> unlit torch
    //    - As output     -> lit torch (safety net)
    // ------------------------------------------------------------------
    event.replaceInput({}, VANILLA, UNLIT)
    event.replaceOutput({}, VANILLA, LIT)

    // ------------------------------------------------------------------
    // 3) Optional: catch tag-based torch usage
    //    (uncomment ONLY if you want all torch tags to mean unlit torch)
    // ------------------------------------------------------------------
    // event.replaceInput({}, '#minecraft:torches', UNLIT)
    // event.replaceInput({}, '#forge:torches', UNLIT)
})

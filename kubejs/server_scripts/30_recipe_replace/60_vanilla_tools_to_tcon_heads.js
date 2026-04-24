// Removes vanilla tool outputs and remaps vanilla tool inputs to TCon parts.

ServerEvents.recipes(function (event) {
    var baseToolMap = {
        pickaxe: 'tconstruct:pick_head',
        axe: 'tconstruct:small_axe_head',
        shovel: 'tconstruct:adze_head',
        sword: 'tconstruct:small_blade',
        hoe: 'tinkers_thinking:narrow_blade'
    }

    var diamondSteelMap = {
        pickaxe: Item.of('tconstruct:pick_head', '{Material:"tconstruct:steel"}'),
        axe: Item.of('tconstruct:small_axe_head', '{Material:"tconstruct:steel"}'),
        shovel: Item.of('tconstruct:adze_head', '{Material:"tconstruct:steel"}'),
        sword: Item.of('tconstruct:small_blade', '{Material:"tconstruct:steel"}'),
        hoe: Item.of('tinkers_thinking:narrow_blade', '{Material:"tconstruct:steel"}')
    }

    var tiers = ['wooden', 'stone', 'iron', 'golden', 'diamond', 'netherite']
    var kinds = ['pickaxe', 'axe', 'shovel', 'sword', 'hoe']

    for (var ti = 0; ti < tiers.length; ti++) {
        for (var ki = 0; ki < kinds.length; ki++) {
            var tier = tiers[ti]
            var kind = kinds[ki]
            var vanillaTool = 'minecraft:' + tier + '_' + kind

            event.remove({ output: vanillaTool })

            // Diamond tools gate into steel-part requirements.
            if (tier === 'diamond') {
                event.replaceInput({}, vanillaTool, diamondSteelMap[kind])
                continue
            }

            // Intentionally leave netherite input remapping for later.
            if (tier === 'netherite') continue

            event.replaceInput({}, vanillaTool, baseToolMap[kind])
        }
    }
})

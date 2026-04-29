// Removes vanilla tool outputs and remaps vanilla tool inputs to TCon parts.

var VANILLA_TOOL_TIERS = ['wooden', 'stone', 'iron', 'golden', 'diamond', 'netherite']
var VANILLA_TOOL_KINDS = ['pickaxe', 'axe', 'shovel', 'sword', 'hoe']

function vanillaToolIds() {
    var tools = []
    for (var ti = 0; ti < VANILLA_TOOL_TIERS.length; ti++) {
        for (var ki = 0; ki < VANILLA_TOOL_KINDS.length; ki++) {
            tools.push('minecraft:' + VANILLA_TOOL_TIERS[ti] + '_' + VANILLA_TOOL_KINDS[ki])
        }
    }
    return tools
}

ServerEvents.recipes(function (event) {
    var baseToolMap = {
        pickaxe: 'tconstruct:pick_head',
        axe: 'tconstruct:small_axe_head',
        shovel: 'tconstruct:adze_head',
        sword: 'tconstruct:small_blade',
        hoe: 'tinkers_thinking:narrow_blade'
    }

    var diamondAlloyMap = {
        pickaxe: Item.of('tconstruct:pick_head', '{Material:"tconstruct:manyullyn"}'),
        axe: Item.of('tconstruct:small_axe_head', '{Material:"tconstruct:manyullyn"}'),
        shovel: Item.of('tconstruct:adze_head', '{Material:"tconstruct:manyullyn"}'),
        sword: Item.of('tconstruct:small_blade', '{Material:"tconstruct:manyullyn"}'),
        hoe: Item.of('tinkers_thinking:narrow_blade', '{Material:"tconstruct:manyullyn"}')
    }

    for (var ti = 0; ti < VANILLA_TOOL_TIERS.length; ti++) {
        for (var ki = 0; ki < VANILLA_TOOL_KINDS.length; ki++) {
            var tier = VANILLA_TOOL_TIERS[ti]
            var kind = VANILLA_TOOL_KINDS[ki]
            var vanillaTool = 'minecraft:' + tier + '_' + kind

            event.remove({ output: vanillaTool })
            event.remove({ type: 'minecraft:smithing_transform', output: vanillaTool })

            // Diamond tools gate into a real alloyed TCon material, not steel.
            if (tier === 'diamond') {
                event.replaceInput({}, vanillaTool, diamondAlloyMap[kind])
                continue
            }

            // Intentionally leave netherite input remapping for later.
            if (tier === 'netherite') continue

            event.replaceInput({}, vanillaTool, baseToolMap[kind])
        }
    }
})

ServerEvents.tags('item', function (event) {
    event.add('c:hidden_from_recipe_viewers', vanillaToolIds())
})

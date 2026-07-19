// Removes vanilla-style tool outputs and remaps vanilla tool inputs to TCon parts.

var BC_VANILLA_TOOL_TIERS = ['wooden', 'stone', 'iron', 'golden', 'diamond', 'netherite']
var BC_VANILLA_TOOL_KINDS = ['pickaxe', 'axe', 'shovel', 'sword', 'hoe']

var BC_VANILLA_STYLE_TOOL_FAMILIES = [
    ['ae2', ['certus_quartz', 'fluix', 'nether_quartz']],
    ['aether', ['gravitite', 'holystone', 'skyroot', 'zanite']],
    ['deeperdarker', ['resonarium', 'warden']],
    ['everythingcopper', ['copper']],
    ['forbidden_arcanus', ['draco_arcanus']],
    ['goety', ['dark']],
    ['malum', ['soul_stained_steel']],
    ['undergarden', ['cloggrum', 'forgotten', 'froststeel', 'utherium']]
]

var BC_VANILLA_STYLE_TOOL_EXTRAS = [
    'ars_nouveau:enchanters_sword',
    'create:cardboard_sword',
    'farmersdelight:diamond_knife',
    'farmersdelight:flint_knife',
    'farmersdelight:golden_knife',
    'farmersdelight:iron_knife',
    'farmersdelight:netherite_knife',
    'forbidden_arcanus:slimec_pickaxe',
    'goety:diamond_ice_axe',
    'goety:eerie_pickaxe',
    'goety:graverobber_shovel',
    'goety:iron_ice_axe',
    'goety:rampaging_axe',
    'notreepunching:diamond_knife',
    'notreepunching:diamond_mattock',
    'notreepunching:diamond_saw',
    'notreepunching:flint_axe',
    'notreepunching:flint_hoe',
    'notreepunching:flint_knife',
    'notreepunching:flint_pickaxe',
    'notreepunching:flint_shovel',
    'notreepunching:gold_knife',
    'notreepunching:gold_mattock',
    'notreepunching:gold_saw',
    'notreepunching:iron_knife',
    'notreepunching:iron_mattock',
    'notreepunching:iron_saw',
    'notreepunching:netherite_knife',
    'notreepunching:netherite_mattock',
    'notreepunching:netherite_saw',
    'occultism:iesnium_pickaxe',
    'occultism:infused_pickaxe',
    'rpgstats:bone_ritual_dagger',
    'rpgstats:diamond_ritual_dagger',
    'rpgstats:gold_ritual_dagger',
    'rpgstats:iron_ritual_dagger',
    'the_flesh_that_hates:flesh_axe',
    'the_flesh_that_hates:flesh_sword',
    'twilightforest:fiery_pickaxe',
    'twilightforest:fiery_sword',
    'twilightforest:giant_pickaxe',
    'twilightforest:giant_sword',
    'twilightforest:ironwood_axe',
    'twilightforest:ironwood_hoe',
    'twilightforest:ironwood_pickaxe',
    'twilightforest:ironwood_shovel',
    'twilightforest:ironwood_sword',
    'twilightforest:knightmetal_axe',
    'twilightforest:knightmetal_pickaxe',
    'twilightforest:knightmetal_sword',
    'twilightforest:steeleaf_axe',
    'twilightforest:steeleaf_hoe',
    'twilightforest:steeleaf_pickaxe',
    'twilightforest:steeleaf_shovel',
    'twilightforest:steeleaf_sword',
    'undergarden:forgotten_battleaxe'
]

var BC_VANILLA_STYLE_TOOL_RECIPE_IDS = [
    'occultism:ritual/craft_infused_pickaxe'
]

function bcItemExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function vanillaToolIds() {
    var tools = []
    for (var ti = 0; ti < BC_VANILLA_TOOL_TIERS.length; ti++) {
        for (var ki = 0; ki < BC_VANILLA_TOOL_KINDS.length; ki++) {
            tools.push('minecraft:' + BC_VANILLA_TOOL_TIERS[ti] + '_' + BC_VANILLA_TOOL_KINDS[ki])
        }
    }

    for (var fi = 0; fi < BC_VANILLA_STYLE_TOOL_FAMILIES.length; fi++) {
        var family = BC_VANILLA_STYLE_TOOL_FAMILIES[fi]
        for (var mi = 0; mi < family[1].length; mi++) {
            for (var fki = 0; fki < BC_VANILLA_TOOL_KINDS.length; fki++) {
                tools.push(family[0] + ':' + family[1][mi] + '_' + BC_VANILLA_TOOL_KINDS[fki])
            }
        }
    }

    for (var ei = 0; ei < BC_VANILLA_STYLE_TOOL_EXTRAS.length; ei++) tools.push(BC_VANILLA_STYLE_TOOL_EXTRAS[ei])

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

    var tools = vanillaToolIds()
    for (var i = 0; i < tools.length; i++) {
        var tool = tools[i]

        event.remove({ output: tool })
        event.remove({ id: tool })
        event.remove({ type: tool })
        event.remove({ type: 'minecraft:smithing_transform', output: tool })
    }

    for (var ri = 0; ri < BC_VANILLA_STYLE_TOOL_RECIPE_IDS.length; ri++) {
        event.remove({ id: BC_VANILLA_STYLE_TOOL_RECIPE_IDS[ri] })
    }

    for (var ti = 0; ti < BC_VANILLA_TOOL_TIERS.length; ti++) {
        for (var ki = 0; ki < BC_VANILLA_TOOL_KINDS.length; ki++) {
            var tier = BC_VANILLA_TOOL_TIERS[ti]
            var kind = BC_VANILLA_TOOL_KINDS[ki]
            var vanillaTool = 'minecraft:' + tier + '_' + kind

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
    var tools = vanillaToolIds()
    for (var i = 0; i < tools.length; i++) {
        if (bcItemExists(tools[i])) event.add('c:hidden_from_recipe_viewers', tools[i])
    }
})

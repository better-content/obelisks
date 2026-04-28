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

StartupEvents.modifyCreativeTab('minecraft:tools_and_utilities', function (event) {
    vanillaToolIds().forEach(function (tool) {
        event.remove(tool)
    })
})

StartupEvents.modifyCreativeTab('minecraft:combat', function (event) {
    vanillaToolIds().forEach(function (tool) {
        event.remove(tool)
    })
})

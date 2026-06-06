// Lightweight No Tree Punching replacement.
// Hands can gather only the authored survival whitelist; other blocks need matching tools.

var BtmNtprEventResult = Java.loadClass('net.minecraftforge.eventbus.api.Event$Result')
var BtmNtprForgeRegistries = Java.loadClass('net.minecraftforge.registries.ForgeRegistries')

var BtmNtprAssignments = null

function btmNtprCall(target, methodNames, args) {
    if (target === null || target === undefined) return null
    for (var i = 0; i < methodNames.length; i++) {
        try {
            if (args && args.length === 1) return target[methodNames[i]](args[0])
            if (args && args.length === 2) return target[methodNames[i]](args[0], args[1])
            if (args && args.length === 3) return target[methodNames[i]](args[0], args[1], args[2])
            if (args && args.length) return target[methodNames[i]].apply(target, args)
            return target[methodNames[i]]()
        } catch (e) {
            // Try the next mapped or obfuscated name.
        }
    }
    return null
}

function btmNtprBool(value) {
    return value === true || String(value) === 'true'
}

function btmNtprMakeSet(values) {
    var out = {}
    if (!values) return out
    try {
        for (var i = 0; i < values.length; i++) out[String(values[i])] = true
    } catch (ignored) {
    }
    return out
}

var BtmNtprBlockSets = {}
var BtmNtprItemSets = {}
var BtmNtprLoadedSchema = null

function btmNtprRefreshAssignments() {
    var current = global.BTM_NTPR_AUDIT_ASSIGNMENTS || { blocks: {}, items: {} }
    var schema = String(current.schema || 'UNKNOWN')
    if (BtmNtprAssignments === current && BtmNtprLoadedSchema === schema) return

    BtmNtprAssignments = current
    BtmNtprLoadedSchema = schema
    var blocks = BtmNtprAssignments.blocks || {}
    var items = BtmNtprAssignments.items || {}
    BtmNtprBlockSets = {
        hand: btmNtprMakeSet(blocks.hand),
        knife: btmNtprMakeSet(blocks.knife),
        axe: btmNtprMakeSet(blocks.axe),
        pickaxe: btmNtprMakeSet(blocks.pickaxe),
        shovel: btmNtprMakeSet(blocks.shovel),
        hoe: btmNtprMakeSet(blocks.hoe),
        sword: btmNtprMakeSet(blocks.sword)
    }
    BtmNtprItemSets = {
        knife: btmNtprMakeSet(items.knife),
        axe: btmNtprMakeSet(items.axe),
        pickaxe: btmNtprMakeSet(items.pickaxe),
        shovel: btmNtprMakeSet(items.shovel),
        hoe: btmNtprMakeSet(items.hoe),
        sword: btmNtprMakeSet(items.sword)
    }

    console.info('[BTM-NTPR] loaded audited block gates schema=' + schema +
        ' hand=' + Object.keys(BtmNtprBlockSets.hand).length +
        ' knife=' + Object.keys(BtmNtprBlockSets.knife).length +
        ' axe=' + Object.keys(BtmNtprBlockSets.axe).length +
        ' pickaxe=' + Object.keys(BtmNtprBlockSets.pickaxe).length +
        ' shovel=' + Object.keys(BtmNtprBlockSets.shovel).length +
        ' hoe=' + Object.keys(BtmNtprBlockSets.hoe).length +
        ' sword=' + Object.keys(BtmNtprBlockSets.sword).length)
}

btmNtprRefreshAssignments()

function btmNtprStackIsEmpty(stack) {
    if (stack === null || stack === undefined) return true
    return btmNtprBool(btmNtprCall(stack, ['isEmpty', 'm_41619_'], []))
}

function btmNtprIsCreative(player) {
    if (btmNtprBool(btmNtprCall(player, ['isCreative', 'isCreativeMode'], []))) return true

    var abilities = btmNtprCall(player, ['getAbilities', 'm_150110_'], [])
    if (abilities && abilities.instabuild === true) return true

    return false
}

function btmNtprStateId(state) {
    var block = btmNtprCall(state, ['getBlock', 'm_60734_'], [])
    var key = block ? BtmNtprForgeRegistries.BLOCKS.getKey(block) : null
    return key ? String(key) : ''
}

function btmNtprStackId(stack) {
    if (btmNtprStackIsEmpty(stack)) return ''
    var item = btmNtprCall(stack, ['getItem', 'm_41720_'], [])
    var key = item ? BtmNtprForgeRegistries.ITEMS.getKey(item) : null
    return key ? String(key) : ''
}

function btmNtprBlockIn(setName, id) {
    return id && BtmNtprBlockSets[setName] && BtmNtprBlockSets[setName][id] === true
}

function btmNtprItemIn(setName, id) {
    return id && BtmNtprItemSets[setName] && BtmNtprItemSets[setName][id] === true
}

function btmNtprHasMatchingTool(player, state) {
    if (btmNtprIsCreative(player)) return true

    var id = btmNtprStateId(state)
    if (!id) return false

    var stack = btmNtprCall(player, ['getMainHandItem', 'm_21205_'], [])
    var itemId = btmNtprStackId(stack)

    if (btmNtprBlockIn('knife', id) && btmNtprItemIn('knife', itemId)) return true
    if (btmNtprBlockIn('axe', id) && btmNtprItemIn('axe', itemId)) return true
    if (btmNtprBlockIn('pickaxe', id) && btmNtprItemIn('pickaxe', itemId)) return true
    if (btmNtprBlockIn('shovel', id) && btmNtprItemIn('shovel', itemId)) return true
    if (btmNtprBlockIn('hoe', id) && btmNtprItemIn('hoe', itemId)) return true
    if (btmNtprBlockIn('sword', id) && btmNtprItemIn('sword', itemId)) return true

    return false
}

function btmNtprShouldDeny(player, state) {
    btmNtprRefreshAssignments()
    if (!player || !state) return false
    var id = btmNtprStateId(state)
    if (!id) return false
    if (btmNtprBlockIn('hand', id)) return false
    return !btmNtprHasMatchingTool(player, state)
}

function btmNtprBlockStateAt(level, pos) {
    if (!level || !pos) return null
    return btmNtprCall(level, ['getBlockState', 'm_8055_'], [pos])
}

ForgeEvents.onEvent('net.minecraftforge.event.entity.player.PlayerEvent$BreakSpeed', function (event) {
    if (btmNtprShouldDeny(event.getEntity(), event.getState())) {
        event.setNewSpeed(0.0)
        event.setCanceled(true)
    }
})

ForgeEvents.onEvent('net.minecraftforge.event.entity.player.PlayerEvent$HarvestCheck', function (event) {
    if (btmNtprShouldDeny(event.getEntity(), event.getTargetBlock())) {
        event.setCanHarvest(false)
    }
})

ForgeEvents.onEvent('net.minecraftforge.event.entity.player.PlayerInteractEvent$LeftClickBlock', function (event) {
    var state = btmNtprBlockStateAt(event.getLevel(), event.getPos())
    if (btmNtprShouldDeny(event.getEntity(), state)) {
        event.setUseBlock(BtmNtprEventResult.DENY)
        event.setUseItem(BtmNtprEventResult.DENY)
        event.setCanceled(true)
    }
})

ForgeEvents.onEvent('net.minecraftforge.event.level.BlockEvent$BreakEvent', function (event) {
    if (btmNtprShouldDeny(event.getPlayer(), event.getState())) {
        event.setCanceled(true)
    }
})

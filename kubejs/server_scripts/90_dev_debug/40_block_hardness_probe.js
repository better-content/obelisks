// Dev-only block hardness registry probe. Enable kubejs/config/block_hardness_probe.json,
// then restart or /reload. Writes actual runtime block destroy-time values.

var BC_BLOCK_PROBE_CONFIG = 'kubejs/config/block_hardness_probe.json'
var BC_BLOCK_PROBE_DEFAULT_DIR = 'generated/runtime-dumps/'
var BC_BLOCK_PROBE_FALLBACK_PATH = 'kubejs/config/block_hardness_probe.runtime.json'

var BcBlockProbeBuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
var BcBlockProbeResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
var BcBlockProbeBlockTags = Java.loadClass('net.minecraft.tags.BlockTags')
var BcBlockProbeItemTags = Java.loadClass('net.minecraft.tags.ItemTags')
var BcBlockProbeItemStack = Java.loadClass('net.minecraft.world.item.ItemStack')
var BcBlockProbeToolActions = Java.loadClass('net.minecraftforge.common.ToolActions')
var BcBlockProbeHandBreakableTag = BcBlockProbeBlockTags.create(new BcBlockProbeResourceLocation('kubejs', 'hand_breakable'))
var BcBlockProbeKnivesTag = BcBlockProbeItemTags.create(new BcBlockProbeResourceLocation('forge', 'tools/knives'))
var BcBlockProbeCropsTag = BcBlockProbeBlockTags.create(new BcBlockProbeResourceLocation('minecraft', 'crops'))
var BcBlockProbeFlowersTag = BcBlockProbeBlockTags.create(new BcBlockProbeResourceLocation('minecraft', 'flowers'))
var BcBlockProbeLeavesTag = BcBlockProbeBlockTags.create(new BcBlockProbeResourceLocation('minecraft', 'leaves'))
var BcBlockProbeReplaceableTag = BcBlockProbeBlockTags.create(new BcBlockProbeResourceLocation('minecraft', 'replaceable'))
var BcBlockProbeSaplingsTag = BcBlockProbeBlockTags.create(new BcBlockProbeResourceLocation('minecraft', 'saplings'))

var BC_BLOCK_PROBE_DEFAULT_BLOCKS = [
    'minecraft:dirt',
    'minecraft:grass_block',
    'minecraft:coarse_dirt',
    'minecraft:rooted_dirt',
    'minecraft:mud',
    'minecraft:sand',
    'minecraft:gravel',
    'minecraft:stone',
    'minecraft:cobblestone',
    'minecraft:deepslate',
    'minecraft:tuff',
    'minecraft:calcite',
    'minecraft:coal_ore',
    'minecraft:deepslate_coal_ore',
    'minecraft:copper_ore',
    'minecraft:deepslate_copper_ore',
    'minecraft:iron_ore',
    'minecraft:deepslate_iron_ore',
    'minecraft:gold_ore',
    'minecraft:deepslate_gold_ore',
    'minecraft:redstone_ore',
    'minecraft:deepslate_redstone_ore',
    'minecraft:lapis_ore',
    'minecraft:deepslate_lapis_ore',
    'minecraft:diamond_ore',
    'minecraft:deepslate_diamond_ore',
    'minecraft:emerald_ore',
    'minecraft:deepslate_emerald_ore',
    'minecraft:oak_log',
    'minecraft:oak_planks',
    'minecraft:iron_block',
    'minecraft:obsidian',
    'minecraft:bedrock',
    'ae2:sky_stone_block',
    'create:andesite_casing',
    'undergarden:shiverstone',
    'undergarden:depthrock',
    'malum:runewood_log',
    'hexerei:willow_log',
    'hexerei:mahogany_log'
]

var BC_BLOCK_PROBE_TAGS = [
    { id: 'minecraft:mineable/pickaxe', tag: BcBlockProbeBlockTags.MINEABLE_WITH_PICKAXE },
    { id: 'minecraft:mineable/axe', tag: BcBlockProbeBlockTags.MINEABLE_WITH_AXE },
    { id: 'minecraft:mineable/shovel', tag: BcBlockProbeBlockTags.MINEABLE_WITH_SHOVEL },
    { id: 'minecraft:mineable/hoe', tag: BcBlockProbeBlockTags.MINEABLE_WITH_HOE },
    { id: 'minecraft:sword_efficient', tag: BcBlockProbeBlockTags.SWORD_EFFICIENT },
    { id: 'minecraft:needs_stone_tool', tag: BcBlockProbeBlockTags.NEEDS_STONE_TOOL },
    { id: 'minecraft:needs_iron_tool', tag: BcBlockProbeBlockTags.NEEDS_IRON_TOOL },
    { id: 'minecraft:needs_diamond_tool', tag: BcBlockProbeBlockTags.NEEDS_DIAMOND_TOOL },
    { id: 'kubejs:hand_breakable', tag: BcBlockProbeHandBreakableTag },
    { id: 'minecraft:crops', tag: BcBlockProbeCropsTag },
    { id: 'minecraft:flowers', tag: BcBlockProbeFlowersTag },
    { id: 'minecraft:leaves', tag: BcBlockProbeLeavesTag },
    { id: 'minecraft:replaceable', tag: BcBlockProbeReplaceableTag },
    { id: 'minecraft:saplings', tag: BcBlockProbeSaplingsTag }
]
var BC_BLOCK_PROBE_EXACT_SURFACE_PLANT_IDS = {
    'minecraft:grass': true,
    'minecraft:short_grass': true,
    'minecraft:tall_grass': true,
    'projectvibrantjourneys:short_grass': true
}

function bcBlockProbeReadConfig() {
    var fallback = {
        enabled: false,
        outputDir: BC_BLOCK_PROBE_DEFAULT_DIR,
        writeAllBlocks: false,
        blockIds: BC_BLOCK_PROBE_DEFAULT_BLOCKS
    }

    var cfg = JsonIO.read(BC_BLOCK_PROBE_CONFIG)
    if (!cfg) return fallback

    return {
        enabled: cfg.enabled === true,
        outputDir: String(cfg.outputDir || fallback.outputDir),
        writeAllBlocks: cfg.writeAllBlocks === true || cfg.scanAllBlocks === true,
        blockIds: bcBlockProbeArray(cfg.blockIds, fallback.blockIds)
    }
}

function bcBlockProbeArray(value, fallback) {
    if (!value) return fallback
    var out = []
    try {
        for (var i = 0; i < value.length; i++) out.push(String(value[i]))
    } catch (e) {
        return fallback
    }
    return out.length ? out : fallback
}

function bcBlockProbeCall(target, methodNames, args) {
    if (target === null || target === undefined) return null
    for (var i = 0; i < methodNames.length; i++) {
        try {
            if (args && args.length === 1) return target[methodNames[i]](args[0])
            if (args && args.length === 2) return target[methodNames[i]](args[0], args[1])
            if (args && args.length === 3) return target[methodNames[i]](args[0], args[1], args[2])
            if (args && args.length) return target[methodNames[i]].apply(target, args)
            return target[methodNames[i]]()
        } catch (e) {
            // Try the next mapping/overload.
        }
    }
    return null
}

function bcBlockProbeNumber(value) {
    if (value === null || value === undefined) return null
    var n = Number(value)
    if (isNaN(n)) return null
    return n
}

function bcBlockProbeBool(value) {
    return value === true || String(value) === 'true'
}

function bcBlockProbeTagId(tag) {
    var location = bcBlockProbeCall(tag, ['location'], [])
    return location ? String(location) : String(tag)
}

function bcBlockProbeUniquePush(arr, value) {
    if (value === null || value === undefined) return
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === value) return
    }
    arr.push(value)
}

function bcBlockProbeSortStrings(arr) {
    arr.sort(function (a, b) {
        if (a < b) return -1
        if (a > b) return 1
        return 0
    })
    return arr
}

function bcBlockProbeBlockById(id) {
    try {
        var key = new BcBlockProbeResourceLocation(id)
        var block = BcBlockProbeBuiltInRegistries.BLOCK.get(key)
        var actualKey = BcBlockProbeBuiltInRegistries.BLOCK.getKey(block)
        if (String(actualKey) !== id) return null
        return block
    } catch (e) {
        return null
    }
}

function bcBlockProbeTags(state) {
    var out = []
    if (!state) return out

    for (var i = 0; i < BC_BLOCK_PROBE_TAGS.length; i++) {
        if (bcBlockProbeBool(bcBlockProbeCall(state, ['is', 'm_60713_'], [BC_BLOCK_PROBE_TAGS[i].tag]))) {
             bcBlockProbeUniquePush(out, BC_BLOCK_PROBE_TAGS[i].id)
        }
    }

    try {
        var stream = bcBlockProbeCall(state, ['getTags', 'm_204343_'], [])
        var iterator = stream ?  bcBlockProbeCall(stream, ['iterator'], []) : null
        while (iterator &&  bcBlockProbeBool(bcBlockProbeCall(iterator, ['hasNext'], []))) {
            var tagId = bcBlockProbeTagId(bcBlockProbeCall(iterator, ['next'], []))
             bcBlockProbeUniquePush(out, tagId)
        }
    } catch (e) {
        // Some unusual states may not expose tag streams cleanly through Rhino.
    }

    return bcBlockProbeSortStrings(out)
}

function bcBlockProbeItemTags(stack) {
    var out = []
    if (!stack) return out

    try {
        var stream = bcBlockProbeCall(stack, ['getTags'], [])
        var iterator = stream ?  bcBlockProbeCall(stream, ['iterator'], []) : null
        while (iterator &&  bcBlockProbeBool(bcBlockProbeCall(iterator, ['hasNext'], []))) {
            var tagId = bcBlockProbeTagId(bcBlockProbeCall(iterator, ['next'], []))
             bcBlockProbeUniquePush(out, tagId)
        }
    } catch (e) {
        // Some unusual stacks may not expose tag streams cleanly through Rhino.
    }

    return bcBlockProbeSortStrings(out)
}

function bcBlockProbeStackIs(stack, tag) {
    return bcBlockProbeBool(bcBlockProbeCall(stack, ['is'], [tag]))
}

function bcBlockProbeStackCanPerform(stack, action) {
    return bcBlockProbeBool(bcBlockProbeCall(stack, ['canPerformAction'], [action]))
}

function bcBlockProbeItemRecord(id) {
    var item = null
    try {
        var key = new BcBlockProbeResourceLocation(id)
        item = BcBlockProbeBuiltInRegistries.ITEM.get(key)
        var actualKey = BcBlockProbeBuiltInRegistries.ITEM.getKey(item)
        if (String(actualKey) !== id) return { id: id, missing: true }
    } catch (e) {
        return { id: id, missing: true }
    }

    var stack = null
    try {
        stack = new BcBlockProbeItemStack(item)
    } catch (ignored) {}
    if (!stack) stack = bcBlockProbeCall(item, ['getDefaultInstance', 'm_7968_'], [])

    var actions = []
    if (bcBlockProbeStackCanPerform(stack, BcBlockProbeToolActions.AXE_DIG))  bcBlockProbeUniquePush(actions, 'axe')
    if (bcBlockProbeStackCanPerform(stack, BcBlockProbeToolActions.PICKAXE_DIG))  bcBlockProbeUniquePush(actions, 'pickaxe')
    if (bcBlockProbeStackCanPerform(stack, BcBlockProbeToolActions.SHOVEL_DIG))  bcBlockProbeUniquePush(actions, 'shovel')
    if (bcBlockProbeStackCanPerform(stack, BcBlockProbeToolActions.HOE_DIG))  bcBlockProbeUniquePush(actions, 'hoe')
    if (bcBlockProbeStackCanPerform(stack, BcBlockProbeToolActions.SWORD_DIG))  bcBlockProbeUniquePush(actions, 'sword')
    if (bcBlockProbeStackIs(stack, BcBlockProbeKnivesTag))  bcBlockProbeUniquePush(actions, 'knife')

    return {
        id: id,
        missing: false,
        runtimeTags: bcBlockProbeItemTags(stack),
        toolActions: bcBlockProbeSortStrings(actions)
    }
}

function bcBlockProbeMiningTags(tags) {
    var out = []
    var wanted = {}
    for (var i = 0; i < BC_BLOCK_PROBE_TAGS.length; i++) wanted[BC_BLOCK_PROBE_TAGS[i].id] = true
    for (var j = 0; j < tags.length; j++) {
        if (wanted[tags[j]])  bcBlockProbeUniquePush(out, tags[j])
    }
    return bcBlockProbeSortStrings(out)
}

function bcBlockProbeTagContains(tags, id) {
    for (var i = 0; i < tags.length; i++) {
        if (tags[i] === id) return true
    }
    return false
}

function bcBlockProbePath(id) {
    return id.indexOf(':') >= 0 ? id.split(':')[1] : id
}

function bcBlockProbeIsLeafId(id) {
    var path = bcBlockProbePath(id)
    return path.indexOf('leaves') >= 0 || path.indexOf('leaf') >= 0
}

function bcBlockProbeIsLooseSurfaceId(id) {
    var path = bcBlockProbePath(id)
    return path === 'gravel' ||
        path === 'sand' ||
        path === 'red_sand' ||
        path.indexOf('gravel') >= 0 ||
        path.lastIndexOf('_sand') === path.length - '_sand'.length
}

function bcBlockProbeIsSurfaceSoilPath(path) {
    return path === 'grass_block' ||
        path === 'rooty_grass_block' ||
        path.lastIndexOf('_grass_block') === path.length - '_grass_block'.length ||
        path.indexOf('grassy_') >= 0 ||
        path.lastIndexOf('_dirt') === path.length - '_dirt'.length ||
        path.lastIndexOf('_clay') === path.length - '_clay'.length ||
        path.lastIndexOf('_silt') === path.length - '_silt'.length ||
        path.lastIndexOf('_permafrost') === path.length - '_permafrost'.length ||
        path.lastIndexOf('_regolith') === path.length - '_regolith'.length
}

function bcBlockProbePathEndsWith(path, suffix) {
    if (path.length < suffix.length) return false
    return path.lastIndexOf(suffix) === path.length - suffix.length
}

function bcBlockProbeIsSurfacePlantPath(path) {
    return path === 'fern' ||
        path === 'large_fern' ||
        path === 'dead_bush' ||
        path === 'sugar_cane' ||
        path === 'cactus' ||
        path === 'bamboo' ||
        path === 'bamboo_sapling' ||
        path === 'vine' ||
        path === 'cave_vines' ||
        path === 'cave_vines_plant' ||
        path === 'glow_lichen' ||
        path.indexOf('fern') >= 0 ||
         bcBlockProbePathEndsWith(path, 'flower') ||
         bcBlockProbePathEndsWith(path, '_flower') ||
         bcBlockProbePathEndsWith(path, 'bush') ||
         bcBlockProbePathEndsWith(path, '_bush') ||
         bcBlockProbePathEndsWith(path, 'shrub') ||
         bcBlockProbePathEndsWith(path, '_shrub') ||
         bcBlockProbePathEndsWith(path, 'reed') ||
         bcBlockProbePathEndsWith(path, '_reed') ||
         bcBlockProbePathEndsWith(path, 'vine') ||
         bcBlockProbePathEndsWith(path, 'vines') ||
        path.indexOf('_vine_') >= 0 ||
        path.indexOf('_vines_') >= 0
}

function bcBlockProbeIsSurfacePlantId(id) {
    if (BC_BLOCK_PROBE_EXACT_SURFACE_PLANT_IDS[id] === true) return true

    var path = bcBlockProbePath(id)
    if (bcBlockProbeIsSurfaceSoilPath(path)) return false

    return bcBlockProbeIsSurfacePlantPath(path)
}

function bcBlockProbeRealisticHandsClassification(id, tags) {
    var surfacePlant = bcBlockProbeIsSurfacePlantId(id)
    var leaf = bcBlockProbeIsLeafId(id)
    var looseSurface = bcBlockProbeIsLooseSurfaceId(id)
    var handTag = bcBlockProbeTagContains(tags, 'kubejs:hand_breakable')
    var toolCategories = []

    if (bcBlockProbeTagContains(tags, 'minecraft:mineable/axe')) toolCategories.push('axe')
    if (bcBlockProbeTagContains(tags, 'minecraft:mineable/pickaxe')) toolCategories.push('pickaxe')
    if (bcBlockProbeTagContains(tags, 'minecraft:mineable/shovel')) toolCategories.push('shovel')
    if (bcBlockProbeTagContains(tags, 'minecraft:mineable/hoe')) toolCategories.push('hoe')
    if (bcBlockProbeTagContains(tags, 'minecraft:sword_efficient')) toolCategories.push('sword')

    return {
        surfacePlant: surfacePlant,
        leaf: leaf,
        looseSurface: looseSurface,
        handBreakable: !surfacePlant && !leaf && (handTag || looseSurface),
        knifeOnly: surfacePlant || leaf,
        toolCategories: surfacePlant || leaf ? [] : toolCategories,
        denyRiskWithoutMatchingTool: !surfacePlant && !leaf && !handTag && !looseSurface && toolCategories.length === 0
    }
}

function bcBlockProbeRecord(id) {
    var block = bcBlockProbeBlockById(id)
    if (!block) {
        return {
            id: id,
            missing: true
        }
    }

    var state = bcBlockProbeCall(block, ['defaultBlockState', 'm_49966_'], [])
    var destroyTime = bcBlockProbeNumber(bcBlockProbeCall(block, ['defaultDestroyTime', 'm_155943_'], []))
    var stateDestroyTime = bcBlockProbeNumber(bcBlockProbeCall(state, ['getDestroySpeed', 'm_60800_'], [null, null]))
    var explosionResistance = bcBlockProbeNumber(bcBlockProbeCall(block, ['getExplosionResistance', 'm_7334_'], []))
    var runtimeTags = bcBlockProbeTags(state)

    return {
        id: id,
        missing: false,
        defaultDestroyTime: destroyTime,
        defaultStateDestroySpeed: stateDestroyTime,
        explosionResistance: explosionResistance,
        requiresCorrectToolForDrops: bcBlockProbeBool(bcBlockProbeCall(state, ['requiresCorrectToolForDrops', 'm_60815_'], [])),
        runtimeTags: runtimeTags,
        miningTags: bcBlockProbeMiningTags(runtimeTags),
        realisticHands: bcBlockProbeRealisticHandsClassification(id, runtimeTags)
    }
}

function bcBlockProbeAllBlockIds() {
    var ids = []
    var keys = BcBlockProbeBuiltInRegistries.BLOCK.keySet().iterator()
    while (keys.hasNext()) ids.push(String(keys.next()))
    return bcBlockProbeSortStrings(ids)
}

function bcBlockProbeAllItemIds() {
    var ids = []
    var keys = BcBlockProbeBuiltInRegistries.ITEM.keySet().iterator()
    while (keys.hasNext()) ids.push(String(keys.next()))
    return bcBlockProbeSortStrings(ids)
}

function bcBlockProbeSummarize(records) {
    var missing = []
    var distinctDestroyTimes = []
    var destroyTimeCounts = {}

    for (var i = 0; i < records.length; i++) {
        var r = records[i]
        if (r.missing) {
            missing.push(r.id)
            continue
        }

        var key = String(r.defaultDestroyTime)
        destroyTimeCounts[key] = (destroyTimeCounts[key] || 0) + 1
         bcBlockProbeUniquePush(distinctDestroyTimes, key)
    }

     bcBlockProbeSortStrings(missing)
     bcBlockProbeSortStrings(distinctDestroyTimes)

    return {
        totalRecords: records.length,
        missingCount: missing.length,
        missing: missing,
        distinctDefaultDestroyTimes: distinctDestroyTimes,
        defaultDestroyTimeCounts: destroyTimeCounts
    }
}

function bcBlockProbeWrite(outputDir, payload) {
    var primaryPath = outputDir + 'block_hardness_probe.json'
    try {
        JsonIO.write(primaryPath, payload)
        return primaryPath
    } catch (e) {
        JsonIO.write(BC_BLOCK_PROBE_FALLBACK_PATH, payload)
        console.warn('[BC-BLOCK-HARDNESS-PROBE] primary write failed for ' + primaryPath + '; wrote fallback ' + BC_BLOCK_PROBE_FALLBACK_PATH + ' (' + e + ')')
        return BC_BLOCK_PROBE_FALLBACK_PATH
    }
}

ServerEvents.recipes(function (event) {
    var cfg = bcBlockProbeReadConfig()
    if (!cfg.enabled) return
    if (!String(cfg.outputDir).endsWith('/')) cfg.outputDir = String(cfg.outputDir) + '/'

    var selected = []
    for (var i = 0; i < cfg.blockIds.length; i++) selected.push(bcBlockProbeRecord(cfg.blockIds[i]))

    var allBlocks = []
    if (cfg.writeAllBlocks) {
        var ids = bcBlockProbeAllBlockIds()
        for (var j = 0; j < ids.length; j++) allBlocks.push(bcBlockProbeRecord(ids[j]))
    }

    var allItems = []
    if (cfg.writeAllBlocks) {
        var itemIds = bcBlockProbeAllItemIds()
        for (var k = 0; k < itemIds.length; k++) allItems.push(bcBlockProbeItemRecord(itemIds[k]))
    }

    var out = {
        schema: 'bc.block_hardness_probe.v3',
        generatedBy: 'kubejs/server_scripts/90_dev_debug/40_block_hardness_probe.js',
        generatedAt: 'runtime_recipe_event',
        selectedSummary: bcBlockProbeSummarize(selected),
        selectedBlocks: selected,
        allBlockSummary: cfg.writeAllBlocks ?  bcBlockProbeSummarize(allBlocks) : null,
        allBlocks: cfg.writeAllBlocks ? allBlocks : [],
        allItems: cfg.writeAllBlocks ? allItems : []
    }

    var writtenPath = bcBlockProbeWrite(cfg.outputDir, out)
    console.info('[BC-BLOCK-HARDNESS-PROBE] wrote ' + selected.length + ' selected blocks' + (cfg.writeAllBlocks ? ', ' + allBlocks.length + ' all-block records, and ' + allItems.length + ' item records' : '') + ' to ' + writtenPath)
})

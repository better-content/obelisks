// Dev-only recipe audit dumps. Enable in kubejs/config/audit_dumps.json, then run /reload.
// This is a pre-mutation recipe-event audit: it is useful for discovering vanilla/mod
// recipes that need removal or replacement, but it does not prove final KubeJS-added
// recipe state from the same reload.

var BTM_AUDIT_DUMP_CONFIG = 'kubejs/config/audit_dumps.json'
var BTM_AUDIT_DUMP_DIR = 'kubejs/config/'
var BTM_RECIPE_AUDIT_GENERATED_BY = 'kubejs/server_scripts/90_dev_debug/10_recipe_audit_dumps.js'
var BTM_RECIPE_AUDIT_STAGE = 'pre_mutation_recipe_event'
var BTM_RECIPE_AUDIT_SOURCE = 'ServerEvents.recipes event.forEachRecipe before KubeJS mutations are applied'
var BTM_RECIPE_AUDIT_SCHEMA = 'btm.recipe_audit.v2'

function btmAuditTimestamp() {
    try {
        return new Date().toISOString()
    } catch (e) {
        return String(new Date())
    }
}

function btmAuditReadConfig() {
    var fallback = {
        enabled: false,
        writeFullRecipeIndex: false,
        writeMatchedRecipeJson: true,
        maxJsonCharsPerRecipe: 12000,
        fullRecipeChunkSize: 1000
    }

    var cfg = JsonIO.read(BTM_AUDIT_DUMP_CONFIG)
    if (!cfg) return fallback

    return {
        enabled: cfg.enabled === true,
        writeFullRecipeIndex: cfg.writeFullRecipeIndex === true,
        writeMatchedRecipeJson: cfg.writeMatchedRecipeJson !== false,
        maxJsonCharsPerRecipe: Number(cfg.maxJsonCharsPerRecipe || fallback.maxJsonCharsPerRecipe),
        fullRecipeChunkSize: Number(cfg.fullRecipeChunkSize || fallback.fullRecipeChunkSize)
    }
}

function btmAuditContainsAny(haystack, needles) {
    for (var i = 0; i < needles.length; i++) {
        if (haystack.indexOf(needles[i]) !== -1) return true
    }
    return false
}

function btmAuditTruncateJson(json, maxChars) {
    if (!maxChars || maxChars < 100) return json
    if (json.length <= maxChars) return json
    return json.substring(0, maxChars) + '...<truncated ' + (json.length - maxChars) + ' chars>'
}

function btmAuditRecipeRecord(recipe, json, cfg) {
    var out = {
        id: String(recipe.getId()),
        type: String(recipe.getType())
    }
    if (cfg.writeMatchedRecipeJson) out.json = btmAuditTruncateJson(json, cfg.maxJsonCharsPerRecipe)
    return out
}

function btmAuditMakeBucketMap(keys) {
    var map = {}
    for (var i = 0; i < keys.length; i++) map[keys[i].id] = []
    return map
}

function btmAuditWriteFullIndexChunks(fullIndex, cfg, metadata) {
    if (!cfg.writeFullRecipeIndex) return 0

    var chunkSize = cfg.fullRecipeChunkSize
    if (!chunkSize || chunkSize < 100) chunkSize = 1000

    var chunkCount = 0
    for (var start = 0; start < fullIndex.length; start += chunkSize) {
        var chunk = []
        var end = start + chunkSize
        if (end > fullIndex.length) end = fullIndex.length

        for (var i = start; i < end; i++) chunk.push(fullIndex[i])

        var padded = String(chunkCount)
        while (padded.length < 4) padded = '0' + padded
        JsonIO.write(BTM_AUDIT_DUMP_DIR + 'full_recipe_index_' + padded + '.json', {
            schema: metadata.schema,
            generatedBy: metadata.generatedBy,
            generatedAt: metadata.generatedAt,
            recipeEventStage: metadata.recipeEventStage,
            chunk: chunkCount,
            start: start,
            endExclusive: end,
            count: chunk.length,
            recipes: chunk
        })
        chunkCount++
    }

    JsonIO.write(BTM_AUDIT_DUMP_DIR + 'full_recipe_index_manifest.json', {
        schema: metadata.schema,
        generatedBy: metadata.generatedBy,
        generatedAt: metadata.generatedAt,
        source: metadata.source,
        recipeEventStage: metadata.recipeEventStage,
        writeMatchedRecipeJson: cfg.writeMatchedRecipeJson,
        maxJsonCharsPerRecipe: cfg.maxJsonCharsPerRecipe,
        chunkSize: chunkSize,
        chunkCount: chunkCount,
        recipeCount: fullIndex.length,
        pattern: 'full_recipe_index_0000.json'
    })

    return chunkCount
}

var BTM_AUDIT_VALUABLE_MATERIALS = [
    { id: 'iron', needles: ['minecraft:iron_ingot', 'minecraft:iron_block', 'minecraft:raw_iron', 'forge:ingots/iron', 'forge:nuggets/iron', 'forge:storage_blocks/iron', 'ingots/iron', 'nuggets/iron'] },
    { id: 'copper', needles: ['minecraft:copper_ingot', 'minecraft:copper_block', 'minecraft:raw_copper', 'forge:ingots/copper', 'forge:nuggets/copper', 'forge:storage_blocks/copper', 'ingots/copper', 'nuggets/copper'] },
    { id: 'gold', needles: ['minecraft:gold_ingot', 'minecraft:gold_block', 'minecraft:raw_gold', 'forge:ingots/gold', 'forge:nuggets/gold', 'forge:storage_blocks/gold', 'ingots/gold', 'nuggets/gold'] },
    { id: 'redstone', needles: ['minecraft:redstone', 'minecraft:redstone_block', 'forge:dusts/redstone', 'dusts/redstone'] },
    { id: 'lapis', needles: ['minecraft:lapis_lazuli', 'minecraft:lapis_block', 'forge:gems/lapis', 'gems/lapis'] },
    { id: 'diamond', needles: ['minecraft:diamond', 'minecraft:diamond_block', 'forge:gems/diamond', 'gems/diamond'] },
    { id: 'emerald', needles: ['minecraft:emerald', 'minecraft:emerald_block', 'forge:gems/emerald', 'gems/emerald'] },
    { id: 'amethyst', needles: ['minecraft:amethyst_shard', 'minecraft:amethyst_block', 'forge:gems/amethyst', 'gems/amethyst'] }
]

var BTM_AUDIT_PROGRESSION_NEEDLES = [
    { id: 'tconstruct_grout', needles: ['"result":{"item":"tconstruct:grout"', '"result":"tconstruct:grout"', '"item":"tconstruct:grout"'] },
    { id: 'tconstruct_nether_grout', needles: ['"result":{"item":"tconstruct:nether_grout"', '"result":"tconstruct:nether_grout"', '"item":"tconstruct:nether_grout"'] },
    { id: 'create_andesite_alloy', needles: ['"result":{"item":"create:andesite_alloy"', '"result":"create:andesite_alloy"', '"item":"create:andesite_alloy"'] },
    { id: 'create_andesite_casing', needles: ['"result":{"item":"create:andesite_casing"', '"result":"create:andesite_casing"', '"item":"create:andesite_casing"'] },
    { id: 'create_hand_crank', needles: ['"result":{"item":"create:hand_crank"', '"result":"create:hand_crank"', '"item":"create:hand_crank"'] },
    { id: 'create_millstone', needles: ['"result":{"item":"create:millstone"', '"result":"create:millstone"', '"item":"create:millstone"'] },
    { id: 'create_deployer', needles: ['"result":{"item":"create:deployer"', '"result":"create:deployer"', '"item":"create:deployer"'] },
    { id: 'create_water_wheel', needles: ['"result":{"item":"create:water_wheel"', '"result":"create:water_wheel"', '"item":"create:water_wheel"'] },
    { id: 'create_windmill_bearing', needles: ['"result":{"item":"create:windmill_bearing"', '"result":"create:windmill_bearing"', '"item":"create:windmill_bearing"'] },
    { id: 'minecraft_gunpowder', needles: ['"result":{"item":"minecraft:gunpowder"', '"result":"minecraft:gunpowder"', '"item":"minecraft:gunpowder"'] },
    { id: 'minecraft_tnt', needles: ['"result":{"item":"minecraft:tnt"', '"result":"minecraft:tnt"', '"item":"minecraft:tnt"'] },
    { id: 'kubejs_seared_machine_casing', needles: ['"result":{"item":"kubejs:seared_machine_casing"', '"result":"kubejs:seared_machine_casing"', '"item":"kubejs:seared_machine_casing"'] },
    { id: 'kubejs_andesite_machine_casing', needles: ['"result":{"item":"kubejs:andesite_machine_casing"', '"result":"kubejs:andesite_machine_casing"', '"item":"kubejs:andesite_machine_casing"'] },
    { id: 'kubejs_brass_machine_casing', needles: ['"result":{"item":"kubejs:brass_machine_casing"', '"result":"kubejs:brass_machine_casing"', '"item":"kubejs:brass_machine_casing"'] },
    { id: 'kubejs_airtight_machine_casing', needles: ['"result":{"item":"kubejs:airtight_machine_casing"', '"result":"kubejs:airtight_machine_casing"', '"item":"kubejs:airtight_machine_casing"'] },
    { id: 'kubejs_electrical_machine_casing', needles: ['"result":{"item":"kubejs:electrical_machine_casing"', '"result":"kubejs:electrical_machine_casing"', '"item":"kubejs:electrical_machine_casing"'] },
    { id: 'kubejs_space_machine_casing', needles: ['"result":{"item":"kubejs:space_machine_casing"', '"result":"kubejs:space_machine_casing"', '"item":"kubejs:space_machine_casing"'] },
    { id: 'kubejs_raw_impossible_casing', needles: ['"result":{"item":"kubejs:raw_impossible_casing"', '"result":"kubejs:raw_impossible_casing"', '"item":"kubejs:raw_impossible_casing"'] },
    { id: 'kubejs_impossible_machine_casing', needles: ['"result":{"item":"kubejs:impossible_machine_casing"', '"result":"kubejs:impossible_machine_casing"', '"item":"kubejs:impossible_machine_casing"'] },
    { id: 'bloodmagic_weakbloodorb', needles: ['"result":{"item":"bloodmagic:weakbloodorb"', '"result":"bloodmagic:weakbloodorb"', '"item":"bloodmagic:weakbloodorb"'] },
    { id: 'ars_nouveau_imbuement_chamber', needles: ['"result":{"item":"ars_nouveau:imbuement_chamber"', '"result":"ars_nouveau:imbuement_chamber"', '"item":"ars_nouveau:imbuement_chamber"'] },
    { id: 'ae2_controller', needles: ['"result":{"item":"ae2:controller"', '"result":"ae2:controller"', '"item":"ae2:controller"'] },
    { id: 'ae2_drive', needles: ['"result":{"item":"ae2:drive"', '"result":"ae2:drive"', '"item":"ae2:drive"'] }
]

var BTM_AUDIT_BYPASS_NEEDLES = [
    { id: 'andesite_alloy_non_alloying', forbiddenTypes: ['minecraft:crafting_shaped', 'minecraft:crafting_shapeless', 'create:mixing'], outputNeedles: ['"result":{"item":"create:andesite_alloy"', '"result":{"count":9,"item":"create:andesite_alloy"', '"results":[{"item":"create:andesite_alloy"'] },
    { id: 'andesite_casing_item_application', forbiddenTypes: ['create:item_application'], outputNeedles: ['"results":[{"item":"create:andesite_casing"', '"result":{"item":"create:andesite_casing"'] },
    { id: 'nether_grout_crafting', forbiddenTypes: ['minecraft:crafting_shaped', 'minecraft:crafting_shapeless'], outputNeedles: ['"result":{"item":"tconstruct:nether_grout"', '"item":"tconstruct:nether_grout"', '"result":"tconstruct:nether_grout"'] },
    { id: 'teleposer_present', forbiddenTypes: [], outputNeedles: ['"result":{"item":"bloodmagic:teleposer"', '"result":"bloodmagic:teleposer"', '"item":"bloodmagic:teleposer"'] }
]

ServerEvents.recipes(function (event) {
    var cfg = btmAuditReadConfig()
    if (!cfg.enabled) return
    var scanned = 0
    var typeCounts = {}
    var namespaceCounts = {}
    var progressionMentions = btmAuditMakeBucketMap(BTM_AUDIT_PROGRESSION_NEEDLES)
    var materialMatches = btmAuditMakeBucketMap(BTM_AUDIT_VALUABLE_MATERIALS)
    var bypassMatches = btmAuditMakeBucketMap(BTM_AUDIT_BYPASS_NEEDLES)
    var fullIndex = []

    event.forEachRecipe({}, function (recipe) {
        scanned++
        var id = String(recipe.getId())
        var type = String(recipe.getType())
        var json = String(recipe.json)
        var ns = id.indexOf(':') === -1 ? 'UNKNOWN' : id.split(':')[0]

        typeCounts[type] = (typeCounts[type] || 0) + 1
        namespaceCounts[ns] = (namespaceCounts[ns] || 0) + 1

        if (cfg.writeFullRecipeIndex) {
            fullIndex.push({ id: id, type: type, namespace: ns, json: btmAuditTruncateJson(json, cfg.maxJsonCharsPerRecipe) })
        }

        for (var i = 0; i < BTM_AUDIT_PROGRESSION_NEEDLES.length; i++) {
            var p = BTM_AUDIT_PROGRESSION_NEEDLES[i]
            if (btmAuditContainsAny(json, p.needles)) progressionMentions[p.id].push(btmAuditRecipeRecord(recipe, json, cfg))
        }

        for (var j = 0; j < BTM_AUDIT_VALUABLE_MATERIALS.length; j++) {
            var m = BTM_AUDIT_VALUABLE_MATERIALS[j]
            if (btmAuditContainsAny(json, m.needles)) materialMatches[m.id].push(btmAuditRecipeRecord(recipe, json, cfg))
        }

        for (var k = 0; k < BTM_AUDIT_BYPASS_NEEDLES.length; k++) {
            var b = BTM_AUDIT_BYPASS_NEEDLES[k]
            var typeForbidden = b.forbiddenTypes.length === 0 || b.forbiddenTypes.indexOf(type) !== -1
            if (typeForbidden && btmAuditContainsAny(json, b.outputNeedles)) bypassMatches[b.id].push(btmAuditRecipeRecord(recipe, json, cfg))
        }
    })

    var metadata = {
        schema: BTM_RECIPE_AUDIT_SCHEMA,
        generatedBy: BTM_RECIPE_AUDIT_GENERATED_BY,
        generatedAt: btmAuditTimestamp(),
        source: BTM_RECIPE_AUDIT_SOURCE,
        recipeEventStage: BTM_RECIPE_AUDIT_STAGE
    }

    var summary = {
        schema: metadata.schema,
        generatedBy: metadata.generatedBy,
        generatedAt: metadata.generatedAt,
        source: metadata.source,
        recipeEventStage: metadata.recipeEventStage,
        scannedRecipes: scanned,
        writeFullRecipeIndex: cfg.writeFullRecipeIndex,
        writeMatchedRecipeJson: cfg.writeMatchedRecipeJson,
        fullRecipeChunkSize: cfg.fullRecipeChunkSize,
        typeCounts: typeCounts,
        namespaceCounts: namespaceCounts,
        progressionMentionCounts: {},
        materialMatchCounts: {},
        bypassMatchCounts: {},
        fullRecipeChunkCount: 0
    }

    for (var pi = 0; pi < BTM_AUDIT_PROGRESSION_NEEDLES.length; pi++) {
        var pid = BTM_AUDIT_PROGRESSION_NEEDLES[pi].id
        summary.progressionMentionCounts[pid] = progressionMentions[pid].length
    }
    for (var mi = 0; mi < BTM_AUDIT_VALUABLE_MATERIALS.length; mi++) {
        var mid = BTM_AUDIT_VALUABLE_MATERIALS[mi].id
        summary.materialMatchCounts[mid] = materialMatches[mid].length
    }
    for (var bi = 0; bi < BTM_AUDIT_BYPASS_NEEDLES.length; bi++) {
        var bid = BTM_AUDIT_BYPASS_NEEDLES[bi].id
        summary.bypassMatchCounts[bid] = bypassMatches[bid].length
    }

    JsonIO.write(BTM_AUDIT_DUMP_DIR + 'progression_recipe_mentions.json', progressionMentions)
    JsonIO.write(BTM_AUDIT_DUMP_DIR + 'valuable_material_usage_recipes.json', materialMatches)
    JsonIO.write(BTM_AUDIT_DUMP_DIR + 'known_bypass_candidate_recipes.json', bypassMatches)
    summary.fullRecipeChunkCount = btmAuditWriteFullIndexChunks(fullIndex, cfg, metadata)
    JsonIO.write(BTM_AUDIT_DUMP_DIR + 'recipe_audit_summary.json', summary)

    console.info('[BTM-RECIPE-AUDIT] scanned=' + scanned + ' fullChunks=' + summary.fullRecipeChunkCount + ' wrote ' + BTM_AUDIT_DUMP_DIR + 'recipe_audit_summary.json')
})

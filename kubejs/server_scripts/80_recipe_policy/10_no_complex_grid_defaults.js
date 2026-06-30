// Final crafting-table policy.
// Default mod recipes in complex tech/magic namespaces are moved off the
// crafting table unless the output is a plain building/decor block. Hand
// crafting should stay at vanilla-or-lower power: camping, simple survival,
// decor, and ordinary blocks. Powered mobility, portable storage authority,
// mass building tools, and modded workstation tech must use authored surfaces.

var BTM_GRID_POLICY_COMPLEX_NAMESPACES = {
    ae2: true,
    appflux: true,
    apotheosis: true,
    ars_additions: true,
    ars_caelum: true,
    ars_creo: true,
    ars_elemental: true,
    ars_instrumentum: true,
    ars_nouveau: true,
    ars_technica: true,
    arseng: true,
    bloodmagic: true,
    botania: true,
    buildinggadgets2: true,
    compressedcreativity: true,
    create: true,
    create_connected: true,
    create_enchantment_industry: true,
    create_power_loader: true,
    create_sa: true,
    createaddition: true,
    createadditionallogistics: true,
    createadvlogistics: true,
    createbigcannons: true,
    createdieselgenerators: true,
    createmoredrillheads: true,
    creatingspace: true,
    eidolon: true,
    expatternprovider: true,
    forbidden_arcanus: true,
    goety: true,
    hangglider: true,
    hexalia: true,
    hexcasting: true,
    hexerei: true,
    immersive_aircraft: true,
    irons_spellbooks: true,
    littlelogistics: true,
    mahoutsukai: true,
    malum: true,
    megacells: true,
    mna: true,
    morered: true,
    naturesaura: true,
    occultism: true,
    oc2r: true,
    pneumaticcraft: true,
    powergrid: true,
    psi: true,
    reliquary: true,
    rehooked: true,
    sophisticatedbackpacks: true,
    sophisticatedstorage: true,
    theurgy: true,
    tradingpost: true,
    tconstruct: true,
    wands: true
}

var BTM_GRID_POLICY_MAGIC_NAMESPACES = {
    apotheosis: true,
    ars_additions: true,
    ars_caelum: true,
    ars_creo: true,
    ars_elemental: true,
    ars_instrumentum: true,
    ars_nouveau: true,
    ars_technica: true,
    bloodmagic: true,
    botania: true,
    eidolon: true,
    forbidden_arcanus: true,
    goety: true,
    hexalia: true,
    hexcasting: true,
    hexerei: true,
    irons_spellbooks: true,
    mahoutsukai: true,
    malum: true,
    mna: true,
    naturesaura: true,
    occultism: true,
    psi: true,
    reliquary: true,
    theurgy: true,
    wands: true
}

var BTM_GRID_POLICY_ROOT_OUTPUTS = {
    'bloodmagic:altar': true,
    'kubejs:andesite_machine_casing': true,
    'kubejs:seared_machine_casing': true,
    'tconstruct:crafting_station': true,
    'tconstruct:grout': true,
    'tconstruct:modifier_worktable': true,
    'tconstruct:part_builder': true,
    'tconstruct:pattern': true,
    'tconstruct:seared_basin': true,
    'tconstruct:seared_casting_tank': true,
    'tconstruct:seared_channel': true,
    'tconstruct:seared_chute': true,
    'tconstruct:seared_drain': true,
    'tconstruct:seared_faucet': true,
    'tconstruct:seared_fuel_gauge': true,
    'tconstruct:seared_fuel_tank': true,
    'tconstruct:seared_heater': true,
    'tconstruct:seared_melter': true,
    'tconstruct:seared_table': true,
    'tconstruct:smeltery_controller': true,
    'tconstruct:tinker_station': true,
    'tconstruct:scorched_alloyer': true,
    'tconstruct:scorched_anvil': true,
    'tconstruct:scorched_basin': true,
    'tconstruct:scorched_channel': true,
    'tconstruct:scorched_chute': true,
    'tconstruct:scorched_drain': true,
    'tconstruct:scorched_duct': true,
    'tconstruct:scorched_faucet': true,
    'tconstruct:scorched_fluid_cannon': true,
    'tconstruct:scorched_fuel_gauge': true,
    'tconstruct:scorched_fuel_tank': true,
    'tconstruct:scorched_ingot_tank': true,
    'tconstruct:scorched_table': true,
    'tconstruct:foundry_controller': true,
    'additionalweaponry:butcher_knife': true,
    'tconstruct:hand_axe': true
}

var BTM_GRID_POLICY_BUILDING_SUFFIXES = [
    '_bars',
    '_bricks',
    '_button',
    '_carpet',
    '_door',
    '_fence',
    '_fence_gate',
    '_glass',
    '_hanging_sign',
    '_leaves',
    '_log',
    '_pane',
    '_pillar',
    '_planks',
    '_pressure_plate',
    '_sapling',
    '_sign',
    '_slab',
    '_stairs',
    '_stone',
    '_tiles',
    '_trapdoor',
    '_wall',
    '_wood'
]

var BTM_GRID_POLICY_BUILDING_NEEDLES = [
    'brick',
    'chiseled',
    'cut_',
    'decor',
    'framed',
    'mosaic',
    'polished',
    'shingle',
    'smooth'
]

var BTM_GRID_POLICY_COMPLEX_PATH_NEEDLES = [
    'altar',
    'assembly',
    'backpack',
    'battery',
    'cable',
    'casing',
    'cell',
    'chamber',
    'circuit',
    'computer',
    'connector',
    'controller',
    'core',
    'drill',
    'drive',
    'engine',
    'focus',
    'gadget',
    'generator',
    'hook',
    'interface',
    'laser',
    'machine',
    'mechanism',
    'module',
    'motor',
    'orb',
    'processor',
    'program',
    'pump',
    'ritual',
    'rune',
    'sigil',
    'slate',
    'spell',
    'terminal',
    'upgrade',
    'wand'
]

function btmGridPolicySafeString(value) {
    if (value == null) return ''
    try { return String(value) } catch (ignored) { return '' }
}

function btmGridPolicyRecipeJson(recipe) {
    try { return GSON.toJson(recipe.json) } catch (ignored) {}
    return btmGridPolicySafeString(recipe.json)
}

function btmGridPolicyRecipeObject(recipe) {
    var json = btmGridPolicyRecipeJson(recipe)
    if (!json) return null
    try { return JSON.parse(json) } catch (ignored) {}
    return null
}

function btmGridPolicyOutput(json) {
    var objectResult = json.match(/"result"\s*:\s*\{[^}]*"item"\s*:\s*"([^"]+)"/)
    if (objectResult && objectResult[1]) return objectResult[1]
    var stringResult = json.match(/"result"\s*:\s*"([^"]+)"/)
    if (stringResult && stringResult[1]) return stringResult[1]
    return ''
}

function btmGridPolicyNamespace(id) {
    var split = id.indexOf(':')
    if (split < 0) return ''
    return id.substring(0, split)
}

function btmGridPolicyResultObject(result) {
    if (!result) return null
    if (typeof result === 'string') return { item: result }
    if (result.item) {
        var out = { item: result.item }
        if (result.count && result.count > 1) out.count = result.count
        if (result.nbt) out.nbt = result.nbt
        return out
    }
    return null
}

function btmGridPolicyCopyIngredient(ingredient) {
    if (!ingredient) return null
    var json = ''
    try { json = JSON.stringify(ingredient) } catch (ignored) {}
    if (!json) return null
    try { return JSON.parse(json) } catch (ignored2) {}
    return null
}

function btmGridPolicyReplacementId(surface, originalId) {
    var clean = btmGridPolicySafeString(originalId)
        .replace(/:/g, '/')
        .replace(/[^a-z0-9_./-]/g, '_')
    return 'kubejs:grid_policy/' + surface + '/' + clean
}

function btmGridPolicyPath(id) {
    var split = id.indexOf(':')
    if (split < 0) return id
    return id.substring(split + 1)
}

function btmGridPolicyContainsAny(path, needles) {
    for (var i = 0; i < needles.length; i++) {
        if (path.indexOf(needles[i]) !== -1) return true
    }
    return false
}

function btmGridPolicyEndsWithAny(path, suffixes) {
    for (var i = 0; i < suffixes.length; i++) {
        var suffix = suffixes[i]
        if (path.length >= suffix.length && path.substring(path.length - suffix.length) === suffix) return true
    }
    return false
}

function btmGridPolicyIsBuildingLike(output) {
    var path = btmGridPolicyPath(output)
    if (btmGridPolicyContainsAny(path, BTM_GRID_POLICY_COMPLEX_PATH_NEEDLES)) return false
    if (btmGridPolicyEndsWithAny(path, BTM_GRID_POLICY_BUILDING_SUFFIXES)) return true
    if (btmGridPolicyContainsAny(path, BTM_GRID_POLICY_BUILDING_NEEDLES)) return true
    return path === 'glass' || path === 'lantern' || path === 'soul_lantern'
}

function btmGridPolicyShouldRemove(output) {
    if (!output || BTM_GRID_POLICY_ROOT_OUTPUTS[output]) return false
    var namespace = btmGridPolicyNamespace(output)
    if (!BTM_GRID_POLICY_COMPLEX_NAMESPACES[namespace]) return false
    return !btmGridPolicyIsBuildingLike(output)
}

function btmGridPolicyFlattenShapedInputs(data) {
    var out = []
    var pattern = data && data.pattern ? data.pattern : []
    for (var row = 0; row < pattern.length; row++) {
        var line = String(pattern[row])
        for (var col = 0; col < line.length; col++) {
            var key = line.charAt(col)
            if (key === ' ') continue
            if (!data.key || !data.key[key]) continue
            var ingredient = btmGridPolicyCopyIngredient(data.key[key])
            if (ingredient) out.push(ingredient)
        }
    }
    return out
}

function btmGridPolicyAlchemyRecipe(event, id, result, inputs, upgradeLevel) {
    if (!inputs.length || inputs.length > 6) return false
    event.custom({
        type: 'bloodmagic:alchemytable',
        input: inputs,
        output: result,
        syphon: 1200 + (upgradeLevel * 800),
        ticks: 120 + (upgradeLevel * 20),
        upgradeLevel: upgradeLevel
    }).id(id)
    return true
}

function btmGridPolicyRerouteShaped(event, recipe) {
    var data = btmGridPolicyRecipeObject(recipe)
    if (!data || !data.pattern || !data.key) return false

    var result = btmGridPolicyResultObject(data.result)
    if (!result) return false

    var output = result.item
    var namespace = btmGridPolicyNamespace(output)
    var originalId = btmGridPolicySafeString(recipe.getId())

    if (BTM_GRID_POLICY_MAGIC_NAMESPACES[namespace]) {
        var alchemyInputs = btmGridPolicyFlattenShapedInputs(data)
        if (btmGridPolicyAlchemyRecipe(event, btmGridPolicyReplacementId('blood_alchemy', originalId), result, alchemyInputs, 1)) return true
    }

    if (!global.btmIsMechanicalOnlyRecipe(data.pattern, output, false)) return false

    event.custom({
        type: 'create:mechanical_crafting',
        acceptMirrored: true,
        pattern: data.pattern,
        key: data.key,
        result: result
    }).id(btmGridPolicyReplacementId('create_mechanical', originalId))
    return true
}

function btmGridPolicyRerouteShapeless(event, recipe) {
    var data = btmGridPolicyRecipeObject(recipe)
    if (!data || !data.ingredients) return false

    var result = btmGridPolicyResultObject(data.result)
    if (!result) return false

    var output = result.item
    var namespace = btmGridPolicyNamespace(output)
    var originalId = btmGridPolicySafeString(recipe.getId())
    var ingredients = []
    for (var i = 0; i < data.ingredients.length; i++) {
        var ingredient = btmGridPolicyCopyIngredient(data.ingredients[i])
        if (ingredient) ingredients.push(ingredient)
    }
    if (!ingredients.length) return false

    if (BTM_GRID_POLICY_MAGIC_NAMESPACES[namespace]) {
        if (btmGridPolicyAlchemyRecipe(event, btmGridPolicyReplacementId('blood_alchemy', originalId), result, ingredients, 1)) return true
    }

    event.custom({
        type: 'create:mixing',
        ingredients: ingredients,
        results: [result],
        processingTime: 120
    }).id(btmGridPolicyReplacementId('create_mixing', originalId))
    return true
}

ServerEvents.recipes(function (event) {
    var idsToRemove = []
    var replacements = 0

    event.forEachRecipe({ type: 'minecraft:crafting_shaped' }, function (recipe) {
        var output = btmGridPolicyOutput(btmGridPolicyRecipeJson(recipe))
        if (btmGridPolicyShouldRemove(output)) {
            if (btmGridPolicyRerouteShaped(event, recipe)) {
                idsToRemove.push(btmGridPolicySafeString(recipe.getId()))
                replacements++
            }
        }
    })
    event.forEachRecipe({ type: 'minecraft:crafting_shapeless' }, function (recipe) {
        var output = btmGridPolicyOutput(btmGridPolicyRecipeJson(recipe))
        if (btmGridPolicyShouldRemove(output)) {
            idsToRemove.push(btmGridPolicySafeString(recipe.getId()))
            if (btmGridPolicyRerouteShapeless(event, recipe)) replacements++
        }
    })

    for (var i = 0; i < idsToRemove.length; i++) {
        if (idsToRemove[i] !== '') event.remove({ id: idsToRemove[i] })
    }

    console.info('[BTM-GRID-POLICY] rerouted complex crafting-table defaults=' + replacements + ', removed originals=' + idsToRemove.length)
})

// Shared recipe-surface helpers for expert-pass rewrites.
// Keep these small and Rhino-safe; recipe scripts call them through global.*.

global.btmRecipeIngredient = function (input) {
    if (typeof input !== 'string') return input
    if (input.charAt(0) === '#') return { tag: input.substring(1) }
    return { item: input }
}

global.btmRecipeResult = function (output, count) {
    var result = { item: output }
    if (count && count > 1) result.count = count
    return result
}

global.btmRecipeKey = function (keys) {
    var out = {}
    for (var key in keys) out[key] = global.btmRecipeIngredient(keys[key])
    return out
}

global.BTM_MECHANICAL_MILESTONE_OUTPUTS = {
    'compressedcreativity:rotational_compressor': true,
    'kubejs:raw_impossible_circuit': true
}

global.btmPatternWidth = function (pattern) {
    var width = 0
    for (var i = 0; i < pattern.length; i++) {
        var row = String(pattern[i] || '')
        if (row.length > width) width = row.length
    }
    return width
}

global.btmIsLargeFormatPattern = function (pattern) {
    return pattern.length > 3 || global.btmPatternWidth(pattern) > 3
}

global.btmIsMechanicalOnlyRecipe = function (pattern, output, forceMechanical) {
    if (forceMechanical) return true
    if (global.btmIsLargeFormatPattern(pattern)) return true
    return !!global.BTM_MECHANICAL_MILESTONE_OUTPUTS[output]
}

global.btmFactoryCrafting = function (event, id, output, count, pattern, keys, options) {
    var recipeCount = count || 1
    var mechanicalOnly = global.btmIsMechanicalOnlyRecipe(pattern, output, options && options.forceMechanical)
    if (mechanicalOnly) {
        global.btmCreateMechanicalCrafting(event, id, output, recipeCount, pattern, keys, !options || options.mirrored !== false)
        return
    }
    var result = recipeCount > 1 ? (recipeCount + 'x ' + output) : output
    event.shaped(result, pattern, keys).id(id)
}

global.btmCreateMechanicalCrafting = function (event, id, output, count, pattern, keys, mirrored) {
    event.custom({
        type: 'create:mechanical_crafting',
        acceptMirrored: mirrored !== false,
        pattern: pattern,
        key: global.btmRecipeKey(keys),
        result: global.btmRecipeResult(output, count || 1)
    }).id(id)
}

global.btmCreateMechanicalFromInputs = function (event, id, output, count, inputs) {
    var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    var pattern = []
    var keys = {}
    for (var i = 0; i < inputs.length; i++) {
        var key = letters.charAt(i)
        pattern.push(key)
        keys[key] = inputs[i]
    }
    global.btmCreateMechanicalCrafting(event, id, output, count || 1, pattern, keys, false)
}

global.btmCreateCompacting = function (event, id, output, count, inputs, heat) {
    var recipe = {
        type: 'create:compacting',
        ingredients: inputs.map(global.btmRecipeIngredient),
        results: [global.btmRecipeResult(output, count || 1)],
        processingTime: 160
    }
    if (heat) recipe.heatRequirement = heat
    event.custom(recipe).id(id)
}

global.btmPncrStack = function (input, count) {
    var stack = global.btmRecipeIngredient(input)
    stack.type = 'pneumaticcraft:stacked_item'
    stack.count = count || 1
    return stack
}

global.btmPncrPressure = function (event, id, output, count, pressure, inputs) {
    event.custom({
        type: 'pneumaticcraft:pressure_chamber',
        inputs: inputs.map(function (entry) {
            if (typeof entry === 'string') return global.btmPncrStack(entry, 1)
            return global.btmPncrStack(entry.id, entry.count || 1)
        }),
        pressure: pressure,
        results: [global.btmRecipeResult(output, count || 1)]
    }).id(id)
}

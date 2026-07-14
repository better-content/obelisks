// Shared recipe-surface helpers for expert-pass rewrites.
// Keep these small and Rhino-safe; recipe scripts call them through global.*.

global.bcRecipeIngredient = function (input) {
    if (typeof input !== 'string') return input
    if (input.charAt(0) === '#') return { tag: input.substring(1) }
    return { item: input }
}

global.bcRecipeResult = function (output, count) {
    var result = { item: output }
    if (count && count > 1) result.count = count
    return result
}

global.bcRecipeKey = function (keys) {
    var out = {}
    for (var key in keys) out[key] = global.bcRecipeIngredient(keys[key])
    return out
}

global.bcPatternWidth = function (pattern) {
    var width = 0
    for (var i = 0; i < pattern.length; i++) {
        var row = String(pattern[i] || '')
        if (row.length > width) width = row.length
    }
    return width
}

global.bcIsLargeFormatPattern = function (pattern) {
    return pattern.length > 3 || global.bcPatternWidth(pattern) > 3
}

global.bcIsMechanicalOnlyRecipe = function () {
    return false
}

global.bcFactoryCrafting = function (event, id, output, count, pattern, keys, options) {
    var recipeCount = count || 1
    if (global.bcIsLargeFormatPattern(pattern)) {
        return
    }
    var result = recipeCount > 1 ? (recipeCount + 'x ' + output) : output
    event.shaped(result, pattern, keys).id(id)
}

global.bcCreateMechanicalCrafting = function (event, id, output, count, pattern, keys, acceptMirrored) {
    global.bcFactoryCrafting(event, id, output, count || 1, pattern, keys, { mirrored: !!acceptMirrored })
}

global.bcCreateMechanicalFromInputs = function (event, id, output, count, inputs) {
    var result = count && count > 1 ? (count + 'x ' + output) : output
    event.shapeless(result, inputs).id(id)
}

global.bcCreateCompacting = function (event, id, output, count, inputs, heat) {
    var recipe = {
        type: 'create:compacting',
        ingredients: inputs.map(global.bcRecipeIngredient),
        results: [global.bcRecipeResult(output, count || 1)],
        processingTime: 160
    }
    if (heat) recipe.heatRequirement = heat
    event.custom(recipe).id(id)
}

global.bcPncrStack = function (input, count) {
    var stack = global.bcRecipeIngredient(input)
    stack.type = 'pneumaticcraft:stacked_item'
    stack.count = count || 1
    return stack
}

global.bcPncrPressure = function (event, id, output, count, pressure, inputs) {
    event.custom({
        type: 'pneumaticcraft:pressure_chamber',
        inputs: inputs.map(function (entry) {
            if (typeof entry === 'string') return global.bcPncrStack(entry, 1)
            return global.bcPncrStack(entry.id, entry.count || 1)
        }),
        pressure: pressure,
        results: [global.bcRecipeResult(output, count || 1)]
    }).id(id)
}

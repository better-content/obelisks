// Alchemistry dissolver parity without Alchemistry machines.
//
// The source table is generated from Alchemistry's dissolver JSON, then expressed
// as Create mixing: item/tag + ChemLib acid/solvent + grinding ball catalyst.

var BC_ADP_TABLE = JsonIO.read('kubejs/config/alchemistry_dissolver_port.json') || { recipes: [] }

function bcAdpGet(object, key) {
    if (!object || !key) return null
    try {
        if (object.containsKey && !object.containsKey(key)) return null
        if (object.get) return object.get(key)
    } catch (ignored) {}
    try {
        return object[key]
    } catch (ignored2) {
        return null
    }
}

function bcAdpItemExists(id) {
    if (!id || id === 'minecraft:air') return false
    try { return Item.exists(id) } catch (e) { return false }
}

function bcAdpTagExists(tag) {
    if (!tag) return false
    try {
        var ingredient = Ingredient.of('#' + tag)
        if (ingredient.isEmpty && ingredient.isEmpty()) return false
        if (ingredient.itemIds && ingredient.itemIds.length === 0) return false
        return true
    } catch (e) {
        return false
    }
}

function bcAdpIngredientExists(input) {
    if (!input) return false
    var item = bcAdpGet(input, 'item')
    if (item) return bcAdpItemExists(item)
    var tag = bcAdpGet(input, 'tag')
    if (tag) return bcAdpTagExists(tag)
    return false
}

function bcAdpIngredientJson(input) {
    var item = bcAdpGet(input, 'item')
    if (item) return { item: item }
    return { tag: bcAdpGet(input, 'tag') }
}

function bcAdpSolventById(id) {
    var solvents = global.BC_RO_SOLVENTS || []
    for (var i = 0; i < solvents.length; i++) if (solvents[i].id === id) return solvents[i]
    return null
}

function bcAdpBallById(id) {
    var balls = global.BC_RO_BALLS || []
    for (var i = 0; i < balls.length; i++) if (balls[i].id === id) return balls[i]
    return null
}

function bcAdpRetention(acid, ball) {
    if (!global.BC_RO_RETENTION) return 0.75
    var acidRetention = bcAdpGet(global.BC_RO_RETENTION, acid)
    if (!acidRetention) return 0.75
    return bcAdpGet(acidRetention, ball) || 0.75
}

function bcAdpResults(row) {
    var results = []
    for (var i = 0; i < row.results.length; i++) {
        var source = row.results[i]
        var item = bcAdpGet(source, 'item')
        if (!bcAdpItemExists(item)) continue
        var result = { item: item }
        var count = bcAdpGet(source, 'count')
        var chance = bcAdpGet(source, 'chance')
        if (count && count > 1) result.count = count
        if (chance && chance < 1) result.chance = chance
        results.push(result)
    }
    return results
}

var BC_ADP_GAS_PRODUCTS = {
    ethanol: { item: 'chemlib:carbon_dioxide', chance: 0.06 },
    acetic: { item: 'chemlib:carbon_dioxide', chance: 0.10 },
    sulfuric: { item: 'chemlib:sulfur_dioxide', chance: 0.18 },
    hydrochloric: { item: 'chemlib:hydrogen', chance: 0.16 },
    nitric: { item: 'chemlib:nitrogen_dioxide', chance: 0.22 },
    phosphoric: { item: 'chemlib:hydrogen', chance: 0.08 }
}

function bcAdpAddGasSideProduct(results, row) {
    var gas = BC_ADP_GAS_PRODUCTS[bcAdpGet(row, 'acid')]
    if (!gas || !bcAdpItemExists(gas.item)) return
    results.push({ item: gas.item, chance: gas.chance })
}

ServerEvents.recipes(function (event) {
    var recipes = BC_ADP_TABLE.recipes || []
    for (var i = 0; i < recipes.length; i++) {
        var row = recipes[i]
        var acid = bcAdpGet(row, 'acid')
        var ballId = bcAdpGet(row, 'ball')
        var input = bcAdpGet(row, 'input')
        var solvent = bcAdpSolventById(acid)
        var ball = bcAdpBallById(ballId)
        if (!solvent || !ball) continue
        if (!bcAdpIngredientExists(input) || !bcAdpItemExists(ball.item)) continue

        var results = bcAdpResults(row)
        if (!results.length) continue
        results.push({ item: ball.item, chance: bcAdpRetention(acid, ballId) })
         bcAdpAddGasSideProduct(results, row)

        var recipe = {
            type: 'create:mixing',
            ingredients: [bcAdpIngredientJson(input),
                { item: ball.item },
                { fluid: solvent.fluid, amount: solvent.amount }
            ],
            results: results,
            processingTime: bcAdpGet(row, 'processingTime') || solvent.time || 220
        }

        var heat = bcAdpGet(row, 'heat') || solvent.heat
        if (heat) recipe.heatRequirement = heat
        event.custom(recipe).id('kubejs:alchemistry_dissolver_port/' +  bcAdpGet(row, 'id'))
    }
})

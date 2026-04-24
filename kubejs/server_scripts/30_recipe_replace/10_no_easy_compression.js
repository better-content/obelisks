// Removes crafting-table metal form conversions:
// 9 nuggets <-> 1 ingot and 9 ingots <-> 1 storage block.
// Purpose: stop nugget/ingot/block liquidity in manual crafting.

ServerEvents.recipes(function (event) {
    function endsWith(s, suffix) {
        s = String(s || '')
        suffix = String(suffix || '')
        if (suffix.length > s.length) return false
        return s.substring(s.length - suffix.length) === suffix
    }

    function startsWith(s, prefix) {
        s = String(s || '')
        prefix = String(prefix || '')
        if (prefix.length > s.length) return false
        return s.substring(0, prefix.length) === prefix
    }

    function pathOf(id) {
        var s = String(id || '')
        var i = s.indexOf(':')
        return i >= 0 ? s.substring(i + 1) : s
    }

    function classifyItem(itemId) {
        var p = pathOf(itemId)
        if (endsWith(p, '_nugget')) return 'nugget'
        if (endsWith(p, '_ingot')) return 'ingot'
        if (endsWith(p, '_block') && !endsWith(p, '_raw_block') && !startsWith(p, 'raw_')) return 'block'
        return null
    }

    function classifyTag(tagId) {
        var p = pathOf(tagId)
        if (p === 'nuggets' || p.indexOf('nuggets/') === 0 || p.indexOf('/nuggets/') >= 0) return 'nugget'
        if (p === 'ingots' || p.indexOf('ingots/') === 0 || p.indexOf('/ingots/') >= 0) return 'ingot'
        if (p === 'storage_blocks' || p.indexOf('storage_blocks/') === 0 || p.indexOf('/storage_blocks/') >= 0) return 'block'
        return null
    }

    function classifyIngredient(ing) {
        if (!ing) return null

        if (Array.isArray(ing)) {
            if (ing.length === 0) return null
            var first = classifyIngredient(ing[0])
            if (!first) return null
            for (var i = 1; i < ing.length; i++) {
                if (classifyIngredient(ing[i]) !== first) return null
            }
            return first
        }

        if (ing.item) return classifyItem(ing.item)
        if (ing.tag) return classifyTag(ing.tag)
        return null
    }

    function getResultInfo(json) {
        if (!json || !json.result) return null
        if (typeof json.result === 'string') {
            return { item: String(json.result), count: 1 }
        }
        if (json.result.item) {
            return { item: String(json.result.item), count: Number(json.result.count || 1) }
        }
        return null
    }

    function shapedInputInfo(json) {
        var pattern = (json && json.pattern) ? json.pattern : []
        var key = (json && json.key) ? json.key : {}
        var inputForm = null
        var inputCount = 0

        for (var r = 0; r < pattern.length; r++) {
            var row = String(pattern[r] || '')
            for (var c = 0; c < row.length; c++) {
                var ch = row.charAt(c)
                if (ch === ' ') continue
                var ing = key[ch]
                var form = classifyIngredient(ing)
                if (!form) return null
                if (!inputForm) inputForm = form
                if (inputForm !== form) return null
                inputCount++
            }
        }

        if (!inputForm || inputCount <= 0) return null
        return { form: inputForm, count: inputCount }
    }

    function shapelessInputInfo(json) {
        var ingredients = (json && json.ingredients) ? json.ingredients : []
        if (ingredients.length <= 0) return null

        var inputForm = null
        for (var i = 0; i < ingredients.length; i++) {
            var form = classifyIngredient(ingredients[i])
            if (!form) return null
            if (!inputForm) inputForm = form
            if (inputForm !== form) return null
        }

        return { form: inputForm, count: ingredients.length }
    }

    function shouldRemove(inForm, inCount, outForm, outCount) {
        if (inForm === 'nugget' && inCount === 9 && outForm === 'ingot' && outCount === 1) return true
        if (inForm === 'ingot' && inCount === 1 && outForm === 'nugget' && outCount === 9) return true
        if (inForm === 'ingot' && inCount === 9 && outForm === 'block' && outCount === 1) return true
        if (inForm === 'block' && inCount === 1 && outForm === 'ingot' && outCount === 9) return true
        return false
    }

    function processType(typeId) {
        event.forEachRecipe({ type: typeId }, function (recipe) {
            var json = recipe.json
            var out = getResultInfo(json)
            if (!out) return

            var outForm = classifyItem(out.item)
            if (!outForm) return

            var input = (typeId === 'minecraft:crafting_shaped')
                ? shapedInputInfo(json)
                : shapelessInputInfo(json)
            if (!input) return

            if (shouldRemove(input.form, input.count, outForm, out.count)) {
                console.log('[KubeJS] Removing metal liquidity recipe: ' + recipe.getId())
                event.remove({ id: recipe.getId() })
            }
        })
    }

    processType('minecraft:crafting_shaped')
    processType('minecraft:crafting_shapeless')
})

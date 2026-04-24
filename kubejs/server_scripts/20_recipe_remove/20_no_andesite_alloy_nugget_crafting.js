// kubejs/server_scripts/no_andesite_alloy_nugget_crafting.js
//
// Disable crafting-table andesite alloy recipes that include zinc/iron nuggets.
// Keeps non-crafting methods (e.g. mixing) untouched.

ServerEvents.recipes(function (event) {
    var blockedItems = [
        'create:zinc_nugget',
        'minecraft:iron_nugget'
    ];
    var blockedTags = [
        'c:nuggets/zinc',
        'forge:nuggets/zinc',
        'c:nuggets/iron',
        'forge:nuggets/iron'
    ];
    var blockedItemSet = {};
    var blockedTagSet = {};

    function buildSet(list) {
        var out = {};
        var i;
        for (i = 0; i < list.length; i++) out[list[i]] = true;
        return out;
    }

    function ingredientHasBlockedNugget(ingredientJson) {
        var i;
        if (!ingredientJson) return false;

        if (Array.isArray(ingredientJson)) {
            for (i = 0; i < ingredientJson.length; i++) {
                if (ingredientHasBlockedNugget(ingredientJson[i])) return true;
            }
            return false;
        }

        if (ingredientJson.item && blockedItemSet[ingredientJson.item]) return true;
        if (ingredientJson.tag && blockedTagSet[ingredientJson.tag]) return true;

        return false;
    }

    function resultItemId(json) {
        if (!json || !json.result) return null;
        if (typeof json.result === 'string') return json.result;
        if (json.result.item) return json.result.item;
        if (json.result.id) return json.result.id;
        return null;
    }

    function shapedUsesBlockedNugget(json) {
        var pattern = json.pattern || [];
        var key = json.key || {};
        var r;
        var c;
        for (r = 0; r < pattern.length; r++) {
            var row = pattern[r] || '';
            for (c = 0; c < row.length; c++) {
                var ch = row.charAt(c);
                if (ch === ' ') continue;
                if (ingredientHasBlockedNugget(key[ch])) return true;
            }
        }
        return false;
    }

    function shapelessUsesBlockedNugget(json) {
        var ingredients = json.ingredients || [];
        var i;
        for (i = 0; i < ingredients.length; i++) {
            if (ingredientHasBlockedNugget(ingredients[i])) return true;
        }
        return false;
    }

    function removeMatchingCrafting(typeId) {
        event.forEachRecipe({ type: typeId }, function (recipe) {
            var json = recipe.json;
            var out = resultItemId(json);
            if (out !== 'create:andesite_alloy') return;

            var hasBlocked = false;
            if (typeId === 'minecraft:crafting_shaped') {
                hasBlocked = shapedUsesBlockedNugget(json || {});
            } else {
                hasBlocked = shapelessUsesBlockedNugget(json || {});
            }

            if (hasBlocked) {
                event.remove({ id: recipe.getId() });
            }
        });
    }

    blockedItemSet = buildSet(blockedItems);
    blockedTagSet = buildSet(blockedTags);

    removeMatchingCrafting('minecraft:crafting_shaped');
    removeMatchingCrafting('minecraft:crafting_shapeless');
});

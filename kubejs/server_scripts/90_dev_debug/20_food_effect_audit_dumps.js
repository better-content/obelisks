// Dev-only food audit dumps. Enable kubejs/config/audit_dumps.json, then run /reload.
// Writes runtime food nutrition/effect snapshots to kubejs/config/.
//
// This reads vanilla/Forge FoodProperties. Foods that apply effects only through
// custom finishUsingItem code may need mod-specific adapters after this dump
// identifies them.

var BC_FOOD_AUDIT_CONFIG = 'kubejs/config/audit_dumps.json'
var BC_FOOD_AUDIT_DIR = 'kubejs/config/'
var BC_FOOD_AUDIT_GENERATED_BY = 'kubejs/server_scripts/90_dev_debug/20_food_effect_audit_dumps.js'
var BC_FOOD_AUDIT_SCHEMA = 'bc.food_effect_audit.v2'
var BC_FOOD_AUDIT_SOURCE = 'runtime vanilla/Forge FoodProperties from BuiltInRegistries.ITEM during ServerEvents.recipes'

var BcFoodBuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
var BcFoodItemStack = Java.loadClass('net.minecraft.world.item.ItemStack')
var BcFoodDietApi = null
try {
    BcFoodDietApi = Java.loadClass('com.illusivesoulworks.diet.api.DietApi')
} catch (e) {
    BcFoodDietApi = null
}

function bcFoodAuditTimestamp() {
    try {
        return new Date().toISOString()
    } catch (e) {
        return String(new Date())
    }
}

function bcFoodAuditReadConfig() {
    var fallback = {
        enabled: false,
        writeFoodEffectIndex: false
    }

    var cfg = JsonIO.read(BC_FOOD_AUDIT_CONFIG)
    if (!cfg) return fallback

    return {
        enabled: cfg.enabled === true,
        writeFoodEffectIndex: cfg.writeFoodEffectIndex === true || cfg.foodEffects === true || cfg.writeFoodEffects === true
    }
}

function bcFoodSafeString(value) {
    if (value === null || value === undefined) return null
    try {
        return String(value)
    } catch (e) {
        return '<string-error>'
    }
}

function bcFoodCall(target, methodNames, args) {
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

function bcFoodNumber(value, fallback) {
    if (value === null || value === undefined) return fallback
    var n = Number(value)
    if (isNaN(n)) return fallback
    return n
}

function bcFoodBool(value) {
    return value === true || String(value) === 'true'
}

function bcFoodPushUnique(arr, value) {
    if (value === null || value === undefined) return
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === value) return
    }
    arr.push(value)
}

function bcFoodSortStrings(arr) {
    arr.sort(function (a, b) {
        if (a < b) return -1
        if (a > b) return 1
        return 0
    })
    return arr
}

function bcFoodEffectId(effect) {
    if (!effect) return 'UNKNOWN'
    try {
        var key = BcFoodBuiltInRegistries.MOB_EFFECT.getKey(effect)
        if (key) return String(key)
    } catch (e) {
        // Fall through to string representation.
    }
    return bcFoodSafeString(effect) || 'UNKNOWN'
}

function bcFoodPairFirst(pair) {
    return bcFoodCall(pair, ['getFirst', 'getLeft', 'first'], [])
}

function bcFoodPairSecond(pair) {
    return bcFoodCall(pair, ['getSecond', 'getRight', 'second'], [])
}

function bcFoodIteratorToArray(collection) {
    var out = []
    if (!collection) return out

    try {
        var it = collection.iterator()
        while (it.hasNext()) out.push(it.next())
        return out
    } catch (e) {
        // Not a Java collection.
    }

    try {
        for (var i = 0; i < collection.length; i++) out.push(collection[i])
    } catch (e2) {
        // Leave empty.
    }

    return out
}

function bcFoodCollectTags(item) {
    var tags = []
    try {
        var holder = item.builtInRegistryHolder()
        var stream = holder.tags()
        var tagArray = stream.toArray()
        for (var i = 0; i < tagArray.length; i++) {
             bcFoodPushUnique(tags, String(tagArray[i].location()))
        }
    } catch (e) {
        // Tags are useful but not required for the dump.
    }
    return bcFoodSortStrings(tags)
}

var BC_FOOD_DIET_GROUPS = [
    'fruits',
    'grains',
    'proteins',
    'special_food',
    'sugars',
    'vegetables'
]

function bcFoodIngredientIds(tagId) {
    var ids = []
    try {
        var ingredient = Ingredient.of('#' + tagId)
        var rawIds = ingredient.itemIds
        if (!rawIds) rawIds = ingredient.getItemIds()
        if (!rawIds) return ids

        try {
            for (var i = 0; i < rawIds.length; i++) ids.push(String(rawIds[i]))
            return ids
        } catch (e) {
            // Java collection fallback.
        }

        var it = rawIds.iterator()
        while (it.hasNext()) ids.push(String(it.next()))
    } catch (e2) {
        // Missing tag or KubeJS ingredient API mismatch.
    }
    return ids
}

function bcFoodCollectDietGroups() {
    var map = {}

    for (var i = 0; i < BC_FOOD_DIET_GROUPS.length; i++) {
        var group = BC_FOOD_DIET_GROUPS[i]
        var ids = bcFoodIngredientIds('diet:' + group)

        for (var j = 0; j < ids.length; j++) {
            var id = ids[j]
            if (!map[id]) map[id] = []
             bcFoodPushUnique(map[id], group)
        }
    }

    for (var key in map)  bcFoodSortStrings(map[key])
    return map
}

function bcFoodDietGroupName(group) {
    var name = bcFoodCall(group, ['getName'], [])
    return bcFoodSafeString(name)
}

function bcFoodReadDietApi(stack) {
    var result = {
        groups: [],
        values: {},
        source: 'none'
    }

    if (!BcFoodDietApi) return result

    try {
        var api = BcFoodDietApi.getInstance()
        if (!api) return result

        var dietResult = api.get(null, stack)
        if (dietResult) {
            var map = dietResult.get()
            var entries = map.entrySet().iterator()
            while (entries.hasNext()) {
                var entry = entries.next()
                var groupName = bcFoodDietGroupName(entry.getKey())
                if (!groupName) continue
                 bcFoodPushUnique(result.groups, groupName)
                result.values[groupName] = bcFoodNumber(entry.getValue(), 0)
            }
            result.groups = bcFoodSortStrings(result.groups)
            result.source = 'diet_api_result'
            return result
        }

        var groups = api.getGroups(null, stack)
        var groupArray = bcFoodIteratorToArray(groups)
        for (var i = 0; i < groupArray.length; i++) {
            var name = bcFoodDietGroupName(groupArray[i])
            if (name)  bcFoodPushUnique(result.groups, name)
        }
        result.groups = bcFoodSortStrings(result.groups)
        result.source = result.groups.length ? 'diet_api_groups' : 'none'
    } catch (e) {
        result.error = String(e)
    }

    return result
}

function bcFoodReadProperties(item, stack) {
    var props = bcFoodCall(item, ['getFoodProperties'], [stack, null])
    if (!props) props = bcFoodCall(item, ['getFoodProperties'], [])
    if (!props) {
        try {
            props = stack.getFoodProperties(null)
        } catch (e) {
            // Not exposed through stack overload.
        }
    }
    return props
}

function bcFoodReadEffects(props) {
    var rawEffects = bcFoodCall(props, ['getEffects'], [])
    var rawArray = bcFoodIteratorToArray(rawEffects)
    var effects = []

    for (var i = 0; i < rawArray.length; i++) {
        var pair = rawArray[i]
        var instance = bcFoodPairFirst(pair)
        var probability = bcFoodPairSecond(pair)

        if (!instance) {
            instance = pair
            probability = 1
        }

        var effect = bcFoodCall(instance, ['getEffect'], [])
        effects.push({
            effect: bcFoodEffectId(effect),
            amplifier: bcFoodNumber(bcFoodCall(instance, ['getAmplifier'], []), 0),
            durationTicks: bcFoodNumber(bcFoodCall(instance, ['getDuration'], []), 0),
            probability: bcFoodNumber(probability, 1),
            ambient: bcFoodBool(bcFoodCall(instance, ['isAmbient'], [])),
            visible: bcFoodBool(bcFoodCall(instance, ['isVisible'], [])),
            showIcon: bcFoodBool(bcFoodCall(instance, ['showIcon'], []))
        })
    }

    effects.sort(function (a, b) {
        if (a.effect < b.effect) return -1
        if (a.effect > b.effect) return 1
        return b.durationTicks - a.durationTicks
    })

    return effects
}

function bcFoodNamespaceOf(id) {
    var split = String(id).split(':')
    if (split.length < 2) return 'UNKNOWN'
    return split[0]
}

function bcFoodAddSummary(summary, record) {
    var ns = record.namespace
    summary.byNamespace[ns] = (summary.byNamespace[ns] || 0) + 1
    summary.byDietGroupCount[String(record.dietGroups.length)] = (summary.byDietGroupCount[String(record.dietGroups.length)] || 0) + 1

    for (var d = 0; d < record.dietGroups.length; d++) {
        var group = record.dietGroups[d]
        if (!summary.byDietGroup[group]) summary.byDietGroup[group] = []
        summary.byDietGroup[group].push(record.id)
    }

    if (record.effects.length === 0) {
        summary.foodsWithoutEffects.push(record.id)
        return
    }

    summary.foodsWithEffects.push(record.id)
    for (var i = 0; i < record.effects.length; i++) {
        var effect = record.effects[i].effect
        if (!summary.byEffect[effect]) summary.byEffect[effect] = []
        summary.byEffect[effect].push({
            item: record.id,
            nutrition: record.nutrition,
            saturationModifier: record.saturationModifier,
            durationTicks: record.effects[i].durationTicks,
            amplifier: record.effects[i].amplifier,
            probability: record.effects[i].probability
        })
    }
}

function bcFoodWriteAuditDump() {
    var records = []
    var errors = []
    var summary = {
        schema: BC_FOOD_AUDIT_SCHEMA,
        generatedBy: BC_FOOD_AUDIT_GENERATED_BY,
        generatedAt: bcFoodAuditTimestamp(),
        source: BC_FOOD_AUDIT_SOURCE,
        limitations: [
            'Custom item effects applied only inside finishUsingItem may not appear here.',
            'Suspicious stew dynamic NBT effects are not expanded because they are not a fixed item-level food property.'
        ],
        foodCount: 0,
        foodsWithEffectCount: 0,
        foodsWithoutEffectCount: 0,
        byNamespace: {},
        byEffect: {},
        byDietGroup: {},
        byDietGroupCount: {},
        foodsWithEffects: [],
        foodsWithoutEffects: []
    }

    var dietGroupMap = bcFoodCollectDietGroups()
    var keys = BcFoodBuiltInRegistries.ITEM.keySet().iterator()
    while (keys.hasNext()) {
        var key = keys.next()
        var id = String(key)
        try {
            var item = BcFoodBuiltInRegistries.ITEM.get(key)
            var stack = new BcFoodItemStack(item)
            var props = bcFoodReadProperties(item, stack)
            if (!props) continue

            var dietApi = bcFoodReadDietApi(stack)
            var fallbackDietGroups = dietGroupMap[id] || []
            var dietGroups = dietApi.groups.length ? dietApi.groups : fallbackDietGroups

            var record = {
                id: id,
                namespace: bcFoodNamespaceOf(id),
                descriptionId: bcFoodSafeString(bcFoodCall(item, ['getDescriptionId'], [])),
                nutrition: bcFoodNumber(bcFoodCall(props, ['getNutrition'], []), 0),
                saturationModifier: bcFoodNumber(bcFoodCall(props, ['getSaturationModifier'], []), 0),
                meat: bcFoodBool(bcFoodCall(props, ['isMeat'], [])),
                alwaysEat: bcFoodBool(bcFoodCall(props, ['canAlwaysEat'], [])),
                fastFood: bcFoodBool(bcFoodCall(props, ['isFastFood'], [])),
                tags: bcFoodCollectTags(item),
                dietGroups: dietGroups,
                dietGroupValues: dietApi.values,
                dietSource: dietApi.source === 'none' && fallbackDietGroups.length ? 'diet_tags' : dietApi.source,
                effects: bcFoodReadEffects(props)
            }

            records.push(record)
             bcFoodAddSummary(summary, record)
        } catch (e) {
            errors.push({ id: id, error: String(e) })
        }
    }

    records.sort(function (a, b) {
        if (a.id < b.id) return -1
        if (a.id > b.id) return 1
        return 0
    })
    summary.foodsWithEffects = bcFoodSortStrings(summary.foodsWithEffects)
    summary.foodsWithoutEffects = bcFoodSortStrings(summary.foodsWithoutEffects)

    for (var effectId in summary.byEffect) {
        summary.byEffect[effectId].sort(function (a, b) {
            if (a.item < b.item) return -1
            if (a.item > b.item) return 1
            return 0
        })
    }
    for (var dietGroup in summary.byDietGroup) {
        summary.byDietGroup[dietGroup] = bcFoodSortStrings(summary.byDietGroup[dietGroup])
    }

    summary.foodCount = records.length
    summary.foodsWithEffectCount = summary.foodsWithEffects.length
    summary.foodsWithoutEffectCount = summary.foodsWithoutEffects.length
    summary.errorCount = errors.length

    JsonIO.write(BC_FOOD_AUDIT_DIR + 'food_effect_index.json', {
        schema: summary.schema,
        generatedBy: summary.generatedBy,
        generatedAt: summary.generatedAt,
        source: summary.source,
        limitations: summary.limitations,
        foodCount: records.length,
        errorCount: errors.length,
        foods: records,
        errors: errors
    })
    JsonIO.write(BC_FOOD_AUDIT_DIR + 'food_effect_summary.json', summary)

    console.info('[BC-FOOD-AUDIT] foods=' + summary.foodCount + ' withEffects=' + summary.foodsWithEffectCount + ' errors=' + summary.errorCount + ' wrote food_effect_index.json')
}

ServerEvents.recipes(function (event) {
    var cfg = bcFoodAuditReadConfig()
    if (cfg.enabled && cfg.writeFoodEffectIndex) return bcFoodWriteAuditDump()
})

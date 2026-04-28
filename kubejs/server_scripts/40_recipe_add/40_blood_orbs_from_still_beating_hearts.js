// Converts RPG Stats "Still Beating Heart" snapshots into Blood Magic blood orbs.
// Recipe matching is driven by StillBeatingHeartData NBT on the heart item.

var HEART_ITEM = 'rpgstats:still_beating_heart'
var ORB_TIERS = [
    'bloodmagic:weakbloodorb',
    'bloodmagic:apprenticebloodorb',
    'bloodmagic:magicianbloodorb',
    'bloodmagic:masterbloodorb',
    'bloodmagic:archmagebloodorb'
]
var DEFAULT_BLOODMAGIC_ORB_ALTAR_RECIPE_IDS = [
    'bloodmagic:altar/weakbloodorb',
    'bloodmagic:altar/apprenticebloodorb',
    'bloodmagic:altar/magicianbloodorb',
    'bloodmagic:altar/masterbloodorb',
    'bloodmagic:altar/archmagebloodorb'
]

// Tune this to control what counts as "high hp stat" for tier 3.
var MIN_HEMOSTASIS_POINTS_FOR_HIGH_HP = 20

function heartDataTag(rootTag) {
    if (!rootTag || !rootTag.contains('StillBeatingHeartData', 10)) return null
    return rootTag.getCompound('StillBeatingHeartData')
}

function isLevelledHeart(dataTag) {
    if (!dataTag || !dataTag.contains('rpgstats', 10)) return false
    var rpg = dataTag.getCompound('rpgstats')

    if (rpg.contains('life_peak_level', 3) && rpg.getInt('life_peak_level') > 0) return true
    if (rpg.contains('total_points_this_life', 3) && rpg.getInt('total_points_this_life') > 0) return true
    if (rpg.contains('total_allocated_points', 3) && rpg.getInt('total_allocated_points') > 0) return true
    return false
}

function hemostasisPoints(dataTag) {
    if (!dataTag || !dataTag.contains('rpgstats', 10)) return 0
    var rpg = dataTag.getCompound('rpgstats')
    if (!rpg.contains('entries', 9)) return 0

    var entries = rpg.getList('entries', 10)
    for (var i = 0; i < entries.size(); i++) {
        var entry = entries.getCompound(i)
        if (!entry.contains('id', 8)) continue
        var id = String(entry.getString('id'))
        if (id === 'rpgstats:hemostasis' || id === 'hemostasis' || id.endsWith(':hemostasis')) {
            return entry.contains('points', 3) ? entry.getInt('points') : 0
        }
    }

    return 0
}

function hasHighHpStat(dataTag) {
    return hemostasisPoints(dataTag) >= MIN_HEMOSTASIS_POINTS_FOR_HIGH_HP
}

function deathTag(dataTag) {
    if (!dataTag || !dataTag.contains('death', 10)) return null
    return dataTag.getCompound('death')
}

function deathEntityTypeMatches(death, key, targetType) {
    if (!death || !death.contains(key, 10)) return false
    var entityTag = death.getCompound(key)
    return entityTag.contains('type', 8) && String(entityTag.getString('type')) === targetType
}

function causeId(death) {
    return death && death.contains('cause_id', 8) ? String(death.getString('cause_id')).toLowerCase() : ''
}

function wasKilledByWither(dataTag) {
    var death = deathTag(dataTag)
    if (!death) return false

    if (deathEntityTypeMatches(death, 'attacker', 'minecraft:wither')) return true
    if (deathEntityTypeMatches(death, 'direct_entity', 'minecraft:wither')) return true
    if (deathEntityTypeMatches(death, 'direct_entity', 'minecraft:wither_skull')) return true

    var cause = causeId(death)
    return cause === 'wither' || cause === 'wither_skull' || cause === 'witherskull'
}

function wasKilledByEnderDragon(dataTag) {
    var death = deathTag(dataTag)
    if (!death) return false

    if (deathEntityTypeMatches(death, 'attacker', 'minecraft:ender_dragon')) return true
    if (deathEntityTypeMatches(death, 'direct_entity', 'minecraft:ender_dragon')) return true
    if (deathEntityTypeMatches(death, 'direct_entity', 'minecraft:dragon_fireball')) return true

    return causeId(death).indexOf('dragon') !== -1
}

function heartIngredient(predicate) {
    return Ingredient.customNBT(Ingredient.of(HEART_ITEM), function (rootTag) {
        var dataTag = heartDataTag(rootTag)
        return dataTag != null && predicate(dataTag)
    })
}

function addOrbRecipe(event, idPath, output, input, altarTier, syphon, rate, drain) {
    event.recipes.bloodmagic
        .altar(output, input)
        .upgradeLevel(altarTier)
        .altarSyphon(syphon)
        .consumptionRate(rate)
        .drainRate(drain)
        .id('kubejs:bloodmagic/' + idPath)
}

ServerEvents.recipes(function (event) {
    if (!Platform.isLoaded('bloodmagic') || !Platform.isLoaded('rpgstats')) return
    if (!event.recipes.bloodmagic || !event.recipes.bloodmagic.altar) {
        console.warn('[blood-orbs-from-hearts] Blood Magic KubeJS addon API not found; skipping.')
        return
    }

    DEFAULT_BLOODMAGIC_ORB_ALTAR_RECIPE_IDS.forEach(function (id) {
        event.remove({ id: id })
    })

    // Registered high -> low so stricter matches are seen first.
    addOrbRecipe(
        event,
        '10_heart_to_archmage_orb',
        ORB_TIERS[4],
        heartIngredient(function (dataTag) { return isLevelledHeart(dataTag) && hasHighHpStat(dataTag) && wasKilledByEnderDragon(dataTag) }),
        5,
        150000,
        120,
        120
    )

    addOrbRecipe(
        event,
        '20_heart_to_master_orb',
        ORB_TIERS[3],
        heartIngredient(function (dataTag) { return isLevelledHeart(dataTag) && hasHighHpStat(dataTag) && wasKilledByWither(dataTag) }),
        4,
        60000,
        90,
        90
    )

    addOrbRecipe(
        event,
        '30_heart_to_magician_orb',
        ORB_TIERS[2],
        heartIngredient(function (dataTag) { return isLevelledHeart(dataTag) && hasHighHpStat(dataTag) }),
        3,
        25000,
        70,
        70
    )

    addOrbRecipe(
        event,
        '40_heart_to_apprentice_orb',
        ORB_TIERS[1],
        heartIngredient(function (dataTag) { return isLevelledHeart(dataTag) }),
        2,
        5000,
        40,
        40
    )

    addOrbRecipe(
        event,
        '50_heart_to_weak_orb',
        ORB_TIERS[0],
        heartIngredient(function (dataTag) { return dataTag != null }),
        1,
        2000,
        20,
        20
    )
})

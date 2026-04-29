// Blood Magic orbs are milestone outputs from specific RPGStats typed hearts.
// The typed-heart conversion uses Blood Orbs as non-consumed catalysts; the altar consumes the resulting heart key.

var DEFAULT_BLOODMAGIC_ORB_ALTAR_RECIPE_IDS = [
    'bloodmagic:altar/weakbloodorb',
    'bloodmagic:altar/apprenticebloodorb',
    'bloodmagic:altar/magicianbloodorb',
    'bloodmagic:altar/masterbloodorb',
    'bloodmagic:altar/archmagebloodorb'
]

function addTypedHeartOrbRecipe(event, idPath, output, input, altarTier, syphon, rate, drain) {
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

    addTypedHeartOrbRecipe(event, '10_typed_heart_to_weak_orb', 'bloodmagic:weakbloodorb', 'kubejs:weak_blood_heart', 1, 2000, 20, 20)
    addTypedHeartOrbRecipe(event, '20_typed_heart_to_apprentice_orb', 'bloodmagic:apprenticebloodorb', 'kubejs:apprentice_blood_heart', 2, 5000, 40, 40)
    addTypedHeartOrbRecipe(event, '30_typed_heart_to_magician_orb', 'bloodmagic:magicianbloodorb', 'kubejs:magician_blood_heart', 3, 25000, 70, 70)
    addTypedHeartOrbRecipe(event, '40_typed_heart_to_master_orb', 'bloodmagic:masterbloodorb', 'kubejs:master_blood_heart', 4, 60000, 90, 90)
    addTypedHeartOrbRecipe(event, '50_typed_heart_to_archmage_orb', 'bloodmagic:archmagebloodorb', 'kubejs:archmage_blood_heart', 5, 150000, 120, 120)
})

// kubejs/server_scripts/20_recipe_remove/30_remove_items.js

const Gson = Java.loadClass('com.google.gson.Gson')
const GSON = new Gson()

const DISABLED_ITEMS = [
    'fallout_wastelands_:steel_ingot',
'occultism:miner_debug_unspecialized',
'ars_nouveau:ritual_flight',
'bloodmagic:telepositionsigil',
'ars_nouveau:stable_warp_scroll',
'ars_nouveau:warp_scroll',
'alchemistry:atomizer',
'alchemistry:combiner',
'alchemistry:compactor',
'alchemistry:dissolver',
'alchemistry:fission_chamber_controller',
'alchemistry:fission_core',
'alchemistry:fusion_chamber_controller',
'alchemistry:fusion_core',
'alchemistry:liquifier',
'alchemistry:reactor_casing',
'alchemistry:reactor_energy',
'alchemistry:reactor_glass',
'alchemistry:reactor_input',
'alchemistry:reactor_output',
'occultism:miner_foliot_unspecialized',
'occultism:miner_djinni_ores',
'occultism:miner_afrit_deeps',
'occultism:miner_marid_master',
'sophisticatedbackpacks:stack_upgrade_omega_tier',
'sophisticatedstorage:stack_upgrade_omega_tier',
'bloodmagic:teleposer',
'createdieselgenerators:distillation_controller',
'createdieselgenerators:pumpjack_head',
'createdieselgenerators:pumpjack_hole',
'createdieselgenerators:pumpjack_bearing',
'createdieselgenerators:pumpjack_crank',
'createdieselgenerators:oil_scanner',
'pneumaticcraft:solar_compressor',
'pneumaticcraft:flux_compressor',
'pneumaticcraft:jet_boots_upgrade_4',
'pneumaticcraft:jet_boots_upgrade_5'
]

function safeString(value) {
    if (value == null) return ''
        try {
            return value.toString()
        } catch (ignored) {
            return ''
        }
}

function recipeJsonString(recipe) {
    try {
        return GSON.toJson(recipe.json)
    } catch (ignored) {
        try {
            return safeString(recipe.json)
        } catch (ignoredAgain) {
            return ''
        }
    }
}

ServerEvents.recipes(event => {
    console.log('========== Disabled item deep scan start ==========')

    event.remove({ id: 'burnt:gunpowder_recipe' })
    event.remove({ id: 'burnt:fire_barrel_recipe_2' })

    // Normal output selector pass.
    DISABLED_ITEMS.forEach(item => {
        event.remove({ output: item })
    })

    const idsToRemove = []

    // Deep JSON scan pass.
    event.forEachRecipe({}, recipe => {
        const id = safeString(recipe.getId())
        const type = safeString(recipe.getType())
        const json = recipeJsonString(recipe)

        let matchedItem = null

        DISABLED_ITEMS.forEach(item => {
            if (matchedItem == null && json.indexOf(item) !== -1) {
                matchedItem = item
            }
        })

        if (matchedItem != null) {
            console.log('[KubeJS] Queued recipe containing disabled item:')
            console.log('  matched item: ' + matchedItem)
            console.log('  recipe id: ' + id)
            console.log('  recipe type: ' + type)

            idsToRemove.push(id)
        }
    })

    idsToRemove.forEach(id => {
        if (id != '') {
            event.remove({ id: id })
        }
    })

    console.log('[KubeJS] Deep scan removed recipe count: ' + idsToRemove.length)
    console.log('========== Disabled item deep scan end ==========')
})

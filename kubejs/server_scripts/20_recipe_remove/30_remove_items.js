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
'occultism:miner_foliot_unspecialized',
'occultism:miner_djinni_ores',
'occultism:miner_afrit_deeps',
'occultism:miner_marid_master',
'bloodmagic:teleposer'
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

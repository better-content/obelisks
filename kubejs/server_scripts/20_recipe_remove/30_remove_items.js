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
'ars_nouveau:glyph_conjure_water',
'ars_nouveau:ritual_conjure_island_plains',
'ars_nouveau:ritual_conjure_island_desert',
'ars_caelum:ritual_conjure_island_geode',
'ars_caelum:ritual_conjure_island_vexing',
'ars_caelum:ritual_conjure_island_village',
'ars_caelum:ritual_conjure_island_flourishing',
'ars_caelum:ritual_conjure_island_end_portal',
'ars_caelum:ritual_conjure_island_blazing',
'ars_caelum:ritual_sedimentation',
'bloodmagic:watersigil',
'bloodmagic:lavasigil',
'bloodmagic:reagentwater',
'bloodmagic:reagentlava',
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
'pneumaticcraft:air_compressor',
'pneumaticcraft:advanced_air_compressor',
'pneumaticcraft:liquid_compressor',
'pneumaticcraft:advanced_liquid_compressor',
'pneumaticcraft:thermal_compressor',
'pneumaticcraft:manual_compressor',
'pneumaticcraft:electrostatic_compressor',
'pneumaticcraft:solar_compressor',
'pneumaticcraft:flux_compressor',
'pneumaticcraft:creative_compressor',
'pneumaticcraft:jet_boots_upgrade_4',
'pneumaticcraft:jet_boots_upgrade_5',
'fallout_wastelands_:portal_frame',
'fallout_wastelands_:wastelands',
'the_finley_dimension_remastered:finley_dimension',
'undergarden:catalyst',
'callfromthedepth_:depth',
'bloodmagic:simplekey',
'bloodmagic:minekey',
'bloodmagic:mineentrancekey',
'bloodmagic:reagentteleposition',
'bloodmagic:teleposerfocus',
'bloodmagic:reinforcedteleposerfocus',
'bloodmagic:enhancedteleposerfocus',
'irons_spellbooks:portal_frame',
'irons_spellbooks:pocket_dimension_portal_frame',
'irons_spellbooks:wayward_compass',
'aether:aether_portal_frame',
'deeperdarker:otherside_portal'
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
    event.remove({ type: 'occultism:miner' })
    event.remove({ type: 'bloodmagic:meteor' })
    event.remove({ id: 'createdieselgenerators:bulk_fermenting/lava' })
    event.remove({ id: 'ars_nouveau:water_essence_to_bucket' })
    event.remove({ id: 'ars_nouveau:water_essence_to_obsidian' })
    event.remove({ id: 'ars_nouveau:fire_essence_to_magma_block' })
    event.remove({ id: 'ars_nouveau:conjuration_essence_to_soul_sand' })
    event.remove({ id: 'ars_nouveau:conjuration_essence_to_end_stone' })

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

var BTM_HIDDEN_QUARANTINED_ITEMS = [
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
    'occultism:miner_debug_unspecialized',
    'occultism:miner_foliot_unspecialized',
    'occultism:miner_djinni_ores',
    'occultism:miner_afrit_deeps',
    'occultism:miner_marid_master',
    'sophisticatedbackpacks:stack_upgrade_omega_tier',
    'sophisticatedstorage:stack_upgrade_omega_tier',
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
    'pneumaticcraft:jet_boots_upgrade_5'
]

var BTM_HIDDEN_DIRECT_DIMENSION_TRAVEL_ITEMS = [
    'fallout_wastelands_:portal_frame',
    'fallout_wastelands_:wastelands',
    'the_finley_dimension_remastered:finley_dimension',
    'undergarden:catalyst',
    'callfromthedepth_:depth',
    'bloodmagic:simplekey',
    'bloodmagic:minekey',
    'bloodmagic:mineentrancekey',
    'bloodmagic:teleposer',
    'bloodmagic:telepositionsigil',
    'bloodmagic:reagentteleposition',
    'bloodmagic:teleposerfocus',
    'bloodmagic:reinforcedteleposerfocus',
    'bloodmagic:enhancedteleposerfocus',
    'irons_spellbooks:portal_frame',
    'irons_spellbooks:pocket_dimension_portal_frame',
    'irons_spellbooks:wayward_compass',
    'aether:aether_portal_frame',
    'blue_skies:everbright_portal',
    'blue_skies:everdawn_portal',
    'blue_skies:multi_portal_item',
    'blue_skies:portal_activator',
    'deeperdarker:otherside_portal'
]

var BTM_HIDDEN_ITEMS = BTM_HIDDEN_QUARANTINED_ITEMS.concat(BTM_HIDDEN_DIRECT_DIMENSION_TRAVEL_ITEMS)

JEIEvents.hideItems(function (event) {
    BTM_HIDDEN_ITEMS.forEach(function (item) { event.hide(item) })
})

if (Platform.isLoaded('emi') && typeof EMIEvents !== 'undefined') {
    EMIEvents.hideItems(function (event) {
        BTM_HIDDEN_ITEMS.forEach(function (item) { event.hide(item) })
    })
}

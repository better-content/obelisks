var BTM_HEXEREI_MAHOGANY_TREE_PRODUCTS = [
    'hexerei:mahogany_sapling',
    'hexerei:mahogany_leaves',
    'hexerei:mahogany_log',
    'hexerei:mahogany_wood',
    'hexerei:stripped_mahogany_log',
    'hexerei:stripped_mahogany_wood',
    'hexerei:mahogany_planks',
    'hexerei:mahogany_slab',
    'hexerei:mahogany_stairs',
    'hexerei:mahogany_button',
    'hexerei:mahogany_door',
    'hexerei:mahogany_fence',
    'hexerei:mahogany_fence_gate',
    'hexerei:mahogany_pressure_plate',
    'hexerei:mahogany_sign',
    'hexerei:mahogany_hanging_sign',
    'hexerei:mahogany_wall_sign',
    'hexerei:mahogany_wall_hanging_sign',
    'hexerei:mahogany_trapdoor',
    'hexerei:mahogany_boat',
    'hexerei:mahogany_chest_boat',
    'hexerei:mahogany_connected',
    'hexerei:mahogany_window',
    'hexerei:mahogany_window_pane',
    'hexerei:mahogany_broom_stand',
    'hexerei:mahogany_broom_stand_wall',
    'hexerei:mahogany_chest',
    'hexerei:mahogany_courier_depot',
    'hexerei:mahogany_courier_depot_wall',
    'hexerei:mahogany_drying_rack',
    'hexerei:mahogany_woodcutter',
    'hexerei:polished_mahogany_planks',
    'hexerei:polished_mahogany_connected',
    'hexerei:polished_mahogany_layered',
    'hexerei:polished_mahogany_pillar',
    'hexerei:polished_mahogany_slab',
    'hexerei:polished_mahogany_stairs',
    'hexerei:polished_mahogany_button',
    'hexerei:polished_mahogany_door',
    'hexerei:polished_mahogany_fence',
    'hexerei:polished_mahogany_fence_gate',
    'hexerei:polished_mahogany_pressure_plate',
    'hexerei:polished_mahogany_sign',
    'hexerei:polished_mahogany_trapdoor',
    'hexerei:waxed_mahogany_connected',
    'hexerei:waxed_mahogany_window',
    'hexerei:waxed_mahogany_window_pane',
    'hexerei:waxed_polished_mahogany_connected',
    'hexerei:waxed_polished_mahogany_layered',
    'hexerei:waxed_polished_mahogany_pillar'
]

JEIEvents.hideItems(function (event) {
    for (var i = 0; i < BTM_HEXEREI_MAHOGANY_TREE_PRODUCTS.length; i++) {
        event.hide(BTM_HEXEREI_MAHOGANY_TREE_PRODUCTS[i])
    }
})

if (Platform.isLoaded('emi') && typeof EMIEvents !== 'undefined') {
    EMIEvents.hideItems(function (event) {
        for (var i = 0; i < BTM_HEXEREI_MAHOGANY_TREE_PRODUCTS.length; i++) {
            event.hide(BTM_HEXEREI_MAHOGANY_TREE_PRODUCTS[i])
        }
    })
}

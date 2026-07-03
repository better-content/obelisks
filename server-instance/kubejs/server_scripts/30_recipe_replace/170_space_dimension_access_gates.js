// Direct dimension portals are not pack routes. Player dimension travel should
// come from Dimensional Font routes or Creating Space rocket graph entries only.

var BTM_DIRECT_DIMENSION_ROUTE_ITEMS = [
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

ServerEvents.recipes(function (event) {
    for (var i = 0; i < BTM_DIRECT_DIMENSION_ROUTE_ITEMS.length; i++) {
        var item = BTM_DIRECT_DIMENSION_ROUTE_ITEMS[i]
        if (Item.exists(item)) event.remove({ output: item })
    }

    event.remove({ id: 'fallout_wastelands_:portalframecraft' })
    event.remove({ id: 'fallout_wastelands_:portalignitercraft' })
    event.remove({ id: 'the_finley_dimension_remastered:igniterrecipie' })
    event.remove({ id: 'undergarden:catalyst' })
    event.remove({ id: 'callfromthedepth_:depthkeycraft' })
    event.remove({ id: 'bloodmagic:soulforge/simple_key' })
    event.remove({ id: 'bloodmagic:soulforge/mine_key' })
    event.remove({ id: 'irons_spellbooks:portal_frame' })
    event.remove({ id: 'irons_spellbooks:wayward_compass' })

    console.info('[space-dimension-access] disabled direct portal/key recipe outputs; use Dimensional Fonts or Creating Space rocket routes')
})

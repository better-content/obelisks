function addAllToTargets(event, targets, entries) {
    for (var ti = 0; ti < targets.length; ti++) {
        for (var ei = 0; ei < entries.length; ei++) {
            event.add(targets[ti], entries[ei])
        }
    }
}

var dirtLikeEntries = [
    'minecraft:dirt',
    'minecraft:coarse_dirt',
    'minecraft:rooted_dirt',
    'minecraft:dirt_path',
    'minecraft:podzol',
    'minecraft:mycelium',
    'minecraft:mud',
    'minecraft:packed_mud',
    '#unearthed:regolith',
    'natures_spirit:red_moss_block',
    'natures_spirit:sandy_soil',
]

var grassLikeEntries = [
    'minecraft:grass_block',
    'aether:aether_grass_block',
    'aether:enchanted_aether_grass_block',
    'dtaether:rooty_aether_grass_block',
    'dtaether:rooty_enchanted_aether_grass_block',
    'dtaether:rooty_frozen_aether_grass_block',
    'dynamictrees:rooty_grass_block',
    'fallout_wastelands_:wastelandgrassblock',
    'goety:chorus_grass_block',
    'immersive_weathering:grassy_earthen_clay',
    'immersive_weathering:grassy_permafrost',
    'immersive_weathering:grassy_sandy_dirt',
    'immersive_weathering:grassy_silt',
    'immersive_weathering:rooted_grass_block',
    'unearthed:beige_limestone_grassy_regolith',
    'unearthed:conglomerate_grassy_regolith',
    'unearthed:dolomite_grassy_regolith',
    'unearthed:gabbro_grassy_regolith',
    'unearthed:granodiorite_grassy_regolith',
    'unearthed:grey_limestone_grassy_regolith',
    'unearthed:kimberlite_grassy_regolith',
    'unearthed:limestone_grassy_regolith',
    'unearthed:mudstone_grassy_regolith',
    'unearthed:phyllite_grassy_regolith',
    'unearthed:quartzite_grassy_regolith',
    'unearthed:rhyolite_grassy_regolith',
    'unearthed:sandstone_grassy_regolith',
    'unearthed:siltstone_grassy_regolith',
    'unearthed:slate_grassy_regolith',
    'unearthed:stone_grassy_regolith',
    'unearthed:white_granite_grassy_regolith',
    'unearthed:overgrown_andesite',
    'unearthed:overgrown_diorite',
    'unearthed:overgrown_granite',
]

ServerEvents.tags('item', function (event) {
    addAllToTargets(event, ['kubejs:dirt_like', 'forge:dirt', 'c:dirt'], dirtLikeEntries)
    addAllToTargets(event, ['kubejs:grass_like', 'forge:grass', 'c:grass'], grassLikeEntries)
})

ServerEvents.tags('block', function (event) {
    addAllToTargets(event, ['kubejs:dirt_like', 'forge:dirt', 'c:dirt'], dirtLikeEntries)
    addAllToTargets(event, ['kubejs:grass_like', 'forge:grass', 'c:grass'], grassLikeEntries)
})

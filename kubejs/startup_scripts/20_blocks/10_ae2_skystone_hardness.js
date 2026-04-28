// kubejs/startup_scripts/ae2_skystone_hardness.js

var AE2_SKYSTONE_BLOCKS = [
    'ae2:sky_stone_block',
'ae2:smooth_sky_stone_block',
'ae2:sky_stone_brick',
'ae2:sky_stone_small_brick',
'ae2:sky_stone_chest',
'ae2:smooth_sky_stone_chest',
'ae2:sky_stone_slab',
'ae2:sky_stone_stairs',
'ae2:sky_stone_wall',
'ae2:sky_stone_brick_slab',
'ae2:sky_stone_brick_stairs',
'ae2:sky_stone_brick_wall',
'ae2:sky_stone_small_brick_slab',
'ae2:sky_stone_small_brick_stairs',
'ae2:sky_stone_small_brick_wall',
'ae2:smooth_sky_stone_slab',
'ae2:smooth_sky_stone_stairs',
'ae2:smooth_sky_stone_wall'
]

BlockEvents.modification(function (event) {
    AE2_SKYSTONE_BLOCKS.forEach(function (id) {
        event.modify(id, function (block) {
            block.destroySpeed = 3.0
        })
    })
})

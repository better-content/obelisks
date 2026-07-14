var BC_STONE_SURFACE_PICK_ONLY_BLOCKS = [
    'unearthed:overgrown_andesite',
    'unearthed:overgrown_diorite',
    'unearthed:overgrown_granite',
]

ServerEvents.tags('block', function (event) {
    for (var i = 0; i < BC_STONE_SURFACE_PICK_ONLY_BLOCKS.length; i++) {
        var id = BC_STONE_SURFACE_PICK_ONLY_BLOCKS[i]
        event.add('minecraft:mineable/pickaxe', id)
        event.remove('minecraft:mineable/axe', id)
        event.remove('minecraft:mineable/shovel', id)
        event.remove('minecraft:mineable/hoe', id)
        event.remove('minecraft:sword_efficient', id)
    }
})

// Remove crafting-table andesite alloy recipes while keeping non-crafting
// methods, such as Create mixing, available.

ServerEvents.recipes(function (event) {
    event.remove({ type: 'minecraft:crafting_shaped', output: 'create:andesite_alloy' })
    event.remove({ type: 'minecraft:crafting_shapeless', output: 'create:andesite_alloy' })
})

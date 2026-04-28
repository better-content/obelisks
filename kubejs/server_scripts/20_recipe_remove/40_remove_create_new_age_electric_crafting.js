var CNE_ELECTRIC_ITEMS = [
    'create_new_age:basic_energiser',
    'create_new_age:reinforced_energiser',
    'create_new_age:advanced_energiser',
    'create_new_age:basic_motor',
    'create_new_age:reinforced_motor',
    'create_new_age:advanced_motor',
    'create_new_age:basic_motor_extension',
    'create_new_age:advanced_motor_extension',
    'create_new_age:electrical_connector',
    'create_new_age:copper_wire',
    'create_new_age:copper_wire_block',
    'create_new_age:overcharged_iron_wire',
    'create_new_age:overcharged_iron_wire_block',
    'create_new_age:overcharged_golden_wire',
    'create_new_age:overcharged_golden_wire_block',
    'create_new_age:overcharged_diamond_wire',
    'create_new_age:overcharged_diamond_wire_block',
    'create_new_age:generator_coil',
    'create_new_age:carbon_brushes',
    'create_new_age:copper_circuit',
    'create_new_age:blank_circuit',
    'create_new_age:layered_magnet',
    'create_new_age:redstone_magnet',
    'create_new_age:netherite_magnet'
]

ServerEvents.recipes(function (event) {
    CNE_ELECTRIC_ITEMS.forEach(function (item) {
        event.remove({ type: 'minecraft:crafting_shaped', output: item })
        event.remove({ type: 'minecraft:crafting_shapeless', output: item })
        event.remove({ type: 'minecraft:crafting_shaped', input: item })
        event.remove({ type: 'minecraft:crafting_shapeless', input: item })
    })
})

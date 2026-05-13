// Food-to-potion reagent processing. Food blocks discover and refine effect identity;
// the brewing stand only combines already processed extracts into vanilla potions.

ServerEvents.recipes(function (event) {
    function exists(item) {
        try { return Item.exists(item) } catch (e) { return false }
    }

    function inputExists(input) {
        return input.indexOf('#') === 0 || exists(input)
    }

    function inputsExist(inputs) {
        for (var i = 0; i < inputs.length; i++) {
            if (!inputExists(inputs[i])) return false
        }
        return true
    }

    function add(json, id) {
        event.custom(json).id('kubejs:food_reagents/' + id)
    }

    function cutting(input, output, count, id) {
        if (!Platform.isLoaded('farmersdelight') || !exists(input) || !exists(output)) return
        add({
            type: 'farmersdelight:cutting',
            ingredients: [{ item: input }],
            tool: { tag: 'forge:tools/knives' },
            result: [{ item: output, count: count || 1 }]
        }, 'cutting/' + id)
    }

    function campfire(input, output, id, time) {
        if (!exists(input) || !exists(output)) return
        add({
            type: 'minecraft:campfire_cooking',
            category: 'misc',
            ingredient: { item: input },
            result: output,
            experience: 0.1,
            cookingtime: time || 600
        }, 'campfire/' + id)
    }

    function cooking(inputs, output, id, time) {
        if (!Platform.isLoaded('farmersdelight') || !exists(output) || !inputsExist(inputs)) return
        add({
            type: 'farmersdelight:cooking',
            ingredients: inputs.map(function (input) { return input.indexOf('#') === 0 ? { tag: input.substring(1) } : { item: input } }),
            result: { item: output },
            container: { item: 'minecraft:glass_bottle' },
            experience: 0.35,
            cookingtime: time || 200,
            recipe_book_tab: 'misc'
        }, 'cooking/' + id)
    }

    function kettlePour(fluid, output, id) {
        if (!Platform.isLoaded('farmersrespite') || !exists(output)) return
        add({
            type: 'farmersrespite:kettle_pouring',
            amount: 250,
            container: { item: 'minecraft:glass_bottle' },
            fluid: fluid,
            output: { item: output }
        }, 'kettle_pouring/' + id)
    }

    function kegPour(fluid, output, id) {
        if (!Platform.isLoaded('brewinandchewin') || !exists(output)) return
        add({
            type: 'brewinandchewin:keg_pouring',
            amount: 250,
            container: { item: 'minecraft:glass_bottle' },
            filling: true,
            fluid: fluid,
            output: { item: output },
            strict: false
        }, 'keg_pouring/' + id)
    }

    cutting('farmersrespite:green_tea_leaves', 'kubejs:cut_green_tea_leaves', 2, 'green_tea_leaves')
    cutting('delightful:salmonberries', 'kubejs:mashed_salmonberries', 2, 'salmonberries')
    cutting('farmersrespite:blazing_chili', 'kubejs:charred_blazing_chili', 1, 'blazing_chili_prep')

    campfire('farmersrespite:coffee_beans', 'kubejs:roasted_coffee_reagent', 'coffee_reagent', 600)
    campfire('farmersrespite:blazing_chili', 'kubejs:charred_blazing_chili', 'blazing_chili', 800)

    cooking(['kubejs:mashed_salmonberries', 'minecraft:sea_pickle', 'minecraft:dried_kelp', 'minecraft:pufferfish'], 'kubejs:brine_extract', 'brine_extract', 300)
    cooking(['minecraft:golden_carrot', 'ubesdelight:ube', 'minecraft:glow_berries'], 'kubejs:vision_extract', 'vision_extract', 240)
    cooking(['kubejs:charred_blazing_chili', 'mynethersdelight:hot_spice', 'minecraft:magma_cream'], 'kubejs:heatproof_extract', 'heatproof_extract', 320)
    cooking(['undergarden:gloomper_leg', 'minecraft:rabbit_foot', 'minecraft:sugar'], 'kubejs:leaping_extract', 'leaping_extract', 260)
    cooking(['delightful:cooked_marshmallow_stick', 'minecraft:phantom_membrane', 'minecraft:honey_bottle'], 'kubejs:featherlight_extract', 'featherlight_extract', 260)
    cooking(['minecraft:glistering_melon_slice', 'kubejs:rose_hip_extract', 'minecraft:honey_bottle'], 'kubejs:melon_life_extract', 'melon_life_extract', 240)
    cooking(['minecraft:turtle_helmet', 'kubejs:brine_extract', 'minecraft:scute'], 'kubejs:turtle_guard_extract', 'turtle_guard_extract', 360)
    cooking(['kubejs:toxic_extract', 'minecraft:fermented_spider_eye', 'farmersrespite:purulent_tea'], 'kubejs:weakening_extract', 'weakening_extract', 260)
    cooking(['kubejs:vision_extract', 'minecraft:fermented_spider_eye', 'minecraft:ender_eye'], 'kubejs:shadow_extract', 'shadow_extract', 320)
    cooking(['kubejs:toxic_extract', 'kubejs:melon_life_extract', 'minecraft:fermented_spider_eye'], 'kubejs:harm_extract', 'harm_extract', 320)
    cooking(['kubejs:leaping_extract', 'kubejs:caffeine_extract', 'minecraft:fermented_spider_eye'], 'kubejs:slowness_extract', 'slowness_extract', 320)
    cooking(['kubejs:green_tea_extract', 'minecraft:nether_wart', 'minecraft:honey_bottle'], 'kubejs:stabilized_reagent', 'green_stabilized_reagent', 240)

    kettlePour('farmersrespite:green_tea', 'kubejs:green_tea_extract', 'green_tea_extract')
    kettlePour('farmersrespite:coffee', 'kubejs:caffeine_extract', 'caffeine_extract')
    kettlePour('farmersrespite:rose_hip_tea', 'kubejs:rose_hip_extract', 'rose_hip_extract')
    kettlePour('farmersrespite:yellow_tea', 'kubejs:fortifying_extract', 'fortifying_extract')
    kettlePour('farmersrespite:purulent_tea', 'kubejs:toxic_extract', 'toxic_extract')

    kegPour('brewinandchewin:red_rum', 'kubejs:fermented_pomegranate_extract', 'fermented_pomegranate_extract')
    kegPour('brewinandchewin:salty_folly', 'kubejs:brine_extract', 'salty_brine_extract')
})

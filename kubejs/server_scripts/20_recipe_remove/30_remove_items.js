// kubejs/server_scripts/disable_items_recipes.js

const DISABLED_ITEMS = [
    "fallout_wastelands_:steel_ingot"
// "minecraft:diamond",
];

ServerEvents.recipes(event => {
    DISABLED_ITEMS.forEach(id => {
        // Remove any recipe whose OUTPUT is this item
        event.remove({ output: id });
    });
});

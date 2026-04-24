// KubeJS 6+ / Rhino-safe
// Tinkers Construct 1.20.1 custom melting + ore_melting recipes for deposit ore blocks.
//
// IMPORTANT:
// - This file uses exact TCon recipe JSON shapes validated against generated 1.20.1 recipes.
// - Replace the ingredient tags below with your real ore block item IDs or your own item tags.
// - ore_melting byproducts are effectively a Foundry feature; the Melter only gets the primary melting recipe.
// - Deposits without any valid molten outputs in the current pack fluid set are intentionally omitted from recipe registration.
//
// Suggested tag convention:
//   kubejs:deposit_blocks/<deposit_id>
// and put the single raw ore block for that deposit into the matching item tag.

ServerEvents.recipes(function (event) {
    function fluidTag(path) {
        return 'forge:molten_' + path;
    }

    function melting(id, ingredient, moltenTag, amount, temperature, time) {
        event.custom({
            type: 'tconstruct:melting',
            ingredient: ingredient,
            result: {
                amount: amount,
                tag: moltenTag
            },
            temperature: temperature,
            time: time
        }).id('kubejs:tconstruct/melting/' + id);
    }

    function oreMelting(id, ingredient, moltenTag, amount, temperature, time, byproducts) {
        var recipe = {
            type: 'tconstruct:ore_melting',
            ingredient: ingredient,
            result: {
                amount: amount,
                tag: moltenTag
            },
            rate: 'metal',
            temperature: temperature,
            time: time
        };

        if (byproducts && byproducts.length > 0) {
            recipe.byproducts = byproducts;
        }

        event.custom(recipe).id('kubejs:tconstruct/ore_melting/' + id);
    }

    function byproduct(moltenTag, amount) {
        return {
            amount: amount,
            rate: 'metal',
            tag: moltenTag
        };
    }

    function depositRecipe(def) {
        var ingredient = { tag: def.tag };

        melting(def.id, ingredient, def.primary, def.melterAmount, def.temperature, def.melterTime);

        var byproducts = [];
        if (def.secondary) byproducts.push(byproduct(def.secondary, def.secondaryAmount));
        if (def.tertiary) byproducts.push(byproduct(def.tertiary, def.tertiaryAmount));

        oreMelting(def.id, ingredient, def.primary, def.oreAmount, def.temperature, def.oreTime, byproducts);
    }

    // Notes on balance:
    // - Melter = smaller, primary-only output.
    // - ore_melting = larger primary output; byproducts become relevant in the Foundry.
    // - Amounts are chosen in multiples of 90mb where practical.
    // - Where a deposit's literal 1st output has no molten representation in this pack,
    //   the first TCon-valid output is used as the primary molten product.
    //
    // Unsupported with current molten-fluid set and therefore omitted:
    //   lazurite_vein, redstone_vein, sulfur_bearing_pyrite, phosphate_rock,
    //   soul_bearing_black_shale, thorium_ore
    //
    // Partial-faithful mappings used to cover all remaining deposits:
    //   coal_measures -> iron primary only (3rd output)
    //   titanium_iron_oxide -> titanium + iron + chromium
    //   corundum_beryl_vein -> emerald + sapphire + quartz
    //   bauxite_laterite -> aluminum + iron + nickel
    //   emerald_schist_beryl -> emerald + aluminum + quartz

    var deposits = [
        {
            id: 'coal_measures',
            tag: 'kubejs:deposit_blocks/coal_measures',
            primary: fluidTag('iron'),
                     secondary: null,
                     tertiary: null,
                     temperature: 800,
                     melterAmount: 45,
                     oreAmount: 90,
                     secondaryAmount: 0,
                     tertiaryAmount: 0,
                     melterTime: 110,
                     oreTime: 150
        },
        {
            id: 'ironstone',
            tag: 'kubejs:deposit_blocks/ironstone',
            primary: fluidTag('iron'),
                     secondary: fluidTag('nickel'),
                     tertiary: fluidTag('chromium'), // using chromium as the closest high-tier metallic trace substitute for vanadium
                     temperature: 800,
                     melterAmount: 90,
                     oreAmount: 180,
                     secondaryAmount: 45,
                     tertiaryAmount: 22,
                     melterTime: 120,
                     oreTime: 170
        },
        {
            id: 'copper_sulfide',
            tag: 'kubejs:deposit_blocks/copper_sulfide',
            primary: fluidTag('copper'),
                     secondary: fluidTag('iron'),
                     tertiary: fluidTag('gold'),
                     temperature: 500,
                     melterAmount: 90,
                     oreAmount: 180,
                     secondaryAmount: 45,
                     tertiaryAmount: 22,
                     melterTime: 100,
                     oreTime: 150
        },
        {
            id: 'zinc',
            tag: 'kubejs:deposit_blocks/zinc',
            primary: fluidTag('zinc'),
                     secondary: fluidTag('lead'),
                     tertiary: fluidTag('cadmium'),
                     temperature: 420,
                     melterAmount: 90,
                     oreAmount: 180,
                     secondaryAmount: 45,
                     tertiaryAmount: 22,
                     melterTime: 100,
                     oreTime: 150
        },
        {
            id: 'tin',
            tag: 'kubejs:deposit_blocks/tin',
            primary: fluidTag('tin'),
                     secondary: fluidTag('quartz'),
                     tertiary: fluidTag('tungsten'),
                     temperature: 225,
                     melterAmount: 90,
                     oreAmount: 180,
                     secondaryAmount: 45,
                     tertiaryAmount: 22,
                     melterTime: 90,
                     oreTime: 130
        },
        {
            id: 'lead_zinc_vein',
            tag: 'kubejs:deposit_blocks/lead_zinc_vein',
            primary: fluidTag('lead'),
                     secondary: fluidTag('zinc'),
                     tertiary: fluidTag('silver'),
                     temperature: 420,
                     melterAmount: 90,
                     oreAmount: 180,
                     secondaryAmount: 45,
                     tertiaryAmount: 45,
                     melterTime: 110,
                     oreTime: 160
        },
        {
            id: 'nickel_sulfide',
            tag: 'kubejs:deposit_blocks/nickel_sulfide',
            primary: fluidTag('nickel'),
                     secondary: fluidTag('iron'),
                     tertiary: fluidTag('cobalt'),
                     temperature: 950,
                     melterAmount: 90,
                     oreAmount: 180,
                     secondaryAmount: 45,
                     tertiaryAmount: 22,
                     melterTime: 120,
                     oreTime: 180
        },
        {
            id: 'tin_tungsten_greisen',
            tag: 'kubejs:deposit_blocks/tin_tungsten_greisen',
            primary: fluidTag('tungsten'),
                     secondary: fluidTag('tin'),
                     tertiary: fluidTag('quartz'),
                     temperature: 1450,
                     melterAmount: 90,
                     oreAmount: 180,
                     secondaryAmount: 45,
                     tertiaryAmount: 90,
                     melterTime: 150,
                     oreTime: 220
        },
        {
            id: 'titanium_iron_oxide',
            tag: 'kubejs:deposit_blocks/titanium_iron_oxide',
            primary: fluidTag('aluminum'), // fallback if you have no molten titanium; replace with your own molten titanium tag if later added
                     secondary: fluidTag('iron'),
                     tertiary: fluidTag('chromium'),
                     temperature: 950,
                     melterAmount: 90,
                     oreAmount: 180,
                     secondaryAmount: 90,
                     tertiaryAmount: 22,
                     melterTime: 130,
                     oreTime: 190
        },
        {
            id: 'bauxite_laterite',
            tag: 'kubejs:deposit_blocks/bauxite_laterite',
            primary: fluidTag('aluminum'),
                     secondary: fluidTag('iron'),
                     tertiary: fluidTag('nickel'),
                     temperature: 425,
                     melterAmount: 90,
                     oreAmount: 180,
                     secondaryAmount: 45,
                     tertiaryAmount: 22,
                     melterTime: 110,
                     oreTime: 160
        },
        {
            id: 'kimberlite_pipe',
            tag: 'kubejs:deposit_blocks/kimberlite_pipe',
            primary: fluidTag('diamond'),
                     secondary: fluidTag('nickel'),
                     tertiary: null,
                     temperature: 1450,
                     melterAmount: 45,
                     oreAmount: 90,
                     secondaryAmount: 22,
                     tertiaryAmount: 0,
                     melterTime: 160,
                     oreTime: 230
        },
        {
            id: 'emerald_schist_beryl',
            tag: 'kubejs:deposit_blocks/emerald_schist_beryl',
            primary: fluidTag('emerald'),
                     secondary: fluidTag('aluminum'),
                     tertiary: fluidTag('quartz'),
                     temperature: 1450,
                     melterAmount: 45,
                     oreAmount: 90,
                     secondaryAmount: 45,
                     tertiaryAmount: 22,
                     melterTime: 160,
                     oreTime: 230
        },
        {
            id: 'quartz_vein',
            tag: 'kubejs:deposit_blocks/quartz_vein',
            primary: fluidTag('quartz'),
                     secondary: fluidTag('gold'),
                     tertiary: fluidTag('copper'),
                     temperature: 1035,
                     melterAmount: 90,
                     oreAmount: 180,
                     secondaryAmount: 22,
                     tertiaryAmount: 22,
                     melterTime: 120,
                     oreTime: 180
        },
        {
            id: 'corundum_beryl_vein',
            tag: 'kubejs:deposit_blocks/corundum_beryl_vein',
            primary: 'tinkersinnovation:molten_sapphire',
            secondary: fluidTag('emerald'),
                     tertiary: fluidTag('quartz'),
                     temperature: 1450,
                     melterAmount: 45,
                     oreAmount: 90,
                     secondaryAmount: 22,
                     tertiaryAmount: 22,
                     melterTime: 160,
                     oreTime: 230
        },
        {
            id: 'uranium_ore',
            tag: 'kubejs:deposit_blocks/uranium_ore',
            primary: fluidTag('uranium'),
                     secondary: fluidTag('lead'),
                     tertiary: null,
                     temperature: 950,
                     melterAmount: 90,
                     oreAmount: 180,
                     secondaryAmount: 45,
                     tertiaryAmount: 0,
                     melterTime: 130,
                     oreTime: 190
        }
    ];

    var i;
    for (i = 0; i < deposits.length; i++) {
        depositRecipe(deposits[i]);
    }
});

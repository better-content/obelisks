// Player-facing ore origin notes. JEI and EMI show these item tooltips on hover.

function btmOreOriginLines(source, detail, processing) {
    var lines = [
        Text.gold('Ore source: ' + source),
        Text.gray(detail)
    ]
    if (processing) lines.push(Text.darkGray(processing))
    return lines
}

function btmAddOreOrigin(event, items, lines) {
    for (var i = 0; i < items.length; i++) event.add(items[i], lines)
}

var BTM_REALISTIC_ORE_ORIGINS = [
    {
        name: 'Coal measures',
        source: 'Realistic Ores deposit',
        detail: 'Overworld coal field, Y 0 to 80.',
        processing: 'Crush for coal, carbon, and ferrous traces.',
        blocks: ['realisticores:coal_measures', 'realisticores:deepslate_coal_measures'],
        crushed: 'realisticores:crushed_coal_measures'
    },
    {
        name: 'Ironstone',
        source: 'Realistic Ores deposit',
        detail: 'Overworld iron field, Y -64 to 64.',
        processing: 'Crush for iron with nickel and chromium traces.',
        blocks: ['realisticores:ironstone', 'realisticores:deepslate_ironstone', 'minecraft:iron_ore', 'minecraft:deepslate_iron_ore'],
        crushed: 'realisticores:crushed_ironstone'
    },
    {
        name: 'Copper sulfide',
        source: 'Realistic Ores deposit',
        detail: 'Overworld copper field, Y -16 to 64.',
        processing: 'Crush for copper, sulfur, iron, and gold traces.',
        blocks: ['realisticores:copper_sulfide_ore', 'realisticores:deepslate_copper_sulfide_ore', 'minecraft:copper_ore', 'minecraft:deepslate_copper_ore'],
        crushed: 'realisticores:crushed_copper_sulfide_ore'
    },
    {
        name: 'Tin',
        source: 'Realistic Ores deposit',
        detail: 'Overworld tin field, Y 16 to 64.',
        processing: 'Crush for tin with quartz and tungsten traces.',
        blocks: ['realisticores:tin_ore', 'realisticores:deepslate_tin_ore'],
        crushed: 'realisticores:crushed_tin_ore'
    },
    {
        name: 'Zinc',
        source: 'Realistic Ores deposit',
        detail: 'Overworld zinc field, Y 16 to 64. Create native zinc generation is disabled.',
        processing: 'Crush zinc and lead-zinc deposits for Create zinc materials.',
        blocks: ['realisticores:zinc_ore', 'realisticores:deepslate_zinc_ore', 'create:zinc_ore', 'create:deepslate_zinc_ore'],
        crushed: 'realisticores:crushed_zinc_ore'
    },
    {
        name: 'Lead-zinc vein',
        source: 'Realistic Ores deposit',
        detail: 'Overworld lead and silver field, Y 16 to 64.',
        processing: 'Crush for lead, zinc, and silver traces.',
        blocks: ['realisticores:lead_zinc_vein', 'realisticores:deepslate_lead_zinc_vein'],
        crushed: 'realisticores:crushed_lead_zinc_vein'
    },
    {
        name: 'Quartz vein',
        source: 'Realistic Ores deposit',
        detail: 'Nether quartz remains a Nether deposit; Overworld quartz comes from this deposit route.',
        processing: 'Crush for quartz, silicon, and trace copper or gold.',
        blocks: ['realisticores:quartz_vein', 'realisticores:deepslate_quartz_vein', 'minecraft:nether_quartz_ore'],
        crushed: 'realisticores:crushed_quartz_vein'
    },
    {
        name: 'Bauxite laterite',
        source: 'Realistic Ores deposit',
        detail: 'Overworld aluminum field, Y 16 to 64.',
        processing: 'Crush for aluminum with nickel, titanium, and gallium traces.',
        blocks: ['realisticores:bauxite_laterite', 'realisticores:deepslate_bauxite_laterite'],
        crushed: 'realisticores:crushed_bauxite_laterite'
    },
    {
        name: 'Nickel sulfide',
        source: 'Realistic Ores deposit',
        detail: 'Overworld nickel field, Y 16 to 64. Creating Space Overworld nickel generation is disabled.',
        processing: 'Crush for nickel with sulfur and platinum-group traces.',
        blocks: ['realisticores:nickel_sulfide_ore', 'realisticores:deepslate_nickel_sulfide_ore', 'creatingspace:nickel_ore', 'creatingspace:deepslate_nickel_ore'],
        crushed: 'realisticores:crushed_nickel_sulfide_ore'
    },
    {
        name: 'Tin-tungsten greisen',
        source: 'Realistic Ores deposit',
        detail: 'Overworld hard-rock tin and tungsten field, Y 16 to 64.',
        processing: 'Crush for tungsten, tin, quartz, and tantalum traces.',
        blocks: ['realisticores:tin_tungsten_greisen', 'realisticores:deepslate_tin_tungsten_greisen'],
        crushed: 'realisticores:crushed_tin_tungsten_greisen'
    },
    {
        name: 'Titanium iron oxide',
        source: 'Realistic Ores deposit',
        detail: 'Overworld titanium field, Y -64 to -16.',
        processing: 'Crush for titanium with iron and oxide chemistry.',
        blocks: ['realisticores:titanium_iron_oxide_ore', 'realisticores:deepslate_titanium_iron_oxide_ore'],
        crushed: 'realisticores:crushed_titanium_iron_oxide_ore'
    },
    {
        name: 'Kimberlite pipe',
        source: 'Realistic Ores deposit',
        detail: 'Deep Overworld diamond field, Y -64 to -16.',
        processing: 'Crush for carbon, magnesium, and rare diamonds.',
        blocks: ['realisticores:kimberlite_pipe', 'realisticores:deepslate_kimberlite_pipe', 'minecraft:diamond_ore', 'minecraft:deepslate_diamond_ore'],
        crushed: 'realisticores:crushed_kimberlite_pipe'
    },
    {
        name: 'Emerald schist beryl',
        source: 'Realistic Ores deposit',
        detail: 'High mountain emerald and beryllium field, Y 112 to 256.',
        processing: 'Crush for beryllium, aluminum, silicon, and emerald traces.',
        blocks: ['realisticores:emerald_schist_beryl_vein', 'realisticores:deepslate_emerald_schist_beryl_vein', 'minecraft:emerald_ore', 'minecraft:deepslate_emerald_ore'],
        crushed: 'realisticores:crushed_emerald_schist_beryl_vein'
    },
    {
        name: 'Corundum beryl gem vein',
        source: 'Realistic Ores deposit',
        detail: 'High mountain gem field, Y 112 to 256.',
        processing: 'Crush for amethyst, aluminum, and beryllium chemistry.',
        blocks: ['realisticores:corundum_beryl_gem_vein', 'realisticores:deepslate_corundum_beryl_gem_vein'],
        crushed: 'realisticores:crushed_corundum_beryl_gem_vein'
    },
    {
        name: 'Uranium ore',
        source: 'Realistic Ores deposit',
        detail: 'Deep Overworld uranium field, Y -64 to -48, plus a lava-exposed Y -64 to 0 diving pass.',
        processing: 'Crush for uranium with lead, thorium, and calcium traces.',
        blocks: ['realisticores:uranium_ore', 'realisticores:deepslate_uranium_ore'],
        crushed: 'realisticores:crushed_uranium_ore'
    },
    {
        name: 'Thorium ore',
        source: 'Realistic Ores lava-depth pass',
        detail: 'Deep Overworld lava-exposed deepslate source, Y -64 to 0.',
        processing: 'Crush for thorium with uranium and lead traces.',
        blocks: ['realisticores:thorium_ore', 'realisticores:deepslate_thorium_ore'],
        crushed: 'realisticores:crushed_thorium_ore'
    },
    {
        name: 'Osmiridium lava sulfide',
        source: 'Realistic Ores lava-depth pass',
        detail: 'Deep Overworld lava-exposed deposit, Y -64 to 0; each generated ore block must touch lava.',
        processing: 'Crush and wash for osmium, iridium, and platinum-group traces used by Protection Pixel and post-AE2 utility.',
        blocks: ['realisticores:osmiridium_lava_sulfide_ore', 'realisticores:deepslate_osmiridium_lava_sulfide_ore'],
        crushed: 'realisticores:crushed_osmiridium_lava_sulfide_ore'
    },
    {
        name: 'Cupriferous redbed redstone',
        source: 'Realistic Ores deposit',
        detail: 'Overworld redstone and copper field, Y -32 to 16.',
        processing: 'Crush for redstone, copper, iron, and gold traces.',
        blocks: ['realisticores:cupriferous_redbed_redstone_vein', 'realisticores:deepslate_cupriferous_redbed_redstone_vein', 'minecraft:redstone_ore', 'minecraft:deepslate_redstone_ore'],
        crushed: 'realisticores:crushed_cupriferous_redbed_redstone_vein'
    },
    {
        name: 'Lazurite vein',
        source: 'Realistic Ores deposit',
        detail: 'Overworld lapis field, Y -32 to 16.',
        processing: 'Crush for lapis, sodium, aluminum, and silicon.',
        blocks: ['realisticores:lazurite_vein', 'realisticores:deepslate_lazurite_vein', 'minecraft:lapis_ore', 'minecraft:deepslate_lapis_ore'],
        crushed: 'realisticores:crushed_lazurite_vein'
    },
    {
        name: 'Phosphate rock',
        source: 'Realistic Ores deposit',
        detail: 'Overworld phosphate field handled by the bounded matter economy.',
        processing: 'Crush for phosphorus, calcium, oxygen, and bone meal.',
        blocks: ['realisticores:phosphate_rock', 'realisticores:deepslate_phosphate_rock'],
        crushed: 'realisticores:crushed_phosphate_rock'
    },
    {
        name: 'Soul-bearing black shale',
        source: 'Realistic Ores deposit',
        detail: 'Deep carbon and soulstone-adjacent deposit field.',
        processing: 'Crush for carbon, soul sand, sulfur, and redstone traces.',
        blocks: ['realisticores:soul_bearing_black_shale_soulstone_vein', 'realisticores:deepslate_soul_bearing_black_shale_soulstone_vein'],
        crushed: 'realisticores:crushed_soul_bearing_black_shale_soulstone_vein'
    },
    {
        name: 'Sulfur-bearing pyrite',
        source: 'Realistic Ores deposit',
        detail: 'Overworld sulfur field handled by the bounded matter economy.',
        processing: 'Crush for sulfur with iron, copper, and gold traces.',
        blocks: ['realisticores:sulfur_bearing_pyrite_ore', 'realisticores:deepslate_sulfur_bearing_pyrite_ore'],
        crushed: 'realisticores:crushed_sulfur_bearing_pyrite_ore'
    }
]

var BTM_SIMPLE_ORE_ORIGINS = [
    {
        items: ['minecraft:coal_ore', 'minecraft:deepslate_coal_ore'],
        lines: btmOreOriginLines('Realistic Ores deposit', 'Overworld coal field, Y 0 to 80.', 'Look for localized deposit fields instead of scattered vanilla ore.')
    },
    {
        items: ['minecraft:gold_ore', 'minecraft:deepslate_gold_ore'],
        lines: btmOreOriginLines('Realistic Ores deposit', 'Overworld gold field, Y 8 to 32.', 'Nether gold ore remains a Nether deposit.')
    },
    {
        items: ['minecraft:nether_gold_ore'],
        lines: btmOreOriginLines('Realistic Ores Nether deposit', 'Nether gold field, Y 8 to 118.', 'Overworld gold uses the localized Overworld deposit route.')
    },
    {
        items: ['minecraft:ancient_debris'],
        lines: btmOreOriginLines('Realistic Ores Nether deposit', 'Nether ancient debris field, Y 8 to 22.', 'Look for localized deposit bodies rather than vanilla scatter.')
    }
]

var BTM_SUPPRESSED_NATIVE_ORES = [
    {
        items: ['create:raw_zinc', 'create:crushed_raw_zinc'],
        lines: btmOreOriginLines('Realistic Ores zinc deposits', 'Create native zinc worldgen is disabled.', 'Mine zinc or lead-zinc deposits, then crush and wash for Create zinc materials.')
    },
    {
        items: ['create:crushed_raw_aluminum', 'creatingspace:raw_aluminum', 'creatingspace:crushed_aluminum_ore'],
        lines: btmOreOriginLines('Realistic Ores bauxite laterite', 'Overworld aluminum comes from bauxite laterite deposits, Y 16 to 64.', 'Creating Space lunar aluminum ore remains Moon-native.')
    },
    {
        items: ['create:crushed_raw_nickel', 'creatingspace:raw_nickel', 'creatingspace:crushed_nickel_ore'],
        lines: btmOreOriginLines('Realistic Ores nickel sulfide', 'Overworld nickel comes from nickel sulfide deposits, Y 16 to 64.', 'Creating Space Overworld nickel generation is disabled; Moon nickel remains Moon-native.')
    },
    {
        items: ['creatingspace:raw_cobalt', 'creatingspace:crushed_cobalt_ore'],
        lines: btmOreOriginLines('Realistic Ores cobalt deposits', 'Overworld cobalt is a localized deposit resource, Y 16 to 64.', 'TConstruct native cobalt worldgen is disabled in favor of the deposit economy.')
    },
    {
        items: ['creatingspace:moon_aluminum_ore', 'creatingspace:moon_cobalt_ore', 'creatingspace:moon_nickel_ore'],
        lines: btmOreOriginLines('Creating Space Moon', 'Lunar ores are dimension-native and are not part of the Overworld deposit pass.', 'Use the space route for these Moon-specific ore blocks.')
    }
]

var BTM_METEOR_ORE_ORIGINS = [
    {
        ores: ['arcane_crystal_ore', 'runic_stone', 'stella_arcanum', 'mithril_ore'],
        items: [
            'forbidden_arcanus:arcane_crystal_ore',
            'forbidden_arcanus:deepslate_arcane_crystal_ore',
            'forbidden_arcanus:arcane_crystal',
            'forbidden_arcanus:runic_stone',
            'forbidden_arcanus:runic_deepslate',
            'forbidden_arcanus:stella_arcanum',
            'forbidden_arcanus:stellarite_piece',
            'irons_spellbooks:mithril_ore',
            'irons_spellbooks:deepslate_mithril_ore',
            'irons_spellbooks:raw_mithril'
        ],
        lines: btmOreOriginLines('Meteor sky dimensions', 'Natural generation is in Aether meteor target biomes.', 'The original Overworld generators are disabled.')
    },
    {
        ores: ['darkstone', 'gilded_darkstone', 'jade_ore', 'cthonic_gold_ore', 'soulstone_ore', 'brilliant_stone', 'xpetrified_ore'],
        items: [
            'forbidden_arcanus:darkstone',
            'forbidden_arcanus:gilded_darkstone',
            'forbidden_arcanus:xpetrified_ore',
            'forbidden_arcanus:xpetrified_orb',
            'goety:jade_ore',
            'goety:jade',
            'malum:cthonic_gold_ore',
            'malum:cthonic_gold',
            'malum:cthonic_gold_fragment',
            'malum:soulstone_ore',
            'malum:deepslate_soulstone_ore',
            'malum:raw_soulstone',
            'malum:brilliant_stone',
            'malum:brilliant_deepslate'
        ],
        lines: btmOreOriginLines('Meteor deep dimensions', 'Natural generation is in Undergarden and Otherside meteor target biomes.', 'The original Overworld generators are disabled.')
    },
    {
        ores: ['natural_quartz_ore'],
        items: [
            'malum:natural_quartz_ore',
            'malum:deepslate_quartz_ore',
            'malum:natural_quartz'
        ],
        lines: btmOreOriginLines('Meteor sky and deep dimensions', 'Natural quartz appears in Aether, Undergarden, and Otherside meteor targets.', 'Malum quartz geodes are relocated with the ore.')
    },
    {
        ores: [],
        items: ['malum:blazing_quartz_ore', 'malum:blazing_quartz', 'malum:blazing_quartz_fragment'],
        lines: btmOreOriginLines('Meteor Nether targets', 'Natural generation is restricted to Nether-tagged meteor target biomes.', 'The ordinary Malum biome modifier is overridden by the relocation datapack.')
    },
    {
        ores: [],
        items: ['occultism:iesnium_ore_natural', 'occultism:raw_iesnium', 'occultism:iesnium_ore'],
        lines: btmOreOriginLines('Meteor Nether targets', 'Natural Iesnium generation is restricted to Nether-tagged meteor target biomes.', 'Occultism miner shortcuts remain hidden; this is the natural ore route.')
    },
    {
        ores: [],
        items: [
            'hexerei:selenite_block',
            'hexerei:budding_selenite',
            'hexerei:small_selenite_bud',
            'hexerei:medium_selenite_bud',
            'hexerei:large_selenite_bud',
            'hexerei:selenite_cluster',
            'hexerei:selenite_shard'
        ],
        lines: btmOreOriginLines('Meteor sky dimensions', 'Selenite geodes generate in Aether meteor target biomes.', 'The original Overworld geode modifier is disabled.')
    },
    {
        ores: [],
        items: [
            'tconstruct:earth_slime_crystal',
            'tconstruct:earth_slime_crystal_block',
            'tconstruct:budding_earth_slime_crystal',
            'tconstruct:small_earth_slime_crystal_bud',
            'tconstruct:medium_earth_slime_crystal_bud',
            'tconstruct:large_earth_slime_crystal_bud',
            'tconstruct:earth_slime_crystal_cluster'
        ],
        lines: btmOreOriginLines('Meteor deep dimensions', 'Earth slime crystal geodes generate in Undergarden and Otherside meteor target biomes.', 'The original TConstruct geode modifier is disabled.')
    },
    {
        ores: [],
        items: [
            'tconstruct:sky_slime_crystal',
            'tconstruct:sky_slime_crystal_block',
            'tconstruct:budding_sky_slime_crystal',
            'tconstruct:small_sky_slime_crystal_bud',
            'tconstruct:medium_sky_slime_crystal_bud',
            'tconstruct:large_sky_slime_crystal_bud',
            'tconstruct:sky_slime_crystal_cluster'
        ],
        lines: btmOreOriginLines('Meteor sky dimensions', 'Sky slime crystal geodes generate in Aether meteor target biomes.', 'The original TConstruct geode modifier is disabled.')
    },
    {
        ores: [],
        items: [
            'tconstruct:ichor_slime_crystal',
            'tconstruct:ichor_slime_crystal_block',
            'tconstruct:budding_ichor_slime_crystal',
            'tconstruct:small_ichor_slime_crystal_bud',
            'tconstruct:medium_ichor_slime_crystal_bud',
            'tconstruct:large_ichor_slime_crystal_bud',
            'tconstruct:ichor_slime_crystal_cluster'
        ],
        lines: btmOreOriginLines('Meteor Nether targets', 'Ichor slime crystal geodes generate in Nether-tagged meteor target biomes.', 'The original TConstruct geode modifier is disabled.')
    }
]

var BTM_METEOR_EV_STONES = [
    'gravel',
    'aether_holystone',
    'aether_mossy_holystone',
    'undergarden_depthrock',
    'undergarden_shiverstone',
    'undergarden_tremblecrust',
    'undergarden_loose_tremblecrust',
    'deeperdarker_sculk_stone',
    'deeperdarker_gloomslate',
    'deeperdarker_sculk_grime'
]

function btmAddExcavatedMeteorVariants(event, oreIds, lines) {
    for (var i = 0; i < BTM_METEOR_EV_STONES.length; i++) {
        for (var j = 0; j < oreIds.length; j++) {
            event.add('excavated_variants:' + BTM_METEOR_EV_STONES[i] + '_' + oreIds[j], lines)
        }
    }
}

ItemEvents.tooltip(function (event) {
    for (var i = 0; i < BTM_REALISTIC_ORE_ORIGINS.length; i++) {
        var dep = BTM_REALISTIC_ORE_ORIGINS[i]
        var lines = btmOreOriginLines(dep.source, dep.name + ': ' + dep.detail, dep.processing)
        btmAddOreOrigin(event, dep.blocks, lines)
        event.add(dep.crushed, btmOreOriginLines('Crushed Realistic Ores deposit', dep.name + ': made by crushing the matching deposit block.', dep.processing))
    }

    for (var j = 0; j < BTM_SIMPLE_ORE_ORIGINS.length; j++) {
        btmAddOreOrigin(event, BTM_SIMPLE_ORE_ORIGINS[j].items, BTM_SIMPLE_ORE_ORIGINS[j].lines)
    }

    for (var k = 0; k < BTM_SUPPRESSED_NATIVE_ORES.length; k++) {
        btmAddOreOrigin(event, BTM_SUPPRESSED_NATIVE_ORES[k].items, BTM_SUPPRESSED_NATIVE_ORES[k].lines)
    }

    for (var m = 0; m < BTM_METEOR_ORE_ORIGINS.length; m++) {
        btmAddOreOrigin(event, BTM_METEOR_ORE_ORIGINS[m].items, BTM_METEOR_ORE_ORIGINS[m].lines)
        btmAddExcavatedMeteorVariants(event, BTM_METEOR_ORE_ORIGINS[m].ores, BTM_METEOR_ORE_ORIGINS[m].lines)
    }
})

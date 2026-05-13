// Blood Magic slate-based progression gates for major magic systems.
// Uses existing Blood Magic items only (no custom gate materials).

var BM_SLATE_T1 = 'bloodmagic:blankslate'
var BM_SLATE_T2 = 'bloodmagic:reinforcedslate'
var BM_SLATE_T3 = 'bloodmagic:infusedslate'
var BM_SLATE_T4 = 'bloodmagic:demonslate'
var BM_SLATE_T5 = 'bloodmagic:etherealslate'

function gate(event, filter, oldInput, newInput) {
    event.replaceInput(filter, oldInput, newInput)
}

ServerEvents.recipes(function (event) {
    // Altar I: early folk, spirit, and utility magic.
    gate(event, { id: 'hexerei:mixing_cauldron' }, 'minecraft:torch', BM_SLATE_T1)
    gate(event, { id: 'malum:spirit_altar' }, '#forge:ingots/gold', BM_SLATE_T1)
    gate(event, { id: 'rootsclassic:altar' }, '#forge:storage_blocks/gold', BM_SLATE_T1)
    gate(event, { id: 'reliquary:apothecary_cauldron' }, 'reliquary:catalyzing_gland', BM_SLATE_T1)

    // Altar II: purified Blood Magic becomes basic Ars source material work.
    gate(event, { output: 'ars_nouveau:source_gem' }, 'minecraft:amethyst_shard', BM_SLATE_T2)
    gate(event, { output: 'ars_nouveau:source_gem_block' }, 'ars_nouveau:source_gem', BM_SLATE_T2)
    gate(event, { id: 'ars_nouveau:imbuement_chamber' }, '#forge:ingots/gold', BM_SLATE_T2)
    gate(event, { id: 'ars_nouveau:novice_spell_book' }, 'minecraft:book', BM_SLATE_T2)

    // Altar III: real Ars apparatus and glyph expansion.
    gate(event, { id: 'ars_nouveau:enchanting_apparatus' }, '#forge:ingots/gold', BM_SLATE_T3)
    gate(event, { id: 'ars_nouveau:apprentice_spell_book_upgrade' }, 'minecraft:diamond', BM_SLATE_T3)

    // Altar II/III: restrained Ars addon entry points.
    gate(event, { id: 'ars_additions:apparatus/advanced_dominion_wand' }, 'minecraft:gold_ingot', BM_SLATE_T2)
    gate(event, { id: 'ars_instrumentum:apparatus/numeric_mana_charm' }, '#forge:ingots/gold', BM_SLATE_T2)
    gate(event, { id: 'ars_elemental:imbuement_lesser_air_focus' }, 'minecraft:gold_ingot', BM_SLATE_T2)
    gate(event, { id: 'ars_elemental:imbuement_lesser_earth_focus' }, 'minecraft:gold_ingot', BM_SLATE_T2)
    gate(event, { id: 'ars_elemental:imbuement_lesser_fire_focus' }, 'minecraft:gold_ingot', BM_SLATE_T2)
    gate(event, { id: 'ars_elemental:imbuement_lesser_water_focus' }, 'minecraft:gold_ingot', BM_SLATE_T2)
    gate(event, { id: 'naturesaura:offering_table' }, 'naturesaura:infused_iron', BM_SLATE_T2)
    gate(event, { id: 'irons_spellbooks:scroll_forge' }, 'minecraft:polished_deepslate', BM_SLATE_T2)

    // Altar III: Occultism ritual-start access (gate chalk path, not guidebook).
    gate(event, { id: 'occultism:crafting/chalk_white_impure' }, 'occultism:burnt_otherstone', BM_SLATE_T3)

    // Altar III: dangerous magic, spirits, and servants.
    // Tome of Blood moved to the post-AE2 hybrid branch in
    // 166_tome_of_blood_post_ae2_gates.js.

    if (Item.exists('mahoutsukai:attuned_diamond') && Item.exists('mahoutsukai:attuner')) {
        event.remove({ id: 'mahoutsukai:attuned_diamond' })
        event.shapeless('mahoutsukai:attuned_diamond', [
            'mahoutsukai:attuner',
            'minecraft:diamond',
            BM_SLATE_T3
        ]).id('kubejs:mahoutsukai/attuned_diamond_blood_gate')
    }

    gate(event, { id: 'eidolon:crucible' }, 'eidolon:pewter_ingot', BM_SLATE_T3)
    gate(event, { id: 'eidolon:soul_enchanter' }, '#forge:gems/diamond', BM_SLATE_T3)
    gate(event, { id: 'goety:cursed_cage' }, 'goety:cursed_bars', BM_SLATE_T3)
    gate(event, { id: 'goety:dark_altar' }, 'goety:magic_emerald', BM_SLATE_T3)

    // Altar IV: Occultism high automation/mining and Botania engineering.
    gate(event, { id: 'occultism:ritual/craft_dimensional_mineshaft' }, 'occultism:spirit_attuned_crystal', BM_SLATE_T4)

    gate(event, { id: 'botania:runic_altar' }, 'botania:mana_pearl', BM_SLATE_T4)
    gate(event, { id: 'botania:runic_altar_alt' }, '#botania:mana_diamond_gems', BM_SLATE_T4)
    gate(event, { id: 'botania:terra_plate/terrasteel_ingot' }, 'botania:mana_diamond', BM_SLATE_T4)

    gate(event, { id: 'forbidden_arcanus:clibano_core' }, 'minecraft:blast_furnace', BM_SLATE_T4)
    gate(event, { id: 'forbidden_arcanus:deorum_ingot' }, 'minecraft:gold_ingot', BM_SLATE_T4)
    gate(event, { id: 'theurgy:crafting/shaped/incubator' }, '#forge:ingots/gold', BM_SLATE_T4)
    gate(event, { id: 'theurgy:crafting/shaped/liquefaction_cauldron' }, 'minecraft:cauldron', BM_SLATE_T4)
    gate(event, { id: 'ars_creo:starbuncle_wheel' }, 'create:water_wheel', BM_SLATE_T4)
    gate(event, { id: 'ars_technica:source_engine' }, 'ars_technica:calibrated_precision_mechanism', BM_SLATE_T4)
    gate(event, { id: 'ars_caelum:ritual_conjure_island_geode' }, '#forge:gems/diamond', BM_SLATE_T4)
    gate(event, { id: 'ars_caelum:ritual_sedimentation' }, 'ars_nouveau:frostaya_pod', BM_SLATE_T4)
    gate(event, { id: 'reliquary:alkahestry_altar' }, 'minecraft:redstone_lamp', BM_SLATE_T4)

    // Altar V: programmable / networked magic.
    gate(event, { id: 'psi:programmer' }, '#forge:ingots/iron', BM_SLATE_T5)
    gate(event, { id: 'hexcasting:focus' }, 'minecraft:paper', BM_SLATE_T5)

    gate(event, { id: 'mna:occulus' }, 'mna:vinteum_dust', BM_SLATE_T5)
    gate(event, { id: 'mna:manaweaving_altar' }, 'minecraft:water_bucket', BM_SLATE_T5)
    gate(event, { id: 'hexalia:hex_focus' }, 'minecraft:amethyst_shard', BM_SLATE_T5)
    gate(event, { id: 'arseng:me_source_jar' }, 'ars_nouveau:manipulation_essence', BM_SLATE_T5)
    gate(event, { id: 'arseng:source_acceptor' }, 'ars_nouveau:source_gem_block', BM_SLATE_T5)
    gate(event, { id: 'arseng:source_cell_housing' }, 'ars_nouveau:manipulation_essence', BM_SLATE_T5)
    gate(event, { id: 'ars_nouveau:archmage_spell_book_upgrade' }, 'minecraft:emerald', BM_SLATE_T5)
    gate(event, { id: 'reliquary:alkahestry_tome' }, 'minecraft:book', BM_SLATE_T5)
})

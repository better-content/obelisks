#!/usr/bin/env python3

import glob
import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
KUBEJS_CONFIG = ROOT / "kubejs" / "config"
RUNTIME_DUMP = ROOT / "generated" / "runtime-dumps" / "kubejs-config"

TECH_PATH = KUBEJS_CONFIG / "tech_parenting.json"
MAGIC_PATH = KUBEJS_CONFIG / "magic_parenting.json"
ECON_PATH = KUBEJS_CONFIG / "economy_acquisition.json"
SURFACE_PATH = KUBEJS_CONFIG / "surface_registry.json"

COINS = [
    "createdeco:copper_coin",
    "createdeco:zinc_coin",
    "createdeco:iron_coin",
    "createdeco:industrial_iron_coin",
    "createdeco:brass_coin",
    "createdeco:gold_coin",
    "createdeco:netherite_coin",
]
COIN_SET = set(COINS)
TECH_ORDER = [
    "survival",
    "seared",
    "andesite",
    "brass",
    "airtight",
    "electrical",
    "space",
    "raw_impossible",
    "impossible",
]

VANILLA_CRAFTED = {
    "minecraft:crafting_shaped",
    "minecraft:crafting_shapeless",
    "minecraft:smithing_transform",
    "minecraft:smithing_trim",
    "minecraft:smelting",
    "minecraft:blasting",
    "minecraft:smoking",
    "minecraft:campfire_cooking",
    "minecraft:stonecutting",
}

SURVIVAL_NAMESPACES = {
    "farmersdelight",
    "delightful",
    "rusticdelight",
    "veggiesdelight",
    "corndelight",
    "farmersrespite",
    "brewinandchewin",
    "diet",
    "thirst",
    "cold_sweat",
    "supplementaries",
    "quark",
    "dynamictrees",
    "dynamictreesplus",
    "natures_spirit",
    "immersive_weathering",
    "projectvibrantjourneys",
    "minecraft",
}

DIMENSION_NAMESPACES = {
    "aether",
    "blue_skies",
    "undergarden",
    "twilightforest",
    "lostcities",
    "fallout_wastelands_",
    "the_finley_dimension_remastered",
    "callfromthedepth_",
    "deeperdarker",
}

MAGIC_NAMESPACES = {
    "bloodmagic",
    "malum",
    "occultism",
    "eidolon",
    "mahoutsukai",
    "ars_nouveau",
    "ars_elemental",
    "ars_additions",
    "ars_creo",
    "ars_technica",
    "ars_caelum",
    "hexerei",
    "goety",
    "forbidden_arcanus",
    "reliquary",
    "irons_spellbooks",
    "tomeofblood",
    "arseng",
}

TECH_EXACT_ERA = {
    "kubejs:seared_machine_casing": "seared",
    "kubejs:seared_service_fitting": "seared",
    "tconstruct:smeltery_controller": "seared",
    "tconstruct:seared_melter": "seared",
    "tconstruct:seared_heater": "seared",
    "tconstruct:seared_table": "seared",
    "tconstruct:seared_basin": "seared",
    "tconstruct:seared_drain": "seared",
    "tconstruct:seared_faucet": "seared",
    "tconstruct:seared_channel": "seared",
    "tconstruct:seared_chute": "seared",
    "tconstruct:seared_casting_tank": "seared",
    "tconstruct:seared_fuel_tank": "seared",
    "tconstruct:seared_fuel_gauge": "seared",
    "create:basin": "seared",
    "create:depot": "seared",
    "create:chute": "seared",
    "create:andesite_funnel": "seared",
    "create:andesite_tunnel": "seared",
    "create:fluid_tank": "seared",
    "create:item_drain": "seared",
    "create:spout": "seared",
    "rehooked:wood_chain": "seared",
    "rehooked:wood_hook": "seared",
    "create:andesite_alloy": "andesite",
    "create:andesite_casing": "andesite",
    "kubejs:andesite_machine_casing": "andesite",
    "kubejs:andesite_utility_frame": "andesite",
    "create:millstone": "andesite",
    "create:encased_fan": "andesite",
    "create:mechanical_press": "andesite",
    "create:mechanical_mixer": "andesite",
    "create:mechanical_saw": "andesite",
    "create:mechanical_drill": "andesite",
    "create:mechanical_crafter": "andesite",
    "create:crushing_wheel": "andesite",
    "create:mechanical_piston": "andesite",
    "create:sticky_mechanical_piston": "andesite",
    "create:gearshift": "andesite",
    "create:clutch": "andesite",
    "rehooked:iron_hook": "andesite",
    "morered:red_alloy_wire": "andesite",
    "morered:diode": "andesite",
    "morered:soldering_table": "andesite",
    "minecraft:piston": "andesite",
    "minecraft:sticky_piston": "andesite",
    "minecraft:hopper": "andesite",
    "minecraft:dropper": "andesite",
    "minecraft:dispenser": "andesite",
    "minecraft:observer": "andesite",
    "minecraft:repeater": "andesite",
    "minecraft:comparator": "andesite",
    "minecraft:daylight_detector": "andesite",
    "minecraft:rail": "andesite",
    "minecraft:powered_rail": "andesite",
    "minecraft:detector_rail": "andesite",
    "minecraft:activator_rail": "andesite",
    "minecraft:minecart": "andesite",
    "minecraft:chest_minecart": "andesite",
    "minecraft:furnace_minecart": "andesite",
    "create:precision_mechanism": "brass",
    "kubejs:brass_machine_casing": "brass",
    "kubejs:brass_utility_assembly": "brass",
    "create:steam_engine": "brass",
    "create:rotation_speed_controller": "brass",
    "create:mechanical_arm": "brass",
    "create:stockpile_switch": "brass",
    "create:content_observer": "brass",
    "create:brass_funnel": "brass",
    "create:brass_tunnel": "brass",
    "create:smart_chute": "brass",
    "create:display_link": "brass",
    "create:display_board": "brass",
    "create:portable_storage_interface": "brass",
    "create:portable_fluid_interface": "brass",
    "create:packager": "brass",
    "create:stock_link": "brass",
    "create:stock_ticker": "brass",
    "create:track_station": "brass",
    "create:track_signal": "brass",
    "create:track_observer": "brass",
    "create:controller_rail": "brass",
    "create:redstone_link": "brass",
    "create:linked_controller": "brass",
    "create:clipboard": "brass",
    "create:copper_backtank": "brass",
    "create:copper_diving_helmet": "brass",
    "create:copper_diving_boots": "brass",
    "create:empty_blaze_burner": "brass",
    "createdieselgenerators:engine_piston": "brass",
    "createdieselgenerators:diesel_engine": "brass",
    "createdieselgenerators:pumpjack_bearing": "brass",
    "createdieselgenerators:distillation_controller": "brass",
    "createdieselgenerators:pumpjack_hole": "brass",
    "createdieselgenerators:pumpjack_head": "brass",
    "createdieselgenerators:pumpjack_crank": "brass",
    "create_connected:kinetic_battery": "brass",
    "create_connected:brake": "brass",
    "createadvlogistics:package_content_filter": "brass",
    "createadvlogistics:redstone_radio": "electrical",
    "hangglider:hang_glider": "brass",
    "hangglider:reinforced_hang_glider": "impossible",
    "rehooked:diamond_chain": "brass",
    "rehooked:diamond_hook": "brass",
    "kubejs:pressure_seal": "airtight",
    "kubejs:rotational_compressor_core": "airtight",
    "kubejs:airtight_machine_casing": "airtight",
    "kubejs:airtight_service_module": "airtight",
    "latent_chemlib:sealed_chemical_cell": "airtight",
    "latent_chemlib:gas_reaction_chamber": "airtight",
    "kubejs:electrical_machine_casing": "electrical",
    "kubejs:electrical_instrumentation_module": "electrical",
    "powergrid:battery": "electrical",
    "powergrid:portable_battery": "electrical",
    "powergrid:electric_motor": "electrical",
    "powergrid:constant_speed_motor": "electrical",
    "powergrid:generator_housing": "electrical",
    "powergrid:generator_clutch": "electrical",
    "powergrid:relay": "electrical",
    "powergrid:relay_dpdt": "electrical",
    "powergrid:current_gauge": "electrical",
    "powergrid:voltage_gauge": "electrical",
    "powergrid:power_gauge": "electrical",
    "powergrid:device_connector": "electrical",
    "powergrid:heavy_wire_connector": "electrical",
    "powergrid:heating_coil": "electrical",
    "powergrid:carbon_pile_coil": "electrical",
    "powergrid:electromagnet": "electrical",
    "powergrid:electrical_gizmo": "electrical",
    "oc2r:raw_silicon_wafer": "electrical",
    "oc2r:silicon_wafer": "electrical",
    "oc2r:transistor": "electrical",
    "oc2r:circuit_board": "electrical",
    "oc2r:bus_cable": "electrical",
    "oc2r:network_connector": "electrical",
    "oc2r:computer": "electrical",
    "oc2r:network_hub": "electrical",
    "oc2r:disk_drive": "electrical",
    "oc2r:monitor": "electrical",
    "oc2r:charger": "electrical",
    "oc2r:bus_interface": "electrical",
    "oc2r:redstone_interface": "electrical",
    "oc2r:block_operations_module": "electrical",
    "oc2r:inventory_operations_module": "electrical",
    "oc2r:network_interface_card": "electrical",
    "oc2r:redstone_interface_card": "electrical",
    "oc2r:cpu_tier_2": "electrical",
    "oc2r:hard_drive_large": "electrical",
    "oc2r:memory_large": "electrical",
    "kubejs:space_machine_casing": "space",
    "kubejs:space_expedition_kit": "space",
    "creatingspace:mechanical_electrolyzer": "space",
    "creatingspace:air_liquefier": "space",
    "creatingspace:oxygen_sealer": "space",
    "creatingspace:rocket_engine": "space",
    "creatingspace:rocket_controls": "space",
    "creatingspace:rocket_generator": "space",
    "creatingspace:cryogenic_tank": "space",
    "creatingspace:flight_recorder": "space",
    "creatingspace:flow_meter": "space",
    "creatingspace:engine_blueprint": "space",
    "creatingspace:power_pack": "space",
    "creatingspace:exhaust_pack": "space",
    "creatingspace:copper_oxygen_backtank": "space",
    "creatingspace:netherite_oxygen_backtank": "space",
    "creatingspace:advanced_spacesuit_fabric": "space",
    "kubejs:raw_impossible_casing": "raw_impossible",
    "kubejs:raw_impossible_storage_matrix": "raw_impossible",
    "kubejs:sky_steel_ingot": "raw_impossible",
    "kubejs:sky_steel_sheet": "raw_impossible",
    "kubejs:impossible_machine_casing": "impossible",
    "kubejs:impossible_support_matrix": "impossible",
    "kubejs:ae_logic_package": "impossible",
    "ae2:controller": "impossible",
    "ae2:drive": "impossible",
    "ae2:energy_acceptor": "impossible",
    "ae2:interface": "impossible",
    "ae2:io_port": "impossible",
    "ae2:spatial_io_port": "impossible",
    "ae2:condenser": "impossible",
    "ae2:molecular_assembler": "impossible",
    "ae2:pattern_provider": "impossible",
    "ae2:cell_workbench": "impossible",
    "ae2:crafting_unit": "impossible",
    "ae2:wireless_access_point": "impossible",
    "ae2:annihilation_plane": "impossible",
    "ae2:formation_plane": "impossible",
    "ae2:pattern_encoding_terminal": "impossible",
    "buildinggadgets2:gadget_building": "impossible",
    "buildinggadgets2:gadget_exchanging": "impossible",
    "buildinggadgets2:gadget_copy_paste": "impossible",
    "buildinggadgets2:gadget_cut_paste": "impossible",
    "buildinggadgets2:gadget_destruction": "impossible",
    "buildinggadgets2:template_manager": "impossible",
    "protection_pixel:smallnetheritesheet": "impossible",
    "protection_pixel:reinforcedfiber": "impossible",
    "protection_pixel:heatresistantceramicsheet": "impossible",
    "protection_pixel:alloyarmorplate": "impossible",
    "protection_pixel:armorloadplatform": "impossible",
    "protection_pixel:powerengine": "impossible",
    "protection_pixel:heatoverlockingmechanism": "impossible",
    "protection_pixel:equipmentkit": "impossible",
    "protection_pixel:armorplatekit": "impossible",
    "protection_pixel:chestplatelining": "impossible",
    "protection_pixel:leggingslining": "impossible",
    "protection_pixel:socks_boots": "impossible",
    "protection_pixel:linkplate_helmet": "impossible",
    "protection_pixel:linkplate_chestplate": "impossible",
    "protection_pixel:linkplate_leggings": "impossible",
    "protection_pixel:linkplate_boots": "impossible",
    "create_sa:brass_drone": "impossible",
    "rehooked:blaze_hook": "electrical",
    "rehooked:ender_hook": "space",
    "rehooked:red_hook": "impossible",
}

MAGIC_EXACT = {
    "rpgstats:still_beating_heart": ("blood_root", "blood_root"),
    "kubejs:weak_blood_heart": ("blood_root", "blood_root"),
    "kubejs:apprentice_blood_heart": ("blood_root", "blood_root"),
    "kubejs:magician_blood_heart": ("blood_root", "blood_root"),
    "kubejs:master_blood_heart": ("blood_root", "blood_root"),
    "kubejs:archmage_blood_heart": ("blood_root", "blood_root"),
    "bloodmagic:weakbloodorb": ("blood_root", "blood_root"),
    "bloodmagic:apprenticebloodorb": ("blood_root", "blood_root"),
    "bloodmagic:magicianbloodorb": ("blood_root", "blood_root"),
    "bloodmagic:masterbloodorb": ("blood_root", "blood_root"),
    "bloodmagic:archmagebloodorb": ("blood_root", "blood_root"),
    "bloodmagic:blankslate": ("blood_root", "blood_root"),
    "bloodmagic:reinforcedslate": ("blood_root", "blood_root"),
    "bloodmagic:infusedslate": ("blood_root", "blood_root"),
    "bloodmagic:demonslate": ("blood_root", "blood_root"),
    "bloodmagic:etherealslate": ("blood_root", "blood_root"),
    "bloodmagic:altar": ("blood_root", "blood_root"),
    "bloodmagic:alchemytable": ("blood_root", "blood_root"),
    "malum:spirit_altar": ("slate_t1_blank", "dark"),
    "reliquary:apothecary_cauldron": ("slate_t1_blank", "dark"),
    "irons_spellbooks:magic_cloth": ("slate_t1_blank", "dark"),
    "irons_spellbooks:scroll_forge": ("slate_t2_reinforced", "light"),
    "irons_spellbooks:arcane_ingot": ("slate_t2_reinforced", "light"),
    "irons_spellbooks:blank_rune": ("slate_t2_reinforced", "light"),
    "irons_spellbooks:arcane_rune": ("slate_t3_infused", "light"),
    "irons_spellbooks:blood_rune": ("slate_t3_infused", "light"),
    "irons_spellbooks:cooldown_rune": ("slate_t3_infused", "light"),
    "irons_spellbooks:ender_rune": ("slate_t3_infused", "light"),
    "irons_spellbooks:evocation_rune": ("slate_t3_infused", "light"),
    "irons_spellbooks:fire_rune": ("slate_t3_infused", "light"),
    "irons_spellbooks:holy_rune": ("slate_t3_infused", "light"),
    "irons_spellbooks:ice_rune": ("slate_t3_infused", "light"),
    "irons_spellbooks:lightning_rune": ("slate_t3_infused", "light"),
    "irons_spellbooks:nature_rune": ("slate_t3_infused", "light"),
    "irons_spellbooks:protection_rune": ("slate_t3_infused", "light"),
    "irons_spellbooks:upgrade_orb": ("slate_t3_infused", "dark"),
    "irons_spellbooks:inscription_table": ("slate_t3_infused", "dark"),
    "irons_spellbooks:arcane_anvil": ("slate_t3_infused", "dark"),
    "irons_spellbooks:iron_spell_book": ("slate_t3_infused", "light"),
    "irons_spellbooks:gold_spell_book": ("slate_t3_infused", "light"),
    "irons_spellbooks:ice_spell_book": ("slate_t3_infused", "light"),
    "occultism:chalk_white_impure": ("slate_t3_infused", "fonts"),
    "occultism:chalk_white": ("slate_t3_infused", "fonts"),
    "eidolon:crucible": ("slate_t3_infused", "dark"),
    "eidolon:soul_enchanter": ("slate_t3_infused", "dark"),
    "mahoutsukai:attuned_diamond": ("slate_t3_infused", "dark"),
    "ars_nouveau:novice_spell_book": ("slate_t1_blank", "ars"),
    "ars_nouveau:source_gem": ("slate_t3_infused", "ars"),
    "ars_nouveau:source_gem_block": ("slate_t3_infused", "ars"),
    "ars_nouveau:imbuement_chamber": ("slate_t3_infused", "ars"),
    "ars_nouveau:enchanting_apparatus": ("slate_t4_demonic", "ars"),
    "ars_nouveau:apprentice_spell_book_upgrade": ("slate_t4_demonic", "ars"),
    "hexerei:mixing_cauldron": ("slate_t2_reinforced", "fonts"),
    "hexerei:book_of_shadows_altar": ("slate_t2_reinforced", "fonts"),
    "kubejs:manuscript_projectile": ("slate_t1_blank", "ars"),
    "kubejs:manuscript_touch": ("slate_t1_blank", "ars"),
    "kubejs:manuscript_self": ("slate_t1_blank", "ars"),
    "kubejs:manuscript_break": ("slate_t1_blank", "ars"),
    "kubejs:manuscript_light": ("slate_t1_blank", "ars"),
    "kubejs:manuscript_harm": ("slate_t2_reinforced", "ars"),
    "kubejs:manuscript_interact": ("slate_t2_reinforced", "ars"),
    "kubejs:manuscript_ignite": ("slate_t2_reinforced", "ars"),
    "kubejs:manuscript_launch": ("slate_t2_reinforced", "ars"),
    "kubejs:manuscript_harvest": ("slate_t2_reinforced", "ars"),
    "kubejs:manuscript_leap": ("slate_t2_reinforced", "ars"),
    "kubejs:manuscript_freeze": ("slate_t3_infused", "ars"),
    "kubejs:manuscript_glide": ("slate_t3_infused", "ars"),
    "kubejs:manuscript_blink": ("slate_t3_infused", "ars"),
    "kubejs:manuscript_extract": ("slate_t3_infused", "ars"),
    "kubejs:manuscript_exchange": ("slate_t3_infused", "ars"),
    "kubejs:manuscript_redstone_signal": ("slate_t3_infused", "ars"),
    "kubejs:manuscript_extend_time": ("slate_t3_infused", "ars"),
    "kubejs:manuscript_wall": ("slate_t4_demonic", "ars"),
    "kubejs:manuscript_linger": ("slate_t4_demonic", "ars"),
    "kubejs:manuscript_lightning": ("slate_t4_demonic", "ars"),
    "kubejs:manuscript_wither": ("slate_t4_demonic", "ars"),
    "goety:cursed_cage": ("slate_t4_demonic", "dark"),
    "goety:dark_altar": ("slate_t4_demonic", "dark"),
    "goety:empty_focus": ("slate_t4_demonic", "dark"),
    "goety:focus_bag": ("slate_t4_demonic", "dark"),
    "goety:focus_pack": ("slate_t4_demonic", "dark"),
    "forbidden_arcanus:clibano_core": ("slate_t4_demonic", "dark"),
    "forbidden_arcanus:deorum_ingot": ("slate_t4_demonic", "dark"),
    "reliquary:alkahestry_altar": ("slate_t4_demonic", "dark"),
    "occultism:dimensional_mineshaft": ("slate_t4_demonic", "dark"),
    "occultism:chalk_gold": ("slate_t4_demonic", "dark"),
    "irons_spellbooks:mithril_weave": ("slate_t4_demonic", "dark"),
    "irons_spellbooks:blood_upgrade_orb": ("slate_t4_demonic", "dark"),
    "irons_spellbooks:cooldown_upgrade_orb": ("slate_t4_demonic", "dark"),
    "irons_spellbooks:ender_upgrade_orb": ("slate_t4_demonic", "dark"),
    "irons_spellbooks:evocation_upgrade_orb": ("slate_t4_demonic", "dark"),
    "irons_spellbooks:fire_upgrade_orb": ("slate_t4_demonic", "dark"),
    "irons_spellbooks:holy_upgrade_orb": ("slate_t4_demonic", "dark"),
    "irons_spellbooks:ice_upgrade_orb": ("slate_t4_demonic", "dark"),
    "irons_spellbooks:lightning_upgrade_orb": ("slate_t4_demonic", "dark"),
    "irons_spellbooks:nature_upgrade_orb": ("slate_t4_demonic", "dark"),
    "irons_spellbooks:protection_upgrade_orb": ("slate_t4_demonic", "dark"),
    "irons_spellbooks:mana_upgrade_orb": ("slate_t4_demonic", "dark"),
    "irons_spellbooks:diamond_spell_book": ("slate_t4_demonic", "light"),
    "irons_spellbooks:druidic_spell_book": ("slate_t4_demonic", "light"),
    "irons_spellbooks:cursed_doll_spell_book": ("slate_t4_demonic", "dark"),
    "irons_spellbooks:pyrium_staff": ("slate_t4_demonic", "dark"),
    "irons_spellbooks:artificer_cane": ("slate_t4_demonic", "dark"),
    "irons_spellbooks:spellbreaker": ("slate_t4_demonic", "dark"),
    "irons_spellbooks:twilight_gale": ("slate_t4_demonic", "dark"),
    "kubejs:purified_blood_catalyst": ("slate_t5_ethereal", "hybrid"),
    "kubejs:living_binding": ("slate_t5_ethereal", "hybrid"),
    "kubejs:purified_source_core": ("slate_t5_ethereal", "hybrid"),
    "tomeofblood:novice_tome_of_blood": ("slate_t5_ethereal", "hybrid"),
    "tomeofblood:apprentice_tome_of_blood": ("slate_t5_ethereal", "hybrid"),
    "tomeofblood:archmage_tome_of_blood": ("slate_t5_ethereal", "hybrid"),
    "tomeofblood:glyph_sentient_harm": ("slate_t5_ethereal", "hybrid"),
    "tomeofblood:glyph_sentient_wrath": ("slate_t5_ethereal", "hybrid"),
    "tomeofblood:living_mage_hood": ("slate_t5_ethereal", "hybrid"),
    "tomeofblood:living_mage_robes": ("slate_t5_ethereal", "hybrid"),
    "tomeofblood:living_mage_leggings": ("slate_t5_ethereal", "hybrid"),
    "tomeofblood:living_mage_boots": ("slate_t5_ethereal", "hybrid"),
    "reliquary:alkahestry_tome": ("slate_t5_ethereal", "hybrid"),
    "ars_nouveau:archmage_spell_book_upgrade": ("slate_t5_ethereal", "hybrid"),
    "arseng:me_source_jar": ("slate_t5_ethereal", "hybrid"),
    "arseng:source_acceptor": ("slate_t5_ethereal", "hybrid"),
    "arseng:source_cell_housing": ("slate_t5_ethereal", "hybrid"),
    "arseng:portable_source_cell_64k": ("slate_t5_ethereal", "hybrid"),
    "arseng:portable_source_cell_256k": ("slate_t5_ethereal", "hybrid"),
    "irons_spellbooks:netherite_spell_book": ("slate_t5_ethereal", "hybrid"),
    "irons_spellbooks:dragonskin_spell_book": ("slate_t5_ethereal", "hybrid"),
    "irons_spellbooks:eldritch_manuscript": ("slate_t5_ethereal", "hybrid"),
}

TECH_ASSERTIONS = [
    ("kubejs:seared_machine_casing", "seared"),
    ("tconstruct:smeltery_controller", "seared"),
    ("create:basin", "seared"),
    ("create:andesite_alloy", "andesite"),
    ("kubejs:andesite_machine_casing", "andesite"),
    ("morered:red_alloy_wire", "andesite"),
    ("create:precision_mechanism", "brass"),
    ("kubejs:brass_machine_casing", "brass"),
    ("hangglider:hang_glider", "brass"),
    ("kubejs:airtight_machine_casing", "airtight"),
    ("pneumaticcraft:reinforced_pressure_tube", "airtight"),
    ("kubejs:electrical_machine_casing", "electrical"),
    ("powergrid:battery", "electrical"),
    ("oc2r:computer", "electrical"),
    ("kubejs:space_machine_casing", "space"),
    ("creatingspace:rocket_engine", "space"),
    ("kubejs:raw_impossible_casing", "raw_impossible"),
    ("ae2:item_cell_housing", "raw_impossible"),
    ("kubejs:impossible_machine_casing", "impossible"),
    ("ae2:controller", "impossible"),
    ("buildinggadgets2:gadget_building", "impossible"),
    ("protection_pixel:powerengine", "impossible"),
]

MAGIC_ASSERTIONS = [
    ("bloodmagic:weakbloodorb", "blood_root", "blood_root"),
    ("bloodmagic:etherealslate", "blood_root", "blood_root"),
    ("malum:spirit_altar", "slate_t1_blank", "dark"),
    ("occultism:chalk_white_impure", "slate_t3_infused", "fonts"),
    ("eidolon:crucible", "slate_t3_infused", "dark"),
    ("ars_nouveau:novice_spell_book", "slate_t1_blank", "ars"),
    ("ars_nouveau:source_gem", "slate_t3_infused", "ars"),
    ("ars_nouveau:enchanting_apparatus", "slate_t4_demonic", "ars"),
    ("hexerei:mixing_cauldron", "slate_t2_reinforced", "fonts"),
    ("goety:dark_altar", "slate_t4_demonic", "dark"),
    ("forbidden_arcanus:deorum_ingot", "slate_t4_demonic", "dark"),
    ("irons_spellbooks:mithril_weave", "slate_t4_demonic", "dark"),
    ("kubejs:purified_blood_catalyst", "slate_t5_ethereal", "hybrid"),
    ("arseng:me_source_jar", "slate_t5_ethereal", "hybrid"),
]


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def write_json(path: Path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, sort_keys=False)
        fh.write("\n")


def ns(item: str) -> str:
    return item.split(":", 1)[0] if ":" in item else "minecraft"


def local(item: str) -> str:
    return item.split(":", 1)[1] if ":" in item else item


def looks_item(value) -> bool:
    return isinstance(value, str) and ":" in value and not value.startswith("#")


def extract_outputs(node, key_hint=""):
    outputs = []
    if isinstance(node, dict):
        for key, value in node.items():
            lowered = key.lower()
            if lowered in {"result", "results", "output", "outputs"}:
                outputs.extend(extract_outputs(value, lowered))
            elif lowered in {"item", "id", "name"} and looks_item(value) and any(
                hint in key_hint for hint in ("result", "output")
            ):
                outputs.append(value)
            else:
                outputs.extend(extract_outputs(value, lowered))
    elif isinstance(node, list):
        for value in node:
            outputs.extend(extract_outputs(value, key_hint))
    elif looks_item(node) and any(hint in key_hint for hint in ("result", "output")):
        outputs.append(node)
    return sorted(set(outputs))


def normalize_surface(recipe_type: str) -> str:
    return recipe_type


def infer_kind(recipe_type: str) -> str:
    if recipe_type.startswith("kubejs:"):
        return "crafted"
    return "crafted" if recipe_type in VANILLA_CRAFTED else "machine_output"


def is_decor(item: str) -> bool:
    name = local(item)
    decor_tokens = [
        "slab",
        "stairs",
        "wall",
        "bricks",
        "brick",
        "tile",
        "window",
        "pane",
        "beam",
        "catwalk",
        "scaffold",
        "fence",
        "door",
        "trapdoor",
        "shingle",
        "ornate",
        "plating",
        "pillar",
        "trim",
        "arch",
        "cornice",
        "placard",
        "lamp",
        "sheet_metal",
        "railing",
        "bars",
        "seat",
        "table",
        "post",
        "sign",
        "banner",
        "chiseled",
        "polished",
        "mossy",
        "cracked",
        "cut_",
    ]
    if ns(item) == "createdeco" and item not in COIN_SET:
        return True
    return any(token in name for token in decor_tokens)


def is_structural(item: str) -> bool:
    name = local(item)
    structural_tokens = [
        "casing",
        "controller",
        "machine",
        "motor",
        "engine",
        "generator",
        "battery",
        "reactor",
        "chamber",
        "assembly",
        "crafter",
        "altar",
        "apparatus",
        "mixer",
        "refinery",
        "station",
        "workbench",
        "terminal",
        "interface",
        "hub",
        "port",
        "connector",
        "spreader",
        "daisy",
        "forge",
        "cauldron",
        "cage",
        "sealer",
        "electrolyzer",
        "liquefier",
        "drive",
        "provider",
        "assembler",
        "plane",
        "cell_workbench",
    ]
    if item in TECH_EXACT_ERA or item in MAGIC_EXACT:
        return True
    return any(token in name for token in structural_tokens)


def tech_weight(item: str) -> str:
    if is_decor(item):
        return "decor_theme"
    if is_structural(item):
        return "structural_progression"
    return "utility_support"


def magic_weight(item: str) -> str:
    if is_decor(item):
        return "decor_theme"
    if is_structural(item):
        return "structural_progression"
    return "utility_support"


def infer_create_era(item: str) -> str:
    name = local(item)
    if item in TECH_EXACT_ERA:
        return TECH_EXACT_ERA[item]
    brass_tokens = [
        "precision_mechanism",
        "brass_",
        "steam_engine",
        "rotation_speed_controller",
        "mechanical_arm",
        "stock",
        "track_",
        "controller_rail",
        "portable_",
        "display_",
        "clipboard",
        "backtank",
        "diving",
        "burner",
        "packager",
        "redstone_link",
    ]
    if any(token in name for token in brass_tokens):
        return "brass"
    if name in {"basin", "depot", "chute", "fluid_tank", "item_drain", "spout", "andesite_funnel", "andesite_tunnel"}:
        return "seared"
    return "andesite"


def infer_tech_parent(item: str):
    item_ns = ns(item)
    name = local(item)
    if item in TECH_EXACT_ERA:
        return TECH_EXACT_ERA[item], f"exact:{TECH_EXACT_ERA[item]}"
    if item_ns in SURVIVAL_NAMESPACES:
        return "survival", f"namespace:{item_ns}"
    if item_ns in DIMENSION_NAMESPACES:
        return "space", f"dimension_namespace:{item_ns}"
    if item_ns == "tconstruct":
        return "seared", "namespace:tconstruct"
    if item_ns == "create":
        return infer_create_era(item), "namespace:create"
    if item_ns in {"morered", "buildingwand", "building-wands", "sophisticatedstorage", "sophisticatedbackpacks"}:
        return "andesite", f"namespace:{item_ns}"
    if item_ns in {"createdeco", "create_connected", "createadditionallogistics", "createadvlogistics", "createdieselgenerators", "immersive_aircraft", "hang_glider"}:
        return "brass", f"namespace:{item_ns}"
    if item_ns in {"pneumaticcraft", "heatsync", "latent_chemlib", "forgeendertech", "adpother", "pollution_of_the_realms", "pollution-of-the-realms"}:
        return "airtight", f"namespace:{item_ns}"
    if item_ns in {"powergrid", "power_grid", "oc2r", "oc2rwireless", "computerbridge", "k_turrets"}:
        return "electrical", f"namespace:{item_ns}"
    if item_ns in {"creatingspace", "create_jetpack", "create_air"}:
        return "space", f"namespace:{item_ns}"
    if item_ns in {"ae2additions"}:
        return "raw_impossible", f"namespace:{item_ns}"
    if item_ns in {"ae2", "advanced_ae", "expatternprovider", "merequester", "createappliedkinetics"}:
        if any(token in name for token in ["cell_component_64k", "cell_component_256k", "spatial_cell_component", "item_cell_housing", "fluid_cell_housing", "sky_steel"]):
            return "raw_impossible", f"namespace:{item_ns}"
        return "impossible", f"namespace:{item_ns}"
    if item_ns == "protection_pixel":
        return "impossible", "namespace:protection_pixel"
    if item_ns == "create_sa":
        return "impossible", "namespace:create_sa"
    if item_ns == "rehooked":
        if "wood" in name:
            return "seared", "namespace:rehooked"
        if "iron" in name:
            return "andesite", "namespace:rehooked"
        if "diamond" in name:
            return "brass", "namespace:rehooked"
        if "blaze" in name:
            return "electrical", "namespace:rehooked"
        if "ender" in name:
            return "space", "namespace:rehooked"
        if "red" in name:
            return "impossible", "namespace:rehooked"
    if item_ns == "chemlib":
        return "airtight", "namespace:chemlib"
    if item_ns == "wares":
        return "brass", "namespace:wares"
    return "survival", f"default:{item_ns}"


def infer_magic_parent(item: str):
    if item in MAGIC_EXACT:
        era, branch = MAGIC_EXACT[item]
        return era, branch, f"exact:{era}/{branch}"
    item_ns = ns(item)
    name = local(item)
    if item_ns == "bloodmagic":
        return "blood_root", "blood_root", "namespace:bloodmagic"
    if item_ns == "malum":
        return "slate_t1_blank", "dark", "namespace:malum"
    if item_ns == "occultism":
        if "dimensional_mineshaft" in name or "ritual" in name:
            return "slate_t4_demonic", "fonts", "namespace:occultism"
        return "slate_t3_infused", "fonts", "namespace:occultism"
    if item_ns in {"eidolon", "mahoutsukai"}:
        return "slate_t3_infused", "dark", f"namespace:{item_ns}"
    if item_ns.startswith("ars_") or item_ns == "ars_nouveau":
        return "slate_t4_demonic", "ars", f"namespace:{item_ns}"
    if item_ns == "hexerei":
        return "slate_t2_reinforced", "fonts", "namespace:hexerei"
    if item_ns == "goety":
        return "slate_t4_demonic", "dark", "namespace:goety"
    if item_ns == "forbidden_arcanus":
        return "slate_t4_demonic", "dark", "namespace:forbidden_arcanus"
    if item_ns == "reliquary":
        if "alkahestry" in name:
            return "slate_t4_demonic", "dark", "namespace:reliquary"
        return "slate_t1_blank", "dark", "namespace:reliquary"
    if item_ns == "irons_spellbooks":
        if name == "magic_cloth":
            return "slate_t1_blank", "dark", "namespace:irons_spellbooks"
        if name in {"scroll_forge", "arcane_ingot", "blank_rune"}:
            return "slate_t2_reinforced", "light", "namespace:irons_spellbooks"
        if "mithril_weave" in name or "upgrade_orb" in name:
            return "slate_t4_demonic", "dark", "namespace:irons_spellbooks"
        return "slate_t3_infused", "light", "namespace:irons_spellbooks"
    if item_ns in {"tomeofblood", "arseng"}:
        return "slate_t5_ethereal", "hybrid", f"namespace:{item_ns}"
    return "blood_root", "blood_root", f"default:{item_ns}"


def load_recipe_rows():
    manifest_path = RUNTIME_DUMP / "full_recipe_index_manifest.json"
    manifest = load_json(manifest_path)
    rows = []
    for idx in range(manifest["chunkCount"]):
        chunk = RUNTIME_DUMP / f"full_recipe_index_{idx:04d}.json"
        if not chunk.exists():
            continue
        for recipe in load_json(chunk)["recipes"]:
            try:
                parsed = json.loads(recipe["json"])
            except Exception:
                parsed = None
            rows.append(
                {
                    "id": recipe.get("id"),
                    "type": recipe.get("type"),
                    "namespace": recipe.get("namespace"),
                    "parsed": parsed,
                }
            )
    return rows


def build_recipe_indexes(recipe_rows):
    recipe_index = defaultdict(list)
    surface_types = set()
    for recipe in recipe_rows:
        if not recipe["parsed"]:
            continue
        surface = normalize_surface(recipe["type"])
        surface_types.add(surface)
        outputs = extract_outputs(recipe["parsed"])
        for output in outputs:
            recipe_index[(surface, output)].append(recipe["id"])
    return recipe_index, sorted(surface_types)


def recipe_id_to_output(recipe_id: str) -> str:
    overrides = {
        "occultism:crafting/chalk_white_impure": "occultism:chalk_white_impure",
        "occultism:ritual/craft_dimensional_mineshaft": "occultism:dimensional_mineshaft",
    }
    if recipe_id in overrides:
        return overrides[recipe_id]
    namespace = ns(recipe_id)
    name = local(recipe_id).split("/")[-1]
    if name.startswith("craft_"):
        name = name[len("craft_") :]
    return f"{namespace}:{name}"


def authored_row(output: str, surface: str, evidence: list[str]):
    return {
        "surface": surface,
        "output": output,
        "evidence": evidence[:5],
    }


def parse_js_string_arrays(text: str, var_name: str):
    match = re.search(rf"var {re.escape(var_name)} = \[(.*?)\n\]", text, re.S)
    if not match:
        return []
    return re.findall(r"'([a-z0-9_.-]+:[a-z0-9_./-]+)'", match.group(1))


def parse_authored_kubejs_surfaces():
    rows_by_key = {}
    output_arg1 = re.compile(
        r"\b(?:btmEcoRecipe|btmCreateShaped|btmMobilityMechanical|btmDimProofMechanical|"
        r"btmPpMechanical|btmBpRecipe|btmExtremeRecipe|btmTobAlchemy|btmTobGlyph|btmTobArmor|"
        r"btmClosureShaped|btmClosureShapeless|btmGraphShaped)"
        r"\(event,\s*'([a-z0-9_.-]+:[a-z0-9_./-]+)'"
    )
    output_arg0 = re.compile(r"\bbtmEcoRecipe\(\s*'([a-z0-9_.-]+:[a-z0-9_./-]+)'")
    output_arg2 = re.compile(
        r"\b(?:btmIrons[A-Za-z]+|btmLate[A-Za-z]+|btmChem(?:Alt|Use)[A-Za-z]+|btmPpSequence|"
        r"btmAesthetic[A-Za-z]+|btmArs[A-Za-z]+)\(event,\s*'[^']+'\s*,\s*'([a-z0-9_.-]+:[a-z0-9_./-]+)'"
    )
    custom_output = re.compile(r"\boutput:\s*(?:btmIronsResult\()?['{ ]*(?:item:\s*)?'([a-z0-9_.-]+:[a-z0-9_./-]+)'")
    gate_output = re.compile(r"gate\(event,\s*\{\s*output:\s*'([a-z0-9_.-]+:[a-z0-9_./-]+)'")
    gate_id = re.compile(r"gate\(event,\s*\{\s*id:\s*'([a-z0-9_.-]+:[a-z0-9_./-]+)'")

    for path in sorted((ROOT / "kubejs" / "server_scripts").glob("**/*.js")):
        rel = path.relative_to(ROOT).as_posix()
        text = path.read_text(encoding="utf-8")
        for line_no, line in enumerate(text.splitlines(), start=1):
            evidence = [f"{rel}:{line_no}"]
            for pattern, surface in [
                (output_arg0, "kubejs:authored_recipe"),
                (output_arg1, "kubejs:authored_recipe"),
                (output_arg2, "kubejs:authored_recipe"),
                (custom_output, "event.custom(kubejs)"),
                (gate_output, "kubejs:replace_input_gate"),
            ]:
                for output in pattern.findall(line):
                    rows_by_key[(surface, output)] = authored_row(output, surface, evidence)
            for recipe_id in gate_id.findall(line):
                output = recipe_id_to_output(recipe_id)
                rows_by_key[("kubejs:replace_input_gate", output)] = authored_row(
                    output, "kubejs:replace_input_gate", evidence
                )

        if path.name == "126_cross_magic_irons_spellcraft.js":
            for output in parse_js_string_arrays(text, "BTM_IRONS_SPELLCRAFT_OUTPUTS"):
                rows_by_key[("kubejs:authored_recipe", output)] = authored_row(
                    output, "kubejs:authored_recipe", [rel]
                )
            for rune_id, output in re.findall(
                r"\{\s*id:\s*'([a-z0-9_]+)'\s*,\s*output:\s*'([a-z0-9_.-]+:[a-z0-9_./-]+)'",
                text,
            ):
                rows_by_key[("kubejs:authored_recipe", output)] = authored_row(
                    output, "kubejs:authored_recipe", [rel]
                )
                upgrade = f"irons_spellbooks:{rune_id}_upgrade_orb"
                rows_by_key[("kubejs:authored_recipe", upgrade)] = authored_row(
                    upgrade, "kubejs:authored_recipe", [rel]
                )

    return list(rows_by_key.values())


def add_authored_script_entries(tech_entries, magic_entries, recipe_index):
    existing = set(recipe_index.keys())
    existing.update((entry["surface_type"], entry["output"]) for entry in tech_entries)
    existing.update((entry["surface_type"], entry["output"]) for entry in magic_entries)
    for row in parse_authored_kubejs_surfaces():
        key = (row["surface"], row["output"])
        if key in existing:
            continue
        output = row["output"]
        entry = {
            "id": f"{infer_kind(row['surface'])}:{row['surface']}:{output}",
            "kind": infer_kind(row["surface"]),
            "mod": ns(output),
            "output": output,
            "authority": "",
            "surface_type": row["surface"],
            "evidence": row["evidence"],
        }
        if ns(output) in MAGIC_NAMESPACES or output in MAGIC_EXACT:
            era, branch, authority = infer_magic_parent(output)
            entry.update(
                {
                    "blood_era": era,
                    "branch": branch,
                    "weight_class": magic_weight(output),
                    "authority": authority,
                }
            )
            magic_entries.append(entry)
        else:
            era, authority = infer_tech_parent(output)
            entry.update(
                {
                    "era": era,
                    "weight_class": tech_weight(output),
                    "authority": authority,
                }
            )
            tech_entries.append(entry)
        existing.add(key)


def add_synthetic_core_entries(tech_entries, magic_entries):
    existing_tech = {entry["output"] for entry in tech_entries}
    existing_magic = {entry["output"] for entry in magic_entries}
    for output, era in sorted(TECH_EXACT_ERA.items()):
        if output in existing_tech or output in existing_magic:
            continue
        tech_entries.append(
            {
                "id": f"crafted:event.custom(kubejs):{output}",
                "kind": "crafted",
                "mod": ns(output),
                "output": output,
                "era": era,
                "weight_class": tech_weight(output),
                "authority": f"synthetic_exact:{era}",
                "surface_type": "event.custom(kubejs)",
                "evidence": ["kubejs/config/player_progression_regression.json"],
            }
        )
    for output, (era, branch) in sorted(MAGIC_EXACT.items()):
        if output in existing_magic or output in existing_tech:
            continue
        magic_entries.append(
            {
                "id": f"crafted:event.custom(kubejs):{output}",
                "kind": "crafted",
                "mod": ns(output),
                "output": output,
                "blood_era": era,
                "branch": branch,
                "weight_class": magic_weight(output),
                "authority": f"synthetic_exact:{era}/{branch}",
                "surface_type": "event.custom(kubejs)",
                "evidence": ["kubejs/config/player_progression_regression.json"],
            }
        )


def classify_recipe_entries(recipe_index):
    tech_entries = []
    magic_entries = []
    for (surface, output), evidence in sorted(recipe_index.items()):
        entry = {
            "id": f"{infer_kind(surface)}:{surface}:{output}",
            "kind": infer_kind(surface),
            "mod": ns(output),
            "output": output,
            "authority": "",
            "surface_type": surface,
            "evidence": evidence[:5],
        }
        if ns(output) in MAGIC_NAMESPACES or output in MAGIC_EXACT:
            era, branch, authority = infer_magic_parent(output)
            entry.update(
                {
                    "blood_era": era,
                    "branch": branch,
                    "weight_class": magic_weight(output),
                    "authority": authority,
                }
            )
            magic_entries.append(entry)
        else:
            era, authority = infer_tech_parent(output)
            entry.update(
                {
                    "era": era,
                    "weight_class": tech_weight(output),
                    "authority": authority,
                }
            )
            tech_entries.append(entry)
    return tech_entries, magic_entries


def parse_villager_trade_items():
    path = ROOT / "kubejs" / "server_scripts" / "35_villager_trades" / "10_coin_villager_trades.js"
    text = path.read_text(encoding="utf-8")
    sections = {
        "BTM_30_ITEMS": ("villager_trade", "survival"),
        "BTM_INDUSTRIAL_IRON_MARKET": ("villager_trade", "andesite"),
        "BTM_GOLD_MARKET": ("villager_trade", "brass"),
        "BTM_PLATINUM_MARKET": ("villager_trade", "impossible"),
        "BTM_WANDERER_MARKET": ("wanderer_trade", "survival"),
    }
    coin_stage = {
        "copper": "survival",
        "zinc": "survival",
        "iron": "seared",
        "industrial_iron": "andesite",
        "brass": "brass",
        "gold": "space",
        "platinum": "impossible",
    }
    items = []
    for section, (source, stage) in sections.items():
        match = re.search(rf"var {re.escape(section)} = \[(.*?)\n\]", text, re.S)
        if not match:
            continue
        body = match.group(1)
        base_line = text[: match.start(1)].count("\n") + 1
        for offset, line in enumerate(body.splitlines(), start=0):
            line_no = base_line + offset
            if section == "BTM_30_ITEMS":
                m = re.search(r"\[\s*'([a-z0-9_.-]+:[a-z0-9_./-]+)'\s*,", line)
            else:
                m = re.search(r"\[[^\]]*'([a-z0-9_.-]+:[a-z0-9_./-]+)'\s*,\s*\d+\s*,\s*\d+\s*\]?\s*,?\s*$", line)
                if not m:
                    m = re.search(r"\[[^,\n]+,\s*'[^']+',\s*[^,\n]+,\s*'([a-z0-9_.-]+:[a-z0-9_./-]+)'", line)
            if not m:
                continue
            item = m.group(1)
            if item in COIN_SET:
                continue
            line_stage = stage
            coin_match = re.search(r"\[\s*\d+\s*,\s*'([a-z_]+)'\s*,", line)
            if coin_match:
                line_stage = coin_stage.get(coin_match.group(1), stage)
            items.append(
                {
                    "id": f"{source}:{section}:{item}:{line_no}",
                    "source": source,
                    "output": item,
                    "source_stage": line_stage,
                    "evidence": [f"kubejs/server_scripts/35_villager_trades/10_coin_villager_trades.js:{line_no}"],
                }
            )
    return items


def parse_loot_tables():
    entries = []
    for path_str in sorted(glob.glob(str(ROOT / "kubejs" / "data" / "**" / "loot_tables" / "**" / "*.json"), recursive=True)):
        path = Path(path_str)
        rel = path.relative_to(ROOT).as_posix()
        try:
            data = load_json(path)
        except Exception:
            continue
        items = sorted(set(re.findall(r'"(?:name|item)"\s*:\s*"([a-z0-9_.-]+:[a-z0-9_./-]+)"', json.dumps(data))))
        for item in items:
            entries.append(
                {
                    "id": f"loot:{rel}:{item}",
                    "source": "loot",
                    "output": item,
                    "evidence": [rel],
                }
            )
    return entries


def parse_wares():
    entries = []
    for path_str in sorted(glob.glob(str(ROOT / "kubejs" / "data" / "wares" / "loot_tables" / "**" / "*.json"), recursive=True)):
        path = Path(path_str)
        rel = path.relative_to(ROOT).as_posix()
        data = load_json(path)
        items = sorted(set(re.findall(r'"(?:name|item)"\s*:\s*"([a-z0-9_.-]+:[a-z0-9_./-]+)"', json.dumps(data))))
        for item in items:
            entries.append(
                {
                    "id": f"wares:{rel}:{item}",
                    "source": "wares",
                    "output": item,
                    "evidence": [rel],
                }
            )
    return entries


def parse_quest_rewards():
    entries = []
    for path_str in sorted(glob.glob(str(ROOT / "config" / "ftbquests" / "quests" / "chapters" / "*.snbt"))):
        path = Path(path_str)
        rel = path.relative_to(ROOT).as_posix()
        text = path.read_text(encoding="utf-8")
        for item in sorted(set(re.findall(r'item:"([a-z0-9_.-]+:[a-z0-9_./-]+)"', text))):
            entries.append(
                {
                    "id": f"quest_reward:{rel}:{item}",
                    "source": "quest_reward",
                    "output": item,
                    "evidence": [rel],
                }
            )
    return entries


def parse_font_rewards():
    entries = []
    rewards_root = ROOT / "generated" / "custom-mod-sources" / "dimensional-fonts" / "src" / "main" / "resources" / "defaults" / "rewards"
    if not rewards_root.exists():
        return entries
    for path in sorted(rewards_root.glob("*.json")):
        rel = path.relative_to(ROOT).as_posix()
        data = load_json(path)
        kill_currency = (data.get("killCurrency") or {}).get("item")
        if kill_currency:
            entries.append(
                {
                    "id": f"font_payout:{path.stem}:{kill_currency}",
                    "source": "font_payout",
                    "output": kill_currency,
                    "evidence": [rel],
                }
            )
        for pool in data.get("pools", []):
            for reward in pool.get("entries", []):
                item = reward.get("item")
                if looks_item(item):
                    entries.append(
                        {
                            "id": f"font_payout:{path.stem}:{item}",
                            "source": "font_payout",
                            "output": item,
                            "evidence": [rel],
                        }
                    )
    return entries


def parse_dimension_access():
    entries = []
    for path_str in sorted(glob.glob(str(ROOT / "config" / "obelisks" / "obelisks" / "*.json"))):
        path = Path(path_str)
        rel = path.relative_to(ROOT).as_posix()
        data = load_json(path)
        target = data.get("targetDimension")
        if looks_item(target):
            # Dimension ids are not items; this guard intentionally ignores them.
            pass
        if isinstance(target, str) and ":" in target:
            entries.append(
                {
                    "id": f"dimension_access:{target}",
                    "kind": "dimension_access",
                    "mod": target.split(":", 1)[0],
                    "output": target,
                    "era": "space" if target not in {"minecraft:the_nether"} else "seared",
                    "weight_class": "utility_support",
                    "authority": "obelisk_route",
                    "surface_type": "dimension_access",
                    "evidence": [rel],
                }
            )
    rocket_root = ROOT / "kubejs" / "data" / "creatingspace" / "creatingspace" / "rocket_accessible_dimension"
    if rocket_root.exists():
        for path in sorted(rocket_root.glob("*.json")):
            rel = path.relative_to(ROOT).as_posix()
            data = load_json(path)
            for target in data.get("dimensions", []):
                if isinstance(target, str) and ":" in target:
                    entries.append(
                        {
                            "id": f"dimension_access:{target}",
                            "kind": "dimension_access",
                            "mod": target.split(":", 1)[0],
                            "output": target,
                            "era": "space",
                            "weight_class": "utility_support",
                            "authority": "rocket_route",
                            "surface_type": "dimension_access",
                            "evidence": [rel],
                        }
                    )
    return entries


def tech_index(era: str) -> int:
    return TECH_ORDER.index(era) if era in TECH_ORDER else -1


def infer_economy_policy(row: dict, tech_lookup: dict, magic_lookup: dict) -> str:
    output = row["output"]
    if output in COIN_SET:
        return "currency_only"
    name = local(output)
    source_stage = row.get("source_stage")
    source_stage_index = tech_index(source_stage) if source_stage else -1
    if any(token in name for token in ["sword", "pickaxe", "axe", "shovel", "hoe", "bow", "crossbow", "knife", "helmet", "chestplate", "leggings", "boots", "shield"]):
        return "finished_gear_allowed"
    if any(token in name for token in ["meal", "stew", "soup", "bread", "pie", "juice", "tea", "coffee", "potion", "waterskin", "canteen", "rope", "glider", "boat", "minecart", "saddle", "bundle"]):
        return "support_only"
    tech = tech_lookup.get(output)
    magic = magic_lookup.get(output)
    if tech and source_stage_index >= tech_index(tech["era"]):
        return "support_only" if tech["weight_class"] != "decor_theme" else "support_only"
    if (tech and tech["weight_class"] == "structural_progression") or (magic and magic["weight_class"] == "structural_progression"):
        return "production_blocked"
    if any(token in name for token in ["casing", "controller", "machine", "altar", "apparatus", "generator", "motor", "drive", "workbench", "assembly", "spawner", "packager", "interface", "hub", "connector"]):
        return "production_blocked"
    return "support_only"


def build_contracts():
    recipe_rows = load_recipe_rows()
    recipe_index, surface_types = build_recipe_indexes(recipe_rows)
    tech_entries, magic_entries = classify_recipe_entries(recipe_index)
    add_authored_script_entries(tech_entries, magic_entries, recipe_index)
    tech_entries.extend(parse_dimension_access())
    add_synthetic_core_entries(tech_entries, magic_entries)

    tech_lookup = {}
    for entry in tech_entries:
        tech_lookup.setdefault(entry["output"], entry)
    magic_lookup = {}
    for entry in magic_entries:
        magic_lookup.setdefault(entry["output"], entry)

    economy_sources = []
    economy_sources.extend(parse_villager_trade_items())
    economy_sources.extend(parse_wares())
    economy_sources.extend(parse_loot_tables())
    economy_sources.extend(parse_quest_rewards())
    economy_sources.extend(parse_font_rewards())

    economy_entries = []
    for row in economy_sources:
        output = row["output"]
        era_ref = None
        if output in tech_lookup:
            era_ref = {"contract": "tech_parenting", "output": output, "era": tech_lookup[output]["era"]}
        elif output in magic_lookup:
            era_ref = {
                "contract": "magic_parenting",
                "output": output,
                "blood_era": magic_lookup[output]["blood_era"],
                "branch": magic_lookup[output]["branch"],
            }
        economy_entries.append(
            {
                "id": row["id"],
                "source": row["source"],
                "output": output,
                "policy": infer_economy_policy(row, tech_lookup, magic_lookup),
                "era_reference": era_ref,
                "evidence": row["evidence"],
            }
        )

    surface_registry = {
        "schema": "btm.surface_registry.v1",
        "description": "Authoritative registry of sanctioned crafting and acquisition surfaces.",
        "recipe_surface_types": sorted(
            surface_types + ["dimension_access", "event.custom(kubejs)", "kubejs:authored_recipe", "kubejs:replace_input_gate"]
        ),
        "acquisition_surface_types": [
            "villager_trade",
            "wanderer_trade",
            "wares",
            "loot",
            "quest_reward",
            "font_payout",
        ],
        "notes": {
            "vanilla_core": [
                "minecraft:crafting_shaped",
                "minecraft:crafting_shapeless",
                "minecraft:smithing_transform",
                "minecraft:smelting",
                "minecraft:blasting",
                "minecraft:smoking",
                "minecraft:campfire_cooking",
                "minecraft:stonecutting",
            ],
            "create_core": [
                "create:mechanical_crafting",
                "create:compacting",
                "create:mixing",
                "create:crushing",
                "create:cutting",
                "create:deploying",
                "create:filling",
                "create:emptying",
                "create:splashing",
                "create:haunting",
                "create:milling",
                "create:pressing",
                "create:sandpaper_polishing",
                "create:sequenced_assembly",
            ],
            "ars_core": [
                "ars_nouveau:enchanting_apparatus",
                "ars_nouveau:imbuement",
                "ars_nouveau:glyph",
                "ars_nouveau:crush",
            ],
        },
    }

    tech_contract = {
        "schema": "btm.tech_parenting.v1",
        "description": "Authoritative tech-era parenting for non-magic craftables and route surfaces.",
        "entries": sorted(tech_entries, key=lambda entry: (entry["output"], entry["surface_type"], entry["kind"])),
    }
    magic_contract = {
        "schema": "btm.magic_parenting.v1",
        "description": "Authoritative Blood-parented magic progression for magic craftables and route surfaces.",
        "entries": sorted(magic_entries, key=lambda entry: (entry["output"], entry["surface_type"], entry["kind"])),
    }
    economy_contract = {
        "schema": "btm.economy_acquisition.v1",
        "description": "Authoritative economy and reward-surface acquisition policy.",
        "entries": sorted(economy_entries, key=lambda entry: (entry["source"], entry["output"], entry["id"])),
    }
    return tech_contract, magic_contract, economy_contract, surface_registry


def generate():
    tech_contract, magic_contract, economy_contract, surface_registry = build_contracts()
    write_json(TECH_PATH, tech_contract)
    write_json(MAGIC_PATH, magic_contract)
    write_json(ECON_PATH, economy_contract)
    write_json(SURFACE_PATH, surface_registry)
    print(
        f"generated contracts: tech={len(tech_contract['entries'])} magic={len(magic_contract['entries'])} "
        f"economy={len(economy_contract['entries'])} surfaces={len(surface_registry['recipe_surface_types'])}"
    )
    return 0


def validate():
    failures = []
    if not all(path.exists() for path in [TECH_PATH, MAGIC_PATH, ECON_PATH, SURFACE_PATH]):
        failures.append("one or more parenting manifests are missing; run generate first")
    if failures:
        for failure in failures:
            print(f"FAIL - {failure}", file=sys.stderr)
        return 1

    tech = load_json(TECH_PATH)
    magic = load_json(MAGIC_PATH)
    economy = load_json(ECON_PATH)
    registry = load_json(SURFACE_PATH)

    tech_entries = tech.get("entries", [])
    magic_entries = magic.get("entries", [])
    econ_entries = economy.get("entries", [])
    recipe_rows = load_recipe_rows()
    recipe_index, observed_surfaces = build_recipe_indexes(recipe_rows)

    tech_lookup = {(entry["surface_type"], entry["output"]): entry for entry in tech_entries}
    magic_lookup = {(entry["surface_type"], entry["output"]): entry for entry in magic_entries}

    registered_surfaces = set(registry.get("recipe_surface_types", []))
    missing_surfaces = sorted(set(observed_surfaces) - registered_surfaces)
    if missing_surfaces:
        failures.append(f"surface_registry missing recipe surface types: {', '.join(missing_surfaces[:40])}")

    missing_outputs = []
    for key in sorted(recipe_index.keys()):
        if key not in tech_lookup and key not in magic_lookup:
            missing_outputs.append(f"{key[0]} -> {key[1]}")
    if missing_outputs:
        failures.append(f"unassigned craftable outputs: {', '.join(missing_outputs[:40])}")

    tech_by_output = defaultdict(list)
    for entry in tech_entries:
        tech_by_output[entry["output"]].append(entry)
    magic_by_output = defaultdict(list)
    for entry in magic_entries:
        magic_by_output[entry["output"]].append(entry)

    for item, era in TECH_ASSERTIONS:
        if not any(entry["era"] == era for entry in tech_by_output.get(item, [])):
            failures.append(f"tech assertion missing: {item} -> {era}")
    for item, era, branch in MAGIC_ASSERTIONS:
        if not any(entry["blood_era"] == era and entry["branch"] == branch for entry in magic_by_output.get(item, [])):
            failures.append(f"magic assertion missing: {item} -> {era}/{branch}")

    for item in COINS:
        if any(output == item for _, output in recipe_index.keys()):
            failures.append(f"coin is still craftable: {item}")

    createdeco_entries = [entry for entry in tech_entries if ns(entry["output"]) == "createdeco" and entry["output"] not in COIN_SET]
    bad_createdeco = [
        entry["output"]
        for entry in createdeco_entries
        if entry["era"] != "brass" or entry["weight_class"] != "decor_theme"
    ]
    if bad_createdeco:
        failures.append(f"Create Deco outputs not brass decor_theme-parented: {', '.join(sorted(set(bad_createdeco))[:40])}")

    if not any(entry["output"].startswith("aether:") and entry["era"] == "space" for entry in tech_entries):
        failures.append("representative Aether craftables are not assigned to space")
    if not any(entry["weight_class"] == "decor_theme" for entry in tech_entries if entry["output"].startswith("tconstruct:seared_")):
        failures.append("representative seared decor surfaces are not tagged decor_theme")

    reward_root = ROOT / "generated" / "custom-mod-sources" / "dimensional-fonts" / "src" / "main" / "resources" / "defaults" / "rewards"
    for path in sorted(reward_root.glob("*.json")):
        data = load_json(path)
        kill_currency = (data.get("killCurrency") or {}).get("item")
        if kill_currency not in COIN_SET:
            failures.append(f"font payout currency is not a registered coin: {path.relative_to(ROOT).as_posix()} -> {kill_currency}")
        pools = data.get("pools", [])
        non_coin_entries = [
            reward.get("item")
            for pool in pools
            for reward in pool.get("entries", [])
            if reward.get("item") not in COIN_SET
        ]
        if non_coin_entries:
            failures.append(
                f"font payout includes direct non-coin rewards: {path.relative_to(ROOT).as_posix()} -> {', '.join(non_coin_entries[:20])}"
            )

    acquisition_types = set(registry.get("acquisition_surface_types", []))
    missing_acquisition_types = sorted({entry["source"] for entry in econ_entries} - acquisition_types)
    if missing_acquisition_types:
        failures.append(f"surface_registry missing acquisition surface types: {', '.join(missing_acquisition_types)}")

    blocked_economy = [
        f"{entry['source']} -> {entry['output']}"
        for entry in econ_entries
        if entry["policy"] == "production_blocked"
    ]
    if blocked_economy:
        failures.append(f"economy routes still expose productive unlocks: {', '.join(blocked_economy[:40])}")

    non_currency_coins = [entry["id"] for entry in econ_entries if entry["output"] in COIN_SET and entry["policy"] != "currency_only"]
    if non_currency_coins:
        failures.append(f"coin acquisition entries are not currency_only: {', '.join(non_currency_coins[:40])}")

    bad_fonts = [entry["id"] for entry in econ_entries if entry["source"] == "font_payout" and entry["output"] not in COIN_SET]
    if bad_fonts:
        failures.append(f"economy font entries contain direct non-coin payouts: {', '.join(bad_fonts[:40])}")

    if failures:
        for failure in failures:
            print(f"FAIL - {failure}", file=sys.stderr)
        return 1

    print(
        "ok - progression parenting contracts validate "
        f"(tech={len(tech_entries)} magic={len(magic_entries)} economy={len(econ_entries)} surfaces={len(registered_surfaces)})"
    )
    return 0


def main():
    if len(sys.argv) != 2 or sys.argv[1] not in {"generate", "validate"}:
        print("usage: tools/progression_contracts.py <generate|validate>", file=sys.stderr)
        return 2
    return generate() if sys.argv[1] == "generate" else validate()


if __name__ == "__main__":
    sys.exit(main())

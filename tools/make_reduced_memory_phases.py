#!/usr/bin/env python3
"""Generate reduced-stack joined memory profiling phases."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path("/home/gerald/obelisks")
OUT = ROOT / "docs" / "ram_profile" / "reduced_stack_phase_matrix_20260506.json"

REDUCED_BASELINE = [
    r"^ticex-.*\.jar$",
    r"^Steam_Rails-.*\.jar$",
    r"^Botania-.*\.jar$",
    r"^chipped-forge-.*\.jar$",
]


def phase(name: str, description: str, extra: list[str]) -> dict[str, object]:
    return {
        "name": name,
        "description": description,
        "disable": REDUCED_BASELINE + extra,
    }


PHASES = [
    phase("reduced_baseline_top4", "TiCEX, Steam Rails, Botania, and Chipped disabled together", []),
    phase("reduced_repeat_top4", "Reduced baseline repeat for noise check", []),
    phase("reduced_no_ars", "Reduced baseline plus Ars Nouveau family disabled", [
        r"^ars_nouveau-.*\.jar$",
        r"^DynamicTreesArsNouveau-.*\.jar$",
    ]),
    phase("reduced_no_bloodmagic", "Reduced baseline plus Blood Magic family disabled", [
        r"^bloodmagic-.*\.jar$",
        r"^KubeJS Blood Magic-.*\.jar$",
        r"^tomeofblood-.*\.jar$",
    ]),
    phase("reduced_no_malum", "Reduced baseline plus Malum family disabled", [
        r"^malum-.*\.jar$",
        r"^dtmalum-.*\.jar$",
    ]),
    phase("reduced_no_occultism", "Reduced baseline plus Occultism disabled", [
        r"^occultism-.*\.jar$",
    ]),
    phase("reduced_no_quark", "Reduced baseline plus Quark and its dynamic tree bridge disabled", [
        r"^Quark-.*\.jar$",
        r"^DynamicTreesQuark-.*\.jar$",
    ]),
    phase("reduced_no_supplementaries", "Reduced baseline plus Supplementaries disabled", [
        r"^supplementaries-.*\.jar$",
    ]),
    phase("reduced_no_amendments", "Reduced baseline plus Amendments disabled", [
        r"^amendments-.*\.jar$",
    ]),
    phase("reduced_no_farmers_delight", "Reduced baseline plus Farmer's Delight disabled", [
        r"^FarmersDelight-.*\.jar$",
    ]),
    phase("reduced_no_brewin_and_chewin", "Reduced baseline plus Brewin And Chewin disabled", [
        r"^BrewinAndChewin-.*\.jar$",
    ]),
    phase("reduced_no_delightful", "Reduced baseline plus Delightful disabled", [
        r"^Delightful-.*\.jar$",
    ]),
    phase("reduced_no_my_nethers_delight", "Reduced baseline plus My Nether's Delight disabled", [
        r"^MyNethersDelight-.*\.jar$",
    ]),
    phase("reduced_no_veggies_delight", "Reduced baseline plus Veggies Delight disabled", [
        r"^VeggiesDelight-.*\.jar$",
    ]),
    phase("reduced_no_ubes_delight", "Reduced baseline plus Ube's Delight disabled", [
        r"^ubesdelight-.*\.jar$",
    ]),
    phase("reduced_no_undergarden_delight", "Reduced baseline plus Undergarden Delight disabled", [
        r"^undergardendelight-.*\.jar$",
    ]),
    phase("reduced_no_chefs_delight", "Reduced baseline plus Chef's Delight disabled", [
        r"^chefsdelight-.*\.jar$",
    ]),
    phase("reduced_no_collectors_reap", "Reduced baseline plus Collector's Reap disabled", [
        r"^collectorsreap-.*\.jar$",
    ]),
    phase("reduced_no_corn_delight", "Reduced baseline plus Corn Delight disabled", [
        r"^corn_delight-.*\.jar$",
    ]),
    phase("reduced_no_ends_delight", "Reduced baseline plus End's Delight disabled", [
        r"^ends_delight-.*\.jar$",
    ]),
    phase("reduced_no_farmers_respite", "Reduced baseline plus Farmer's Respite disabled", [
        r"^farmersrespite-.*\.jar$",
    ]),
    phase("reduced_no_oceans_delight", "Reduced baseline plus Ocean's Delight disabled", [
        r"^oceansdelight-.*\.jar$",
    ]),
    phase("reduced_no_rustic_delight", "Reduced baseline plus Rustic Delight disabled", [
        r"^rusticdelight-.*\.jar$",
    ]),
    phase("reduced_no_diet", "Reduced baseline plus Diet disabled", [
        r"^diet-forge-.*\.jar$",
    ]),
    phase("reduced_no_solcarrot", "Reduced baseline plus Spice of Life Carrot disabled", [
        r"^solcarrot-.*\.jar$",
    ]),
    phase("reduced_no_thirst", "Reduced baseline plus Thirst Was Taken disabled", [
        r"^ThirstWasTaken-.*\.jar$",
    ]),
    phase("reduced_no_appleskin", "Reduced baseline plus AppleSkin disabled", [
        r"^appleskin-.*\.jar$",
    ]),
    phase("reduced_no_cravings", "Reduced baseline plus Cravings disabled", [
        r"^cravings-.*\.jar$",
    ]),
    phase("reduced_no_acid_vat", "Reduced baseline plus custom acid_vat disabled", [
        r"^acid_vat-.*\.jar$",
    ]),
    phase("reduced_no_btmfixes", "Reduced baseline plus custom btmfixes disabled", [
        r"^btmfixes-.*\.jar$",
    ]),
    phase("reduced_no_classselector", "Reduced baseline plus custom classselector disabled", [
        r"^classselector-.*\.jar$",
    ]),
    phase("reduced_no_computerbridge", "Reduced baseline plus custom computerbridge disabled", [
        r"^computerbridge-.*\.jar$",
    ]),
    phase("reduced_no_transmissionloss", "Reduced baseline plus custom create-transmission-loss disabled", [
        r"^create-transmission-loss-.*\.jar$",
    ]),
    phase("reduced_no_cursedbiomes", "Reduced baseline plus custom cursedbiomes disabled", [
        r"^cursedbiomes-.*\.jar$",
    ]),
    phase("reduced_no_fission_reactor", "Reduced baseline plus custom fission_reactor disabled", [
        r"^fission_reactor-.*\.jar$",
    ]),
    phase("reduced_no_gases_and_plasmas", "Reduced baseline plus custom gases_and_plasmas disabled", [
        r"^gases_and_plasmas-.*\.jar$",
    ]),
    phase("reduced_no_heatsync", "Reduced baseline plus custom heatsync disabled", [
        r"^heatsync-.*\.jar$",
    ]),
    phase("reduced_no_liquid_coolant", "Reduced baseline plus custom liquid_coolant disabled", [
        r"^liquid_coolant-.*\.jar$",
    ]),
    phase("reduced_no_obelisks", "Reduced baseline plus custom obelisks disabled", [
        r"^obelisks-.*\.jar$",
    ]),
    phase("reduced_no_pillagercampaigns", "Reduced baseline plus custom pillagercampaigns disabled", [
        r"^pillagercampaigns-.*\.jar$",
    ]),
    phase("reduced_no_procedural_bouquets", "Reduced baseline plus custom procedural_bouquets disabled", [
        r"^procedural_bouquets-.*\.jar$",
    ]),
    phase("reduced_no_realisticores", "Reduced baseline plus custom realisticores disabled", [
        r"^realisticores-.*\.jar$",
    ]),
    phase("reduced_no_rpgstats", "Reduced baseline plus custom rpgstats disabled", [
        r"^rpgstats-.*\.jar$",
    ]),
    phase("reduced_no_settlementroads", "Reduced baseline plus custom settlementroads disabled", [
        r"^settlementroads-.*\.jar$",
    ]),
    phase("reduced_no_villagewalls", "Reduced baseline plus custom villagewalls disabled", [
        r"^villagewalls-.*\.jar$",
    ]),
    phase("reduced_no_compressedcreativity", "Reduced baseline plus Compressed Creativity disabled", [
        r"^compressedcreativity-.*\.jar$",
    ]),
    phase("reduced_no_create_new_age", "Reduced baseline plus Create New Age and direct bridge disabled", [
        r"^create-new-age-.*\.jar$",
        r"^create_cold_sweat-.*\.jar$",
    ]),
    phase("reduced_no_create_stuff_additions", "Reduced baseline plus Create Stuff Additions disabled", [
        r"^create-stuff-additions.*\.jar$",
    ]),
    phase("reduced_no_create_bb", "Reduced baseline plus Create Big Beacons disabled", [
        r"^create_bb-.*\.jar$",
    ]),
    phase("reduced_no_create_central_kitchen", "Reduced baseline plus Create Central Kitchen disabled", [
        r"^create_central_kitchen-.*\.jar$",
    ]),
    phase("reduced_no_create_cold_sweat", "Reduced baseline plus Create Cold Sweat disabled", [
        r"^create_cold_sweat-.*\.jar$",
    ]),
    phase("reduced_no_create_connected", "Reduced baseline plus Create Connected disabled", [
        r"^create_connected-.*\.jar$",
    ]),
    phase("reduced_no_create_enchantment_industry", "Reduced baseline plus Create Enchantment Industry disabled", [
        r"^create_enchantment_industry-.*\.jar$",
    ]),
    phase("reduced_no_create_more_additions", "Reduced baseline plus Create More Additions disabled", [
        r"^create_more_additions-.*\.jar$",
    ]),
    phase("reduced_no_create_power_loader", "Reduced baseline plus Create Power Loader disabled", [
        r"^create_power_loader-.*\.jar$",
    ]),
    phase("reduced_no_create_things_and_misc", "Reduced baseline plus Create Things and Misc disabled", [
        r"^create_things_and_misc-.*\.jar$",
    ]),
    phase("reduced_no_create_additional_logistics", "Reduced baseline plus Create Additional Logistics disabled", [
        r"^createadditionallogistics-.*\.jar$",
    ]),
    phase("reduced_no_create_addon_compatibility", "Reduced baseline plus Create Addon Compatibility disabled", [
        r"^createaddoncompatibility-.*\.jar$",
    ]),
    phase("reduced_no_create_adv_logistics", "Reduced baseline plus Create Advanced Logistics disabled", [
        r"^createadvlogistics-.*\.jar$",
    ]),
    phase("reduced_no_create_applied_kinetics", "Reduced baseline plus Create Applied Kinetics disabled", [
        r"^createappliedkinetics-.*\.jar$",
    ]),
    phase("reduced_no_create_big_cannons", "Reduced baseline plus Create Big Cannons disabled", [
        r"^createbigcannons-.*\.jar$",
    ]),
    phase("reduced_no_create_diesel_generators", "Reduced baseline plus Create Diesel Generators disabled", [
        r"^createdieselgenerators-.*\.jar$",
    ]),
    phase("reduced_no_create_liquid_fuel", "Reduced baseline plus Create Liquid Fuel disabled", [
        r"^createliquidfuel-.*\.jar$",
    ]),
    phase("reduced_no_create_more_drill_heads", "Reduced baseline plus Create More Drill Heads disabled", [
        r"^createmoredrillheads-.*\.jar$",
    ]),
    phase("reduced_no_ae2_things", "Reduced baseline plus AE2 Things disabled", [
        r"^AE2-Things-.*\.jar$",
    ]),
    phase("reduced_no_ae2_network_analyzer", "Reduced baseline plus AE2 Network Analyzer disabled", [
        r"^AE2NetworkAnalyzer-.*\.jar$",
    ]),
    phase("reduced_no_ae_additions", "Reduced baseline plus AE Additions disabled", [
        r"^AEAdditions-.*\.jar$",
    ]),
    phase("reduced_no_advanced_ae", "Reduced baseline plus Advanced AE disabled", [
        r"^AdvancedAE-.*\.jar$",
    ]),
    phase("reduced_no_extended_ae", "Reduced baseline plus Extended AE disabled", [
        r"^ExtendedAE-.*\.jar$",
    ]),
    phase("reduced_no_mae2", "Reduced baseline plus MEGA Cells/MAE2 disabled", [
        r"^mae2-.*\.jar$",
    ]),
    phase("reduced_no_merequester", "Reduced baseline plus ME Requester disabled", [
        r"^merequester-.*\.jar$",
    ]),
    phase("reduced_no_polyeng", "Reduced baseline plus PolyEng disabled", [
        r"^polyeng-forge-.*\.jar$",
    ]),
]


def main() -> int:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(PHASES, indent=2) + "\n")
    print(OUT)
    print(f"phases={len(PHASES)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

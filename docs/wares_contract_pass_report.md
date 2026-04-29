# Wares Contract Pass Report

Date: 2026-04-29

## Summary

Wares is now treated as part of the pack's authored crafting economy. Delivery agreements are not flavor loot: they are contract recipes that exchange local goods, route labor, packaging, villager work, and Dot Coins.

This pass removes Wares' default emerald contract currency from the default village and wandering-trader agreement tables and replaces it with Dot Coin tiers.

## Implementation

Added datapack overrides under `kubejs/data/wares/loot_tables` for:

- village agreement buy requests: `*_requested_buy.json`
- village agreement sell payments: `*_payment_sell.json`
- wandering trader agreement prices: `regular_price.json`, `rare_price.json`
- village package tables: `package/village/*.json`

Village contract coin mapping:

| Village type | Coin tier |
|---|---|
| plains | `dotcoinmod:copper_coin` |
| desert | `dotcoinmod:iron_coin` |
| taiga | `dotcoinmod:tin_coin` |
| savanna | `dotcoinmod:bronze_coin` |
| snowy | `dotcoinmod:silver_coin` |

Wandering trader contract coin mapping:

| Agreement tier | Coin tier |
|---|---|
| regular | `dotcoinmod:bronze_coin` |
| rare | `dotcoinmod:gold_coin` |

## Evidence

Local Wares data from the live instance showed default emerald use in:

- `wares:agreement/village/*_requested_buy`
- `wares:agreement/village/*_payment_sell`
- `wares:agreement/wandering_trader/regular_price`
- `wares:agreement/wandering_trader/rare_price`
- `wares:package/village/*`

Local Wares recipes only define:

- `wares:cardboard_box`
- `wares:delivery_table`

The actual contract behavior is driven by loot tables and sealed-delivery-agreement NBT in village warehouse chest loot.

## Design Decision

Loot tables are an essential crafting system in this pack.

The pack has several non-grid conversion systems:

- normal recipes
- TCon melting/casting/alloying
- Create processing
- Acid Vat chemistry
- villager trades
- Wares contracts
- quest rewards
- dimension/obelisk/combat loot

All of these can create or route materials. Therefore all of them must be audited as material-economy surfaces and not treated as passive rewards.

## Remaining Work

### MUST DO

#### Proposal: Author custom Wares contracts by coin and material tier

- Evidence: this pass only converts default emerald currency; it does not yet add pack-authored contracts for metals, deposits, route supplies, machine-tier goods, or village-region specialties.
- Why it fits the design: Wares can make villages and routes into real crafting infrastructure.
- Risk: default village goods remain useful but generic.
- Implementation surface: `kubejs/data/wares/loot_tables/agreement/**`, `kubejs/data/wares/loot_tables/chests/village/**`, possibly custom structure/warehouse tables.
- Confidence: High.

#### Proposal: Audit all loot tables as recipes

- Evidence: package tables still generate supplies and package rewards; many other mods also inject progression-relevant loot.
- Why it fits the design: loot can bypass, complement, or define progression exactly like recipes.
- Risk: powerful loot skips machine casing, magic, or deposit progression.
- Implementation surface: full loot-table dump, denylist/allowlist scanner, authored replacements.
- Confidence: High.

#### Proposal: Add Wares quest/tutorial chain

- Evidence: Wares is not currently represented in quest progression as a contract-crafting system.
- Why it fits the design: the player must learn village logistics, routes, packaging, packager labor, and contracts.
- Risk: Wares remains obscure despite being a core crafting lane.
- Implementation surface: Villager Trading / Adventuring / Logistics quest chapters.
- Confidence: High.

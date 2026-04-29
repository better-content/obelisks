# Emerald Loot Coin Replacement Pass

Loot tables are treated as crafting/economy recipes. The live dump still contained many `minecraft:emerald` currency rewards after villager trades had been moved to Dot Coins, so this pass adds an explicit LootJS replacement table.

## Implementation

Added `kubejs/server_scripts/50_loot/40_emerald_loot_coin_replacement.js`.

The script replaces emerald entries in 215 non-block loot tables with Dot Coin rewards:

- `dotcoinmod:copper_coin` for village and Wares contract/package economy tables.
- `dotcoinmod:iron_coin` for early hostile/entity raid reward tables.
- `dotcoinmod:tin_coin` for common archaeology and generic chest currency tables.
- `dotcoinmod:silver_coin` for mid adventure/magic/dragon-adjacent tables.
- `dotcoinmod:brass_coin` for deep magic, Nether, Deeper and Darker, Blue Skies, Blood Magic, and Iron's Spells tables.
- `dotcoinmod:gold_coin` for high-value late/dimensional tables such as Lost Cities, Fallout, Bumblezone, End City, and top Twilight/Deeper-Darker structures.

Block loot tables are intentionally excluded so emerald ore/block behavior remains a material/resource question rather than a currency rewrite.

## Design Fit

- Removes emerald as the default village/trade economy currency.
- Keeps world loot useful by paying bounded coin tiers.
- Avoids global coin conversion loops.
- Avoids rewriting ore block drops by accident.

## Validation

- `node --check kubejs/server_scripts/50_loot/40_emerald_loot_coin_replacement.js`

# Validation Report

## Static Checks

- KubeJS files were syntax-checked with `node --check` where possible.
- Registry IDs used in new recipes were checked against the live instance item/fluid dumps where practical.
- MoreJS event names and method signatures were checked with `javap` against `morejs-forge-1.20.1-0.10.1.jar`.
- RPGStats heart type DSL was checked against `/home/gerald/mcmods/rpgstats` source.

## Bypass Check

- Andesite alloy vanilla/Create crafting and mixing bypasses are removed by explicit recipe IDs.
- Direct TCon molten iron/zinc basin casting into `create:andesite_alloy` is removed.
- Andesite alloy now uses TCon alloying into `tinkersinnovation:molten_andesite_alloy`, then existing Tinkers Innovation casting.
- Andesite casing item application is removed; `create:deploying` is the intended route.
- Water wheel/windmill already require `create:andesite_casing` via existing script.
- Nether grout is Create mixing only via existing script; normal grout remains netherrack-based via existing script.
- Blood Orbs are no longer made from generic Still-Beating Heart NBT recipes; they consume specific typed heart items.

## Not Headlessly Proven

- Full Minecraft/KubeJS startup was not run in this pass.
- FTB Quest chapter load needs an in-client reload check.
- Villager trade runtime behavior needs a throwaway-world verification.

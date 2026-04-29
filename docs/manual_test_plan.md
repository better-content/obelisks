# Manual Test Plan

1. Launch the disposable Prism instance and run `/reload`.
2. Check KubeJS server log for errors from `98_starting_progression_bypasses.js`, `99_machine_casing_progression.js`, and `10_coin_villager_trades.js`.
3. Verify EMI/JEI shows no Create crafting/mixing recipe for `create:andesite_alloy`.
4. Verify `create:andesite_casing` is made by Create Deployer assembly.
5. Verify `tconstruct:grout` includes netherrack and does not require Create mixing.
6. Verify `tconstruct:nether_grout` is made by Create mixing.
7. Verify `create:water_wheel` and `create:windmill_bearing` require `create:andesite_casing`.
8. Verify each casing recipe from seared to AE2 is visible.
9. Convert a Still-Beating Heart into `kubejs:weak_blood_heart` with a Sacrificial Dagger catalyst, then make a Weak Blood Orb in the altar.
10. Open FTB Quests and verify Starting Out gives only 16 copper coins per quest.
11. Verify non-starting chapters give 4 coins per included difficulty tier.
12. Spawn a villager for each major profession and confirm vanilla emerald trades are replaced with dotcoin trades.

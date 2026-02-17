// kubejs/server_scripts/crafting_station_swap.js
// Forge 1.20.1 + KubeJS 6
//
// Goals:
// 1) Replace all recipe *inputs* that use minecraft:crafting_table -> tconstruct:crafting_station
// 2) Disable TCon's default crafting_station recipes (so you don't get duplicate/alternate station recipes)
// 3) Replace all recipe *outputs* that create minecraft:crafting_table -> tconstruct:crafting_station
// 4) Remove any leftover recipes that still output minecraft:crafting_table (failsafe)

ServerEvents.recipes(event => {
    var VANILLA_TABLE = 'minecraft:crafting_table'
    var TCON_STATION  = 'tconstruct:crafting_station'

    // (2) Remove ONLY TCon-provided recipes that output the station.
    // Do this BEFORE we start converting other outputs to the station.
    event.remove({ mod: 'tconstruct', output: TCON_STATION })

    // (1) Any recipe that uses a crafting table as an ingredient now uses the station instead.
    event.replaceInput({}, VANILLA_TABLE, TCON_STATION)

    // (3) Any recipe that outputs a vanilla crafting table now outputs the station instead.
    event.replaceOutput({}, VANILLA_TABLE, TCON_STATION)

    // (4) Failsafe: if any recipes still output the vanilla crafting table, delete them.
    event.remove({ output: VANILLA_TABLE })
})

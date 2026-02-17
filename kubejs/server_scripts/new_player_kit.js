// kubejs/server_scripts/new_player_kit.js
// Forge 1.20.1 + KubeJS 6
// Gives new players a starter kit ONCE, on first login.

PlayerEvents.loggedIn(event => {
    const pData = event.player.persistentData

    if (pData.getBoolean('kjs_got_new_player_kit')) return
        pData.putBoolean('kjs_got_new_player_kit', true)


        // Tinkers' Construct starter tools (prebuilt NBT)
        event.player.give(
            Item.of(
                'tconstruct:mattock',
                '{Damage:0,tic_broken:0b,tic_materials:["tconstruct:flint","tconstruct:wood","tconstruct:flint"],tic_modifiers:[{level:1,name:"tconstruct:cultivated"},{level:1,name:"tconstruct:tilling"},{level:2,name:"tconstruct:jagged"}],tic_multipliers:{"tconstruct:attack_damage":1.1f,"tconstruct:durability":1.25f,"tconstruct:mining_speed":1.1f},tic_persistent:{},tic_stats:{"tconstruct:attack_damage":3.025f,"tconstruct:attack_speed":0.9f,"tconstruct:durability":106.25f,"tconstruct:harvest_tier":"minecraft:stone","tconstruct:mining_speed":3.8500001f},tic_volatile_data:{abilities:1,upgrades:3}}'
            )
        )

        event.player.give(
            Item.of(
                'tconstruct:pickaxe',
                '{tic_materials:["tconstruct:flint","tconstruct:wood","tconstruct:wood"],tic_modifiers:[{level:2,name:"tconstruct:cultivated"},{level:1,name:"tconstruct:pierce"},{level:1,name:"tconstruct:jagged"}],tic_persistent:{},tic_stats:{"tconstruct:attack_damage":2.25f,"tconstruct:attack_speed":1.2f,"tconstruct:durability":85.0f,"tconstruct:harvest_tier":"minecraft:stone","tconstruct:mining_speed":3.5f},tic_volatile_data:{abilities:1,upgrades:3}}'
            )
        )


        // Thirst bowl
        event.player.give('thirst:terracotta_water_bowl')
})

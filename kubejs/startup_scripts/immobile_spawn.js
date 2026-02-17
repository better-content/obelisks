// KubeJS 6 (Forge 1.20.1)
// STARTUP script: disables ALL spawn-point changes

console.info('[no_moving_spawn] registering PlayerSetSpawnEvent cancel');

ForgeEvents.onEvent('net.minecraftforge.event.entity.player.PlayerSetSpawnEvent', event => {
    event.setCanceled(true);
});

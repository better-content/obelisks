(function () {
  var cfg = JsonIO.read('kubejs/config/perf_probe.json') || {}
  if (!cfg.enabled) return

  var interval = cfg.intervalTicks || 100
  var clientTicks = 0
  var renderTicks = 0
  var Minecraft = Java.loadClass('net.minecraft.client.Minecraft')
  var lastLogMillis = Date.now()

  function logProbe(source) {
    var now = Date.now()
    var elapsed = Math.max(1, now - lastLogMillis)
    var renderFps = Math.round(renderTicks * 10000 / elapsed) / 10
    lastLogMillis = now
    renderTicks = 0

    try {
      var mc = Minecraft.getInstance()
      var fps = -1
      try {
        fps = mc.getFps()
      } catch (ignored) {
        fps = -1
      }
      var level = mc.level
      var player = mc.player
      var dim = level == null ? 'no_level' : String(level.dimension().location())
      var pos = player == null ? 'no_player' : Math.floor(player.getX()) + ',' + Math.floor(player.getY()) + ',' + Math.floor(player.getZ())
      console.info('[BC-PERF-PROBE] source=' + source + ' clientTicks=' + clientTicks + ' renderFps=' + renderFps + ' mcFps=' + fps + ' dim=' + dim + ' pos=' + pos)
    } catch (e) {
      console.info('[BC-PERF-PROBE] error=' + e)
    }
  }

  if (typeof ForgeEvents !== 'undefined') {
    ForgeEvents.onEvent('net.minecraftforge.event.TickEvent$RenderTickEvent', function () {
      renderTicks++
    })

    ForgeEvents.onEvent('net.minecraftforge.event.TickEvent$ClientTickEvent', function () {
      clientTicks++
      if (clientTicks % interval !== 0) return
      logProbe('forge_client_tick')
    })

    console.info('[BC-PERF-PROBE] registered forge render/client tick probe interval=' + interval)
  } else {
    console.info('[BC-PERF-PROBE] ForgeEvents unavailable; FPS probe disabled')
  }
})()

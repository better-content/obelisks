// kubejs/server_scripts/respawn_hubs.js
// Forge 1.20.1 + KubeJS 6 (Rhino-safe ES5)
//
// v19_manual_only_particles_pulse_3s_thick_soul_with_spooky_sound
// - Manual hubs only (NO scanning/builder)
// - Brigadier commands (/rrhubs ...)
// - Respawn routing to least-used hub (only if enabled + no personal bed/anchor)
// - Crying obsidian placed at (x, y-1, z) when adding hub and when teleporting
// - FX: 3x3x3 cube centered at (x+0.5, y+1.0, z+0.5) for ~3s via scheduled pulses
// - THICK sculk_soul + sculk_charge/sculk_charge_pop + soul_fire_flame
// - Adds the SAME spooky sound stack from spawnfx.js, but targeted to the triggering player
//
// Commands (perm level 2):
//   /rrhubs enable
//   /rrhubs disable
//   /rrhubs status
//   /rrhubs list
//   /rrhubs tp <index>
//   /rrhubs add_here
//   /rrhubs remove_here
//   /rrhubs remove_index <i>
//   /rrhubs clear

var DIM_DEFAULT = 'minecraft:overworld'
var SCRIPT_VERSION = 'v19_manual_only_particles_pulse_3s_thick_soul_with_spooky_sound'

// -------------------- persistent keys --------------------
var K_ENABLED = 'rrhubs_enabled'
var K_NOTIFY_NAME = 'rrhubs_notify_name'
var K_HUBS_JSON = 'rrhubs_hubs_json'
var K_COUNTS_JSON = 'rrhubs_counts_json'
var K_HUBS_FINAL = 'rrhubs_hubs_final'
var K_CFG = 'rrhubs_cfg'

// -------------------- FX tuning --------------------
var FX_DURATION_TICKS = 60         // 3 seconds
var FX_PULSE_EVERY_TICKS = 2       // 1=thicker, 2=good, 3=cheaper
var FX_SPREAD = 1.0                // 3x3x3 cube spread
var FX_COUNTS_EVERY_TICKS = 200

// Per-pulse counts (accumulate over duration)
var FX_COUNT_SOUL_PER_PULSE = 70
var FX_COUNT_CHARGE_PER_PULSE = 30
var FX_COUNT_POP_PER_PULSE = 20
var FX_COUNT_BLUE_PER_PULSE = 18

// Optional debug burst
var FX_FLAME_DEBUG = false
var FX_COUNT_FLAME_PER_PULSE = 20

// -------------------- sound (from spawnfx.js) --------------------
var SOUND_VOL = 6.0
var SOUND_MINVOL = 1.0
var SOUND_PITCH_BELL = 0.75
var SOUND_PITCH_PORTAL = 0.9
var SOUND_PITCH_WARDEN = 0.8
var SOUND_PITCH_EVOKER = 0.9

// -------------------- runtime state --------------------
var rrHubs = []    // [{dim,x,y,z}]  where y is player-feet blockY
var rrCounts = []  // [int per hub]

// -------------------- helpers --------------------
function pd(server) { return server.persistentData }

function safeInt(n, fallback) {
    n = Number(n)
    if (!isFinite(n)) return fallback
        n = Math.floor(n)
        return (n | 0)
}

function rrLog(server, s) {
    try { server.console.log('[rrhubs] ' + s) } catch (e) {}
}

function rrBroadcast(server, s) {
    try { server.tell('[rrhubs] ' + s) } catch (e) { rrLog(server, s) }
}

function isEnabled(server) { return pd(server).getBoolean(K_ENABLED) }
function setEnabled(server, b) { pd(server).putBoolean(K_ENABLED, !!b) }

function setNotifyName(server, name) { pd(server).putString(K_NOTIFY_NAME, String(name || '')) }
function getNotifyName(server) { return String(pd(server).getString(K_NOTIFY_NAME) || '') }

function setFinal(server, b) { pd(server).putBoolean(K_HUBS_FINAL, !!b) }
function isFinal(server) { return pd(server).getBoolean(K_HUBS_FINAL) }

function cleanDimId(s) {
    s = String(s || DIM_DEFAULT)
    if (s.indexOf('ResourceLocation[') === 0) {
        s = s.substring('ResourceLocation['.length)
        if (s.charAt(s.length - 1) === ']') s = s.substring(0, s.length - 1)
    }
    return s
}

function normalizeHub(h) {
    if (!h) return null
        var x = Number(h.x), y = Number(h.y), z = Number(h.z)
        if (!isFinite(x) || !isFinite(y) || !isFinite(z)) return null
            var dim = String(h.dim || DIM_DEFAULT)
            return { dim: dim, x: x, y: y, z: z }
}

function saveHubs(server) {
    try { pd(server).putString(K_HUBS_JSON, JSON.stringify(rrHubs)) } catch (e) {}
}

function saveCounts(server) {
    try { pd(server).putString(K_COUNTS_JSON, JSON.stringify(rrCounts)) } catch (e) {}
}

function loadState(server) {
    try { pd(server).putString(K_CFG, SCRIPT_VERSION) } catch (e0) {}

    rrHubs = []
    rrCounts = []

    try {
        var hs = pd(server).getString(K_HUBS_JSON)
        if (hs && String(hs).length > 2) {
            var arr = JSON.parse(String(hs))
            if (arr && arr.length) {
                for (var i = 0; i < arr.length; i++) {
                    var nh = normalizeHub(arr[i])
                    if (nh) rrHubs.push(nh)
                }
            }
        }
    } catch (e) {}

    try {
        var cs = pd(server).getString(K_COUNTS_JSON)
        if (cs && String(cs).length > 2) {
            var carr = JSON.parse(String(cs))
            if (carr && carr.length) rrCounts = carr
        }
    } catch (e2) {}

    while (rrCounts.length < rrHubs.length) rrCounts.push(0)

        for (var j = 0; j < rrCounts.length; j++) {
            var c = Number(rrCounts[j])
            rrCounts[j] = (isFinite(c) && c >= 0) ? Math.floor(c) : 0
        }
        if (rrCounts.length > rrHubs.length) rrCounts = rrCounts.slice(0, rrHubs.length)

            setFinal(server, rrHubs.length > 0)
}

function playerHasPersonalSpawn(player) {
    try {
        if (player.getRespawnPosition && player.getRespawnPosition()) return true
            if (player.respawnPosition) return true
    } catch (e) {}
    return false
}

function chooseLeastUsedHubIndex() {
    if (!rrHubs || rrHubs.length === 0) return -1
        if (!rrCounts || rrCounts.length < rrHubs.length) {
            rrCounts = []
            while (rrCounts.length < rrHubs.length) rrCounts.push(0)
        }
        var best = 0
        var bestCount = rrCounts[0]
        for (var i = 1; i < rrHubs.length; i++) {
            if (rrCounts[i] < bestCount) { best = i; bestCount = rrCounts[i] }
        }
        return best
}

// -------------------- block placement --------------------
function placeCryingObsidianBelow(level, x, y, z) {
    x = safeInt(x, 0); y = safeInt(y, 64); z = safeInt(z, 0)
    try {
        level.getBlock(x, y - 1, z).set('minecraft:crying_obsidian')
        return true
    } catch (e1) {}
    var dim = DIM_DEFAULT
    try { dim = cleanDimId(level.dimension.location().toString()) } catch (e2) { dim = DIM_DEFAULT }
    try {
        level.server.runCommandSilent(
            'execute in ' + dim + ' run setblock ' + x + ' ' + (y - 1) + ' ' + z + ' minecraft:crying_obsidian'
        )
        return true
    } catch (e3) {}
    return false
}

// -------------------- sound FX (ported from spawnfx.js) --------------------
// Changed: target only the triggering player (NOT @a radius)
function playSpookySoundForPlayer(level, playerName, x, y, z) {
    // bell
    level.runCommandSilent(
        'playsound minecraft:block.bell.use master ' + playerName + ' ' +
        x + ' ' + y + ' ' + z + ' ' + (SOUND_VOL * 0.75) + ' ' + SOUND_PITCH_BELL + ' ' + SOUND_MINVOL
    )
    // portal spawn
    level.runCommandSilent(
        'playsound minecraft:block.end_portal.spawn master ' + playerName + ' ' +
        x + ' ' + y + ' ' + z + ' ' + (SOUND_VOL * 0.85) + ' ' + SOUND_PITCH_PORTAL + ' ' + SOUND_MINVOL
    )
    // warden ambient
    level.runCommandSilent(
        'playsound minecraft:entity.warden.ambient master ' + playerName + ' ' +
        x + ' ' + y + ' ' + z + ' ' + (SOUND_VOL * 0.45) + ' ' + SOUND_PITCH_WARDEN + ' ' + SOUND_MINVOL
    )
    // evoker summon
    level.runCommandSilent(
        'playsound minecraft:entity.evoker.prepare_summon master ' + playerName + ' ' +
        x + ' ' + y + ' ' + z + ' ' + (SOUND_VOL * 0.55) + ' ' + SOUND_PITCH_EVOKER + ' ' + SOUND_MINVOL
    )
}

// -------------------- hub FX (scheduled pulses for ~3s) --------------------
function emitHubParticlesOnce(server, playerName, dim, x, y, z) {
    var cx = x + 0.5
    var cy = y + 1.0
    var cz = z + 0.5
    var spread = FX_SPREAD

    if (FX_FLAME_DEBUG) {
        server.runCommandSilent(
            'execute in ' + dim +
            ' run particle minecraft:flame ' +
            cx + ' ' + cy + ' ' + cz +
            ' ' + spread + ' ' + spread + ' ' + spread +
            ' 0 ' + FX_COUNT_FLAME_PER_PULSE + ' force ' + playerName
        )
    }

    server.runCommandSilent(
        'execute in ' + dim +
        ' run particle minecraft:sculk_soul ' +
        cx + ' ' + cy + ' ' + cz +
        ' ' + spread + ' ' + spread + ' ' + spread +
        ' 0 ' + FX_COUNT_SOUL_PER_PULSE + ' force ' + playerName
    )

    server.runCommandSilent(
        'execute in ' + dim +
        ' run particle minecraft:sculk_charge ' +
        cx + ' ' + cy + ' ' + cz +
        ' ' + spread + ' ' + spread + ' ' + spread +
        ' 0 ' + FX_COUNT_CHARGE_PER_PULSE + ' force ' + playerName
    )

    server.runCommandSilent(
        'execute in ' + dim +
        ' run particle minecraft:sculk_charge_pop ' +
        cx + ' ' + cy + ' ' + cz +
        ' ' + spread + ' ' + spread + ' ' + spread +
        ' 0 ' + FX_COUNT_POP_PER_PULSE + ' force ' + playerName
    )

    server.runCommandSilent(
        'execute in ' + dim +
        ' run particle minecraft:soul_fire_flame ' +
        cx + ' ' + cy + ' ' + cz +
        ' ' + spread + ' ' + spread + ' ' + spread +
        ' 0 ' + FX_COUNT_BLUE_PER_PULSE + ' force ' + playerName
    )
}

function spawnHubParticlesForPlayer(server, player, dim, x, y, z) {
    x = safeInt(x, 0); y = safeInt(y, 64); z = safeInt(z, 0)
    dim = cleanDimId(dim)

    var who = player.name.string
    var pulses = Math.max(1, Math.floor(FX_DURATION_TICKS / Math.max(1, FX_PULSE_EVERY_TICKS)))

    for (var i = 0; i < pulses; i++) {
        (function (k) {
            server.scheduleInTicks(k * FX_PULSE_EVERY_TICKS, function () {
                emitHubParticlesOnce(server, who, dim, x, y, z)
            })
        })(i)
    }
}

function playHubSoundForPlayer(server, player, dim, x, y, z) {
    dim = cleanDimId(dim)
    var level = server.getLevel(dim)
    if (!level) return

        // Same position semantics as FX: centered above pad
        var sx = x + 0.5
        var sy = y + 1.0
        var sz = z + 0.5

        playSpookySoundForPlayer(level, player.name.string, sx, sy, sz)
}

// -------------------- teleport + pad + FX --------------------
function teleportPlayerToHubAndFx(server, player, hub) {
    if (!hub) return
        if (!isFinite(hub.x) || !isFinite(hub.y) || !isFinite(hub.z)) return

            var dim = cleanDimId(String(hub.dim || DIM_DEFAULT))
            var xi = safeInt(hub.x, 0)
            var yi = safeInt(hub.y, 64)
            var zi = safeInt(hub.z, 0)

            server.runCommandSilent(
                'execute in ' + dim + ' run tp ' + player.name.string + ' ' + (xi + 0.5) + ' ' + yi + ' ' + (zi + 0.5)
            )

            server.scheduleInTicks(1, function () {
                var level = server.getLevel(dim)
                if (!level) return

                    placeCryingObsidianBelow(level, xi, yi, zi)
                    playHubSoundForPlayer(server, player, dim, xi, yi, zi)
                    spawnHubParticlesForPlayer(server, player, dim, xi, yi, zi)
            })
}

// -------------------- tellraw list --------------------
function tellrawPlayer(server, name, json) {
    try { server.runCommandSilent('tellraw ' + name + ' ' + JSON.stringify(json)) } catch (e) {}
}

function sendHubListTo(server, name) {
    if (!name) return
        if (!rrHubs || rrHubs.length === 0) {
            tellrawPlayer(server, name, { text: 'Respawn hubs: (none)', color: 'gold' })
            return
        }

        tellrawPlayer(server, name, { text: 'Respawn hubs (' + rrHubs.length + '):', color: 'gold' })
        for (var i = 0; i < rrHubs.length; i++) {
            var h = rrHubs[i]
            var dim = cleanDimId(String(h.dim || DIM_DEFAULT))
            var x = safeInt(h.x, 0) + 0.5
            var y = safeInt(h.y, 64)
            var z = safeInt(h.z, 0) + 0.5
            var run = 'rrhubs tp ' + i

            tellrawPlayer(server, name, {
                text: '',
                extra: [
                    { text: '[' + i + '] ', color: 'gray' },
                    {
                        text: dim + ' ' + x + ' ' + y + ' ' + z,
                        color: 'aqua',
                        underlined: true,
                        clickEvent: { action: 'run_command', value: '/' + run },
                        hoverEvent: { action: 'show_text', value: { text: 'Click to teleport\n/' + run, color: 'yellow' } }
                    }
                ]
            })
        }
}

// -------------------- manual hub management --------------------
function addHubAtPlayer(server, player) {
    var level = player.level
    var dim = DIM_DEFAULT
    try { dim = cleanDimId(level.dimension.location().toString()) } catch (e) { dim = DIM_DEFAULT }

    var x = safeInt(player.blockX, safeInt(player.x, 0))
    var y = safeInt(player.blockY, safeInt(player.y, 64))
    var z = safeInt(player.blockZ, safeInt(player.z, 0))

    var hub = normalizeHub({ dim: dim, x: x, y: y, z: z })
    if (!hub) return

        for (var i = 0; i < rrHubs.length; i++) {
            var h = rrHubs[i]
            if (h.x === hub.x && h.y === hub.y && h.z === hub.z && h.dim === hub.dim) {
                rrBroadcast(server, 'Hub already exists here.')
                return
            }
        }

        rrHubs.push(hub)
        rrCounts.push(0)

        placeCryingObsidianBelow(level, x, y, z)
        playHubSoundForPlayer(server, player, dim, x, y, z)
        spawnHubParticlesForPlayer(server, player, dim, x, y, z)

        saveHubs(server)
        saveCounts(server)
        setFinal(server, rrHubs.length > 0)

        rrBroadcast(server, 'Hub added at ' + dim + ' ' + x + ' ' + y + ' ' + z)
}

function removeHubAtPlayer(server, player) {
    var dim = DIM_DEFAULT
    try { dim = cleanDimId(player.level.dimension.location().toString()) } catch (e) { dim = DIM_DEFAULT }

    var x = safeInt(player.blockX, safeInt(player.x, 0))
    var y = safeInt(player.blockY, safeInt(player.y, 64))
    var z = safeInt(player.blockZ, safeInt(player.z, 0))

    var removed = false
    for (var i = 0; i < rrHubs.length; i++) {
        var h = rrHubs[i]
        if (h.x === x && h.y === y && h.z === z && h.dim === dim) {
            rrHubs.splice(i, 1)
            rrCounts.splice(i, 1)
            removed = true
            break
        }
    }

    if (!removed) {
        rrBroadcast(server, 'No hub found at this location.')
        return
    }

    saveHubs(server)
    saveCounts(server)
    setFinal(server, rrHubs.length > 0)

    rrBroadcast(server, 'Hub removed at ' + dim + ' ' + x + ' ' + y + ' ' + z)
}

function removeHubByIndex(server, idx) {
    idx = safeInt(idx, -1)
    if (idx < 0 || idx >= rrHubs.length) {
        rrBroadcast(server, 'Index out of range.')
        return
    }
    rrHubs.splice(idx, 1)
    rrCounts.splice(idx, 1)

    saveHubs(server)
    saveCounts(server)
    setFinal(server, rrHubs.length > 0)

    rrBroadcast(server, 'Removed hub index ' + idx)
}

function clearAll(server) {
    rrHubs = []
    rrCounts = []
    pd(server).putString(K_HUBS_JSON, '[]')
    pd(server).putString(K_COUNTS_JSON, '[]')
    setFinal(server, false)
    rrBroadcast(server, 'Cleared all hubs.')
}

// -------------------- actions --------------------
function actionEnable(server) {
    loadState(server)
    setEnabled(server, true)
    rrBroadcast(server, 'Enabled. Hubs=' + rrHubs.length)
}

function actionDisable(server) {
    setEnabled(server, false)
    rrBroadcast(server, 'Disabled.')
}

function actionStatus(server) {
    loadState(server)
    rrBroadcast(server,
                'Status: enabled=' + isEnabled(server) +
                ' hubs=' + (rrHubs ? rrHubs.length : 0) +
                ' final=' + isFinal(server)
    )
    var name = getNotifyName(server)
    if (name) sendHubListTo(server, name)
}

// -------------------- events --------------------
PlayerEvents.respawned(function (event) {
    var player = event.player
    var server = event.server

    if (!isEnabled(server)) return
        if (playerHasPersonalSpawn(player)) return

            if (!rrHubs || rrHubs.length === 0) loadState(server)
                if (!rrHubs || rrHubs.length === 0) return
                    if (!isFinal(server)) return

                        server.scheduleInTicks(1, function () {
                            if (!isEnabled(server)) return
                                if (!rrHubs || rrHubs.length === 0) return

                                    var idx = chooseLeastUsedHubIndex()
                                    if (idx < 0) return

                                        rrCounts[idx] = (rrCounts[idx] || 0) + 1
                                        saveCounts(server)

                                        teleportPlayerToHubAndFx(server, player, rrHubs[idx])
                        })
})

ServerEvents.tick(function (event) {
    var server = event.server
    try {
        var now = safeInt(server.tickCount, 0)
        var every = safeInt(FX_COUNTS_EVERY_TICKS, 200)
        if (every < 20) every = 20
            if (now % every === 0) saveCounts(server)
    } catch (e) {
        rrLog(server, 'tick crash: ' + e)
        throw e
    }
})

// -------------------- Brigadier commands --------------------
ServerEvents.commandRegistry(function (event) {
    var Commands = Java.loadClass('net.minecraft.commands.Commands')
    var IntegerArgumentType = Java.loadClass('com.mojang.brigadier.arguments.IntegerArgumentType')

    function srcPlayer(ctx) {
        try { return ctx.getSource().getPlayerOrException() } catch (e) { return null }
    }

    function srcServer(ctx) {
        try { return ctx.getSource().getServer() } catch (e) { return null }
    }

    function srcName(ctx) {
        var p = srcPlayer(ctx)
        if (!p) return ''
            try { return String(p.getName().getString()) } catch (e) { return '' }
    }

    event.register(
        Commands.literal('rrhubs')
        .requires(function (src) { return src.hasPermission(2) })

        .then(
            Commands.literal('enable')
            .executes(function (ctx) {
                var s = srcServer(ctx); if (!s) return 0
                var name = srcName(ctx); if (name) setNotifyName(s, name)
                actionEnable(s)
                return 1
            })
        )

        .then(
            Commands.literal('disable')
            .executes(function (ctx) {
                var s = srcServer(ctx); if (!s) return 0
                actionDisable(s)
                return 1
            })
        )

        .then(
            Commands.literal('status')
            .executes(function (ctx) {
                var s = srcServer(ctx); if (!s) return 0
                var name = srcName(ctx); if (name) setNotifyName(s, name)
                actionStatus(s)
                return 1
            })
        )

        .then(
            Commands.literal('list')
            .executes(function (ctx) {
                var s = srcServer(ctx); if (!s) return 0
                var name = srcName(ctx); if (!name) return 0
                loadState(s)
                sendHubListTo(s, name)
                return 1
            })
        )

        .then(
            Commands.literal('tp')
            .then(
                Commands.argument('index', IntegerArgumentType.integer(0, 255))
                .executes(function (ctx) {
                    var s = srcServer(ctx)
                    var p = srcPlayer(ctx)
                    if (!s || !p) return 0

                        loadState(s)
                        if (!rrHubs || rrHubs.length === 0) return 0

                            var idx = IntegerArgumentType.getInteger(ctx, 'index')
                            if (idx < 0 || idx >= rrHubs.length) return 0

                                teleportPlayerToHubAndFx(s, p, rrHubs[idx])
                                return 1
                })
            )
        )

        .then(
            Commands.literal('add_here')
            .executes(function (ctx) {
                var s = srcServer(ctx)
                var p = srcPlayer(ctx)
                if (!s || !p) return 0

                    loadState(s)
                    addHubAtPlayer(s, p)

                    var name = srcName(ctx)
                    if (name) sendHubListTo(s, name)
                        return 1
            })
        )

        .then(
            Commands.literal('remove_here')
            .executes(function (ctx) {
                var s = srcServer(ctx)
                var p = srcPlayer(ctx)
                if (!s || !p) return 0

                    loadState(s)
                    removeHubAtPlayer(s, p)

                    var name = srcName(ctx)
                    if (name) sendHubListTo(s, name)
                        return 1
            })
        )

        .then(
            Commands.literal('remove_index')
            .then(
                Commands.argument('index', IntegerArgumentType.integer(0, 255))
                .executes(function (ctx) {
                    var s = srcServer(ctx)
                    if (!s) return 0

                        loadState(s)
                        var idx = IntegerArgumentType.getInteger(ctx, 'index')
                        removeHubByIndex(s, idx)

                        var name = srcName(ctx)
                        if (name) sendHubListTo(s, name)
                            return 1
                })
            )
        )

        .then(
            Commands.literal('clear')
            .executes(function (ctx) {
                var s = srcServer(ctx); if (!s) return 0
                clearAll(s)

                var name = srcName(ctx)
                if (name) sendHubListTo(s, name)
                    return 1
            })
        )
    )
})

// Pack-test command for a bounded census of generated Overworld ore blocks.

var BcOreAuditRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')

var BC_LAYERED_ORE_HOSTS = {}
;[
    'beige_limestone', 'conglomerate', 'gabbro', 'granodiorite', 'grey_limestone',
    'limestone', 'mudstone', 'phyllite', 'pillow_basalt', 'quartzite', 'rhyolite',
    'schist', 'siltstone', 'slate',
    'weathered_rhyolite', 'white_granite'
].forEach(function (path) { BC_LAYERED_ORE_HOSTS['unearthed:' + path] = true })

var BC_FORBIDDEN_VANILLA_ORES = {
    'minecraft:coal_ore': true,
    'minecraft:deepslate_coal_ore': true,
    'minecraft:copper_ore': true,
    'minecraft:deepslate_copper_ore': true,
    'minecraft:iron_ore': true,
    'minecraft:deepslate_iron_ore': true,
    'minecraft:gold_ore': true,
    'minecraft:deepslate_gold_ore': true,
    'minecraft:redstone_ore': true,
    'minecraft:deepslate_redstone_ore': true,
    'minecraft:lapis_ore': true,
    'minecraft:deepslate_lapis_ore': true,
    'minecraft:diamond_ore': true,
    'minecraft:deepslate_diamond_ore': true,
    'minecraft:emerald_ore': true,
    'minecraft:deepslate_emerald_ore': true
}

function bcOreAuditRun(source, minChunkX, minChunkZ, maxChunkX, maxChunkZ) {
    var level = source.getLevel()
    var minY = level.getMinBuildHeight()
    var maxY = level.getMaxBuildHeight()
    var firstChunkX = Math.min(minChunkX, maxChunkX)
    var lastChunkX = Math.max(minChunkX, maxChunkX)
    var firstChunkZ = Math.min(minChunkZ, maxChunkZ)
    var lastChunkZ = Math.max(minChunkZ, maxChunkZ)
    var realisticBlocks = 0
    var vanillaBlocks = 0
    var vanillaCounts = {}
    var surfaceSamples = 0
    var uranium = 0
    var thorium = 0
    var osmiridium = 0
    var eligibleHosts = 0
    var families = {}
    for (var chunkX = firstChunkX; chunkX <= lastChunkX; chunkX++) {
        for (var chunkZ = firstChunkZ; chunkZ <= lastChunkZ; chunkZ++) {
            var sections = level.getChunk(chunkX, chunkZ).getSections()
            for (var sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
                sections[sectionIndex].getStates().count(function (state, count) {
                var id = String(BcOreAuditRegistries.BLOCK.getKey(state.getBlock()))
                if (BC_LAYERED_ORE_HOSTS[id] || id === 'minecraft:stone' || id === 'minecraft:deepslate') {
                    eligibleHosts += count
                }
                if (BC_FORBIDDEN_VANILLA_ORES[id]) {
                    vanillaBlocks += count
                    vanillaCounts[id] = (vanillaCounts[id] || 0) + count
                }
                if (id.indexOf('realisticores:crushed_') === 0 || id === 'realisticores:oil_seep') {
                    surfaceSamples += count
                    return
                }
                if (id.indexOf('realisticores:') !== 0) return
                realisticBlocks += count
                families[id] = true
                if (id.indexOf('uranium_ore') >= 0) uranium += count
                if (id.indexOf('thorium_ore') >= 0) thorium += count
                if (id.indexOf('osmiridium_lava_sulfide_ore') >= 0) osmiridium += count
                })
            }
        }
    }

    var familyCount = Object.keys(families).length
    var chunks = (lastChunkX - firstChunkX + 1) * (lastChunkZ - firstChunkZ + 1)
    var marker = '[BC-ORE-AUDIT]' +
        ' min_y=' + minY +
        ' max_y=' + maxY +
        ' chunks=' + chunks +
        ' realistic_ore_blocks=' + realisticBlocks +
        ' realistic_families=' + familyCount +
        ' vanilla_ore_blocks=' + vanillaBlocks +
        ' surface_samples=' + surfaceSamples +
        ' uranium=' + uranium +
        ' thorium=' + thorium +
        ' osmiridium=' + osmiridium +
        ' eligible_host_blocks=' + eligibleHosts
    console.info(marker)
    if (vanillaBlocks > 0) console.info('[BC-ORE-AUDIT-VANILLA] ' + JSON.stringify(vanillaCounts))
    source.sendSuccess(Component.literal(marker), false)
    return realisticBlocks
}

ServerEvents.commandRegistry(function (event) {
    var Commands = Java.loadClass('net.minecraft.commands.Commands')
    var IntegerArgumentType = Java.loadClass('com.mojang.brigadier.arguments.IntegerArgumentType')

    event.register(
        Commands.literal('bc_ore_audit')
        .requires(function (source) { return source.hasPermission(2) })
        .then(Commands.argument('minChunkX', IntegerArgumentType.integer())
        .then(Commands.argument('minChunkZ', IntegerArgumentType.integer())
        .then(Commands.argument('maxChunkX', IntegerArgumentType.integer())
        .then(Commands.argument('maxChunkZ', IntegerArgumentType.integer())
        .executes(function (ctx) {
            return bcOreAuditRun(
                ctx.getSource(),
                IntegerArgumentType.getInteger(ctx, 'minChunkX'),
                IntegerArgumentType.getInteger(ctx, 'minChunkZ'),
                IntegerArgumentType.getInteger(ctx, 'maxChunkX'),
                IntegerArgumentType.getInteger(ctx, 'maxChunkZ')
            )
        })))))
    )
})

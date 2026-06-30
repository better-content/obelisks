#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const defaultInstance = '/home/gerald/.local/share/PrismLauncher/instances/Better Content-Playtest 4 - v1/minecraft'
const args = process.argv.slice(2)
function arg(name, fallback = null) {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const instance = arg('--instance', process.env.BTM_INSTANCE || defaultInstance)
const logPath = arg('--log', path.join(instance, 'logs/latest.log'))
const baselinePath = arg('--baseline')
const outPath = arg('--out')
const profilePath = arg('--profile')

const logMonth = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 }
function parseLogTime(line) {
  const m = line.match(/^\[(\d{2})([A-Za-z]{3})(\d{4}) (\d{2}):(\d{2}):(\d{2})\.(\d{3})\]/)
  if (!m) return null
  return Date.UTC(Number(m[3]), logMonth[m[2]], Number(m[1]), Number(m[4]), Number(m[5]), Number(m[6]), Number(m[7]))
}
function walk(root, pred = () => true, out = []) {
  if (!fs.existsSync(root)) return out
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, ent.name)
    if (ent.isDirectory()) walk(p, pred, out)
    else if (pred(p)) out.push(p)
  }
  return out
}
function newestFile(files) {
  let best = null
  for (const file of files) {
    try {
      const stat = fs.statSync(file)
      if (!best || stat.mtimeMs > best.mtimeMs) best = { file, mtimeMs: stat.mtimeMs }
    } catch {}
  }
  return best
}
function dirStats(p) {
  if (!fs.existsSync(p)) return { bytes: 0, files: 0 }
  let bytes = 0
  let files = 0
  for (const f of walk(p)) {
    files++
    bytes += fs.statSync(f).size
  }
  return { bytes, files, mib: Math.round(bytes / 1024 / 1024 * 100) / 100 }
}
function readConfigValue(file, key) {
  if (!fs.existsSync(file)) return null
  const text = fs.readFileSync(file, 'utf8')
  const m = text.match(new RegExp(`${key}\\s*=\\s*([^\\n]+)`)) || text.match(new RegExp(`^\\s*${key}\\s*:\\s*([^\\n,]+)`, 'm'))
  return m ? m[1].trim().replace(/^"|"$/g, '') : null
}
function parseMetrics() {
  if (!fs.existsSync(logPath)) throw new Error(`missing log: ${logPath}`)
  const text = fs.readFileSync(logPath, 'utf8')
  const lines = text.split(/\r?\n/)
  const logStat = fs.statSync(logPath)
  const metrics = {
    logPath,
    logMtime: new Date(logStat.mtimeMs).toISOString(),
    logLines: lines.length,
    loadedMods: null,
    reachedIntegratedServer: text.includes('Starting integrated minecraft server'),
    startedServingLan: text.includes('Started serving on'),
    reachedInGame: text.includes('Time from main menu to in-game was') || text.includes('Started serving on'),
    mainMenuToInGameMs: null,
    totalLoadToWorldMs: null,
    spawnPrepTimeMs: null,
    serverTickBehindWarnings: 0,
    maxTickBehindMs: 0,
    totalTickBehindMs: 0,
    maxTickBehindTicks: 0,
    worldSaveDurationMs: null,
    worldSaveFromSavingWorldsMs: null,
    dimensionSaveCount: 0,
    distantHorizonsIncompleteTasks: 0,
    settlementRoadsRebuilds: 0,
    settlementRoadsMaxDiscoveredStructures: 0,
    settlementRoadsMaxConnections: 0,
    emiTotalReloadMs: null,
    emiSlowestPluginMs: 0,
    emiSlowestPlugin: null,
    patchouliPreloadedJsons: null,
    createInjectedRecipes: null,
    kubejsScriptLoadSeconds: 0,
    dumpDir: dirStats(path.join(instance, 'dump')),
    kubejsConfigDir: dirStats(path.join(instance, 'kubejs/config')),
    dhOverworldDb: dirStats(path.join(instance, 'saves/New World/data')),
    configSnapshot: {
      dh: {
        enableDistantGeneration: readConfigValue(path.join(instance, 'config/DistantHorizons.toml'), 'enableDistantGeneration'),
        distantGeneratorMode: readConfigValue(path.join(instance, 'config/DistantHorizons.toml'), 'distantGeneratorMode'),
        maxGenerationRequestDistance: readConfigValue(path.join(instance, 'config/DistantHorizons.toml'), 'maxGenerationRequestDistance'),
        maxSyncOnLoadRequestDistance: readConfigValue(path.join(instance, 'config/DistantHorizons.toml'), 'maxSyncOnLoadRequestDistance'),
        lodChunkRenderDistanceRadius: readConfigValue(path.join(instance, 'config/DistantHorizons.toml'), 'lodChunkRenderDistanceRadius'),
        maxHorizontalResolution: readConfigValue(path.join(instance, 'config/DistantHorizons.toml'), 'maxHorizontalResolution')
      },
      oculus: {
        enableShaders: readConfigValue(path.join(instance, 'config/oculus.properties'), 'enableShaders'),
        maxShadowRenderDistance: readConfigValue(path.join(instance, 'config/oculus.properties'), 'maxShadowRenderDistance')
      },
      spark: {
        backgroundProfiler: readConfigValue(path.join(instance, 'config/spark/config.json'), '"backgroundProfiler"')
      }
    }
  }
  let lastStoppingServerAt = null
  let lastSavingWorldsAt = null
  let saveDimensionCounter = 0
  let countingSaveDimensions = false
  for (const line of lines) {
    const at = parseLogTime(line)
    const mods = line.match(/Loading (\d+) mods:/)
    if (mods) metrics.loadedMods = Number(mods[1])
    const spawn = line.match(/Time elapsed: (\d+) ms/)
    if (spawn) metrics.spawnPrepTimeMs = Number(spawn[1])
    const inGame = line.match(/Time from main menu to in-game was ([\d.]+) seconds/)
    if (inGame) metrics.mainMenuToInGameMs = Math.round(Number(inGame[1]) * 1000)
    const totalLoad = line.match(/Total time to load game and open world was ([\d.]+) seconds/)
    if (totalLoad) metrics.totalLoadToWorldMs = Math.round(Number(totalLoad[1]) * 1000)
    const behind = line.match(/Can't keep up!.*Running (\d+)ms or (\d+) ticks behind/)
    if (behind) {
      const ms = Number(behind[1])
      const ticks = Number(behind[2])
      metrics.serverTickBehindWarnings++
      metrics.maxTickBehindMs = Math.max(metrics.maxTickBehindMs, ms)
      metrics.totalTickBehindMs += ms
      metrics.maxTickBehindTicks = Math.max(metrics.maxTickBehindTicks, ticks)
    }
    const dh = line.match(/World generator thread pool shutdown with \[(\d+)\] incomplete tasks/)
    if (dh) metrics.distantHorizonsIncompleteTasks = Math.max(metrics.distantHorizonsIncompleteTasks, Number(dh[1]))
    const roads = line.match(/Rebuilt world network: (\d+) discovered structures, (\d+) active structures, (\d+) connections/)
    if (roads) {
      metrics.settlementRoadsRebuilds++
      metrics.settlementRoadsMaxDiscoveredStructures = Math.max(metrics.settlementRoadsMaxDiscoveredStructures, Number(roads[1]))
      metrics.settlementRoadsMaxConnections = Math.max(metrics.settlementRoadsMaxConnections, Number(roads[3]))
    }
    const emiPlugin = line.match(/\[EMI\] Reloaded plugin from ([^ ]+) in (\d+)ms/)
    if (emiPlugin && Number(emiPlugin[2]) > metrics.emiSlowestPluginMs) {
      metrics.emiSlowestPlugin = emiPlugin[1]
      metrics.emiSlowestPluginMs = Number(emiPlugin[2])
    }
    const emiTotal = line.match(/\[EMI\] Reloaded EMI in (\d+)ms/)
    if (emiTotal) metrics.emiTotalReloadMs = Number(emiTotal[1])
    const patchouli = line.match(/preloaded (\d+) jsons/)
    if (patchouli) metrics.patchouliPreloadedJsons = Number(patchouli[1])
    const create = line.match(/Created (\d+) recipes which will be injected into the game/)
    if (create) metrics.createInjectedRecipes = Number(create[1])
    const script = line.match(/Loaded script .* in ([\d.]+) s/)
    if (script) metrics.kubejsScriptLoadSeconds += Number(script[1])
    if (line.includes('Stopping server') && at != null) {
      lastStoppingServerAt = at
      lastSavingWorldsAt = null
      saveDimensionCounter = 0
      countingSaveDimensions = true
    }
    if (line.includes('Saving worlds') && at != null) lastSavingWorldsAt = at
    if (countingSaveDimensions && line.includes("Saving chunks for level 'ServerLevel")) saveDimensionCounter++
    if (countingSaveDimensions && line.includes('ThreadedAnvilChunkStorage: All dimensions are saved') && at != null) {
      metrics.worldSaveDurationMs = lastStoppingServerAt == null ? null : at - lastStoppingServerAt
      metrics.worldSaveFromSavingWorldsMs = lastSavingWorldsAt == null ? null : at - lastSavingWorldsAt
      metrics.dimensionSaveCount = saveDimensionCounter
      countingSaveDimensions = false
    }
  }
  const newestCrash = newestFile(walk(path.join(instance, 'crash-reports'), p => /crash-.*\.txt$/.test(path.basename(p))))
  metrics.newestCrashReport = newestCrash ? path.basename(newestCrash.file) : null
  metrics.newestCrashReportAfterLatestLog = newestCrash ? newestCrash.mtimeMs > logStat.mtimeMs : false
  metrics.kubejsScriptLoadSeconds = Math.round(metrics.kubejsScriptLoadSeconds * 1000) / 1000
  if (profilePath && fs.existsSync(profilePath)) metrics.memoryProfile = parseMemoryProfile(profilePath)
  return metrics
}
function parseMemoryProfile(file) {
  const samples = fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => JSON.parse(line))
  let peak = null
  let first = null
  let last = null
  let lastNonZero = null
  for (const sample of samples) {
    if (!first) first = sample
    last = sample
    if (sample.rssKb > 0) lastNonZero = sample
    if (!peak || sample.rssKb > peak.rssKb) peak = sample
  }
  const toMib = kb => kb == null ? null : Math.round(kb / 1024)
  const toGib = kb => kb == null ? null : Math.round(kb / 1024 / 1024 * 100) / 100
  return {
    path: file,
    samples: samples.length,
    durationSeconds: first && last ? last.elapsed - first.elapsed : null,
    peakRssKb: peak?.rssKb ?? null,
    peakRssMiB: toMib(peak?.rssKb),
    peakRssGiB: toGib(peak?.rssKb),
    peakAtSeconds: peak?.elapsed ?? null,
    finalObservedRssKb: last?.rssKb ?? null,
    finalObservedRssMiB: toMib(last?.rssKb),
    finalObservedRssGiB: toGib(last?.rssKb),
    finalLiveRssKb: lastNonZero?.rssKb ?? null,
    finalLiveRssMiB: toMib(lastNonZero?.rssKb),
    finalLiveRssGiB: toGib(lastNonZero?.rssKb)
  }
}
function delta(after, before, key) {
  const a = after[key]
  const b = before[key]
  if (typeof a !== 'number' || typeof b !== 'number') return ''
  const d = a - b
  const pct = b === 0 ? '' : ` (${Math.round(d / b * 1000) / 10}%)`
  return `${d >= 0 ? '+' : ''}${d}${pct}`
}
function table(rows) {
  const widths = []
  for (const row of rows) row.forEach((cell, i) => { widths[i] = Math.max(widths[i] || 0, String(cell).length) })
  const line = row => '| ' + row.map((cell, i) => String(cell).padEnd(widths[i])).join(' | ') + ' |'
  return [line(rows[0]), line(rows[0].map((_, i) => '-'.repeat(Math.max(widths[i], 3)))), ...rows.slice(1).map(line)].join('\n') + '\n'
}
const metrics = parseMetrics()
let output = JSON.stringify(metrics, null, 2) + '\n'
if (baselinePath && fs.existsSync(baselinePath)) {
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
  const before = baseline.metrics || baseline
  const rows = [['Metric', 'Before', 'After', 'Delta']]
  for (const key of ['reachedIntegratedServer', 'reachedInGame', 'spawnPrepTimeMs', 'mainMenuToInGameMs', 'totalLoadToWorldMs', 'serverTickBehindWarnings', 'maxTickBehindMs', 'totalTickBehindMs', 'worldSaveDurationMs', 'dimensionSaveCount', 'distantHorizonsIncompleteTasks', 'emiTotalReloadMs', 'emiSlowestPluginMs', 'patchouliPreloadedJsons', 'createInjectedRecipes']) {
    rows.push([key, before[key] ?? '', metrics[key] ?? '', delta(metrics, before, key)])
  }
  const memoryRows = [['Metric', 'Before', 'After', 'Delta']]
  const beforeMemory = before.memoryProfile || {}
  const afterMemory = metrics.memoryProfile || {}
  for (const key of ['samples', 'durationSeconds', 'peakRssMiB', 'peakRssGiB', 'peakAtSeconds', 'finalLiveRssMiB', 'finalLiveRssGiB', 'finalObservedRssMiB']) {
    memoryRows.push([key, beforeMemory[key] ?? '', afterMemory[key] ?? '', delta(afterMemory, beforeMemory, key)])
  }
  const report = `# Memory A/B Runtime Report\n\nGenerated: ${new Date().toISOString()}\n\nInstance: \`${instance}\`\n\nBefore log: \`${before.logPath}\`\n\nAfter log: \`${metrics.logPath}\`\n\n## Runtime Metrics\n\n${table(rows)}\n## RSS Profile\n\n${table(memoryRows)}\n## Before Config\n\n\`\`\`json\n${JSON.stringify(before.configSnapshot, null, 2)}\n\`\`\`\n\n## After Config\n\n\`\`\`json\n${JSON.stringify(metrics.configSnapshot, null, 2)}\n\`\`\`\n`
  output = report
}
if (outPath) fs.writeFileSync(outPath, output)
else process.stdout.write(output)

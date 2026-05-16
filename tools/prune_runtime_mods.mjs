#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
let packRoot = process.cwd()
let targetDir = ''
let side = 'server'
let apply = false

function usage(message = '') {
  if (message) console.error(`ERROR: ${message}`)
  console.error('Usage: prune_runtime_mods.mjs --pack-root PATH --target-dir PATH --side server|client --dry-run|--apply')
  process.exit(message ? 2 : 0)
}

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '--pack-root') packRoot = args[++i] || usage('--pack-root needs a path')
  else if (arg === '--target-dir') targetDir = args[++i] || usage('--target-dir needs a path')
  else if (arg === '--side') side = args[++i] || usage('--side needs server or client')
  else if (arg === '--apply') apply = true
  else if (arg === '--dry-run') apply = false
  else if (arg === '-h' || arg === '--help') usage()
  else usage(`unknown argument: ${arg}`)
}

if (!['server', 'client'].includes(side)) usage('--side must be server or client')
if (!targetDir) usage('--target-dir is required')

const sourceModsDir = path.join(packRoot, 'mods')
const targetModsDir = path.join(targetDir, 'mods')

function read(file) { return fs.readFileSync(file, 'utf8') }
function listFiles(dir, predicate) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isFile() && (!predicate || predicate(entry.name)))
    .map(entry => entry.name)
}

function parsePwToml(file) {
  const text = read(file)
  const filename = text.match(/^filename\s*=\s*"([^"]+)"/m)?.[1] || ''
  const declaredSide = text.match(/^side\s*=\s*"([^"]+)"/m)?.[1] || 'both'
  return { filename, side: declaredSide }
}

function parseClientOnlyModGlobs() {
  const helper = path.join(packRoot, 'tools', '_runtime_common.sh')
  if (!fs.existsSync(helper)) return []
  const text = read(helper)
  const block = text.match(/btm_client_only_mod_globs=\(\s*([\s\S]*?)\s*\)/m)?.[1] || ''
  return [...block.matchAll(/"([^"]+)"/g)].map(match => match[1])
}

function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  return new RegExp(`^${escaped}$`, 'i')
}

function normalizeGlobSubject(value) {
  return value.toLowerCase().replace(/[^a-z0-9/*?]/g, '')
}

const rawClientOnlyGlobs = parseClientOnlyModGlobs()
const clientOnlyGlobs = rawClientOnlyGlobs.map(globToRegExp)
const normalizedClientOnlyGlobs = rawClientOnlyGlobs.map(glob => globToRegExp(normalizeGlobSubject(glob)))

function sideAllows(declaredSide) {
  return declaredSide === 'both' || declaredSide === side
}

function isExcludedOnServer(filename) {
  if (side !== 'server') return false
  const candidates = [filename, `mods/${filename}`]
  const normalizedCandidates = candidates.map(normalizeGlobSubject)
  return clientOnlyGlobs.some(regex => candidates.some(candidate => regex.test(candidate)))
    || normalizedClientOnlyGlobs.some(regex => normalizedCandidates.some(candidate => regex.test(candidate)))
}

const expected = new Set()
let excluded = 0
for (const file of listFiles(sourceModsDir, name => name.endsWith('.jar') || name.endsWith('.so'))) {
  if (isExcludedOnServer(file)) excluded++
  else expected.add(file)
}
for (const file of listFiles(sourceModsDir, name => name.endsWith('.pw.toml'))) {
  const parsed = parsePwToml(path.join(sourceModsDir, file))
  if (!parsed.filename || !sideAllows(parsed.side)) continue
  if (isExcludedOnServer(parsed.filename)) excluded++
  else expected.add(parsed.filename)
}

const actual = listFiles(targetModsDir, name => name.endsWith('.jar') || name.endsWith('.so'))
const unexpected = actual.filter(name => !expected.has(name)).sort()
const missing = [...expected].filter(name => !actual.includes(name)).sort()

for (const name of unexpected) {
  const fullPath = path.join(targetModsDir, name)
  console.log(`${apply ? 'remove' : 'would remove'} mods/${name}`)
  if (apply) fs.rmSync(fullPath, { force: true })
}

const finalActual = apply ? listFiles(targetModsDir, name => name.endsWith('.jar') || name.endsWith('.so')) : actual
const finalUnexpected = finalActual.filter(name => !expected.has(name)).sort()
const finalMissing = [...expected].filter(name => !finalActual.includes(name)).sort()

console.log(`runtime mod prune: side=${side} expected=${expected.size} actual=${finalActual.length} unexpected=${finalUnexpected.length} missing=${finalMissing.length} excluded=${excluded} removed=${apply ? unexpected.length : 0} mode=${apply ? 'apply' : 'dry-run'}`)
if (finalMissing.length) {
  console.log(`missing expected runtime mods: ${finalMissing.slice(0, 40).join(', ')}${finalMissing.length > 40 ? `, ... (${finalMissing.length - 40} more)` : ''}`)
}

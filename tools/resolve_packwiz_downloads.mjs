#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, copyFile, readdir, readFile, rename, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'

const args = parseArgs(process.argv.slice(2))
const root = path.resolve(args['pack-root'] || process.cwd())
const targetDir = path.resolve(required(args, 'target-dir'))
const cacheDir = path.resolve(args['cache-dir'] || path.join(root, 'generated', 'cache', 'packwiz-downloads'))
const side = args.side || 'both'
const apply = Boolean(args.apply)
const dryRun = Boolean(args['dry-run']) || !apply
const only = args.only ? new Set(String(args.only).split(',').map(s => s.trim()).filter(Boolean)) : null
const clientOnlyPatterns = [
  /^ambientsounds/i, /^bettergrassify/i, /^configured/i, /^controllable/i,
  /^controlling/i, /^embeddium/i,
  /^emi/i, /^entityculling/i, /^mouse-tweaks/i, /^no-more-popups/i,
  /^no-recipe-book/i, /^oculus/i, /^presence-footsteps/i, /^shoulder-surfing/i,
  /^sound-physics/i, /^the-one-probe/i,
]

if (!['server', 'client', 'both'].includes(side)) {
  die('--side must be server, client, or both')
}

const entries = []
for (const file of await packwizFiles(root)) {
  const meta = parsePackwizToml(await readFile(path.join(root, file), 'utf8'))
  meta.path = file
  meta.dir = path.dirname(file)
  if (!meta.filename) die(`${file}: missing filename`)
  if (only && !only.has(file) && !only.has(meta.filename)) continue
  if (!includeForSide(meta, side)) continue
  entries.push(meta)
}

let skipped = 0
let present = 0
let cached = 0
let downloaded = 0
for (const entry of entries) {
  const dest = path.join(targetDir, entry.dir, entry.filename)
  const cachePath = path.join(cacheDir, entry.dir, entry.filename)
  const ok = await existingOk(dest, entry)
  if (ok) {
    present += 1
    console.log(`present ${path.relative(targetDir, dest)}`)
    continue
  }
  const url = downloadUrl(entry)
  if (!url) {
    skipped += 1
    console.log(`skip ${entry.path}: no supported download URL`)
    continue
  }
  if (dryRun) {
    if (await existingOk(cachePath, entry)) {
      console.log(`would restore ${path.relative(targetDir, dest)} <- cache`)
    } else {
      console.log(`would download ${path.relative(targetDir, dest)} <- ${url}`)
    }
    continue
  }
  await mkdir(path.dirname(dest), { recursive: true })
  if (await existingOk(cachePath, entry)) {
    await restoreFromCache(cachePath, dest)
    cached += 1
    console.log(`cached ${path.relative(targetDir, dest)}`)
    continue
  }
  await mkdir(path.dirname(cachePath), { recursive: true })
  await download(url, cachePath)
  await assertHash(cachePath, entry)
  await restoreFromCache(cachePath, dest)
  downloaded += 1
  console.log(`downloaded ${path.relative(targetDir, dest)}`)
}

console.log(`packwiz downloads: entries=${entries.length} present=${present} cached=${cached} downloaded=${downloaded} skipped=${skipped} mode=${dryRun ? 'dry-run' : 'apply'} side=${side} cache=${cacheDir}`)

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--apply' || arg === '--dry-run') {
      out[arg.slice(2)] = true
    } else if (arg.startsWith('--')) {
      out[arg.slice(2)] = argv[++i]
    } else {
      die(`unknown argument: ${arg}`)
    }
  }
  return out
}

async function packwizFiles(root) {
  const files = []
  for (const dir of ['mods', 'resourcepacks', 'shaderpacks']) {
    const abs = path.join(root, dir)
    let entries = []
    try {
      entries = await readdir(abs, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.pw.toml')) files.push(path.join(dir, entry.name))
    }
  }
  return files.sort()
}

function required(map, key) {
  if (!map[key]) die(`--${key} is required`)
  return map[key]
}

function parsePackwizToml(text) {
  const meta = {}
  let section = ''
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim()
    if (!line) continue
    const sec = line.match(/^\[([^\]]+)\]$/)
    if (sec) {
      section = sec[1]
      continue
    }
    const kv = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/)
    if (!kv) continue
    const key = section ? `${section}.${kv[1]}` : kv[1]
    meta[key] = parseValue(kv[2])
  }
  meta.filename = meta.filename
  meta.side = meta.side || 'both'
  meta.mode = meta['download.mode'] || ''
  meta.url = meta['download.url'] || ''
  meta.hash = meta['download.hash'] || ''
  meta.hashFormat = meta['download.hash-format'] || ''
  meta.cfProject = meta['update.curseforge.project-id']
  meta.cfFile = meta['update.curseforge.file-id']
  return meta
}

function parseValue(value) {
  const trimmed = value.trim()
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"')
  }
  if (/^\d+$/.test(trimmed)) return Number(trimmed)
  return trimmed
}

function includeForSide(entry, wantedSide) {
  if (wantedSide === 'both') return true
  if (entry.side && entry.side !== 'both' && entry.side !== wantedSide) return false
  if (wantedSide === 'server') {
    return !clientOnlyPatterns.some(pattern => pattern.test(entry.filename) || pattern.test(path.basename(entry.path, '.pw.toml')))
  }
  return true
}

function downloadUrl(entry) {
  if (entry.url) return entry.url
  if (entry.mode === 'metadata:curseforge' && entry.cfProject && entry.cfFile) {
    return `https://www.curseforge.com/api/v1/mods/${entry.cfProject}/files/${entry.cfFile}/download`
  }
  return ''
}

async function existingOk(file, entry) {
  try {
    await stat(file)
  } catch {
    return false
  }
  if (!entry.hash || !entry.hashFormat) return true
  try {
    await assertHash(file, entry)
    return true
  } catch {
    return false
  }
}

async function download(url, dest) {
  const tmp = `${dest}.tmp-${process.pid}`
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'obelisks-agent-runtime/1.0' } })
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
    await pipeline(res.body, createWriteStream(tmp))
    await rename(tmp, dest)
  } catch (err) {
    await rm(tmp, { force: true }).catch(() => {})
    throw new Error(`download failed: ${url}: ${err.message}`)
  }
}

async function restoreFromCache(cachePath, dest) {
  if (path.resolve(cachePath) === path.resolve(dest)) return
  await copyFile(cachePath, dest)
}

async function assertHash(file, entry) {
  const algo = normalizeHash(entry.hashFormat)
  if (!algo || !entry.hash) return
  const buf = await readFile(file)
  const actual = createHash(algo).update(buf).digest('hex')
  if (actual.toLowerCase() !== String(entry.hash).toLowerCase()) {
    throw new Error(`${file}: ${algo} mismatch expected ${entry.hash} got ${actual}`)
  }
}

function normalizeHash(format) {
  const f = String(format || '').toLowerCase().replace(/-/g, '')
  if (['sha1', 'sha256', 'sha512', 'md5'].includes(f)) return f
  return ''
}

function die(message) {
  console.error(`ERROR: ${message}`)
  process.exit(2)
}

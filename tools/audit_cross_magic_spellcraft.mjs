#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const packRoot = process.cwd()
const defaultModsDir = fs.existsSync('/tmp/btm-magic-audit-mods/mods')
  ? '/tmp/btm-magic-audit-mods/mods'
  : path.join(packRoot, 'server-template', 'mods')
const modsDir = argValue('--mods-dir') || defaultModsDir
const outDir = argValue('--out-dir') || path.join(packRoot, 'generated', 'validation', 'cross_magic_spellcraft')

function argValue(name) {
  const idx = process.argv.indexOf(name)
  return idx >= 0 ? process.argv[idx + 1] : null
}

function jarEntries(jar) {
  return execFileSync('unzip', ['-Z1', jar], { encoding: 'utf8', maxBuffer: 80 * 1024 * 1024 })
    .split('\n')
    .filter(Boolean)
}

function readJarJson(jar, entry) {
  return JSON.parse(execFileSync('unzip', ['-p', jar, entry], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }))
}

function recipeOutputs(recipe) {
  const outputs = []
  const add = (value) => {
    if (!value) return
    if (typeof value === 'string') outputs.push(value)
    else if (value.item) outputs.push(value.item)
    else if (typeof value.result === 'string') outputs.push(value.result)
  }
  add(recipe.result)
  add(recipe.output)
  add(recipe.item_output)
  if (Array.isArray(recipe.results)) recipe.results.forEach(add)
  return outputs
}

function findJar(pattern) {
  const files = fs.readdirSync(modsDir).filter((file) => file.endsWith('.jar'))
  return files.find((file) => pattern.test(file))
}

fs.mkdirSync(outDir, { recursive: true })

const ironJarName = findJar(/irons[_-]spellbooks/i)
if (!ironJarName) throw new Error(`No Iron's Spells jar found in ${modsDir}`)

const ironJar = path.join(modsDir, ironJarName)
const ironEntries = jarEntries(ironJar)
const craftOutputs = []
const lootTables = []

for (const entry of ironEntries) {
  if (entry.startsWith('data/irons_spellbooks/recipes/') && entry.endsWith('.json')) {
    let recipe
    try { recipe = readJarJson(ironJar, entry) } catch { continue }
    const id = entry.replace('data/irons_spellbooks/recipes/', 'irons_spellbooks:').replace(/\.json$/, '')
    for (const output of recipeOutputs(recipe)) {
      if (output.startsWith('irons_spellbooks:')) {
        craftOutputs.push({ id, type: recipe.type || 'UNKNOWN', output })
      }
    }
  }

  if (entry.startsWith('data/irons_spellbooks/loot_tables/') && entry.endsWith('.json')) {
    const raw = execFileSync('unzip', ['-p', ironJar, entry], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
    if (raw.includes('irons_spellbooks')) {
      lootTables.push(entry.replace('data/', '').replace('/loot_tables/', ':').replace(/\.json$/, ''))
    }
  }
}

const magicRecipeTypes = {}
for (const jarName of fs.readdirSync(modsDir).filter((file) => file.endsWith('.jar'))) {
  if (!/(ars|bloodmagic|hexerei|malum|occultism|goety|forbidden|reliquary)/i.test(jarName)) continue
  const jar = path.join(modsDir, jarName)
  for (const entry of jarEntries(jar)) {
    if (!entry.includes('/recipes/') || !entry.endsWith('.json')) continue
    let recipe
    try { recipe = readJarJson(jar, entry) } catch { continue }
    const type = recipe.type || 'UNKNOWN'
    if (!magicRecipeTypes[type]) magicRecipeTypes[type] = { jar: jarName, example: entry, count: 0 }
    magicRecipeTypes[type].count += 1
  }
}

const summary = {
  modsDir,
  ironJar: ironJarName,
  generatedAt: new Date().toISOString(),
  ironCraftOutputs: craftOutputs.length,
  uniqueIronCraftOutputs: new Set(craftOutputs.map((row) => row.output)).size,
  ironLootTablesWithIronEntries: lootTables.length,
  magicRecipeTypeCount: Object.keys(magicRecipeTypes).length,
  craftOutputs,
  lootTables,
  magicRecipeTypes
}

fs.writeFileSync(path.join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
fs.writeFileSync(path.join(outDir, 'summary.md'), [
  '# Cross-Magic Spellcraft Audit',
  '',
  `- Mods dir: \`${modsDir}\``,
  `- Iron's Spells jar: \`${ironJarName}\``,
  `- Iron craft output rows: ${summary.ironCraftOutputs}`,
  `- Unique Iron craft outputs: ${summary.uniqueIronCraftOutputs}`,
  `- Iron loot tables with Iron entries: ${summary.ironLootTablesWithIronEntries}`,
  `- Magic recipe types observed: ${summary.magicRecipeTypeCount}`,
  '',
  'Generated validation output only; concise conclusions belong in `docs/runtime_validation.md` when needed.'
].join('\n') + '\n')

console.log(`Wrote ${path.join(outDir, 'summary.json')}`)

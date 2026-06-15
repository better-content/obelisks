#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const chapterDir = path.join(root, 'config/ftbquests/quests/chapters')

const deps = {
  starting_out: {
    SO_LIGHT: ['SO_BACKPACK'],
    SO_WATER: ['SO_BACKPACK'],
    SO_SEWING: ['SO_BACKPACK'],
    SO_COOKING: ['SO_WATER'],
    SO_TINKER: ['SO_LIGHT'],
    SO_PARTS: ['SO_TINKER'],
    SO_CRAFTING: ['SO_TINKER'],
    SO_HOOK: ['SO_BACKPACK'],
    SO_TNT: ['SO_PARTS'],
    SO_NETHER: ['SO_LIGHT', 'SO_WATER', 'SO_COOKING'],
    SO_GROUT: ['SO_NETHER', 'SO_PARTS'],
    SO_MELTERY: ['SO_GROUT']
  },
  tinkers_construct: {
    TC_SEARED_CASE: ['SO_MELTERY'],
    TC_SMELTERY: ['TC_SEARED_CASE'],
    TC_FOUNDRY: ['TC_SMELTERY']
  },
  create_i: {
    C1_ALLOY: ['TC_FOUNDRY'],
    C1_CRANK: ['C1_ALLOY'],
    C1_MILL: ['C1_CRANK'],
    C1_DEPLOYER: ['C1_MILL'],
    C1_CASING: ['C1_DEPLOYER'],
    C1_POWER: ['C1_CASING'],
    C1_WATER: ['C1_POWER'],
    C1_CRUSHED: ['C1_WATER']
  },
  create_ii: {
    C2_ANDESITE_CASE: ['C1_CRUSHED'],
    C2_PRESS: ['C2_ANDESITE_CASE'],
    C2_MIXER: ['C2_PRESS'],
    C2_BRASS: ['C2_MIXER']
  },
  death: {
    DE_HEART: ['SO_WATER', 'SO_COOKING'],
    DE_ALTAR: ['DE_HEART'],
    DE_WEAK_HEART: ['DE_ALTAR'],
    DE_WEAK_ORB: ['DE_WEAK_HEART']
  },
  magic_i: {
    M1_BLANK: ['DE_WEAK_ORB'],
    M1_HEXEREI: ['M1_BLANK'],
    M1_REINFORCED: ['M1_HEXEREI'],
    M1_ARS: ['M1_REINFORCED']
  },
  adventuring: {
    AD_ROUTE: ['SO_NETHER'],
    AD_COIN: ['AD_ROUTE']
  },
  synthesis_i: {
    S1_VAT: ['C2_BRASS', 'TC_FOUNDRY'],
    S1_TUBE: ['S1_VAT'],
    S1_CENTRIFUGE: ['S1_TUBE'],
    S1_SAMPLE: ['S1_CENTRIFUGE']
  },
  electricity: {
    PG_CONDUCTIVE: ['C2_BRASS'],
    PG_CASE: ['PG_CONDUCTIVE'],
    PG_BATTERY: ['PG_CASE']
  },
  oc2r: {
    OC_TRANSISTOR: ['PG_BATTERY'],
    OC_COMPUTER: ['OC_TRANSISTOR'],
    OC_NETWORK: ['OC_COMPUTER']
  },
  space: {
    SP_TABLE: ['OC_NETWORK'],
    SP_CASE: ['SP_TABLE'],
    SP_CHEM: ['SP_CASE']
  },
  ae2: {
    AE_CASE: ['SP_CHEM'],
    AE_CONTROLLER: ['AE_CASE'],
    AE_DRIVE: ['AE_CONTROLLER']
  }
}

function depText(list) {
  return 'dependencies:[' + list.map(x => `"${x}"`).join(',') + '] hide_until_deps_complete:true'
}

for (const [chapter, map] of Object.entries(deps)) {
  const file = path.join(chapterDir, `${chapter}.snbt`)
  let text = fs.readFileSync(file, 'utf8')
  for (const [quest, list] of Object.entries(map)) {
    const re = new RegExp(`(\\{id:\"${quest}\"[^}]*?)(?:\\s+dependencies:\\[[^\\]]*\\])?(?:\\s+hide_until_deps_complete:(?:true|false))?(\\s+title:)`)
    if (!re.test(text)) throw new Error(`Could not locate quest ${quest} in ${file}`)
    text = text.replace(re, `$1 ${depText(list)}$2`)
  }
  fs.writeFileSync(file, text)
}

console.log('applied quest dependencies')

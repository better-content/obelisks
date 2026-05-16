#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HARD_PATTERNS = [
  {
    key: 'kubejs_recipe_parse_error',
    label: 'KubeJS recipe parse errors',
    pattern: /Error parsing recipe/i
  },
  {
    key: 'invalid_empty_fluid',
    label: 'Invalid empty fluid errors',
    pattern: /Invalid empty fluid/i
  },
  {
    key: 'crash_report_marker',
    label: 'Crash report markers',
    pattern: /crash report|this crash report has been saved|preparing crash report/i
  },
  {
    key: 'jvm_fatal',
    label: 'JVM fatal errors',
    pattern: /OutOfMemoryError|hs_err_pid|fatal error has been detected/i
  },
  {
    key: 'modernfix_watchdog',
    label: 'ModernFix watchdog signatures',
    pattern: /modernfix.*watchdog|watchdog.*modernfix|server thread dump/i
  },
  {
    key: 'c2me_thread_guard',
    label: 'C2ME/thread-guard signatures',
    pattern: /(ThreadingDetector|PalettedContainer|BulkSectionAccess|safe.?random|random.*wrong thread|accessing legacyrandomsource|CheckedThreadLocalRandom|Chunk not there when requested).*\b(Exception|Error|FATAL|ReportedException|IllegalStateException)\b|\b(Exception|Error|FATAL|ReportedException|IllegalStateException)\b.*(ThreadingDetector|PalettedContainer|BulkSectionAccess|safe.?random|random.*wrong thread|accessing legacyrandomsource|CheckedThreadLocalRandom|Chunk not there when requested)/i
  }
]

function exists(file) {
  return fs.existsSync(file)
}

function walk(root, pred = () => true, out = []) {
  if (!exists(root)) return out
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

function addMatch(findings, key, label, lineNumber, line) {
  if (!findings[key]) findings[key] = { key, label, count: 0, matches: [] }
  findings[key].count++
  if (findings[key].matches.length < 20) findings[key].matches.push({ lineNumber, line })
}

export function scanHardFailures(options) {
  const logPath = options.logPath
  const instanceDir = options.instanceDir || null
  if (!logPath || !exists(logPath)) {
    return {
      ok: false,
      logPath,
      instanceDir,
      failedRecipeCount: null,
      parseErrorCount: 0,
      findings: [{
        key: 'missing_log',
        label: 'Missing log',
        count: 1,
        matches: [{ lineNumber: 0, line: `missing log: ${logPath || 'UNKNOWN'}` }]
      }]
    }
  }

  const text = fs.readFileSync(logPath, 'utf8')
  const lines = text.split(/\r?\n/)
  const findingsByKey = {}
  let failedRecipeCount = 0
  let parseErrorCount = 0

  lines.forEach((line, index) => {
    const lineNumber = index + 1
    if (/Error parsing recipe/i.test(line)) parseErrorCount++
    const failedRecipes = line.match(/with (\d+) failed recipes/i)
    if (failedRecipes && Number(failedRecipes[1]) > 0) {
      failedRecipeCount = Math.max(failedRecipeCount, Number(failedRecipes[1]))
      addMatch(findingsByKey, 'kubejs_failed_recipes', 'KubeJS failed recipe count', lineNumber, line)
    }
    for (const entry of HARD_PATTERNS) {
      if (entry.pattern.test(line)) addMatch(findingsByKey, entry.key, entry.label, lineNumber, line)
    }
  })

  if (instanceDir) {
    const crashFiles = walk(path.join(instanceDir, 'crash-reports'), p => /crash-.*\.txt$/.test(path.basename(p)))
    const newestCrash = newestFile(crashFiles)
    if (newestCrash) {
      const logStat = fs.statSync(logPath)
      if (newestCrash.mtimeMs > logStat.mtimeMs) {
        addMatch(
          findingsByKey,
          'newer_crash_report',
          'Crash report newer than log',
          0,
          path.relative(instanceDir, newestCrash.file)
        )
      }
    }
  }

  const findings = Object.values(findingsByKey)
  return {
    ok: findings.length === 0,
    logPath,
    instanceDir,
    failedRecipeCount,
    parseErrorCount,
    findings
  }
}

function argValue(args, name, fallback = null) {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}

function printText(result) {
  if (result.ok) {
    console.log(`ok - hard log failure scan (${result.logPath})`)
    console.log(`ok - KubeJS recipe parse health (${result.parseErrorCount} parse errors, ${result.failedRecipeCount} failed recipes)`)
    return
  }
  console.error(`FAIL - hard log failure scan (${result.logPath || 'UNKNOWN'})`)
  for (const finding of result.findings) {
    console.error(`FAIL - ${finding.label}: ${finding.count}`)
    for (const match of finding.matches) {
      const prefix = match.lineNumber ? `${match.lineNumber}:` : ''
      console.error(`  ${prefix}${match.line}`)
    }
  }
}

function main() {
  const args = process.argv.slice(2)
  const logPath = argValue(args, '--log')
  const instanceDir = argValue(args, '--instance')
  const json = args.includes('--json')
  const result = scanHardFailures({ logPath, instanceDir })
  if (json) console.log(JSON.stringify(result, null, 2))
  else printText(result)
  return result.ok ? 0 : 1
}

const thisFile = fileURLToPath(import.meta.url)
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  process.exitCode = main()
}

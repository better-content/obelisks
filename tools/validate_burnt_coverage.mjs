#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const REPO_ROOT = process.cwd();
const MOD_DIRS = [
  path.join(REPO_ROOT, 'generated', 'cache', 'packwiz-downloads', 'mods'),
  path.join(REPO_ROOT, 'mods'),
];
const MAINTAINED_TAG_IDS = [
  'burnt:plants_will_burn',
  'burnt:grass_blocks',
  'burnt:fire_resistant',
  'minecraft:logs',
  'minecraft:logs_that_burn',
  'minecraft:planks',
  'minecraft:leaves',
  'minecraft:crops',
  'minecraft:wooden_buttons',
  'minecraft:wooden_pressure_plates',
  'minecraft:wooden_doors',
  'minecraft:wooden_trapdoors',
  'minecraft:wooden_fences',
  'minecraft:fence_gates',
  'minecraft:wooden_slabs',
  'minecraft:wooden_stairs',
  'forge:mushroom_blocks',
  'minecraft:wool_carpets',
];
const EMITTER_DEPENDENCIES = new Map([
  ['burnt:burning_grass', ['burnt:grass_blocks']],
  ['burnt:burning_logs', ['minecraft:logs', 'minecraft:logs_that_burn']],
  ['burnt:burning_stripped_logs', ['minecraft:logs', 'minecraft:logs_that_burn']],
  ['burnt:burning_stripped_wood', ['minecraft:logs', 'minecraft:logs_that_burn']],
  ['burnt:burning_wood', ['minecraft:logs', 'minecraft:logs_that_burn']],
  ['burnt:burning_planks', ['minecraft:planks']],
  ['burnt:burning_leaves', ['minecraft:leaves']],
  ['burnt:burning_doors', ['minecraft:wooden_doors']],
  ['burnt:burning_fences', ['minecraft:wooden_fences']],
  ['burnt:burning_fence_gates', ['minecraft:fence_gates']],
  ['burnt:burning_slabs', ['minecraft:wooden_slabs']],
  ['burnt:burning_stairs', ['minecraft:wooden_stairs']],
  ['burnt:stairs_fire', ['minecraft:wooden_stairs']],
  ['burnt:wood_fire', ['minecraft:logs', 'minecraft:planks']],
]);

function fail(message) {
  console.error(`FAIL - ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function localTagPath(tagId) {
  const [namespace, localName] = tagId.split(':');
  return path.join(REPO_ROOT, 'kubejs', 'data', namespace, 'tags', 'blocks', `${localName}.json`);
}

function localTagIds() {
  const root = path.join(REPO_ROOT, 'kubejs', 'data');
  const tagIds = new Set();
  if (!fs.existsSync(root)) {
    return tagIds;
  }

  for (const namespace of fs.readdirSync(root)) {
    const tagDir = path.join(root, namespace, 'tags', 'blocks');
    if (!fs.existsSync(tagDir)) {
      continue;
    }
    for (const entry of fs.readdirSync(tagDir)) {
      if (entry.endsWith('.json')) {
        tagIds.add(`${namespace}:${entry.slice(0, -'.json'.length)}`);
      }
    }
  }

  return tagIds;
}

function upstreamTagIds() {
  const tagIds = new Set();
  for (const modDir of MOD_DIRS) {
    if (!fs.existsSync(modDir)) {
      continue;
    }
    for (const entry of fs.readdirSync(modDir)) {
      if (!entry.endsWith('.jar')) {
        continue;
      }
      const jarPath = path.join(modDir, entry);
      const result = spawnSync('jar', ['tf', jarPath], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      if (result.status !== 0) {
        fail(`could not read tag list from ${jarPath}: ${result.stderr || result.stdout}`);
      }
      for (const line of result.stdout.split('\n')) {
        const match = line.match(/^data\/([^/]+)\/tags\/blocks\/(.+)\.json$/);
        if (match) {
          tagIds.add(`${match[1]}:${match[2]}`);
        }
      }
    }
  }
  return tagIds;
}

function maintainedTagValues(tagId) {
  const filePath = localTagPath(tagId);
  if (!fs.existsSync(filePath)) {
    fail(`maintained tag file is missing: ${path.relative(REPO_ROOT, filePath)}`);
  }
  const parsed = readJson(filePath);
  const values = Array.isArray(parsed.values) ? parsed.values.filter((value) => typeof value === 'string') : [];
  if (values.length === 0) {
    fail(`maintained tag is empty: ${tagId}`);
  }
  return values;
}

function extractConfigTagRefs() {
  const configFiles = [
    ...fs.readdirSync(path.join(REPO_ROOT, 'config', 'adpother', 'Emitters'))
      .filter((name) => name.startsWith('burnt$') && name.endsWith('.cfg'))
      .map((name) => path.join(REPO_ROOT, 'config', 'adpother', 'Emitters', name)),
    path.join(REPO_ROOT, 'config', 'adpother', 'Breakables', 'burnt$burnt_blocks.cfg'),
  ];

  const refs = [];
  for (const filePath of configFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const match of content.matchAll(/S:id=(#[A-Za-z0-9_:.\/-]+)/g)) {
      refs.push({
        filePath,
        tagId: match[1].slice(1),
      });
    }
  }
  return refs;
}

function runSyncCheck() {
  const result = spawnSync('node', ['tools/sync_burnt_coverage_tags.mjs', '--check'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  if (result.status !== 0) {
    fail(`burnt sync check drifted or failed\n${output}`);
  }
  const missingMatch = output.match(/missing_rows\t(\d+)/);
  const missingRows = missingMatch ? Number(missingMatch[1]) : Number.NaN;
  if (!Number.isInteger(missingRows)) {
    fail(`burnt sync check did not report missing_rows\n${output}`);
  }
  if (missingRows !== 0) {
    fail(`burnt sync check reported ${missingRows} unresolved high-confidence rows`);
  }
  console.log('ok - burnt sync check');
}

function main() {
  runSyncCheck();

  const localTags = localTagIds();
  const upstreamTags = upstreamTagIds();
  const allTags = new Set([...localTags, ...upstreamTags]);
  const maintainedValues = new Map();

  for (const tagId of MAINTAINED_TAG_IDS) {
    maintainedValues.set(tagId, maintainedTagValues(tagId));
  }
  console.log(`ok - maintained Burnt compatibility tags (${MAINTAINED_TAG_IDS.length})`);

  for (const ref of extractConfigTagRefs()) {
    if (!allTags.has(ref.tagId)) {
      fail(`adpother references missing tag ${ref.tagId} in ${path.relative(REPO_ROOT, ref.filePath)}`);
    }
    for (const dependency of EMITTER_DEPENDENCIES.get(ref.tagId) ?? []) {
      const values = maintainedValues.get(dependency);
      if (!values || values.length === 0) {
        fail(`adpother tag ${ref.tagId} depends on empty maintained tag ${dependency}`);
      }
    }
  }
  console.log('ok - adpother Burnt tag references resolve');
}

main();

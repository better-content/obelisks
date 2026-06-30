#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const REPO_ROOT = process.cwd();
const GENERATED_DIR = path.join(REPO_ROOT, 'generated', 'runtime-dumps');
const DEFAULT_RECOMMENDATIONS = path.join(
  GENERATED_DIR,
  'burnt-coverage-recommended-tags-high-confidence.json'
);
const DEFAULT_EVIDENCE = path.join(
  GENERATED_DIR,
  'burnt-coverage-missing-high-confidence.tsv'
);
const DEFAULT_CURRENT_COVERED = path.join(
  GENERATED_DIR,
  'burnt-coverage-current-covered.tsv'
);
const DEFAULT_BLOCK_EXCLUSIONS = path.join(REPO_ROOT, 'tools', 'burnt_coverage_block_tag_exclusions.json');

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

const CATEGORY_ROUTES = new Map([
  ['grass_blocks', ['burnt:grass_blocks']],
  ['plants_will_burn', ['burnt:plants_will_burn']],
  ['fire_resistant', ['burnt:fire_resistant']],
  ['logs_that_burn', ['minecraft:logs_that_burn', 'minecraft:logs']],
  ['planks', ['minecraft:planks']],
  ['leaves', ['minecraft:leaves']],
  ['crops', ['minecraft:crops', 'burnt:plants_will_burn']],
  ['wooden_buttons', ['minecraft:wooden_buttons']],
  ['wooden_pressure_plates', ['minecraft:wooden_pressure_plates']],
  ['wooden_doors', ['minecraft:wooden_doors']],
  ['wooden_trapdoors', ['minecraft:wooden_trapdoors']],
  ['wooden_fences', ['minecraft:wooden_fences']],
  ['fence_gates', ['minecraft:fence_gates']],
  ['wooden_slabs', ['minecraft:wooden_slabs']],
  ['wooden_stairs', ['minecraft:wooden_stairs']],
  ['mushroom_blocks', ['forge:mushroom_blocks']],
  ['carpets', ['minecraft:wool_carpets']],
]);

const SUPPLEMENTAL_RECOMMENDATION_CATEGORIES = new Map([
  ['minecraft:logs', 'logs_that_burn'],
  ['minecraft:logs_that_burn', 'logs_that_burn'],
  ['minecraft:planks', 'planks'],
  ['minecraft:leaves', 'leaves'],
  ['minecraft:wooden_buttons', 'wooden_buttons'],
  ['minecraft:wooden_pressure_plates', 'wooden_pressure_plates'],
  ['minecraft:wooden_doors', 'wooden_doors'],
  ['minecraft:wooden_trapdoors', 'wooden_trapdoors'],
  ['minecraft:wooden_fences', 'wooden_fences'],
  ['minecraft:fence_gates', 'fence_gates'],
  ['minecraft:wooden_slabs', 'wooden_slabs'],
  ['minecraft:wooden_stairs', 'wooden_stairs'],
  ['forge:mushroom_blocks', 'mushroom_blocks'],
  ['minecraft:wool_carpets', 'carpets'],
]);

const WOOD_CATEGORIES = new Set([
  'logs_that_burn',
  'planks',
  'wooden_buttons',
  'wooden_pressure_plates',
  'wooden_doors',
  'wooden_trapdoors',
  'wooden_fences',
  'fence_gates',
  'wooden_slabs',
  'wooden_stairs',
]);

const WOOD_ANCHOR_CATEGORIES = new Set([
  'logs_that_burn',
  'planks',
  'wooden_doors',
  'wooden_trapdoors',
  'wooden_fences',
  'fence_gates',
]);

const WOOD_SUFFIXES = new Map([
  ['logs_that_burn', ['_log', '_wood', '_stem', '_hyphae', '_branch']],
  ['planks', ['_planks']],
  ['wooden_buttons', ['_button']],
  ['wooden_pressure_plates', ['_pressure_plate']],
  ['wooden_doors', ['_door']],
  ['wooden_trapdoors', ['_trapdoor']],
  ['wooden_fences', ['_fence']],
  ['fence_gates', ['_fence_gate', '_fencegate']],
  ['wooden_slabs', ['_slab']],
  ['wooden_stairs', ['_stairs']],
]);

const HIGH_CONFIDENCE_NAMESPACES = new Set(['manual', 'supplemental']);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    recommendations: DEFAULT_RECOMMENDATIONS,
    evidence: DEFAULT_EVIDENCE,
    blockExclusions: DEFAULT_BLOCK_EXCLUSIONS,
    write: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--recommendations') {
      options.recommendations = path.resolve(REPO_ROOT, argv[i + 1] ?? '');
      i += 1;
      continue;
    }
    if (arg === '--evidence') {
      options.evidence = path.resolve(REPO_ROOT, argv[i + 1] ?? '');
      i += 1;
      continue;
    }
    if (arg === '--block-exclusions') {
      options.blockExclusions = path.resolve(REPO_ROOT, argv[i + 1] ?? '');
      i += 1;
      continue;
    }
    if (arg === '--check') {
      options.write = false;
      continue;
    }
    fail(`Unknown argument: ${arg}`);
  }

  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function tagToFilePath(tagId) {
  const [namespace, tagPath] = tagId.split(':');
  if (!namespace || !tagPath) {
    fail(`Invalid tag id: ${tagId}`);
  }
  return path.join(REPO_ROOT, 'kubejs', 'data', namespace, 'tags', 'blocks', `${tagPath}.json`);
}

function loadTagFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { replace: false, values: [] };
  }

  const parsed = readJson(filePath);
  const values = Array.isArray(parsed.values) ? parsed.values.filter((value) => typeof value === 'string') : [];
  return {
    replace: parsed.replace === true,
    values,
  };
}

function sortUnique(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function collectKnownModBlockIds() {
  const blockIds = new Set();
  const modDirs = [
    path.join(REPO_ROOT, 'generated', 'cache', 'packwiz-downloads', 'mods'),
    path.join(REPO_ROOT, 'mods'),
  ];

  for (const modDir of modDirs) {
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
        fail(`Could not list jar contents for ${jarPath}: ${result.stderr || result.stdout}`);
      }
      for (const fileName of result.stdout.split('\n')) {
        const match = fileName.match(/^assets\/([^/]+)\/blockstates\/(.+)\.json$/);
        if (match) {
          blockIds.add(`${match[1]}:${match[2]}`);
        }
      }
    }
  }

  const kubejsAssets = path.join(REPO_ROOT, 'kubejs', 'assets');
  if (!fs.existsSync(kubejsAssets)) {
    return blockIds;
  }

  const stack = [kubejsAssets];
  while (stack.length > 0) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      const relative = path.relative(kubejsAssets, fullPath).replaceAll(path.sep, '/');
      const match = relative.match(/^([^/]+)\/blockstates\/(.+)\.json$/);
      if (match) {
        blockIds.add(`${match[1]}:${match[2]}`);
      }
    }
  }

  return blockIds;
}

function readBlockExclusions(filePath) {
  if (!fs.existsSync(filePath)) {
    return new Map();
  }

  const raw = readJson(filePath);
  if (Array.isArray(raw)) {
    return new Map(raw.map((value) => [value, 'legacy exclusion']));
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    fail(`Expected object map or string array in ${filePath}`);
  }

  const exclusions = new Map();
  for (const [blockId, reason] of Object.entries(raw)) {
    if (typeof reason !== 'string' || !reason.trim()) {
      fail(`Expected non-empty exclusion reason for ${blockId} in ${filePath}`);
    }
    exclusions.set(blockId, reason.trim());
  }
  return exclusions;
}

function parseEvidence(tsvPath) {
  if (!fs.existsSync(tsvPath)) {
    return [];
  }

  const content = fs.readFileSync(tsvPath, 'utf8').trim();
  if (!content) {
    return [];
  }

  const lines = content.split('\n');
  const header = lines.shift();
  const expectedHeaders = new Set([
    'block_id\tcategory\trecommended_tags\tnamespace\tsources',
    'block_id\tcategory\trecommended_tags\tmatched_tags\tnamespace\tsources',
    'block_id\tcategory\tmatched_tags\tnamespace\tsources',
  ]);
  if (!expectedHeaders.has(header)) {
    fail(`Unexpected evidence header in ${tsvPath}: ${header}`);
  }

  return lines.filter(Boolean).map((line) => {
    const fields = line.split('\t');
    if (header === 'block_id\tcategory\trecommended_tags\tmatched_tags\tnamespace\tsources') {
      const [blockId, category, recommendedTags, matchedTags, namespace, sources] = fields;
      return { blockId, category, recommendedTags, matchedTags, namespace, sources };
    }
    if (header === 'block_id\tcategory\tmatched_tags\tnamespace\tsources') {
      const [blockId, category, matchedTags, namespace, sources] = fields;
      return { blockId, category, recommendedTags: matchedTags, matchedTags, namespace, sources };
    }
    const [blockId, category, recommendedTags, namespace, sources] = fields;
    return { blockId, category, recommendedTags, matchedTags: '', namespace, sources };
  });
}

function normalizeCurrentCoveredPath(primaryPath) {
  return path.resolve(primaryPath) === path.resolve(DEFAULT_CURRENT_COVERED);
}

function collectEvidenceRows(primaryPath, recommendations) {
  const evidenceRows = [];
  const byBlockId = new Map();
  const seenPair = new Set();

  const addRow = (row) => {
    if (!row.blockId || byBlockId.has(row.blockId)) {
      return;
    }
    byBlockId.set(row.blockId, row);
    evidenceRows.push(row);
  };

  const allEvidence = [...parseEvidence(DEFAULT_CURRENT_COVERED)];
  if (!normalizeCurrentCoveredPath(primaryPath)) {
    allEvidence.push(...parseEvidence(primaryPath));
  }

  for (const row of allEvidence) {
    addRow(row);
    seenPair.add(`${row.blockId}\0${row.category}`);
  }

  for (const [tagId, blockIds] of Object.entries(recommendations)) {
    const category = SUPPLEMENTAL_RECOMMENDATION_CATEGORIES.get(tagId);
    if (!category || !Array.isArray(blockIds)) {
      continue;
    }
    for (const blockId of blockIds) {
      if (typeof blockId !== 'string') {
        continue;
      }
      const key = `${blockId}\0${category}`;
      if (seenPair.has(key) || byBlockId.has(blockId)) {
        continue;
      }
      addRow({
        blockId,
        category,
        recommendedTags: tagId,
        matchedTags: '',
        namespace: 'supplemental',
        sources: path.basename(DEFAULT_RECOMMENDATIONS),
      });
      seenPair.add(key);
    }
  }

  return evidenceRows;
}

function inferWoodSetKey(blockId, category) {
  if (!WOOD_CATEGORIES.has(category)) {
    return null;
  }

  const [namespace, localName] = blockId.split(':');
  if (!namespace || !localName) {
    return null;
  }

  const normalized = localName
    .replace(/^stripped_/, '')
    .replace(/^hollow_/, '');

  for (const suffix of WOOD_SUFFIXES.get(category) ?? []) {
    if (normalized.endsWith(suffix)) {
      return `${namespace}:${normalized.slice(0, -suffix.length)}`;
    }
  }

  return null;
}

function buildWoodSetIndex(rows) {
  const woodSets = new Map();

  for (const row of rows) {
    const setKey = inferWoodSetKey(row.blockId, row.category);
    if (!setKey) {
      continue;
    }
    const entry = woodSets.get(setKey) ?? { categories: new Set(), blockIds: new Set() };
    entry.categories.add(row.category);
    entry.blockIds.add(row.blockId);
    woodSets.set(setKey, entry);
  }

  return woodSets;
}

function blockIdExists(blockId, knownModBlockIds) {
  return blockId.startsWith('minecraft:') || knownModBlockIds.has(blockId);
}

function memberBlockIdsForCategory(setKey, category, knownModBlockIds) {
  const [namespace, baseName] = setKey.split(':');
  if (!namespace || !baseName) {
    return [];
  }

  const blockIds = [];
  for (const suffix of WOOD_SUFFIXES.get(category) ?? []) {
    const blockId = `${namespace}:${baseName}${suffix}`;
    if (blockIdExists(blockId, knownModBlockIds)) {
      blockIds.push(blockId);
    }
  }
  return blockIds;
}

function expandWoodSetEvidenceRows(rows, knownModBlockIds) {
  const expandedRows = [...rows];
  const seen = new Set(rows.map((row) => `${row.blockId}\0${row.category}`));
  const woodSets = buildWoodSetIndex(rows);

  for (const [setKey, info] of woodSets.entries()) {
    const [namespace] = setKey.split(':');
    const hasAnchor = [...WOOD_ANCHOR_CATEGORIES].some(
      (category) => info.categories.has(category) || memberBlockIdsForCategory(setKey, category, knownModBlockIds).length > 0
    );
    if (!hasAnchor) {
      continue;
    }

    for (const category of WOOD_CATEGORIES) {
      for (const blockId of memberBlockIdsForCategory(setKey, category, knownModBlockIds)) {
        const key = `${blockId}\0${category}`;
        if (seen.has(key)) {
          continue;
        }
        expandedRows.push({
          blockId,
          category,
          recommendedTags: '',
          matchedTags: '',
          namespace,
          sources: 'derived-wood-set',
        });
        seen.add(key);
      }
    }
  }

  return expandedRows;
}

function isGrassBlockCandidate(blockId) {
  const localName = blockId.split(':')[1] ?? '';
  return (
    (localName.endsWith('_grass_block') && !localName.startsWith('cobbled_')) ||
    localName.endsWith('grassblock') ||
    localName === 'rooted_grass_block' ||
    localName === 'rooty_grass_block' ||
    (localName.startsWith('rooty_') && localName.endsWith('_grass_block')) ||
    localName === 'chared_grass' ||
    localName === 'crackled_grass' ||
    localName === 'frozen_grass' ||
    localName.endsWith('_grassy_earthen_clay') ||
    localName.endsWith('_grassy_sandy_d_irt')
  );
}

function expandGrassBlockRows(rows, knownModBlockIds) {
  const expandedRows = [...rows];
  const seenBlockIds = new Set(rows.map((row) => row.blockId));

  for (const blockId of knownModBlockIds) {
    if (seenBlockIds.has(blockId) || blockId.startsWith('burnt:') || !isGrassBlockCandidate(blockId)) {
      continue;
    }
    expandedRows.push({
      blockId,
      category: 'grass_blocks',
      recommendedTags: '',
      matchedTags: '',
      namespace: blockId.split(':')[0],
      sources: 'derived-grass-surface',
    });
    seenBlockIds.add(blockId);
  }

  return expandedRows;
}

function normalizeEvidenceCategory(row, woodSets) {
  if (!CATEGORY_ROUTES.has(row.category)) {
    return null;
  }

  if (row.category === 'plants_will_burn' && isGrassBlockCandidate(row.blockId)) {
    return 'grass_blocks';
  }

  if (!WOOD_CATEGORIES.has(row.category)) {
    return row.category;
  }

  if (row.category === 'logs_that_burn' || row.category === 'planks') {
    return row.category;
  }

  const setKey = inferWoodSetKey(row.blockId, row.category);
  if (!setKey) {
    return null;
  }

  const woodSet = woodSets.get(setKey);
  if (!woodSet) {
    return null;
  }

  for (const anchorCategory of WOOD_ANCHOR_CATEGORIES) {
    if (woodSet.categories.has(anchorCategory)) {
      return row.category;
    }
  }

  return null;
}

function normalizeEvidenceRows(evidenceRows, blockExclusions) {
  const woodSets = buildWoodSetIndex(evidenceRows);
  const normalizedRows = [];
  const excludedRows = [];

  for (const row of evidenceRows) {
    if (row.blockId.startsWith('burnt:')) {
      excludedRows.push({ ...row, reason: 'Burnt output-state blocks stay upstream-owned in this compatibility pass.' });
      continue;
    }

    const exclusionReason = blockExclusions.get(row.blockId);
    if (exclusionReason) {
      excludedRows.push({ ...row, reason: exclusionReason });
      continue;
    }

    const category = normalizeEvidenceCategory(row, woodSets);
    if (!category) {
      normalizedRows.push({
        ...row,
        normalizedCategory: row.category,
        recommendedTagIds: [],
        unresolvedReason: 'unsupported_category',
      });
      continue;
    }

    normalizedRows.push({
      ...row,
      normalizedCategory: category,
      recommendedTagIds: CATEGORY_ROUTES.get(category) ?? [],
      unresolvedReason: '',
    });
  }

  return { normalizedRows, excludedRows };
}

function filterBlockTagValues(tagId, values, knownModBlockIds, filteredOut) {
  const kept = [];
  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }
    if (value.startsWith('#') || value.startsWith('minecraft:') || knownModBlockIds.has(value)) {
      kept.push(value);
      continue;
    }
    filteredOut.push({ tagId, value, reason: 'unknown_block' });
  }
  return kept;
}

function mergeRecommendations(normalizedRows, knownModBlockIds) {
  const recommendedByTag = new Map(MAINTAINED_TAG_IDS.map((tagId) => [tagId, []]));
  const filteredOut = [];

  for (const row of normalizedRows) {
    for (const tagId of row.recommendedTagIds) {
      recommendedByTag.get(tagId)?.push(row.blockId);
    }
  }

  const tagEntries = [];
  for (const tagId of MAINTAINED_TAG_IDS) {
    const filePath = tagToFilePath(tagId);
    const current = loadTagFile(filePath);
    const mergedValues = sortUnique(
      filterBlockTagValues(tagId, [...current.values, ...(recommendedByTag.get(tagId) ?? [])], knownModBlockIds, filteredOut)
    );
    tagEntries.push({
      tagId,
      filePath,
      beforeCount: current.values.length,
      afterCount: mergedValues.length,
      addedCount: mergedValues.length - current.values.length,
      payload: {
        replace: false,
        values: mergedValues,
      },
      covered: new Set(mergedValues),
    });
  }

  return {
    tagEntries,
    filteredOut,
  };
}

function buildCoverageRows(normalizedRows, coverageByTag) {
  const currentCovered = [];
  const remainingMissing = [];

  for (const row of normalizedRows) {
    const fallbackTagIds = CATEGORY_ROUTES.get(row.category) ?? [];
    const fallbackMatchedTags = fallbackTagIds.filter((tagId) => coverageByTag.get(tagId)?.has(row.blockId));

    if (row.recommendedTagIds.length === 0 && fallbackMatchedTags.length === 0) {
      remainingMissing.push({
        blockId: row.blockId,
        category: row.category,
        recommendedTags: fallbackTagIds.join(','),
        namespace: row.namespace,
        sources: row.sources,
      });
      continue;
    }

    const effectiveCategory = row.recommendedTagIds.length > 0 ? row.normalizedCategory : row.category;
    const effectiveRecommendedTagIds = row.recommendedTagIds.length > 0 ? row.recommendedTagIds : fallbackTagIds;
    const matchedTags = row.recommendedTagIds.length > 0
      ? row.recommendedTagIds.filter((tagId) => coverageByTag.get(tagId)?.has(row.blockId))
      : fallbackMatchedTags;
    const outputRow = {
      blockId: row.blockId,
      category: effectiveCategory,
      recommendedTags: effectiveRecommendedTagIds.join(','),
      matchedTags: matchedTags.join(','),
      namespace: row.namespace,
      sources: row.sources,
    };

    if (matchedTags.length > 0) {
      currentCovered.push(outputRow);
    } else {
      remainingMissing.push(outputRow);
    }
  }

  currentCovered.sort((a, b) => a.blockId.localeCompare(b.blockId));
  remainingMissing.sort((a, b) => a.blockId.localeCompare(b.blockId));
  return { currentCovered, remainingMissing };
}

function writeTsv(filePath, header, rows, projector) {
  const body = rows.map(projector).join('\n');
  const content = body ? `${header}\n${body}\n` : `${header}\n`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function writeAuditSummary(filePath, tagEntries, currentCovered, remainingMissing, excludedRows) {
  const lines = [
    '# Burnt Coverage Audit',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Recommended evidence rows: ${currentCovered.length + remainingMissing.length}`,
    `Covered rows: ${currentCovered.length}`,
    `Missing rows: ${remainingMissing.length}`,
    `Explicit exclusions: ${excludedRows.length}`,
    '',
    '| Tag | Existing | Added | Final |',
    '| --- | ---: | ---: | ---: |',
    ...tagEntries.map((entry) => `| ${entry.tagId} | ${entry.beforeCount} | ${entry.addedCount} | ${entry.afterCount} |`),
    '',
  ];

  if (excludedRows.length > 0) {
    lines.push('## Explicit Exclusions');
    lines.push('');
    for (const row of excludedRows) {
      lines.push(`- ${row.blockId}: ${row.reason}`);
    }
    lines.push('');
  }

  if (remainingMissing.length > 0) {
    lines.push('## Remaining Missing');
    lines.push('');
    for (const row of remainingMissing.slice(0, 50)) {
      lines.push(`- ${row.blockId} -> ${row.recommendedTags || 'UNKNOWN'}`);
    }
    if (remainingMissing.length > 50) {
      lines.push(`- ...and ${remainingMissing.length - 50} more`);
    }
    lines.push('');
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`);
}

function validateRecommendationsFile(recommendations) {
  if (!recommendations || typeof recommendations !== 'object' || Array.isArray(recommendations)) {
    fail('Expected recommendations file to contain a tag-to-values JSON object');
  }
  for (const [tagId, values] of Object.entries(recommendations)) {
    if (!Array.isArray(values) || values.some((value) => typeof value !== 'string')) {
      fail(`Expected ${tagId} recommendations to be a string array`);
    }
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(options.recommendations)) {
    fail(`Recommendations file not found: ${options.recommendations}`);
  }
  if (!fs.existsSync(options.evidence)) {
    fail(`Evidence file not found: ${options.evidence}`);
  }

  const recommendations = readJson(options.recommendations);
  validateRecommendationsFile(recommendations);
  const rawEvidenceRows = collectEvidenceRows(options.evidence, recommendations);
  const blockExclusions = readBlockExclusions(options.blockExclusions);
  const knownModBlockIds = collectKnownModBlockIds();
  const evidenceRows = expandGrassBlockRows(expandWoodSetEvidenceRows(rawEvidenceRows, knownModBlockIds), knownModBlockIds);
  const { normalizedRows, excludedRows } = normalizeEvidenceRows(evidenceRows, blockExclusions);
  const { tagEntries, filteredOut } = mergeRecommendations(normalizedRows, knownModBlockIds);
  const coverageByTag = new Map(tagEntries.map((entry) => [entry.tagId, entry.covered]));
  const { currentCovered, remainingMissing } = buildCoverageRows(normalizedRows, coverageByTag);

  if (options.write) {
    for (const entry of tagEntries) {
      writeJson(entry.filePath, entry.payload);
    }

    writeTsv(
      path.join(GENERATED_DIR, 'burnt-coverage-current-covered.tsv'),
      'block_id\tcategory\trecommended_tags\tmatched_tags\tnamespace\tsources',
      currentCovered,
      (row) => [row.blockId, row.category, row.recommendedTags, row.matchedTags, row.namespace, row.sources].join('\t')
    );
    writeTsv(
      path.join(GENERATED_DIR, 'burnt-coverage-missing-high-confidence.tsv'),
      'block_id\tcategory\trecommended_tags\tnamespace\tsources',
      remainingMissing.filter((row) => !HIGH_CONFIDENCE_NAMESPACES.has(row.namespace)),
      (row) => [row.blockId, row.category, row.recommendedTags, row.namespace, row.sources].join('\t')
    );
    writeAuditSummary(
      path.join(GENERATED_DIR, 'burnt-coverage-audit.md'),
      tagEntries,
      currentCovered,
      remainingMissing,
      excludedRows
    );
  }

  const changedTags = tagEntries.filter((entry) => entry.addedCount > 0);
  for (const entry of changedTags) {
    console.log(`${entry.tagId}\t+${entry.addedCount}\t${path.relative(REPO_ROOT, entry.filePath)}`);
  }
  for (const entry of filteredOut) {
    console.log(`filtered_non_block\t${entry.reason}\t${entry.tagId}\t${entry.value}`);
  }
  for (const row of excludedRows) {
    console.log(`excluded\t${row.blockId}\t${row.reason}`);
  }
  console.log(`covered_rows\t${currentCovered.length}`);
  console.log(`missing_rows\t${remainingMissing.filter((row) => !HIGH_CONFIDENCE_NAMESPACES.has(row.namespace)).length}`);

  if (!options.write && changedTags.length > 0) {
    process.exitCode = 1;
  }
}

main();

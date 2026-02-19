#!/usr/bin/env node
/* eslint-disable no-console */
const cp = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const BUDGET_PATH = path.join(ROOT, 'quality', 'quality-budgets.json');

function loadBudgets() {
  if (!fs.existsSync(BUDGET_PATH)) {
    throw new Error(`Missing budget file: ${BUDGET_PATH}`);
  }
  return JSON.parse(fs.readFileSync(BUDGET_PATH, 'utf8'));
}

function runReactDoctor() {
  const extraArgs = process.argv.includes('--diff') ? ['--diff'] : [];
  return cp.spawnSync('npx', ['-y', 'react-doctor@latest', '.', '-y', '--verbose', ...extraArgs], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
}

function lastMatch(source, pattern) {
  const matches = [...source.matchAll(pattern)];
  return matches.length > 0 ? matches[matches.length - 1] : null;
}

function parseSummary(output) {
  const plainText = output.replace(/\x1B\[[0-9;]*m/g, '');

  const scoreMatch = lastMatch(plainText, /(\d+)\s*\/\s*100/g);
  const warningsMatch = lastMatch(plainText, /(\d+)\s+warnings/g);
  const filesMatch = lastMatch(plainText, /across\s+(\d+)(?:\/\d+)?\s+files/g);

  if (!scoreMatch || !warningsMatch || !filesMatch) {
    throw new Error('Could not parse react-doctor summary');
  }

  return {
    score: Number(scoreMatch[1]),
    warnings: Number(warningsMatch[1]),
    filesWithWarnings: Number(filesMatch[1]),
  };
}

function main() {
  const budgets = loadBudgets();
  const doctorBudget = budgets.reactDoctor || {};

  const minScore = Number(process.env.REACT_DOCTOR_MIN_SCORE || doctorBudget.minScore || 0);
  const maxWarnings = Number(process.env.REACT_DOCTOR_MAX_WARNINGS || doctorBudget.maxWarnings || 0);
  const maxFilesWithWarnings = Number(
    process.env.REACT_DOCTOR_MAX_FILES || doctorBudget.maxFilesWithWarnings || 0
  );

  const result = runReactDoctor();
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  const summary = parseSummary(output);

  console.log(
    '[react-doctor:gate] score=%d warnings=%d files=%d budgets(minScore=%d maxWarnings=%d maxFiles=%d)',
    summary.score,
    summary.warnings,
    summary.filesWithWarnings,
    minScore,
    maxWarnings,
    maxFilesWithWarnings
  );

  const failedChecks = [];
  if (summary.score < minScore) {
    failedChecks.push(`score ${summary.score} < ${minScore}`);
  }
  if (summary.warnings > maxWarnings) {
    failedChecks.push(`warnings ${summary.warnings} > ${maxWarnings}`);
  }
  if (summary.filesWithWarnings > maxFilesWithWarnings) {
    failedChecks.push(`filesWithWarnings ${summary.filesWithWarnings} > ${maxFilesWithWarnings}`);
  }

  if (failedChecks.length > 0) {
    console.error('[react-doctor:gate] failed:', failedChecks.join(', '));
    process.exit(1);
  }

  process.exit(0);
}

try {
  main();
} catch (error) {
  console.error('[react-doctor:gate] failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}

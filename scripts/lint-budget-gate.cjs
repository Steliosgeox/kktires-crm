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

function runLint() {
  return cp.spawnSync('npx', ['eslint', '.', '--format', 'json'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
}

function parseReport(stdout) {
  const payload = (stdout || '').trim();
  if (!payload) {
    throw new Error('ESLint returned no JSON output');
  }

  const report = JSON.parse(payload);
  if (!Array.isArray(report)) {
    throw new Error('Unexpected ESLint JSON shape');
  }

  let warnings = 0;
  let errors = 0;
  for (const row of report) {
    warnings += Number(row.warningCount || 0);
    errors += Number(row.errorCount || 0);
  }

  return {
    files: report.length,
    warnings,
    errors,
  };
}

function main() {
  const budgets = loadBudgets();
  const maxWarnings = Number(process.env.LINT_MAX_WARNINGS || budgets.eslint?.maxWarnings || 0);
  if (!Number.isFinite(maxWarnings) || maxWarnings < 0) {
    throw new Error(`Invalid lint warning budget: ${maxWarnings}`);
  }

  const result = runLint();
  const summary = parseReport(result.stdout || '');

  console.log(
    '[lint:budget] files=%d warnings=%d errors=%d maxWarnings=%d',
    summary.files,
    summary.warnings,
    summary.errors,
    maxWarnings
  );

  if (summary.errors > 0) {
    console.error('[lint:budget] failed: eslint reported %d errors', summary.errors);
    process.exit(1);
  }

  if (summary.warnings > maxWarnings) {
    console.error(
      '[lint:budget] failed: warnings %d exceeded budget %d',
      summary.warnings,
      maxWarnings
    );
    process.exit(1);
  }

  process.exit(0);
}

try {
  main();
} catch (error) {
  console.error('[lint:budget] failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}

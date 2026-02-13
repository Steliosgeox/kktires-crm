#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'test-results', 'baseline');
const OUT_FILE = path.join(OUT_DIR, 'audit-report.json');
const reportOnly = process.argv.includes('--report-only');

function run(command, args) {
  return cp.spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: 'pipe',
  });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function main() {
  ensureDir(OUT_DIR);

  const result = run('npm', ['audit', '--omit=dev', '--json']);
  const raw = `${result.stdout || ''}`.trim();
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  if (!parsed) {
    const payload = {
      error: 'Failed to parse npm audit output',
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      status: result.status ?? 1,
    };
    fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2), 'utf8');
    console.error('[audit] could not parse npm audit output');
    process.exit(reportOnly ? 0 : 1);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(parsed, null, 2), 'utf8');

  const v = parsed.metadata?.vulnerabilities || {};
  const high = Number(v.high || 0);
  const critical = Number(v.critical || 0);
  const total = Number(v.total || 0);

  console.log(
    '[audit] total=%d moderate=%d high=%d critical=%d',
    total,
    Number(v.moderate || 0),
    high,
    critical
  );

  if (reportOnly) {
    process.exit(0);
  }

  if (high > 0 || critical > 0) {
    console.error('[audit] gate failed: high/critical vulnerabilities detected');
    process.exit(1);
  }

  process.exit(0);
}

main();

#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'test-results', 'baseline');
const LINT_REPORT_PATH = path.join(OUT_DIR, 'lint-report.json');
const AUDIT_REPORT_PATH = path.join(OUT_DIR, 'audit-report.json');
const SUMMARY_PATH = path.join(OUT_DIR, 'baseline-summary.json');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function run(command, args, options = {}) {
  const result = cp.spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
    shell: process.platform === 'win32',
    ...options,
  });
  return result;
}

function listFilesRecursively(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolute);
      } else if (entry.isFile()) {
        out.push(absolute);
      }
    }
  }
  return out;
}

function toPosixRelative(absolute) {
  return path.relative(ROOT, absolute).split(path.sep).join('/');
}

function getRouteFiles() {
  const apiDir = path.join(ROOT, 'src', 'app', 'api');
  if (!fs.existsSync(apiDir)) return [];
  return listFilesRecursively(apiDir)
    .filter((f) => f.endsWith(path.join('route.ts')))
    .map(toPosixRelative)
    .sort();
}

function getTestFiles() {
  const testsDir = path.join(ROOT, 'tests');
  if (!fs.existsSync(testsDir)) return [];
  return listFilesRecursively(testsDir)
    .filter((f) => f.endsWith('.test.ts'))
    .map(toPosixRelative)
    .sort();
}

function getTestedRouteFileSet(testFiles) {
  const set = new Set();
  const re = /(?:import|require)\s*(?:\(|)\s*['"](\.\.\/src\/app\/api\/[^'"]+\/route)['"]/g;

  for (const testPath of testFiles) {
    const absolute = path.join(ROOT, testPath);
    const content = fs.readFileSync(absolute, 'utf8');
    let match = re.exec(content);
    while (match) {
      const raw = match[1];
      const normalized = raw
        .replace(/^\.\.\//, '')
        .replace(/\\/g, '/')
        .replace(/\/+$/, '') + '.ts';
      set.add(normalized);
      match = re.exec(content);
    }
  }
  return set;
}

function countAnyUsage() {
  const srcDir = path.join(ROOT, 'src');
  if (!fs.existsSync(srcDir)) return 0;
  const files = listFilesRecursively(srcDir).filter((f) => /\.(ts|tsx)$/.test(f));
  const re = /\bany\b/g;
  let count = 0;
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(re);
    if (matches) count += matches.length;
  }
  return count;
}

function runLintReport() {
  const result = run('npm', ['run', 'lint', '--', '--format', 'json', '--output-file', LINT_REPORT_PATH]);
  const output = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
  let warnings = 0;
  let errors = 0;
  let files = 0;
  if (fs.existsSync(LINT_REPORT_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(LINT_REPORT_PATH, 'utf8'));
      files = Array.isArray(parsed) ? parsed.length : 0;
      if (Array.isArray(parsed)) {
        for (const row of parsed) {
          warnings += Number(row.warningCount || 0);
          errors += Number(row.errorCount || 0);
        }
      }
    } catch {
      // keep defaults
    }
  }
  return {
    exitCode: result.status ?? 1,
    warnings,
    errors,
    files,
    output,
  };
}

function runAuditReport() {
  const result = run('npm', ['audit', '--omit=dev', '--json']);
  const raw = `${result.stdout || ''}`.trim();
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  if (parsed) {
    fs.writeFileSync(AUDIT_REPORT_PATH, JSON.stringify(parsed, null, 2), 'utf8');
  } else {
    fs.writeFileSync(
      AUDIT_REPORT_PATH,
      JSON.stringify(
        {
          error: 'Failed to parse npm audit output',
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          status: result.status ?? 1,
        },
        null,
        2
      ),
      'utf8'
    );
  }

  const vuln = parsed?.metadata?.vulnerabilities || {};
  return {
    exitCode: result.status ?? 1,
    info: Number(vuln.info || 0),
    low: Number(vuln.low || 0),
    moderate: Number(vuln.moderate || 0),
    high: Number(vuln.high || 0),
    critical: Number(vuln.critical || 0),
    total: Number(vuln.total || 0),
  };
}

function getGitMeta() {
  const branch = run('git', ['branch', '--show-current']).stdout.trim();
  const commit = run('git', ['rev-parse', 'HEAD']).stdout.trim();
  return { branch, commit };
}

function main() {
  ensureDir(OUT_DIR);

  const routeFiles = getRouteFiles();
  const testFiles = getTestFiles();
  const testedRouteFiles = Array.from(getTestedRouteFileSet(testFiles)).sort();
  const lint = runLintReport();
  const audit = runAuditReport();
  const git = getGitMeta();

  const summary = {
    generatedAt: new Date().toISOString(),
    git,
    metrics: {
      routeCount: routeFiles.length,
      testedRouteFileCount: testedRouteFiles.length,
      anyUsageCount: countAnyUsage(),
      lintWarnings: lint.warnings,
      lintErrors: lint.errors,
      vulnerabilities: {
        info: audit.info,
        low: audit.low,
        moderate: audit.moderate,
        high: audit.high,
        critical: audit.critical,
        total: audit.total,
      },
    },
    routeFiles,
    testedRouteFiles,
  };

  fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2), 'utf8');

  console.log('[baseline] summary written to', toPosixRelative(SUMMARY_PATH));
  console.log(
    '[baseline] routes=%d testedRouteFiles=%d lintWarnings=%d vulnerabilities(total=%d high=%d critical=%d)',
    summary.metrics.routeCount,
    summary.metrics.testedRouteFileCount,
    summary.metrics.lintWarnings,
    summary.metrics.vulnerabilities.total,
    summary.metrics.vulnerabilities.high,
    summary.metrics.vulnerabilities.critical
  );

  // Baseline collection should not fail the pipeline by itself.
  process.exit(0);
}

main();

import fs from 'node:fs';
import path from 'node:path';

type Finding = {
  file: string;
  line: number;
  kind:
    | 'empty_onclick'
    | 'undefined_onclick'
    | 'null_onclick'
    | 'dashboard_route'
    | 'alert'
    | 'confirm';
  text: string;
};

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');

const SKIP_DIRS = new Set([
  '.git',
  '.next',
  'node_modules',
  'dist',
  'build',
  'coverage',
]);

const ALLOWED_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

function walk(dir: string): string[] {
  const out: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      out.push(...walk(path.join(dir, ent.name)));
      continue;
    }
    if (!ent.isFile()) continue;
    const full = path.join(dir, ent.name);
    if (!ALLOWED_EXTS.has(path.extname(full))) continue;
    out.push(full);
  }
  return out;
}

const RULES: Array<{ kind: Finding['kind']; re: RegExp }> = [
  { kind: 'empty_onclick', re: /onClick=\{\(\)\s*=>\s*\{\s*\}\}/ },
  { kind: 'undefined_onclick', re: /onClick=\{\(\)\s*=>\s*undefined\s*\}/ },
  { kind: 'null_onclick', re: /onClick=\{\(\)\s*=>\s*null\s*\}/ },
  { kind: 'dashboard_route', re: /['"`]\/dashboard\// },
  { kind: 'alert', re: /\balert\(/ },
  { kind: 'confirm', re: /\bconfirm\(/ },
];

function scanFile(file: string): Finding[] {
  const rel = path.relative(ROOT, file);
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split(/\r?\n/);
  const findings: Finding[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i] ?? '';
    for (const rule of RULES) {
      if (!rule.re.test(lineText)) continue;
      findings.push({
        file: rel,
        line: i + 1,
        kind: rule.kind,
        text: lineText.trim().slice(0, 240),
      });
    }
  }

  return findings;
}

function main() {
  const args = new Set(process.argv.slice(2));
  const shouldFail = args.has('--fail');

  if (!fs.existsSync(SRC_DIR)) {
    console.error(`[audit:stubs] src directory not found at: ${SRC_DIR}`);
    process.exit(2);
  }

  const files = walk(SRC_DIR);
  const all: Finding[] = [];
  for (const file of files) {
    all.push(...scanFile(file));
  }

  if (all.length === 0) {
    console.log('[audit:stubs] No findings.');
    process.exit(0);
  }

  const byKind = new Map<Finding['kind'], Finding[]>();
  for (const f of all) {
    const bucket = byKind.get(f.kind) || [];
    bucket.push(f);
    byKind.set(f.kind, bucket);
  }

  console.log(`[audit:stubs] Findings: ${all.length}`);
  for (const [kind, bucket] of [...byKind.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`\n== ${kind} (${bucket.length}) ==`);
    for (const f of bucket.slice(0, 200)) {
      console.log(`${f.file}:${f.line}  ${f.text}`);
    }
    if (bucket.length > 200) {
      console.log(`... (${bucket.length - 200} more)`);
    }
  }

  process.exit(shouldFail ? 1 : 0);
}

main();


// check-cli-docs.mjs — CLI docs anti-drift gate (docs side).
//
// What it verifies, against cli-snapshots/ (real captured quire-cli output):
//   1. Every snapshot file listed in manifest.json exists and is non-empty.
//   2. Every subcommand and every flag documented in guide/cli-reference.md
//      appears somewhere in the captured usage/snapshots (no invented flags).
//   3. Every documented flag appears in the usage text verbatim.
//   4. Captured sample outputs quoted in cli-reference.md actually occur in
//      the snapshot files (prose can't silently drift from what the tool prints).
//
// The engine repository pairs this with a trycmd-style test that re-runs the
// binary and diffs against cli-snapshots/; this docs-side gate catches the
// complementary failure: docs edited to describe flags the snapshots don't show.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SNAP = join(ROOT, 'cli-snapshots');
const problems = [];

const manifest = JSON.parse(readFileSync(join(SNAP, 'manifest.json'), 'utf8'));
const snapshots = new Map();
for (const f of manifest.files) {
  const p = join(SNAP, f.name);
  if (!existsSync(p)) {
    problems.push(`manifest lists snapshot ${f.name} but the file is missing`);
    continue;
  }
  const text = readFileSync(p, 'utf8');
  if (!text.trim()) problems.push(`snapshot ${f.name} is empty`);
  snapshots.set(f.name, text);
}
const allSnapshots = [...snapshots.values()].join('\n');
const usage = snapshots.get('usage.txt') ?? '';

const doc = readFileSync(join(ROOT, 'guide', 'cli-reference.md'), 'utf8');

// 1. Documented subcommands must appear in usage text.
const cmdSection = doc.match(/## Commands at a glance\n+([\s\S]*?)\n+## /);
if (!cmdSection) {
  problems.push('cli-reference.md: "Commands at a glance" section not found');
} else {
  const cmds = [...cmdSection[1].matchAll(/^\|\s*`([a-z]+)`/gm)].map((m) => m[1]);
  if (cmds.length === 0) problems.push('cli-reference.md: no subcommands parsed from the table');
  for (const c of cmds) {
    if (!new RegExp(`quire-cli ${c}\\b`).test(usage)) {
      problems.push(`documented subcommand "${c}" does not appear in captured usage text`);
    }
  }
  // And no usage command went undocumented.
  for (const m of usage.matchAll(/quire-cli ([a-z]+) </g)) {
    if (!cmds.includes(m[1])) problems.push(`captured usage has subcommand "${m[1]}" not documented`);
  }
}

// 2. Every backticked --flag in the doc must exist in the usage capture.
const flags = new Set([...doc.matchAll(/`(--[a-z][\w-]*)/g)].map((m) => m[1]));
for (const fl of flags) {
  if (!usage.includes(fl)) problems.push(`documented flag ${fl} does not appear in captured usage text`);
}
// 3. Every flag in the usage capture must be documented.
for (const m of usage.matchAll(/(--[a-z][\w-]*)/g)) {
  if (!flags.has(m[1])) problems.push(`captured usage has flag ${m[1]} not documented in cli-reference.md`);
}

// 4. Quoted output lines in the doc that look like tool output must exist in snapshots.
//    (Lines inside ```text/```json fenced blocks, excluding comments/elision.)
const fences = [...doc.matchAll(/```(text|json)\n([\s\S]*?)```/g)];
for (const [, , body] of fences) {
  for (const line of body.split('\n').map((l) => l.trim()).filter(Boolean)) {
    if (line.startsWith('#') || line.startsWith('//') || line.startsWith('...') || line.startsWith('{') || line.startsWith('|')) continue;
    const probe = line.replace(/^\d+\s+/, '');
    if (!allSnapshots.includes(probe)) {
      problems.push(`cli-reference.md quotes output not present in snapshots: "${line.slice(0, 60)}…"`);
    }
  }
}

if (problems.length) {
  console.error(`✗ CLI docs gate FAILED (${problems.length} problem(s)):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(
  `✓ CLI docs gate passed — ${manifest.files.length} snapshots (${manifest.tool} ${manifest.toolVersion} @ ${manifest.sourceCommit.slice(0, 7)}), ` +
    `${flags.size} flags verified against captured usage`,
);

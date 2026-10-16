# CLI reference

`quire-cli` (crate `quire-cli`, binary `quire-cli`) is the native head of the engine:
it exists for CI evaluation and development before a graphical shell, and is built
under the same layering rule as every shell — it may only import `quire-engine`.

::: warning Repository private — commands tagged
All commands below are tagged **[requires repo access]** until public release. The
*output* blocks are real captures from `quire-cli` 0.1.0 (commit `8d3f401`,
`fixtures/sample.docx`), not written descriptions, and CI re-verifies them against
the binary (see [Docs snapshot gate](#docs-snapshot-gate)).
:::

## Invocation

```bash
cargo run -p quire-cli -- <command> [args] [flags]   # [requires repo access]
```

With no arguments (or fewer than a command + target) the usage text is printed to
stderr and the exit code is `2`.

## Commands at a glance

| Command | Purpose | Exit code |
|---|---|---|
| `info` | Page count / paragraph count / preserved-part count + first-page preview | `0` ok, `1` read/parse error |
| `page` | Display-list JSON for one page | `0` ok, `1` bad page index / read error |
| `dump` | Display-list JSON for all pages | `0` ok, `1` read/parse error |
| `render` | Headless render: one SVG per page + `pagebreaks.json` | `0` ok, `1` I/O error, `2` bad flags |
| `roundtrip` | Open → save → optional structural check (single file or directory scan) | `0` ok, `1` loss detected/read/save error, `2` bad flags |

## `quire-cli info <file.docx>`

Quick document facts and the top lines of page 0.

```bash
cargo run -p quire-cli -- info fixtures/sample.docx   # [requires repo access]
```

```text
檔案: fixtures/sample.docx
頁數: 2
段落數: 14
保留 zip part 數: 3
--- 第 0 頁預覽 ---
  Quire 開源文書處理器樣本
  這是一份用於 CI 的最小 DOCX 樣本。R&D 實體還原測試：amp 必須還原為 & 符號。
  The quick brown fox jumps over the lazy dog. 開源原生文書處理器，目標是不卡
  頓的專業排版。第 1 段。The quick brown fox jumps over the lazy dog. 開源原生
  文書處理器，目標是不卡頓的專業排版。第 1 段。The quick brown fox jumps over
  the lazy dog. 開源原生文書處理器，目標是不卡頓的專業排版。第 1 段。The quick
```

(Example doubles as a CJK + Latin mixed-script rendering test — entity restoration
(`&amp;` → `&`) is asserted on exactly this fixture in CI.)

## `quire-cli page <file.docx> <n>`

Prints the `PageDisplayList` JSON for page *n* (0-based) — the same contract the
browser shell consumes. Items carry x/y/size in points plus bold/italic flags.

```bash
cargo run -p quire-cli -- page fixtures/sample.docx 0   # [requires repo access]
```

```json
{"page":0,"width_pt":595.0,"height_pt":842.0,"items":[
 {"Text":{"x":72.0,"y":72.0,"size_pt":12.0,"flags":0,"text":"Quire 開源文書處理器樣本"}},
 {"Text":{"x":72.0,"y":88.8,"size_pt":12.0,"flags":0,"text":"這是一份用於 CI 的最小 DOCX 樣本。R&D 實體還原測試：amp 必須還原為 & 符號。"}},
 ...]}
```

A page index beyond the document prints the count and exits `1`.

## `quire-cli dump <file.docx>`

All pages' display lists as one JSON document — the raw material for renderers,
golden snapshots and diff tools.

## `quire-cli render <file.docx> --out <dir>`

Headless render used by [render-lab](./render-lab): writes `<stem>-p<page>.svg` per
page plus `pagebreaks.json` (per-page paragraph distribution and cross-page
continuations) for cross-engine comparison.

| Flag | Meaning |
|---|---|
| `--out <dir>` | Output directory (created if missing). **Required.** |

```bash
cargo run -p quire-cli -- render fixtures/sample.docx --out out/render-lab/quire-sample   # [requires repo access]
```

```text
render: fixtures/sample.docx → 2 頁 SVG ＋ out/render-lab/quire-sample/pagebreaks.json（14 段落）
```

Unknown flags and missing `--out` exit `2` with the usage text.

## `quire-cli roundtrip`

The lossless gate (`<file|dir>` target): opens, saves without edits, and (with `--check`) diffs original
vs. saved at ZIP-structure level. A directory argument scans `*.docx` recursively in
name order for reproducibility. Semantics in depth: [Lossless guarantee](./lossless-guarantee).

| Flag | Meaning |
|---|---|
| `--check` | Run the structural comparison; without it the command only round-trips (and optionally writes). |
| `--out <path>` | Write the saved file to `<path>` (single-target use). |
| `--allow part1,part2` | Comma-separated part names whose **content** may legitimately differ (edited-part whitelist). Off-whitelist content change in an untouched part = violation. |
| `--quarantine <quarantine.json>` | Skip-and-list files from a JSON manifest `{"files": {"<relpath or filename>": "<reason>"}}`. For a directory scan, `<dir>/quarantine.json` is auto-detected when the flag is omitted. |

```bash
cargo run -p quire-cli -- roundtrip fixtures/sample.docx --check   # [requires repo access]
```

```text
✓ fixtures/sample.docx（byte-identical，3 parts）
roundtrip --check: 1 檔（另有 0 檔隔離不計紅），byte-identical 1，失敗 0
```

A failing file prints the differ's `report()` — `byte_identical=`/`pass=`, whitelisted
changes, missing/added parts, archive-comment drift and per-entry `VIOLATION` lines —
and the process exits `1`, failing CI. Full-corpus runs print one ✓ line per file plus
the summary; that summary is the number the community should watch.

## Exit codes (summary)

| Code | Meaning |
|---|---|
| `0` | Success (all checked files pass) |
| `1` | I/O failure, parse failure, or lossless violation detected |
| `2` | Usage error (missing command/target, unknown flag) |

## Docs snapshot gate

CLI docs rot silently: flags change, nobody remembers to update the prose. This docs
repository therefore pins the CLI surface as **snapshots** (`cli-snapshots/*.txt`,
captured from `quire-cli` 0.1.0 @ `8d3f401`): usage text, `info`, `page`, `render`
and `roundtrip --check` outputs. `npm run check:cli` runs in this repo's CI and
verifies that every documented subcommand, flag and quoted output line appears in
the snapshots — a flag described in prose that the captured binary never printed
fails the build.

The complementary half — re-running the *binary* and diffing against these snapshots,
so engine-side flag drift without a docs update goes red — is planned for the engine
repository as a `trycmd`-style test at public release (tracked as follow-up; the
layout core already has precedent in its golden break-point snapshot gate).

## Related

- [render-lab](./render-lab) — what `render` feeds, and the LibreOffice baseline
- [Lossless guarantee](./lossless-guarantee) — the `roundtrip` verdict model

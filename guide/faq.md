# FAQ

## Why not just ship an app?

Because the app is the easy part, and the hard part is shared. A word processor built
on someone else's lossy format library inherits its data-loss bugs forever: every
round-trip through that library is a roll of the dice on parts it doesn't model. The
document engine *is* the moat — lossless OOXML handling with a machine-enforced
discipline, plus a typesetting core that keeps native and browser rendering in
agreement. That's worth more as a reusable engine (the same core later carries XLSX
and PPTX) than bolted to one UI, which is why the repository ships a CLI head and a
browser demo rather than an end-user app: the shells are deliberately thin adapters
around the engine so that whoever builds the app — including us — inherits the
guarantees instead of rebuilding them.

Concretely, the "no app yet" stage buys:

- **A verifiable promise.** `roundtrip --check` is the deliverable. An app hides
  whether your file changed; the CLI gate prints byte-identical counts.
- **Two shells from day one.** The dual-target rule (native + wasm32, in CI) is why
  the browser demo exists at the skeleton stage at all — retrofitting wasm onto an
  app-shaped codebase is how projects die here.
- **Cheap shell split.** Layering enforcement means a future app can live in its own
  repository without untangling the engine.

## What is the format roadmap?

Quire is an **Office-format engine family**, not a DOCX project with ambitions. The
bet: DOCX/XLSX/PPTX share most of what's hard — the OPC container (ZIP+XML, lossless
at byte level), OOXML part handling, and the lossless discipline itself — so each new
format is a sibling crate on the same core (`core/xlsx`, `core/pptx`), keeping only
the layout model its format demands: flow for DOCX, grid for XLSX, canvas for PPTX.

| Milestone | Scope |
|---|---|
| **Now** | DOCX: lossless round-trip + layout/pagination (this repository) |
| **Phase 3–4** | DOCX depth: tables, headers/footers, columns, tracked changes — driven by corpus green-light rate; CRDT collaborative layer (loro adapter slot) |
| **Then: XLSX** | `core/xlsx` on the same OPC/lossless core: workbook model, formula engine, sheet render list (charts later) |
| **Then: PPTX** | `core/pptx`: slide/shape model reusing layout + shaping; presentation render list |

Shell strategy: shells stay in-tree until one of them ships releases of its own
(installers / deployed app), its license diverges, or its contributor community
diverges — the layering gate is what keeps that split cheap.

## Why a 400-file corpus instead of unit tests?

Because DOCX loss happens in the long tail: ZIP64 in an Apple Keynote export, vendor
`extra` fields nobody documented, a CRC-corrupted theme from a fuzzer, a 1998 Word 6
quirk. Unit tests assert what the author imagined; this corpus asserts what the world
emits:

- **130 phase-0 files** — real bug-report documents (LibreOffice, POI — anonymized
  upstream), public functional templates (Open-Xml-PowerTools, PHPWord), Microsoft's
  official OOXML test assets, docx4j / python-docx test resources.
- **270 expansion files** — including generated pathological tables (3+ nesting,
  tables across pages, interleaved merges, autofit, tables-in-columns, multi-paragraph
  and list-bearing cells) with per-feature coverage quorums enforced by
  `scripts/verify_corpus.py`.
- Every file carries a license entry in `corpus/manifest.json`; the gate rejects
  bare/unknown license strings — SPDX id *plus* concrete provenance.

The gates encode what "done" means: phase-0 batch must stay at **100 % green**
(a regression is red, forever), the expansion batch must stay **≥ 90 % green**, and
anything excluded is quarantined *with a written reason*, counted separately in every
summary. Tables of this rigor are why the roadmap says Phase 3–4 features are
"driven by corpus green-light rate" — the corpus decides what's broken next.

## Why Rust, and why hand-roll the ZIP layer?

Rust for the usual engine reasons (no GC pauses in the typing path, wasm as a
first-class second target, fearless refactoring of a spec this large) — but the ZIP
decision is the interesting one. Off-the-shelf ZIP libraries *decode and re-encode*:
they walk entries through their own model and emit a fresh archive, which is exactly
the silent-rewrite behavior the lossless promise forbids. So `core/ooxml` parses ZIP
records directly — local headers, central directory, extra fields, data descriptors,
gaps, archive comment — and re-emits untouched bytes verbatim. The dependency list
shrinks to `flate2` (deflate) and `crc32fast`. If byte-level fidelity is the promise,
the format code has to be the project's own.

## Why is the CLI output in Chinese?

The engine's development language is Traditional Chinese (UI strings, comments, CI
step names) with English documentation, mirroring the repository's bilingual README
convention. Output *formats* (display-list JSON, `pagebreaks.json`, the diff report
structure) are locale-independent and stable; only human-facing prose is
Chinese-first. English-facing output is a public-release polish item, not an
engine change. (The [CLI reference](./cli-reference) shows captured outputs verbatim
so what you read is what the tool prints.)

## How is "the same page" guaranteed between the CLI and the browser?

They don't each implement layout. Both shells consume the core's `PageDisplayList`
JSON — the same bytes, from the same Rust code, compiled to native and wasm32
respectively. Shaping uses bundled font metrics (`swash`, no system-font discovery)
so pagination can't drift by platform, and golden break-point snapshots pin the line-
and page-break decisions in CI. A renderer that disagrees with the engine is a bug in
the renderer.

## Can I use Quire in my product today?

Not yet — the repository is private and the feature set is DOCX-skeleton. The
intended surface at public release: Apache-2.0 source (fonts and corpus keep their
upstream licenses), `quire-engine` as a library, `quire-cli` for pipelines, and the
wasm shell for browsers. The lossless guarantee and the CI gates are the contract to
hold us to.

## Where's the roadmap discussion / issue tracker?

After public release: issues on `quire-office/quire`.
Corpus-driven bugs are the most actionable kind — attach the `.docx` and the output
of `roundtrip --check` on it, and the report is half-written.

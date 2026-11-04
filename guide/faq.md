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
| **In progress** | XLSX: `core/xlsx` on the same OPC container and round-trip gates — an 80-file corpus with per-file licensing and a byte-identical round-trip gate is collected, and the read model now covers the workbook model, cell projection (five value types over sharedStrings) and the style cascade (fonts/fills/borders/number formats resolved to effective styles); the formula engine comes next |
| **Next** | DOCX depth: the editing API (mutations + the lossless save chain), remaining rendering gaps — ordered by the corpus failure clusters; CRDT collaborative layer behind the loro adapter slot |
| **Later** | PPTX: `core/pptx` — slide/shape model reusing layout + shaping; its own presentation render list |
| **Planned, prioritized ahead of PPTX** | ODF family: `core/odf` — ODT first, then ODS/ODP, on the same lossless container discipline. The 50-file ODT corpus (per-file licensing, container-level survey with three spec-violating files flagged) has landed together with the code-anchored design doc; the container crate is now cut from its red-light tests. Honest scope: the ZIP layer and round-trip gate carry over; the OOXML part model does not. `text:sect` and `office:styles` are mapped from the OASIS spec, not guessed from DOCX. |
| **Planned** | Legacy DOC (binary Word): the pre-OOXML format lives in an OLE compound file, not OPC — its own parser lane reusing the same layout and shaping crates downstream, read-only rendering first. Honest scope: MS-DOC carries more legacy behaviour than OOXML; the corpus survey names the gaps before code guesses them. |

Open formats are a first-class family goal next to OOXML, not an afterthought: the
same core, the same lossless bar, and LibreOffice as ground truth for both.

The product line built on the engine (each its own repository once it ships its own
releases): the in-browser editor, a Tauri desktop app on the native core, and a
self-hostable collaboration/storage server (Docker-first, Apache-2.0 like everything
else). All Planned — see the public roadmap at
[quireoffice.dev/roadmap](https://quireoffice.dev/roadmap).

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

The gates encode what "done" means: every non-quarantined file must round-trip
byte-identical — `roundtrip --check` is red if any single one drifts — and anything
excluded is quarantined *with a written reason*, counted separately in every summary.
That is why the roadmap says the next features are "ordered by the corpus failure
clusters": the render-lab comparison ranks what's broken next, not a feature calendar.

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

The engine itself: yes — Apache-2.0 source, `quire-engine` as a library, `quire-cli`
for pipelines, and the wasm shell for browsers (the lossless guarantee and the CI
gates are the contract to hold us to). What doesn't exist yet is the editing surface:
today's engine is read/render/round-trip, and the editing API is the next engine
milestone. The product line around the engine (browser editor, Tauri desktop app,
self-hostable collaboration server) is on the public roadmap.

## Where's the roadmap discussion / issue tracker?

Issues on [`quire-office/quire`](https://github.com/quire-office/quire/issues).
Corpus-driven bugs are the most actionable kind — attach the `.docx` and the output
of `roundtrip --check` on it, and the report is half-written.

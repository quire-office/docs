# Architecture & preview notes

*This page was named "Getting started" in the original card. Because the source
repository is still private, it has been renamed honestly: everything below is
readable **without** repo access. Any command that needs a checkout is tagged
**[requires repo access]** and becomes copy-pasteable at public release.*

## What you can evaluate today

Nothing needs to be built to understand Quire. The three documents that carry the
project's claims are:

1. [Architecture](./architecture) — what the crates are and which two rules CI
   enforces between them.
2. [Lossless guarantee](./lossless-guarantee) — the exact semantics of
   `roundtrip --check`: byte-identical vs. structural zero-loss, and what the
   400-file corpus gate proves.
3. [CLI reference](./cli-reference) — every subcommand and flag, with **captured
   real output** from `quire-cli` 0.1.0 (commit `8d3f401`) so the semantics are
   concrete even before you can run the tool.

## Reading the numbers in these docs

| Claim | Where it comes from | How to re-verify at release |
|---|---|---|
| 399/399 non-quarantined corpus files byte-identical | `quire-cli roundtrip corpus --check`, run locally on commit `8d3f401`; also the ★ round-trip gate in CI on ubuntu/macOS/Windows | `cargo run -p quire-cli -- roundtrip corpus --check` **[requires repo access]** |
| 400-file corpus, feature coverage, license whitelist | `corpus/manifest.json` + `scripts/verify_corpus.py` gates | `python3 scripts/verify_corpus.py` **[requires repo access]** |
| p95 < 8 ms typing latency (500 pages) | CI input-latency gate + `core/layout/examples/p6_bench.rs` | `cargo run --release -p quire-layout --example p6_bench` **[requires repo access]** |
| wasm first payload: CRDT absent by symbol scan | `scripts/check-wasm-size.mjs` CI gate | `cd shells/web && npm run build:wasm && npm run size` **[requires repo access]** |

## Preview builds at public release

At public release the repository is a standard Cargo workspace — no services to
provision, no API keys:

```bash
# [requires repo access]
git clone https://github.com/quire-office/quire.git && cd quire
cargo test --workspace                                  # engine tests, incl. a real docx fixture
cargo run -p quire-cli -- info fixtures/sample.docx     # pages / paragraphs / preserved parts
cargo run -p quire-cli -- roundtrip corpus --check      # the lossless gate, in your terminal
```

The browser demo (needs `wasm-pack` + Node):

```bash
# [requires repo access]
cd shells/web && npm install && npm run demo            # streaming wasm load + Canvas2D demo
```

See [CLI reference](./cli-reference) for all flags and
[render-lab](./render-lab) for the LibreOffice cross-engine diff harness.

## Project status at a glance

From the repository status table (`README.md`, commit `8d3f401`):

| Item | Status |
|---|---|
| DOCX parsing (paragraphs/runs/bold-italic/styles/entities, lossless part retention) | ✅ |
| Lossless round-trip (hand-rolled zip, ZIP64, extra/comment) + `roundtrip --check` | ✅ |
| Knuth-Plass optimal line breaking + UAX#14 break rules | ✅ |
| Real font-metric shaping + golden break-point snapshots | ✅ |
| Page geometry from `sectPr` (Letter/landscape/multi-section per page) | ✅ |
| Paragraph cache + incremental pagination + budgeted reflow | ✅ |
| Display-list contract + CLI render head + render-lab skeleton | ✅ |
| Dual-target CI (3 OS × native + wasm32) + wasm split/size gate | ✅ |
| Tables, headers/footers, columns, tracked changes | ⏳ Phase 3–4, driven by corpus green-light rate |
| CRDT collaborative layer (loro adapter) | ⏳ Phase 4 (chunk + trait land today) |
| XLSX / PPTX sibling crates | ⏳ After DOCX depth ("Then" milestones) |

## Where to ask

Until the repository is public there is no issue tracker to point at. After public
release, open issues on [`quire-office/quire`](https://github.com/quire-office/quire)
— the corpus makes most bug reports reproducible: attach the offending `.docx` and the
output of `roundtrip --check` on it.

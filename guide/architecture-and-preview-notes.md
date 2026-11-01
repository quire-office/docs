# Architecture & preview notes

*The source repository is public: everything below is readable **and runnable**.
Every command on this page is copy-pasteable against a plain clone.*

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

| Claim | Where it comes from | How to re-verify |
|---|---|---|
| 399/399 non-quarantined corpus files byte-identical | `quire-cli roundtrip corpus --check`, run locally on commit `8d3f401`; also the ★ round-trip gate in CI on ubuntu/Windows (macOS job paused for quota) | `cargo run -p quire-cli -- roundtrip corpus --check` |
| 400-file corpus, feature coverage, license whitelist | `corpus/manifest.json` + `scripts/verify_corpus.py` gates | `python3 scripts/verify_corpus.py` |
| p95 < 8 ms typing latency (500 pages) | CI input-latency gate + `core/layout/examples/p6_bench.rs` | `cargo run --release -p quire-layout --example p6_bench` |
| wasm first payload: CRDT absent by symbol scan | `scripts/check-wasm-size.mjs` CI gate | `cd shells/web && npm run build:wasm && npm run size` |

## Building from source

The repository is a standard Cargo workspace — no services to provision, no API keys:

```bash
git clone https://github.com/quire-office/quire.git && cd quire
cargo test --workspace                                  # engine tests, incl. a real docx fixture
cargo run -p quire-cli -- info fixtures/sample.docx     # pages / paragraphs / preserved parts
cargo run -p quire-cli -- roundtrip corpus --check      # the lossless gate, in your terminal
```

The browser demo (needs `wasm-pack` + Node):

```bash
cd shells/web && npm install && npm run demo            # streaming wasm load + Canvas2D demo
```

Want to see it without building anything? The hosted playground runs the same wasm
engine entirely in your browser: <https://quireoffice.dev/playground/>.

See [CLI reference](./cli-reference) for all flags and
[render-lab](./render-lab) for the LibreOffice cross-engine diff harness.

## Project status at a glance

| Item | Status |
|---|---|
| DOCX parsing (paragraphs/runs/bold-italic/styles/entities, lossless part retention) | ✅ |
| Lossless round-trip (hand-rolled zip, ZIP64, extra/comment) + `roundtrip --check` | ✅ |
| Knuth-Plass optimal line breaking + UAX#14 break rules | ✅ |
| Real font-metric shaping + golden break-point snapshots | ✅ |
| Page geometry from `sectPr` (Letter/landscape/multi-section per page) | ✅ |
| Paragraph cache + incremental pagination + budgeted reflow | ✅ |
| Display-list contract + CLI render head + Canvas2D browser renderer + render-lab | ✅ |
| Dual-target CI (2 OS × native + wasm32; macOS paused) + wasm split/size gate | ✅ |
| Tables (cross-page slicing with repeated headers), headers/footers, style cascade with conditional formatting, floating images, forced breaks | ✅ |
| Columns (`w:cols`) flow re-layout | ✅ |
| Tracked changes rendering (`w:ins`/`w:del` semantics: underline vs strikethrough per ECMA §17.13) | ✅ |
| Table shading (`w:shd`, themeFill/tint) + picture duotone colour effects | ✅ |
| Editing API (mutations + lossless save chain) | ⏳ The next engine milestone; see the public roadmap |
| ODF family (`core/odf`: ODT first) | ⏳ Planned; mapped from the OASIS spec |
| CRDT collaborative layer (loro adapter) | ⏳ Adapter slot today |
| XLSX sibling crate | ⏳ In progress (`core/xlsx`): OPC/lossless layer reused byte-identically, 80-file corpus with per-file licensing collected; workbook model next |
| PPTX sibling crate | ⏳ After XLSX |

## Where to ask

Open issues on [`quire-office/quire`](https://github.com/quire-office/quire/issues)
— the corpus makes most bug reports reproducible: attach the offending `.docx` and the
output of `roundtrip --check` on it.

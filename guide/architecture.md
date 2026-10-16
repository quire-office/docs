# Architecture

![Quire layering diagram](/architecture-layers.svg)

The engine is organized as **one core, two shells**. Everything that decides *what a
page looks like* — parsing, line breaking, pagination, shaping — lives in
platform-neutral Rust crates. Everything platform-specific — how bytes reach the
engine and how pixels come out — lives in thin shells.

## The crates

| Crate | Path | Responsibility |
|---|---|---|
| `quire-ooxml` | `core/ooxml` | DOCX: OPC container (hand-rolled ZIP + `quick-xml`), document model, **lossless part retention**, `sectPr` page geometry (`pgSz`/`pgMar`/type), zip-structure differ for `roundtrip --check`. |
| `quire-layout` | `core/layout` | Line breaking (Knuth-Plass + UAX#14 opportunities), shaping with real font metrics (`swash`), pagination, paragraph-level cache, incremental/budgeted reflow, caret geometry. |
| `quire-render-trait` | `core/render-trait` | The display-list contract: `PageDisplayList` / `DrawItem` (text runs, rects, rules) as plain serializable data. Core never draws pixels. |
| `quire-crdt` | `core/crdt` | Collaboration backend trait + in-memory placeholder; loro adapter lands in Phase 4. Lives **only** in the lazy collab chunk. |
| `quire-engine` | `core/engine-api` | The sole entry point: opens documents, exposes page counts, display lists, edit operations, save and round-trip diff to shells. |
| `quire-cli` | `shells/native` | Headless CLI (`info`/`page`/`dump`/`render`/`roundtrip`) — the CI evaluation head and future GUI host. |
| `quire-web` | `shells/web` | `wasm-bindgen` adapter, zero business logic; JS side renders display-list JSON to Canvas2D. |
| `quire-web-collab` | `shells/web-collab` | Second, lazily-loaded wasm chunk carrying the CRDT code — physically absent from the first payload. |

## The two iron rules

### 1. Layering is machine-enforced

`core/` never imports shells; shells only ever import `quire-engine` — never a crate
below it. `scripts/check-layering.sh` (run on every CI job, all three OSes) asserts
this with `cargo tree`:

- no `core` crate may depend on `quire-web` / `quire-cli` (even transitively for the
  CRDT split rule below);
- `quire-cli` and `quire-web` must not directly import `quire-ooxml`, `quire-layout`,
  `quire-render-trait` or `quire-crdt` — `quire-engine` is the sole entry;
- **unpacking rule:** the main `quire-web` wasm must not reach `quire-crdt` even
  transitively (CRDT never ships in the first payload), while `quire-web-collab`
  *must* depend on it (prevents a "fake split" where the chunk exists but the feature
  silently disconnected).

The payoff: shells can be split out of the repository later (installers, deployed
apps, separate communities) without untangling anything, because they were never
entangled.

### 2. Dual-target is the premise

Every crate in `core/` must compile for `wasm32-unknown-unknown` — CI runs that gate
on ubuntu, macOS (arm64 host *and* an extra amd64 clippy cell) and Windows. That's why
the dependency list is deliberately narrow: `swash` is built without default features
(system font discovery would make native and browser pagination disagree), and
`unicode-linebreak` is a `no_std` table generator from `LineBreak.txt` with zero
system dependencies. The ZIP reader/writer in `core/ooxml` is hand-rolled for exactly
this reason — byte-level losslessness needs code we control completely.

## From DOCX bytes to pixels

```
docx bytes ──▶ quire-ooxml ──▶ paragraphs/runs + styles + sectPr
                                   │
                                   ▼
                             quire-layout
                   shaping → Knuth-Plass lines → pagination
                                   │
                                   ▼
                        PageDisplayList (JSON)
                     ┌─────────────┴─────────────┐
                     ▼                           ▼
             shells/native (SVG today,       shells/web
             wgpu/vello candidate)           (Canvas2D → WebGPU later)
```

Both renderers consume the *same* display list. A page is geometry + text items
(`Text`, `Rect`, `Rule`) with point units — the shell decides how pixels happen, which
is what lets a headless CI render and a live browser view agree on line breaks.

## Incremental editing

Editing must not re-typeset the world:

- **Paragraph-level cache** — editing paragraph *k* invalidates from there, not from
  page one.
- **Budgeted reflow** — `set_sync_budget(n)` caps synchronous re-pagination at *n*
  pages; the tail continues in `reflow_step()` (driven by `requestIdleCallback` in the
  web shell) until `is_settled()`.
- **Equivalence gate** — incremental results must equal a full rebuild; a CI input-
  latency gate asserts p95 < 8 ms typing on a 500-page document.

## Wasm packaging

The browser shell streams the main wasm (`instantiateStreaming`, download overlapping
compilation) and only dynamic-imports the collab chunk when collaboration is enabled.
`scripts/check-wasm-size.mjs` is the CI gate: it records raw/gzip sizes, enforces the
first-payload budget, and scans **export symbols** so CRDT symbols appearing in the
main bundle fail the build regardless of how the bundling was rearranged.

## Related

- Why the discipline exists: [Lossless guarantee](./lossless-guarantee)
- How to exercise the engine: [CLI reference](./cli-reference)
- Why no end-user app yet: [FAQ](./faq#why-not-just-ship-an-app)

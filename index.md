---
home: true
layout: home

hero:
  name: Quire
  text: Lossless Office engines in Rust
  tagline: DOCX today. Parts Quire doesn't touch are written back byte-for-byte — 399/399 non-quarantined corpus files round-trip byte-identical in CI.
  image:
    src: /mark-color.png
    alt: Quire mark
  actions:
    - theme: brand
      text: Open the playground
      link: https://quireoffice.dev/playground/
    - theme: alt
      text: Architecture & preview notes
      link: /guide/architecture-and-preview-notes
    - theme: alt
      text: CLI reference
      link: /guide/cli-reference
    - theme: alt
      text: GitHub
      link: https://github.com/quire-office

features:
  - icon:
      src: /icons/loop.svg
      alt: Loop arrows
      width: 48
      height: 48
    title: Lossless by construction
    details: >-
      A hand-rolled ZIP reader/writer copies untouched parts byte-for-byte — ZIP64,
      extra fields, comments and gaps included. roundtrip --check proves it on a
      400-file real-world corpus, on every CI run.
  - icon:
      src: /icons/shells.svg
      alt: Core with two shells
      width: 48
      height: 48
    title: One core, two shells
    details: >-
      A single Rust core compiles to native and wasm32-unknown-unknown; the desktop
      CLI head and the browser shell are thin platform adapters. The layering rule is
      machine-enforced in CI, not left to convention.
  - icon:
      src: /icons/metrics.svg
      alt: Baseline and measurement rule
      width: 48
      height: 48
    title: Real typesetting
    details: >-
      Knuth-Plass optimal line breaking, UAX#14 break rules, real font-metric shaping
      and incremental budgeted pagination — one display list feeds both a native and a
      browser renderer.
---

## Status snapshot

Quire is pre-release. What works today, from the repository as it stands:

| Area | Today |
|---|---|
| Formats | DOCX today. XLSX in progress as a sibling crate (`core/xlsx`) on the same OPC container and round-trip layer — corpus and round-trip gates already collected; PPTX planned after it, with the ODF family (ODT first) planned alongside. |
| Lossless round-trip | `roundtrip --check` gate over the 400-file corpus (1 file quarantined for upstream CRC damage); CI reports byte-identical counts per run. |
| Layout | Knuth-Plass line breaking + UAX#14, `sectPr` page geometry, multi-column `w:cols`, incremental pagination with p95 < 8 ms typing latency on a 500-page gate. |
| Rendering | Display-list JSON contract + CLI SVG head + Canvas2D browser renderer. Tables (cross-page slicing with repeated headers), headers/footers, style cascade with conditional formatting, floating images, table shading, picture duotone and column layout landed; remaining gaps are ordered by the corpus failure clusters. |
| Try it now | The browser playground renders `.docx` files entirely in your tab (wasm, read-only preview): <https://quireoffice.dev/playground/> |
| Collaboration | CRDT adapter slot (`core/crdt`), split out of the first wasm payload; the loro adapter lands with the collaboration milestone. |

::: tip The repository is public
Clone it and run the gates yourself — every command in these docs is
copy-pasteable: <https://github.com/quire-office/quire>.
:::

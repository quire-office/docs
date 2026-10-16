# Introduction

Quire is an open-source family of **lossless Office document engines written in Rust**.
It parses, lays out, and saves real-world Office documents without silently corrupting
anything it doesn't explicitly edit. What ships today is **DOCX**; XLSX and PPTX join
later as sibling format crates on the same core (see [FAQ — format roadmap](./faq#what-is-the-format-roadmap)).

Two properties define the project:

1. **Lossless by construction.** Parts of a document that Quire doesn't touch are
   written back *byte-for-byte* — ZIP64 records, unknown extra fields, archive
   comments and padding gaps included. This is not a best-effort claim: the
   `roundtrip --check` gate replays the whole 400-file real-world corpus on every CI
   run, and a 399/399 byte-identical result (1 file quarantined for upstream damage)
   is the current bar. See [Lossless guarantee](./lossless-guarantee).
2. **One core, two shells.** The typesetting engine is a single Rust core compiled to
   two targets — native and `wasm32-unknown-unknown` — and the desktop CLI head and
   the browser shell are thin platform adapters. The boundary is machine-enforced in
   CI, not left to convention. See [Architecture](./architecture).

## What "lossless" buys you

Most open-source DOCX writers round-trip through their own object model: everything
gets re-serialized, so anything the library doesn't model is quietly dropped or
rewritten. That's acceptable for a viewer; it's disqualifying for an editor you'd
trust with legal documents. Quire's discipline is the opposite — the untouched 99%
of a file passes through the engine as opaque bytes, and only the parts you edit are
re-encoded. The [CLI reference](./cli-reference#quire-cli-roundtrip) shows how to
verify this on your own documents in one command.

## Where the code lives

| Repository | Contents |
|---|---|
| [`quire-office/quire`](https://github.com/quire-office/quire) | The engine: `core/` crates, `shells/` adapters, CI gates, corpus, scripts, brand assets. |
| This site (`quire-office/docs`) | These pages. |

::: warning Private until public release
The `quire` repository is currently private. Pages here describe the repository as it
stands today; every claim is traceable to a file or command in it. Commands that need
a checkout are tagged **[requires repo access]** and become copy-pasteable at public
release.
:::

## Where to go next

- New here, no checkout needed → [Architecture & preview notes](./architecture-and-preview-notes)
- Want the layout engine's shape → [Architecture](./architecture)
- Want the save-safety story → [Lossless guarantee](./lossless-guarantee)
- Want to run things → [CLI reference](./cli-reference) and [render-lab](./render-lab)
- Wondering why not just ship an app → [FAQ](./faq)

## License

Source code is Apache License 2.0 (`LICENSE-APACHE` in the repository). Exceptions: the
Noto Sans TC subset fonts under `core/layout/assets/` remain under SIL Open Font
License 1.1, and the test corpus under `corpus/` tracks per-file licensing in
`corpus/manifest.json`. Brand assets (logo, banner) are CC BY 4.0 — usage rules live in
`brand/README.md` of the repository.

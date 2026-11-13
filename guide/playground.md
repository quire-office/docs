# Playground

The playground is the wasm build of the same engine, running entirely in your
browser: <https://quireoffice.dev/playground/>. Drop a `.docx` on the page and the
file never leaves your machine — decompression, OOXML parsing, layout and painting
all happen in the tab.

## What it is

| Aspect | Today |
|---|---|
| Engine | `shells/web` — the same Rust core compiled to `wasm32-unknown-unknown`, with a thin `wasm-bindgen` glue layer. Zero business logic lives in JavaScript. |
| Rendering | The engine emits its display-list JSON contract; a Canvas2D renderer in the page paints it. Same contract the CLI SVG head consumes. |
| Mode | **Read-only preview.** Pagination, tables, images, shading — yes. Editing — not yet in this shell. The engine editing API has landed (v0.1.0-beta.12, see [Editing API](./editing)); wiring it into the playground is the next shell milestone. |
| Privacy | Files are processed in-page; nothing is uploaded. |
| First payload | The CRDT/collaboration code is physically absent from the wasm the playground loads — CI scans the symbols to enforce the split (see [Architecture](./architecture)). |

## How the engine binary gets to you

The website repository does **not** carry the wasm binary in git. The build pipeline
fetches it from the engine's GitHub release assets and pins it by SHA-256:

1. A manifest in the site repository records the release version and the expected
   `sha256` of each artifact (`quire_web_bg.wasm`, `quire_web.js`).
2. The site build fetches those exact files from the tagged release
   (`https://github.com/quire-office/quire/releases/download/v<version>/…`) and
   verifies each SHA-256; a mismatch fails the build, so a served binary can never
   silently differ from the audited release.
3. CI publishes those release artifacts automatically on every version tag.

That means "what runs in your browser" is always a specific, checksum-pinned release
of the open engine — you can diff it against source.

## Trying the same engine from source

```bash
git clone https://github.com/quire-office/quire.git && cd quire/shells/web
npm install && npm run demo        # streaming wasm load + Canvas2D demo
```

Or run the whole site stack (playground page included) against a locally built
engine — see `shells/web/README.md` in the repository.

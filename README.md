# Quire docs

Source of [docs.quireoffice.dev](https://docs.quireoffice.dev) — architecture, CLI
reference and the lossless guarantee for
[Quire](https://github.com/quire-office/quire), the lossless Office document engines
in Rust.

Built with [VitePress](https://vitepress.dev) (decision log: mdbook rejected — weaker
CJK search and style unification; local search is the built-in minisearch provider).

## Working on it

```bash
npm install
npm run docs:dev        # dev server with hot reload
npm run check           # build + link check + CLI docs gate (what CI runs)
```

Layout:

```
.vitepress/config.mts     site config (nav/sidebar/search; GitHub Pages: cleanUrls off)
.vitepress/theme/         default theme + brand palette CSS (ink/seal-red/paper)
index.md                  home (hero + feature cards + status snapshot)
guide/                    content pages (English-first; 繁體中文 i18n is a
                          post-public-release follow-up card)
public/                   brand assets copied from quire/brand + architecture diagram
cli-snapshots/            real captured quire-cli outputs (see manifest.json)
scripts/check-links.mjs   dead-link/anchor/asset gate (runs against built dist;
                          github.com excluded until the repo flips public — see file)
scripts/check-cli-docs.mjs  CLI prose ↔ snapshot consistency gate
CNAME                     docs.quireoffice.dev (GitHub Pages custom domain)
```

Content rules (enforced by review, not tooling):

- Every claim traces to the `quire` repository — a file, a script, or captured
  command output. Invented functionality is a red flag; commands needing a checkout
  carry the **[requires repo access]** tag while the repo is private.
- CLI surface changes must ship with re-captured snapshots in `cli-snapshots/`
  (update `manifest.json` `sourceCommit` too), or `npm run check:cli` goes red.

## Deploy

GitHub Pages (subdomain `docs.quireoffice.dev`, per PM decision — Pages cannot mount
two repos under one domain's subpath). Workflow `.github/workflows/docs.yml` runs the
gates on every push/PR; the Pages publish step (or `actions/deploy-pages`) is wired
when the repository goes public.

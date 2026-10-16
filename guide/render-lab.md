# render-lab

`scripts/render_lab.py` is the **cross-engine rendering comparator**: it measures how
far Quire's pagination has converged toward the industry baseline by diffing it
against LibreOffice, page by page. It is a measurement harness, not a gate — the
report tracks convergence speed, it does not (yet) fail the build.

## What it does, per file

```
docx ──▶ LibreOffice headless ──▶ PDF ──▶ PyMuPDF ──▶ per-page text + geometry (baseline)
  └───▶ quire-cli render ──▶ per-page SVG + pagebreaks.json (ours)
                     │
                     ▼
        per-page compare: page count, first/last line text, line count,
        page size vs sectPr  ──▶  markdown diff report
```

- LibreOffice conversion crashes or timeouts are recorded as `lo_fail` and skipped —
  one hostile document must never break the measurement run.
- Page sizes are compared per page against the geometry Quire read from the document's
  own `sectPr` (not a hard-coded A4 assumption).
- Similarity per page is a `SequenceMatcher` ratio over the first 8 lines of text
  (0 = unrelated, 1 = identical); the report flags the **first divergent page**
  (score < 0.6), which is where layout work should be aimed next.

## Running it

```bash
# [requires repo access] — needs LibreOffice and `python3 -m pip install --user pymupdf`
python3 scripts/render_lab.py --n 10          # first 10 files of the corpus manifest
python3 scripts/render_lab.py a.docx b.docx   # or explicit files
```

| Argument | Default | Meaning |
|---|---|---|
| `files` (positional) | corpus manifest, first `--n` files | Explicit `.docx` targets. |
| `--corpus <dir>` | `<repo>/corpus` | Corpus root (for manifest lookup). |
| `--n <k>` | `10` | How many manifest files to take. |
| `--out <dir>` | `<repo>/out/render-lab` | Where per-file artifacts go (SVGs, `pagebreaks.json`). |
| `--report <path>` | `<out>/report.md` | Report output path. |

`soffice` is auto-detected: `soffice`/`libreoffice` on Linux, or the Windows
`soffice.exe` when running under WSL.

## Reading the report

The markdown report is one table: file, LibreOffice page count vs. ours, page-count
match, per-page similarity for the first 6 pages, first divergence, and notes (e.g.
per-page size mismatches against `sectPr`). What to watch:

- **Page-count convergence** — do we break pages where LibreOffice does?
- **Divergence position** — a document that first diverges on page 1 is a systemic
  geometry issue; page 12 is a pagination-rule issue.
- The known gaps behind current divergence: tables, headers/footers and columns are
  Phase 3–4 (see [project status](./architecture-and-preview-notes#project-status-at-a-glance)).

## Related commands

`render-lab` sits on top of [`quire-cli render`](./cli-reference#quire-cli-render-file-docx-out-dir)
(our side) and the corpus gate [`verify_corpus.py`](./faq#why-a-400-file-corpus-instead-of-unit-tests)
(picking what to measure).

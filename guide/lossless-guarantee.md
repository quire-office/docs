# Lossless guarantee

"Lossless" is the product promise, so it gets its own precise definition. Quire
defines it in **two layers**, and `roundtrip --check` reports both — because the
strongest guarantee is not always achievable (or even correct) for every file, and a
tool that lies about which layer it met is worse than one that states the layer.

## Layer 1 — byte-identical

The re-saved file equals the original *as a byte string*: every local header, central
directory record, compressed data blob, offset, extra field, comment and padding gap
in the same position. This is the ideal outcome for an untouched open→save cycle, and
it is what the corpus achieves today: **399 of 399** non-quarantined real-world files
round-trip byte-identical (the 400th is quarantined for CRC damage inherited from
upstream). ZIP64 records and unrecognized vendor extensions included.

```bash
# [requires repo access] — captured output on fixtures/sample.docx:
cargo run -p quire-cli -- roundtrip fixtures/sample.docx --check

✓ fixtures/sample.docx（byte-identical，3 parts）
roundtrip --check: 1 檔（另有 0 檔隔離不計紅），byte-identical 1，失敗 0
```

*(CLI output is captured from the Rust binary and is Chinese-first, matching the
repository's language convention. The CJK text above also doubles as a live
CJK-rendering example for this documentation site.)*

## Layer 2 — structural zero-loss

Byte identity can legitimately break when a part is edited: re-compressing
`word/document.xml` moves every following entry, so offsets change and (depending on
the deflate stream) even an unchanged blob can land elsewhere. The comparison
therefore works on **ZIP structure fields, not whole-file hashes**. For each entry:

| Field compared | Meaning |
|---|---|
| `name`, `method`, `crc`, sizes, time, attributes | Entry identity and metadata |
| `central_identical` | Whole central-directory record byte-identical (strongest: offset unchanged too) |
| `data_identical` | Compressed data bytes byte-identical |
| `content_identical` | Decompressed plaintext equal (content-level equivalence) |
| `local_identical` | Local file header byte-identical |
| `gap_identical` | Inter-entry bytes (data descriptors, padding) byte-identical |
| `extra_identical` | Extra-field set (id → bytes) equal |
| entry comment, archive comment | Comment payloads preserved |

A save passes at Layer 2 (**`UntouchedZeroLoss`**) when every part *you did not touch*
has identical compressed bytes, extra fields, comments and gaps — while offsets,
end-of-central-directory records, and re-compression of whitelisted (edited) entries
are allowed to differ. Any content-level difference in an untouched entry is a
`Violation` and fails the gate. A part that vanishes (`missing`) is always a
violation; a part that appears uninvited (`added`) is an off-whitelist change.

```text
# Verdicts the differ can report (core/ooxml/src/diff.rs):
ByteIdentical        — whole file identical (Layer 1)
UntouchedZeroLoss    — pass threshold: untouched entries zero-loss (Layer 2)
Violation(...)       — untouched entry differs → red, non-zero exit
```

## `roundtrip --check`: the gate

```bash
# [requires repo access]
cargo run -p quire-cli -- roundtrip <file|dir> [--out <path>] [--check]
                                       [--allow part1,part2]
                                       [--quarantine <quarantine.json>]
```

- Opens each `.docx` (a file, or recursively a directory — the corpus scan), saves it
  back without edits, and diffs original vs. saved at the ZIP-structure level.
- `--allow` declares parts whose content *may* legitimately change (the edited-part
  whitelist; the engine marks edited parts automatically in-process).
- `--quarantine` names a JSON list of files excluded from scoring — used for inputs
  that are damaged upstream (see below), each with a written reason, so exclusions are
  auditable rather than silent. When scanning a directory, `<dir>/quarantine.json` is
  picked up automatically.
- **Non-zero exit means loss detected in something Quire touched.** CI runs this
  on three operating systems; it's the ★ gate that must stay green.

The summary line reports both layers separately, so a regression from Layer 1 to
Layer 2 is visible even when the gate stays green:

```text
roundtrip --check: 399 檔（另有 1 檔隔離不計紅），byte-identical 399，失敗 0
```

## Quarantine is not forgiveness

The current quarantine list holds exactly one file — a LibreOffice fuzz-test sample
whose `word/theme/theme1.xml` CRC is already broken in the upstream repository. It is
listed with its reason in `corpus/quarantine.json`. The rule: quarantined files are
skipped, counted separately in the summary (`另有 N 檔隔離`), and must carry a reason
that says *why upstream is at fault and what would fix it*. Silence is a red build.

## Why this discipline extends to the repository itself

`.gitattributes` pins text files to LF and `.docx` files to binary. Without it,
`core.autocrlf=true` on Windows runners would corrupt byte-level round-trip assertions
and make `cargo fmt --check` fail spuriously — the lossless promise stops at the
byte boundary, so even git's "helpful" newline normalization is fenced off.

## Related

- What the differ plugs into: [Architecture](./architecture)
- All flags and captured outputs: [CLI reference](./cli-reference#quire-cli-roundtrip)
- Why 400 files instead of unit tests: [FAQ](./faq#why-a-400-file-corpus-instead-of-unit-tests)

# Editing API

Quire's editing surface is a mutation API on the real OOXML document tree. There is no
shadow document model behind it: every operation is applied to the parsed tree, and the
saved file goes through the same lossless round-trip guarantees as the read path.

Reference implementation: `core/engine-api/src/mutation.rs` (`pub enum Mutation`,
`apply_mutation`, `apply_batch`, `undo`, `redo`).

## Shape of the contract

```text
apply_mutation(op)      -> Result<MutationOutcome, MutationError>
apply_batch([op, ...])  -> Result<MutationOutcome, MutationError>   # one undo step
undo() / redo()         -> Result<Option<MutationOutcome>, MutationError>
```

Each accepted mutation returns a `MutationOutcome` carrying the affected range plus the
re-paginated result, so a shell never has to guess where the document moved. Mutations
are recorded as `UndoEntry` values; `apply_batch` collapses into a single undo step.

Two properties are non-negotiable and are what the CI gates hold the API to:

- **Model replay, not DOM edits.** Every mutation re-runs pagination for the whole
  document. An edit that changes line breaking changes page count, and the shell learns
  about it from the return value.
- **Lossless save chain.** Untouched parts stay byte-identical. Media replacement is
  copy-on-write by default; forcing garbage collection of unreferenced media is an
  explicit, irreversible option.
- **Honest refusal.** Operations the spec or the model cannot honour (for example
  deleting the trailing body-level `sectPr`, or removing a separator footnote) return an
  error rather than silently half-applying.

## What is implemented

32 mutation variants, grouped by the design-doc milestones:

| Group | Variants |
|---|---|
| M1 — text and paragraph structure | `InsertText`, `DeleteRange` (cross-paragraph within one container), `InsertBreak`, `SplitParagraph`, `MergeParagraphWithNext` |
| M2 — character formatting and styles | `FormatTextRange`, `SetParagraphStyle`, `UpsertNamedStyle` |
| M3 — lists | `SetListNumbering` |
| M4 — tables | `InsertTable`, `DeleteTable`, `InsertTableRow`, `DeleteTableRow`, `InsertTableColumn`, `DeleteTableColumn`, `MergeTableCells`, `SplitTableCell`, `SetTableProps`, `SetRowProps`, `SetCellProps` |
| M5 — images | `InsertInlineImage`, `InsertFloatingImage`, `ResizeOrMoveImage`, `ReplaceImageMedia`, `DeleteImage` |
| M6 — sections, headers/footers, notes | `SetSectionProperties`, `InsertSectionBreak`, `DeleteSectionBreak`, `ConfigureHeaderFooterSlot`, `InsertNote`, `DeleteNote`, `SetNoteProperties` |

Every variant routes through `SubDocTarget`, so the same operation can address the main
document body, a header/footer slot, a footnote or an endnote.

Table mutations consume the layout crate's table input
(`quire_layout::table::TableInput`) — table edits re-slice across pages through the same
machinery that renders a loaded document, not a second layouter.

## What is *not* in the API yet

The direct-format patch (`RunDirectPatch`) covers bold, italic, colour, size and a named
character style; paragraph-level properties (`ParaPropsPatch`) cover style id,
page-break-before, line spacing and alignment. Underline, strikethrough, superscript,
subscript, highlighting and font family are on the tracking list (milestone K29e) and
stay unexposed until the engine implements them — the browser shell's buttons for those
remain marked pending rather than pretending to work.

## Where the shell stands

The browser playground still runs read-only. Its wasm export exposes a generic
`apply_mutation_json` entry point, and the JavaScript adapter currently builds five of
the 32 variants (`InsertText`, `DeleteRange`, `InsertBreak`, `FormatTextRange`,
`SetParagraphStyle`) for the typing loop. Wiring the remaining variants — caret
placement, selection, IME composition — into a published editing shell is the next
shell milestone, tracked separately from the engine API itself.

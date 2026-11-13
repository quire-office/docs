# 編輯 API

Quire 的編輯介面是一個作用在真實 OOXML 文件樹上的 mutation API。背後沒有一套影子文件模型：每個操作都直接套用在解析後的樹上，存檔路徑也走與讀取路徑相同的無損往返保證。

實作參照：`core/engine-api/src/mutation.rs`（`pub enum Mutation`、`apply_mutation`、`apply_batch`、`undo`、`redo`）。

## 契約形態

```text
apply_mutation(op)      -> Result<MutationOutcome, MutationError>
apply_batch([op, ...])  -> Result<MutationOutcome, MutationError>   # one undo step
undo() / redo()         -> Result<Option<MutationOutcome>, MutationError>
```

每個被接受的 mutation 都回傳 `MutationOutcome`，帶著受影響的範圍與重排版後的結果，因此外殼不必猜文件移到哪裡。Mutation 會記錄成 `UndoEntry`；`apply_batch` 收斂成單一復原步驟。

有三條不可妥協的性質，也是 CI 閘門盯住這個 API 的地方：

- **模型回放，不是 DOM 修補。** 每個 mutation 都會重跑整份文件的分頁。一個改變換行的編輯會改變頁數，而外殼從回傳值就知道這件事。
- **無損存檔鏈。** 未觸動的部件維持 byte-identical。媒體替換預設為 copy-on-write；強制回收未參照的媒體是一個明確、不可逆的選項。
- **誠實拒絕。** 規格或模型無法兌現的操作（例如刪除 body 尾端的 `sectPr`、或移除系統分隔線註腳）會回傳錯誤，而不會悄悄套用一半。

## 已實作的項目

32 種 Mutation 變體，依設計書里程碑分組：

| 群組 | 變體 |
|---|---|
| M1 — 文字與段落結構 | `InsertText`、`DeleteRange`（同容器跨段刪除）、`InsertBreak`、`SplitParagraph`、`MergeParagraphWithNext` |
| M2 — 字元格式與樣式 | `FormatTextRange`、`SetParagraphStyle`、`UpsertNamedStyle` |
| M3 — 清單 | `SetListNumbering` |
| M4 — 表格 | `InsertTable`、`DeleteTable`、`InsertTableRow`、`DeleteTableRow`、`InsertTableColumn`、`DeleteTableColumn`、`MergeTableCells`、`SplitTableCell`、`SetTableProps`、`SetRowProps`、`SetCellProps` |
| M5 — 圖片 | `InsertInlineImage`、`InsertFloatingImage`、`ResizeOrMoveImage`、`ReplaceImageMedia`、`DeleteImage` |
| M6 — 節、頁首／頁尾、註腳 | `SetSectionProperties`、`InsertSectionBreak`、`DeleteSectionBreak`、`ConfigureHeaderFooterSlot`、`InsertNote`、`DeleteNote`、`SetNoteProperties` |

每個變體都經 `SubDocTarget` 路由，因此同一個操作可以指向主文件本體、頁首／頁尾 slot、註腳或尾註。

表格 mutation 消費排版 crate 的表格輸入（`quire_layout::table::TableInput`）——表格編輯是透過與渲染一份載入文件相同的機制重新跨頁切分，而不是另造第二套排版器。

## API 還沒有的東西

直接格式補丁（`RunDirectPatch`）涵蓋粗體、斜體、字色、字級與具名字元樣式；段落級屬性（`ParaPropsPatch`）涵蓋樣式 id、段前強制分頁、行距與對齊。底線、刪除線、上標、下標、highlight 與字型族列在追蹤清單（里程碑 K29e），在引擎實作之前不會開放——瀏覽器外殼上那些按鈕維持標示 pending，而不是假裝能用。

## 外殼目前的位置

瀏覽器 playground 仍是唯讀執行。它的 wasm 輸出開放了一個通用的 `apply_mutation_json` 進入點，而 JavaScript 介接層目前為打字閉環建構了 32 種變體中的五種（`InsertText`、`DeleteRange`、`InsertBreak`、`FormatTextRange`、`SetParagraphStyle`）。把其餘變體——游標定位、選取、IME 組字合成——接進一個對外發布的編輯外殼，是下一個外殼里程碑，與引擎 API 本身分開追蹤。

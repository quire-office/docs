# CLI 參考手冊

`quire-cli`（crate 為 `quire-cli`，二進位檔名為 `quire-cli`）是引擎的原生 head：它存在是為了在圖形外殼就緒前進行 CI 評估與開發，並在與所有外殼相同的分層規則下建置——它僅能引入 `quire-engine`。

::: tip 所有指令皆可在乾淨 clone 的環境下執行

下方的*輸出*區塊為來自 `quire-cli` 0.1.0（commit `8d3f401`，`fixtures/sample.docx`）的真實擷取內容，而非書面描述，且 CI 會對照二進位檔重新驗證它們（請參閱 [文件快照閘門](#docs-snapshot-gate)）。
:::

## 叫用方式

```bash
cargo run -p quire-cli -- <command> [args] [flags]
```

未帶引數（或少於 command + target）時，使用說明文字會輸出至 stderr，且結束代碼（exit code）為 `2`。

## 一覽所有指令

| 指令 | 用途 | 結束代碼 |
|---|---|---|
| `info` | 頁數／段落數／保留部件數 + 第 0 頁預覽 | `0` 成功，`1` 讀取／解析錯誤 |
| `page` | 單頁的 display list JSON | `0` 成功，`1` 頁面索引無效／讀取錯誤 |
| `dump` | 所有頁面的 display list JSON | `0` 成功，`1` 讀取／解析錯誤 |
| `render` | 無介面渲染：每頁一個 SVG + `pagebreaks.json` | `0` 成功，`1` I/O 錯誤，`2` 旗標無效 |
| `roundtrip` | 開啟 → 儲存 → 選擇性結構檢查（單一檔案或目錄掃描） | `0` 成功，`1` 偵測到損失／讀取／儲存錯誤，`2` 旗標無效 |

## `quire-cli info <file.docx>`

快速檢視檔案摘要資訊與第 0 頁前幾行。

```bash
cargo run -p quire-cli -- info fixtures/sample.docx
```

```text
檔案: fixtures/sample.docx
頁數: 2
段落數: 14
保留 zip part 數: 3
--- 第 0 頁預覽 ---
  Quire 開源文書處理器樣本
  這是一份用於 CI 的最小 DOCX 樣本。R&D 實體還原測試：amp 必須還原為 & 符號。
  The quick brown fox jumps over the lazy dog. 開源原生文書處理器，目標是不卡
  頓的專業排版。第 1 段。The quick brown fox jumps over the lazy dog. 開源原生
  文書處理器，目標是不卡頓的專業排版。第 1 段。The quick brown fox jumps over
  the lazy dog. 開源原生文書處理器，目標是不卡頓的專業排版。第 1 段。The quick
```

（此範例同時兼作 CJK + 西文混排渲染測試——實體還原（`&amp;` → `&`）在 CI 中即在此 fixture 上進行斷言。）

## `quire-cli page <file.docx> <n>`

印出第 *n* 頁（0 起算）的 `PageDisplayList` JSON——與瀏覽器外殼所使用的契約相同。各項目包含以點為單位的 x/y/size 以及粗體／斜體旗標。

```bash
cargo run -p quire-cli -- page fixtures/sample.docx 0
```

```json
{"page":0,"width_pt":595.0,"height_pt":842.0,"items":[
 {"Text":{"x":72.0,"y":72.0,"size_pt":12.0,"flags":0,"text":"Quire 開源文書處理器樣本"}},
 {"Text":{"x":72.0,"y":88.8,"size_pt":12.0,"flags":0,"text":"這是一份用於 CI 的最小 DOCX 樣本。R&D 實體還原測試：amp 必須還原為 & 符號。"}},
 ...]}
```

超出檔案範圍的頁面索引會印出總頁數並以代碼 `1` 退出。

## `quire-cli dump <file.docx>`

將所有頁面的 display list 作為單一 JSON 文件輸出——為渲染器、golden 快照與 diff 工具的原始材料。

## `quire-cli render <file.docx> --out <dir>`

[render-lab](./render-lab) 所使用的無介面渲染：為每頁寫入 `<stem>-p<page>.svg`，並寫入 `pagebreaks.json`（每頁段落分佈與跨頁接續情形）以供跨引擎比對。

| 旗標 | 意義 |
|---|---|
| `--out <dir>` | 輸出目錄（若不存在則建立）。**必要項。** |

```bash
cargo run -p quire-cli -- render fixtures/sample.docx --out out/render-lab/quire-sample
```

```text
render: fixtures/sample.docx → 2 頁 SVG ＋ out/render-lab/quire-sample/pagebreaks.json（14 段落）
```

未知的旗標或缺少 `--out` 會印出使用說明並以代碼 `2` 退出。

## `quire-cli roundtrip`

無損閘門（針對 `<file|dir>`）：開啟、在不編輯的情況下儲存，並（加上 `--check`）在 ZIP 結構層級比對原始檔案與儲存後檔案。目錄引數會依名稱順序遞迴掃描 `*.docx` 以確保可重現性。深入語意請參閱：[無損保證](./lossless-guarantee)。

| 旗標 | 意義 |
|---|---|
| `--check` | 執行結構比對；若未加上此旗標，指令僅執行 roundtrip（並可選擇性寫入）。 |
| `--out <path>` | 將儲存後的檔案寫入 `<path>`（單一目標使用）。 |
| `--allow part1,part2` | 以逗號分隔的部件名稱，其**內容**允許合法差異（已編輯部件白名單）。未觸碰部件中若出現白名單外的內容變更 = violation 違規。 |
| `--quarantine <quarantine.json>` | 從 JSON 清單 `{"files": {"<relpath or filename>": "<reason>"}}` 跳過並列出檔案。目錄掃描時，若省略該旗標會自動偵測 `<dir>/quarantine.json`。 |

```bash
cargo run -p quire-cli -- roundtrip fixtures/sample.docx --check
```

```text
✓ fixtures/sample.docx（byte-identical，3 parts）
roundtrip --check: 1 檔（另有 0 檔隔離不計紅），byte-identical 1，失敗 0
```

失敗的檔案會印出比對器的 `report()`——`byte_identical=`／`pass=`、白名單變更、缺失／新增部件、封包註解漂移與各條目的 `VIOLATION` 行——且行程以代碼 `1` 退出，使 CI 失敗。全語料庫執行會為每個檔案印出一行 ✓ 並輸出摘要；該摘要是社群應關注的指標數字。

## 結束代碼摘要

| 代碼 | 意義 |
|---|---|
| `0` | 成功（所有檢查檔案皆通過） |
| `1` | I/O 失敗、解析失敗，或偵測到無損違規 |
| `2` | 使用方式錯誤（缺少指令／目標、未知旗標） |

## 文件快照閘門 {#docs-snapshot-gate}

CLI 文件很容易悄悄過時：旗標變更，卻無人記得更新說明文字。因此本文件程式庫將 CLI 介面以**快照**形式釘固（`cli-snapshots/*.txt`，擷取自 `quire-cli` 0.1.0 @ `8d3f401`）：usage 文字、`info`、`page`、`render` 與 `roundtrip --check` 輸出。`npm run check:cli` 會在此程式庫的 CI 中執行，並驗證每個已記錄的子命令、旗標與引用的輸出文字行是否皆出現在快照中——散文中描述了擷取的二進位檔從未印出的旗標，會導致建置失敗。

互補的另一半——重新執行**二進位檔**並與這些快照進行 diff 比對，使得未更新文件的引擎端旗標漂移亮紅燈——規劃在公開發布時作為 `trycmd` 風格的測試加入引擎程式庫（作為後續追蹤項目；排版核心在其 golden 斷行點快照閘門中已有先例）。

## 相關連結

- [render-lab](./render-lab) —— `render` 所提供的內容，以及 LibreOffice 基準線
- [無損保證](./lossless-guarantee) —— `roundtrip` 判定結果模型

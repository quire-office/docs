# 無損保證

「無損」是產品承諾，因此需要有其精確定義。Quire 將其定義為**兩個層次**，而 `roundtrip --check` 會同時回報這兩層——因為最強的保證並非對每個檔案都能達成（甚至未必正確），而對自身達成的層次說謊的工具，比誠實標明層次的工具更糟糕。

## 第 1 層 —— byte-identical

重新儲存的檔案在*位元組字串*層面上完全等於原始檔案：每個 local header、central directory 紀錄、壓縮資料 blob、offset 偏移量、額外欄位（extra field）、註解與填充間隙都在相同位置。這是未經編輯的「開啟→儲存」循環中最理想的結果，也是語料庫目前達成的標準：**399 份中的 399 份**未隔離真實檔案在 roundtrip 中維持 byte-identical（第 400 份因繼承自上游的 CRC 損壞而隔離）。包含 ZIP64 紀錄與未識別的廠商擴充欄位在內。

```bash
# captured output on fixtures/sample.docx:
cargo run -p quire-cli -- roundtrip fixtures/sample.docx --check

✓ fixtures/sample.docx（byte-identical，3 parts）
roundtrip --check: 1 檔（另有 0 檔隔離不計紅），byte-identical 1，失敗 0
```

*（CLI 輸出擷取自 Rust 二進位檔且為中文優先，符合程式庫的語言慣例。上方的 CJK 文字同時作為本文件網站的即時 CJK 渲染範例。）*

## 第 2 層 —— 結構性零損失

當某個部件被編輯時，位元組完全一致理所當然會被打破：重新壓縮 `word/document.xml` 會移動其後的每個項目，因此偏移量會改變，且（取決於 deflate 串流）即使未變更的 blob 也可能落在其他位置。因此比較是在 **ZIP 結構欄位而非全檔雜湊** 上進行。針對每個 entry 條目：

| 比對欄位 | 意義 |
|---|---|
| `name`, `method`, `crc`, sizes, time, attributes | entry 識別資訊與中繼資料 |
| `central_identical` | 整個 central-directory 紀錄 byte-identical（最強：offset 偏移量亦未改變） |
| `data_identical` | 壓縮資料位元組 byte-identical |
| `content_identical` | 解壓縮後的純文字相等（內容層級等價） |
| `local_identical` | local file header byte-identical |
| `gap_identical` | entry 間的位元組（data descriptor、填充 padding）byte-identical |
| `extra_identical` | extra-field 集合（id → bytes）相等 |
| entry comment, archive comment | 註解 payload 維持完整 |

當你*未觸碰*的每個部件都具有相同的壓縮位元組、額外欄位、註解與間隙時，存檔即在第 2 層（**`UntouchedZeroLoss`**）通過——而偏移量、end-of-central-directory 紀錄以及白名單內（已編輯）entry 的重新壓縮則允許不同。未觸碰 entry 中的任何內容層級差異皆為 `Violation`，會使閘門失敗。消失的部件（`missing`）永遠是違規；不請自來的部件（`added`）則是白名單外的變更。

```text
# Verdicts the differ can report (core/ooxml/src/diff.rs):
ByteIdentical        — whole file identical (Layer 1)
UntouchedZeroLoss    — pass threshold: untouched entries zero-loss (Layer 2)
Violation(...)       — untouched entry differs → red, non-zero exit
```

## `roundtrip --check`：閘門

```bash
cargo run -p quire-cli -- roundtrip <file|dir> [--out <path>] [--check]
                                       [--allow part1,part2]
                                       [--quarantine <quarantine.json>]
```

- 開啟每個 `.docx`（單一檔案，或遞迴掃描目錄——語料庫掃描），在不編輯的情況下重新儲存，並在 ZIP 結構層級比對原始檔案與儲存後檔案。
- `--allow` 宣告其內容*允許*合法變更的部件（已編輯部件白名單；引擎在處理過程中會自動標記已編輯部件）。
- `--quarantine` 指定排除於計分之外的檔案 JSON 清單，格式為 `{"files": {"<relpath or filename>": "<reason>"}}`——用於上游已損壞的輸入（見下文），每項皆附帶書面原因，使排除項目具備可稽核性而非暗中忽略。掃描目錄時，若省略該旗標會自動偵測 `<dir>/quarantine.json`。
- **非零 exit code 代表在 Quire 觸及的內容中偵測到資料損失。** CI 在三種作業系統上執行此檢查；這是必須保持綠燈的 ★ 閘門。

摘要行分開回報這兩個層級，因此即使閘門維持綠燈，從第 1 層退化至第 2 層的情形依然清晰可見：

```text
roundtrip --check: 399 檔（另有 1 檔隔離不計紅），byte-identical 399，失敗 0
```

## 隔離不是姑息

目前的隔離清單恰好包含一份檔案——來自 LibreOffice fuzz 測試樣本，其 `word/theme/theme1.xml` 的 CRC 在上游程式庫中就已經損壞。該檔案連同原因記錄於 `corpus/quarantine.json` 中。規則是：隔離檔案會被跳過，在摘要中分開計數（`另有 N 檔隔離`），且必須附帶說明*為何是上游的責任以及如何修復*的原因。無故沉默會導致建置紅燈。

## 為什麼此準則延伸至程式庫本身

`.gitattributes` 將文字檔釘固為 LF，`.docx` 檔案釘固為 binary。若無此設定，Windows 執行器上的 `core.autocrlf=true` 會破壞位元組層級的 roundtrip 斷言，並使 `cargo fmt --check` 產生偽陽性失敗——無損承諾終止於位元組邊界，因此即使是 git「熱心」的換行正規化也必須加以防堵。

## 相關連結

- diff 比對器介接之處：[架構](./architecture)
- 完整旗標與擷取輸出：[CLI 參考手冊](./cli-reference#quire-cli-roundtrip)
- 為什麼使用 400 份檔案而非單元測試：[FAQ](./faq#why-a-400-file-corpus-instead-of-unit-tests)

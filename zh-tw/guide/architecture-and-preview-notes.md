# 架構與預覽說明

*原始碼程式庫已公開：以下所有內容皆可閱讀**且可執行**。本頁中的每條指令皆可在乾淨 clone 的環境下直接複製貼上執行。*

## 今天你能評估什麼

理解 Quire 不需要建置任何東西。承載本專案各項宣稱的三份文件如下：

1. [架構](./architecture) —— 有哪些 crate，以及 CI 在它們之間強制的兩條規則。
2. [無損保證](./lossless-guarantee) —— `roundtrip --check` 的精確語意：byte-identical 與結構性零損失（structural zero-loss）的差異，以及 400 份檔案語料庫閘門所證明的內容。
3. [CLI 參考手冊](./cli-reference) —— 每個子命令與旗標，附帶來自 `quire-cli` 0.1.0（commit `8d3f401`）的**實際擷取輸出**，讓你在執行工具前就能掌握具體語意。

## 閱讀本文件中的數字

| 宣稱 | 資料來源 | 如何重新驗證 |
|---|---|---|
| 399/399 份未隔離語料檔案維持 byte-identical | `quire-cli roundtrip corpus --check`，在 commit `8d3f401` 本地執行；亦為 CI 在 ubuntu/Windows 上的 ★ roundtrip 閘門（macOS 工作因配額暫停） | `cargo run -p quire-cli -- roundtrip corpus --check` |
| 400 份檔案語料庫、功能覆蓋率、授權白名單 | `corpus/manifest.json` + `scripts/verify_corpus.py` 閘門 | `python3 scripts/verify_corpus.py` |
| p95 < 8 ms 打字延遲（500 頁） | CI 輸入延遲閘門 + `core/layout/examples/p6_bench.rs` | `cargo run --release -p quire-layout --example p6_bench` |
| wasm 首包 payload：符號掃描確認無 CRDT | `scripts/check-wasm-size.mjs` CI 閘門 | `cd shells/web && npm run build:wasm && npm run size` |

## 從原始碼建置

該程式庫為標準 Cargo workspace——不需配置外部服務，亦無 API 金鑰：

```bash
git clone https://github.com/quire-office/quire.git && cd quire
cargo test --workspace                                  # engine tests, incl. a real docx fixture
cargo run -p quire-cli -- info fixtures/sample.docx     # pages / paragraphs / preserved parts
cargo run -p quire-cli -- roundtrip corpus --check      # the lossless gate, in your terminal
```

瀏覽器 demo（需 `wasm-pack` + Node）：

```bash
cd shells/web && npm install && npm run demo            # streaming wasm load + Canvas2D demo
```

想在不建置任何東西的情況下體驗？線上託管的 playground 完全在你的瀏覽器中執行相同的 wasm 引擎：<https://quireoffice.dev/playground/>。

完整的旗標說明請參閱 [CLI 參考手冊](./cli-reference)，LibreOffice 跨引擎 diff 測試框架請參閱 [render-lab](./render-lab)。

## 專案現況一覽 {#project-status-at-a-glance}

| 項目 | 狀態 |
|---|---|
| DOCX 解析（段落／run／粗體斜體／樣式／實體，無損部件保留） | ✅ |
| 無損 roundtrip（手寫 zip、ZIP64、extra/comment）+ `roundtrip --check` | ✅ |
| Knuth-Plass 最佳換行折行 + UAX#14 斷行規則 | ✅ |
| 真實字型度量塑形 + golden 斷行點快照 | ✅ |
| 來自 `sectPr` 的頁面幾何（Letter／橫向／每頁多區段 section） | ✅ |
| 段落快取 + 增量分頁 + 預算制重新排版（budgeted reflow） | ✅ |
| display list 契約 + CLI 渲染 head + Canvas2D 瀏覽器渲染器 + render-lab | ✅ |
| 雙目標 CI（2 種作業系統 × 原生 + wasm32；macOS 暫停）+ wasm 拆分／大小閘門 | ✅ |
| 表格（跨頁切分與重複表頭）、頁首／頁尾、樣式重疊階層（含條件式格式化）、浮動圖片、強制分頁 | ✅ |
| 分欄（`w:cols`）重排流動 | ✅ |
| 修訂標記渲染（依 ECMA §17.13 之 `w:ins`／`w:del` 語意：底線 vs 刪除線） | ✅ |
| 表格底紋（`w:shd`、themeFill/tint）+ 圖片雙色調（duotone）顏色效果 | ✅ |
| Editing API（變更操作 + 無損存檔鏈） | ⏳ 下一個引擎里程碑；請參閱公開路線圖 |
| ODF 家族（`core/odf`：ODT 優先） | ⏳ 規劃中；依據 OASIS 規格映射 |
| CRDT 協同層（loro 介接層） | ⏳ 目前為介接插槽 |
| XLSX 同級 crate | ⏳ 進行中（`core/xlsx`）：以 byte-identical 方式重用 OPC／無損層，已收集 80 份具單檔授權的語料；下一步為工作表模型 |
| PPTX 同級 crate | ⏳ 於 XLSX 之後 |

## 如何提問

請至 [`quire-office/quire`](https://github.com/quire-office/quire/issues) 提交 issue——語料庫讓大多數錯誤回報都具備可重現性：附上發生問題的 `.docx` 與在其上執行 `roundtrip --check` 的輸出即可。

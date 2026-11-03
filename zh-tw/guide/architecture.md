# 架構

![Quire 分層圖](/architecture-layers.svg)

該引擎組織為**一個核心，兩種外殼**。決定*頁面長相*的一切——解析、斷行、分頁、塑形——都位於平台中立的 Rust crate 中。一切平台特有邏輯——位元組如何進入引擎以及像素如何輸出——都位於輕量外殼中。

## 諸 crate 介紹

| Crate | 路徑 | 職責 |
|---|---|---|
| `quire-ooxml` | `core/ooxml` | DOCX：OPC 封包容器（手寫 ZIP + `quick-xml`）、文件模型、**無損部件保留**、`sectPr` 頁面幾何（`pgSz`／`pgMar`／類型）、用於 `roundtrip --check` 的 zip 結構 diff 比對器。 |
| `quire-layout` | `core/layout` | 換行折行（Knuth-Plass + UAX#14 斷行時機點）、利用真實字型度量塑形（`swash`）、分頁、段落級快取、增量／預算制重新排版、游標（caret）幾何。 |
| `quire-render-trait` | `core/render-trait` | display list 契約：`PageDisplayList` / `DrawItem`（文字 run、矩形、線條規則）作為純可序列化資料。核心絕不繪製像素。 |
| `quire-crdt` | `core/crdt` | 協同編輯後端 trait + 記憶體內佔位實作；loro 介接層隨協同編輯里程碑落地。**僅**存在於延遲載入的協同編輯 chunk 中。 |
| `quire-engine` | `core/engine-api` | 唯一入口點：開啟檔案、向外殼暴露頁數、display list、編輯操作、存檔與 roundtrip diff 比對。 |
| `quire-cli` | `shells/native` | 無介面 CLI（`info`／`page`／`dump`／`render`／`roundtrip`）——CI 評估 head 與未來的 GUI 宿主。 |
| `quire-web` | `shells/web` | `wasm-bindgen` 介接層，零商業邏輯；JS 端將 display list JSON 渲染至 Canvas2D。 |
| `quire-web-collab` | `shells/web-collab` | 第二個延遲載入的 wasm chunk，承載 CRDT 程式碼——在首包 payload 中實體不存在。 |

## 兩條鐵律

### 1. 分層由機器強制檢查

`core/` 絕不引入 shells；shells 僅能引入 `quire-engine`——絕不引入其底下的 crate。在每次 CI 任務中（ubuntu 與 Windows——macOS 目前因配額暫停）執行的 `scripts/check-layering.sh` 透過 `cargo tree` 斷言此點：

- 任何 `core` crate 皆不得依賴 `quire-web` / `quire-cli`（即使因下述 CRDT 拆分規則而產生的傳遞依賴亦不允許）；
- `quire-cli` 與 `quire-web` 不得直接引入 `quire-ooxml`、`quire-layout`、`quire-render-trait` 或 `quire-crdt`——`quire-engine` 是唯一入口；
- **拆包規則：** 主要 `quire-web` wasm 即使透過傳遞依賴亦不得觸及 `quire-crdt`（CRDT 絕不出現在首包 payload 中），而 `quire-web-collab` *必須* 依賴它（防止出現 chunk 存在但功能被靜默切斷的「假拆分」）。

帶來的回報：外殼未來可以從程式庫中拆分出去（安裝程式、部署的應用程式、獨立社群），不需解開任何耦合，因為它們從未糾纏在一起。

### 2. 雙目標是立論前提

`core/` 中的每個 crate 都必須能在 `wasm32-unknown-unknown` 下編譯——CI 在 ubuntu 與 Windows 上執行該閘門（macOS 因配額暫停；重新啟用時會增加一個 arm64 宿主*以及*一個額外的 amd64 clippy 單元）。這就是依賴項清單刻意保持精簡的原因：`swash` 建置時停用預設功能（系統字型搜尋會導致原生與瀏覽器分頁結果不一致），而 `unicode-linebreak` 是一個從 `LineBreak.txt` 產生的 `no_std` 表格產生器，零系統依賴。`core/ooxml` 中的 ZIP 讀寫器正是為此自行開發——位元組層級的無損需要我們完全掌控的程式碼。

## 從 DOCX 位元組到像素

```
docx bytes ──▶ quire-ooxml ──▶ paragraphs/runs + styles + sectPr
                                   │
                                   ▼
                             quire-layout
                   shaping → Knuth-Plass lines → pagination
                                   │
                                   ▼
                        PageDisplayList (JSON)
                     ┌─────────────┴─────────────┐
                     ▼                           ▼
             shells/native (SVG today,       shells/web
             wgpu/vello candidate)           (Canvas2D → WebGPU later)
```

兩個渲染器皆使用*相同*的 display list。一個頁面由幾何資訊與以點（pt）為單位的文字項目（`Text`、`Rect`、`Rule`）組成——由外殼決定像素如何產生，這使得無介面 CI 渲染與瀏覽器實況檢視在斷行點上能夠完全一致。

## 增量編輯

編輯不得重新排版整個世界：

- **段落級快取**——編輯段落 *k* 僅從該處向後失效，而非從第一頁重新排版。
- **預算制重新排版**——`set_sync_budget(n)` 將同步重新分頁限制在 *n* 頁以內；剩餘部分在 `reflow_step()` 中繼續（在 web 外殼由 `requestIdleCallback` 驅動），直到 `is_settled()`。
- **等價性閘門**——增量結果必須等於完整重建；CI 輸入延遲閘門斷言在 500 頁檔案上打字延遲 p95 < 8 ms。

## Wasm 打包封裝

瀏覽器外殼以串流方式載入主要 wasm（`instantiateStreaming`，下載與編譯並行重疊），並僅在啟用協同編輯時動態匯入（dynamic-import）collab chunk。`scripts/check-wasm-size.mjs` 是 CI 閘門：它記錄 raw/gzip 大小、強制執行首包預算，並掃描**匯出符號**，因此只要 CRDT 符號出現在主 bundle 中，無論打包如何重新調整都會導致建置失敗。

## 相關連結

- 為什麼存在此準則：[無損保證](./lossless-guarantee)
- 如何操作該引擎：[CLI 參考手冊](./cli-reference)
- 為什麼目前還沒有終端使用者應用程式：[FAQ](./faq#why-not-just-ship-an-app)

# Playground

Playground 是同一引擎的 wasm 建置版本，完全在你的瀏覽器中執行：<https://quireoffice.dev/playground/>。將 `.docx` 拖放到頁面上，檔案絕不會離開你的電腦——解壓縮、OOXML 解析、排版與繪製全都在分頁內進行。

## 它是什麼

| 面向 | 現況 |
|---|---|
| 引擎 | `shells/web` —— 相同的 Rust 核心編譯為 `wasm32-unknown-unknown`，搭配輕量 `wasm-bindgen` 膠水層。JavaScript 中零商業邏輯。 |
| 渲染 | 引擎發布其 display list JSON 契約；頁面中的 Canvas2D 渲染器負責繪製。與 CLI SVG head 使用完全相同的契約。 |
| 模式 | **唯讀預覽。** 分頁、表格、圖片、底紋 —— 有。編輯 —— 尚未支援；editing API 是下一個引擎里程碑。 |
| 隱私 | 檔案在頁面內處理；絕不上傳任何內容。 |
| 首包 payload | playground 載入的 wasm 中實體不存在 CRDT／協同編輯程式碼 —— CI 透過掃描符號強制執行拆分（請參閱 [架構](./architecture)）。 |

## 引擎二進位檔如何交付給你

本網站程式庫在 git 中**不**收錄 wasm 二進位檔。建置流程從引擎的 GitHub release 資產中擷取，並以 SHA-256 釘固：

1. 網站程式庫中的清單（manifest）記錄 release 版本與每個產出物（`quire_web_bg.wasm`、`quire_web.js`）的預期 `sha256`。
2. 網站建置從標記的 release（`https://github.com/quire-office/quire/releases/download/v<version>/…`）擷取這些確切檔案並驗證各個 SHA-256；若不相符則建置失敗，因此對外服務的二進位檔絕不可能在未經稽核的情況下暗中偏離 release。
3. CI 在每次版本 tag 時自動發布這些 release 產出物。

這意味著「在瀏覽器中執行的內容」始終是開源引擎特定且經過雜湊校驗錨定的版本——你可以將其與原始碼進行比對。

## 從原始碼嘗試同一引擎

```bash
git clone https://github.com/quire-office/quire.git && cd quire/shells/web
npm install && npm run demo        # streaming wasm load + Canvas2D demo
```

或者針對本地建置的引擎執行整個站點堆疊（包含 playground 頁面）——請參閱程式庫中的 `shells/web/README.md`。

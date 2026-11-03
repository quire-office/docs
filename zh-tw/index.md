---
home: true
layout: home

hero:
  name: Quire
  text: Rust 打造的無損 Office 文書引擎
  tagline: 目前支援 DOCX。Quire 未修改的部件皆逐位元組寫回——399/399 份未隔離的語料檔案在 CI 中維持 byte-identical roundtrip。
  image:
    src: /mark-color.png
    alt: Quire mark
  actions:
    - theme: brand
      text: 開啟 Playground
      link: https://quireoffice.dev/playground/
    - theme: alt
      text: 架構與預覽說明
      link: /zh-tw/guide/architecture-and-preview-notes
    - theme: alt
      text: CLI 參考手冊
      link: /zh-tw/guide/cli-reference
    - theme: alt
      text: GitHub
      link: https://github.com/quire-office

features:
  - icon:
      src: /icons/loop.svg
      alt: Loop arrows
      width: 48
      height: 48
    title: 架構層面的無損設計
    details: 自行開發的 ZIP 讀寫器逐位元組複製未修改的部件——包含 ZIP64、額外欄位、註解與填充間隙。在每次 CI 執行中，roundtrip --check 都在 400 份真實語料檔案上驗證此點。
  - icon:
      src: /icons/shells.svg
      alt: Core with two shells
      width: 48
      height: 48
    title: 一個核心，兩種外殼
    details: 單一 Rust 核心編譯為原生平台與 wasm32-unknown-unknown；桌面端 CLI head 與瀏覽器外殼為輕量平台介接層。分層規則在 CI 中強制機器檢查，不仰賴人為慣例。
  - icon:
      src: /icons/metrics.svg
      alt: Baseline and measurement rule
      width: 48
      height: 48
    title: 真實排版引擎
    details: Knuth-Plass 最佳換行折行、UAX#14 斷行規則、真實字型度量塑形與增量預算制分頁——單一 display list 同時提供原生與瀏覽器渲染器使用。
---

## 狀態快照

Quire 目前處於正式發布前階段（pre-release）。從程式庫現況來看，目前可用的功能如下：

| 領域 | 現況 |
|---|---|
| 格式支援 | 目前支援 DOCX。XLSX 正由同一 OPC 封包容器與 roundtrip 層上的同級 crate（`core/xlsx`）推進中——已收錄語料庫與 roundtrip 閘門；其後規劃支援 PPTX，並同步規劃 ODF 家族（ODT 優先）。 |
| 無損 roundtrip | 涵蓋 400 份檔案語料庫的 `roundtrip --check` 閘門（1 份檔案因上游 CRC 損壞而隔離）；每次 CI 執行均回報 byte-identical 計數。 |
| 排版佈局 | Knuth-Plass 換行折行 + UAX#14、`sectPr` 頁面幾何、多欄 `w:cols`、增量分頁，在 500 頁閘門下達到 p95 < 8 ms 的打字延遲。 |
| 渲染 | display list JSON 規格契約 + CLI SVG head + Canvas2D 瀏覽器渲染器。已支援表格（跨頁切分與重複表頭）、頁首／頁尾、樣式重疊階層（含條件式格式化）、浮動圖片、表格底紋、圖片雙色調（duotone）與分欄佈局；剩餘缺口依語料庫失敗分群排序。 |
| 立即試用 | 瀏覽器 playground 完全在分頁內渲染 `.docx` 檔案（wasm，唯讀預覽）：<https://quireoffice.dev/playground/> |
| 協同編輯 | CRDT 介接插槽（`core/crdt`），自首包 wasm payload 拆出；loro 介接層將隨協同編輯里程碑落地。 |

::: tip 程式庫已公開

自行 clone 並親自執行閘門——本文件中的每條指令皆可直接複製貼上執行：<https://github.com/quire-office/quire>。
:::

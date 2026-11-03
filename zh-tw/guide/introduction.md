# 介紹

Quire 是以 Rust 撰寫的開源無損 Office 文書引擎家族（lossless Office document engines）。它能解析、排版與儲存真實世界的 Office 檔案，絕不暗中損毀任何未明確編輯的內容。目前已提供的是 **DOCX**；XLSX、ODF 家族（ODT 優先，排在 PPTX 之前）與 PPTX 後續將作為同核心上的同級格式 crate 加入（請參閱 [FAQ — 格式路線圖](./faq#what-is-the-format-roadmap)）。

本專案由兩項特性所定義：

1. **架構層面的無損設計。** Quire 未修改的檔案部件皆以*逐位元組*（byte-for-byte）寫回——包含 ZIP64 紀錄、未知額外欄位、封包註解與填充間隙。這不是盡力而為的宣稱：`roundtrip --check` 閘門在每次 CI 執行時重放整個 400 份真實語料檔案，目前標準為 399/399 份 byte-identical 結果（1 份檔案因上游損壞而隔離）。請參閱 [無損保證](./lossless-guarantee)。
2. **一個核心，兩種外殼。** 排版引擎為單一 Rust 核心，編譯至原生平台與 `wasm32-unknown-unknown` 兩個目標——桌面端 CLI head 與瀏覽器外殼為輕量平台介接層。分層邊界在 CI 中由機器強制檢查，不仰賴人為慣例。請參閱 [架構](./architecture)。

## 「無損」帶來的價值

大多數開源 DOCX 寫入器在 roundtrip 時都會經過自己的物件模型：所有內容都被重新序列化，因此函式庫未建模的任何內容都會被靜默丟棄或重寫。這對檢視器來說尚可接受；但若要作為能放心託付法律公文的編輯器，這是不合格的。Quire 的準則恰恰相反——檔案中未被觸及的 99% 內容以不透明位元組（opaque bytes）通過引擎，僅有你編輯的部件會被重新編碼。[CLI 參考手冊](./cli-reference#quire-cli-roundtrip) 說明了如何在一行指令內於你自己的檔案上驗證此點。

## 程式碼存放位置

| 程式庫 | 內容 |
|---|---|
| `quire-office/quire` | 引擎核心：`core/` crates、`shells/` 介接層、CI 閘門、語料庫、腳本、品牌資產。 |
| 本站（`quire-office/docs`） | 這些文件頁面。 |

::: tip 程式庫已公開

此處各頁面描述的是該程式庫目前的真實狀態；每一項宣稱皆可追溯至 [`quire-office/quire`](https://github.com/quire-office/quire) 中的檔案或指令，且每條指令皆可直接在乾淨 clone 的環境下複製貼上執行。
:::

## 下一步導覽

- 想看渲染效果，不需安裝 → [Playground](./playground)
- 初次到訪，不需 checkout 程式庫 → [架構與預覽說明](./architecture-and-preview-notes)
- 想了解排版引擎的輪廓 → [架構](./architecture)
- 想了解存檔安全機制 → [無損保證](./lossless-guarantee)
- 想動手執行 → [CLI 參考手冊](./cli-reference) 與 [render-lab](./render-lab)
- 想知道為什麼不直接推出應用程式 → [FAQ](./faq)

## 授權條款

原始碼採用 Apache License 2.0（程式庫中的 `LICENSE-APACHE`）。例外情況：`core/layout/assets/` 下的 Noto Sans TC 子集字型仍遵循 SIL Open Font License 1.1，而 `corpus/` 下的測試語料庫在 `corpus/manifest.json` 中追蹤各檔案授權。品牌資產（標誌、橫幅）採用 CC BY 4.0——使用規範位於程式庫的 `brand/README.md`。

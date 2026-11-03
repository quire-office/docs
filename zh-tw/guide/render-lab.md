# render-lab

`scripts/render_lab.py` 是**跨引擎渲染比對器**：它透過逐頁將 Quire 的分頁結果與 LibreOffice 進行 diff 比對，衡量 Quire 的分頁與業界基準線收斂的程度。它是一套度量框架而非閘門——報告追蹤收斂速度，目前（尚未）使建置失敗。

## 針對單一檔案的處理流程

```
docx ──▶ LibreOffice headless ──▶ PDF ──▶ PyMuPDF ──▶ per-page text + geometry (baseline)
  └───▶ quire-cli render ──▶ per-page SVG + pagebreaks.json (ours)
                     │
                     ▼
        per-page compare: page count, first/last line text, line count,
        page size vs sectPr  ──▶  markdown diff report
```

- LibreOffice 轉換崩潰或逾時會記錄為 `lo_fail` 並跳過——單一惡意檔案絕不能中斷度量流程。
- 頁面大小會逐頁與 Quire 從檔案本身 `sectPr` 讀取的幾何資訊進行比對（而非寫死的 A4 假設）。
- 每頁相似度為針對前 8 行文字計算的 `SequenceMatcher` 比率（0 = 不相關，1 = 完全相同）；報告會標記**第一個發散頁面**（分數 < 0.6），這即是下一步排版工作應該聚焦之處。

## 執行方式

```bash
# needs LibreOffice and `python3 -m pip install --user pymupdf`
python3 scripts/render_lab.py --n 10          # first 10 files of the corpus manifest
python3 scripts/render_lab.py a.docx b.docx   # or explicit files
```

| 引數 | 預設值 | 意義 |
|---|---|---|
| `files`（位置引數） | 語料庫清單，前 `--n` 份檔案 | 明確指定的 `.docx` 目標。 |
| `--corpus <dir>` | `<repo>/corpus` | 語料庫根目錄（用於查詢清單）。 |
| `--n <k>` | `10` | 取用多少份清單檔案。 |
| `--out <dir>` | `<repo>/out/render-lab` | 單檔產出物的存放位置（SVG、`pagebreaks.json`）。 |
| `--report <path>` | `<out>/report.md` | 報告輸出路徑。 |

自動偵測 `soffice`：Linux 上的 `soffice`／`libreoffice`，或在 WSL 下執行時偵測 Windows 的 `soffice.exe`。

## 解讀報告

markdown 報告為單一表格：檔案、LibreOffice 頁數 vs 我方頁數、頁數是否相符、前 6 頁的逐頁相似度、首次發散位置，以及備註（例如相較於 `sectPr` 的逐頁大小不符）。關注重點如下：

- **頁數收斂度** —— 我們換頁的位置是否與 LibreOffice 一致？
- **發散位置** —— 第一頁即發散的檔案屬於系統性幾何問題；第 12 頁才發散則是分頁規則問題。
- 目前發散背後的已知缺口：分欄（`w:cols`）、修訂標記與複雜繪圖圖形族（請參閱 [專案現況](./architecture-and-preview-notes#project-status-at-a-glance)）。表格與頁首／頁尾目前雖可渲染，但在大量使用表格的檔案中通常是排版發散的主要來源。

## 相關指令

`render-lab` 建立在 [`quire-cli render`](./cli-reference#quire-cli-render-file-docx-out-dir)（我方部分）與語料庫閘門 [`verify_corpus.py`](./faq#why-a-400-file-corpus-instead-of-unit-tests)（挑選度量對象）之上。

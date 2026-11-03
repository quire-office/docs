#!/usr/bin/env node
// 文件站繁中本地化閘門：英文改版、繁中沒跟上新鮮度時，這裡就紅燈。
//
// 三件事是硬要求（違反即不部署）：
//   1) 站內每一頁英文檔都要有同名繁中檔（缺頁＝語言選單會把人導到 404）
//   2) ``` 圍欄內容逐字相同（指令、CLI 輸出、路徑、JSON 不譯；譯了就是錯的）
//   3) 繁中正文不含簡體字形（opencc 逐字元比對，白名單見下）
// 另加兩項品質檢查：中文段內軟換行（會跑版成詞中間半形空格）與禁 emoji
// （使用者明確偏好；唯一例外是原文本身就在用的表格狀態符號，故只掃「新增的」
// emoji——若英文原文同段也用同一符號則放行）。
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { Converter } from 'opencc-js';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const LOCALE = 'zh-tw';
const problems = [];
const toTraditional = Converter({ from: 'cn', to: 'tw' });
// 里：里程碑／公里（標準繁體）；群：標準繁體字形（opencc 想轉異體 羣）。
const WHITE = new Set('稽核台了干吃于才回藉游岩晒峰里群'.split(''));

function* walk(dir, stop = []) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '.git' || e === '.vitepress' || e === 'out' || e === '.worktrees') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (stop.includes(e)) continue;
      yield* walk(p, stop);
    } else yield p;
  }
}

/** 拆出 ``` 圍欄區塊與圍欄外正文。 */
function splitFences(txt) {
  const blocks = [];
  const body = [];
  let cur = null;
  for (const line of txt.split('\n')) {
    if (line.trimStart().startsWith('```')) {
      if (cur === null) cur = [];
      else {
        blocks.push(cur.join('\n'));
        cur = null;
      }
      continue;
    }
    if (cur === null) body.push(line);
    else cur.push(line);
  }
  if (cur !== null) problems.push('未閉合的 ``` 圍欄');
  return { blocks, body: body.join('\n') };
}

// 根目錄 README.md 是 repo 說明檔、不是站內頁（config 的 srcExclude 已把它排除在
// build 外），因此不要求它有繁中對應頁。
const sourceMds = [...walk(ROOT)].filter(
  (f) =>
    f.endsWith('.md') &&
    relative(ROOT, f) !== 'README.md' &&
    // 繁中譯頁自身不是「英文來源」，否則會自己跟自己比出缺頁
    !relative(ROOT, f).startsWith(`${LOCALE}/`),
);
const localeRoot = join(ROOT, LOCALE);
const localeMds = existsSync(localeRoot) ? [...walk(localeRoot)] : [];

// ---- 1) 頁面對齊 ----
for (const f of sourceMds) {
  const relPath = relative(ROOT, f);
  if (!localeMds.includes(join(localeRoot, relPath))) {
    problems.push(`繁中缺頁: ${LOCALE}/${relPath}`);
  }
}
for (const f of localeMds) {
  const relPath = relative(localeRoot, f);
  if (!existsSync(join(ROOT, relPath))) {
    problems.push(`${LOCALE}/${relPath} 無對應英文來源（殘留或拼錯）`);
  }
}

// ---- 2)+3) 圍欄逐字 & 簡體 & 軟換行 ----
function simplifiedHits(text) {
  const hits = new Map();
  for (const ch of new Set(text)) {
    if (ch < '\u3400' || ch > '\u9fff' || WHITE.has(ch)) continue;
    const conv = toTraditional(ch);
    if (conv !== ch) hits.set(ch, conv);
  }
  return [...hits].map(([a, b]) => `${a}→${b}`).join(' ');
}

for (const f of sourceMds) {
  const relPath = relative(ROOT, f);
  const zh = join(localeRoot, relPath);
  if (!localeMds.includes(zh)) continue;
  const a = splitFences(readFileSync(f, 'utf8'));
  const b = splitFences(readFileSync(zh, 'utf8'));
  if (a.blocks.length !== b.blocks.length) {
    problems.push(`${LOCALE}/${relPath}: 圍欄數量不同（英文 ${a.blocks.length}／繁中 ${b.blocks.length}）`);
  } else {
    a.blocks.forEach((blk, i) => {
      if (blk !== b.blocks[i]) problems.push(`${LOCALE}/${relPath}: 第 ${i + 1} 個程式碼區塊被改動（必須逐字相同）`);
    });
  }
  const hits = simplifiedHits(b.body);
  if (hits) problems.push(`${LOCALE}/${relPath}: 含簡體字形 ${hits}`);

  // 軟換行：正文相鄰兩行，前段以中文/中文標點收尾、後段以中文起頭
  const lines = b.body.split('\n').map((l) => l.trim());
  for (let i = 0; i + 1 < lines.length; i++) {
    const x = lines[i];
    const y = lines[i + 1];
    if (!x || !y) continue;
    if (/^[#|>*\-{}()\[\]]/.test(x) || /^[#|>*\-{}()\[\]]/.test(y)) continue;
    if (/[，。；：、）】”]$/.test(x) && /^[“「\u3400-\u9fff]/.test(y)) {
      problems.push(`${LOCALE}/${relPath}: 中文段內軟換行（會跑版）…${x.slice(-16)} ▏${y.slice(0, 16)}…`);
    }
  }

  // 新增 emoji：繁中用了英文原文同檔沒有的符號
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/gu;
  const inEn = new Set(readFileSync(f, 'utf8').match(EMOJI) || []);
  const added = [...new Set((b.body.match(EMOJI) || []).filter((e) => !inEn.has(e)))];
  if (added.length) problems.push(`${LOCALE}/${relPath}: 新增原文沒有的符號 ${added.join(' ')}`);

  // 站內連結必須指向繁中頁（外链不動）
  for (const m of b.body.matchAll(/\]\((\/guide\/[^)\s#]*)([#)][^)]*)?\)/g)) {
    problems.push(`${LOCALE}/${relPath}: 站內連結未在地化 ${m[1]}`);
  }
}

if (problems.length) {
  console.error(`✗ i18n 閘門 FAILED（${problems.length} 項）:`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(
  `✓ i18n 閘門 passed — ${sourceMds.length} 頁英文／${localeMds.length} 頁繁中對齊，` +
    '圍欄逐字相同、簡體掃描／軟換行／新增符號／連結在地化零命中',
);

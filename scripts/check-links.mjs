// check-links.mjs — dead-link & missing-asset gate for the docs site.
//
// Scope (PM correction 2026-10-16):
//   * Internal markdown links must resolve against the BUILT site
//     (.vitepress/dist — run `npm run docs:build` first): every page exists and
//     every #anchor matches a real heading id emitted by VitePress itself.
//   * Every referenced asset (site-root paths) must exist under public/.
//   * External links: github.com is EXCLUDED BY DEFAULT because the engine
//     repository is still private (a public link checker would 404 on it until
//     the flip). Re-enable github.com checking at public release by removing
//     it from EXCLUDED_DOMAINS. Other external domains are fetched (HEAD,
//     GET fallback) with retries.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, '.vitepress', 'dist');
const PUBLIC = join(ROOT, 'public');

const EXCLUDED_DOMAINS = [
  // The engine repo is private until public release — remove this line then.
  'github.com',
  // Our own canonical domain: only alive after the Pages deploy — verified by the
  // deploy itself, not by a pre-deploy fetch.
  'docs.quireoffice.dev',
];

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('✗ .vitepress/dist not found — run `npm run docs:build` first (npm run check runs it for you).');
  process.exit(1);
}

function* walk(dir) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '.git') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

const mdFiles = [...walk(ROOT)].filter(
  (f) => f.endsWith('.md') && !f.includes('node_modules') && !f.includes('.vitepress'),
);
const problems = [];
const rel = (p) => p.slice(ROOT.length + 1);

// ---- built-site index: url path -> { html file, heading ids } ----
const sitePages = new Map(); // path (no extension, leading /) -> html path
const pageIds = new Map(); // html path -> Set(ids)
for (const f of walk(DIST)) {
  if (!f.endsWith('.html')) continue;
  const p = ('/' + f.slice(DIST.length + 1).replace(/index\.html$/, '').replace(/\.html$/, '')).replace(/\/+$/, '') || '/';
  sitePages.set(p, f);
  const html = readFileSync(f, 'utf8');
  pageIds.set(
    f,
    new Set([...html.matchAll(/<h[1-6] id="([^"]+)"/g)].map((m) => m[1])),
  );
}

function normalizeLinkPath(href, fromMd) {
  // from a md file, resolve relative links to a site URL path
  const [path, anchor] = href.split('#');
  let urlPath;
  if (path.startsWith('/')) urlPath = path;
  else {
    const mdDir = '/' + dirname(rel(fromMd)).replace(/\\/g, '/'); // e.g. /guide
    urlPath = join(mdDir, path).replace(/\\/g, '/');
  }
  urlPath = urlPath.replace(/\.md$/, '').replace(/\.html$/, '');
  if (!urlPath.startsWith('/')) urlPath = '/' + urlPath;
  if (urlPath.endsWith('/index')) urlPath = urlPath.slice(0, -6) || '/';
  return { urlPath: urlPath.replace(/\/$/, '') || '/', anchor: anchor || null };
}

function mdToSitePath(fromMd) {
  // guide/faq.md -> /guide/faq ; index.md -> /
  const rp = rel(fromMd).replace(/\\/g, '/').replace(/\.md$/, '');
  if (rp === 'index') return '/';
  return '/' + rp.replace(/\/index$/, '');
}

const MD_LINK_RE = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const isExternal = (u) => /^https?:\/\//.test(u);
const external = new Map(); // url -> Set(sources)

function noteExternal(u, src) {
  const host = new URL(u).hostname;
  if (EXCLUDED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) return;
  if (!external.has(u)) external.set(u, new Set());
  external.get(u).add(src);
}

for (const file of mdFiles) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(MD_LINK_RE)) {
    const href = m[2];
    if (href.startsWith('#')) {
      // same-page anchor: check against this page's own built heading ids
      const html = sitePages.get(mdToSitePath(file));
      if (html && !pageIds.get(html).has(href.slice(1))) {
        problems.push(
          `${rel(file)}: same-page anchor ${href} not found (ids: ${[...pageIds.get(html)].join(', ') || 'none'})`,
        );
      }
      continue;
    }
    if (isExternal(href)) {
      noteExternal(href, rel(file));
      continue;
    }
    if (/\.(png|jpe?g|svg|ico|webp|gif|json|pdf|zip)$/i.test(href.split('#')[0])) {
      const p = href.split('#')[0];
      const local = p.startsWith('/')
        ? join(PUBLIC, p)
        : resolve(dirname(file), decodeURIComponent(p));
      if (!existsSync(local)) problems.push(`${rel(file)}: missing asset ${href}`);
      continue;
    }
    const { urlPath, anchor } = normalizeLinkPath(href, file);
    const html = sitePages.get(urlPath.endsWith('/') ? urlPath : urlPath);
    if (!html) {
      // assets above were checked; anything else that isn't a page is dead
      problems.push(`${rel(file)}: dead link ${href} (no built page for ${urlPath})`);
      continue;
    }
    if (anchor && !pageIds.get(html).has(anchor)) {
      problems.push(
        `${rel(file)}: anchor #${anchor} not in ${urlPath} (ids: ${[...pageIds.get(html)].join(', ') || 'none'})`,
      );
    }
  }
  // frontmatter hero/feature images (home layout)
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (fm) {
    for (const m of fm[1].matchAll(/(?:src|image):\s*\/?([^\s'"]+\.(?:png|jpe?g|svg))/g)) {
      if (!existsSync(join(PUBLIC, '/' + m[1]))) problems.push(`${rel(file)}: frontmatter asset missing: /${m[1]}`);
    }
  }
}

// config.mts links (nav/sidebar/social/head)
const cfg = readFileSync(join(ROOT, '.vitepress', 'config.mts'), 'utf8');
for (const m of cfg.matchAll(/link:\s*'(\/[^']+)'/g)) {
  const p = (m[1].replace(/\.md$/, '').replace(/\.html$/, '') || '').replace(/\/$/, '') || '/';
  if (!sitePages.has(p) && !sitePages.has(p + '/')) problems.push(`.vitepress/config.mts: dead sidebar/nav link ${m[1]}`);
}
for (const m of cfg.matchAll(/(?:href|src):\s*'(\/[^']+)'/g)) {
  if (!existsSync(join(PUBLIC, m[1]))) problems.push(`.vitepress/config.mts: missing asset ${m[1]} (not in public/)`);
}
for (const m of cfg.matchAll(/link:\s*'(https?:\/\/[^']+)'/g)) noteExternal(m[1], '.vitepress/config.mts');

// build-time router links: dist pages whose <a href> points at a missing page
// (VitePress itself already fails the build on dead router links; this catches
// raw <a> tags in HTML blocks)
for (const [p, html] of sitePages) {
  const body = readFileSync(html, 'utf8');
  for (const m of body.matchAll(/<a[^>]+href="(\/[^"#]+?)(?:#[^"]*)?"[^>]*>/g)) {
    let u = m[1].replace(/\.html$/, '').replace(/\/$/, '') || '/';
    if (u.startsWith('/assets/') || u.startsWith('/icons/') || /\.(png|svg|ico|jpe?g|json)$/.test(u)) continue;
    if (!sitePages.has(u) && !existsSync(join(PUBLIC, u))) {
      problems.push(`built page ${p}: raw <a> href ${m[1]} has no page/asset`);
    }
  }
}

async function checkExternal(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const r = await fetch(url, {
        method,
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; quire-docs-linkcheck/1.0)' },
      });
      if (r.ok) return null;
      if (method === 'GET') return `HTTP ${r.status}`;
    } catch (e) {
      if (method === 'GET') return String(e.message || e);
    }
  }
  return 'unreachable';
}

const results = await Promise.all([...external.keys()].map(async (u) => [u, await checkExternal(u)]));
for (const [u, err] of results) {
  if (err) problems.push(`${[...external.get(u)].join(',')}: external ${u} → ${err}`);
}

if (problems.length) {
  console.error(`✗ link check FAILED (${problems.length} problem(s)):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(
  `✓ link check passed — ${mdFiles.length} markdown files, ${sitePages.size} built pages, ` +
    `${external.size} external URLs checked (excluded by default: ${EXCLUDED_DOMAINS.join(', ')} — re-enable github.com at public release)`,
);

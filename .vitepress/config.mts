import { defineConfig } from 'vitepress'

// Quire documentation site — VitePress (PM decision 2026-10-16: mdbook rejected,
// weaker CJK search + style unification; local search uses the built-in
// minisearch provider).
//
// Routing: docs.quireoffice.dev (subdomain, CNAME in repo root). The /docs
// subpath option on the main site was abandoned (GitHub Pages cannot mount two
// repos under one domain subpath).
export default defineConfig({
  // i18n：英文走根路徑（零 URL 變動），繁中走 /zh-tw/。
  // VitePress 依頂層 locales 自動帶出語言選單；每語各自 lang / title /
  // description / nav / sidebar / footer，避免雙份 sidebar 各自漂移。
  // 譯頁在 zh-tw/** 下同結構（PM 翻譯收案：英文原版零竄改、程式碼區塊逐字相同）。
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      title: 'Quire Docs',
      description:
        'Lossless Office document engines in Rust — architecture, CLI reference and the lossless guarantee.',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/introduction.html' },
          { text: 'CLI reference', link: '/guide/cli-reference.html' },
          { text: 'FAQ', link: '/guide/faq.html' },
        ],
        sidebar: [
          {
            text: 'Start here',
            items: [
              { text: 'Introduction', link: '/guide/introduction.html' },
              { text: 'Architecture & preview notes', link: '/guide/architecture-and-preview-notes.html' },
            ],
          },
          {
            text: 'Core concepts',
            items: [
              { text: 'Architecture', link: '/guide/architecture.html' },
              { text: 'Lossless guarantee', link: '/guide/lossless-guarantee.html' },
              { text: 'Editing API', link: '/guide/editing.html' },
            ],
          },
          {
            text: 'Working with Quire',
            items: [
              { text: 'Playground', link: '/guide/playground.html' },
              { text: 'CLI reference', link: '/guide/cli-reference.html' },
              { text: 'render-lab', link: '/guide/render-lab.html' },
              { text: 'FAQ', link: '/guide/faq.html' },
            ],
          },
        ],
        footer: {
          message: 'Source code Apache-2.0 · brand assets CC BY 4.0 · fonts OFL 1.1.',
          copyright: 'Quire — lossless Office document engines in Rust.',
        },
      },
    },
    'zh-tw': {
      label: '繁體中文',
      lang: 'zh-Hant-TW',
      title: 'Quire 文件站',
      description:
        '以 Rust 打造的無損 Office 文件引擎——架構、CLI 參考手冊與無損保證。',
      themeConfig: {
        nav: [
          { text: '指南', link: '/zh-tw/guide/introduction.html' },
          { text: 'CLI 參考', link: '/zh-tw/guide/cli-reference.html' },
          { text: 'FAQ', link: '/zh-tw/guide/faq.html' },
        ],
        sidebar: [
          {
            text: '從這裡開始',
            items: [
              { text: '簡介', link: '/zh-tw/guide/introduction.html' },
              { text: '架構與預覽註記', link: '/zh-tw/guide/architecture-and-preview-notes.html' },
            ],
          },
          {
            text: '核心概念',
            items: [
              { text: '架構', link: '/zh-tw/guide/architecture.html' },
              { text: '無損保證', link: '/zh-tw/guide/lossless-guarantee.html' },
              { text: '編輯 API', link: '/zh-tw/guide/editing.html' },
            ],
          },
          {
            text: '使用 Quire',
            items: [
              { text: 'Playground', link: '/zh-tw/guide/playground.html' },
              { text: 'CLI 參考手冊', link: '/zh-tw/guide/cli-reference.html' },
              { text: 'render-lab', link: '/zh-tw/guide/render-lab.html' },
              { text: 'FAQ', link: '/zh-tw/guide/faq.html' },
            ],
          },
        ],
        footer: {
          message: '原始碼採 Apache-2.0 · 品牌資產 CC BY 4.0 · 字型 OFL 1.1。',
          copyright: 'Quire——以 Rust 打造的無損 Office 文件引擎。',
        },
        // Theme UI 字串（上一頁/下一頁、選單、搜尋、404 等）只在繁中 locale 生效；
        // 放頂層會讓英文站的介面 chrome 變成中文。
        lastUpdatedText: '最後更新',
        docFooter: { prev: '上一篇', next: '下一篇' },
        darkModeSwitchLabel: '主題',
        lightModeSwitchTitle: '切換至淺色',
        darkModeSwitchTitle: '切換至深色',
        sidebarMenuLabel: '選單',
        returnToTopLabel: '回到頁首',
        langMenuLabel: '變更語言',
      },
    },
  },
  // 每頁補 canonical ＋ hreflang alternates（含 x-default＝英文）。
  // VitePress 不自動產這些，而 config.head 只能放全站靜態陣列，所以走
  // transformHead（build 期逐頁 hook）。缺了它們，繁中頁在搜尋引擎眼裡是
  // 「另一份重複內容」而不是同一頁的語言變體，繁中頁也拿不到應有索引。
  // URL 必須對齊 cleanUrls:false 的實際服務路徑（結尾 .html、首頁是根路徑），
  // canonical 指向錯 URL 比沒有更糟。
  transformHead(ctx) {
    // VitePress 的 transformHead 給的是 pageData.relativePath（相對 root 的 .md 路徑），
    // 不是 URL；對齊 cleanUrls:false 的實際服務路徑：一般頁 → .html、
    // index.md → 根路徑、zh-tw/index.md → /zh-tw/（目錄頁）。
    const urlPath = (md: string): string => {
      if (md === 'index.md') return ''
      if (md.endsWith('/index.md')) return md.slice(0, -'index.md'.length)
      return md.replace(/\.md$/, '.html')
    }
    const self = urlPath(ctx.pageData.relativePath)
    const isZh = self.startsWith('zh-tw/')
    const base = isZh ? self.slice('zh-tw/'.length) : self
    const at = (p: string) => `https://docs.quireoffice.dev/${p}`
    // canonical 一律指向自己（self-referential）：把繁中頁的 canonical 指到
    // 英文頁會讓繁中頁不被索引。語言變體關係由 hreflang alternates 宣告。
    return [
      ['link', { rel: 'canonical', href: at(self) }],
      ['link', { rel: 'alternate', hreflang: 'x-default', href: at(base) }],
      ['link', { rel: 'alternate', hreflang: 'zh-Hant-TW', href: at(`zh-tw/${base}`) }],
    ]
  },
  lastUpdated: true,
  // 排除清單：README.md 是 repo 說明檔、不是站內頁（納入 build 會被 VitePress
  // 語言選單當成有繁中對應頁的頁面，產出指向不存在的 /zh-tw/README.html 死連結）；
  // .worktrees/** 是本機殘留 worktree 副本，不進版控也不該進站。
  srcExclude: ['README.md', '.worktrees/**'],
  // GitHub Pages (docs.quireoffice.dev deploy target) does not reliably serve
  // extensionless clean URLs, so keep canonical .html URLs (verified against
  // dist before flipping; do not "prettify" without re-verifying the host).
  cleanUrls: false,

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico', sizes: '48x48' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/favicon-180.png' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Quire Docs' }],
    [
      'meta',
      {
        property: 'og:image',
        content: 'https://docs.quireoffice.dev/social-preview.png',
      },
    ],
  ],

  themeConfig: {
    logo: '/mark-color.png',
    search: {
      provider: 'local', // built-in minisearch; no external search service
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/quire-office' },
    ],
    outline: { level: [2, 3] },
  },
})

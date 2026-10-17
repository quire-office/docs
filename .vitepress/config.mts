import { defineConfig } from 'vitepress'

// Quire documentation site — VitePress (PM decision 2026-10-16: mdbook rejected,
// weaker CJK search + style unification; local search uses the built-in
// minisearch provider).
//
// Routing: docs.quireoffice.dev (subdomain, CNAME in repo root). The /docs
// subpath option on the main site was abandoned (GitHub Pages cannot mount two
// repos under one domain subpath).
export default defineConfig({
  lang: 'en-US',
  title: 'Quire Docs',
  description:
    'Lossless Office document engines in Rust — architecture, CLI reference and the lossless guarantee.',
  lastUpdated: true,
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
        ],
      },
      {
        text: 'Working with Quire',
        items: [
          { text: 'CLI reference', link: '/guide/cli-reference.html' },
          { text: 'render-lab', link: '/guide/render-lab.html' },
          { text: 'FAQ', link: '/guide/faq.html' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/quire-office' },
    ],
    footer: {
      message: 'Source code Apache-2.0 · brand assets CC BY 4.0 · fonts OFL 1.1.',
      copyright: 'Quire — lossless Office document engines in Rust.',
    },
    outline: { level: [2, 3] },
  },
})

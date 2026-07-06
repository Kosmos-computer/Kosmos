import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Arco",
  description: "Generative UI library for Kosmos — tokens, components, blocks, and the AI assembly contract.",
  lang: "en-US",
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: [/^https?:\/\/localhost/, /^\.\.\/www\//],
  vite: {
    server: {
      port: 5175,
      strictPort: true,
    },
  },
  themeConfig: {
    logo: { text: "Arco" },
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Reference", link: "/reference/tokens" },
      { text: "Kosmos", link: "http://localhost:5174", target: "_self" },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "What is Arco?", link: "/guide/what-is-arco" },
            { text: "Getting started", link: "/guide/getting-started" },
            { text: "Kosmos vs Arco", link: "/guide/kosmos-vs-arco" },
          ],
        },
        {
          text: "Using Arco",
          items: [
            { text: "Design tokens", link: "/guide/design-tokens" },
            { text: "UI primitives", link: "/guide/ui-primitives" },
            { text: "Layout patterns", link: "/guide/layout-patterns" },
            { text: "Generative blocks", link: "/guide/generative-blocks" },
          ],
        },
      ],
      "/reference/": [
        {
          text: "Reference",
          items: [
            { text: "Token catalog", link: "/reference/tokens" },
            { text: "Component tiers", link: "/reference/component-tiers" },
            { text: "Block registry", link: "/reference/block-registry" },
            { text: "Standards map", link: "/reference/standards-map" },
          ],
        },
      ],
    },
    socialLinks: [],
    footer: {
      message: "Arco — generative UI library for Kosmos",
      copyright: "Arco-Prototype-2",
    },
    search: {
      provider: "local",
    },
  },
});

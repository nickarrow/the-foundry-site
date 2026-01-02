import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import remarkBreaks from 'remark-breaks';

export default defineConfig({
  site: 'https://nickarrow.github.io',
  base: '/the-foundry-site',
  integrations: [mdx()],
  markdown: {
    syntaxHighlight: false, // We handle code blocks ourselves for iron-vault
    remarkPlugins: [remarkBreaks], // Treat single newlines as <br> like Obsidian does
  },
  vite: {
    css: {
      preprocessorOptions: {
        css: {
          charset: false,
        },
      },
    },
  },
});

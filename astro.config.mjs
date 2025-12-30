import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://nickarrow.github.io',
  base: '/the-foundry-site',
  integrations: [mdx()],
  markdown: {
    syntaxHighlight: false, // We handle code blocks ourselves for iron-vault
  },
  vite: {
    css: {
      preprocessorOptions: {
        css: {
          charset: false
        }
      }
    }
  }
});

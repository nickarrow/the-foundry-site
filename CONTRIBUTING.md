# Contributing to The Foundry Site

This guide covers contributing to the site generator itself — the Astro project that transforms Obsidian vault content into a static website.

> **Adding campaign content?** That happens in [The Foundry](https://github.com/nickarrow/the-foundry) repository, not here.

## Development Setup

```bash
# Clone this repo
git clone https://github.com/nickarrow/the-foundry-site.git
cd the-foundry-site

# Install dependencies
npm install

# Clone content for local development
git clone https://github.com/nickarrow/the-foundry.git content

# Build and preview
npm run build
npm run preview
```

## Architecture Overview

### Core Libraries (`src/lib/`)

| File | Purpose |
|------|---------|
| `content.ts` | Loads markdown files, builds navigation tree, resolves file lookups |
| `markdown.ts` | Main processing pipeline — callouts, embeds, wikilinks, remark plugins |
| `iron-vault-inline.ts` | Parses `` `iv-*` `` inline code into HTML spans |
| `iron-vault-blocks.ts` | Parses ` ```iron-vault-mechanics ` blocks into HTML |
| `dataview.ts` | Parses and executes Dataview queries against frontmatter |
| `datasworn-assets.ts` | Looks up asset definitions from Datasworn packages |

### Processing Flow

1. **`content.ts`** loads all `.md` files from `content/`, extracts frontmatter with gray-matter
2. **`markdown.ts`** orchestrates transformation:
   - Pre-processes callouts, image embeds, content embeds, wikilinks
   - Runs unified pipeline with custom remark plugin
   - The remark plugin transforms `iv-*` code and `iron-vault-*` blocks
3. **Page templates** (`src/pages/`) receive processed HTML and render with components

### Styling

- `public/styles/main.css` — Core site styles (layout, typography, colors)
- `public/styles/iron-vault.css` — Iron Vault component styles (mechanics, assets, tracks)
- `styles/` — Reference CSS extracted from Obsidian plugins (not used directly)

## Common Tasks

### Adding a New Inline Mechanic Type

1. Add the parser in `src/lib/iron-vault-inline.ts`:
   ```typescript
   case 'iv-newtype':
     return renderNewType(content, baseUrl, filesByName);
   ```

2. Create the render function:
   ```typescript
   function renderNewType(content: string, baseUrl: string, filesByName?: Map<string, FileInfo>): string {
     const parts = content.split('|');
     // Parse parts and return HTML
     return `<span class="iv-inline-mechanics newtype">...</span>`;
   }
   ```

3. Add CSS in `public/styles/iron-vault.css`

### Adding a New Code Block Type

1. Add handling in `src/lib/markdown.ts` (in the remark plugin):
   ```typescript
   } else if (node.lang === 'iron-vault-newblock') {
     node.type = 'html';
     node.value = parseNewBlock(node.value, options.baseUrl);
   }
   ```

2. Create parser in `src/lib/iron-vault-blocks.ts` or a new file

### Adding a New Callout Type

1. Add the icon SVG in `src/lib/markdown.ts` in the `icons` object:
   ```typescript
   'newtype': '<svg>...</svg>',
   ```

2. Add CSS for the callout color in `public/styles/main.css`:
   ```css
   .callout[data-callout="newtype"] {
     --callout-color: #hexcolor;
   }
   ```

### Modifying the Navigation Tree

The sidebar navigation is built in `src/lib/content.ts` → `buildNavigationTree()`. It:
- Groups files by directory
- Sorts directories first, then alphabetically
- Excludes hidden folders and special files

### Adding Dataview Features

The query engine in `src/lib/dataview.ts` supports:
- `TABLE` / `TABLE WITHOUT ID` / `LIST`
- `FROM #tag`
- `WHERE field = value` / `WHERE field != value`
- `SORT field ASC/DESC`

To add new features (e.g., `GROUP BY`), extend `parseDataviewQuery()` and `executeDataviewQuery()`.

## Code Style

- TypeScript for all processing code
- Astro components for UI
- CSS custom properties for theming
- HTML output should match Iron Vault's Obsidian structure for CSS compatibility

## Testing Changes

```bash
# Full build (includes prebuild scripts)
npm run build

# Preview the built site
npm run preview

# Development server (hot reload, but some features may differ from production)
npm run dev
```

Check these after changes:
- [ ] Wikilinks resolve correctly
- [ ] Iron Vault inline mechanics render with proper styling
- [ ] Code blocks (moves, oracles) display correctly
- [ ] Character pages show stats, meters, assets
- [ ] Progress tracks render with SVG boxes
- [ ] Callouts are styled and collapsible
- [ ] Search works (requires full build)
- [ ] Mobile layout is responsive

## Pull Requests

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with a full build
5. Submit a PR with a clear description

## Known Limitations / TODO

See the TODO section in the codebase for remaining work:

- Character assets rendering (partial)
- Character impacts/legacies display
- Advanced Dataview features (GROUP BY, complex WHERE)
- Excalidraw file support
- Image path resolution improvements

## Questions?

Open an issue or reach out on the [Ironsworn Discord](https://discord.gg/8bRuZwK).

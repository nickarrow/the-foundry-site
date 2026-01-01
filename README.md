# The Foundry Site

A static website that publishes [The Foundry](https://github.com/nickarrow/the-foundry) — a collaborative Obsidian vault for Ironsworn/Starforged tabletop RPG players — as a read-only web experience.

**Live Site:** [nickarrow.github.io/the-foundry-site](https://nickarrow.github.io/the-foundry-site/)

## What This Does

The Foundry vault uses [Iron Vault](https://github.com/iron-vault-plugin/iron-vault), an Obsidian plugin for tracking game mechanics. This site transforms all that Obsidian-specific content into pure static HTML:

- **Wikilinks** (`[[Page Name]]`) → working site links
- **Image embeds** (`![[image.png]]`) → rendered images
- **Content embeds** (`![[Note Name]]`) → inlined content
- **Callouts** (`> [!type]`) → styled callout boxes
- **Iron Vault inline mechanics** (`` `iv-move:...` ``) → dice rolls, oracles, meters
- **Iron Vault code blocks** (` ```iron-vault-mechanics `) → move blocks, oracle groups
- **Progress tracks** → SVG-based track visualization
- **Character sheets** → stats, meters, impacts, assets
- **Dataview queries** → executed at build time, rendered as tables/lists

The result is a "read-only Obsidian" where visitors can browse campaigns, read journals, and view character sheets without needing Obsidian installed.

## Tech Stack

- **[Astro](https://astro.build/)** — Static site generator
- **TypeScript** — Processing libraries
- **[unified](https://unifiedjs.com/)** (remark/rehype) — Markdown AST transformation
- **[Pagefind](https://pagefind.app/)** — Client-side search
- **GitHub Actions** — Automated builds and deployment

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Install dependencies
npm install

# Clone the content repository
git clone https://github.com/nickarrow/the-foundry.git content

# Build the site
npm run build

# Preview locally
npm run preview
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production (runs prebuild + astro build + pagefind) |
| `npm run preview` | Preview production build locally |

The build process:
1. **prebuild**: Generates changelog, copies attachments from content folders
2. **build**: Astro compiles all pages to static HTML
3. **postbuild**: Pagefind indexes the site for search

## Deployment

The site deploys automatically via GitHub Actions:

- **Trigger**: Hourly schedule, manual dispatch, or push to `main`
- **Process**: Clones the-foundry repo → builds site → deploys to GitHub Pages
- **URL**: `https://nickarrow.github.io/the-foundry-site/`

See [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) for details.

## Project Structure

```
├── src/
│   ├── components/        # Astro components (Sidebar, Breadcrumbs, etc.)
│   ├── layouts/           # Page layout template
│   ├── lib/               # Core processing libraries
│   │   ├── content.ts     # File loading, navigation tree
│   │   ├── markdown.ts    # Markdown processing pipeline
│   │   ├── iron-vault-inline.ts   # Inline mechanics parser
│   │   ├── iron-vault-blocks.ts   # Code block mechanics parser
│   │   ├── dataview.ts    # Dataview query engine
│   │   └── datasworn-assets.ts    # Asset card data lookup
│   └── pages/             # Route definitions
├── public/styles/         # Site CSS (main.css, iron-vault.css)
├── styles/                # Reference CSS from Obsidian plugins
├── scripts/               # Build scripts (changelog, attachments)
├── content/               # Cloned vault content (gitignored)
└── dist/                  # Build output (gitignored)
```

## How It Works

### Content Processing Pipeline

```
Markdown file
    ↓
gray-matter (extract frontmatter)
    ↓
Process callouts, image embeds, content embeds
    ↓
Convert wikilinks to standard markdown links
    ↓
remark-parse → remark-gfm → custom remark plugin
    ↓
Transform iv-* inline code → HTML spans
Transform iron-vault-mechanics blocks → HTML
Execute dataview queries → HTML tables/lists
    ↓
remark-rehype → rehype-raw → rehype-stringify
    ↓
HTML string → Astro page template → Static HTML
```

### Iron Vault Syntax Support

**Inline mechanics** (rendered inline with narrative text):
- `iv-move` — Dice rolls with outcome indicators (strong hit/weak hit/miss)
- `iv-oracle` — Oracle rolls with results
- `iv-meter` — Meter changes (momentum, health, etc.)
- `iv-initiative` — Position tracking
- `iv-track-create` / `iv-track-advance` — Progress track links
- `iv-progress` — Progress rolls
- `iv-noroll` — Moves without rolls
- `iv-entity-create` — Entity creation links

**Code blocks**:
- `iron-vault-mechanics` — Move blocks, oracle groups, track status
- `iron-vault-track` — Progress track visualization
- `iron-vault-character-*` — Character sheet components

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

This project is for publishing The Foundry vault content. The vault itself follows the licensing in [The Foundry repository](https://github.com/nickarrow/the-foundry).

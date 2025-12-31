# The Foundry Site - Project Context & Status

## What This Project Is

**The Foundry Site** is a static website that publishes content from [The Foundry](https://github.com/nickarrow/the-foundry) — a collaborative Obsidian vault for Ironsworn/Starforged tabletop RPG players. The vault uses the [Iron Vault](https://github.com/iron-vault-plugin/iron-vault) Obsidian plugin for game mechanics tracking.

The goal is to create a "read-only Obsidian" experience on the web — visitors can browse campaigns, read journal entries, view character sheets, and follow the narrative without needing Obsidian installed.

## The Challenge

The Foundry vault contains:
- Standard Markdown with Obsidian-specific syntax (`[[wikilinks]]`, `![[embeds]]`, callouts)
- **Iron Vault inline mechanics** — special code syntax like `` `iv-move:Strike|Edge|3|1|1|9|6|...` `` that renders dice rolls, oracle results, progress tracks inline with narrative text
- **Iron Vault code blocks** — ` ```iron-vault-mechanics` blocks for moves, oracles, entity creation
- **Iron Vault components** — ` ```iron-vault-track` `, ` ```iron-vault-character-meters` ` etc. that render from YAML frontmatter
- **Dataview queries** — dynamic tables/lists querying frontmatter across files
- Custom CSS for Iron Vault styling (mechanic blocks, asset cards, progress tracks)

None of this renders in a standard static site generator — it all needs custom processing.

## Technical Approach

### Stack
- **Astro** — Static site generator with excellent Markdown support and minimal JS output
- **TypeScript** — For the processing libraries
- **Custom remark plugins** — Transform Iron Vault syntax during Markdown processing
- **GitHub Actions** — Hourly scheduled builds that clone the-foundry repo and deploy to GitHub Pages

### Key Design Decisions

1. **Process at build time, not runtime** — All Iron Vault syntax, Dataview queries, and wikilinks are resolved during the Astro build. The output is pure static HTML/CSS.

2. **Match Obsidian's visual style** — Dark theme, similar layout, Iron Vault mechanics should look like they do in Obsidian (inline rolls with colored outcomes, mechanic blocks with dice icons, etc.)

3. **Datasworn links are display-only** — Iron Vault references moves/oracles via Datasworn paths (e.g., `move:starforged/combat/strike`). In Obsidian these open the sidebar. On the website, we just display the name with no link — the roll results are what matter for the narrative.

4. **Wikilinks resolve to actual pages** — `[[Barille Black]]` becomes a working link to `/the-starforged-nickarrow/characters/barille-black`

5. **Base URL handling** — Site deploys to `/the-foundry-site/` on GitHub Pages, so all links and assets need the base path prefix.

### Content Processing Pipeline

```
Markdown file
    ↓
gray-matter (extract frontmatter)
    ↓
Pre-process: Convert [[wikilinks]] and ![[embeds]] to standard markdown
    ↓
remark-parse (parse markdown AST)
    ↓
Custom remark plugin:
  - Transform `iv-*` inline code to HTML spans with Iron Vault classes
  - Transform ```iron-vault-mechanics blocks to HTML
  - Transform ```dataview blocks by executing queries against all files' frontmatter
    ↓
remark-rehype → rehype-raw → rehype-stringify
    ↓
HTML string (inserted into Astro page template)
```

### Iron Vault Syntax Reference

**Inline mechanics** (rendered inline with text):
- `` `iv-move:Name|Stat|action|statValue|adds|vs1|vs2|moveRef` ``
- `` `iv-oracle:Name|roll|result|oracleRef` ``
- `` `iv-meter:Name|from|to` ``
- `` `iv-initiative:Label|from|to` ``
- `` `iv-track-create:Name|path` ``
- `` `iv-track-advance:Name|path|from|to|rank|steps` ``
- `` `iv-progress:Name|progress|vs1|vs2|path` ``
- `` `iv-noroll:Name|moveRef` ``
- `` `iv-entity-create:Type|Name|path` ``

**Code blocks**:
```
```iron-vault-mechanics
move "[Gather Information](datasworn:...)" {
    roll "Wits" action=1 adds=0 stat=2 vs1=9 vs2=4
}
```
```

```
```iron-vault-mechanics
oracle name="[Oracle Name](datasworn:...)" result="Result" roll=74
```
```

```
```iron-vault-track
```
(renders progress track from file's frontmatter: name, rank, progress)
```

---

## Current State: V1 MVP ✅

The site builds and deploys successfully with core functionality working.

### Completed Features

**Core Infrastructure**
- Astro static site generator with TypeScript
- Dark theme matching Obsidian aesthetic
- Sidebar navigation with collapsible folders (collapsed by default)
- Expand all / Collapse all buttons
- Dark-themed scrollbar
- Breadcrumb navigation
- Mobile-responsive layout
- GitHub Actions workflow for hourly scheduled builds

**Content Processing**
- Markdown rendering with frontmatter parsing
- Wikilink resolution (`[[Page Name]]` → working links)
- Image embed support (`![[image.png]]`)
- Content embed links (`![[Note Name]]`)
- Excludes hidden folders (`.foundry`, `.github`) and `.excalidraw.md` files

**Iron Vault Support**
- Inline mechanics parsing and rendering:
  - `iv-move` — dice rolls with outcome indicators (⬡⬡ strong hit, ⬡⬢ weak hit, ⬢⬢ miss)
  - `iv-oracle` — oracle rolls with results
  - `iv-meter` — meter changes (momentum, health, etc.)
  - `iv-initiative` — position tracking
  - `iv-track-create` / `iv-track-advance` — progress track links
  - `iv-progress` — progress rolls
  - `iv-noroll` — moves without rolls
  - `iv-entity-create` — entity creation links
- Code block mechanics (`iron-vault-mechanics`) — moves, oracles, entities
- Progress track component (`iron-vault-track`) — renders with proper Iron Vault SVG boxes
- Character meters component (stats display)

**Dataview Support**
- Basic query parsing (TABLE, LIST, FROM, WHERE, SORT)
- Query execution against frontmatter at build time
- Results rendered as HTML tables/lists

---

## TODO: Remaining Work

### High Priority

1. **Character Assets Rendering**
   - Parse `assets` array from character frontmatter
   - Render asset cards with abilities, controls, options
   - The `iron-vault-character-assets` code block placeholder exists

2. **Character Impacts/Legacies**
   - `iron-vault-character-impacts` placeholder exists
   - `iron-vault-character-special-tracks` placeholder exists
   - Need to render from frontmatter data

3. **Callout Styling**
   - Obsidian callouts (`> [!type]- Title`) not yet parsed
   - Need remark plugin to convert to styled HTML
   - Reference CSS exists in `styles/snippet-callout-colors.css`

4. **Search (Pagefind)**
   - Search input exists but not functional
   - Integrate Pagefind for client-side search

### Medium Priority

5. **Iron Vault Block Mechanics - Polish**
   - Move blocks render but could match Obsidian style more closely
   - Oracle groups render but styling needs work

6. **Image Path Resolution**
   - Currently assumes `/attachments/` folder
   - Should resolve relative to source file location

7. **Content Embeds**
   - Currently renders as links
   - Could inline the actual content

### Low Priority / Future

8. **Excalidraw Support** — Currently skipped, could render as static images
9. **More Dataview Features** — GROUP BY, complex WHERE, inline dataview
10. **Performance** — Incremental builds, image optimization

---

## File Structure

```
the-foundry-site/
├── .github/workflows/deploy.yml  # Hourly build + deploy
├── content/                      # Cloned from the-foundry (gitignored)
├── public/
│   ├── styles/
│   │   ├── main.css              # Core site styles
│   │   └── iron-vault.css        # Iron Vault mechanics styles
│   └── attachments/              # Copied at build time
├── src/
│   ├── components/
│   │   ├── Sidebar.astro
│   │   ├── Breadcrumbs.astro
│   │   ├── CharacterMeters.astro
│   │   └── ProgressTrack.astro
│   ├── layouts/
│   │   └── Layout.astro
│   ├── lib/
│   │   ├── content.ts            # File loading, navigation tree
│   │   ├── markdown.ts           # Markdown processing pipeline
│   │   ├── iron-vault-inline.ts  # Inline mechanics parser
│   │   ├── iron-vault-blocks.ts  # Code block mechanics parser
│   │   └── dataview.ts           # Dataview query engine
│   └── pages/
│       ├── index.astro           # Homepage
│       ├── [...slug].astro       # Dynamic content pages
│       └── 404.astro
├── styles/                       # Original Obsidian plugin CSS (reference)
│   ├── iron-vault-plugin-styles.css
│   ├── dataview-plugin-styles.css
│   ├── snippet-callout-colors.css
│   └── snippet-clean-embeds.css
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

---

## Development

```bash
# Install dependencies
npm install

# Clone content (done automatically in CI)
git clone https://github.com/nickarrow/the-foundry.git content

# Build
npm run build

# Preview locally
npm run preview
```

## Deployment

GitHub Actions runs hourly via cron, clones the-foundry repo, builds the site, and deploys to GitHub Pages at `https://nickarrow.github.io/the-foundry-site/`.

---

## Reference: Original Obsidian Plugin CSS

The `styles/` folder contains CSS extracted from the Iron Vault and Dataview Obsidian plugins. These serve as reference for how elements should be styled. The actual site styles are in `public/styles/` and are simplified/adapted versions.

Key classes from Iron Vault CSS:
- `.iron-vault-mechanics` — wrapper for mechanic blocks
- `.iv-inline` — inline mechanic spans
- `.strong-hit`, `.weak-hit`, `.miss` — outcome coloring
- `.iron-vault-asset-card` — asset card styling
- `.iron-vault-track` — progress track container with SVG box backgrounds

---

## Implementation Notes

### Progress Track Rendering (iron-vault-track)

The `iron-vault-track` code blocks render progress tracks using the file's frontmatter data (name, rank, progress). The implementation:

1. **Markdown Processing** (`src/lib/markdown.ts`): The remark plugin converts `iron-vault-track` code blocks to a placeholder div.

2. **Page Template** (`src/pages/[...slug].astro`): For files with `iron-vault-kind: progress` frontmatter, the page generates the track HTML and replaces the placeholder. The HTML structure matches Iron Vault's expected format:
   ```html
   <div class="iron-vault-track" data-rank="extreme" data-complete="false">
     <span class="track-type">VOW</span>
     <span class="track-rank">EXTREME</span>
     <div class="track-name">Track Name</div>
     <div class="track-widget">
       <ol>
         <li data-value="2">2</li>  <!-- 2 ticks -->
         <li data-value="0">0</li>  <!-- empty -->
         ...
       </ol>
     </div>
     <div class="track-progress">0/10 (2 ticks)</div>
   </div>
   ```

3. **CSS Styling** (`public/styles/iron-vault.css`): The supplementary styles at the end of the file provide:
   - Flexbox layout for the track container
   - Proper positioning of type/rank header, name, and progress info
   - SVG background images for each `data-value` (0-4) showing empty boxes, 1-4 tick marks
   
   The SVG backgrounds are the same ones used by the Iron Vault Obsidian plugin, ensuring visual consistency.

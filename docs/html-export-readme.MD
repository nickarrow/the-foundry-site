# The Foundry Site

GitHub Pages deployment of an Obsidian vault using the [obsidian-webpage-export](https://github.com/KosmosisDire/obsidian-webpage-export) plugin.

## Custom Files Overview

The exported site requires custom CSS and JavaScript to render Iron Vault plugin components properly. These files live in `docs/site-lib/` and persist across exports.

### File Structure

```
docs/site-lib/
├── html/
│   └── custom-head-content-content.html  # Loads custom CSS/JS
├── scripts/
│   └── iron-vault-links.js               # Fixes entity/track links
└── styles/
    ├── custom-fixes.css                  # Layout fixes + mechanic block styling
    └── iron-vault-styles.css             # Iron Vault component styling
```

---

## Custom Files Detail

### `custom-head-content-content.html`

**Location:** `docs/site-lib/html/custom-head-content-content.html`

**Purpose:** Entry point that loads all custom CSS and JavaScript files.

**Contents:**
```html
<link rel="stylesheet" href="site-lib/styles/iron-vault-styles.css">
<link rel="stylesheet" href="site-lib/styles/custom-fixes.css">
<script defer src="site-lib/scripts/iron-vault-links.js"></script>
```

**Note:** Load order matters! `custom-fixes.css` must load AFTER `iron-vault-styles.css` to override certain styles.

---

### `iron-vault-styles.css`

**Location:** `docs/site-lib/styles/iron-vault-styles.css`

**Purpose:** Provides styling for Iron Vault plugin components.

**What it styles:**
- Character sheets (meters, stats, impacts, legacies)
- Asset cards
- Progress tracks
- Clocks
- Inline mechanics (moves, oracles, rolls)
- Mechanic blocks

**Source:** Extracted from the Iron Vault Obsidian plugin's CSS.

**Note:** This file uses CSS nesting syntax (`& selector`) which browsers don't fully support. The nested rules for mechanic blocks are overridden by flattened versions in `custom-fixes.css`.

---

### `custom-fixes.css`

**Location:** `docs/site-lib/styles/custom-fixes.css`

**Purpose:** Fixes layout issues and provides browser-compatible styling for mechanic blocks.

**What it fixes:**

1. **Page Layout**
   - Hides duplicate page title at top of each page
   - Hides duplicate horizontal line/data-bar
   - Hides duplicate first entry in Table of Contents
   - Left-aligns content (was incorrectly centered)
   - Fixes text wrapping issues

2. **Code Blocks**
   - Left-aligns code blocks

3. **Sidebar**
   - Fixes left sidebar toggle visibility on mobile

4. **Iron Vault Datasworn Links**
   - Disables non-functional datasworn links (they only work inside Obsidian)
   - Disables move/oracle name links that point to plugin sidebar

5. **Iron Vault Mechanic Blocks** (the dark boxes with oracle rolls, moves, tracks)
   - Provides flattened CSS for `.iron-vault-mechanics` elements
   - Overrides `other-plugins.css` styles that break inline display
   - Ensures `dl`/`dd` elements display inline with proper separators
   - Adds icons and formatting for: oracles, rolls, tracks, meters, clocks, XP, burns, impacts, initiative, assets

---

### `iron-vault-links.js`

**Location:** `docs/site-lib/scripts/iron-vault-links.js`

**Purpose:** Converts Iron Vault entity and track path spans into working links.

**What it does:**
- Finds `<span data-track-path="...">` elements and converts them to `<a>` links
- Finds `<span data-entity-path="...">` elements and converts them to `<a>` links
- Converts Obsidian-style paths to HTML paths (lowercase, spaces to dashes, .md to .html)
- Uses `search-index.json` to resolve entity filenames to full paths

**Why it's needed:** Iron Vault exports track/entity references as spans with data attributes, not as actual links. This script makes them clickable.

---

## After Re-exporting

If you do a clean export that wipes the `docs/site-lib/` folder, you'll need to restore these four files:

1. `docs/site-lib/html/custom-head-content-content.html`
2. `docs/site-lib/styles/iron-vault-styles.css`
3. `docs/site-lib/styles/custom-fixes.css`
4. `docs/site-lib/scripts/iron-vault-links.js`

**Tip:** Keep backups of these files outside the `docs/` folder, or restore them from git history after export.

---

## Export Plugin Settings

In the obsidian-webpage-export plugin settings:

- **Enable "Custom HTML / JS"** - This loads `custom-head-content-content.html`
- The plugin looks for this file at `site-lib/html/custom-head-content-content.html`

---

## Troubleshooting

### Mechanic blocks display vertically instead of inline
- Check that `custom-fixes.css` loads AFTER `iron-vault-styles.css`
- Hard refresh the page (Ctrl+Shift+R) to clear cached CSS

### Entity/track links don't work
- Check browser console for errors
- Verify `iron-vault-links.js` is being loaded
- The script uses a MutationObserver to handle SPA navigation, so links should work both on initial load and after navigating between pages

### Styles not applying
- Check Network tab in dev tools - are the CSS files loading (status 200)?
- Check for "(from disk cache)" - try hard refresh
- Verify the `custom-head-content-content.html` include is working (check console for "Included file:" messages)

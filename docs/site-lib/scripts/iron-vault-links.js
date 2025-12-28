/**
 * Iron Vault Link Fixer
 * Converts Iron Vault track/entity path spans to working links on the exported site.
 */
(function() {
  let searchIndex = null;

  // Load the search index to resolve entity paths
  async function loadSearchIndex() {
    try {
      const response = await fetch('site-lib/search-index.json');
      if (response.ok) {
        searchIndex = await response.json();
      }
    } catch (e) {
      console.warn('Could not load search index for entity link resolution');
    }
  }

  // Convert Obsidian path to HTML path
  function obsidianToHtmlPath(obsidianPath) {
    return obsidianPath
      .toLowerCase()
      .replace(/\.md$/, '.html')
      .replace(/ /g, '-')
      .replace(/'/g, '');
  }

  // Find a page in the search index by filename
  function findPageByFilename(filename) {
    if (!searchIndex || !searchIndex.documentIds) return null;
    
    const searchName = filename.toLowerCase().replace(/\.md$/, '').replace(/ /g, '-');
    
    for (const id in searchIndex.documentIds) {
      const path = searchIndex.documentIds[id];
      // Extract filename from path and compare
      const pathFilename = path.split('/').pop().replace('.html', '');
      if (pathFilename === searchName) {
        return path;
      }
    }
    return null;
  }

  // Convert a span to a link using click handler (avoids base href issues)
  function convertToLink(el, href) {
    const link = document.createElement('a');
    link.className = el.className;
    link.innerHTML = el.innerHTML;
    link.style.cursor = 'pointer';
    
    // Copy all data attributes
    Array.from(el.attributes).forEach(function(attr) {
      if (attr.name.startsWith('data-')) {
        link.setAttribute(attr.name, attr.value);
      }
    });
    
    // Use click handler to navigate, bypassing base href issues
    link.addEventListener('click', function(e) {
      e.preventDefault();
      // Get the base href and construct the full URL
      const baseEl = document.querySelector('base');
      const baseHref = baseEl ? baseEl.getAttribute('href') : '.';
      // Navigate to the path relative to base
      window.location.href = baseHref + '/' + href;
    });
    
    // Set href for accessibility/right-click (even if not used for navigation)
    link.href = '#';
    
    el.parentNode.replaceChild(link, el);
  }

  // Process track paths (full paths like "The Starforged (NickArrow)/Progress/...")
  function processTrackPaths() {
    document.querySelectorAll('[data-track-path]').forEach(function(el) {
      const trackPath = el.getAttribute('data-track-path');
      if (!trackPath) return;
      
      const htmlPath = obsidianToHtmlPath(trackPath);
      convertToLink(el, htmlPath);
    });
  }

  // Process entity paths (just filenames like "Reck.md")
  function processEntityPaths() {
    document.querySelectorAll('[data-entity-path]').forEach(function(el) {
      const entityPath = el.getAttribute('data-entity-path');
      if (!entityPath) return;
      
      // Try to find the full path in the search index
      const resolvedPath = findPageByFilename(entityPath);
      if (resolvedPath) {
        convertToLink(el, resolvedPath);
      }
    });
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', async function() {
    await loadSearchIndex();
    processTrackPaths();
    processEntityPaths();
  });
})();

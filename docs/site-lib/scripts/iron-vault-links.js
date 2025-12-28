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
      // Silently fail - entity links with just filenames won't work
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
    
    // Handle both full paths and just filenames
    const searchName = filename.split('/').pop().toLowerCase().replace(/\.md$/, '').replace(/ /g, '-');
    
    for (const id in searchIndex.documentIds) {
      const path = searchIndex.documentIds[id];
      const pathFilename = path.split('/').pop().replace('.html', '');
      if (pathFilename === searchName) {
        return path;
      }
    }
    return null;
  }

  // Convert a span to a link
  function convertToLink(el, href) {
    const link = document.createElement('a');
    link.className = el.className;
    link.innerHTML = el.innerHTML;
    link.href = href;
    
    // Copy all data attributes
    Array.from(el.attributes).forEach(function(attr) {
      if (attr.name.startsWith('data-')) {
        link.setAttribute(attr.name, attr.value);
      }
    });
    
    el.parentNode.replaceChild(link, el);
  }

  // Process track paths (full paths like "The Starforged (NickArrow)/Progress/...")
  function processTrackPaths() {
    document.querySelectorAll('span[data-track-path]').forEach(function(el) {
      const trackPath = el.getAttribute('data-track-path');
      if (!trackPath) return;
      
      const htmlPath = obsidianToHtmlPath(trackPath);
      convertToLink(el, htmlPath);
    });
  }

  // Process entity paths (can be full paths or just filenames)
  function processEntityPaths() {
    document.querySelectorAll('span[data-entity-path]').forEach(function(el) {
      const entityPath = el.getAttribute('data-entity-path');
      if (!entityPath) return;
      
      // Check if it's already a full path or just a filename
      if (entityPath.includes('/')) {
        // Full path - convert directly
        const htmlPath = obsidianToHtmlPath(entityPath);
        convertToLink(el, htmlPath);
      } else {
        // Just filename - look up in search index
        const resolvedPath = findPageByFilename(entityPath);
        if (resolvedPath) {
          convertToLink(el, resolvedPath);
        }
      }
    });
  }

  // Main initialization
  async function init() {
    await loadSearchIndex();
    processTrackPaths();
    processEntityPaths();
  }

  // Run immediately since this script is loaded dynamically after DOM is ready
  // Use a small delay to ensure all dynamic content is loaded
  setTimeout(init, 200);
})();

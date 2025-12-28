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
        console.log('[IV Links] Search index loaded');
      }
    } catch (e) {
      console.warn('[IV Links] Could not load search index:', e);
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
    link.style.cursor = 'pointer';
    
    // Copy all data attributes
    Array.from(el.attributes).forEach(function(attr) {
      if (attr.name.startsWith('data-')) {
        link.setAttribute(attr.name, attr.value);
      }
    });
    
    // Set the href directly - the base tag should handle relative resolution
    link.href = href;
    
    el.parentNode.replaceChild(link, el);
    console.log('[IV Links] Converted:', el.textContent, '->', href);
  }

  // Process track paths (full paths like "The Starforged (NickArrow)/Progress/...")
  function processTrackPaths() {
    const elements = document.querySelectorAll('span[data-track-path]');
    console.log('[IV Links] Found track elements:', elements.length);
    
    elements.forEach(function(el) {
      const trackPath = el.getAttribute('data-track-path');
      if (!trackPath) return;
      
      const htmlPath = obsidianToHtmlPath(trackPath);
      convertToLink(el, htmlPath);
    });
  }

  // Process entity paths (can be full paths or just filenames)
  function processEntityPaths() {
    const elements = document.querySelectorAll('span[data-entity-path]');
    console.log('[IV Links] Found entity elements:', elements.length);
    
    elements.forEach(function(el) {
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
        } else {
          console.warn('[IV Links] Could not resolve entity:', entityPath);
        }
      }
    });
  }

  // Main initialization
  async function init() {
    console.log('[IV Links] Initializing...');
    await loadSearchIndex();
    processTrackPaths();
    processEntityPaths();
    console.log('[IV Links] Done');
  }

  // Wait for everything to be ready
  // Use a small delay to ensure dynamic includes have loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(init, 100);
    });
  } else {
    setTimeout(init, 100);
  }
})();

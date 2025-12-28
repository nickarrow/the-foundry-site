/**
 * Iron Vault Link Fixer
 * Converts Iron Vault track/entity path spans to working links on the exported site.
 * 
 * Uses URL polling to detect SPA navigation since the site replaces content
 * without triggering standard navigation events.
 */
(function() {
  let searchIndex = null;
  let lastUrl = location.href;
  let pollInterval = null;

  // Load the search index to resolve entity paths
  async function loadSearchIndex() {
    if (searchIndex) return;
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

  // Process track paths
  function processTrackPaths() {
    document.querySelectorAll('span[data-track-path]').forEach(function(el) {
      const trackPath = el.getAttribute('data-track-path');
      if (!trackPath) return;
      
      const htmlPath = obsidianToHtmlPath(trackPath);
      convertToLink(el, htmlPath);
    });
  }

  // Process entity paths
  function processEntityPaths() {
    document.querySelectorAll('span[data-entity-path]').forEach(function(el) {
      const entityPath = el.getAttribute('data-entity-path');
      if (!entityPath) return;
      
      if (entityPath.includes('/')) {
        const htmlPath = obsidianToHtmlPath(entityPath);
        convertToLink(el, htmlPath);
      } else {
        const resolvedPath = findPageByFilename(entityPath);
        if (resolvedPath) {
          convertToLink(el, resolvedPath);
        }
      }
    });
  }

  // Process all Iron Vault links
  async function processLinks() {
    await loadSearchIndex();
    processTrackPaths();
    processEntityPaths();
  }

  // Check if URL changed (SPA navigation detection)
  function checkForNavigation() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // Wait for content to load after navigation
      setTimeout(processLinks, 300);
    }
  }

  // Start polling for URL changes
  function startPolling() {
    if (pollInterval) return;
    pollInterval = setInterval(checkForNavigation, 200);
  }

  // Initialize
  async function init() {
    await processLinks();
    startPolling();
  }

  // Run after a delay to ensure DOM is ready
  setTimeout(init, 200);
})();

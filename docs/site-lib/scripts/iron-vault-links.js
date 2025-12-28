/**
 * Iron Vault Link Fixer
 * Converts Iron Vault track/entity path spans to working links on the exported site.
 */
(function() {
  console.log('[IV Links] Script loaded');
  
  let searchIndex = null;

  // Load the search index to resolve entity paths
  async function loadSearchIndex() {
    if (searchIndex) return;
    try {
      const response = await fetch('site-lib/search-index.json');
      if (response.ok) {
        searchIndex = await response.json();
        console.log('[IV Links] Search index loaded');
      }
    } catch (e) {
      console.log('[IV Links] Failed to load search index', e);
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
    
    Array.from(el.attributes).forEach(function(attr) {
      if (attr.name.startsWith('data-')) {
        link.setAttribute(attr.name, attr.value);
      }
    });
    
    el.parentNode.replaceChild(link, el);
  }

  // Process all Iron Vault links
  async function processLinks() {
    await loadSearchIndex();
    
    const trackSpans = document.querySelectorAll('span[data-track-path]');
    const entitySpans = document.querySelectorAll('span[data-entity-path]');
    
    console.log('[IV Links] Processing - found', trackSpans.length, 'track spans,', entitySpans.length, 'entity spans');
    
    trackSpans.forEach(function(el) {
      const trackPath = el.getAttribute('data-track-path');
      if (trackPath) {
        convertToLink(el, obsidianToHtmlPath(trackPath));
      }
    });
    
    entitySpans.forEach(function(el) {
      const entityPath = el.getAttribute('data-entity-path');
      if (!entityPath) return;
      
      if (entityPath.includes('/')) {
        convertToLink(el, obsidianToHtmlPath(entityPath));
      } else {
        const resolvedPath = findPageByFilename(entityPath);
        if (resolvedPath) {
          convertToLink(el, resolvedPath);
        }
      }
    });
  }

  // Expose globally so it can be called after navigation
  window.processIronVaultLinks = processLinks;

  // Watch for DOM changes using MutationObserver on body
  let debounceTimer = null;
  const observer = new MutationObserver(function(mutations) {
    // Check if any added nodes contain our target elements
    let hasTargets = false;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) { // Element node
          if (node.querySelector && 
              (node.querySelector('span[data-track-path], span[data-entity-path]') ||
               node.matches && node.matches('span[data-track-path], span[data-entity-path]'))) {
            hasTargets = true;
            break;
          }
        }
      }
      if (hasTargets) break;
    }
    
    if (hasTargets) {
      console.log('[IV Links] MutationObserver detected new content');
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(processLinks, 100);
    }
  });

  // Start observing once DOM is ready
  function init() {
    console.log('[IV Links] Initializing');
    // Process existing content
    processLinks();
    
    // Watch for future changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    console.log('[IV Links] MutationObserver started on body');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

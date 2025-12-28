/**
 * Iron Vault Link Fixer
 * Converts Iron Vault track/entity path spans to working links on the exported site.
 * Uses MutationObserver to handle SPA navigation.
 */
(function() {
  let searchIndex = null;

  async function loadSearchIndex() {
    if (searchIndex) return;
    try {
      const response = await fetch('site-lib/search-index.json');
      if (response.ok) {
        searchIndex = await response.json();
      }
    } catch (e) {
      // Silently fail
    }
  }

  function obsidianToHtmlPath(obsidianPath) {
    return obsidianPath
      .toLowerCase()
      .replace(/\.md$/, '.html')
      .replace(/ /g, '-')
      .replace(/'/g, '');
  }

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

  async function processLinks() {
    await loadSearchIndex();
    
    document.querySelectorAll('span[data-track-path]').forEach(function(el) {
      const trackPath = el.getAttribute('data-track-path');
      if (trackPath) {
        convertToLink(el, obsidianToHtmlPath(trackPath));
      }
    });
    
    document.querySelectorAll('span[data-entity-path]').forEach(function(el) {
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

  // Expose globally for manual calls if needed
  window.processIronVaultLinks = processLinks;

  // Watch for DOM changes (SPA navigation)
  let debounceTimer = null;
  const observer = new MutationObserver(function(mutations) {
    let hasTargets = false;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
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
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(processLinks, 100);
    }
  });

  function makeTitleHomeLink() {
    const titleEl = document.querySelector('#file-explorer .feature-title');
    if (titleEl && !titleEl.querySelector('a')) {
      const text = titleEl.textContent;
      titleEl.innerHTML = '<a href="index.html">' + text + '</a>';
    }
  }

  function init() {
    processLinks();
    makeTitleHomeLink();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/**
 * Markdown processing with Iron Vault support
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeRaw from 'rehype-raw';
import { visit } from 'unist-util-visit';
import { parseInlineMechanic, pathToSlug } from './iron-vault-inline';
import { parseIronVaultBlock } from './iron-vault-blocks';
import { parseDataviewQuery, executeDataviewQuery, renderDataviewResult, type ContentFile } from './dataview';

export async function processMarkdown(content: string, allFiles: ContentFile[], baseUrl: string = ''): Promise<string> {
  // Normalize line endings first (Windows CRLF to LF)
  let processed = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Ensure code fences have blank lines before them (required for proper parsing)
  // This handles cases like "text\n```code" -> "text\n\n```code"
  processed = processed.replace(/([^\n])\n(```)/g, '$1\n\n$2');
  
  // Build a lookup map for wikilink resolution
  const filesByName = new Map<string, ContentFile>();
  for (const file of allFiles) {
    // Index by title (case-insensitive)
    filesByName.set(file.title.toLowerCase(), file);
    // Also index by filename without extension
    const filename = file.path.split(/[/\\]/).pop()?.replace(/\.md$/, '') || '';
    filesByName.set(filename.toLowerCase(), file);
  }
  
  // Convert Obsidian callouts > [!type]- Title to HTML
  // This needs to happen before other processing
  processed = processCallouts(processed);
  
  // Handle image embeds ![[image.png]] or ![[image.png|size]]
  // MUST be processed before wikilinks to avoid ![[...]] being partially matched
  processed = processed.replace(/!\[\[([^\]|]+\.(?:png|jpg|jpeg|gif|svg|webp))(?:\|([^\]]+))?\]\]/gi, (match, filename, options) => {
    // Find the image in attachments
    const src = findImagePath(filename, baseUrl);
    const alt = filename.replace(/\.[^.]+$/, '');
    
    if (options) {
      // Handle size options like |100 or |center|100
      const parts = options.split('|');
      const size = parts.find((p: string) => /^\d+$/.test(p));
      const align = parts.find((p: string) => ['center', 'left', 'right'].includes(p));
      
      let style = '';
      if (size) style += `width: ${size}px;`;
      if (align === 'center') style += 'display: block; margin: 0 auto;';
      
      return `<img src="${src}" alt="${alt}" style="${style}" />`;
    }
    
    return `![${alt}](${src})`;
  });
  
  // Handle content embeds ![[Note Name]] (non-images)
  // MUST be processed before wikilinks
  processed = processed.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, target, display) => {
    // Try to find the file
    const lookupKey = target.toLowerCase().trim();
    const file = filesByName.get(lookupKey);
    const slug = file ? file.slug : pathToSlug(target + '.md');
    
    return `<div class="embed-link"><a href="${baseUrl}/${slug}">${display || target}</a></div>`;
  });
  
  // Convert wikilinks [[Page Name]] or [[Page Name|Display Text]] to markdown links
  processed = processed.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, target, display) => {
    const displayText = display || target;
    
    // Try to find the file by name
    const lookupKey = target.toLowerCase().trim();
    const file = filesByName.get(lookupKey);
    
    if (file) {
      return `[${displayText}](${baseUrl}/${file.slug})`;
    }
    
    // Fallback: slugify the target directly
    const slug = pathToSlug(target + '.md');
    return `[${displayText}](${baseUrl}/${slug})`;
  });
  
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkIronVault, { allFiles, baseUrl })
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeStringify)
    .process(processed);
  
  return String(result);
}

function processCallouts(content: string): string {
  // Process Obsidian callouts: > [!type]- Title followed by content
  // Convert to HTML callout divs
  
  // Normalize line endings first
  const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedContent.split('\n');
  const result: string[] = [];
  let inCallout = false;
  let calloutType = '';
  let calloutTitle = '';
  let calloutContent: string[] = [];
  let isCollapsible = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for callout start: > [!type] or > [!type]- or > [!type]+
    const calloutMatch = line.match(/^>\s*\[!([^\]]+)\]([-+])?\s*(.*)?$/);
    
    if (calloutMatch) {
      // If we were in a callout, close it first
      if (inCallout) {
        result.push(renderCallout(calloutType, calloutTitle, calloutContent, isCollapsible));
        calloutContent = [];
      }
      
      inCallout = true;
      calloutType = calloutMatch[1].toLowerCase();
      isCollapsible = calloutMatch[2] === '-' || calloutMatch[2] === '+';
      calloutTitle = calloutMatch[3] || calloutType.toUpperCase();
    } else if (inCallout && line.startsWith('>')) {
      // Continue callout content - remove the leading >
      calloutContent.push(line.replace(/^>\s?/, ''));
    } else if (inCallout && line.trim() === '') {
      // Empty line might end callout or be part of it
      // Check if next line continues the callout
      if (i + 1 < lines.length && lines[i + 1].startsWith('>')) {
        calloutContent.push('');
      } else {
        // End callout
        result.push(renderCallout(calloutType, calloutTitle, calloutContent, isCollapsible));
        calloutContent = [];
        inCallout = false;
        result.push(line);
      }
    } else {
      if (inCallout) {
        // End callout
        result.push(renderCallout(calloutType, calloutTitle, calloutContent, isCollapsible));
        calloutContent = [];
        inCallout = false;
      }
      result.push(line);
    }
  }
  
  // Close any remaining callout
  if (inCallout) {
    result.push(renderCallout(calloutType, calloutTitle, calloutContent, isCollapsible));
  }
  
  return result.join('\n');
}

function renderCallout(type: string, title: string, content: string[], isCollapsible: boolean): string {
  const contentHtml = content.join('\n');
  const iconSvg = getCalloutIconSvg(type);
  const displayTitle = title || type.toUpperCase();
  
  // Match Obsidian's callout HTML structure exactly
  const foldIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-chevron-down"><path d="m6 9 6 6 6-6"></path></svg>`;
  
  if (isCollapsible) {
    return `<div data-callout-metadata="" data-callout-fold="-" data-callout="${type}" class="callout is-collapsible is-collapsed">
<div class="callout-title" dir="auto">
<div class="callout-icon">${iconSvg}</div>
<div class="callout-title-inner">${displayTitle}</div>
<div class="callout-fold is-collapsed">${foldIcon}</div>
</div>
<div class="callout-content" style="display: none;">

${contentHtml}

</div>
</div>`;
  }
  
  return `<div data-callout-metadata="" data-callout="${type}" class="callout">
<div class="callout-title" dir="auto">
<div class="callout-icon">${iconSvg}</div>
<div class="callout-title-inner">${displayTitle}</div>
</div>
<div class="callout-content">

${contentHtml}

</div>
</div>`;
}

function getCalloutIconSvg(type: string): string {
  // Lucide SVG icons matching Obsidian's callout icons
  const icons: Record<string, string> = {
    'note': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg>',
    'info': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-square-user-round"><path d="M18 21a6 6 0 0 0-12 0"></path><circle cx="12" cy="11" r="4"></circle><rect width="18" height="18" x="3" y="3" rx="2"></rect></svg>',
    'tip': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-flame"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>',
    'warning': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>',
    'danger': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-zap"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
    'example': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-list"><line x1="8" x2="21" y1="6" y2="6"></line><line x1="8" x2="21" y1="12" y2="12"></line><line x1="8" x2="21" y1="18" y2="18"></line><line x1="3" x2="3.01" y1="6" y2="6"></line><line x1="3" x2="3.01" y1="12" y2="12"></line><line x1="3" x2="3.01" y1="18" y2="18"></line></svg>',
    'quote': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-quote"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21c0 1 0 1 1 1z"></path><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path></svg>',
    // Iron Vault specific callouts
    'assets': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-sticky-note"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"></path><path d="M15 3v4a2 2 0 0 0 2 2h4"></path></svg>',
    'gear': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-clipboard-list"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M12 11h4"></path><path d="M12 16h4"></path><path d="M8 11h.01"></path><path d="M8 16h.01"></path></svg>',
    'in-progress': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-copy-check"><path d="m12 15 2 2 4-4"></path><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>',
    'bonds': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-users-round"><path d="M18 21a8 8 0 0 0-16 0"></path><circle cx="10" cy="8" r="5"></circle><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"></path></svg>',
    'impacts': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-circle-alert"><circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12.01" y1="16" y2="16"></line></svg>',
    'legacies': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-square-stack"><path d="M4 10c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2"></path><path d="M10 16c-1.1 0-2-.9-2-2v-4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2"></path><rect width="8" height="8" x="14" y="14" rx="2"></rect></svg>',
    'complete': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-book-open-check"><path d="M8 3H2v15h7c1.7 0 3 1.3 3 3V7c0-2.2-1.8-4-4-4Z"></path><path d="m16 12 2 2 4-4"></path><path d="M22 6V3h-6c-2.2 0-4 1.8-4 4v14c0-1.7 1.3-3 3-3h7v-2.3"></path></svg>',
  };
  // Default icon
  const defaultIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-info"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>';
  return icons[type] || defaultIcon;
}

function findImagePath(filename: string, baseUrl: string): string {
  // Normalize filename: lowercase and replace spaces with hyphens
  const normalizedName = filename.toLowerCase().replace(/\s+/g, '-');
  return `${baseUrl}/attachments/${normalizedName}`;
}

// Custom remark plugin for Iron Vault syntax
function remarkIronVault(options: { allFiles: ContentFile[]; baseUrl: string }) {
  return (tree: any) => {
    visit(tree, (node, index, parent) => {
      // Handle inline code with iv-* prefix
      if (node.type === 'inlineCode' && node.value.startsWith('iv-')) {
        const html = parseInlineMechanic(node.value, options.baseUrl);
        if (html) {
          node.type = 'html';
          node.value = html;
        }
      }
      
      // Handle code blocks
      if (node.type === 'code') {
        // Trim trailing whitespace from all code blocks
        if (node.value) {
          node.value = node.value.trimEnd();
        }
        
        if (node.lang === 'iron-vault-mechanics') {
          node.type = 'html';
          node.value = parseIronVaultBlock(node.value, options.baseUrl);
        } else if (node.lang === 'iron-vault-track') {
          // This is rendered by the page component using frontmatter
          node.type = 'html';
          node.value = '<div class="iron-vault-track-placeholder"></div>';
        } else if (node.lang === 'iron-vault-character-meters') {
          node.type = 'html';
          node.value = '<div class="iron-vault-character-meters-placeholder"></div>';
        } else if (node.lang === 'iron-vault-character-assets') {
          node.type = 'html';
          node.value = '<div class="iron-vault-character-assets-placeholder"></div>';
        } else if (node.lang === 'iron-vault-character-impacts') {
          node.type = 'html';
          node.value = '<div class="iron-vault-character-impacts-placeholder"></div>';
        } else if (node.lang === 'iron-vault-character-special-tracks') {
          node.type = 'html';
          node.value = '<div class="iron-vault-character-special-tracks-placeholder"></div>';
        } else if (node.lang === 'dataview') {
          // Parse and execute dataview query
          const query = parseDataviewQuery(node.value);
          if (query) {
            const results = executeDataviewQuery(query, options.allFiles);
            node.type = 'html';
            node.value = renderDataviewResult(query, results, options.baseUrl);
          } else {
            node.type = 'html';
            node.value = `<div class="dataview-error">Could not parse query</div>`;
          }
        }
      }
    });
  };
}

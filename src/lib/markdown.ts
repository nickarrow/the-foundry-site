/**
 * Markdown processing with Iron Vault support
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeRaw from 'rehype-raw';
import { visit } from 'unist-util-visit';
import { parseInlineMechanic, pathToSlug } from './iron-vault-inline';
import { parseIronVaultBlock } from './iron-vault-blocks';
import { parseDataviewQuery, executeDataviewQuery, renderDataviewResult, type ContentFile } from './dataview';

export async function processMarkdown(content: string, allFiles: ContentFile[], baseUrl: string = ''): Promise<string> {
  // Pre-process: handle wikilinks and embeds before markdown parsing
  let processed = content;
  
  // Build a lookup map for wikilink resolution
  const filesByName = new Map<string, ContentFile>();
  for (const file of allFiles) {
    // Index by title (case-insensitive)
    filesByName.set(file.title.toLowerCase(), file);
    // Also index by filename without extension
    const filename = file.path.split(/[/\\]/).pop()?.replace(/\.md$/, '') || '';
    filesByName.set(filename.toLowerCase(), file);
  }
  
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
  
  // Handle image embeds ![[image.png]] or ![[image.png|size]]
  processed = processed.replace(/!\[\[([^\]|]+\.(?:png|jpg|jpeg|gif|svg|webp))(?:\|([^\]]+))?\]\]/gi, (match, filename, options) => {
    // Find the image in attachments - for now, assume it's in an attachments folder nearby
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
  processed = processed.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, target, display) => {
    // Try to find the file
    const lookupKey = target.toLowerCase().trim();
    const file = filesByName.get(lookupKey);
    const slug = file ? file.slug : pathToSlug(target + '.md');
    
    return `<div class="embed-link"><a href="${baseUrl}/${slug}">${display || target}</a></div>`;
  });
  
  const result = await unified()
    .use(remarkParse)
    .use(remarkIronVault, { allFiles, baseUrl })
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeStringify)
    .process(processed);
  
  return String(result);
}

function findImagePath(filename: string, baseUrl: string): string {
  // For now, return a path that assumes images are in /attachments/
  // The actual path resolution will happen at build time when we copy assets
  return `${baseUrl}/attachments/${filename}`;
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

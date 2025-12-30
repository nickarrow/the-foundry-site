/**
 * Content loading and processing utilities
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { ContentFile } from './dataview';

const CONTENT_DIR = 'content';
const EXCLUDED_PATTERNS = [
  /^\./,           // Hidden files/folders
  /\.excalidraw\.md$/,  // Excalidraw files
  /\.base$/,       // Base files
  /^README\.md$/,  // Root README
];

export function getAllContentFiles(): ContentFile[] {
  const files: ContentFile[] = [];
  
  function walkDir(dir: string, relativePath: string = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relativePath, entry.name);
      
      // Skip excluded patterns
      if (EXCLUDED_PATTERNS.some(p => p.test(entry.name))) {
        continue;
      }
      
      if (entry.isDirectory()) {
        // Skip hidden directories
        if (!entry.name.startsWith('.')) {
          walkDir(fullPath, relPath);
        }
      } else if (entry.name.endsWith('.md')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const { data: frontmatter, content: body } = matter(content);
        
        const title = extractTitle(body, entry.name);
        const slug = pathToSlug(relPath);
        
        files.push({
          path: relPath,
          slug,
          title,
          frontmatter
        });
      }
    }
  }
  
  walkDir(CONTENT_DIR);
  return files;
}

export function getContentFile(slug: string): { frontmatter: Record<string, any>; content: string; title: string } | null {
  const files = getAllContentFiles();
  const file = files.find(f => f.slug === slug);
  
  if (!file) return null;
  
  const fullPath = path.join(CONTENT_DIR, file.path);
  const raw = fs.readFileSync(fullPath, 'utf-8');
  const { data: frontmatter, content } = matter(raw);
  const title = extractTitle(content, path.basename(file.path));
  
  return { frontmatter, content, title };
}

export function getFileByPath(filePath: string): { frontmatter: Record<string, any>; content: string } | null {
  const fullPath = path.join(CONTENT_DIR, filePath);
  
  if (!fs.existsSync(fullPath)) return null;
  
  const raw = fs.readFileSync(fullPath, 'utf-8');
  const { data: frontmatter, content } = matter(raw);
  
  return { frontmatter, content };
}

export function getFileContentByName(name: string): { content: string; title: string; path: string } | null {
  const files = getAllContentFiles();
  const lookupKey = name.toLowerCase().trim();
  
  // Try to find by title or filename
  const file = files.find(f => {
    const title = f.title.toLowerCase();
    const filename = f.path.split(/[/\\]/).pop()?.replace(/\.md$/, '').toLowerCase() || '';
    return title === lookupKey || filename === lookupKey;
  });
  
  if (!file) return null;
  
  const fullPath = path.join(CONTENT_DIR, file.path);
  const raw = fs.readFileSync(fullPath, 'utf-8');
  const { content } = matter(raw);
  
  return { content, title: file.title, path: file.path };
}

function extractTitle(content: string, filename: string): string {
  // Use filename without extension as the title
  // This preserves numbering like "2. Getting Started" from filenames
  return filename.replace(/\.md$/, '');
}

export function pathToSlug(filePath: string): string {
  return filePath
    .replace(/\\/g, '/')  // Normalize Windows paths
    .replace(/\.md$/, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[()]/g, '')
    .replace(/'/g, '');
}

export function slugToPath(slug: string): string | null {
  const files = getAllContentFiles();
  const file = files.find(f => f.slug === slug);
  return file?.path || null;
}

export function buildNavigationTree(): NavNode[] {
  const files = getAllContentFiles();
  const tree: NavNode[] = [];
  
  // Group files by directory
  const byDir = new Map<string, ContentFile[]>();
  
  for (const file of files) {
    // Normalize path separators
    const normalizedPath = file.path.replace(/\\/g, '/');
    const dir = normalizedPath.includes('/') 
      ? normalizedPath.substring(0, normalizedPath.lastIndexOf('/'))
      : '.';
    if (!byDir.has(dir)) {
      byDir.set(dir, []);
    }
    byDir.get(dir)!.push(file);
  }
  
  // Build tree structure
  function buildNode(dirPath: string, files: ContentFile[]): NavNode {
    // Normalize for display
    const normalizedDir = dirPath.replace(/\\/g, '/');
    const name = normalizedDir === '.' ? 'Home' : normalizedDir.split('/').pop() || dirPath;
    const children: NavNode[] = [];
    
    // Add files in this directory
    for (const file of files) {
      children.push({
        name: file.title,
        slug: file.slug,
        children: []
      });
    }
    
    // Add subdirectories
    for (const [subDir, subFiles] of byDir) {
      const normalizedSubDir = subDir.replace(/\\/g, '/');
      const parentDir = normalizedSubDir.includes('/')
        ? normalizedSubDir.substring(0, normalizedSubDir.lastIndexOf('/'))
        : '.';
      if (normalizedSubDir !== normalizedDir && parentDir === normalizedDir) {
        children.push(buildNode(subDir, subFiles));
      }
    }
    
    // Sort: directories first, then alphabetically
    children.sort((a, b) => {
      const aIsDir = a.children.length > 0;
      const bIsDir = b.children.length > 0;
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.name.localeCompare(b.name);
    });
    
    return {
      name,
      slug: normalizedDir === '.' ? '' : pathToSlug(normalizedDir),
      children
    };
  }
  
  // Start from root
  const rootFiles = byDir.get('.') || [];
  
  // Add root-level files
  for (const file of rootFiles) {
    tree.push({
      name: file.title,
      slug: file.slug,
      children: []
    });
  }
  
  // Add top-level directories
  for (const [dir, files] of byDir) {
    // Normalize path separators for cross-platform compatibility
    const normalizedDir = dir.replace(/\\/g, '/');
    if (normalizedDir !== '.' && !normalizedDir.includes('/')) {
      tree.push(buildNode(dir, files));
    }
  }
  
  // Sort root level
  tree.sort((a, b) => {
    const aIsDir = a.children.length > 0;
    const bIsDir = b.children.length > 0;
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a.name.localeCompare(b.name);
  });
  
  return tree;
}

export interface NavNode {
  name: string;
  slug: string;
  children: NavNode[];
}

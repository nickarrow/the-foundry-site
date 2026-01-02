/**
 * Generate changelog from git history
 * Scans content/ for markdown files and creates a changelog sorted by last modified date
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const CONTENT_DIR = 'content';
const OUTPUT_FILE = 'content/The Foundry Changelog.md';
const MAX_ENTRIES = 50; // Limit changelog entries

// Files/patterns to exclude from changelog
const EXCLUDED_PATTERNS = [
  /^\./, // Hidden files/folders
  /\.excalidraw\.md$/, // Excalidraw files
  /\.base$/, // Base files
  /^README\.md$/, // Root README
  /The Foundry Changelog/, // The changelog itself
];

function shouldExclude(filePath) {
  const filename = path.basename(filePath);
  return EXCLUDED_PATTERNS.some((p) => p.test(filename) || p.test(filePath));
}

function getGitLastModified(filePath) {
  try {
    // Get the directory containing the file to run git from there (handles submodules)
    const fileDir = path.dirname(filePath);
    const fileName = path.basename(filePath);

    // Get the last commit date for this file
    const result = execSync(`git log -1 --format="%aI" -- "${fileName}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: fileDir,
    }).trim();

    if (result) {
      return new Date(result);
    }
  } catch {
    // File might not be tracked by git yet
  }

  // Fallback to filesystem mtime
  try {
    const stats = fs.statSync(filePath);
    return stats.mtime;
  } catch {
    return new Date(0);
  }
}

function getGitCommitMessage(filePath) {
  try {
    const fileDir = path.dirname(filePath);
    const fileName = path.basename(filePath);

    const result = execSync(`git log -1 --format="%s" -- "${fileName}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: fileDir,
    }).trim();
    return result || '';
  } catch {
    return '';
  }
}

function getGitAuthor(filePath) {
  try {
    const fileDir = path.dirname(filePath);
    const fileName = path.basename(filePath);

    const result = execSync(`git log -1 --format="%an" -- "${fileName}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: fileDir,
    }).trim();
    return result || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

function collectMarkdownFiles(dir, relativePath = '') {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(relativePath, entry.name).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.')) {
        files.push(...collectMarkdownFiles(fullPath, relPath));
      }
    } else if (entry.name.endsWith('.md') && !shouldExclude(relPath)) {
      files.push({
        path: relPath,
        fullPath: fullPath,
        name: entry.name.replace(/\.md$/, ''),
      });
    }
  }

  return files;
}

function formatDate(date) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function generateChangelog() {
  console.log('Generating changelog from git history...');

  const files = collectMarkdownFiles(CONTENT_DIR);

  // Get modification dates for all files
  const filesWithDates = files.map((file) => {
    const lastModified = getGitLastModified(file.fullPath);
    const commitMessage = getGitCommitMessage(file.fullPath);
    const author = getGitAuthor(file.fullPath);
    return {
      ...file,
      lastModified,
      commitMessage,
      author,
    };
  });

  // Sort by last modified (newest first)
  filesWithDates.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

  // Take top entries
  const topFiles = filesWithDates.slice(0, MAX_ENTRIES);

  // Generate markdown content
  let markdown = `# The Foundry Changelog

Lists the most recently modified files within The Foundry.

*Last generated: ${formatDate(new Date())}*

<div class="changelog-table">

| File | Author | Last Modified |
|------|--------|---------------|
`;

  for (const file of topFiles) {
    // Create wiki-style link that our markdown processor understands
    const link = `[[${file.name}]]`;
    const date = formatDate(file.lastModified);

    markdown += `| ${link} | ${file.author} | ${date} |\n`;
  }

  markdown += `
</div>

---

*This changelog is automatically generated during the site build process based on git commit history.*
`;

  // Write the changelog
  fs.writeFileSync(OUTPUT_FILE, markdown, 'utf-8');
  console.log(`Changelog generated with ${topFiles.length} entries: ${OUTPUT_FILE}`);
}

generateChangelog();

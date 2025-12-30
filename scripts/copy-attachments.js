/**
 * Copy all attachment files from content folders to public/attachments
 */

import fs from 'node:fs';
import path from 'node:path';

const CONTENT_DIR = 'content';
const OUTPUT_DIR = 'public/attachments';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function copyAttachments(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (entry.name === 'attachments') {
        // Copy all files from attachments folder
        const attachments = fs.readdirSync(fullPath);
        for (const file of attachments) {
          const srcPath = path.join(fullPath, file);
          // Normalize filename: lowercase and replace spaces with hyphens
          const normalizedName = file.toLowerCase().replace(/\s+/g, '-');
          const destPath = path.join(OUTPUT_DIR, normalizedName);
          
          if (fs.statSync(srcPath).isFile()) {
            fs.copyFileSync(srcPath, destPath);
            console.log(`Copied: ${srcPath} -> ${destPath}`);
          }
        }
      } else if (!entry.name.startsWith('.')) {
        // Recurse into subdirectories
        copyAttachments(fullPath);
      }
    }
  }
}

copyAttachments(CONTENT_DIR);
console.log('Done copying attachments!');

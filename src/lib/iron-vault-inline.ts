/**
 * Iron Vault Inline Mechanics Parser
 * Parses `iv-*` inline code and generates HTML matching the Iron Vault plugin CSS structure
 */

// Type for file lookup
interface FileInfo {
  slug: string;
  title: string;
  path: string;
}

export function parseInlineMechanic(
  code: string,
  baseUrl: string = '',
  filesByName?: Map<string, FileInfo>
): string | null {
  if (!code.startsWith('iv-')) return null;

  const colonIndex = code.indexOf(':');
  if (colonIndex === -1) return null;

  const type = code.substring(0, colonIndex);
  const content = code.substring(colonIndex + 1);

  switch (type) {
    case 'iv-move':
      return renderMove(content);
    case 'iv-oracle':
      return renderOracle(content);
    case 'iv-meter':
      return renderMeter(content);
    case 'iv-initiative':
      return renderInitiative(content);
    case 'iv-track-create':
      return renderTrackCreate(content, baseUrl, filesByName);
    case 'iv-track-advance':
      return renderTrackAdvance(content, baseUrl, filesByName);
    case 'iv-progress':
      return renderProgressRoll(content, baseUrl, filesByName);
    case 'iv-noroll':
      return renderNoRoll(content);
    case 'iv-entity-create':
      return renderEntityCreate(content, baseUrl, filesByName);
    default:
      return null;
  }
}

function getOutcome(score: number, vs1: number, vs2: number): 'strong-hit' | 'weak-hit' | 'miss' {
  if (score > vs1 && score > vs2) return 'strong-hit';
  if (score > vs1 || score > vs2) return 'weak-hit';
  return 'miss';
}

function isMatch(vs1: number, vs2: number): boolean {
  return vs1 === vs2;
}

function renderMove(content: string): string {
  // Format: Name|Stat|action|statValue|adds|vs1|vs2|moveRef|extras...
  const parts = content.split('|');
  const name = parts[0] || '';
  const stat = parts[1] || '';
  const action = parseInt(parts[2]) || 0;
  const statValue = parseInt(parts[3]) || 0;
  const adds = parseInt(parts[4]) || 0;
  const vs1 = parseInt(parts[5]) || 0;
  const vs2 = parseInt(parts[6]) || 0;

  const score = action + statValue + adds;
  const outcome = getOutcome(score, vs1, vs2);
  const match = isMatch(vs1, vs2);

  // Build class list
  const classes = ['iv-inline-mechanics', outcome];
  if (match) classes.push('match');

  return (
    `<span class="${classes.join(' ')}">` +
    `<span class="iv-inline-move-name iv-inline-link">${escapeHtml(name)}</span>` +
    `<span class="iv-inline-stat">(${escapeHtml(stat)})</span>` +
    `<span class="iv-inline-outcome-icon"></span>` +
    `<span>;</span>` +
    `<span class="iv-inline-score">${score}</span>` +
    `<span>vs</span>` +
    `<span class="iv-inline-challenge-die vs1">${vs1}</span>` +
    `<span>|</span>` +
    `<span class="iv-inline-challenge-die vs2">${vs2}</span>` +
    `${match ? '<span class="iv-inline-match">match</span>' : ''}` +
    `</span>`
  );
}

function renderOracle(content: string): string {
  // Format: Name|roll|result|oracleRef
  const parts = content.split('|');
  const name = parts[0] || '';
  const roll = parts[1] || '';
  const result = parts[2] || '';

  return (
    `<span class="iv-inline-mechanics oracle">` +
    `<span class="iv-inline-oracle-name iv-inline-link">${escapeHtml(name)}</span>` +
    `<span>(${roll})</span>` +
    `<span class="iv-inline-oracle-result">${escapeHtml(result)}</span>` +
    `</span>`
  );
}

function renderMeter(content: string): string {
  // Format: Name|from|to
  const parts = content.split('|');
  const name = parts[0] || '';
  const fromVal = parseInt(parts[1]) || 0;
  const to = parseInt(parts[2]) || 0;
  const delta = to - fromVal;
  const meterClass = delta > 0 ? 'meter-increase' : delta < 0 ? 'meter-decrease' : '';

  return (
    `<span class="iv-inline-mechanics ${meterClass}">` +
    `<span class="iv-inline-meter-name">${escapeHtml(name)}:</span>` +
    `<span class="iv-inline-meter-change">${fromVal} → ${to}</span>` +
    `</span>`
  );
}

function renderInitiative(content: string): string {
  // Format: Label|from|to
  const parts = content.split('|');
  const label = parts[0] || '';
  const to = parts[2] || parts[1] || '';
  const inControl = to.toLowerCase().includes('control');
  const initClass = inControl ? 'initiative-control' : 'initiative-bad-spot';

  return (
    `<span class="iv-inline-mechanics ${initClass}">` +
    `<span class="iv-inline-initiative-label">${escapeHtml(label)}:</span>` +
    `<span class="iv-inline-initiative-state">${escapeHtml(to)}</span>` +
    `</span>`
  );
}

// Lucide icons as inline SVGs - matching the exact icons used by Iron Vault in Obsidian
const ICON_SQUARE_STACK = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-square-stack"><path d="M4 10c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2"></path><path d="M10 16c-1.1 0-2-.9-2-2v-4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2"></path><rect x="14" y="14" width="8" height="8" rx="2"></rect></svg>`;
const ICON_COPY_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-copy-check"><path d="m12 15 2 2 4-4"></path><rect x="8" y="8" width="14" height="14" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>`;
const ICON_FILE_PLUS = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-file-plus"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M9 15h6"></path><path d="M12 18v-6"></path></svg>`;

function renderTrackCreate(
  content: string,
  baseUrl: string,
  filesByName?: Map<string, FileInfo>
): string {
  // Format: Name|path
  const parts = content.split('|');
  const name = parts[0] || '';
  const path = parts[1] || '';
  const slug = resolvePathToSlug(path, filesByName);

  return (
    `<span class="iv-inline-mechanics track-create">` +
    `<span class="iv-inline-track-icon">${ICON_SQUARE_STACK}</span>` +
    `<a href="${baseUrl}/${slug}" class="iv-inline-track-name iv-inline-link">${escapeHtml(name)}</a>` +
    `</span>`
  );
}

function renderTrackAdvance(
  content: string,
  baseUrl: string,
  filesByName?: Map<string, FileInfo>
): string {
  // Format: Name|path|from|to|rank|steps
  const parts = content.split('|');
  const name = parts[0] || '';
  const path = parts[1] || '';
  // parts[2] is 'from' (unused but part of format)
  const to = parseInt(parts[3]) || 0;
  const steps = parseInt(parts[5]) || 1;
  const slug = resolvePathToSlug(path, filesByName);
  const boxes = Math.floor(to / 4);

  return (
    `<span class="iv-inline-mechanics track-advance">` +
    `<span class="iv-inline-track-icon">${ICON_COPY_CHECK}</span>` +
    `<a href="${baseUrl}/${slug}" class="iv-inline-track-name iv-inline-link">${escapeHtml(name)}</a>` +
    `<span class="iv-inline-track-progress"> +${steps} (${boxes}/10)</span>` +
    `</span>`
  );
}

function renderProgressRoll(
  content: string,
  _baseUrl: string,
  _filesByName?: Map<string, FileInfo>
): string {
  // Format: Name|progress|vs1|vs2|path
  const parts = content.split('|');
  const name = parts[0] || '';
  const progress = parseInt(parts[1]) || 0;
  const vs1 = parseInt(parts[2]) || 0;
  const vs2 = parseInt(parts[3]) || 0;

  const outcome = getOutcome(progress, vs1, vs2);
  const match = isMatch(vs1, vs2);

  const classes = ['iv-inline-mechanics', outcome];
  if (match) classes.push('match');

  return (
    `<span class="${classes.join(' ')}">` +
    `<span class="iv-inline-progress-name iv-inline-link">${escapeHtml(name)}</span>` +
    `<span class="iv-inline-outcome-icon"></span>` +
    `<span>; </span>` +
    `<span class="iv-inline-score">${progress}</span>` +
    `<span> vs </span>` +
    `<span class="iv-inline-challenge-die vs1">${vs1}</span>` +
    `<span>|</span>` +
    `<span class="iv-inline-challenge-die vs2">${vs2}</span>` +
    `</span>`
  );
}

function renderNoRoll(content: string): string {
  // Format: Name|moveRef
  const parts = content.split('|');
  const name = parts[0] || '';

  return (
    `<span class="iv-inline-mechanics no-roll">` +
    `<span class="iv-inline-move-name iv-inline-link">${escapeHtml(name)}</span>` +
    `</span>`
  );
}

function renderEntityCreate(
  content: string,
  baseUrl: string,
  filesByName?: Map<string, FileInfo>
): string {
  // Format: Type|Name|path
  const parts = content.split('|');
  const type = parts[0] || '';
  const name = parts[1] || '';
  const path = parts[2] || '';
  const slug = resolvePathToSlug(path, filesByName);

  return (
    `<span class="iv-inline-mechanics entity-create">` +
    `<span class="iv-inline-entity-icon">${ICON_FILE_PLUS}</span>` +
    `<span class="iv-inline-entity-type">${escapeHtml(type)}:</span>` +
    `<a href="${baseUrl}/${slug}" class="iv-inline-entity-name iv-inline-link">${escapeHtml(name)}</a>` +
    `</span>`
  );
}

// Resolve a path (which might be just a filename) to a full slug
function resolvePathToSlug(path: string, filesByName?: Map<string, FileInfo>): string {
  if (!path) return '#';

  // Extract just the filename without extension for lookup
  const filename = path.replace(/\.md$/, '').split(/[/\\]/).pop() || '';
  const lookupKey = filename.toLowerCase();

  // Try to find the file in the lookup map
  if (filesByName) {
    const file = filesByName.get(lookupKey);
    if (file) {
      return file.slug;
    }
  }

  // Fallback to simple slug conversion
  return pathToSlug(path);
}

export function pathToSlug(path: string): string {
  if (!path) return '#';
  // Convert Obsidian path to site URL
  return (
    '/' +
    path
      .replace(/\.md$/, '')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[()]/g, '')
      .replace(/'/g, '')
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

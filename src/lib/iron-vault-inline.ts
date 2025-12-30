/**
 * Iron Vault Inline Mechanics Parser
 * Parses `iv-*` inline code and generates HTML matching the Iron Vault CSS structure
 */

export function parseInlineMechanic(code: string, baseUrl: string = ''): string | null {
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
      return renderTrackCreate(content, baseUrl);
    case 'iv-track-advance':
      return renderTrackAdvance(content, baseUrl);
    case 'iv-progress':
      return renderProgressRoll(content, baseUrl);
    case 'iv-noroll':
      return renderNoRoll(content);
    case 'iv-entity-create':
      return renderEntityCreate(content, baseUrl);
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
  const matchClass = match ? ' match' : '';

  // Outcome hexagon indicators
  let outcomeIcons = '';
  if (outcome === 'strong-hit') {
    outcomeIcons = '<span class="outcome-icons"><span class="hex hit">⬡</span><span class="hex hit">⬡</span></span>';
  } else if (outcome === 'weak-hit') {
    outcomeIcons = '<span class="outcome-icons"><span class="hex hit">⬡</span><span class="hex miss">⬢</span></span>';
  } else {
    outcomeIcons = '<span class="outcome-icons"><span class="hex miss">⬢</span><span class="hex miss">⬢</span></span>';
  }

  return `<span class="iv-inline iv-move ${outcome}${matchClass}">` +
    `<span class="iv-bracket">⌊</span>` +
    `<span class="iv-move-name">${escapeHtml(name)}</span>` +
    `<span class="iv-stat">(${escapeHtml(stat)})</span>` +
    `${outcomeIcons};` +
    `<span class="iv-score">${score}</span>` +
    `<span class="iv-vs">vs</span>` +
    `<span class="iv-challenge vs1">${vs1}</span>` +
    `<span class="iv-sep">|</span>` +
    `<span class="iv-challenge vs2">${vs2}</span>` +
    `${match ? '<span class="iv-match">match</span>' : ''}` +
    `</span>`;
}

function renderOracle(content: string): string {
  // Format: Name|roll|result|oracleRef
  const parts = content.split('|');
  const name = parts[0] || '';
  const roll = parts[1] || '';
  const result = parts[2] || '';

  return `<span class="iv-inline iv-oracle">` +
    `<span class="iv-bracket">⌊</span>` +
    `<span class="iv-oracle-icon">🔮</span>` +
    `<span class="iv-oracle-name">${escapeHtml(name)}</span>` +
    `<span class="iv-roll">(${roll})</span>` +
    `<span class="iv-result">"${escapeHtml(result)}"</span>` +
    `</span>`;
}

function renderMeter(content: string): string {
  // Format: Name|from|to
  const parts = content.split('|');
  const name = parts[0] || '';
  const from = parseInt(parts[1]) || 0;
  const to = parseInt(parts[2]) || 0;
  const delta = to - from;
  const deltaClass = delta > 0 ? 'positive' : delta < 0 ? 'negative' : '';

  return `<span class="iv-inline iv-meter ${deltaClass}">` +
    `<span class="iv-bracket">⌊</span>` +
    `<span class="iv-meter-name">${escapeHtml(name)}</span>` +
    `<span class="iv-from">${from}</span>` +
    `<span class="iv-arrow">→</span>` +
    `<span class="iv-to">${to}</span>` +
    `</span>`;
}

function renderInitiative(content: string): string {
  // Format: Label|from|to
  const parts = content.split('|');
  const label = parts[0] || '';
  const to = parts[2] || parts[1] || '';
  const inControl = to.toLowerCase().includes('control');

  return `<span class="iv-inline iv-initiative ${inControl ? 'in-control' : 'bad-spot'}">` +
    `<span class="iv-bracket">⌊</span>` +
    `<span class="iv-init-label">${escapeHtml(label)}:</span>` +
    `<span class="iv-init-state">${escapeHtml(to)}</span>` +
    `</span>`;
}

function renderTrackCreate(content: string, baseUrl: string): string {
  // Format: Name|path
  const parts = content.split('|');
  const name = parts[0] || '';
  const path = parts[1] || '';
  const slug = pathToSlug(path);

  return `<span class="iv-inline iv-track-create">` +
    `<span class="iv-bracket">⌊</span>` +
    `<span class="iv-track-icon">☐</span>` +
    `<a href="${baseUrl}/${slug}" class="iv-track-link">${escapeHtml(name)}</a>` +
    `<span class="iv-status">added</span>` +
    `</span>`;
}

function renderTrackAdvance(content: string, baseUrl: string): string {
  // Format: Name|path|from|to|rank|steps
  const parts = content.split('|');
  const name = parts[0] || '';
  const path = parts[1] || '';
  const from = parseInt(parts[2]) || 0;
  const to = parseInt(parts[3]) || 0;
  const steps = parseInt(parts[5]) || 1;
  const slug = pathToSlug(path);
  const boxes = Math.floor(to / 4);

  return `<span class="iv-inline iv-track-advance">` +
    `<span class="iv-bracket">⌊</span>` +
    `<span class="iv-track-icon">⏩</span>` +
    `<a href="${baseUrl}/${slug}" class="iv-track-link">${escapeHtml(name)}</a>` +
    `<span class="iv-steps">+${steps}</span>` +
    `<span class="iv-progress">(${boxes}/10)</span>` +
    `</span>`;
}

function renderProgressRoll(content: string, baseUrl: string): string {
  // Format: Name|progress|vs1|vs2|path
  const parts = content.split('|');
  const name = parts[0] || '';
  const progress = parseInt(parts[1]) || 0;
  const vs1 = parseInt(parts[2]) || 0;
  const vs2 = parseInt(parts[3]) || 0;
  const path = parts[4] || '';
  
  const outcome = getOutcome(progress, vs1, vs2);
  const match = isMatch(vs1, vs2);
  const slug = pathToSlug(path);

  return `<span class="iv-inline iv-progress-roll ${outcome}${match ? ' match' : ''}">` +
    `<span class="iv-bracket">⌊</span>` +
    `<span class="iv-track-icon">⏩</span>` +
    `<a href="${baseUrl}/${slug}" class="iv-track-link">${escapeHtml(name)}</a>` +
    `<span class="iv-score">${progress}</span>` +
    `<span class="iv-vs">vs</span>` +
    `<span class="iv-challenge vs1">${vs1}</span>` +
    `<span class="iv-sep">|</span>` +
    `<span class="iv-challenge vs2">${vs2}</span>` +
    `</span>`;
}

function renderNoRoll(content: string): string {
  // Format: Name|moveRef
  const parts = content.split('|');
  const name = parts[0] || '';

  return `<span class="iv-inline iv-noroll">` +
    `<span class="iv-bracket">⌊</span>` +
    `<span class="iv-move-name">${escapeHtml(name)}</span>` +
    `</span>`;
}

function renderEntityCreate(content: string, baseUrl: string): string {
  // Format: Type|Name|path
  const parts = content.split('|');
  const type = parts[0] || '';
  const name = parts[1] || '';
  const path = parts[2] || '';
  const slug = pathToSlug(path);

  return `<span class="iv-inline iv-entity-create">` +
    `<span class="iv-bracket">⌊</span>` +
    `<span class="iv-entity-type">${escapeHtml(type)}:</span>` +
    `<a href="${baseUrl}/${slug}" class="iv-entity-link">${escapeHtml(name)}</a>` +
    `</span>`;
}

export function pathToSlug(path: string): string {
  if (!path) return '#';
  // Convert Obsidian path to site URL
  return '/' + path
    .replace(/\.md$/, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[()]/g, '')
    .replace(/'/g, '');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

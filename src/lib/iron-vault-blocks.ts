/**
 * Iron Vault Code Block Parser
 * Parses ```iron-vault-mechanics blocks and generates HTML
 */

export function parseIronVaultBlock(content: string, baseUrl: string = ''): string {
  const lines = content.trim().split('\n');
  const results: string[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    if (line.startsWith('move ')) {
      // Collect all lines until closing brace (move blocks can span multiple lines)
      const moveLines = [line];
      let braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      while (braceCount > 0 && i + 1 < lines.length) {
        i++;
        moveLines.push(lines[i]);
        braceCount += (lines[i].match(/{/g) || []).length - (lines[i].match(/}/g) || []).length;
      }
      results.push(parseMoveBlock(moveLines.join(' ')));
    } else if (line.startsWith('oracle-group ')) {
      // Collect all lines until closing brace
      const groupLines = [line];
      let braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      while (braceCount > 0 && i + 1 < lines.length) {
        i++;
        groupLines.push(lines[i]);
        braceCount += (lines[i].match(/{/g) || []).length - (lines[i].match(/}/g) || []).length;
      }
      results.push(parseOracleGroupBlock(groupLines.join('\n')));
    } else if (line.startsWith('oracle ')) {
      results.push(parseOracleBlock(line));
    } else if (line.startsWith('track ')) {
      results.push(parseTrackBlock(line, baseUrl));
    }
    
    i++;
  }
  
  return `<div class="iron-vault-mechanics">${results.join('')}</div>`;
}

function parseMoveBlock(line: string): string {
  // move "[Name](datasworn:...)" { roll "Stat" action=X adds=X stat=X vs1=X vs2=X }
  const nameMatch = line.match(/move\s+"([^"]+)"/);
  const rollMatch = line.match(/roll\s+"([^"]+)"\s+action=(\d+)\s+adds=(\d+)\s+stat=(\d+)\s+vs1=(\d+)\s+vs2=(\d+)/);
  
  if (!nameMatch || !rollMatch) return `<div class="iv-parse-error">Could not parse move: ${escapeHtml(line)}</div>`;
  
  // Extract just the name from the markdown link
  const fullName = nameMatch[1];
  const name = fullName.replace(/\[([^\]]+)\]\([^)]+\)/, '$1');
  
  const stat = rollMatch[1];
  const action = parseInt(rollMatch[2]);
  const adds = parseInt(rollMatch[3]);
  const statValue = parseInt(rollMatch[4]);
  const vs1 = parseInt(rollMatch[5]);
  const vs2 = parseInt(rollMatch[6]);
  
  const score = action + statValue + adds;
  const outcome = getOutcome(score, vs1, vs2);
  const match = vs1 === vs2;

  // Note: CSS handles icons via ::before pseudo-elements, so we don't add them here
  return `<details class="move ${outcome}${match ? ' match' : ''}" open>
    <summary><span class="move-name">${escapeHtml(name)}</span></summary>
    <dl class="roll ${outcome}${match ? ' match' : ''}">
      <dt>Roll</dt>
      <dd class="action-die">${action}</dd>
      <dd class="stat">${statValue}</dd>
      <dd class="stat-name">${escapeHtml(stat)}</dd>
      <dd class="adds">${adds}</dd>
      <dd class="score">${score}</dd>
      <dd class="challenge-die vs1">${vs1}</dd>
      <dd class="challenge-die vs2">${vs2}</dd>
    </dl>
  </details>`;
}

function parseOracleBlock(line: string): string {
  // oracle name="[Name](datasworn:...)" result="Result" roll=XX
  const nameMatch = line.match(/name="([^"]+)"/);
  const resultMatch = line.match(/result="([^"]+)"/);
  const rollMatch = line.match(/roll=(\d+)/);
  
  if (!nameMatch) return `<div class="iv-parse-error">Could not parse oracle: ${escapeHtml(line)}</div>`;
  
  // Extract just the name from the markdown link
  const fullName = nameMatch[1];
  const name = fullName.replace(/\[([^\]]+)\]\([^)]+\)/, '$1');
  const result = resultMatch ? resultMatch[1] : '';
  const roll = rollMatch ? rollMatch[1] : '';

  // Note: CSS handles icons via ::before pseudo-elements
  return `<dl class="oracle">
    <dt>Oracle</dt>
    <dd class="name">${escapeHtml(name)}</dd>
    <dd class="roll">${roll}</dd>
    <dd class="result">${escapeHtml(result)}</dd>
  </dl>`;
}

function parseOracleGroupBlock(content: string): string {
  // oracle-group name="Name" { ...oracles... }
  const nameMatch = content.match(/oracle-group\s+name="([^"]+)"/);
  const name = nameMatch ? nameMatch[1] : 'Oracle Group';
  
  // Extract individual oracles
  const oracleMatches = content.matchAll(/oracle\s+name="([^"]+)"\s+result="([^"]+)"\s+roll=(\d+)/g);
  const oracles: string[] = [];
  
  for (const match of oracleMatches) {
    const oracleName = match[1].replace(/\[([^\]]+)\]\([^)]+\)/, '$1');
    const result = match[2];
    const roll = match[3];
    
    // Note: CSS handles icons via ::before pseudo-elements
    oracles.push(`<dl class="oracle">
      <dt>Oracle</dt>
      <dd class="name">${escapeHtml(oracleName)}</dd>
      <dd class="roll">${roll}</dd>
      <dd class="result">${escapeHtml(result)}</dd>
    </dl>`);
  }

  return `<div class="oracle-group">
    <span class="group-name">${escapeHtml(name)}</span>
    <blockquote>${oracles.join('')}</blockquote>
  </div>`;
}

function parseTrackBlock(line: string, baseUrl: string): string {
  // track name="[[path|display]]" status="added"
  const nameMatch = line.match(/name="\[\[([^|]+)\|([^\]]+)\]\]"/);
  const statusMatch = line.match(/status="([^"]+)"/);
  
  const path = nameMatch ? nameMatch[1] : '';
  const displayName = nameMatch ? nameMatch[2] : '';
  const status = statusMatch ? statusMatch[1] : 'added';
  const slug = pathToSlug(path);

  return `<dl class="track-status">
    <dt>Track</dt>
    <dd class="track-name"><a href="${baseUrl}/${slug}">${escapeHtml(displayName)}</a></dd>
    <dd class="track-status" data-value="${status}">${status}</dd>
  </dl>`;
}

function getOutcome(score: number, vs1: number, vs2: number): 'strong-hit' | 'weak-hit' | 'miss' {
  if (score > vs1 && score > vs2) return 'strong-hit';
  if (score > vs1 || score > vs2) return 'weak-hit';
  return 'miss';
}

function pathToSlug(path: string): string {
  if (!path) return '#';
  return '/' + path
    .replace(/\.md$/, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[()]/g, '')
    .replace(/'/g, '');
}

function escapeHtml(text: string): string {
  return text
    // First unescape escaped forward slashes from Iron Vault syntax
    .replace(/\\\//g, '/')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

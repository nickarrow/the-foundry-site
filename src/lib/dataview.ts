/**
 * Simple Dataview Query Engine
 * Executes basic Dataview queries against frontmatter at build time
 */

export interface ContentFile {
  path: string;
  slug: string;
  title: string;
  frontmatter: Record<string, unknown>;
}

export interface DataviewQuery {
  type: 'TABLE' | 'LIST';
  withoutId: boolean;
  fields: string[];
  from: string[];
  where: WhereClause[];
  sort: SortClause | null;
}

interface WhereClause {
  field: string;
  operator: '=' | '!=' | 'contains';
  value: string;
}

interface SortClause {
  field: string;
  direction: 'ASC' | 'DESC';
}

export function parseDataviewQuery(query: string): DataviewQuery | null {
  const lines = query
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l);

  const result: DataviewQuery = {
    type: 'TABLE',
    withoutId: false,
    fields: [],
    from: [],
    where: [],
    sort: null,
  };

  for (const line of lines) {
    const upperLine = line.toUpperCase();

    if (upperLine.startsWith('TABLE WITHOUT ID')) {
      result.type = 'TABLE';
      result.withoutId = true;
      // Parse fields: TABLE WITHOUT ID file.link as "Name", field2 as "Label"
      const fieldsStr = line.substring('TABLE WITHOUT ID'.length).trim();
      result.fields = parseFields(fieldsStr);
    } else if (upperLine.startsWith('TABLE')) {
      result.type = 'TABLE';
      const fieldsStr = line.substring('TABLE'.length).trim();
      result.fields = parseFields(fieldsStr);
    } else if (upperLine.startsWith('LIST')) {
      result.type = 'LIST';
    } else if (upperLine.startsWith('FROM')) {
      // FROM #tag or FROM "folder"
      const fromStr = line.substring('FROM'.length).trim();
      result.from = [fromStr];
    } else if (upperLine.startsWith('WHERE')) {
      const whereClause = parseWhereClause(line.substring('WHERE'.length).trim());
      if (whereClause) result.where.push(whereClause);
    } else if (upperLine.startsWith('SORT')) {
      result.sort = parseSortClause(line.substring('SORT'.length).trim());
    }
  }

  return result;
}

function parseFields(fieldsStr: string): string[] {
  // Simple parsing: split by comma, handle "as" aliases
  if (!fieldsStr) return [];
  return fieldsStr
    .split(',')
    .map((f) => f.trim())
    .filter((f) => f);
}

function parseWhereClause(str: string): WhereClause | null {
  // Handle: field = value, field = [[Link]], field != value
  const eqMatch = str.match(/^(\S+)\s*=\s*(.+)$/);
  if (eqMatch) {
    return {
      field: eqMatch[1],
      operator: '=',
      value: eqMatch[2].replace(/^["'[]+|["'\]]+$/g, '').trim(),
    };
  }

  const neqMatch = str.match(/^(\S+)\s*!=\s*(.+)$/);
  if (neqMatch) {
    return {
      field: neqMatch[1],
      operator: '!=',
      value: neqMatch[2].replace(/^["'[]+|["'\]]+$/g, '').trim(),
    };
  }

  return null;
}

function parseSortClause(str: string): SortClause | null {
  const parts = str.split(/\s+/);
  if (parts.length === 0) return null;

  return {
    field: parts[0],
    direction: parts[1]?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
  };
}

export function executeDataviewQuery(query: DataviewQuery, files: ContentFile[]): ContentFile[] {
  let results = [...files];

  // Filter by FROM (tags or folder paths)
  for (const from of query.from) {
    if (from.startsWith('#')) {
      // Tag filter: FROM #incomplete
      const tag = from.substring(1);
      results = results.filter((f) => {
        const tags = f.frontmatter.tags || [];
        return Array.isArray(tags) ? tags.includes(tag) : tags === tag;
      });
    } else {
      // Folder path filter: FROM "folder/path" or FROM folder/path
      // Remove surrounding quotes if present
      const folderPath = from.replace(/^["']|["']$/g, '').toLowerCase();
      results = results.filter((f) => {
        // Normalize the file path for comparison (handle Windows backslashes)
        const normalizedPath = f.path.replace(/\\/g, '/').toLowerCase();
        // Check if the file is within the specified folder
        return normalizedPath.startsWith(folderPath + '/') || normalizedPath === folderPath;
      });
    }
  }

  // Filter by WHERE clauses
  for (const where of query.where) {
    results = results.filter((f) => {
      const value = getFieldValue(f, where.field);
      const compareValue = where.value;

      if (where.operator === '=') {
        return matchesValue(value, compareValue);
      } else if (where.operator === '!=') {
        return !matchesValue(value, compareValue);
      }
      return true;
    });
  }

  // Sort
  if (query.sort) {
    const sortField = query.sort.field;
    const direction = query.sort.direction === 'ASC' ? 1 : -1;

    results.sort((a, b) => {
      const aVal = getFieldValue(a, sortField);
      const bVal = getFieldValue(b, sortField);

      if (aVal < bVal) return -1 * direction;
      if (aVal > bVal) return 1 * direction;
      return 0;
    });
  }

  return results;
}

function getFieldValue(file: ContentFile, field: string): unknown {
  // Handle special fields
  if (field === 'file.link') return file.title;
  if (field === 'file.name') return file.title;
  if (field === 'file.mtime') return 0; // We don't track mtime

  // Handle frontmatter fields with potential wikilink values
  let value = file.frontmatter[field];

  // If it's a wikilink string like "[[Barille Black]]", extract the name
  if (typeof value === 'string' && value.startsWith('[[') && value.endsWith(']]')) {
    value = value.slice(2, -2);
  }

  return value;
}

function matchesValue(actual: unknown, expected: string): boolean {
  if (actual === undefined || actual === null) return false;

  // Handle wikilink in expected value
  const cleanExpected = expected.replace(/^\[\[|\]\]$/g, '');

  if (typeof actual === 'string') {
    const cleanActual = actual.replace(/^\[\[|\]\]$/g, '');
    return cleanActual.toLowerCase() === cleanExpected.toLowerCase();
  }

  if (Array.isArray(actual)) {
    return actual.some((v) => matchesValue(v, expected));
  }

  return String(actual) === cleanExpected;
}

export function renderDataviewResult(
  query: DataviewQuery,
  results: ContentFile[],
  baseUrl: string = ''
): string {
  // Wrap everything in block-language-dataview for Obsidian-style styling
  let content: string;

  if (results.length === 0) {
    // Match Obsidian's empty state styling
    content = `<div class="dataview-error-box">
<p class="dataview-error-message">Dataview: No results to show for ${query.type.toLowerCase()} query.</p>
</div>`;
  } else if (query.type === 'LIST') {
    content = renderList(results, baseUrl);
  } else {
    content = renderTable(query, results, baseUrl);
  }

  return `<div class="block-language-dataview">${content}</div>`;
}

function renderList(results: ContentFile[], baseUrl: string): string {
  const items = results
    .map(
      (f) =>
        `<li class="dataview-result-list-li"><a href="${baseUrl}/${f.slug}">${escapeHtml(f.title)}</a></li>`
    )
    .join('');

  return `<ul class="dataview-result-list-root-ul">${items}</ul>`;
}

function renderTable(query: DataviewQuery, results: ContentFile[], baseUrl: string): string {
  // Parse field labels
  const columns = query.fields.map((f) => {
    const asMatch = f.match(/(.+)\s+as\s+"([^"]+)"/i);
    if (asMatch) {
      return { field: asMatch[1].trim(), label: asMatch[2] };
    }
    return { field: f, label: f };
  });

  const headerCells = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('');
  const header = `<thead><tr>${headerCells}</tr></thead>`;

  const rows = results
    .map((file) => {
      const cells = columns
        .map((c) => {
          let value: string;

          if (c.field === 'file.link') {
            value = `<a href="${baseUrl}/${file.slug}">${escapeHtml(file.title)}</a>`;
          } else {
            const rawValue = file.frontmatter[c.field];
            value = formatValue(rawValue, file, baseUrl);
          }

          return `<td>${value}</td>`;
        })
        .join('');

      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `<table class="table-view-table">${header}<tbody>${rows}</tbody></table>`;
}

function formatValue(value: unknown, file: ContentFile, baseUrl: string): string {
  if (value === undefined || value === null) return '';

  // Handle wikilinks
  if (typeof value === 'string' && value.startsWith('[[') && value.endsWith(']]')) {
    const linkText = value.slice(2, -2);
    // For now, just display as text - could resolve to actual links later
    return escapeHtml(linkText);
  }

  if (Array.isArray(value)) {
    return value.map((v) => formatValue(v, file, baseUrl)).join(', ');
  }

  return escapeHtml(String(value));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

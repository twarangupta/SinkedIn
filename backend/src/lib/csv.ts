/**
 * Minimal, dependency-free CSV serializer for data exports.
 *
 * Two safety concerns it handles, both mandatory for a file a user will open in
 * Excel/Sheets:
 *  1. RFC-4180 quoting — any cell containing a comma, quote, or newline is
 *     wrapped in double quotes with inner quotes doubled.
 *  2. CSV formula injection — a spreadsheet treats a cell starting with `=`,
 *     `+`, `-`, `@`, or a tab/CR as a formula, which is a known exfiltration
 *     vector. We neutralize it by prefixing such a cell with a single quote so
 *     the sheet shows the literal text instead of evaluating it.
 */

/** Render one cell: stringify, neutralize formulas, then RFC-4180-quote. */
function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s = value instanceof Date ? value.toISOString() : String(value);

  // Formula-injection guard: a leading formula trigger becomes inert text.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;

  // Quote if the value contains a delimiter, quote, or newline.
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Build a CSV string from a header row and data rows. Each row is an array of
 * values aligned to `headers`. A UTF-8 BOM is prepended so Excel opens accented
 * company names / notes in the correct encoding.
 */
export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(cell).join(',')];
  for (const row of rows) lines.push(row.map(cell).join(','));
  // CRLF line endings + BOM = maximum spreadsheet compatibility.
  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Tests for the CSV serializer — the two things that matter for a file opened
 * in a spreadsheet: RFC-4180 quoting and formula-injection neutralization.
 */

import { describe, expect, it } from 'vitest';
import { toCsv } from './csv.js';

/** Strip the leading UTF-8 BOM so assertions read cleanly. */
const noBom = (s: string) => s.replace(/^\uFEFF/, '');

describe('toCsv', () => {
  it('joins headers and rows with CRLF and a BOM', () => {
    const csv = toCsv(['A', 'B'], [['1', '2']]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(noBom(csv)).toBe('A,B\r\n1,2');
  });

  it('quotes cells containing commas, quotes, or newlines', () => {
    const csv = noBom(toCsv(['X'], [['a,b'], ['he said "hi"'], ['line1\nline2']]));
    expect(csv).toBe('X\r\n"a,b"\r\n"he said ""hi"""\r\n"line1\nline2"');
  });

  it('neutralizes formula-injection triggers with a leading quote', () => {
    const csv = noBom(toCsv(['X'], [['=SUM(A1)'], ['+1'], ['-2'], ['@cmd']]));
    // Each dangerous cell is prefixed with ' so a sheet shows literal text.
    expect(csv).toBe("X\r\n'=SUM(A1)\r\n'+1\r\n'-2\r\n'@cmd");
  });

  it('renders null/undefined as empty cells and Dates as ISO', () => {
    const d = new Date('2026-08-26T00:00:00.000Z');
    const csv = noBom(toCsv(['A', 'B', 'C'], [[null, undefined, d]]));
    expect(csv).toBe('A,B,C\r\n,,2026-08-26T00:00:00.000Z');
  });
});

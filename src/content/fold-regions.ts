import { findIndentRanges, indentOf, type FoldRange } from '../core/indent-ranges.ts';
import { findTestBodies } from '../core/test-bodies.ts';
import type { DiffLine, DiffRow, Side } from '../github/diff-dom.ts';

export interface FoldRegion {
  /** Stable across re-renders: side plus the header's file line number. */
  key: string;
  header: DiffLine;
  headerRow: number;
  /** Last hidden row index, inclusive. */
  endRow: number;
  isTestBody: boolean;
}

interface SideLine {
  row: number;
  line: DiffLine;
}

/**
 * Blocks come from the new file; removed lines inside or trailing them fold along. A block made
 * only of removed lines folds from the old file instead.
 */
export function findFoldRegions(rows: readonly DiffRow[], detectTests: boolean): FoldRegion[] {
  return splitHunks(rows).flatMap((hunk) => [
    ...regionsForSide(rows, hunk, 'new', detectTests).map((region) =>
      withTrailingDeletions(rows, region),
    ),
    ...regionsForSide(rows, hunk, 'old', detectTests).filter((region) =>
      rows
        .slice(region.headerRow, region.endRow + 1)
        .every((row) => !row.old || row.old.kind === 'deletion'),
    ),
  ]);
}

/** Removed lines between the block's last new line and its closing line belong to the block. */
function withTrailingDeletions(rows: readonly DiffRow[], region: FoldRegion): FoldRegion {
  const headerIndent = indentOf(region.header.text) ?? 0;
  let endRow = region.endRow;

  for (let next = rows[endRow + 1]; next?.old && !next.new; next = rows[endRow + 1]) {
    const indent = indentOf(next.old.text);
    if (indent !== undefined && indent <= headerIndent) break;
    endRow += 1;
  }

  return { ...region, endRow };
}

function splitHunks(rows: readonly DiffRow[]): number[][] {
  const hunks: number[][] = [[]];

  for (const [index, row] of rows.entries()) {
    if (row.isHunk) hunks.push([]);
    else hunks.at(-1)?.push(index);
  }

  return hunks.filter((hunk) => hunk.length > 0);
}

function regionsForSide(
  rows: readonly DiffRow[],
  hunk: readonly number[],
  side: Side,
  detectTests: boolean,
): FoldRegion[] {
  const lines = hunk.flatMap((row): SideLine[] => {
    const line = rows[row]?.[side];
    return line ? [{ row, line }] : [];
  });
  const texts = lines.map(({ line }) => line.text);
  const ranges = findIndentRanges(texts);
  const testBodies = new Set<FoldRange>(detectTests ? findTestBodies(texts, ranges) : []);

  return ranges.flatMap((range) => {
    const header = lines[range.start];
    const last = lines[range.end];
    if (!header || !last) return [];

    return {
      key: `${side === 'new' ? 'R' : 'L'}${String(header.line.number)}`,
      header: header.line,
      headerRow: header.row,
      endRow: last.row,
      isTestBody: testBodies.has(range),
    };
  });
}

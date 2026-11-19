export interface FoldRange {
  /** Index of the line that stays visible when folded. */
  start: number;
  /** Index of the last hidden line, inclusive. */
  end: number;
}

const TAB_WIDTH = 4;

function indentOf(line: string): number | undefined {
  let width = 0;

  for (const char of line) {
    if (char === ' ') width += 1;
    else if (char === '\t') width += TAB_WIDTH - (width % TAB_WIDTH);
    else return width;
  }

  return undefined;
}

/**
 * A range starts at a line followed by more-indented lines and ends at the last of them.
 * Blank lines never end a range, and trailing blank lines are excluded.
 */
export function findIndentRanges(lines: readonly string[]): FoldRange[] {
  const indents = lines.map(indentOf);
  const ranges: FoldRange[] = [];

  for (let start = 0; start < lines.length; start++) {
    const base = indents[start];
    if (base === undefined) continue;

    let end = start;
    for (let i = start + 1; i < lines.length; i++) {
      const indent = indents[i];
      if (indent === undefined) continue;
      if (indent <= base) break;
      end = i;
    }

    if (end > start) ranges.push({ start, end });
  }

  return ranges;
}

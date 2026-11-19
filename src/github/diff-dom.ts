export type Side = 'old' | 'new';
export type LineKind = 'context' | 'addition' | 'deletion';

export interface DiffLine {
  number: number;
  text: string;
  kind: LineKind;
  /** Cell that hosts the fold toggle for this line. */
  gutter: HTMLElement;
  /** Element whose end hosts the folded pill. */
  content: HTMLElement;
}

export interface DiffRow {
  element: HTMLTableRowElement;
  isHunk: boolean;
  old?: DiffLine;
  new?: DiffLine;
}

export interface DiffFile {
  path: string;
  table: HTMLTableElement;
  /** Container for per-file header buttons, if the header is rendered. */
  actions: HTMLElement | null;
}

const FILE_REGION = '[role="region"][aria-labelledby^="heading-"]';
const FILE_PATH = 'h3[class*="file-name"] a code';
const HEADER_ACTIONS = '[class*="diff-file-header"] > .flex-justify-end';
const DIFF_TABLE = 'table';
const DIFF_ROW = 'tr.diff-line-row';
const HUNK_CELL = 'td.diff-hunk-cell';
const LINE_CONTENT = '.diff-text-inner';
const LINE_CODE = 'code.diff-text';
const DIFF_PAGE = /^\/[^/]+\/[^/]+\/(?:pull\/\d+\/changes|commit\/[0-9a-f]{7,40})(?:\/|$)/;
const DIRECTION_MARKS = /[‎‏]/g;

export function isDiffPage(pathname: string): boolean {
  return DIFF_PAGE.test(pathname);
}

export function findDiffFiles(root: ParentNode): DiffFile[] {
  const files: DiffFile[] = [];

  for (const region of root.querySelectorAll<HTMLElement>(FILE_REGION)) {
    const table = region.querySelector<HTMLTableElement>(DIFF_TABLE);
    const path = readPath(region);
    if (!table || !path) continue;

    files.push({ path, table, actions: region.querySelector<HTMLElement>(HEADER_ACTIONS) });
  }

  return files;
}

export function findFilePath(element: Element): string | undefined {
  const region = element.closest(FILE_REGION);
  return region ? readPath(region) : undefined;
}

const rowCache = new WeakMap<HTMLTableElement, DiffRow[]>();

/** Returns the same array until React replaces a row or a cell the rows point at. */
export function readRows(table: HTMLTableElement): DiffRow[] {
  const elements = [...table.querySelectorAll<HTMLTableRowElement>(DIFF_ROW)];
  const cached = rowCache.get(table);
  if (cached && isCurrent(cached, elements)) return cached;

  const rows = elements.map(readRow);
  rowCache.set(table, rows);
  return rows;
}

function isCurrent(rows: readonly DiffRow[], elements: readonly HTMLTableRowElement[]): boolean {
  return (
    rows.length === elements.length &&
    rows.every(
      (row, index) =>
        row.element === elements[index] &&
        [row.old, row.new].every(
          (line) => !line || (line.content.isConnected && line.gutter.isConnected),
        ),
    )
  );
}

function readRow(element: HTMLTableRowElement): DiffRow {
  if (element.querySelector(HUNK_CELL)) return { element, isHunk: true };

  return { element, isHunk: false, ...readSides(element.cells) };
}

function readPath(region: Element): string | undefined {
  return region.querySelector(FILE_PATH)?.textContent.replace(DIRECTION_MARKS, '').trim();
}

/**
 * Split rows: old number, old text, new number, new text (an absent side has empty cells).
 * Unified rows: old number, new number, shared text; toggles for both sides go in the new number cell.
 */
function readSides(cells: HTMLCollectionOf<HTMLTableCellElement>): Pick<DiffRow, 'old' | 'new'> {
  const [first, second, third, fourth] = cells;
  if (!first || !second || !third) return {};

  if (fourth) {
    return { old: readLine(first, first, second), new: readLine(third, third, fourth) };
  }

  const kind = readKind(third);
  return {
    old: kind === 'addition' ? undefined : readLine(first, second, third),
    new: kind === 'deletion' ? undefined : readLine(second, second, third),
  };
}

function readLine(
  numberCell: HTMLElement,
  gutter: HTMLElement,
  textCell: HTMLElement,
): DiffLine | undefined {
  // PR pages keep the number in an attribute; commit pages render it in a <code> child.
  const numberText =
    numberCell.dataset.lineNumber ?? numberCell.querySelector('code')?.textContent.trim();
  const content = textCell.querySelector<HTMLElement>(LINE_CONTENT);
  if (!numberText || !content) return undefined;

  return {
    number: Number(numberText),
    text: content.textContent,
    kind: readKind(textCell),
    gutter,
    content,
  };
}

function readKind(textCell: HTMLElement): LineKind {
  const classes = textCell.querySelector(LINE_CODE)?.classList;
  if (classes?.contains('addition')) return 'addition';
  if (classes?.contains('deletion')) return 'deletion';
  return 'context';
}

export type Side = 'old' | 'new';

export interface DiffLine {
  number: number;
  text: string;
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

export function readRows(table: HTMLTableElement): DiffRow[] {
  const rows: DiffRow[] = [];

  for (const element of table.querySelectorAll<HTMLTableRowElement>(DIFF_ROW)) {
    if (element.querySelector(HUNK_CELL)) {
      rows.push({ element, isHunk: true });
      continue;
    }

    rows.push({ element, isHunk: false, ...readSides(element.cells) });
  }

  return rows;
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

  return { old: readLine(first, second, third), new: readLine(second, second, third) };
}

function readLine(
  numberCell: HTMLElement,
  gutter: HTMLElement,
  textCell: HTMLElement,
): DiffLine | undefined {
  const numberText = numberCell.querySelector('code')?.textContent.trim();
  const content = textCell.querySelector<HTMLElement>(LINE_CONTENT);
  if (!numberText || !content) return undefined;

  return { number: Number(numberText), text: content.textContent, gutter, content };
}

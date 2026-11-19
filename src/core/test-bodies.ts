import type { FoldRange } from './indent-ranges.ts';

const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$/;
const TEST_CALL = /^\s*(?:it|test|beforeEach|afterEach|beforeAll|afterAll)(?:\.\w+)*\s*[(`]/;
const BODY_OPEN = /(?:=>|\bfunction\b[^{]*\))\s*\{\s*(?:\/\/.*)?$/;
const CLOSING_LINE = /^\s*[)\]}]/;

export function isTestFile(path: string): boolean {
  return TEST_FILE.test(path);
}

/** Picks the ranges that are `it`/`test`/hook bodies, starting at the line where the body opens. */
export function findTestBodies(
  lines: readonly string[],
  ranges: readonly FoldRange[],
): FoldRange[] {
  const rangesByStart = new Map(ranges.map((range) => [range.start, range]));
  const bodies: FoldRange[] = [];

  for (const [index, line] of lines.entries()) {
    if (!TEST_CALL.test(line)) continue;

    const body = findBody(lines, index, rangesByStart);
    if (body) bodies.push(body);
  }

  return bodies;
}

/**
 * Scans the call's header (multi-line names, `.each` tables) for the line that opens the callback.
 * Lines after the call's own range are only followed while they continue it, e.g. `])('name', () => {`.
 */
function findBody(
  lines: readonly string[],
  callIndex: number,
  rangesByStart: ReadonlyMap<number, FoldRange>,
): FoldRange | undefined {
  let headerEnd = callIndex;

  for (let i = callIndex; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (i > headerEnd && !CLOSING_LINE.test(line)) return undefined;
    if (BODY_OPEN.test(line)) return rangesByStart.get(i);

    headerEnd = Math.max(headerEnd, rangesByStart.get(i)?.end ?? i);
  }

  return undefined;
}

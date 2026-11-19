import type { DiffFile, DiffRow } from '../github/diff-dom.ts';
import type { FoldRegion } from './fold-regions.ts';

export type FoldAction = 'toggle' | 'fold-all' | 'unfold-all';

const ACTION_ATTR = 'data-origami-action';
const KEY_ATTR = 'data-origami-key';
const HIDDEN_ATTR = 'data-origami-hidden';
const ACTIONS_CLASS = 'origami-actions';

export function findAction(
  target: EventTarget | null,
): { action: FoldAction; element: HTMLElement } | undefined {
  if (!(target instanceof Element)) return undefined;

  const element = target.closest<HTMLElement>(`[${ACTION_ATTR}]`);
  const action = element?.getAttribute(ACTION_ATTR);
  if (!element || (action !== 'toggle' && action !== 'fold-all' && action !== 'unfold-all')) {
    return undefined;
  }

  return { action, element };
}

export function readKey(element: HTMLElement): string | undefined {
  return element.getAttribute(KEY_ATTR) ?? undefined;
}

/** Idempotently syncs the file's DOM to the fold state, reusing injected nodes React left alone. */
export function renderFile(
  file: DiffFile,
  rows: readonly DiffRow[],
  regions: readonly FoldRegion[],
  isFolded: (key: string) => boolean,
): void {
  const folded = regions.filter((region) => isFolded(region.key));
  const hidden = new Set<number>();
  for (const region of folded) {
    for (let row = region.headerRow + 1; row <= region.endRow; row++) hidden.add(row);
  }

  for (const [index, row] of rows.entries()) {
    row.element.toggleAttribute(HIDDEN_ATTR, hidden.has(index));
  }

  syncControls(
    file.table,
    'origami-toggle',
    regions,
    (region) => region.header.gutter,
    (toggle, region) => {
      toggle.ariaLabel ??= 'Toggle fold';
      toggle.ariaExpanded = String(!isFolded(region.key));
    },
  );

  syncControls(
    file.table,
    'origami-pill',
    folded,
    (region) => region.header.content,
    (pill, region) => {
      const count = region.endRow - region.headerRow;
      const label = `⋯ ${String(count)} ${count === 1 ? 'line' : 'lines'}`;
      if (pill.dataset.label === label) return;
      pill.dataset.label = label;
      pill.ariaLabel = `Unfold ${label.slice(2)}`;
    },
  );

  syncActions(file.actions, regions.length > 0);
}

function syncControls(
  table: HTMLTableElement,
  className: string,
  regions: readonly FoldRegion[],
  hostOf: (region: FoldRegion) => HTMLElement,
  update: (control: HTMLElement, region: FoldRegion) => void,
): void {
  const stale = new Map<string, HTMLElement>();
  for (const control of table.querySelectorAll<HTMLElement>(`.${className}`)) {
    stale.set(control.getAttribute(KEY_ATTR) ?? '', control);
  }

  for (const region of regions) {
    const host = hostOf(region);
    let control = stale.get(region.key);
    stale.delete(region.key);

    if (control?.parentElement !== host) {
      control?.remove();
      control = createButton(className, 'toggle');
      control.setAttribute(KEY_ATTR, region.key);
      host.append(control);
    }

    update(control, region);
  }

  for (const control of stale.values()) control.remove();
}

function syncActions(container: HTMLElement | null, hasRegions: boolean): void {
  if (!container) return;

  const existing = container.querySelector(`:scope > .${ACTIONS_CLASS}`);
  if (!hasRegions) {
    existing?.remove();
    return;
  }
  if (existing) return;

  const actions = document.createElement('div');
  actions.className = ACTIONS_CLASS;
  actions.append(
    createButton('origami-action', 'fold-all', 'Fold all'),
    createButton('origami-action', 'unfold-all', 'Unfold all'),
  );
  container.prepend(actions);
}

function createButton(className: string, action: FoldAction, text?: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.tabIndex = -1;
  button.setAttribute(ACTION_ATTR, action);
  if (text) button.textContent = text;
  return button;
}

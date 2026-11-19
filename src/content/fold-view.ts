import type { DiffFile, DiffRow } from '../github/diff-dom.ts';
import type { FoldRegion } from './fold-regions.ts';

const FOLD_ACTIONS = ['toggle', 'fold-all', 'unfold-all'] as const;
export type FoldAction = (typeof FOLD_ACTIONS)[number];

const ACTION_ATTR = 'data-origami-action';
const KEY_ATTR = 'data-origami-key';
const HIDDEN_ATTR = 'data-origami-hidden';
const ACTIONS_CLASS = 'origami-actions';
const ACTION_CLASS = 'origami-action';
const TOGGLE_CLASS = 'origami-toggle';
const PILL_CLASS = 'origami-pill';

export function findAction(
  target: EventTarget | null,
): { action: FoldAction; element: HTMLElement } | undefined {
  if (!(target instanceof Element)) return undefined;

  const element = target.closest<HTMLElement>(`[${ACTION_ATTR}]`);
  const name = element?.getAttribute(ACTION_ATTR);
  const action = FOLD_ACTIONS.find((candidate) => candidate === name);

  return element && action ? { action, element } : undefined;
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
    TOGGLE_CLASS,
    regions,
    (region) => region.header.gutter,
    (toggle, region) => {
      toggle.ariaLabel ??= 'Toggle fold';
      toggle.ariaExpanded = String(!isFolded(region.key));
    },
  );

  syncControls(
    file.table,
    PILL_CLASS,
    folded,
    (region) => region.header.content,
    (pill, region) => {
      const count = region.endRow - region.headerRow;
      const lines = `${String(count)} ${count === 1 ? 'line' : 'lines'}`;
      pill.dataset.label = `⋯ ${lines}`;
      pill.ariaLabel = `Unfold ${lines}`;
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
    createButton(ACTION_CLASS, 'fold-all', 'Fold all'),
    createButton(ACTION_CLASS, 'unfold-all', 'Unfold all'),
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

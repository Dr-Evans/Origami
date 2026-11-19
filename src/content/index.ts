import { isTestFile } from '../core/test-bodies.ts';
import {
  findDiffFiles,
  findFilePath,
  isDiffPage,
  readRows,
  type DiffRow,
} from '../github/diff-dom.ts';
import { loadSettings, onSettingsChange, type Settings } from '../settings.ts';
import { findFoldRegions, type FoldRegion } from './fold-regions.ts';
import { FoldStore } from './fold-store.ts';
import { findAction, readKey, renderFile } from './fold-view.ts';

const SOFT_NAV_DONE = 'soft-nav:react-done';

const store = new FoldStore();
const regionsByRows = new WeakMap<readonly DiffRow[], FoldRegion[]>();
const regionKeysByPath = new Map<string, string[]>();
let settings: Settings | undefined;
let pagePath = location.pathname;
let renderQueued = false;

const observer = new MutationObserver(queueRender);

function queueRender(): void {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function render(): void {
  if (location.pathname !== pagePath) {
    pagePath = location.pathname;
    store.clear();
    regionKeysByPath.clear();
  }
  if (!settings || !isDiffPage(pagePath)) return;

  for (const file of findDiffFiles(document)) {
    const rows = readRows(file.table);
    const regions = regionsFor(rows, isTestFile(file.path));
    regionKeysByPath.set(
      file.path,
      regions.map((region) => region.key),
    );

    if (settings.autoFoldTests) {
      store.autoFold(
        file.path,
        regions.filter((region) => region.isTestBody).map((region) => region.key),
      );
    }

    renderFile(file, rows, regions, (key) => store.isFolded(file.path, key));
  }

  observer.takeRecords();
}

function regionsFor(rows: readonly DiffRow[], detectTests: boolean): FoldRegion[] {
  let regions = regionsByRows.get(rows);
  if (!regions) {
    regions = findFoldRegions(rows, detectTests);
    regionsByRows.set(rows, regions);
  }
  return regions;
}

function handleClick(event: MouseEvent): void {
  const found = findAction(event.target);
  if (!found) return;

  event.preventDefault();
  event.stopPropagation();

  const path = findFilePath(found.element);
  if (!path) return;

  if (found.action === 'toggle') {
    const key = readKey(found.element);
    if (key) store.toggle(path, key);
  } else {
    store.setFolded(path, regionKeysByPath.get(path) ?? [], found.action === 'fold-all');
  }

  render();
}

/** Keeps GitHub's line selection and grid focus from reacting to presses on Origami controls. */
function swallowPress(event: Event): void {
  if (findAction(event.target)) event.stopPropagation();
}

function applySettings(next: Settings): void {
  if (settings?.autoFoldTests && !next.autoFoldTests) store.releaseAutoFolds();
  settings = next;
  queueRender();
}

document.addEventListener('click', handleClick, true);
document.addEventListener('mousedown', swallowPress, true);
document.addEventListener('pointerdown', swallowPress, true);
document.addEventListener(SOFT_NAV_DONE, queueRender);
observer.observe(document.body, { childList: true, subtree: true });
onSettingsChange(applySettings);
void loadSettings().then(applySettings);

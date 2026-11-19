interface FileFolds {
  folded: Set<string>;
  /** Folded by test auto-fold and not touched since. */
  autoFolded: Set<string>;
  /** Folded or unfolded by the user; auto-fold leaves these alone. */
  touched: Set<string>;
}

/** In-memory fold state per file path, keyed by fold region key. */
export class FoldStore {
  #files = new Map<string, FileFolds>();

  isFolded(path: string, key: string): boolean {
    return this.#files.get(path)?.folded.has(key) ?? false;
  }

  toggle(path: string, key: string): void {
    this.setFolded(path, [key], !this.isFolded(path, key));
  }

  setFolded(path: string, keys: Iterable<string>, folded: boolean): void {
    const file = this.#file(path);

    for (const key of keys) {
      file.touched.add(key);
      file.autoFolded.delete(key);
      if (folded) file.folded.add(key);
      else file.folded.delete(key);
    }
  }

  autoFold(path: string, keys: Iterable<string>): void {
    const file = this.#file(path);

    for (const key of keys) {
      if (file.touched.has(key) || file.folded.has(key)) continue;
      file.folded.add(key);
      file.autoFolded.add(key);
    }
  }

  releaseAutoFolds(): void {
    for (const file of this.#files.values()) {
      for (const key of file.autoFolded) file.folded.delete(key);
      file.autoFolded.clear();
    }
  }

  clear(): void {
    this.#files.clear();
  }

  #file(path: string): FileFolds {
    let file = this.#files.get(path);
    if (!file) {
      file = { folded: new Set(), autoFolded: new Set(), touched: new Set() };
      this.#files.set(path, file);
    }
    return file;
  }
}

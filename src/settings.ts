export type Settings = {
  autoFoldTests: boolean;
};

const DEFAULT_SETTINGS: Settings = { autoFoldTests: true };

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  const { autoFoldTests } = stored;

  return {
    autoFoldTests:
      typeof autoFoldTests === 'boolean' ? autoFoldTests : DEFAULT_SETTINGS.autoFoldTests,
  };
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  await chrome.storage.sync.set(settings);
}

export function onSettingsChange(listener: (settings: Settings) => void): void {
  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === 'sync') void loadSettings().then(listener);
  });
}

import { useState } from 'react';

import { saveSettings, type Settings } from '../settings.ts';

export function Popup({ initialSettings }: { initialSettings: Settings }) {
  const [settings, setSettings] = useState(initialSettings);

  function update(patch: Partial<Settings>): void {
    setSettings((current) => ({ ...current, ...patch }));
    void saveSettings(patch);
  }

  return (
    <>
      <h1>Origami</h1>
      <label>
        <input
          type="checkbox"
          checked={settings.autoFoldTests}
          onChange={(event) => {
            update({ autoFoldTests: event.target.checked });
          }}
        />
        Auto-fold test bodies
      </label>
      <p>
        Folds <code>it</code>, <code>test</code> and setup hook bodies in test files.
      </p>
    </>
  );
}

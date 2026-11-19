import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { loadSettings } from '../settings.ts';
import { Popup } from './popup.tsx';

const root = document.getElementById('root');

if (root) {
  const settings = await loadSettings();
  createRoot(root).render(
    <StrictMode>
      <Popup initialSettings={settings} />
    </StrictMode>,
  );
}

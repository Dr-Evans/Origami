import { defineManifest } from '@crxjs/vite-plugin';

import pkg from './package.json' with { type: 'json' };

const icons = {
  16: 'icons/icon-16.png',
  48: 'icons/icon-48.png',
  128: 'icons/icon-128.png',
};

export default defineManifest({
  manifest_version: 3,
  name: 'Origami',
  description: pkg.description,
  version: pkg.version,
  icons,
  action: {
    default_title: 'Origami',
    default_popup: 'src/popup/index.html',
    default_icon: icons,
  },
  permissions: ['storage'],
  content_scripts: [
    {
      matches: ['https://github.com/*'],
      js: ['src/content/index.ts'],
      css: ['src/content/origami.css'],
      run_at: 'document_idle',
    },
  ],
});

import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  name: 'Site Siege',
  description: 'Turn any website into a game level.',
  version: pkg.version,
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'Site Siege',
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*'],
      js: ['src/content/main.ts'],
      run_at: 'document_idle',
    },
  ],
  permissions: ['storage', 'activeTab', 'scripting'],
});

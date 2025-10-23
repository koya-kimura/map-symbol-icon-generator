/// <reference types="node" />

import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const resolvePath = (relativePath: string) => fileURLToPath(new URL(relativePath, import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolvePath('./index.html'),
        guide: resolvePath('./guide.html'),
      },
    },
  },
});


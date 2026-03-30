import { defineConfig } from 'tsup';
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  dts: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
  onSuccess: async () => {
    const charDir = 'dist/builtin/generated';
    mkdirSync(charDir, { recursive: true });
    copyFileSync(
      join('src/characters/builtin/generated/cat.json'),
      join(charDir, 'cat.json')
    );

    const themeDestDir = 'dist/themes/builtin';
    mkdirSync(themeDestDir, { recursive: true });
    const themeSrcDir = 'src/themes/builtin';
    for (const f of readdirSync(themeSrcDir).filter(f => f.endsWith('.json'))) {
      copyFileSync(join(themeSrcDir, f), join(themeDestDir, f));
    }
  },
});

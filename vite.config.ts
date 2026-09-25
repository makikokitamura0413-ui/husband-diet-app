import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/** public/ からそのままコピーされ、オフライン起動に必要なファイル */
const PUBLIC_PRECACHE = [
  'manifest.webmanifest',
  'icon.svg',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

/**
 * sw/service-worker.js を元に、ビルドしたファイルの一覧を埋め込んだ sw.js を出力する。
 * Service Worker は本体ファイルのキャッシュだけを扱い、記録データには触れない。
 */
function serviceWorker(): Plugin {
  return {
    name: 'emit-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const built = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      const files = ['./', ...[...new Set([...built, 'index.html', ...PUBLIC_PRECACHE])].sort().map((f) => './' + f)];
      const buildId = createHash('sha256').update(pkg.version + files.join('|')).digest('hex').slice(0, 12);
      const source = readFileSync(new URL('./sw/service-worker.js', import.meta.url), 'utf8')
        .replace("const BUILD_ID = '__BUILD_ID__';", `const BUILD_ID = ${JSON.stringify(buildId)};`)
        .replace('const PRECACHE = __PRECACHE__;', `const PRECACHE = ${JSON.stringify(files, null, 2)};`);
      if (source.includes('__BUILD_ID__') || source.includes('__PRECACHE__')) {
        this.error('sw.js の生成に失敗しました（置き換え漏れ）');
      }
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

// base './' にしておくと GitHub Pages などのサブパスでもそのまま動く
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [react(), serviceWorker()],
});

import {defineConfig} from 'vite';
import {ViteImageOptimizer} from 'vite-plugin-image-optimizer';
import autoprefixer from 'autoprefixer';
import componentPrefixPlugin from "genkgo-dtk/src/component-prefix-plugin.js";
import { viteStaticCopy } from 'vite-plugin-static-copy'

const devServerLocation = process.env.G2SERVER || '/srv/genkgo';

export default defineConfig({
  plugins: [
    ViteImageOptimizer(),
    componentPrefixPlugin(),
    viteStaticCopy({
      targets: '{copy}',
    }),
  ],
  appType: 'custom',
  root: '{root}/app/assets',
  project: '{root}',
  base: '{base}',
  publicDir: 'app/assets',
  css: {
    postcss: {
      plugins: [autoprefixer]
    }
  },
  optimizeDeps: {
    include: ['{root}/app/assets/js/**/*.js'],

    // https://github.com/vitejs/vite/issues/8427
    // https://github.com/vitejs/vite/pull/16418
    // https://github.com/vitejs/vite/pull/17837
    exclude: ['@g2ui/generic-elements'],
  },
  resolve: {
    alias: {
      moment: '{root}/node_modules/moment/moment.js',
      modernizr: '{dtk}/../dep/modernizr.js',
      'jquery-ui': '{dtk}/../dep/jquery-ui',
    }
  },
  assetsInclude: ['**/*.xml'],
  build: {
    assetsInlineLimit: 0,
    manifest: true,
    rollupOptions: {
      preserveEntrySignatures: "strict",
      external: '{external}',
      output: {
        preserveModules: JSON.parse('{preserveModules}'),
        assetFileNames: (asset) => {
          const originalFileName = asset.originalFileName;
          if (originalFileName && originalFileName.startsWith('img/')) {
            return originalFileName;
          }

          switch (asset.name.split('.').pop()) {
            case 'css':
              return 'css/[name]-[hash][extname]';
            case 'gif':
            case 'png':
            case 'jpg':
            case 'ico':
            case 'svg':
              return 'img/[name][extname]';
            case 'ttf':
            case 'otf':
            case 'woff':
            case 'woff2':
              return 'fonts/[name]-[hash][extname]';
            default:
              return 'other/[name]-[hash][extname]';
          }
        },
      },
      input: {/** {INPUT} **/},
    },
    outDir: '{outputDir}',
    assetsDir: '.',
  },
  server: {
    host: '0.0.0.0',
    https: {
      cert: `${devServerLocation}/ssl/crt/genkgo.test/genkgo.test.crt`,
      ca: `${devServerLocation}/ssl/crt/genkgo.test/genkgo.test-ca.pem`,
      key: `${devServerLocation}/ssl/crt/genkgo.test/genkgo.test.key.pem`,
    },
    cors: {
      origin: '*'
    },
    hmr: {
      host: process.env.VITE_HMR_HOST || 'genkgo.test',
    },
  }
})

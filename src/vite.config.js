import {defineConfig} from 'vite'
import {ViteImageOptimizer} from 'vite-plugin-image-optimizer'
import autoprefixer from 'autoprefixer'

const devServerLocation = process.env.G2SERVER || '/srv/genkgo';

export default defineConfig({
  plugins: [
    ViteImageOptimizer(),
  ],
  appType: 'custom',
  root: '{root}/app/assets',
  base: '/build',
  publicDir: 'app/assets',
  css: {
    postcss: {
      plugins: [autoprefixer]
    }
  },
  optimizeDeps: {
    include: ['{root}/app/assets/js/**/*.js']
  },
  resolve: {
    alias: {
      moment: '{root}/node_modules/moment/moment.js',
      modernizr: '{dtk}/dep/modernizr.js',
      'jquery-ui': '{dtk}/dep/jquery-ui',
    }
  },
  build: {
    assetsInlineLimit: 0,
    manifest: true,
    rollupOptions: {
      preserveEntrySignatures: "strict",
      output: {
        preserveModules: true,
        assetFileNames: (asset) => {
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
    outDir: '{root}/public/build',
    assetsDir: '.',
  },
  server: {
    https: {
      cert: `${devServerLocation}/ssl/crt/genkgo.test/genkgo.test.crt`,
      ca: `${devServerLocation}/ssl/crt/genkgo.test/genkgo.test-ca.pem`,
      key: `${devServerLocation}/ssl/crt/genkgo.test/genkgo.test.key.pem`,
    },
    cors: {
      origin: '*'
    }
  }
})

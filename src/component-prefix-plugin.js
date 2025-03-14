import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import crypto from 'node:crypto';

async function readPackageJson(root) {
  return JSON.parse(await fs.readFile(root + '/package.json'));
}

function getHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 8);
}

async function loadComponents(config) {
  const projectDir = config.project;
  const rootDir = config.root;

  let components = [];
  const packageJson = await readPackageJson(projectDir);
  for (let dependency of Object.keys(packageJson.dependencies)) {
    const depPackageJsonFile = `${projectDir}/node_modules/${dependency}/package.json`;
    if (!fsSync.existsSync(depPackageJsonFile)) {
      continue;
    }

    const depPackageJson = await readPackageJson(`${projectDir}/node_modules/${dependency}`);
    if (depPackageJson['web-types']) {
      const webTypeFile = path.resolve(`${projectDir}/node_modules/${dependency}`, depPackageJson['web-types']);
      if (!fsSync.existsSync(webTypeFile)) {
        continue;
      }

      const webTypes = JSON.parse(await fs.readFile(webTypeFile));
      for (const htmlElement of (webTypes.contributions.html.elements || [])) {
        components[htmlElement.name] = {
          name: htmlElement.name,
          description: htmlElement.description,
          package: dependency,
        };

        if (htmlElement.css?.source?.file) {
          const cssPath = path.resolve(`${projectDir}/node_modules/${dependency}/${htmlElement.css?.source?.file}`);
          components[htmlElement.name].css = {
            source: path.relative(`${projectDir}/node_modules/${dependency}`, htmlElement.css?.source?.file),
            path: cssPath,
            pathFromRoot: path.relative(rootDir, cssPath),
          };
        }

        if (htmlElement.source?.file) {
          const jsPath = path.resolve(`${projectDir}/node_modules/${dependency}/${htmlElement.source?.file}`);
          components[htmlElement.name].js = {
            source: path.relative(path.dirname(`${projectDir}/node_modules/${dependency}/${depPackageJson.main}`), jsPath),
            path: jsPath,
            pathFromRoot: path.relative(rootDir, jsPath),
          };
        }

        console.log(`Registered @component/${htmlElement.name}`);
      }
    }
  }

  return components;
}

export default function componentPrefixPlugin() {
  let components = {};
  let isBuild = false;
  let outputDir = 'dist';

  return {
    name: 'web-component-prefix-plugin',

    config(config, { command }) {
      if (command === 'build') {
        config.build = config.build || {};
        config.build.rollupOptions = config.build.rollupOptions || {};
        config.build.rollupOptions.output = config.build.rollupOptions.output || {};
        outputDir = config.build.outDir || 'dist';

        const currentAssetFileNames = config.build.rollupOptions.output.assetFileNames;
        config.build.rollupOptions.output.assetFileNames = (assetInfo) => {
          if (assetInfo.name.startsWith('web-component/')) {
            return '[name]-[hash][extname]';
          }

          return currentAssetFileNames(assetInfo);
        };
      }
    },

    async configResolved(config) {
      isBuild = config.command === 'build';
      components = await loadComponents(config);

      config.build.rollupOptions.input = config.build.rollupOptions.input || {};
      for (const componentName of Object.keys(components)) {
        const component = components[componentName];
        config.build.rollupOptions.input[`web-component/${component.name}`] = component.js.path;
      }
    },

    resolveId(source) {
      if (source.startsWith('/@web-component/')) {
        let queryString = '';
        let [componentName, file] = source.substring(16).split('.');
        const questionMark = file.indexOf('?');
        if (questionMark !== -1) {
          queryString = file.substring(questionMark);
          file = file.substring(0, questionMark);
        }

        if (!components[componentName]) {
          return null;
        }

        const resolvedPath = components[componentName][file];
        if (resolvedPath) {
          return 'web-component:' + resolvedPath + queryString;
        }
      }

      return null;
    },

    async load(id) {
      if (id.startsWith('web-component:')) {
        let file = id.substring(14);
        const questionMark = file.indexOf('?');
        if (questionMark !== -1) {
          file = file.substring(0, questionMark);
        }

        return {
          code: await fs.readFile(file, 'utf-8'),
          map: null
        };
      }

      return null;
    },

    async buildStart() {
      if (!isBuild) {
        return;
      }

      const result = {};
      for (const componentName of Object.keys(components)) {
        const component = components[componentName];
        const source = await fs.readFile(component.css.path);
        const fileName = `web-component/${path.basename(component.css.path, '.css')}-${getHash(source)}.css`;

        this.emitFile({
          type: 'asset',
          name: 'web-component/' + path.basename(component.css.path),
          source: source,
          fileName,
        });
      }
    },

    async closeBundle() {
      if (Object.keys(components).length === 0) {
        return;
      }

      const manifest = JSON.parse(await fs.readFile(path.join(outputDir, '.vite/manifest.json'), 'utf-8'));
      const result = {};

      for (const componentName of Object.keys(components)) {
        const component = components[componentName];

        result[componentName] = {
          name: componentName,
          package: component.package,
          input: `${component.package}/${component.js.source}`,
          output: manifest[component.js.pathFromRoot].file,
          stylesheet: manifest[component.css.pathFromRoot].file,
        }
      }

      await fs.writeFile(path.join(outputDir, '.vite/webcomponents.json'), JSON.stringify(result, null, 2), 'utf-8');
    }
  };
}

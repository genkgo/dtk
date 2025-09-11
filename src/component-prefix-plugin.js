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

async function loadComponents(projectDir) {
  let components = {};
  const packageJson = await readPackageJson(projectDir);
  if (packageJson['web-types']) {
    components = {
      ...components,
      ...await loadWebtypes(projectDir, packageJson['web-types'])
    };
  }

  for (let dependency of Object.keys(packageJson.dependencies)) {
    const depPackageJsonFile = `${projectDir}/node_modules/${dependency}/package.json`;
    if (!fsSync.existsSync(depPackageJsonFile)) {
      continue;
    }

    const depPackageJson = await readPackageJson(`${projectDir}/node_modules/${dependency}`);
    if (depPackageJson['web-types']) {
      components = {
        ...components,
        ...await loadWebtypes(`${projectDir}/node_modules/${dependency}`, depPackageJson['web-types'])
      };
    }
  }

  return components;
}

async function loadWebtypes(dir, webTypeFileName) {
  const webTypeFile = path.resolve(dir, webTypeFileName);
  if (!fsSync.existsSync(webTypeFile)) {
    return;
  }

  const components = {};
  const webTypes = JSON.parse(await fs.readFile(webTypeFile));
  for (const htmlElement of (webTypes.contributions.html.elements || [])) {
    components[htmlElement.name] = {
      name: htmlElement.name,
      description: htmlElement.description,
    };

    if (htmlElement.css?.source?.file) {
      components[htmlElement.name].css = path.resolve(`${dir}/${htmlElement.css?.source?.file}`);
    }

    if (htmlElement.source?.file) {
      components[htmlElement.name].js = path.resolve(`${dir}/${htmlElement.source?.file}`);
    }

    console.log(`Registered @component/${htmlElement.name}`);
  }

  return components;
}

export default function componentPrefixPlugin() {
  let components = {};
  let isBuild = false;
  const idFileMap = {};

  return {
    name: 'web-component-prefix-plugin',

    config(config, { command }) {
      if (command === 'build') {
        config.build = config.build || {};
        config.build.rollupOptions = config.build.rollupOptions || {};
        config.build.rollupOptions.output = config.build.rollupOptions.output || {};

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
      components = await loadComponents(config.project);

      config.build.rollupOptions.input = config.build.rollupOptions.input || {};
      for (const componentName of Object.keys(components)) {
        const component = components[componentName];
        if (component.js) {
          config.build.rollupOptions.input[`web-component/${component.name}`] = component.js;
        }
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

        idFileMap[file] = id;

        return {
          code: await fs.readFile(file, 'utf-8'),
          map: null
        };
      }

      return null;
    },

    handleHotUpdate({ file, server }) {
      const id = idFileMap[file];
      if (id) {
        server.moduleGraph.invalidateModule(server.moduleGraph.getModuleById(id));
      }
    },

    async buildStart() {
      if (!isBuild) {
        return;
      }

      for (const componentName of Object.keys(components)) {
        const component = components[componentName];
        const source = await fs.readFile(component.css);

        this.emitFile({
          type: 'asset',
          name: 'web-component/' + path.basename(component.css),
          source: source,
          fileName: `web-component/${path.basename(component.css, '.css')}-${getHash(source)}.css`,
        });
      }
    }
  };
}

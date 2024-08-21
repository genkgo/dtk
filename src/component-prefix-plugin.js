import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

async function readPackageJson(root) {
  return JSON.parse(await fs.readFile(root + '/package.json'));
}

export default function componentPrefixPlugin() {
  let components = {};

  return {
    name: 'component-prefix-plugin',

    config(config, { command }) {
      if (command === 'build') {
        config.build = config.build || {};
        config.build.rollupOptions = config.build.rollupOptions || {};
        config.build.rollupOptions.output = config.build.rollupOptions.output || {};

        const currentAssetFileNames = config.build.rollupOptions.output.assetFileNames;
        config.build.rollupOptions.output.assetFileNames = (assetInfo) => {
          return currentAssetFileNames(assetInfo);
        };
      }
    },

    async configResolved(config) {
      const packageJson = await readPackageJson(config.project);
      for (let dependency of Object.keys(packageJson.dependencies)) {
        const depPackageJsonFile = `${config.project}/node_modules/${dependency}/package.json`;
        if (!fsSync.existsSync(depPackageJsonFile)) {
          continue;
        }

        const depPackageJson = await readPackageJson(`${config.project}/node_modules/${dependency}`);
        if (depPackageJson['web-types']) {
          const webTypeFile = path.resolve(`${config.project}/node_modules/${dependency}`, depPackageJson['web-types']);
          if (!fsSync.existsSync(webTypeFile)) {
            continue;
          }

          const webTypes = JSON.parse(await fs.readFile(webTypeFile));
          for (const htmlElement of (webTypes.contributions.html.elements || [])) {
            components[htmlElement.name] = {
              name: htmlElement.name,
              description: htmlElement.description,
            };

            if (htmlElement.css?.source?.file) {
              components[htmlElement.name].css = path.resolve(`${config.project}/node_modules/${dependency}/${htmlElement.css?.source?.file}`);
            }

            if (htmlElement.source?.file) {
              components[htmlElement.name].js = path.resolve(`${config.project}/node_modules/${dependency}/${htmlElement.source?.file}`);
            }

            console.log(`Registered @component/${htmlElement.name}`);
          }
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

        return {
          code: await fs.readFile(file, 'utf-8'),
          map: null
        };
      }

      return null;
    },

    async buildStart() {
      for (const componentName of Object.keys(components)) {
        const component = components[componentName];

        this.emitFile({
          type: "asset",
          name: 'component/' + path.basename(component.css),
          source: await fs.readFile(component.css),
          fileName: component.css,
        });
      }
    }
  };
}

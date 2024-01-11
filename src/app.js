import fsSync from 'fs';
import fs from 'fs/promises';
import MagicString from 'magic-string';
import path from "path";

const getDirectories = async source =>
  (await fs.readdir(source, { withFileTypes: true }))
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

class DtkApp {
  constructor(config) {
    this.config = config;
  }

  async convertToVite(options = {}) {
    await this.validate(options);
    await this.convertConfig(options);
    await this.writeNpmScssImport(options);
  }

  async validate(options) {
    if (fsSync.existsSync(options.root + '/app/assets/favicon')) {
      throw new Error('Remove favicon directory, move to admin');
    }

    if (fsSync.existsSync(options.root + '/app/assets/img')) {
      let imageSubdirectories = await getDirectories(options.root + '/app/assets/img');
      if (imageSubdirectories.length > 0) {
        throw new Error('Subdirectories inside ./app/assets/img are not supported (yet)');
      }
    }
  }

  async convertConfig(options) {
    let configFile = options.dtk + '/vite.config.js'
    let targetFile = options.root + '/node_modules/.vite/vite.config.js';
    let input = {
      index: './app/assets/js/index.js',
    };

    if (this.config.scss.compile) {
      this.config.scss.compile.forEach((value) => input[value] = `./app/assets/scss/${value}`);
    } else {
      input['css'] = './app/assets/scss/style.scss';
    }

    let configFileContent = await fs.readFile(configFile);
    let config = new MagicString(configFileContent);
    config.replace('{/** {INPUT} **/}', JSON.stringify(input));
    config.replaceAll('{root}', options.root);
    config.replaceAll('{dtk}', options.dtk);
    await fs.writeFile(targetFile, config.toString());
  }

  async writeNpmScssImport(options) {
    let css = [];
    for (let npmModuleName of Object.keys(this.config.npm)) {
      let npmModule = this.config.npm[npmModuleName];

      let cssFilter = null;
      if (npmModule['css-filter']) {
        cssFilter = npmModule['css-filter'];
      }

      if (npmModule.css) {
        for (let cssFile of npmModule.css) {
          css.push(`@import "${npmModuleName}/${cssFile}";`);
        }
      }

      await fs.writeFile(options.root + '/node_modules/.vite/_npm.scss', css.join("\n"));
    }
  }
}

export {DtkApp};

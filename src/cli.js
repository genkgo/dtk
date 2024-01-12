import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import {existsSync} from 'node:fs';
import {CAC} from 'cac';
import findDtkFile from './find-dtk-file.js';
import {fileURLToPath} from 'node:url';
import {format} from 'node:util';

const currentScript = fileURLToPath(import.meta.url);

let updatedConfigFile, root;
try {
  const appFile = findDtkFile(currentScript).next();
  if (!appFile.filename) {
    throw new Error("Failed to find g2dtk.js");
  }

  root = path.dirname(appFile.filename);
  updatedConfigFile = root + '/node_modules/.vite/vite.config.js';

  const dtk = path.dirname(currentScript);
  const appInstance = (await import(appFile.filename)).default;

  await fs.mkdir(root + '/node_modules/.vite', {recursive: true});
  await appInstance.convertToVite({root, dtk});
} catch (error) {
  console.error('\x1b[31m%s\x1b[0m', ' >> DTK to Vite error:');
  console.error('\x1b[31m%s\x1b[0m', ' >> ' + error.message);
  console.log("\n========================= Error stack: =====================");
  console.error('\x1b[31m%s\x1b[0m', error.stack);
  process.exit(1);
}

async function readPackageJson() {
  return JSON.parse(await fs.readFile(root + '/package.json'));
}

async function updateInFiles(directory, search, replace) {
  let updatedFiles = [];
  const files = await fs.readdir(directory, {recursive: true});
  for (let file of files) {
    let fileFullName = `${directory}/${file}`;
    if ((await fs.lstat(fileFullName)).isDirectory()) {
      continue;
    }

    let fileContents = await fs.readFile(fileFullName);
    if (fileContents.includes(search)) {
      fileContents = fileContents.toString().replaceAll(search, replace);
      await fs.writeFile(fileFullName, fileContents);
      console.log(`> Updated ${fileFullName}`);
      updatedFiles.push(fileFullName);
    }
  }

  return updatedFiles;
}

const cli = new CAC('g2dtk');

cli.command('upgrade-dtk').action(async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  while ((await readPackageJson()).type !== 'module') {
    await rl.question('Did you set `"type": "module"` inside your package.json?:');
  }

  while (existsSync(root + '/app/assets/favicon')) {
    await rl.question('Did you move app/assets/favicon to admin?:');
  }

  const jsFiles = await fs.readdir(root + '/app/assets/js', {recursive: true});
  let invalidReferences = {
    'fullcalendar/locale/nl': 'Did you update the import of fullcalendar/locale/nl to fullcalendar/dist/locale/nl inside %s?',
    "'/controller'": 'Did you update `new Router()` to use the new module loader with import.meta.glob inside %s?',
  }

  for (let jsFile of jsFiles) {
    let jsFullName = root + '/app/assets/js/' + jsFile;
    if ((await fs.lstat(jsFullName)).isDirectory()) {
      continue;
    }

    let shouldSearch = true;
    while (shouldSearch) {
      shouldSearch = false;

      let fileContents = await fs.readFile(jsFullName);
      for (let search of Object.keys(invalidReferences)) {
        if (fileContents.includes(search)) {
          await rl.question(format(invalidReferences[search], jsFile));
          shouldSearch = true;
        }
      }
    }
  }

  await rl.question('Did you update the templates to use <vite:script-entrypoint> and <vite:link-entrypoint>? (I am not checking for you):');
  await rl.question('Did you update env-path/image-path variable inside your template to use vite:debug-url()? (I am not checking for you):');

  console.log("\nNo space inside `@media screen and(` is not allowed in dart-sass. It must be `@media screen and (.");
  let answerMedia = (await rl.question('Do you want me to convert?:')).toLowerCase();
  if (answerMedia === 'y' || answerMedia === 'yes') {
    let updatedFiles = await updateInFiles(root + '/app/assets/scss', '@media screen and(', '@media screen and (');
    console.log(`> Totally updated ${updatedFiles.length} files`);
  }

  console.log("\nTilde importing, like @import \"~normalize.css/normalize.css\", does not work with Vite. Do you want me to update?");
  let answerTildeImport = (await rl.question('Do you want me to convert?:')).toLowerCase();
  if (answerTildeImport === 'y' || answerTildeImport === 'yes') {
    let updatedFiles = await updateInFiles(root + '/app/assets/scss', '@import "~', '@import "');
    console.log(`> Totally updated ${updatedFiles.length} files`);
  }

  process.exit(0);
});

cli.command('serve', 'serve').action(() => {
  process.argv.push('--config', updatedConfigFile);
  import(root + '/node_modules/vite/dist/node/cli.js');
});

cli.command('build', 'build').action(() => {
  process.argv.push('--config', updatedConfigFile);
  process.argv.push('--emptyOutDir');
  import(root + '/node_modules/vite/dist/node/cli.js');
});

cli.parse();

import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { existsSync } from 'node:fs';
import {CAC} from 'cac';
import findDtkFile from './find-dtk-file.js';
import { fileURLToPath } from 'node:url';
import { format } from 'node:util';

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

  await fs.mkdir(root + '/node_modules/.vite', { recursive: true });
  await appInstance.convertToVite({ root, dtk });
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

  const jsFiles = await fs.readdir(root + '/app/assets/js', { recursive: true });
  let invalidReferences = {
    'fullcalendar/locale/nl': 'Did you update the import of fullcalendar/locale/nl to fullcalendar/dist/locale/nl inside %s?',
    "'/controller'": 'Did you update `new Router()` to use the new module loader with import.meta.glob inside %s?',
  }

  for (let jsFile of jsFiles) {
    let shouldSearch = true;
    while (shouldSearch) {
      shouldSearch = false;

      let fileContents = await fs.readFile(jsFile);
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
  let answer = await rl.question('No space inside `@media screen and(` is not allowed in dart-sass, convert to `@media screen and (`:');
  if (answer === 'Y' || answer === 'yes') {
    const scssFiles = await fs.readdir(root + '/app/assets/scss', { recursive: true });
    for (let scssFile of scssFiles) {
      let fileContents = await fs.readFile(scssFile);
      if (fileContents.includes('@media screen and(')) {
        fileContents = fileContents.replaceAll('@media screen and(', '@media screen and (');
        await fs.writeFile(scssFile, fileContents);
        console.log(`Updated ${scssFile}`);
      }
    }
  }
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

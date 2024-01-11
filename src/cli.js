import {CAC} from 'cac';
import fs from 'fs/promises';
import path from 'path';
import findDtkFile from './find-dtk-file.js';
import { fileURLToPath } from 'node:url';

const currentScript = fileURLToPath(import.meta.url);

let updatedConfigFile, root;
try {
  const appFile = findDtkFile(currentScript).next();
  if (!appFile.filename) {
    throw new Error("Failed to find g2dtk.js");
  }

  root = path.dirname(appFile.filename);

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

const cli = new CAC('g2dtk');

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

import {CAC} from 'cac';
import fs from 'fs/promises';
import findDtkFile from './find-dtk-file.js';

const appFile = await findDtkFile(import.meta.url);
const root = new URL('.', appFile).toString().replace('file://', '');
const dtk = new URL('.', import.meta.url).toString().replace('file://', '');
const appInstance = (await import(root + '/../g2dtk.js')).default;
const updatedConfigFile = root + '/node_modules/.vite/vite.config.js';

await fs.mkdir(root + '/node_modules/.vite', { recursive: true });

try {
  await appInstance.convertToVite(
    new URL('vite.config.js', import.meta.url).toString().replace('file://', ''),
    updatedConfigFile,
    { root, dtk }
  );
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

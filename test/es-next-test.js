'use strict';

const { createBuilder, createTempDir, fromDir } = require('broccoli-test-helper');
const { expect } = require('chai');
const Transpiler = require('../lib/esnext-transpiler');
const fs = require('fs');
const path = require('path');
const expectations = path.join(__dirname, 'expectations');

describe('transpile ES next', function () {
  this.timeout(8000);

  it('should transpile import export', async function () {
    const fixtures = fromDir(__dirname + '/fixtures/es-next');
    const input = await createTempDir();
    input.write(fixtures.read());

    try {
      const subject = new Transpiler.Local(input.path(), 'es-next', {
        inputSourceMap: false,
        sourceMap: false,
        persist: false,
      });

      const output = createBuilder(subject);
      try {
        await output.build();

        let contents = output.read();

        let files = ['import-export.js', 'dynamic-import.js', 'dynamic-string-import.js', 'module-root.js', 'async-await.js'];
        for (let file of files) {
          let expected = fs.readFileSync(path.join(expectations, 'es-next/' + file), 'utf8');
          expect(contents).to.include.any.keys(file);
          expect(contents[file].trim()).to.eql(expected.trim(), `testing ${file}`);
        }
      } finally {
        await output.dispose();
      }
    } finally {
      await input.dispose();
    }
  });
});

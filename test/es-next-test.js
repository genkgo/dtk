'use strict';

let fs = require('fs');
let expect = require('chai').expect;
let path = require('path');
let Transpiler = require('../lib/esnext-transpiler');
let helpers = require('broccoli-test-helpers');

let makeTestHelper = helpers.makeTestHelper;
let cleanupBuilders = helpers.cleanupBuilders;

let inputPath = path.join(__dirname, 'fixtures');
let expectations = path.join(__dirname, 'expectations');

let transpiler;

describe('transpile ES next', function() {

  before(function() {
    transpiler = makeTestHelper({
      subject: function() {
        return new Transpiler.Local(arguments[0], arguments[1], arguments[2]);
      },
      fixturePath: inputPath
    });
  });


  afterEach(function () {
    return cleanupBuilders();
  });

  it('static import export', function () {
    return transpiler('es-next', 'es-next', {
      inputSourceMap: false,
      sourceMap: false
    }).then(function(results) {
      let outputPath = results.directory;

      let output = fs.readFileSync(path.join(outputPath, 'import-export.js'), 'utf8');
      let input = fs.readFileSync(path.join(expectations, 'es-next/import-export.js'), 'utf8');

      expect(output).to.eql(input);
    });
  });

  it('with dynamic import', function () {
    return transpiler('es-next', 'es-next', {
      inputSourceMap: false,
      sourceMap: false
    }).then(function(results) {
      let outputPath = results.directory;

      let output = fs.readFileSync(path.join(outputPath, 'dynamic-import.js'), 'utf8');
      let input = fs.readFileSync(path.join(expectations, 'es-next/dynamic-import.js'), 'utf8');

      expect(output).to.eql(input);
    });
  });

  it('with module root', function () {
    return transpiler('es-next', 'es-next', {
      inputSourceMap: false,
      sourceMap: false
    }).then(function(results) {
      let outputPath = results.directory;

      let output = fs.readFileSync(path.join(outputPath, 'module-root.js'), 'utf8');
      let input = fs.readFileSync(path.join(expectations, 'es-next/module-root.js'), 'utf8');

      expect(output).to.eql(input);
    });
  });
});
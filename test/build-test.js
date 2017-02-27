'use strict';

let fs = require('fs');
let expect = require('chai').expect;
let path = require('path');
let DtkApp = require('../lib/dtk-app');
let helpers = require('broccoli-test-helpers');

let makeTestHelper = helpers.makeTestHelper;
let cleanupBuilders = helpers.cleanupBuilders;

let inputPath = path.join(__dirname, 'fixtures');
let expectations = path.join(__dirname, 'expectations');

let app;

describe('development build', function() {

  this.timeout(8000);

  before(function() {
    app = makeTestHelper({
      subject: function() {
        return new DtkApp().build({
          'environment': 'development',
          'baseDir': __dirname + '/fixtures/build',
          'modulesDir': __dirname + '/../node_modules',
        });
      },
      fixturePath: inputPath
    });
  });


  afterEach(function () {
    return cleanupBuilders();
  });

  it('build all', function () {
    return app().then(function(results) {
      let outputPath = results.directory;

      let outputJs = fs.readFileSync(path.join(outputPath, 'js/scripts.js'), 'utf8');
      let outputCss = fs.readFileSync(path.join(outputPath, 'css/screen.css'), 'utf8');
      expect(outputJs.length).to.above(0);
      expect(outputCss.length).to.above(0);
    });
  });

});

describe('production build', function() {

  this.timeout(4000);

  before(function() {

    app = makeTestHelper({
      subject: function() {
        return new DtkApp({
          'hash': '12345678'
        }).build({
          'environment': 'production',
          'baseDir': __dirname + '/fixtures/build',
          'modulesDir': __dirname + '/../node_modules',
        });
      },
      fixturePath: inputPath
    });
  });


  afterEach(function () {
    return cleanupBuilders();
  });

  it('build all', function () {
    return app().then(function(results) {
      let outputPath = results.directory;

      let outputJs = fs.readFileSync(path.join(outputPath, 'js/12345678-scripts.js'), 'utf8');
      let outputCss = fs.readFileSync(path.join(outputPath, 'css/12345678-screen.css'), 'utf8');
      let buildXsl = fs.readFileSync(__dirname + '/fixtures/build/app/templates/build.xsl', 'utf8');

      expect(outputJs.length).to.above(0);
      expect(outputCss.length).to.above(0);
      expect(buildXsl.length).to.above(0);
      expect(buildXsl).to.contain('12345678');
      expect(fs.existsSync(path.join(outputPath, 'favicon/'))).to.be.true;
    });
  });

});
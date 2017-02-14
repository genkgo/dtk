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

  before(function() {
    process.chdir(__dirname + '/fixtures/build');

    app = makeTestHelper({
      subject: function() {
        return new DtkApp({}).build({ 'environment': 'development'});
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

  before(function() {
    process.chdir(__dirname + '/fixtures/build');

    app = makeTestHelper({
      subject: function() {
        return new DtkApp({}).build({ 'environment': 'production'});
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
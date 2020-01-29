'use strict';

const { createBuilder, createTempDir } = require('broccoli-test-helper');
const { expect } = require('chai');
const DtkApp = require('../lib/dtk-app');
const fs = require('fs');

describe('development build', function () {
  this.timeout(8000);

  it('should build', async function () {
    const input = await createTempDir();
    try {
      const subject = new DtkApp().build({
        'environment': 'development',
        'baseDir': __dirname + '/fixtures/build',
        'modulesDir': __dirname + '/../node_modules',
      });

      const output = createBuilder(subject);
      try {
        await output.build();

        let contents = output.read();
        expect(contents).to.have.all.keys('css', 'favicon', 'img', 'js');
        expect(contents['js']).to.have.all.keys('scripts.js', 'scripts.map');
        expect(contents['js']['scripts.js'].length).to.above(0);
        expect(contents['css']).to.include.all.keys('screen.css');
        expect(contents['css']['screen.css'].length).to.above(0);
        expect(contents['img']).to.include.all.keys('alpha.gif');
        expect(contents['img']['alpha.gif'].length).to.above(0);
        expect(contents['favicon']).to.include.all.keys('.gitkeep');
      } finally {
        await output.dispose();
      }
    } finally {
      await input.dispose();
    }
  });
});

describe('production build', function () {
  this.timeout(8000);

  it('should build, all scripts concatenated', async function () {
    const input = await createTempDir();
    try {
      const subject = new DtkApp({ hash: '12345678'}).build({
        'environment': 'production',
        'baseDir': __dirname + '/fixtures/build',
        'modulesDir': __dirname + '/../node_modules',
      });

      const output = createBuilder(subject);
      try {
        await output.build();

        let contents = output.read();
        expect(contents).to.have.all.keys('css', 'favicon', 'img', 'js');
        expect(contents['js']).to.have.all.keys('12345678-scripts.js');
        expect(contents['js']['12345678-scripts.js'].length).to.above(0);
        expect(contents['css']).to.include.all.keys('12345678-screen.css');
        expect(contents['css']['12345678-screen.css'].length).to.above(0);
        expect(contents['img']).to.include.all.keys('alpha.gif');
        expect(contents['img']['alpha.gif'].length).to.above(0);
        expect(contents['favicon']).to.include.all.keys('.gitkeep');

        let buildXsl = fs.readFileSync(__dirname + '/fixtures/build/app/templates/build.xsl', 'utf8');
        expect(buildXsl).to.contain('12345678');
      } finally {
        await output.dispose();
      }
    } finally {
      await input.dispose();
    }
  });

  it('should build, with vendor separated', async function () {
    const input = await createTempDir();
    try {
      const subject = new DtkApp({ hash: '12345678', js: { splitVendor: true }}).build({
        'environment': 'production',
        'baseDir': __dirname + '/fixtures/build',
        'modulesDir': __dirname + '/../node_modules',
      });

      const output = createBuilder(subject);
      try {
        await output.build();

        let contents = output.read();
        expect(contents).to.have.all.keys('css', 'favicon', 'img', 'js');
        expect(contents['js']).to.have.all.keys('12345678-scripts.js', '12345678-vendor.js');
        expect(contents['js']['12345678-scripts.js'].length).to.above(0);
        expect(contents['js']['12345678-vendor.js'].length).to.above(0);
        expect(contents['css']).to.include.all.keys('12345678-screen.css');
        expect(contents['css']['12345678-screen.css'].length).to.above(0);
        expect(contents['img']).to.include.all.keys('alpha.gif');
        expect(contents['img']['alpha.gif'].length).to.above(0);
        expect(contents['favicon']).to.include.all.keys('.gitkeep');

        let buildXsl = fs.readFileSync(__dirname + '/fixtures/build/app/templates/build.xsl', 'utf8');
        expect(buildXsl).to.contain('12345678');
      } finally {
        await output.dispose();
      }
    } finally {
      await input.dispose();
    }
  });
});

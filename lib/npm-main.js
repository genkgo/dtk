'use strict';

const fs = require('fs');

module.exports = function () {
  let packageJson = getJson('./package.json');
  let dependencies = packageJson.dependencies;

  let files = {};

  for (let dependency of Object.keys(dependencies)) {
    let modulePath = './node_modules/' + dependency + '/';
    let dependencyPkg = getJson(modulePath + 'package.json');
    let dependencyMain = dependencyPkg.main || '';

    if (Array.isArray(dependencyMain)) {
      files[dependency] = dependencyMain.map((file) => {
        return modulePath + file;
      });
    } else if (dependencyMain) {
      files[dependency] = [modulePath + dependencyMain];
    }
  }

  return files;
};

function getJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}
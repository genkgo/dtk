'use strict';

const fs = require('fs');
const path = require('path');

module.exports = function (packageJsonFile) {
  let packageJson = getJson(packageJsonFile);
  let dependencies = packageJson.dependencies;

  let files = {};

  for (let dependency of Object.keys(dependencies)) {
    let modulePath = ['.', 'node_modules', dependency];
    let dependencyPkg = getJson(modulePath.join(path.sep) + path.sep + 'package.json');
    let dependencyMain = dependencyPkg.main || '';

    if (Array.isArray(dependencyMain)) {
      files[dependency] = dependencyMain.map((file) => {
        return modulePath.join(path.sep) + path.sep + file;
      });
    } else if (dependencyMain) {
      files[dependency] = [modulePath.join(path.sep) + path.sep + dependencyMain.replace('/', path.sep)];
    }
  }

  return files;
};

function getJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}
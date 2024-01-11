import path from 'path';
import fs from 'fs';

function addSymbolIterator(result) {
  result[Symbol.iterator] = function () {
    return this;
  };
  return result;
}

export default function find(root) {
  root = root || process.cwd();
  if (typeof root !== "string") {
    if (typeof root === "object" && typeof root.filename === 'string') {
      root = root.filename;
    } else {
      throw new Error("Invalid argument");
    }
  }

  return addSymbolIterator({
    next: function next() {
      if (root.match(/^(\w:\\|\/)$/)) return addSymbolIterator({
        filename: undefined,
        done: true
      });

      let file = path.join(root, 'g2dtk.js');

      root = path.resolve(root, '..');

      if (fs.existsSync(file)) {
        return addSymbolIterator({
          filename: file,
          done: false
        });
      }

      return next();
    }
  });
};

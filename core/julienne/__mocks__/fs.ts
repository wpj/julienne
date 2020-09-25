let realFs = jest.requireActual('fs');

let fs = jest.createMockFromModule('fs');

// Jest doesn't mock fs.promises for some reason.
if (!(fs as typeof realFs).promises) {
  let promises = {};
  for (let fn in realFs) {
    promises[fn] = jest.fn();
  }

  (fs as typeof realFs).promises = promises;
}

module.exports = fs;

const path = require('path');
const colors = require('colors/safe');

const utils = module.exports = {
  getFileNameWoExt: file => path.basename(file, path.extname(file)),

  // Too brittle?
  getPackageName: fileName => utils.getFileNameWoExt(fileName).replace(/_/, ':'),

  /*eslint-disable */
  log(...args) {
    console.log('MeteorImportsWebpackPlugin:', ...args);
  },
  logWarn(msg, ...args) {
    console.log(colors.yellow('MeteorImportsWebpackPlugin:'), colors.yellow(msg), ...args);
  },
  logError(msg, ...args) {
    console.log(colors.red('MeteorImportsWebpackPlugin:'), colors.red(msg), ...args);
  },
  /*eslint-enable */
};

const reRequire = /([^\w.])require([^\w])/g;
const reNpmModules = /^\/+$\s+\/\/\s*\/\/\s*\/\/\s*node_modules\/(?!meteor[/-])([^\s]*)\.js[\s/]*?^\/+$(.|\s)*?^\/+$\s^$\s(?=})/gm;

module.exports = function(source) {

  this.cacheable();

  const toMeteorInternalRequire = source.replace(reRequire, '$1__meteorReq$2');
  const withStrippedModules = toMeteorInternalRequire.replace(reNpmModules, 'arguments[2].exports = require("$1");');

  return withStrippedModules;
};

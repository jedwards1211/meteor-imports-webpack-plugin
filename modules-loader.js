var reRequire = /([^\w.])require([^\w])/g;
var reNpmModules = /^\/+$\s+\/\/\s*\/\/\s*\/\/\s*node_modules\/(?!meteor[\/-])([^\s]*)\.js[\s\/]*?^\/+$(.|\s)*?^\/+$/gm;

module.exports = function (source) {

  this.cacheable();

  var toMeteorInternalRequire = source.replace(reRequire, '$1__meteorReq$2');
  var withStrippedModules = toMeteorInternalRequire.replace(reNpmModules, 'arguments[2].exports = require("$1");');

  return withStrippedModules;
}

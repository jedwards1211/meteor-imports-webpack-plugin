var reGlobalPackage = /^([^\s=]*).*Package[.\[]'?"?([^.'"]+).*$/gm;

module.exports = function(source) {
  this.cacheable();

  var config = JSON.parse(decodeURIComponent(this.query.substr(1)));

  var exclGlobals = config.excludeGlobals;
  if (typeof config.excludeGlobals === 'string')
    exclGlobals = [exclGlobals];


  var withCheckedPackages = source.replace(reGlobalPackage, replacer);
  function replacer(match, varName, pkgName) {
    if (config.exclude.indexOf(pkgName) > -1)
      return '';

    if (Array.isArray(exclGlobals))
      if (exclGlobals.indexOf(pkgName) > -1 || exclGlobals.indexOf(varName) > -1)
        return '';
    return match;
  }

  return withCheckedPackages;
}

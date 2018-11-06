const reGlobalPackage = /^([^\s=]*).*Package[.[]'?"?([^.'"]+).*$/gm;

module.exports = function(source) {
  this.cacheable();

  const config = this.query;

  let exclGlobals = config.excludeGlobals;
  if (typeof config.excludeGlobals === 'string')
    exclGlobals = [exclGlobals];

  function replacer(match, varName, pkgName) {
    if (config.exclude[pkgName])
      return '';

    if (Array.isArray(exclGlobals))
      if (exclGlobals.indexOf(pkgName) > -1 || exclGlobals.indexOf(varName) > -1)
        return '';
    return match;
  }

  const withCheckedPackages = source.replace(reGlobalPackage, replacer);
  return withCheckedPackages;
};

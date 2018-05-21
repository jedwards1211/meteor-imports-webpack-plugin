const path = require('path');
const {getPackageName, log, logWarn, logError} = require('./utils');


function readPackages(callback) {
  // this: Loader

  const {config, meteorBuild, mode} = this.query;
  const programJsonPath = path.join(meteorBuild, 'program.json');

  this.dependency(programJsonPath);

  this.fs.readJson(programJsonPath, (err, json) => {
    if (err) return callback(new Error(`Unable to read ${programJsonPath}. This file should be generated by Meteor.` +
      'Please run Meteor at least once and verify that MeteorImportsWebpackPlugin is configured correctly.'));

    const packages = json.manifest
      .filter(x => x.type === 'js' || x.type === 'css')
      .filter(x => x.path !== 'app/app.js')
      .map(x => {
        const match = x.path.match(/(packages|app)\/(.+)$/);
        if (!match) {
          logError('Unexpected package path in program.json', x.path);
          return null;
        }
        const name = getPackageName(match[2]);
        const excludeEntry = config.exclude[name];
        if (excludeEntry === true)
          return null;
        if (typeof excludeEntry === 'string')
          return ({name: name, source: excludeEntry});
        if (typeof excludeEntry === 'object') {
          if (!excludeEntry.mode) {
            logWarn('Unrecognized exclude entry for package ' + name);
            return true;
          }
          if (excludeEntry.mode === mode)
            return true;
        }

        return ({name: name || x.path, path: x.path});
      })
      .filter(x => !!x);

    if (config.logIncludedPackages)
      log('Included Meteor packages:', packages.map(p => p.name).join(', '));

    callback(null, packages);
  });
}

module.exports = function(/*source*/) {
  this.async();

  readPackages.call(this, (err, packages) => {
    if (err) return this.callback(err);

    const {config, meteorBuild} = this.query;

    let output = '';
    if (config.injectMeteorRuntimeConfig !== false)
      output += 'require("meteor-config");\n';

    // Require all packages
    for (let pkg of packages) {
      if (pkg.source)
        output += 'window.Package["' + pkg.name + '"] = ' + pkg.source + ';\n';
      else
        output += 'require("' + path.join(meteorBuild, pkg.path) + '");\n';
    }

    output += 'var mr = Package["modules-runtime"];\n';
    output += 'module.exports = mr && mr.meteorInstall();;';

    this.callback(null, output);
  });
};

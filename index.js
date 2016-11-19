var path = require('path');
var AliasPlugin = require('enhanced-resolve/lib/AliasPlugin');
var ModulesInRootPlugin = require('enhanced-resolve/lib/ModulesInRootPlugin');
function MeteorImportsPlugin(config) {
  config.exclude = [
    'autoupdate',
    'global-imports',
    'hot-code-push',
    'reload',
    'ecmascript',
  ].concat(config.exclude || []);
  this.config = config;
}

MeteorImportsPlugin.prototype.apply = function(compiler) {
  var self = this;

  compiler.plugin("compile", function(params) {
    // clear loaders from previous compile
    for(var i = compiler.options.module.rules.length-1; i--;){
        if (compiler.options.module.rules[i].meteorImports) {
            compiler.options.module.rules.splice(i, 1);
        }
    }

    // Create path for internal build of the meteor packages.
    var meteorBuild = self.config.meteorProgramsFolder
      ? path.resolve(params.normalModuleFactory.context, self.config.meteorProgramsFolder, 'web.browser')
      : path.resolve(
        params.normalModuleFactory.context, self.config.meteorFolder,
        '.meteor', 'local', 'build', 'programs', 'web.browser'
      );

    // Create path for plugin node moduels directory.
    var meteorNodeModules = path.join(__dirname, 'node_modules');

    // Create path for meteor app packages directory.
    var meteorPackages = path.join(meteorBuild, 'packages');

    // Check if module loaders is defined.
    if (compiler.options.module.rules === undefined)
      throw Error('Add an empty array in module.rules of your webpack config.');

    // Check if Meteor has been run at least once.
    try {
      var manifest = require(meteorBuild + '/program.json').manifest;
    } catch (e) {
      throw Error('Run Meteor at least once.')
    }

    // Create an alias so we can do the context properly using the folder
    // variable from the meteor config file. If we inject the folder variable
    // directly in the request.context webpack goes wild.
    compiler.resolvers.normal.apply(new AliasPlugin('described-resolve', {
      name: 'meteor-build',
      alias: meteorBuild,
    }, 'resolve'));
    compiler.resolvers.context.apply(new AliasPlugin('described-resolve', {
      name: 'meteor-packages',
      alias: meteorPackages,
      onlyModule: false,
    }, 'resolve'));

    // Create an alias for the meteor-imports require.
    compiler.resolvers.normal.apply(new AliasPlugin('described-resolve', {
      name: 'meteor-imports',
      alias: path.join(__dirname, './meteor-imports.js'),
    }, 'resolve'));

    compiler.resolvers.loader.apply(new ModulesInRootPlugin('module', meteorNodeModules, 'resolve'));

    // Add a loader to inject the meteor config in the meteor-imports require.
    // TODO: this does not work under webpack2.1.0.beta23+
    // https://github.com/webpack/webpack/issues/3084
    compiler.options.module.rules.push({
      meteorImports: true,
      test: /meteor-config/,
      use: [{
        loader: 'json-string-loader',
        query: 'json=' + JSON.stringify(self.config)
      }]
    });

    // Add a loader to inject this as window in the meteor packages.
    compiler.options.module.rules.push({
      meteorImports: true,
      test: new RegExp('.meteor/local/build/programs/web.browser/packages'),
      use: [{loader: 'imports-loader?this=>window'}]
    });

    // Create an alias for each Meteor packages and a loader to extract its
    // globals.
    var excluded = new RegExp(self.config.exclude
      .map(function(exclude){ return '^packages/' + exclude + '\.js$'; })
      .concat('^app\/.+.js$')
      .join('|'));
    manifest.forEach(function(pckge){
      if (!excluded.test(pckge.path)) {
        var match = /^packages\/(.+)\.js$/.exec(pckge.path);
        if (!match) return;
        var packageName = match[1];
        packageName = packageName.replace('_', ':');
        compiler.resolvers.normal.apply(new AliasPlugin('described-resolve', {
          name: 'meteor/' + packageName,
          alias: path.join(meteorBuild, pckge.path),
        }, 'resolve'));
        compiler.options.module.rules.push({
          meteorImports: true,
          test: new RegExp('.meteor/local/build/programs/web.browser/' + pckge.path),
          use: [{loader: 'exports-loader?Package["' + packageName + '"]'}]
        })
      }
    });
  });

  // Don't create modules and chunks for excluded packages.
  compiler.plugin("normal-module-factory", function(nmf) {
    var excluded = new RegExp(self.config.exclude
      .map(function(exclude) { return '^\./' + exclude + '\.js$' })
      .join('|'));
		nmf.plugin("before-resolve", function(result, callback) {
			if(!result) return callback();
			if(excluded.test(result.request)){
				return callback();
			}
			return callback(null, result);
		});
	});
};

module.exports = MeteorImportsPlugin;

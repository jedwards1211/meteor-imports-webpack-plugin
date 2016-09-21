var path = require('path');

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
    for(var i = compiler.options.module.loaders.length-1; i--;){
        if (compiler.options.module.loaders[i].meteorImports) {
            compiler.options.module.loaders.splice(i, 1);
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
    if (compiler.options.module.loaders === undefined)
      throw Error('Add an empty array in module.loaders of your webpack config.');

    // Check if Meteor has been run at least once.
    try {
      var manifest = require(meteorBuild + '/program.json').manifest;
    } catch (e) {
      throw Error('Run Meteor at least once.')
    }

    // Create an alias so we can do the context properly using the folder
    // variable from the meteor config file. If we inject the folder variable
    // directly in the request.context webpack goes wild.
    compiler.options.resolve.alias['meteor-build'] = meteorBuild;
    compiler.options.resolve.alias['meteor-packages'] = meteorPackages;

    // Create an alias for the meteor-imports require.
    compiler.options.resolve.alias['meteor-imports'] = path.join(
      __dirname, './meteor-imports.js');

    // Add a loader to inject the meteor config in the meteor-imports require.
    compiler.options.module.loaders.push({
      meteorImports: true,
      test: /meteor-config/,
      loader: 'json-string-loader?json=' + JSON.stringify(self.config)
    });

    // Add a loader to inject this as window in the meteor packages.
    compiler.options.module.loaders.push({
      meteorImports: true,
      test: new RegExp('.meteor/local/build/programs/web.browser/packages'),
      loader: 'imports?this=>window'
    });

    // Add a resolveLoader to use the loaders from this plugin's own NPM
    // dependencies.
    if (compiler.options.resolveLoader.modulesDirectories.indexOf(meteorNodeModules) < 0) {
      compiler.options.resolveLoader.modulesDirectories.push(meteorNodeModules);
    }

    // Add Meteor packages like if they were NPM packages.
    if (compiler.options.resolve.modulesDirectories.indexOf(meteorPackages) < 0) {
      compiler.options.resolve.modulesDirectories.push(meteorPackages);
    }

    // Create an alias for each Meteor packages and a loader to extract its
    // globals.
    var excluded = new RegExp(self.config.exclude
      .map(function(exclude){ return '^packages/' + exclude + '\.js$'; })
      .concat('^app\/.+.js$')
      .join('|'));
    manifest.forEach(function(pckge){
      if (excluded.test(pckge.path)) {
        return;
      }
      var location = /^packages\/(.+)\.js$/.exec(pckge.path);

      if (!location) {
        return;
      }

      var packageName = location[1];
      packageName = packageName.replace('_', ':');
      compiler.options.resolve.alias['meteor/' + packageName] =
        meteorBuild + '/' + pckge.path;
      compiler.options.module.loaders.push({
        meteorImports: true,
        test: new RegExp('.meteor/local/build/programs/web.browser/' + pckge.path),
        loader: 'exports?Package["' + packageName + '"]'
      })
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

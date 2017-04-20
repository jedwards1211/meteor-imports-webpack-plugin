var path = require('path');
var webpack = require('webpack');
var RuleSet = require('webpack/lib/RuleSet');
var AliasPlugin = require('enhanced-resolve/lib/AliasPlugin');
var ModulesInRootPlugin = require('enhanced-resolve/lib/ModulesInRootPlugin');
function MeteorImportsPlugin(config) {
  config.exclude = [
    'autoupdate',
    'global-imports',
    'hot-code-push',
    'ecmascript',
  ].concat(config.exclude || []);
  this.config = config;
}

MeteorImportsPlugin.prototype.apply = function(compiler) {
  var self = this;

  function getMeteorBuild(context) {
    return self.config.meteorProgramsFolder
      ? path.resolve(context, self.config.meteorProgramsFolder, 'web.browser')
      : path.resolve(context, self.config.meteorFolder, '.meteor', 'local', 'build', 'programs', 'web.browser');
  }

  function getManifest(context) {
    // Check if Meteor has been run at least once.
    try {
      return require(getMeteorBuild(context) + '/program.json').manifest;
    } catch (e) {
      throw Error('Run Meteor at least once.')
    }
  }

  compiler.plugin("compile", function(params) {
    // Create path for internal build of the meteor packages.
    var meteorBuild = getMeteorBuild(params.normalModuleFactory.context)

    // Create path for plugin node moduels directory.
    var meteorNodeModules = path.join(__dirname, 'node_modules');

    // Create path for meteor app packages directory.
    var meteorPackages = path.join(meteorBuild, 'packages');

    var manifest = getManifest(params.normalModuleFactory.context)

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
      }
    });
  });

  // Don't create modules and chunks for excluded packages.
  compiler.plugin("normal-module-factory", function (nmf) {
    var excluded = new RegExp(self.config.exclude
      .map(function (exclude) { return '^\./' + exclude + '\.js$' })
      .join('|'));
		nmf.plugin("before-resolve", function (result, callback) {
			if(!result) return callback();
			if(excluded.test(result.request)){
				return callback();
			}
			return callback(null, result);
		});

    // Create path for internal build of the meteor packages.
    var meteorBuild = getMeteorBuild(nmf.context)

    // Create path for meteor app packages directory.
    var meteorPackages = path.join(meteorBuild, 'packages');

    var manifest = getManifest(nmf.context)

    var extraRules = [
      {
        meteorImports: true,
        test: /meteor-config$/,
        include: [__dirname],
        use: {
          loader: 'json-string-loader',
          options: {json: JSON.stringify(self.config)}
        }
      },
      {
        meteorImports: true,
        test: new RegExp('.meteor/local/build/programs/web.browser/packages'),
        loader: 'imports?this=>window',
      },
      {
        meteorImports: true,
        test: /\.css$/,
        include: [meteorPackages],
        use: [
          {loader: 'style-loader'},
          {loader: 'css-loader'}
        ]
      }
    ]
    manifest.forEach(function (pckge) {
      if (!excluded.test(pckge.path)) {
        var match = /^packages\/(.+)\.js$/.exec(pckge.path);
        if (!match) return;
        var packageName = match[1];
        packageName = packageName.replace('_', ':');
        extraRules.push({
          meteorImports: true,
          test: new RegExp('.meteor/local/build/programs/web.browser/' + pckge.path),
          loader: 'exports?Package["' + packageName + '"]',
        })
      }
    });
    nmf.ruleSet = new RuleSet(nmf.ruleSet.rules.concat(extraRules))
  });
};

module.exports = MeteorImportsPlugin;

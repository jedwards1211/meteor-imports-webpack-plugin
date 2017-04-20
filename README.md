# Meteor Imports Webpack Plugin

This plugin lets you import any Meteor package like if it was a real NPM package. It is useful when you want to use some of the Meteor tools (or even a Meteor server) but you prefer to use Webpack for the client build instead of the Meteor build system.

----

## How does it work

This plugin extracts the meteor packages from a **real meteor project**, which lives in a subfolder.

If you are going to use a Meteor server, then a good name could be `server`. If not, maybe just `meteor`. We'll stick to `server` for this guide.

```bash
cd my-project
meteor create server # create a real meteor project in the `server` folder
```

Then you can add or remove packages like you normally do in Meteor. You should remove each module that you don't need to make your bundle as small as possible.

```bash
cd server
meteor remove insecure autopublish blaze-html-templates session jquery es5-shim
```

Add the Meteor packages you want to use.

```bash
meteor add accounts-password aldeed:collection2 alanning:roles
```

You can add or remove packages at any point, don't worry.

Install the plugin

```bash
cd ..
npm install meteor-imports-webpack-plugin --save-dev
```

Include it in your `webpack.config.js` file

```javascript
var MeteorImportsPlugin = require('meteor-imports-webpack-plugin');

module.exports = {
    ...
    plugins: [
      new MeteorImportsPlugin(config)
    ]
};
```


And finally, **include this import line** in your client entry point.

```javascript
require('meteor-imports'); // or import 'meteor-imports';
```

## Configuration

The `config` object passed to the plugin supports these properties:

```javascript
new MeteorImportsPlugin({
  // Required - used by Meteor to create absolute paths
  ROOT_URL: 'http://localhost:3000/',
  
  // Optional  
  PUBLIC_SETTINGS: {},
  meteorFolder: 'server',
  meteorEnv: { NODE_ENV: 'development' },
  exclude: ['ecmascript'],
  excludeGlobals: ['_']
  
  // Specify at most ONE of these. If not specified, host/protocol will be inferred from location.host
  DDP_DEFAULT_CONNECTION_PORT: 3000,
  DDP_DEFAULT_CONNECTION_URL: 'http://localhost:3000/', 
})
```

All the `config` object is passed to `__meteor_runtime_config__` variable so if you need to pass anything else, you can.

#### config.injectMeteorRuntimeConfig

If `injectMeteorRuntimeConfig` is false, `meteor-imports` will not set `window.__meteor_runtime_config__`, and you don't
need to include any of the relevant variables like `ROOT_URL` in the options.  Use this option if you would like to
inject `__meteor_runtime_config__` in your own SSR.

#### config.meteorFolder

The subfolder where your Meteor project is located. It can be an absolute path as well.

```javascript
new MeteorImportsPlugin({
  ...
  meteorFolder: 'meteor'
})
```

#### config.meteorProgramsFolder

(Overrides `config.meteorFolder`) the path to the `programs` folder within your `meteor` folder or the result of
`meteor build --directory`.

#### config.DDP_DEFAULT_CONNECTION_URL

If you are using a Meteor server, point `DDP_DEFAULT_CONNECTION_URL` to your server url. If you are developing in local, start your Meteor server and Webpack-dev-server in different ports.

```bash
# Start the webpack-dev-server in one terminal window.
webpack-dev-server # http://localhost:8080
# And the Meteor server in another.
cd server && meteor # http://localhost:3000
```

#### config.PUBLIC_SETTINGS

`PUBLIC_SETTINGS` is the equivalent to the property `public` of [Meteor's settings.json](http://docs.meteor.com/#/full/meteor_settings) file. You can still use a `settings.json` for your server or even import it from Webpack:

```javascript
var meteorSettings = require('./server/settings.json');

...
new MeteorImportsPlugin({
  ...
  PUBLIC_SETTINGS: meteorSettings.public
})
```

Finally, you can use the settings using `Meteor.settings.public` just like you are used to.

#### config.exclude

If you want to exclude some Meteor core packages you can use the optional `exclude` property.

For example, if you are not going to use DDP you can exclude all its related packages:

```javascript
new MeteorImportsPlugin({
  ...
  exclude: [
    'ddp-common',
    'ddp-client',
    'ddp'
  ]
})
```

This is useful only for the core packages. If you don't to use a Meteor package you added, you should remove it using `meteor remove some:package`.

By default, these core packages are excluded: `'autoupdate',
'hot-code-push',
'liveupdate',
'reload', 'ecmascript'` beucase they are useless in Webpack.

You can get a list of the currently used packages in your meteor `program.json` file:

```bash
cd server/.meteor/local/build/programs/web.browser/
cat program.json
```

If you find that any other package is not useful anymore let me know and I will exclude them by default as well.

#### config.excludeGlobals
This controls whether ```global-imports.js``` will be included from Meteor. By default it will not. 
This file exports a lot of global variables such as ```Meteor```, ```Tracker``` etc. on ```window```
 
Set this config to ```false``` to exports all globals (for packages that aren't excluded) or an array of 
 variable names and/or package names that will be exluded from global export.

#### config.meteorEnv

Meteor 1.3 expects to have this property along with a `NODE_ENV` set to `'production'` or nothing (development).

```javascript
new MeteorImportsPlugin({
  ...
  meteorEnv: { NODE_ENV: 'production' }
})
```

## How to import packages

Once you have it configured, you can import any Meteor package in your code. We have followed the same Meteor 1.3 convention, so you have to prepend `meteor` to avoid name collisions with NPM packages.

Each package exports its *Meteor globals* as named properties. In ES5 it looks like this.

```javascript
// ES5
var Meteor = require('meteor/meteor').Meteor;
var Mongo = require('meteor/mongo').Mongo;
var Tracker = require('meteor/tracker').Tracker;
var check = require('meteor/check').check;
var Match = require('meteor/check').Match;
```

But you'd want to use es2015 for improved imports with destructuring.

```javascript
// ES2015
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Tracker } from 'meteor/tracker';
import { check, Match } from 'meteor/check';
```

## How to add (or remove) a Meteor package

First, go to your Meteor folder and add (or remove) the package.

```bash
cd server
meteor add aldeed:collection2
```

Make sure the Meteor project is running or run it at least once (so it downloads the package and generates the bundle). Wait until it's completely ready (`=> App running at: http://localhost:3000/`).

```bash
meteor
```

You can stop it afterwards if you are not using a Meteor server.

Start (or restart) your Webpack server

```bash
cd ..
webpack-dev-server
```

That's it, you can now import it in your code.

```javascript
import { SimpleSchema } from 'meteor/aldeed:collection2';

const BookSchema = new SimpleSchema({
  ...
});
```

## Vendor chunks

If you want to use the commonChunks plugin to create a separate vendor chunk and include meteor in it, use `'meteor-imports'`:

```javascript
module.exports = {
  entry: {
    app: './client/entry.js',
    vendor: ['react', 'meteor-imports', ...],
  },
  ...
  plugins: [
    new webpack.optimize.CommonsChunkPlugin('vendor', 'vendor.bundle.js')
  ]
};
```

The default Meteor bundle (without any external package, jQuery or Blaze) is 70Kb gzipped.

## Hot Module Replacement

If you want to work with HMR you need to add this to your entry file:

```javascript
if (module.hot) module.hot.accept();
```

*I am not a HMR expert so if you have a better idea of how to deal with it, let me know. It will be great to avoid reloading all the Meteor code on each change.*

## Examples

Webpack is a powerful but complex tool, with a non-friendly API, so reading code from examples is usually a great way to get you started.

- [ES5 imports in Wepack with Meteor 1.2 server](https://github.com/luisherranz/meteor-imports-webpack-plugin-examples/tree/master/es5-meteor1.2)
- [ES2015 imports in Wepack with Meteor 1.3 server](https://github.com/luisherranz/meteor-imports-webpack-plugin-examples/tree/master/es2015-meteor1.3)
- [ES2015 imports in Wepack with React, HMR and Meteor 1.3 server](https://github.com/luisherranz/meteor-imports-webpack-plugin-examples/tree/master/es2015-meteor1.3-react)

## App Skeletons

- **[Crater](https://github.com/jedwards1211/crater) from [@jedwards1211](https://github.com/jedwards1211)**: Meteor(/React) app skeleton that runs your userland code with pure Webpack/Babel instead of isobuild.

## The bad things

- **Dev servers**: if you add or remove Meteor packages, you have to restart your dev servers, both Webpack and Meteor.
- **Non used Meteor packages**: when you do `import 'meteor-imports'` all the meteor code is included in your bundle. If you are not using a package, is not enough to just not import it, you have to remove it from meteor: `meteor remove some:package`. This is not new, it's the way Meteor works.
- **Blaze**: it doesn't work because Blaze requires a spacebars transpiler to convert the html templates into javascript. I am sure a Webpack loader could be created for this, but anyway I recommend you to switch to React (from npm). If you want to try, I suggest you start with the [spacebars compiler](https://github.com/eface2face/meteor-spacebars-compiler) created (and used) by Sergio García (@murillo128).
- **Blaze related packages**: for the obvious same reasons, these don't work either.
- **Hot Code Push**: for development you don't need it because the Webpack's Hot Module Replacement is more convenient, but you won't have it for production either. I am sure it won't be hard to make it work so if you need it go ahead: I will accept the PR :)
- **Cordova**: Meteor cordova doesn't work but real [Cordova](http://cordova.apache.org/) does. The commands are pretty similar so don't worry.
- **Cordova Hot Code Push**: same here, but don't worry, you can use the excellent [CodePush](http://microsoft.github.io/code-push/) project from Microsoft.

Nothing else as far as I know.

## The good things

- **React Native**: I haven't tested it yet, but I don't see any reason you couldn't use this plugin to import Meteor packages in a React Native project. That means, you can work with the real Meteor tools. No more 3rd party ddpclient libraries!
- **No need for a separate Meteor fork**: I have seen other projects bringing Meteor to NPM but they fork and modify the real Meteor libraries, and therefore, they have to maintain separate codebases.
- **Atmosphere compatibility**: Same here, forked-projects don't work with any Meteor package out of the box. This plugin does.
- **Alternative core packages**: Until now, using a non-official core package was really difficult. With this plugin, we can create alternative core packages and substitute the official ones. For example, we could create a new Tracker package but based on [Mobx](http://mobxjs.github.io/mobx/) a superior TRP library. The API for this is not writen yet but it should be fairly easy. Open an issue if you are interested.

## Collaboration

If you want you can open issues or do PR's. I am not currently using this plugin at this moment, so I won't fix things or add new features. If you want something, do a PR.

## License

MIT, do whatever you want.

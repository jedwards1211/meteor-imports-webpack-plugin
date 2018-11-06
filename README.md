# Meteor Imports Webpack Plugin

This plugin bridges Meteor with Webpack and allows you to build Meteor apps with Webpack, and/or to import any Meteor package like if it was a standard NPM package. This is useful if:

- you want to use just some of the Meteor tools but have your "base" outside the Meteor ecosystem
- you want better build performance for client builds in Meteor apps, not least because of Hot Module Reload in Webpack
- you want source maps while using minification in production builds
- you want smaller build outputs and more control (e.g. tweaking minification and chunk separation) in client production builds for Meteor apps.

----

### Notes on versions/Webpack 4
For Webpack < 4, use version `^2.0.0`. See doumentation at https://github.com/jedwards1211/meteor-imports-webpack-plugin/blob/f76931e6c9ac59058d30d50d2633c7e0f6e95fe5/README.md
 
The rest of this page applies to Webpack >= 4, and version `^3.0.0`


## Get started (TL;DR)
Put your Meteor app in a subfolder called `meteor-app`

Install this plugin

```bash
npm install meteor-imports-webpack-plugin
```

Setup webpack and add to your `webpack.config.js`:

```javascript
const MeteorImportsWebpackPlugin = require('meteor-imports-webpack-plugin');
...
plugins: [
	new MeteorImportsWebpackPlugin({
	  meteorFolder: 'meteor-app'
	})
]
```

Then run:

```bash
# Start the webpack-dev-server in one terminal window.
./node_modules/.bin/webpack-dev-server # http://localhost:8080
# And the Meteor server in another.
cd meteor-app && meteor # http://localhost:3000
```

## How does it work

This plugin extracts the meteor packages from a **real meteor project**, which lives in a subfolder.  Your top-level project directory must *not* be a meteor project (that is, it should not contain a `.meteor` directory).

If you are going to use a Meteor server (only), then a good name could be `server`. If not, maybe just `meteor` or `app`. We'll stick to `meteor-app` for this guide.

```bash
cd my-project
meteor create meteor-app # create a real meteor project in the `meteor-app` folder
```

Then you can add or remove packages like you normally do in Meteor. You should remove each module that you don't need to make your bundle as small as possible.

```bash
cd meteor-app
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


And finally, you can include this import line in your client entry point. 

```javascript
require('meteor-imports'); // or import 'meteor-imports';
```

From version 3 of this plugin, this line isn't necessary, as long as you import anything beginning with "meteor", e.g. `import {Meteor} from "meteor/meteor"`. But in order to better control when Meteor (and packages) load, you can still include that line:

### Avoiding Meteor rebuilding the client
Typically you don't want Meteor to build your client files, now that you have a webpack setup to deal with that. One way to accomplish this is to create a directory structure with symlinks to only the server parts of your app. Thus we create a separate directory called `wp-server` for that purpose.

```bash
# We assume that the meteor app resides in "meteor-app"
mkdir wp-meteor-app
cd wp-meteor-app
ln -s ../meteor-app/server
ln -s ../meteor-app/both
ln -s ../meteor-app/imports
ln -s ../meteor-app/public
ln -s ../meteor-app/packages
ln -s ../meteor-app/node_modules
# Possibly more directories

# Then start it like usual with
meteor
```

If you run client build tools such as typescript you might also want to separate the `imports` directory in client/both/server and use the same symlinking principle to avoid Meteor building client-only changes.

Note that by still putting your client files in `meteor-app/client` or `meteor-app/imports/...` you can still be compatible with the Meteor build system when you choose to.

## Configuration options

The `config` object passed to the plugin must contain at least `meteorFolder` (or `meteorProgramsFolder`). For example:

```javascript
new MeteorImportsPlugin({
  meteorFolder: 'meteor-app',
  settingsFilePath: 'meteor-app/settings.json'
})
```

Only the options with names in capital letters will be passed directly to Meteor's `__meteor_runtime_config__` object. However, any additional options added by you not listed here will also be included. So that's a way of passing options not listed here.

All possible configuration options below

#### Basic setup
Configuration option|Default|Description
---|---|---|---|---
**`meteorFolder`**|(required)|The subfolder where your Meteor project is located. It can be an absolute path as well.
... OR **`meteorProgramsFolder`**| |(Overrides `meteorFolder`) the path to the `programs` folder within your `meteor` folder or the result of `meteor build --directory`.
**`settingsFilePath`**| |Provide a path to a Meteor settings file and this plugin will read the `public` property (just like Meteor) and provide it as normal on `Meteor.settings.public`. Note that by setting this property rather than `PUBLIC_SETTINGS` below you will get Hot Module Reload which resets `Meteor.settings.public` and webpack dependency set up on that file.
**`ddpDefaultConnectionPort `**|`3000`|no|...

#### Advanced setup
Configuration option|Default|Description
---|---|---|---|---
`injectMeteorRuntimeConfig `|`true`|If `injectMeteorRuntimeConfig` is `false`, `meteor-imports` will not set `window.__meteor_runtime_config__`, and you don't need to include any of the relevant variables like `ROOT_URL` in the options.  Use this option if you would like to inject `__meteor_runtime_config__` in your own SSR.
`DDP_DEFAULT_CONNECTION_URL `|The current base url, but with port `ddpDefaultConnectionPort`|This is the url Meteor uses to access the server.
`meteorEnv `|**webpack mode: "production"**<br>`{NODE_ENV: 'production'}`<br>**else**<br>`{}`|Meteor's "environment variables" in the browser
`PUBLIC_SETTINGS `| |The equivalent of the property `public` of [Meteor's settings.json](http://docs.meteor.com/#/full/meteor_settings) file. You can still use a `settings.json` for your server or even import it from Webpack:
`ROOT_URL `|The current base url|Used by e.g. [Meteor.absoluteUrl](https://docs.meteor.com/api/core.html#Meteor-absoluteUrl)

#### Excluding/Replacing packages
Certain packages can be excluded. Others can be replaced. By default, the `autoupdate` package is excluded (see below). For instance, you could use the following configuration:

```javascript
new MeteorImportsPlugin({
    meteorFolder: 'meteor-app,
    exclude: {
    	// 'global-imports': true,
    	reload: true,
    	'hwillson:stub-collections': true,
	    autoupdate: {mode:'development'},
        'ecmascript-runtime-client': '{Map,Symbol,Set}'
    },
    excludeGlobals: ['ecmascript-runtime-client', '_']
}
```

However, this is useful only for the core packages. If you don't to use a Meteor package you added, you should remove it using `meteor remove some:package`.

You can get a list of the currently used packages in your meteor `program.json` file:

```bash
cd meteor-app/.meteor/local/build/programs/web.browser/
cat program.json
```

Configuration option|Default|Description
---|---|---|---|---
`exclude`|`{autoupdate: true}`|Pass either `string[]` or `{[package:string]:(boolean|string)}`. Package names are keys, and values are either `true` (exclude), `false` (include), a `string` to replace the package with a specific javascript, or an object depending on mode.
`excludeGlobals`|`[]`|Type `string[]`. By default no globals are excluded and Meteor exposes many variables on `window`. You can exclude the `global-imports` package altogether through the `exclude` option, or provide a number of packages and/or variables here that you don't want to be exposed globally.
`logIncludedPackages `|`false`|This is helpful if you want to see the included packages listed in the webpack build output
`stripPackagesWithoutFiles `|`true`|By settings this option to `true`, all package files are matched to a regex to figure out if they actually contain javascript files. A lot of packages are server only but still result in some client files, revealing both the dependency and some unnecessary lines of javascript. By setting this option to `false` all files will be included.
`logPackagesWithoutFiles `|`false`|This is helpful if you want to see which packages are being stripped out by `stripPackagesWithoutFiles`


#### Autoupdate/Hot Module Reload
As you may have seen above, Meteor's autoupdate package (or Hot Module Reload, HMR) is disabled by default. This is because

1. During development you probably want to use HMR instead
2. During production it takes a little work to get it to work and we don't want you to end up with a ever-reloading page

With that said - in order to get it to work with Meteor's Hot Module Reload in production you must

- have the `HtmlWebpackPlugin` in your webpack build chain
- enable the `autoupdate` package (at least in production builds) according to above
- have the `emitAutoupdateVersion` set to `true` (default)
- note the built file `autoupdate_version` after each build. This file contains a hash that you need to provide when running Meteor server side. Like this:
```
AUTOUPDATE_VERSION=xxxxxxxxxxxxxxx meteor
```

The `autoupdate` package then compares this given hash with whatever's in the page. Provided you followed the steps above, they should match, until a new server is deployed and your page thereby reloaded.

Configuration option|Default|Description
---|---|---|---
`emitAutoupdateVersion `|`true`|Sets emission of a `autoupdate_version` file to the build output on, as well as injection of the meteor config variable `autoUpdateVersion`. **In order for this to work, the autoupdate package must be enabled**

## How to import packages

Importing packages work just like they do in Meteor. You can import any package (or included sub-module) in your code. Anything prefixed with "meteor/" will use the Meteor module system. Otherwise they will use the webpack's default resolution. Thus, importing `meteor/underscore` will be different from importing `underscore`. However, importing some modules might return the same actual module. Note that this plugin creates proxy module bridges  (1-liners) for all imported modules to return what Meteor's package system returns.

## How to add (or remove) a Meteor package

First, go to your Meteor folder and add (or remove) the package.

```bash
cd meteor-app
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

However, this accepts all code. Reloading code that adds new collections and similar will fail. In these scenarios you will have to decline (or manually reload) the hot update. In order to optimize your dev workflow a bit, you can add the following code to have Meteor's methods and Reload work better with HMR:

```javascript
import 'meteor-imports';
const Reload = window.Package.reload.Reload;
Reload._reload = () => {};

// Make methods work with reload
const mOrig = Meteor.methods;
Meteor.methods = function(methods) {
    for (let m of Object.keys(methods))
        delete Meteor.connection._methodHandlers[m];
    mOrig(methods);
};
```

## Production builds
If you want to use this plugins for production builds, you may want Meteor to serve the built files. The following webpack config should serve as a good start for such a configuration:

```js
module.exports = {
    mode: 'production',
    output: {
        path: path.join(root, 'meteor-app/public/wp'),
        filename: '[name].[hash].js',
        publicPath: '/wp',
    },
    plugins: [
	   new MeteorImportsWebpackPlugin({
	   		exclude: {autoupdate: false},
	   		ddpDefaultConnectionPort: 80
   		})
    ]
};
```

Server side you'd need the following code:

```js
WebApp.rawConnectHandlers.use((req, res, next) => {
    const ext = path.extname(req.url);
    if (req.method === 'GET' && !ext) {
        req.url = '/index.html';
    } else if (ext === '.map') {
        // Consider preventing access if you want
    }
    next();
})
```

The idea is then to

1. Run Meteor (possibly with --production)
2. Build using webpack
3. Build the Meteor app with the generated webpack content
4. Possibly running Meteor with environment variable `AUTOUPDATE_VERSION` read from webpack build output

Other things you might want to consider are:

- [ExtractTextPlugin](https://github.com/webpack-contrib/extract-text-webpack-plugin)
- inclusion of `autoupdate` package (see above)
- setting cache headers for webpack files

## Examples

**CAVEAT: The following examples have not been revised (yet) since the 2-3 version upgrade**

Webpack is a powerful but complex tool, with a non-friendly API, so reading code from examples is usually a great way to get you started.

- [ES5 imports in Wepack with Meteor 1.2 server](https://github.com/luisherranz/meteor-imports-webpack-plugin-examples/tree/master/es5-meteor1.2)
- [ES2015 imports in Wepack with Meteor 1.3 server](https://github.com/luisherranz/meteor-imports-webpack-plugin-examples/tree/master/es2015-meteor1.3)
- [ES2015 imports in Wepack with React, HMR and Meteor 1.3 server](https://github.com/luisherranz/meteor-imports-webpack-plugin-examples/tree/master/es2015-meteor1.3-react)

## App Skeletons

- **[Crater](https://github.com/jedwards1211/crater) from [@jedwards1211](https://github.com/jedwards1211)**: Meteor(/React) app skeleton that runs your userland code with pure Webpack/Babel instead of isobuild.

## The bad things

- **Non used Meteor packages**: when you do `import 'meteor-imports'` all the meteor code is included in your bundle. If you are not using a package, is not enough to just not import it, you have to remove it from meteor: `meteor remove some:package`. This is not new, it's the way Meteor works.
- **Blaze**: it doesn't work because Blaze requires a spacebars transpiler to convert the html templates into javascript. I am sure a Webpack loader could be created for this, but anyway I recommend you to switch to React (from npm). If you want to try, I suggest you start with the [spacebars compiler](https://github.com/eface2face/meteor-spacebars-compiler) created (and used) by Sergio García (@murillo128).
- **Blaze related packages**: for the obvious same reasons, these don't work either.
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

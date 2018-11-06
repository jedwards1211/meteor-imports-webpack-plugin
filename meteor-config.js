const _ = require('lodash');

function getSource(config, publicSettings) {
  let output = '';

  // Note that e.g. emitAutoupdateVersion may have defined the global config variable already
  if (config.injectMeteorRuntimeConfig !== false)
    output = 'var config = window.__meteor_runtime_config__ || (window.__meteor_runtime_config__ = {});\n';
  else
    output = 'var config = {}';

  const clientConfig = _.omit(config,
    'ddpDefaultConnectionPort',
    'emitAutoupdateVersion',
    'exclude',
    'excludeGlobals',
    'injectMeteorRuntimeConfig',
    'logIncludedPackages',
    'logPackagesWithoutFiles',
    'meteorFolder',
    'packages',
    'reload',
    'settingsFilePath',
    'stripPackagesWithoutFiles'
  );

  clientConfig.PUBLIC_SETTINGS = publicSettings || clientConfig.PUBLIC_SETTINGS || {};
  const jsonConfig = JSON.stringify(clientConfig);
  output += `Object.assign(config, ${jsonConfig});\n`;
  if (!config.DDP_DEFAULT_CONNECTION_URL) {
    const port = config.ddpDefaultConnectionPort;
    const portPart = port || 'window.location.port';
    output += 'config.DDP_DEFAULT_CONNECTION_URL = window.location.protocol + "//" + window.location.hostname + ":" + ' + portPart + ';\n';
  }
  if (!config.ROOT_URL) {
    output += 'config.ROOT_URL = window.location.protocol + "//" + window.location.host;\n';
  }
  if (clientConfig.PUBLIC_SETTINGS) {
    output += 'if (module.hot && typeof Meteor !== "undefined") Meteor.settings.public = config.PUBLIC_SETTINGS || {};\n'
  }

  return output;
}

module.exports = function(/*source*/) {
  const {config} = this.query;

  if (config.PUBLIC_SETTINGS || !config.settingsFilePath) {
    return getSource(config);
  } else {
    this.async();
    this.dependency(config.settingsFilePath);
    this.fs.readJson(config.settingsFilePath, (err, json) => {
      if (err) return this.callback(err);
      this.callback(null, getSource(config, json.public));
    });
  }
};

const NormalModule = require('webpack/lib/NormalModule');

class MeteorPackageModule extends NormalModule {
  shouldPreventParsing() {
    return true;
  }
}

module.exports = MeteorPackageModule;

const NormalModule = require('webpack/lib/NormalModule');

module.exports = class MeteorPackageBridgeModule extends NormalModule {
  constructor(request, nmf) {
    const type = "javascript/dynamic";
    const parser = nmf.getParser(type);
    const generator = nmf.getGenerator(type);
    super({type: type, request, resource: request, userRequest: request, parser, generator});
  }

  build(options, compilation, resolver, fs, callback) {
    super.build(options, compilation, resolver, /* fileSystem (only readFile required): */ this, callback);
  }

  readFile(path, cb) {
    return cb(null, `module.exports = require("meteor-imports")("${path}");`);
  }
};

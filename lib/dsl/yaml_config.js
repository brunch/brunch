(function() {
  var dsl, fs, path, util, yaml, _;
  _ = require("underscore");
  yaml = require("yaml");
  fs = require("fs");
  path = require("path");
  util = require("util");
  dsl = require("./index");
  exports.YamlConfig = (function() {
    function YamlConfig(path, options) {
      this.path = path;
      this.options = options;
      this.data = yaml.eval(fs.readFileSync(path, "utf8"));
    }
    YamlConfig.prototype.toOptions = function() {
      var config_string, _base, _ref;
      _.defaults(this.data, this.options.stitch);
      if ((_ref = (_base = this.data).buildPath) == null) {
        _base.buildPath = 'build';
      }
      config_string = "buildPath('" + this.data.buildPath + "')\nfiles([/\\.styl$/]).use('stylus').output('web/css/main.css')\nfiles([/\\.coffee$/, /src\\/.*\\.js$/, new RegExp(\"" + this.data.templateExtension + "$\")])\n  .use('stitch', { minify: " + this.data.minify + ", dependencies: " + (util.inspect(this.data.dependencies)) + " })\n  .output('web/js/app.js')";
      return dsl.run(config_string);
    };
    return YamlConfig;
  })();
}).call(this);

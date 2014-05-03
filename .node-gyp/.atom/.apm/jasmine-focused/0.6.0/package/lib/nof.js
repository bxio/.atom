(function() {
  var path, replace, _,
    __slice = [].slice;

  path = require('path');

  replace = require('replace');

  _ = require('underscore');

  module.exports = function() {
    var paths;
    paths = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    paths = _.flatten(paths);
    if (paths.length === 0) {
      paths = ['spec'];
    }
    paths = paths.map(function(directory) {
      return path.resolve(process.cwd(), directory);
    });
    return replace({
      regex: '^(\\s*)f+(it|describe)(\\s+)',
      replacement: '$1$2$3',
      include: '*.coffee',
      paths: paths,
      recursive: true,
      silent: true,
      multiline: true
    });
  };

}).call(this);

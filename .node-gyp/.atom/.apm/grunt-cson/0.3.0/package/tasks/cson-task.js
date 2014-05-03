(function() {
  var CoffeeScript, path, _;

  path = require('path');

  _ = require('underscore');

  CoffeeScript = require('coffee-script');

  module.exports = function(grunt) {
    return grunt.registerMultiTask('cson', 'Compile CSON files to JSON', function() {
      var content, destination, error, fileCount, json, mapping, rootObject, source, sourceData, _i, _len, _ref, _ref1;
      rootObject = (_ref = this.options().rootObject) != null ? _ref : false;
      _ref1 = this.files;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        mapping = _ref1[_i];
        source = mapping.src[0];
        destination = mapping.dest;
        try {
          sourceData = grunt.file.read(source, 'utf8');
          content = CoffeeScript["eval"](sourceData, {
            bare: true,
            sandbox: true
          });
          if (rootObject && (!_.isObject(content) || _.isArray(content))) {
            grunt.log.error("" + source + " does not contain a root object");
            return false;
          }
          json = JSON.stringify(content, null, 2);
          grunt.file.write(destination, "" + json + "\n");
          grunt.log.writeln("File " + destination.cyan + " created.");
        } catch (_error) {
          error = _error;
          grunt.log.error("Parsing " + source.cyan + " failed: " + error.message);
          return false;
        }
      }
      fileCount = this.files.length;
      return grunt.log.ok("" + fileCount + " " + (grunt.util.pluralize(fileCount, 'file/files')) + " compiled to JSON.");
    });
  };

}).call(this);

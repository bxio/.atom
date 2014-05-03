(function() {
  var CoffeeScript, path, _;

  path = require('path');

  _ = require('underscore');

  CoffeeScript = require('coffee-script');

  module.exports = function(grunt) {
    return grunt.registerMultiTask('cson', 'Compile CSON files to JSON', function() {
      var content, destination, end, error, errorLine, fileCount, json, lineNumber, lines, location, mapping, message, rootObject, source, sourceData, start, _i, _j, _len, _ref, _ref1;
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
            grunt.log.error("" + source.yellow + " does not contain a root object.");
            return false;
          }
          json = JSON.stringify(content, null, 2);
          grunt.file.write(destination, "" + json + "\n");
          grunt.log.writeln("File " + destination.cyan + " created.");
        } catch (_error) {
          error = _error;
          grunt.log.writeln("Parsing " + source.yellow + " failed.");
          message = error.message, location = error.location;
          if (message) {
            grunt.log.error(message.red);
          }
          if (location != null) {
            start = error.location.first_line;
            end = error.location.last_line;
            lines = sourceData.split('\n');
            for (lineNumber = _j = start; start <= end ? _j <= end : _j >= end; lineNumber = start <= end ? ++_j : --_j) {
              errorLine = lines[lineNumber];
              if (errorLine == null) {
                continue;
              }
              grunt.log.error("" + (lineNumber + 1) + ": " + lines[lineNumber]);
            }
          }
          return false;
        }
      }
      fileCount = this.files.length;
      return grunt.log.ok("" + fileCount + " " + (grunt.util.pluralize(fileCount, 'file/files')) + " compiled to JSON.");
    });
  };

}).call(this);

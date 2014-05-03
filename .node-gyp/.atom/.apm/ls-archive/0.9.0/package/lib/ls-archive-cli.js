(function() {
  var archive, async, optimist, path;

  path = require('path');

  optimist = require('optimist');

  async = require('async');

  archive = require('./ls-archive');

  module.exports = function() {
    var files, queue;
    files = optimist.usage('Usage: lsa [file ...]').demand(1).argv._;
    queue = async.queue(function(archivePath, callback) {
      return (function(archivePath) {
        return archive.list(archivePath, function(error, files) {
          var file, index, prefix, _i, _len;
          if (error != null) {
            console.error("Error reading: " + archivePath);
          } else {
            console.log("" + archivePath + " (" + files.length + ")");
            for (index = _i = 0, _len = files.length; _i < _len; index = ++_i) {
              file = files[index];
              if (index === files.length - 1) {
                prefix = '\u2514\u2500\u2500 ';
              } else {
                prefix = '\u251C\u2500\u2500 ';
              }
              console.log("" + prefix + (file.getPath()));
            }
            console.log();
          }
          return callback();
        });
      })(archivePath);
    });
    return files.forEach(function(file) {
      return queue.push(path.resolve(process.cwd(), file));
    });
  };

}).call(this);

// Generated by CoffeeScript 1.6.2
var Fs, Path, defaultOptions, emoji, emojiFolder, marked, taskLists;

Fs = require('fs');

Path = require('path');

marked = require('marked');

emoji = require('emoji-images');

taskLists = require('task-lists');

emojiFolder = Path.dirname(require.resolve('emoji-images')) + "/pngs";

defaultOptions = {
  isFile: false
};

module.exports = function(file, opts, callback) {
  var conversion, key, options, _ref,
    _this = this;

  conversion = function(data) {
    var contents, emojified, mdToHtml;

    emojified = emoji(data, emojiFolder, 20);
    mdToHtml = marked(emojified);
    return contents = taskLists(mdToHtml);
  };
  options = {};
  if (typeof opts === 'function') {
    _ref = [defaultOptions, opts], options = _ref[0], callback = _ref[1];
  } else {
    for (key in opts) {
      options[key] = opts[key];
    }
  }
  marked.setOptions(options);
  if (options.isFile) {
    return Fs.readFile(file, "utf8", function(err, data) {
      return callback(null, conversion(data));
    });
  } else {
    return callback(null, conversion(file));
  }
};

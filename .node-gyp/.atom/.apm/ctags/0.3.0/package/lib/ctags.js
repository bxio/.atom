(function() {
  var ctags;

  ctags = require('bindings')('ctags.node');

  exports.findTags = ctags.findTags;

  exports.getTags = ctags.getTags;

}).call(this);

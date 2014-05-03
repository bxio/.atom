(function() {
  var OnigRegExp, OnigScanner;

  OnigScanner = require('bindings')('onig_scanner.node').OnigScanner;

  module.exports = OnigRegExp = (function() {

    function OnigRegExp(source) {
      this.source = source;
      this.scanner = new OnigScanner([this.source]);
    }

    OnigRegExp.prototype.search = function(string, startPosition) {
      var captureIndices, captures, end, index, result, start;
      if (startPosition == null) {
        startPosition = 0;
      }
      if (!(result = this.scanner.findNextMatch(string, startPosition))) {
        return null;
      }
      captureIndices = result.captureIndices;
      captures = [];
      captures.index = captureIndices[1];
      captures.indices = [];
      while (captureIndices.length) {
        index = captureIndices.shift();
        start = captureIndices.shift();
        end = captureIndices.shift();
        captures.push(string.slice(start, end));
        captures.indices.push(start);
      }
      return captures;
    };

    OnigRegExp.prototype.test = function(string) {
      return this.search(string) != null;
    };

    return OnigRegExp;

  })();

}).call(this);

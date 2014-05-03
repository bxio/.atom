(function() {
  var CSSLint, Parser, async, defaultLessOptions, findLessMapping, findPropertyLineNumber, getLessLineNumber, getPropertyName, isFileError, lintCss, parseLess, path, _ref;

  CSSLint = require('csslint').CSSLint;

  Parser = require('less').Parser;

  _ref = require('./lint-utils'), findLessMapping = _ref.findLessMapping, findPropertyLineNumber = _ref.findPropertyLineNumber, getPropertyName = _ref.getPropertyName;

  async = require('async');

  path = require('path');

  defaultLessOptions = {
    compress: false,
    dumpLineNumbers: 'comments',
    optimization: null,
    syncImport: true,
    yuicompress: false
  };

  parseLess = function(grunt, file, options, callback) {
    var configLessOptions, less, lessOptions, parser, _ref1;
    configLessOptions = (_ref1 = options.less) != null ? _ref1 : grunt.config.get('less.options');
    lessOptions = grunt.util._.extend({
      filename: file
    }, configLessOptions, defaultLessOptions);
    if (less = grunt.file.read(file)) {
      parser = new Parser(lessOptions);
      return parser.parse(less, function(error, tree) {
        if (error != null) {
          return callback(error);
        } else {
          return callback(null, less, tree.toCSS());
        }
      });
    } else {
      return callback(null, '', '');
    }
  };

  lintCss = function(grunt, css, options, callback) {
    var cssLintOptions, enabled, id, results, rules, _ref1, _ref2;
    if (!css) {
      callback(null, []);
      return;
    }
    rules = {};
    CSSLint.getRules().forEach(function(_arg) {
      var id;
      id = _arg.id;
      return rules[id] = 1;
    });
    cssLintOptions = (_ref1 = options.csslint) != null ? _ref1 : grunt.config.get('csslint.options');
    for (id in cssLintOptions) {
      enabled = cssLintOptions[id];
      if (cssLintOptions[id]) {
        rules[id] = cssLintOptions[id];
      } else {
        delete rules[id];
      }
    }
    results = CSSLint.verify(css, rules);
    if (((_ref2 = results.messages) != null ? _ref2.length : void 0) > 0) {
      return callback(null, results.messages);
    } else {
      return callback(null, []);
    }
  };

  getLessLineNumber = function(css, less, file, line) {
    var cssLines, cssPropertyName, filePath, lessLines, lineNumber, propertyNameLineNumber, _ref1;
    cssLines = css.split('\n');
    if (!((0 <= line && line < cssLines.length))) {
      return -1;
    }
    _ref1 = findLessMapping(cssLines, line), lineNumber = _ref1.lineNumber, filePath = _ref1.filePath;
    if (filePath !== path.resolve(process.cwd(), file)) {
      return -1;
    }
    lessLines = less.split('\n');
    if ((0 <= lineNumber && lineNumber < lessLines.length)) {
      if (cssPropertyName = getPropertyName(cssLines[line])) {
        propertyNameLineNumber = findPropertyLineNumber(lessLines, lineNumber, cssPropertyName);
        if (propertyNameLineNumber >= 0) {
          lineNumber = propertyNameLineNumber;
        }
      }
    }
    if ((0 <= lineNumber && lineNumber < lessLines.length)) {
      return lineNumber;
    } else {
      return -1;
    }
  };

  isFileError = function(file, css, line) {
    var filePath;
    filePath = findLessMapping(css, line).filePath;
    return filePath === path.resolve(process.cwd(), file);
  };

  module.exports = function(grunt) {
    return grunt.registerMultiTask('lesslint', 'Validate LESS files with CSS Lint', function() {
      var done, errorCount, fileCount, options, queue;
      options = this.options();
      fileCount = 0;
      errorCount = 0;
      queue = async.queue(function(file, callback) {
        grunt.verbose.write("Linting '" + file + "'");
        fileCount++;
        return parseLess(grunt, file, options, function(error, less, css) {
          if (error != null) {
            errorCount++;
            grunt.log.writeln("Error parsing " + file.yellow);
            grunt.log.writeln(error.message);
            return;
          }
          return lintCss(grunt, css, options, function(error, messages) {
            var cssLine, errorPrefix, fullRuleMessage, lessLineNumber, line, rule, ruleMessage, ruleMessages, _i, _len;
            if (messages == null) {
              messages = [];
            }
            messages = messages.filter(function(message) {
              return isFileError(file, css, message.line - 1);
            });
            if (messages.length > 0) {
              grunt.log.writeln("" + file.yellow + " (" + messages.length + ")");
              messages = grunt.util._.groupBy(messages, function(_arg) {
                var message;
                message = _arg.message;
                return message;
              });
              for (ruleMessage in messages) {
                ruleMessages = messages[ruleMessage];
                rule = ruleMessages[0].rule;
                fullRuleMessage = "" + ruleMessage + " ";
                if (rule.desc && rule.desc !== ruleMessage) {
                  fullRuleMessage += "" + rule.desc + " ";
                }
                grunt.log.writeln(fullRuleMessage + ("(" + rule.id + ")").grey);
                for (_i = 0, _len = ruleMessages.length; _i < _len; _i++) {
                  line = ruleMessages[_i].line;
                  line--;
                  errorCount++;
                  if (line < 0) {
                    continue;
                  }
                  lessLineNumber = getLessLineNumber(css, less, file, line);
                  if (lessLineNumber >= 0) {
                    errorPrefix = ("" + (lessLineNumber + 1) + ":").yellow;
                    grunt.log.error("" + errorPrefix + " " + (less.split('\n')[lessLineNumber].trim()));
                  } else {
                    cssLine = css.split('\n')[line];
                    if (cssLine != null) {
                      errorPrefix = ("" + (line + 1) + ":").yellow;
                      grunt.log.error("" + errorPrefix + " " + (cssLine.trim()));
                    }
                    grunt.log.writeln(("Failed to find map CSS line " + (line + 1) + " to a LESS line.").yellow);
                  }
                }
              }
            }
            return callback();
          });
        });
      });
      this.filesSrc.forEach(function(file) {
        return queue.push(file);
      });
      done = this.async();
      return queue.drain = function() {
        if (errorCount === 0) {
          grunt.log.ok("" + fileCount + " " + (grunt.util.pluralize(fileCount, 'file/files')) + " lint free.");
          return done();
        } else {
          grunt.log.writeln();
          grunt.log.error("" + errorCount + " lint " + (grunt.util.pluralize(errorCount, 'error/errors')) + " in " + fileCount + " " + (grunt.util.pluralize(fileCount, 'file/files')) + ".");
          return done(false);
        }
      };
    });
  };

}).call(this);

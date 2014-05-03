(function() {
  var exists, fs, multiplyString, parseObject, path, stringifyArray, stringifyBoolean, stringifyIndent, stringifyNull, stringifyNumber, stringifyObject, stringifyString, _;

  fs = require('fs');

  path = require('path');

  _ = require('underscore');

  multiplyString = function(string, n) {
    return new Array(1 + n).join(string);
  };

  stringifyIndent = function(level) {
    if (level == null) {
      level = 0;
    }
    return multiplyString(' ', Math.max(level, 0));
  };

  stringifyString = function(string) {
    string = JSON.stringify(string);
    string = string.slice(1, -1);
    string = string.replace(/\\"/g, '"');
    string = string.replace(/'/g, '\\\'');
    return "'" + string + "'";
  };

  stringifyBoolean = function(boolean) {
    return "" + boolean;
  };

  stringifyNumber = function(number) {
    return "" + number;
  };

  stringifyNull = function() {
    return 'null';
  };

  stringifyArray = function(array, indentLevel) {
    var cson, indent, value, _i, _len;

    if (indentLevel == null) {
      indentLevel = 0;
    }
    if (array.length === 0) {
      return '[]';
    }
    cson = '[\n';
    for (_i = 0, _len = array.length; _i < _len; _i++) {
      value = array[_i];
      indent = stringifyIndent(indentLevel + 2);
      cson += indent;
      if (_.isString(value)) {
        cson += stringifyString(value);
      } else if (_.isBoolean(value)) {
        cson += stringifyBoolean(value);
      } else if (_.isNumber(value)) {
        cson += stringifyNumber(value);
      } else if (_.isNull(value) || value === void 0) {
        cson += stringifyNull(value);
      } else if (_.isArray(value)) {
        cson += stringifyArray(value, indentLevel + 2);
      } else if (_.isObject(value)) {
        cson += "{\n" + (stringifyObject(value, indentLevel + 4)) + "\n" + indent + "}";
      } else {
        throw new Error("Unrecognized type for array value: " + value);
      }
      cson += '\n';
    }
    return "" + cson + (stringifyIndent(indentLevel)) + "]";
  };

  stringifyObject = function(object, indentLevel) {
    var cson, key, prefix, value;

    if (indentLevel == null) {
      indentLevel = 0;
    }
    if (_.isEmpty(object)) {
      return '{}';
    }
    cson = '';
    prefix = '';
    for (key in object) {
      value = object[key];
      if (value === void 0) {
        continue;
      }
      if (_.isFunction(value)) {
        throw new Error("Function specified as value to key: " + key);
      }
      cson += "" + prefix + (stringifyIndent(indentLevel)) + "'" + key + "':";
      if (_.isString(value)) {
        cson += " " + (stringifyString(value));
      } else if (_.isBoolean(value)) {
        cson += " " + (stringifyBoolean(value));
      } else if (_.isNumber(value)) {
        cson += " " + (stringifyNumber(value));
      } else if (_.isNull(value)) {
        cson += " " + (stringifyNull(value));
      } else if (_.isArray(value)) {
        cson += " " + (stringifyArray(value, indentLevel));
      } else if (_.isObject(value)) {
        if (_.isEmpty(value)) {
          cson += ' {}';
        } else {
          cson += "\n" + (stringifyObject(value, indentLevel + 2));
        }
      } else {
        throw new Error("Unrecognized value type for key: " + key + " with value: " + value);
      }
      prefix = '\n';
    }
    return cson;
  };

  parseObject = function(objectPath, contents) {
    var CoffeeScript;

    if (path.extname(objectPath) === '.cson') {
      CoffeeScript = require('coffee-script');
      return CoffeeScript["eval"](contents, {
        bare: true,
        sandbox: true
      });
    } else {
      return JSON.parse(contents);
    }
  };

  exists = function(objectPath) {
    var e;

    try {
      return fs.statSync(objectPath).isFile();
    } catch (_error) {
      e = _error;
      return false;
    }
  };

  module.exports = {
    isObjectPath: function(objectPath) {
      var extension;

      if (!objectPath) {
        return false;
      }
      extension = path.extname(objectPath);
      return extension === '.cson' || extension === '.json';
    },
    resolve: function(objectPath) {
      var csonPath, jsonPath;

      if (this.isObjectPath(objectPath) && exists(objectPath)) {
        return objectPath;
      }
      csonPath = "" + objectPath + ".cson";
      if (this.isObjectPath(csonPath) && exists(csonPath)) {
        return csonPath;
      }
      jsonPath = "" + objectPath + ".json";
      if (this.isObjectPath(jsonPath) && exists(jsonPath)) {
        return jsonPath;
      }
      return null;
    },
    readFileSync: function(objectPath) {
      return parseObject(objectPath, fs.readFileSync(objectPath, 'utf8'));
    },
    readFile: function(objectPath, callback) {
      var _this = this;

      return fs.readFile(objectPath, 'utf8', function(error, contents) {
        var parseError;

        if (error != null) {
          return typeof callback === "function" ? callback(error) : void 0;
        } else {
          try {
            return typeof callback === "function" ? callback(null, parseObject(objectPath, contents)) : void 0;
          } catch (_error) {
            parseError = _error;
            return typeof callback === "function" ? callback(parseError) : void 0;
          }
        }
      });
    },
    writeFileSync: function(objectPath, object) {
      var content;

      if (path.extname(objectPath) === '.cson') {
        content = this.stringify(object);
      } else {
        content = JSON.stringify(object, void 0, 2);
      }
      return fs.writeFileSync(objectPath, "" + content + "\n");
    },
    stringify: function(object) {
      if (object === void 0) {
        throw new Error("Cannot stringify undefined object");
      }
      if (_.isFunction(object)) {
        throw new Error("Cannot stringify function: " + object);
      }
      if (_.isString(object)) {
        return stringifyString(object);
      }
      if (_.isBoolean(object)) {
        return stringifyBoolean(object);
      }
      if (_.isNumber(object)) {
        return stringifyNumber(object);
      }
      if (_.isNull(object)) {
        return stringifyNull(object);
      }
      if (_.isArray(object)) {
        return stringifyArray(object);
      }
      if (_.isObject(object)) {
        return stringifyObject(object);
      }
      throw new Error("Unrecognized type to stringify: " + object);
    }
  };

}).call(this);

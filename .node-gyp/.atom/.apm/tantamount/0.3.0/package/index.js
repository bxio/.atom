(function() {
  var isEqual, _, _isEqual;

  _ = require('underscore');

  _isEqual = _.isEqual;

  isEqual = function(a, b, aStack, bStack) {
    var aCtor, aCtorValid, aElement, aKeyCount, aValue, bCtor, bCtorValid, bKeyCount, bValue, equal, i, key, stackIndex, _i, _len;
    if (aStack == null) {
      aStack = [];
    }
    if (bStack == null) {
      bStack = [];
    }
    if (a === b) {
      return _isEqual(a, b);
    }
    if (_.isFunction(a) || _.isFunction(b)) {
      return _isEqual(a, b);
    }
    if (_.isFunction(a != null ? a.isEqual : void 0)) {
      return a.isEqual(b);
    }
    if (_.isFunction(b != null ? b.isEqual : void 0)) {
      return b.isEqual(a);
    }
    stackIndex = aStack.length;
    while (stackIndex--) {
      if (aStack[stackIndex] === a) {
        return bStack[stackIndex] === b;
      }
    }
    aStack.push(a);
    bStack.push(b);
    equal = false;
    if (_.isArray(a) && _.isArray(b) && a.length === b.length) {
      equal = true;
      for (i = _i = 0, _len = a.length; _i < _len; i = ++_i) {
        aElement = a[i];
        if (!isEqual(aElement, b[i], aStack, bStack)) {
          equal = false;
          break;
        }
      }
    } else if (_.isObject(a) && _.isObject(b)) {
      aCtor = a.constructor;
      bCtor = b.constructor;
      aCtorValid = _.isFunction(aCtor) && aCtor instanceof aCtor;
      bCtorValid = _.isFunction(bCtor) && bCtor instanceof bCtor;
      if (aCtor !== bCtor && !(aCtorValid && bCtorValid)) {
        equal = false;
      } else {
        aKeyCount = 0;
        equal = true;
        for (key in a) {
          aValue = a[key];
          if (!_.has(a, key)) {
            continue;
          }
          aKeyCount++;
          if (!(_.has(b, key) && isEqual(aValue, b[key], aStack, bStack))) {
            equal = false;
            break;
          }
        }
        if (equal) {
          bKeyCount = 0;
          for (key in b) {
            bValue = b[key];
            if (_.has(b, key)) {
              bKeyCount++;
            }
          }
          equal = aKeyCount === bKeyCount;
        }
      }
    } else {
      equal = _isEqual(a, b);
    }
    aStack.pop();
    bStack.pop();
    return equal;
  };

  module.exports = function(a, b) {
    return isEqual(a, b);
  };

}).call(this);

(function() {
  var EventEmitter, HandleWatcher, PathWatcher, binding, fs, handleWatchers,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  binding = require('bindings')('pathwatcher.node');

  EventEmitter = require('events').EventEmitter;

  fs = require('fs');

  handleWatchers = {};

  binding.setCallback(function(event, handle, path) {
    var _ref;

    return (_ref = handleWatchers[handle]) != null ? _ref.onEvent(event, path) : void 0;
  });

  HandleWatcher = (function(_super) {
    __extends(HandleWatcher, _super);

    function HandleWatcher(path) {
      this.path = path;
      this.start();
    }

    HandleWatcher.prototype.onEvent = function(event, path) {
      var detectRename,
        _this = this;

      switch (event) {
        case 'rename':
          this.close();
          detectRename = function() {
            return fs.stat(_this.path, function(err) {
              if (err) {
                _this.path = path;
                _this.start();
                return _this.emit('change', 'rename', path);
              } else {
                _this.start();
                return _this.emit('change', 'change', null);
              }
            });
          };
          return setTimeout(detectRename, 100);
        case 'delete':
          this.emit('change', 'delete', null);
          return this.close();
        default:
          return this.emit('change', event, path);
      }
    };

    HandleWatcher.prototype.start = function() {
      this.handle = binding.watch(this.path);
      return handleWatchers[this.handle] = this;
    };

    HandleWatcher.prototype.closeIfNoListener = function() {
      if (this.listeners('change').length === 0) {
        return this.close();
      }
    };

    HandleWatcher.prototype.close = function() {
      if (handleWatchers[this.handle] != null) {
        binding.unwatch(this.handle);
        return delete handleWatchers[this.handle];
      }
    };

    return HandleWatcher;

  })(EventEmitter);

  PathWatcher = (function(_super) {
    __extends(PathWatcher, _super);

    PathWatcher.prototype.handleWatcher = null;

    function PathWatcher(path, callback) {
      var handle, watcher, _ref,
        _this = this;

      for (handle in handleWatchers) {
        watcher = handleWatchers[handle];
        if (watcher.path === path) {
          this.handleWatcher = watcher;
          break;
        }
      }
      if ((_ref = this.handleWatcher) == null) {
        this.handleWatcher = new HandleWatcher(path);
      }
      this.onChange = function(event, path) {
        if (typeof callback === 'function') {
          callback.call(_this, event, path);
        }
        return _this.emit('change', event, path);
      };
      this.handleWatcher.on('change', this.onChange);
    }

    PathWatcher.prototype.close = function() {
      this.handleWatcher.removeListener('change', this.onChange);
      return this.handleWatcher.closeIfNoListener();
    };

    return PathWatcher;

  })(EventEmitter);

  exports.watch = function(path, callback) {
    path = require('path').resolve(path);
    return new PathWatcher(path, callback);
  };

  exports.closeAllWatchers = function() {
    var handle, watcher;

    for (handle in handleWatchers) {
      watcher = handleWatchers[handle];
      watcher.close();
    }
    return handleWatchers = {};
  };

  exports.getWatchedPaths = function() {
    var handle, paths, watcher;

    paths = [];
    for (handle in handleWatchers) {
      watcher = handleWatchers[handle];
      paths.push(watcher.path);
    }
    return paths;
  };

}).call(this);

(function() {
  var ArchiveEntry, convertToTree, fs, isGzipPath, isTarPath, isZipPath, listGzip, listTar, listTarStream, listZip, path, readEntry, readFileFromGzip, readFileFromTar, readFileFromTarStream, readFileFromZip, util, wrapCallback, _;

  fs = require('fs');

  path = require('path');

  util = require('util');

  _ = require('underscore');

  ArchiveEntry = (function() {

    function ArchiveEntry(path, type) {
      this.path = path;
      this.type = type;
      if (this.isDirectory()) {
        this.children = [];
      }
    }

    ArchiveEntry.prototype.add = function(entry) {
      var child, name, segments;
      if (!this.isParentOf(entry)) {
        return false;
      }
      segments = entry.getPath().substring(this.getPath().length + 1).split('/');
      if (segments.length === 0) {
        return false;
      }
      if (segments.length === 1) {
        this.children.push(entry);
        return true;
      } else {
        name = segments[0];
        child = _.find(this.children, function(child) {
          return name === child.getName();
        });
        if (child == null) {
          child = new ArchiveEntry("" + (this.getPath()) + "/" + name, 5);
          this.children.push(child);
        }
        if (child.isDirectory()) {
          return child.add(entry);
        } else {
          return false;
        }
      }
    };

    ArchiveEntry.prototype.isParentOf = function(entry) {
      return this.isDirectory() && entry.getPath().indexOf("" + (this.getPath()) + "/") === 0;
    };

    ArchiveEntry.prototype.getPath = function() {
      return this.path;
    };

    ArchiveEntry.prototype.getName = function() {
      return path.basename(this.path);
    };

    ArchiveEntry.prototype.isFile = function() {
      return this.type === 0;
    };

    ArchiveEntry.prototype.isDirectory = function() {
      return this.type === 5;
    };

    ArchiveEntry.prototype.isSymbolicLink = function() {
      return this.type === 2;
    };

    ArchiveEntry.prototype.toString = function() {
      return this.getPath();
    };

    return ArchiveEntry;

  })();

  convertToTree = function(entries) {
    var entry, name, parent, rootEntries, segments, _i, _len;
    rootEntries = [];
    for (_i = 0, _len = entries.length; _i < _len; _i++) {
      entry = entries[_i];
      segments = entry.getPath().split('/');
      if (segments.length === 1) {
        rootEntries.push(entry);
      } else {
        name = segments[0];
        parent = _.find(rootEntries, function(root) {
          return name === root.getName();
        });
        if (parent == null) {
          parent = new ArchiveEntry(name, 5);
          rootEntries.push(parent);
        }
        parent.add(entry);
      }
    }
    return rootEntries;
  };

  wrapCallback = function(callback) {
    var called;
    called = false;
    return function(error, data) {
      if (!called) {
        if ((error != null) && !util.isError(error)) {
          error = new Error(error);
        }
        called = true;
        return callback(error, data);
      }
    };
  };

  listZip = function(archivePath, options, callback) {
    var entries, fileStream, unzip, zipStream;
    unzip = require('unzip');
    entries = [];
    fileStream = fs.createReadStream(archivePath);
    fileStream.on('error', callback);
    zipStream = fileStream.pipe(unzip.Parse());
    zipStream.on('close', function() {
      if (options.tree) {
        entries = convertToTree(entries);
      }
      return callback(null, entries);
    });
    zipStream.on('error', callback);
    return zipStream.on('entry', function(entry) {
      var entryPath, entryType;
      if (entry.path.slice(-1) === '/') {
        entryPath = entry.path.slice(0, -1);
      } else {
        entryPath = entry.path;
      }
      switch (entry.type) {
        case 'Directory':
          entryType = 5;
          break;
        case 'File':
          entryType = 0;
          break;
        default:
          entryType = -1;
      }
      entries.push(new ArchiveEntry(entryPath, entryType));
      return entry.autodrain();
    });
  };

  listGzip = function(archivePath, options, callback) {
    var fileStream, gzipStream, zlib;
    zlib = require('zlib');
    fileStream = fs.createReadStream(archivePath);
    fileStream.on('error', callback);
    gzipStream = fileStream.pipe(zlib.createGunzip());
    gzipStream.on('error', callback);
    return listTarStream(gzipStream, options, callback);
  };

  listTar = function(archivePath, options, callback) {
    var fileStream;
    fileStream = fs.createReadStream(archivePath);
    fileStream.on('error', callback);
    return listTarStream(fileStream, options, callback);
  };

  listTarStream = function(inputStream, options, callback) {
    var entries, tarStream;
    entries = [];
    tarStream = inputStream.pipe(require('tar').Parse());
    tarStream.on('error', callback);
    tarStream.on('entry', function(entry) {
      var entryPath, entryType;
      if (entry.props.path.slice(-1) === '/') {
        entryPath = entry.props.path.slice(0, -1);
      } else {
        entryPath = entry.props.path;
      }
      entryType = parseInt(entry.props.type);
      return entries.push(new ArchiveEntry(entryPath, entryType));
    });
    return tarStream.on('end', function() {
      if (options.tree) {
        entries = convertToTree(entries);
      }
      return callback(null, entries);
    });
  };

  readFileFromZip = function(archivePath, filePath, callback) {
    var fileStream, zipStream;
    fileStream = fs.createReadStream(archivePath);
    fileStream.on('error', callback);
    zipStream = fileStream.pipe(require('unzip').Parse());
    zipStream.on('close', function() {
      return callback("" + filePath + " does not exist in the archive: " + archivePath);
    });
    zipStream.on('error', callback);
    return zipStream.on('entry', function(entry) {
      if (filePath === entry.path) {
        if (entry.type === 'File') {
          return readEntry(entry, callback);
        } else {
          callback("" + filePath + " is a folder in the archive: " + archivePath);
          return entry.autodrain();
        }
      } else {
        return entry.autodrain();
      }
    });
  };

  readFileFromGzip = function(archivePath, filePath, callback) {
    var fileStream, gzipStream;
    fileStream = fs.createReadStream(archivePath);
    fileStream.on('error', callback);
    gzipStream = fileStream.pipe(require('zlib').createGunzip());
    gzipStream.on('error', callback);
    gzipStream.on('end', function() {
      return callback("" + filePath + " does not exist in the archive: " + archivePath);
    });
    return readFileFromTarStream(gzipStream, archivePath, filePath, callback);
  };

  readFileFromTar = function(archivePath, filePath, callback) {
    var fileStream;
    fileStream = fs.createReadStream(archivePath, callback);
    fileStream.on('error', callback);
    fileStream.on('end', function() {
      return callback("" + filePath + " does not exist in the archive: " + archivePath);
    });
    return readFileFromTarStream(fileStream, archivePath, filePath, callback);
  };

  readFileFromTarStream = function(inputStream, archivePath, filePath, callback) {
    var tar, tarStream;
    tar = require('tar');
    tarStream = inputStream.pipe(tar.Parse());
    tarStream.on('error', callback);
    return tarStream.on('entry', function(entry) {
      if (filePath !== entry.props.path) {
        return;
      }
      if (entry.props.type === '0') {
        return readEntry(entry, callback);
      } else {
        return callback("" + filePath + " is not a normal file in the archive: " + archivePath);
      }
    });
  };

  readEntry = function(entry, callback) {
    var contents;
    contents = [];
    entry.on('data', function(data) {
      return contents.push(data);
    });
    return entry.on('end', function() {
      return callback(null, Buffer.concat(contents).toString());
    });
  };

  isTarPath = function(archivePath) {
    return path.extname(archivePath) === '.tar';
  };

  isZipPath = function(archivePath) {
    var extension;
    extension = path.extname(archivePath);
    return extension === '.zip' || extension === '.jar';
  };

  isGzipPath = function(archivePath) {
    return path.extname(archivePath) === '.tgz' || path.extname(path.basename(archivePath, '.gz')) === '.tar';
  };

  module.exports = {
    isPathSupported: function(archivePath) {
      if (!archivePath) {
        return false;
      }
      return isTarPath(archivePath) || isZipPath(archivePath) || isGzipPath(archivePath);
    },
    list: function(archivePath, options, callback) {
      if (options == null) {
        options = {};
      }
      if (_.isFunction(options)) {
        callback = options;
        options = {};
      }
      if (isTarPath(archivePath)) {
        listTar(archivePath, options, wrapCallback(callback));
      } else if (isGzipPath(archivePath)) {
        listGzip(archivePath, options, wrapCallback(callback));
      } else if (isZipPath(archivePath)) {
        listZip(archivePath, options, wrapCallback(callback));
      } else {
        callback(new Error("'" + (path.extname(archivePath)) + "' files are not supported"));
      }
      return void 0;
    },
    readFile: function(archivePath, filePath, callback) {
      if (isTarPath(archivePath)) {
        readFileFromTar(archivePath, filePath, wrapCallback(callback));
      } else if (isGzipPath(archivePath)) {
        readFileFromGzip(archivePath, filePath, wrapCallback(callback));
      } else if (isZipPath(archivePath)) {
        readFileFromZip(archivePath, filePath, wrapCallback(callback));
      } else {
        callback(new Error("'" + (path.extname(archivePath)) + "' files are not supported"));
      }
      return void 0;
    },
    readGzip: function(gzipArchivePath, callback) {
      var chunks, fileStream, gzipStream, zlib;
      callback = wrapCallback(callback);
      zlib = require('zlib');
      fileStream = fs.createReadStream(gzipArchivePath);
      fileStream.on('error', callback);
      gzipStream = fileStream.pipe(zlib.createGunzip());
      gzipStream.on('error', callback);
      chunks = [];
      gzipStream.on('data', function(chunk) {
        return chunks.push(chunk);
      });
      return gzipStream.on('end', function() {
        return callback(null, Buffer.concat(chunks).toString());
      });
    }
  };

}).call(this);

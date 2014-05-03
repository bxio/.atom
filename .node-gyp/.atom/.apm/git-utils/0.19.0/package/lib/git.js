(function() {
  var Repository, fs, modifiedStatusFlags, newStatusFlags, path, realpath, statusIgnore, statusIndexDeleted, statusIndexModified, statusIndexNew, statusIndexRenamed, statusIndexTypeChange, statusWorkingDirDelete, statusWorkingDirModified, statusWorkingDirNew, statusWorkingDirTypeChange;

  fs = require('fs');

  path = require('path');

  Repository = require('bindings')('git.node').Repository;

  statusIndexNew = 1 << 0;

  statusIndexModified = 1 << 1;

  statusIndexDeleted = 1 << 2;

  statusIndexRenamed = 1 << 3;

  statusIndexTypeChange = 1 << 4;

  statusWorkingDirNew = 1 << 7;

  statusWorkingDirModified = 1 << 8;

  statusWorkingDirDelete = 1 << 9;

  statusWorkingDirTypeChange = 1 << 10;

  statusIgnore = 1 << 14;

  modifiedStatusFlags = statusWorkingDirModified | statusIndexModified | statusWorkingDirDelete | statusIndexDeleted | statusWorkingDirTypeChange | statusIndexTypeChange;

  newStatusFlags = statusWorkingDirNew | statusIndexNew;

  Repository.prototype.getWorkingDirectory = function() {
    var _ref;
    return (_ref = this.getPath()) != null ? _ref.replace(/\/\.git\/?$/, '') : void 0;
  };

  Repository.prototype.getShortHead = function() {
    var head;
    head = this.getHead();
    if (head == null) {
      return head;
    }
    if (head.indexOf('refs/heads/') === 0) {
      return head.substring(11);
    }
    if (head.indexOf('refs/tags/') === 0) {
      return head.substring(10);
    }
    if (head.indexOf('refs/remotes/') === 0) {
      return head.substring(13);
    }
    if (head.match(/[a-fA-F0-9]{40}/)) {
      return head.substring(0, 7);
    }
    return head;
  };

  Repository.prototype.isStatusModified = function(status) {
    if (status == null) {
      status = 0;
    }
    return (status & modifiedStatusFlags) > 0;
  };

  Repository.prototype.isPathModified = function(path) {
    return this.isStatusModified(this.getStatus(path));
  };

  Repository.prototype.isStatusNew = function(status) {
    if (status == null) {
      status = 0;
    }
    return (status & newStatusFlags) > 0;
  };

  Repository.prototype.isPathNew = function(path) {
    return this.isStatusNew(this.getStatus(path));
  };

  Repository.prototype.getUpstreamBranch = function(branch) {
    var branchMerge, branchRemote, shortBranch;
    if (branch == null) {
      branch = this.getHead();
    }
    if (!((branch != null ? branch.length : void 0) > 11)) {
      return null;
    }
    if (branch.indexOf('refs/heads/') !== 0) {
      return null;
    }
    shortBranch = branch.substring(11);
    branchMerge = this.getConfigValue("branch." + shortBranch + ".merge");
    if (!((branchMerge != null ? branchMerge.length : void 0) > 11)) {
      return null;
    }
    if (branchMerge.indexOf('refs/heads/') !== 0) {
      return null;
    }
    branchRemote = this.getConfigValue("branch." + shortBranch + ".remote");
    if (!((branchRemote != null ? branchRemote.length : void 0) > 0)) {
      return null;
    }
    return "refs/remotes/" + branchRemote + "/" + (branchMerge.substring(11));
  };

  Repository.prototype.getAheadBehindCount = function() {
    var counts, headCommit, mergeBase, upstream, upstreamCommit;
    counts = {
      ahead: 0,
      behind: 0
    };
    headCommit = this.getReferenceTarget('HEAD');
    if (!((headCommit != null ? headCommit.length : void 0) > 0)) {
      return counts;
    }
    upstream = this.getUpstreamBranch();
    if (!((upstream != null ? upstream.length : void 0) > 0)) {
      return counts;
    }
    upstreamCommit = this.getReferenceTarget(upstream);
    if (!((upstreamCommit != null ? upstreamCommit.length : void 0) > 0)) {
      return counts;
    }
    mergeBase = this.getMergeBase(headCommit, upstreamCommit);
    if (!((mergeBase != null ? mergeBase.length : void 0) > 0)) {
      return counts;
    }
    counts.ahead = this.getCommitCount(headCommit, mergeBase);
    counts.behind = this.getCommitCount(upstreamCommit, mergeBase);
    return counts;
  };

  Repository.prototype.relativize = function(path) {
    var workingDirectory;
    if (path == null) {
      return path;
    }
    if (path[0] !== '/') {
      return path;
    }
    workingDirectory = this.getWorkingDirectory();
    if (workingDirectory && path.indexOf("" + workingDirectory + "/") === 0) {
      return path.substring(workingDirectory.length + 1);
    } else if (this.openedWorkingDirectory && path.indexOf("" + this.openedWorkingDirectory + "/") === 0) {
      return path.substring(this.openedWorkingDirectory.length + 1);
    } else {
      return path;
    }
  };

  realpath = function(unrealPath) {
    try {
      return fs.realpathSync(unrealPath);
    } catch (e) {
      return unrealPath;
    }
  };

  exports.open = function(repositoryPath) {
    var repository, symlink, workingDirectory;
    symlink = realpath(repositoryPath) !== repositoryPath;
    repository = new Repository(repositoryPath);
    if (repository.exists()) {
      if (symlink) {
        workingDirectory = repository.getWorkingDirectory();
        while (repositoryPath !== path.sep) {
          if (realpath(repositoryPath) === workingDirectory) {
            repository.openedWorkingDirectory = repositoryPath;
            break;
          }
          repositoryPath = path.resolve(repositoryPath, '..');
        }
      }
      return repository;
    } else {
      return null;
    }
  };

}).call(this);

/* eslint-disable */
(function() {
  'use strict';

  var globals = typeof window === 'undefined' ? global : window;
  if (typeof globals._hmr === 'function') return;

  var lsKey = '___hmr:reload-reason___';

  if (localStorage && localStorage.getItem(lsKey)) {
    console.warn('[HMR] Reloaded due to:', localStorage.getItem(lsKey));
    localStorage.removeItem(lsKey);
  }

  /* helper functions */

  var not = function(fn) {
    return function(arg) {
      return !fn(arg);
    };
  };

  var isArray = function(x) {
    return Object.prototype.toString.call(x) === '[object Array]';
  };
  var toArray = function(x) {
    return isArray(x) ? x : [x];
  };
  var isSameFunction = function(a, b) {
    return a.toString() === b.toString();
  };

  var intersect = function(ary1, ary2) {
    var intersection = [];

    ary1.forEach(function(el) {
      if (ary2.indexOf(el) !== -1 && intersection.indexOf(el) === -1) {
        intersection.push(el);
      }
    });
    ary2.forEach(function(el) {
      if (ary1.indexOf(el) !== -1 && intersection.indexOf(el) === -1) {
        intersection.push(el);
      }
    });

    return intersection;
  };


  // hmr takes a deppack's simple dependency graph and first turns it into transGraph,
  // which besides tracking dependencies, also stores relevant data for the module (i.e. which modules it can accept, callbacks).
  // later on, transGraph is transformed into markGraph, which is a superset of transGraph.
  // it marks the changed modules and then iteratively tries to see if all updates can be accepted.

  var createTransGraph = function(prevGraph, graph) {
    var newTransEntry = function(name) {
      return {
        file: name,
        children: [],
        parents: [],
        acceptSelf: false,
        acceptors: {},
        acceptorCallbacks: [],
        declineSelf: false,
        declining: {},
        disposeHandlers: []
      };
    };
    var transGraph = {};
    Object.keys(graph).forEach(function(key) {
      var vals = (prevGraph || graph)[key];
      var transEntry = transGraph[key] = transGraph[key] || newTransEntry(key);
      transEntry.children = transEntry.children.concat(vals);
      vals.forEach(function(childKey) {
        var childTransEntry = transGraph[childKey] = transGraph[childKey] || newTransEntry(childKey);
        if (childTransEntry.parents.indexOf(key) === -1) {
          childTransEntry.parents = childTransEntry.parents.concat([key]);
        }
      });
    });
    return transGraph;
  };

  var createMarkGraph = function(transGraph, changed) {
    var markGraph = Object.keys(transGraph).reduce(function(_graph, entry) {
      var defaultAttrs = { updated: false, acceptChildren: false, acceptedBy: [], declingChildren: false, declinedBy: [] };
      _graph[entry] = Object.assign({}, defaultAttrs, transGraph[entry]);
      return _graph;
    }, {});

    // mark updated nodes
    changed.forEach(function(mod) {
      markGraph[mod].updated = true;
    });

    return markGraph;
  };

  var getNode = function(graph, key) {
    return graph[key];
  };
  var getNodes = function(graph) {
    return Object.keys(graph).map(getNode.bind(null, graph));
  };

  var overNodes = function(graph, fn) {
    return getNodes(graph).forEach(function(node) {
      var parents = node.parents.map(getNode.bind(null, graph));
      var children = node.children.map(getNode.bind(null, graph));
      fn(node, parents, children);
    });
  };

  var computeUpdated = function(modules, _modules) {
    return Object.keys(Object.assign({}, modules, _modules)).reduce(function(hash, mod) {
      var oldFn = modules[mod];
      var newFn = _modules[mod];

      if (oldFn && newFn && !isSameFunction(oldFn, newFn)) {
        hash.changed.push(mod);
      } else if (oldFn && !newFn) {
        hash.removed.push(mod);
      } else if (!oldFn && newFn) {
        hash.added.push(mod);
      }

      return hash;
    }, { changed: [], removed: [], added: [] });
  };

  // figure out if the changes can be accepted
  var iterMarkChanges = function(markGraph) {
    var isAccepted = function(node) {
      if (node.declineChildren) {
        return false;
      } else if (node.acceptChildren) {
        return true;
      } else {
        if (node.parents.length === 0) return false;
        var sortedPars = node.parents.sort();
        var sortedAccepts = node.acceptedBy.sort();
        var decliners = node.declinedBy;
        return decliners.length === 0 && sortedPars.join(',') === sortedAccepts.join(',');
      }
    };
    var mark = function() {
      overNodes(markGraph, function(node, parents, children) {
        if (node.updated && node.declineSelf) {
            node.declineChildren = true;
            return;
        }
        if (node.updated && !isAccepted(node)) {
          // if every parent of the module was accepted, the module will be accepted, too
          var isDeclining = function(parent) {
            return node.file in parent.declining;
          };
          if (parents.length && parents.every(isAccepted) && !node.declineChildren && !node.declineSelf && !parents.some(isDeclining)) {
            node.acceptChildren = true;
            return;
          }
          if (node.acceptSelf) {
            node.acceptChildren = true;
          } else {
            parents.forEach(function(parent) {
              if (node.file in parent.declining) {
                parent.updated = true;
                node.declinedBy.push(parent.file);
                return;
              } else if (node.file in parent.acceptors) {
                node.acceptedBy.push(parent.file);
                return;
              }
              parent.updated = true;
              if (parent.acceptSelf) {
                parent.acceptChildren = true;
              }
            });
          }
        }
      });
    };
    var recurMark = function() {
      var _prevMark = JSON.stringify(markGraph);
      mark();
      var _currMark = JSON.stringify(markGraph);

      var nodes = getNodes(markGraph);
      var isGood = function(node) {
        return node.updated ? isAccepted(node) : true;
      };
      var allGood = nodes.every(isGood);
      var hasRejections = nodes.some(function(node) {
        return node.declineChildren || node.declinedBy.length > 0;
      });
      var badNodes = nodes.filter(not(isGood));

      if (!allGood && !hasRejections) {
        if (_prevMark === _currMark) {
          return badNodes;
        }
        return recurMark();
      } else {
        return badNodes;
      }
    };
    var badNodes = recurMark();
    var allOk = badNodes.length === 0;
    var updatedNodes = getNodes(markGraph).filter(function(node) { return node.updated; });
    return { allOk: allOk, updatedNodes: updatedNodes, badNodes: badNodes };
  };

  var performUpdate = function(modules, _modules, transGraph, handleRemoved, handleAdded, callback) {
    // what's updated?
    var updated = computeUpdated(modules, _modules);

    if (updated.removed.length === 0 && updated.added.length === 0 && updated.changed.length === 0) {
      console.log('[HMR] Nothing changed');
      return;
    }

    if (updated.removed.length > 0) {
      handleRemoved(updated.removed);
    }

    if (updated.added.length > 0) {
      handleAdded(updated.added);
    }

    // try to accept
    var changed = updated.changed;
    if (changed.length) {
      // a file can be:
      // - accepted by itself (when it doesn't export anything, only produces side effects), in which case it's re-executed
      // - accepted by a parent specifically (when the parent relies on its exports and handles their update)
      // - accepted by a parent "catch-all" style in which case all parents' deps and the parent itself are re-evaluated
      var markGraph = createMarkGraph(transGraph, changed);
      var iterData = iterMarkChanges(markGraph);

      if (iterData.allOk) {
        var updatedNodes = iterData.updatedNodes;

        callback(updatedNodes);
      } else {
        var notAccepted = iterData.badNodes.map(function(node) { return node.file; });
        var reason = "[HMR] Can't accept changes for: " + notAccepted.join(', ') + ". Reloading the page...";
        if (localStorage) localStorage.setItem(lsKey, reason);
        console.warn(reason);
        window.location.reload();
        return;
      }
    }
    console.info('[HMR] All updated');
  };

  var hmr = function(_resolve, require, modules, cache) {
    var prevGraph;
    var transGraph;

    var moduleState = {};

    var runDisposeHandlers = function(modName) {
      var disposeHandlers = getNode(transGraph, modName).disposeHandlers;
      var data = {};
      disposeHandlers.forEach(function(disposeHandler) {
        disposeHandler(data);
      });
      moduleState[modName] = data;
    };

    var replaceMod = function(modName, newFn) {
      runDisposeHandlers(modName);

      delete cache[modName];
      delete modules[modName];
      require.register(modName, newFn);
    };

    this.createHot = function(name) {
      var accept = function(dep, callback) {
        if (!dep) {
          transGraph[name].acceptSelf = true;
        } else {
          var deps = toArray(dep);
          var resDeps = deps.map(function(dep) { return _resolve(name, dep); });
          resDeps.forEach(function(resolved) {
            transGraph[name].acceptors[resolved] = true;
          });
          transGraph[name].acceptorCallbacks.push([resDeps, callback]);
        }
      };
      var decline = function(dep) {
        if (!dep) {
          transGraph[name].declineSelf = true;
        } else {
          var deps = toArray(dep);
          var resDeps = deps.map(function(dep) { return _resolve(name, dep); });
          resDeps.forEach(function(resolved) {
            transGraph[name].declining[resolved] = true;
          });
        }
      };
      var addDisposeHandler = function(cb) {
        transGraph[name].disposeHandlers.push(cb);
      };
      var removeDisposeHandler = function(cb) {
        var handlers = transGraph[name].disposeHandlers;
        var idx = handlers.indexOf(cb);
        if (idx !== -1) {
          handlers.splice(idx, 1);
        }
      };
      return {
        accept: accept,
        decline: decline,
        dispose: addDisposeHandler,
        addDisposeHandler: addDisposeHandler,
        removeDisposeHandler: removeDisposeHandler,
        data: moduleState[name] || {}
      };
    };

    // in dev mode (when hmr is used), all require calls are wrapped into
    // require.hmr (which is this hmr.wrap function), which allows the hmr
    // runtime to effectively do nothing on the first call, but on later
    // calls, to analyze the changes and perform the update
    this.wrap = function(graph, definition) {
      if (!transGraph) {
        transGraph = createTransGraph(prevGraph, graph);
      }

      // first run: simply proxy all calls to `require.js`
      if (Object.keys(modules).length === 0) {
        definition(require);
        prevGraph = graph;
        return;
      }
      // otherwise, only track modules
      // this is what will be passed as `require` to the definitions
      var subRequire = function(mod) {
        try {
          // this should only get called for the process shim
          return require(mod);
        } catch (e) {
          console.error(e);
        }
      };
      var _aliases = {};
      var _modules = {};
      var alias = function(from, to) {
        _aliases[from] = to;
      };
      var register = function(bundle, fn) {
        _modules[bundle] = fn;
      };
      subRequire.alias = alias;
      subRequire.register = register;
      definition(subRequire);

      transGraph.___globals___.declineSelf = true;

      var handleRemoved = function(removedMods) {
        removedMods.forEach(runDisposeHandlers);
      };
      var handleAdded = function(addedMods) {
        addedMods.forEach(function(mod) {
          require.register(mod, _modules[mod]);
        });
      };

      var updateAliases = function() {
        Object.keys(_aliases).forEach(function(x) {
          var y = _aliases[x];
          require.alias(x, y);
        });
      };

      performUpdate(modules, _modules, transGraph, handleRemoved, handleAdded, function(updatedNodes) {
        updatedNodes.forEach(function(node) {
          var mod = node.file;
          replaceMod(mod, _modules[mod]);
        });
        // do it here so updated modules would see the new aliases
        updateAliases();

        updatedNodes.forEach(function(node) {
          require(node.file);
        });

        var acceptors = {};
        updatedNodes.forEach(function(node) {
          var parents = node.parents.map(getNode.bind(null, transGraph));
          parents.forEach(function(parent) {
            if (node.file in parent.acceptors) {
              var parMod = parent.file;
              if (!(parMod in acceptors)) acceptors[parMod] = [];
              acceptors[parMod].push(node.file);
            }
          });
        });

        Object.keys(acceptors).forEach(function(parMod) {
          var changedMods = acceptors[parMod];
          var parent = getNode(transGraph, parMod);
          var acceptorCallbacks = parent.acceptorCallbacks;

          acceptorCallbacks.forEach(function(data) {
            var mods = data[0];
            var cb = data[1];

            var changed = intersect(changedMods, mods);
            if (changed.length === 0) return;

            if (mods.length === 1) {
              cb();
            } else {
              cb(changed);
            }
          });
        });
      });

      // do it here too, because new aliases can appear even if no module changed
      updateAliases();
    };
  };

  globals._hmr = hmr;
})();

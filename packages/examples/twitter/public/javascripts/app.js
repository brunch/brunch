(function(/*! Brunch !*/) {
  'use strict';

  var globals = typeof window !== 'undefined' ? window : global;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};

  var has = function(object, name) {
    return ({}).hasOwnProperty.call(object, name);
  };

  var expand = function(root, name) {
    var results = [], parts, part;
    if (/^\.\.?(\/|$)/.test(name)) {
      parts = [root, name].join('/').split('/');
    } else {
      parts = name.split('/');
    }
    for (var i = 0, length = parts.length; i < length; i++) {
      part = parts[i];
      if (part === '..') {
        results.pop();
      } else if (part !== '.' && part !== '') {
        results.push(part);
      }
    }
    return results.join('/');
  };

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var localRequire = function(path) {
    return function(name) {
      var dir = dirname(path);
      var absolute = expand(dir, name);
      return globals.require(absolute);
    };
  };

  var initModule = function(name, definition) {
    var module = {id: name, exports: {}};
    definition(module.exports, localRequire(name), module);
    var exports = cache[name] = module.exports;
    return exports;
  };

  var require = function(name) {
    var path = expand(name, '.');

    if (has(cache, path)) return cache[path];
    if (has(modules, path)) return initModule(path, modules[path]);

    var dirIndex = expand(path, './index');
    if (has(cache, dirIndex)) return cache[dirIndex];
    if (has(modules, dirIndex)) return initModule(dirIndex, modules[dirIndex]);

    throw new Error('Cannot find module "' + name + '"');
  };

  var define = function(bundle) {
    for (var key in bundle) {
      if (has(bundle, key)) {
        modules[key] = bundle[key];
      }
    }
  }

  globals.require = require;
  globals.require.define = define;
  globals.require.brunch = true;
})();

window.require.define({"application": function(exports, require, module) {
  var Application, Chaplin, Layout, NavigationController, SessionController, SidebarController, mediator, routes,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Chaplin = require('chaplin');

  mediator = require('mediator');

  routes = require('routes');

  SessionController = require('controllers/session_controller');

  NavigationController = require('controllers/navigation_controller');

  SidebarController = require('controllers/sidebar_controller');

  Layout = require('views/layout');

  module.exports = Application = (function(_super) {

    __extends(Application, _super);

    function Application() {
      return Application.__super__.constructor.apply(this, arguments);
    }

    Application.prototype.title = 'Tweet your brunch';

    Application.prototype.initialize = function() {
      Application.__super__.initialize.apply(this, arguments);
      this.initDispatcher();
      this.initLayout();
      this.initMediator();
      this.initControllers();
      this.initRouter(routes, {
        pushState: false
      });
      return typeof Object.freeze === "function" ? Object.freeze(this) : void 0;
    };

    Application.prototype.initLayout = function() {
      return this.layout = new Layout({
        title: this.title
      });
    };

    Application.prototype.initControllers = function() {
      new SessionController();
      new NavigationController();
      return new SidebarController();
    };

    Application.prototype.initMediator = function() {
      Chaplin.mediator.user = null;
      return Chaplin.mediator.seal();
    };

    return Application;

  })(Chaplin.Application);
  
}});

window.require.define({"controllers/base/controller": function(exports, require, module) {
  var Chaplin, Controller,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Chaplin = require('chaplin');

  module.exports = Controller = (function(_super) {

    __extends(Controller, _super);

    function Controller() {
      return Controller.__super__.constructor.apply(this, arguments);
    }

    return Controller;

  })(Chaplin.Controller);
  
}});

window.require.define({"controllers/login_controller": function(exports, require, module) {
  var Controller, LoginsController,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Controller = require('controllers/base/controller');

  module.exports = LoginsController = (function(_super) {

    __extends(LoginsController, _super);

    function LoginsController() {
      return LoginsController.__super__.constructor.apply(this, arguments);
    }

    LoginsController.prototype.logout = function() {
      this.publishEvent('!logout');
      return this.publishEvent('!router:route', '/');
    };

    return LoginsController;

  })(Controller);
  
}});

window.require.define({"controllers/navigation_controller": function(exports, require, module) {
  var Controller, Navigation, NavigationController, NavigationView,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Controller = require('controllers/base/controller');

  Navigation = require('models/navigation');

  NavigationView = require('views/navigation_view');

  module.exports = NavigationController = (function(_super) {

    __extends(NavigationController, _super);

    function NavigationController() {
      return NavigationController.__super__.constructor.apply(this, arguments);
    }

    NavigationController.prototype.historyURL = 'logout';

    NavigationController.prototype.initialize = function() {
      NavigationController.__super__.initialize.apply(this, arguments);
      this.model = new Navigation;
      return this.view = new NavigationView({
        model: this.model
      });
    };

    return NavigationController;

  })(Controller);
  
}});

window.require.define({"controllers/session_controller": function(exports, require, module) {
  var Controller, LoginView, SessionController, Twitter, User, mediator,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  mediator = require('mediator');

  Controller = require('controllers/base/controller');

  User = require('models/user');

  LoginView = require('views/login_view');

  Twitter = require('lib/services/twitter');

  module.exports = SessionController = (function(_super) {

    __extends(SessionController, _super);

    function SessionController() {
      this.logout = __bind(this.logout, this);

      this.serviceProviderSession = __bind(this.serviceProviderSession, this);

      this.triggerLogin = __bind(this.triggerLogin, this);
      return SessionController.__super__.constructor.apply(this, arguments);
    }

    SessionController.serviceProviders = {
      twitter: new Twitter
    };

    SessionController.prototype.loginStatusDetermined = false;

    SessionController.prototype.loginView = null;

    SessionController.prototype.serviceProviderName = null;

    SessionController.prototype.initialize = function() {
      this.subscribeEvent('serviceProviderSession', this.serviceProviderSession);
      this.subscribeEvent('logout', this.logout);
      this.subscribeEvent('userData', this.userData);
      this.subscribeEvent('!showLogin', this.showLoginView);
      this.subscribeEvent('!login', this.triggerLogin);
      this.subscribeEvent('!logout', this.triggerLogout);
      return this.getSession();
    };

    SessionController.prototype.loadServiceProviders = function() {
      var name, serviceProvider, _ref, _results;
      _ref = SessionController.serviceProviders;
      _results = [];
      for (name in _ref) {
        serviceProvider = _ref[name];
        _results.push(serviceProvider.load());
      }
      return _results;
    };

    SessionController.prototype.createUser = function(userData) {
      return mediator.user = new User(userData);
    };

    SessionController.prototype.getSession = function() {
      var name, serviceProvider, _ref, _results;
      this.loadServiceProviders();
      _ref = SessionController.serviceProviders;
      _results = [];
      for (name in _ref) {
        serviceProvider = _ref[name];
        _results.push(serviceProvider.done(serviceProvider.getLoginStatus));
      }
      return _results;
    };

    SessionController.prototype.showLoginView = function() {
      if (this.loginView) {
        return;
      }
      this.loadServiceProviders();
      return this.loginView = new LoginView({
        serviceProviders: SessionController.serviceProviders
      });
    };

    SessionController.prototype.triggerLogin = function(serviceProviderName) {
      var serviceProvider;
      serviceProvider = SessionController.serviceProviders[serviceProviderName];
      if (!serviceProvider.isLoaded()) {
        this.publishEvent('serviceProviderMissing', serviceProviderName);
        return;
      }
      this.publishEvent('loginAttempt', serviceProviderName);
      return serviceProvider.triggerLogin();
    };

    SessionController.prototype.serviceProviderSession = function(session) {
      this.serviceProviderName = session.provider.name;
      this.disposeLoginView();
      session.id = session.userId;
      delete session.userId;
      this.createUser(session);
      return this.publishLogin();
    };

    SessionController.prototype.publishLogin = function() {
      this.loginStatusDetermined = true;
      this.publishEvent('login', mediator.user);
      return this.publishEvent('loginStatus', true);
    };

    SessionController.prototype.triggerLogout = function() {
      return this.publishEvent('logout');
    };

    SessionController.prototype.logout = function() {
      this.loginStatusDetermined = true;
      this.disposeUser();
      this.serviceProviderName = null;
      this.showLoginView();
      return this.publishEvent('loginStatus', false);
    };

    SessionController.prototype.userData = function(data) {
      return mediator.user.set(data);
    };

    SessionController.prototype.disposeLoginView = function() {
      if (!this.loginView) {
        return;
      }
      this.loginView.dispose();
      return this.loginView = null;
    };

    SessionController.prototype.disposeUser = function() {
      if (!mediator.user) {
        return;
      }
      mediator.user.dispose();
      return mediator.user = null;
    };

    return SessionController;

  })(Controller);
  
}});

window.require.define({"controllers/sidebar_controller": function(exports, require, module) {
  var Controller, SidebarController, SidebarView, StatusView,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Controller = require('controllers/base/controller');

  SidebarView = require('views/sidebar_view');

  StatusView = require('views/status_view');

  module.exports = SidebarController = (function(_super) {

    __extends(SidebarController, _super);

    function SidebarController() {
      return SidebarController.__super__.constructor.apply(this, arguments);
    }

    SidebarController.prototype.initialize = function() {
      return this.view = new SidebarView();
    };

    return SidebarController;

  })(Controller);
  
}});

window.require.define({"controllers/tweets_controller": function(exports, require, module) {
  var Controller, Tweets, TweetsController, TweetsView,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Controller = require('controllers/base/controller');

  Tweets = require('models/tweets');

  TweetsView = require('views/tweets_view');

  module.exports = TweetsController = (function(_super) {

    __extends(TweetsController, _super);

    function TweetsController() {
      return TweetsController.__super__.constructor.apply(this, arguments);
    }

    TweetsController.prototype.historyURL = '';

    TweetsController.prototype.index = function(params) {
      this.collection = new Tweets;
      return this.view = new TweetsView({
        collection: this.collection
      });
    };

    return TweetsController;

  })(Controller);
  
}});

window.require.define({"initialize": function(exports, require, module) {
  var Application;

  Application = require('./application');

  $(function() {
    var app;
    app = new Application();
    return app.initialize();
  });
  
}});

window.require.define({"lib/services/service_provider": function(exports, require, module) {
  var Chaplin, ServiceProvider, utils;

  utils = require('lib/utils');

  Chaplin = require('chaplin');

  module.exports = ServiceProvider = (function() {

    _(ServiceProvider.prototype).extend(Chaplin.EventBroker);

    ServiceProvider.prototype.loading = false;

    function ServiceProvider() {
      _(this).extend($.Deferred());
      utils.deferMethods({
        deferred: this,
        methods: ['triggerLogin', 'getLoginStatus'],
        onDeferral: this.load
      });
    }

    ServiceProvider.prototype.disposed = false;

    ServiceProvider.prototype.dispose = function() {
      if (this.disposed) {
        return;
      }
      this.unsubscribeAllEvents();
      this.disposed = true;
      return typeof Object.freeze === "function" ? Object.freeze(this) : void 0;
    };

    return ServiceProvider;

  })();

  /*

    Standard methods and their signatures:

    load: ->
      # Load a script like this:
      utils.loadLib 'http://example.org/foo.js', @loadHandler, @reject

    loadHandler: =>
      # Init the library, then resolve
      ServiceProviderLibrary.init(foo: 'bar')
      @resolve()

    isLoaded: ->
      # Return a Boolean
      Boolean window.ServiceProviderLibrary and ServiceProviderLibrary.login

    # Trigger login popup
    triggerLogin: (loginContext) ->
      callback = _(@loginHandler).bind(this, loginContext)
      ServiceProviderLibrary.login callback

    # Callback for the login popup
    loginHandler: (loginContext, response) =>

      eventPayload = {provider: this, loginContext}
      if response
        # Publish successful login
        @publishEvent 'loginSuccessful', eventPayload

        # Publish the session
        @publishEvent 'serviceProviderSession',
          provider: this
          userId: response.userId
          accessToken: response.accessToken
          # etc.

      else
        @publishEvent 'loginFail', eventPayload

    getLoginStatus: (callback = @loginStatusHandler, force = false) ->
      ServiceProviderLibrary.getLoginStatus callback, force

    loginStatusHandler: (response) =>
      return unless response
      @publishEvent 'serviceProviderSession',
        provider: this
        userId: response.userId
        accessToken: response.accessToken
        # etc.
  */

  
}});

window.require.define({"lib/services/twitter": function(exports, require, module) {
  var ServiceProvider, Twitter, mediator, utils,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  mediator = require('mediator');

  utils = require('lib/utils');

  ServiceProvider = require('lib/services/service_provider');

  module.exports = Twitter = (function(_super) {
    var consumerKey;

    __extends(Twitter, _super);

    consumerKey = 'w0uohox9lTgpKETJmscYIQ';

    Twitter.prototype.name = 'twitter';

    function Twitter() {
      this.loginStatusHandler = __bind(this.loginStatusHandler, this);

      this.loginHandler = __bind(this.loginHandler, this);

      this.sdkLoadHandler = __bind(this.sdkLoadHandler, this);
      Twitter.__super__.constructor.apply(this, arguments);
      this.subscribeEvent('!logout', this.logout);
    }

    Twitter.prototype.load = function() {
      if (this.state() === 'resolved' || this.loading) {
        return;
      }
      this.loading = true;
      return utils.loadLib("http://platform.twitter.com/anywhere.js?id=" + consumerKey + "&v=1", this.sdkLoadHandler, this.reject);
    };

    Twitter.prototype.sdkLoadHandler = function() {
      var _this = this;
      this.loading = false;
      return twttr.anywhere(function(T) {
        _this.publishEvent('sdkLoaded');
        _this.T = T;
        return _this.resolve();
      });
    };

    Twitter.prototype.isLoaded = function() {
      return Boolean(window.twttr);
    };

    Twitter.prototype.trigger = function(event, callback) {
      return this.T.trigger(event, callback);
    };

    Twitter.prototype.on = function(event, callback) {
      return this.T.bind(event, callback);
    };

    Twitter.prototype.off = function(event) {
      return this.T.unbind(event);
    };

    Twitter.prototype.triggerLogin = function(loginContext) {
      var callback;
      callback = _(this.loginHandler).bind(this, loginContext);
      this.T.signIn();
      this.on('authComplete', function(event, currentUser, accessToken) {
        return callback({
          currentUser: currentUser,
          accessToken: accessToken
        });
      });
      return this.on('signOut', function() {
        console.log('Signout event');
        return callback();
      });
    };

    Twitter.prototype.publishSession = function(response) {
      var user;
      user = response.currentUser;
      this.publishEvent('serviceProviderSession', {
        provider: this,
        userId: user.id,
        accessToken: response.accessToken || twttr.anywhere.token
      });
      return this.publishEvent('userData', user.attributes);
    };

    Twitter.prototype.loginHandler = function(loginContext, response) {
      console.debug('Twitter#loginHandler', loginContext, response);
      if (response) {
        this.publishEvent('loginSuccessful', {
          provider: this,
          loginContext: loginContext
        });
        return this.publishSession(response);
      } else {
        return this.publishEvent('loginFail', {
          provider: this,
          loginContext: loginContext
        });
      }
    };

    Twitter.prototype.getLoginStatus = function(callback, force) {
      if (callback == null) {
        callback = this.loginStatusHandler;
      }
      if (force == null) {
        force = false;
      }
      console.debug('Twitter#getLoginStatus');
      return callback(this.T);
    };

    Twitter.prototype.loginStatusHandler = function(response) {
      console.debug('Twitter#loginStatusHandler', response);
      if (response.currentUser) {
        return this.publishSession(response);
      } else {
        return this.publishEvent('logout');
      }
    };

    Twitter.prototype.logout = function() {
      var _ref;
      console.log('Twitter#logout');
      return typeof twttr !== "undefined" && twttr !== null ? (_ref = twttr.anywhere) != null ? typeof _ref.signOut === "function" ? _ref.signOut() : void 0 : void 0 : void 0;
    };

    return Twitter;

  })(ServiceProvider);
  
}});

window.require.define({"lib/support": function(exports, require, module) {
  var Chaplin, support, utils;

  Chaplin = require('chaplin');

  utils = require('lib/utils');

  support = utils.beget(Chaplin.support);

  module.exports = support;
  
}});

window.require.define({"lib/utils": function(exports, require, module) {
  var Chaplin, mediator, utils,
    __hasProp = {}.hasOwnProperty;

  Chaplin = require('chaplin');

  mediator = require('mediator');

  utils = Chaplin.utils.beget(Chaplin.utils);

  _(utils).extend({
    loadLib: function(url, success, error, timeout) {
      var head, onload, script, timeoutHandle;
      if (timeout == null) {
        timeout = 7500;
      }
      head = document.head || document.getElementsByTagName('head')[0] || document.documentElement;
      script = document.createElement('script');
      script.async = 'async';
      script.src = url;
      onload = function(_, aborted) {
        if (aborted == null) {
          aborted = false;
        }
        if (!(aborted || !script.readyState || script.readyState === 'complete')) {
          return;
        }
        clearTimeout(timeoutHandle);
        script.onload = script.onreadystatechange = script.onerror = null;
        if (head && script.parentNode) {
          head.removeChild(script);
        }
        script = void 0;
        if (success && !aborted) {
          return success();
        }
      };
      script.onload = script.onreadystatechange = onload;
      script.onerror = function() {
        onload(null, true);
        if (error) {
          return error();
        }
      };
      timeoutHandle = setTimeout(script.onerror, timeout);
      return head.insertBefore(script, head.firstChild);
    },
    /*
      Wrap methods so they can be called before a deferred is resolved.
      The actual methods are called once the deferred is resolved.
    
      Parameters:
    
      Expects an options hash with the following properties:
    
      deferred
        The Deferred object to wait for.
    
      methods
        Either:
        - A string with a method name e.g. 'method'
        - An array of strings e.g. ['method1', 'method2']
        - An object with methods e.g. {method: -> alert('resolved!')}
    
      host (optional)
        If you pass an array of strings in the `methods` parameter the methods
        are fetched from this object. Defaults to `deferred`.
    
      target (optional)
        The target object the new wrapper methods are created at.
        Defaults to host if host is given, otherwise it defaults to deferred.
    
      onDeferral (optional)
        An additional callback function which is invoked when the method is called
        and the Deferred isn't resolved yet.
        After the method is registered as a done handler on the Deferred,
        this callback is invoked. This can be used to trigger the resolving
        of the Deferred.
    
      Examples:
    
      deferMethods(deferred: def, methods: 'foo')
        Wrap the method named foo of the given deferred def and
        postpone all calls until the deferred is resolved.
    
      deferMethods(deferred: def, methods: def.specialMethods)
        Read all methods from the hash def.specialMethods and
        create wrapped methods with the same names at def.
    
      deferMethods(
        deferred: def, methods: def.specialMethods, target: def.specialMethods
      )
        Read all methods from the object def.specialMethods and
        create wrapped methods at def.specialMethods,
        overwriting the existing ones.
    
      deferMethods(deferred: def, host: obj, methods: ['foo', 'bar'])
        Wrap the methods obj.foo and obj.bar so all calls to them are postponed
        until def is resolved. obj.foo and obj.bar are overwritten
        with their wrappers.
    */

    deferMethods: function(options) {
      var deferred, func, host, methods, methodsHash, name, onDeferral, target, _i, _len, _results;
      deferred = options.deferred;
      methods = options.methods;
      host = options.host || deferred;
      target = options.target || host;
      onDeferral = options.onDeferral;
      methodsHash = {};
      if (typeof methods === 'string') {
        methodsHash[methods] = host[methods];
      } else if (methods.length && methods[0]) {
        for (_i = 0, _len = methods.length; _i < _len; _i++) {
          name = methods[_i];
          func = host[name];
          if (typeof func !== 'function') {
            throw new TypeError("utils.deferMethods: method " + name + " notfound on host " + host);
          }
          methodsHash[name] = func;
        }
      } else {
        methodsHash = methods;
      }
      _results = [];
      for (name in methodsHash) {
        if (!__hasProp.call(methodsHash, name)) continue;
        func = methodsHash[name];
        if (typeof func !== 'function') {
          continue;
        }
        _results.push(target[name] = utils.createDeferredFunction(deferred, func, target, onDeferral));
      }
      return _results;
    },
    createDeferredFunction: function(deferred, func, context, onDeferral) {
      if (context == null) {
        context = deferred;
      }
      return function() {
        var args;
        args = arguments;
        if (deferred.state() === 'resolved') {
          return func.apply(context, args);
        } else {
          deferred.done(function() {
            return func.apply(context, args);
          });
          if (typeof onDeferral === 'function') {
            return onDeferral.apply(context);
          }
        }
      };
    }
  });

  module.exports = utils;
  
}});

window.require.define({"lib/view_helper": function(exports, require, module) {
  var mediator, utils;

  mediator = require('mediator');

  utils = require('chaplin/lib/utils');

  Handlebars.registerHelper('if_logged_in', function(options) {
    if (mediator.user) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  });

  Handlebars.registerHelper('with', function(context, options) {
    if (!context || Handlebars.Utils.isEmpty(context)) {
      return options.inverse(this);
    } else {
      return options.fn(context);
    }
  });

  Handlebars.registerHelper('without', function(context, options) {
    var inverse;
    inverse = options.inverse;
    options.inverse = options.fn;
    options.fn = inverse;
    return Handlebars.helpers["with"].call(this, context, options);
  });

  Handlebars.registerHelper('with_user', function(options) {
    var context;
    context = mediator.user || {};
    return Handlebars.helpers["with"].call(this, context, options);
  });

  Handlebars.registerHelper('transform_if_retweeted', function(options) {
    var data;
    if (this.retweeted_status) {
      data = _.clone(this.retweeted_status);
      data.retweeter = this.user;
      return options.fn(data);
    } else {
      return options.fn(this);
    }
  });

  Handlebars.registerHelper('auto_link', function(options) {
    return new Handlebars.SafeString(twttr.txt.autoLink(options.fn(this)));
  });

  Handlebars.registerHelper('format_date', function(options) {
    var date;
    date = new Date(options.fn(this));
    return new Handlebars.SafeString(moment(date).fromNow());
  });

  Handlebars.registerHelper('unless_is_web', function(source, options) {
    var string;
    string = source === 'web' ? '' : options.fn(this);
    return new Handlebars.SafeString(string);
  });
  
}});

window.require.define({"mediator": function(exports, require, module) {
  
  module.exports = require('chaplin').mediator;
  
}});

window.require.define({"models/base/collection": function(exports, require, module) {
  var Chaplin, Collection,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Chaplin = require('chaplin');

  module.exports = Collection = (function(_super) {

    __extends(Collection, _super);

    function Collection() {
      return Collection.__super__.constructor.apply(this, arguments);
    }

    return Collection;

  })(Chaplin.Collection);
  
}});

window.require.define({"models/base/model": function(exports, require, module) {
  var Chaplin, Model,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Chaplin = require('chaplin');

  module.exports = Model = (function(_super) {

    __extends(Model, _super);

    function Model() {
      return Model.__super__.constructor.apply(this, arguments);
    }

    return Model;

  })(Chaplin.Model);
  
}});

window.require.define({"models/navigation": function(exports, require, module) {
  var Model, Navigation,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Model = require('models/base/model');

  module.exports = Navigation = (function(_super) {

    __extends(Navigation, _super);

    function Navigation() {
      return Navigation.__super__.constructor.apply(this, arguments);
    }

    Navigation.prototype.defaults = {
      items: [
        {
          href: '/',
          title: 'Home'
        }, {
          href: '/mentions',
          title: 'Mentions'
        }, {
          href: '/logout',
          title: 'Logout'
        }
      ]
    };

    return Navigation;

  })(Model);
  
}});

window.require.define({"models/status": function(exports, require, module) {
  var Model, Status, mediator,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  mediator = require('mediator');

  Model = require('models/base/model');

  module.exports = Status = (function(_super) {

    __extends(Status, _super);

    function Status() {
      return Status.__super__.constructor.apply(this, arguments);
    }

    Status.prototype.minLength = 1;

    Status.prototype.maxLength = 140;

    Status.prototype.validate = function(attributes) {
      var text;
      text = attributes.text;
      if ((!text) || (text.length < this.minLength) || (text.length > this.maxLength)) {
        return 'Invalid text';
      }
    };

    Status.prototype.calcCharCount = function(value) {
      return this.maxLength - value;
    };

    Status.prototype.sync = function(method, model, options) {
      var provider, timeout,
        _this = this;
      provider = mediator.user.get('provider');
      timeout = setTimeout(options.error.bind(options, 'Timeout error'), 4000);
      provider.T.Status.update(model.get('text'), function(tweet) {
        window.clearTimeout(timeout);
        _this.publishEvent('tweet:add', tweet.attributes);
        return options.success(tweet.attributes);
      });
    };

    return Status;

  })(Model);
  
}});

window.require.define({"models/tweet": function(exports, require, module) {
  var Model, Tweet,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Model = require('models/base/model');

  module.exports = Tweet = (function(_super) {

    __extends(Tweet, _super);

    function Tweet() {
      return Tweet.__super__.constructor.apply(this, arguments);
    }

    return Tweet;

  })(Model);
  
}});

window.require.define({"models/tweets": function(exports, require, module) {
  var Collection, Tweet, Tweets, mediator,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  mediator = require('mediator');

  Collection = require('models/base/collection');

  Tweet = require('models/tweet');

  module.exports = Tweets = (function(_super) {

    __extends(Tweets, _super);

    function Tweets() {
      this.addTweet = __bind(this.addTweet, this);

      this.processTweets = __bind(this.processTweets, this);
      return Tweets.__super__.constructor.apply(this, arguments);
    }

    Tweets.prototype.model = Tweet;

    Tweets.prototype.initialize = function() {
      Tweets.__super__.initialize.apply(this, arguments);
      _(this).extend($.Deferred());
      this.getTweets();
      this.subscribeEvent('login', this.getTweets);
      this.subscribeEvent('logout', this.reset);
      return this.subscribeEvent('tweet:add', this.addTweet);
    };

    Tweets.prototype.getTweets = function() {
      var provider, user;
      console.debug('Tweets#getTweets');
      user = mediator.user;
      if (!user) {
        return;
      }
      provider = user.get('provider');
      if (provider.name !== 'twitter') {
        return;
      }
      this.trigger('loadStart');
      return provider.T.currentUser.homeTimeline(this.processTweets);
    };

    Tweets.prototype.processTweets = function(response) {
      var tweets,
        _this = this;
      tweets = (response != null ? response.array : void 0) ? _(response.array).map(function(tweet) {
        return tweet.attributes;
      }) : [];
      console.debug('Tweets#processTweets', tweets);
      this.trigger('load');
      this.reset(tweets);
      return this.resolve();
    };

    Tweets.prototype.addTweet = function(tweet) {
      return this.add(tweet, {
        at: 0
      });
    };

    return Tweets;

  })(Collection);
  
}});

window.require.define({"models/user": function(exports, require, module) {
  var Model, User, mediator,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  mediator = require('mediator');

  Model = require('models/base/model');

  module.exports = User = (function(_super) {

    __extends(User, _super);

    function User() {
      this.initializeMethods = __bind(this.initializeMethods, this);
      return User.__super__.constructor.apply(this, arguments);
    }

    User.prototype.initialize = function() {
      User.__super__.initialize.apply(this, arguments);
      return this.subscribeEvent('userMethods', this.initializeMethods);
    };

    User.prototype.initializeMethods = function(methods) {
      var _this = this;
      return Object.keys(methods).filter(function(method) {
        return !_this[method];
      }).forEach(function(method) {
        return _this[method] = methods[method];
      });
    };

    return User;

  })(Model);
  
}});

window.require.define({"routes": function(exports, require, module) {
  
  module.exports = function(match) {
    match('logout', 'login#logout');
    match('', 'tweets#index');
    return match('@:user', 'user#show');
  };
  
}});

window.require.define({"views/base/collection_view": function(exports, require, module) {
  var Chaplin, CollectionView, View,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Chaplin = require('chaplin');

  View = require('views/base/view');

  module.exports = CollectionView = (function(_super) {

    __extends(CollectionView, _super);

    function CollectionView() {
      return CollectionView.__super__.constructor.apply(this, arguments);
    }

    CollectionView.prototype.getTemplateFunction = View.prototype.getTemplateFunction;

    return CollectionView;

  })(Chaplin.CollectionView);
  
}});

window.require.define({"views/base/page_view": function(exports, require, module) {
  var PageView, View, mediator,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  mediator = require('mediator');

  View = require('views/base/view');

  module.exports = PageView = (function(_super) {

    __extends(PageView, _super);

    function PageView() {
      return PageView.__super__.constructor.apply(this, arguments);
    }

    PageView.prototype.container = '#page-container';

    PageView.prototype.autoRender = true;

    PageView.prototype.renderedSubviews = false;

    PageView.prototype.initialize = function() {
      var rendered,
        _this = this;
      PageView.__super__.initialize.apply(this, arguments);
      if (this.model || this.collection) {
        rendered = false;
        return this.modelBind('change', function() {
          if (!rendered) {
            _this.render();
          }
          return rendered = true;
        });
      }
    };

    PageView.prototype.renderSubviews = function() {};

    PageView.prototype.render = function() {
      PageView.__super__.render.apply(this, arguments);
      if (!this.renderedSubviews) {
        this.renderSubviews();
        return this.renderedSubviews = true;
      }
    };

    return PageView;

  })(View);
  
}});

window.require.define({"views/base/view": function(exports, require, module) {
  var Chaplin, View,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Chaplin = require('chaplin');

  require('lib/view_helper');

  module.exports = View = (function(_super) {

    __extends(View, _super);

    function View() {
      return View.__super__.constructor.apply(this, arguments);
    }

    View.prototype.getTemplateFunction = function() {
      return this.template;
    };

    return View;

  })(Chaplin.View);
  
}});

window.require.define({"views/layout": function(exports, require, module) {
  var Chaplin, Layout,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Chaplin = require('chaplin');

  module.exports = Layout = (function(_super) {

    __extends(Layout, _super);

    function Layout() {
      return Layout.__super__.constructor.apply(this, arguments);
    }

    return Layout;

  })(Chaplin.Layout);
  
}});

window.require.define({"views/login_view": function(exports, require, module) {
  var LoginView, View, template, utils,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  utils = require('lib/utils');

  View = require('views/base/view');

  template = require('views/templates/login');

  module.exports = LoginView = (function(_super) {

    __extends(LoginView, _super);

    function LoginView() {
      return LoginView.__super__.constructor.apply(this, arguments);
    }

    LoginView.prototype.template = template;

    LoginView.prototype.id = 'login';

    LoginView.prototype.container = '#content-container';

    LoginView.prototype.autoRender = true;

    LoginView.prototype.initialize = function(options) {
      LoginView.__super__.initialize.apply(this, arguments);
      return this.initButtons(options.serviceProviders);
    };

    LoginView.prototype.initButtons = function(serviceProviders) {
      var buttonSelector, failed, loaded, loginHandler, serviceProvider, serviceProviderName, _results;
      _results = [];
      for (serviceProviderName in serviceProviders) {
        serviceProvider = serviceProviders[serviceProviderName];
        buttonSelector = "." + serviceProviderName;
        this.$(buttonSelector).addClass('service-loading');
        loginHandler = _(this.loginWith).bind(this, serviceProviderName, serviceProvider);
        this.delegate('click', buttonSelector, loginHandler);
        loaded = _(this.serviceProviderLoaded).bind(this, serviceProviderName, serviceProvider);
        serviceProvider.done(loaded);
        failed = _(this.serviceProviderFailed).bind(this, serviceProviderName, serviceProvider);
        _results.push(serviceProvider.fail(failed));
      }
      return _results;
    };

    LoginView.prototype.loginWith = function(serviceProviderName, serviceProvider, event) {
      event.preventDefault();
      if (!serviceProvider.isLoaded()) {
        return;
      }
      this.publishEvent('login:pickService', serviceProviderName);
      return this.publishEvent('!login', serviceProviderName);
    };

    LoginView.prototype.serviceProviderLoaded = function(serviceProviderName) {
      if (this.disposed) {
        return;
      }
      return this.$("." + serviceProviderName).removeClass('service-loading');
    };

    LoginView.prototype.serviceProviderFailed = function(serviceProviderName) {
      if (this.disposed) {
        return;
      }
      return this.$("." + serviceProviderName).removeClass('service-loading').addClass('service-unavailable').attr('disabled', true).attr('title', "Error connecting. Please check whether you areblocking " + (utils.upcase(serviceProviderName)) + ".");
    };

    return LoginView;

  })(View);
  
}});

window.require.define({"views/navigation_view": function(exports, require, module) {
  var NavigationView, View, template,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  View = require('views/base/view');

  template = require('views/templates/navigation');

  module.exports = NavigationView = (function(_super) {

    __extends(NavigationView, _super);

    function NavigationView() {
      return NavigationView.__super__.constructor.apply(this, arguments);
    }

    NavigationView.prototype.template = template;

    NavigationView.prototype.id = 'navigation';

    NavigationView.prototype.container = '#navigation-container';

    NavigationView.prototype.autoRender = true;

    NavigationView.prototype.initialize = function() {
      NavigationView.__super__.initialize.apply(this, arguments);
      this.subscribeEvent('loginStatus', this.render);
      return this.subscribeEvent('startupController', this.render);
    };

    return NavigationView;

  })(View);
  
}});

window.require.define({"views/sidebar_view": function(exports, require, module) {
  var SidebarView, StatsView, StatusView, View, mediator, template,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  mediator = require('mediator');

  View = require('views/base/view');

  StatsView = require('views/stats_view');

  StatusView = require('views/status_view');

  template = require('views/templates/sidebar');

  module.exports = SidebarView = (function(_super) {

    __extends(SidebarView, _super);

    function SidebarView() {
      this.loginStatusHandler = __bind(this.loginStatusHandler, this);
      return SidebarView.__super__.constructor.apply(this, arguments);
    }

    SidebarView.prototype.template = template;

    SidebarView.prototype.id = 'sidebar';

    SidebarView.prototype.container = '#sidebar-container';

    SidebarView.prototype.autoRender = true;

    SidebarView.prototype.initialize = function() {
      SidebarView.__super__.initialize.apply(this, arguments);
      this.subscribeEvent('loginStatus', this.loginStatusHandler);
      return this.subscribeEvent('userData', this.render);
    };

    SidebarView.prototype.loginStatusHandler = function(loggedIn) {
      this.model = loggedIn ? mediator.user : null;
      return this.render();
    };

    SidebarView.prototype.render = function() {
      var _this = this;
      SidebarView.__super__.render.apply(this, arguments);
      this.subview('status', new StatusView({
        container: this.$('#status-container')
      }));
      this.subview('stats', new StatsView({
        container: this.$('#stats-container')
      }));
      return ['status', 'stats'].forEach(function(name) {
        return _this.subview(name).render();
      });
    };

    return SidebarView;

  })(View);
  
}});

window.require.define({"views/stats_view": function(exports, require, module) {
  var StatsView, View, mediator, template,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  mediator = require('mediator');

  View = require('views/base/view');

  template = require('views/templates/stats');

  module.exports = StatsView = (function(_super) {

    __extends(StatsView, _super);

    function StatsView() {
      this.loginStatusHandler = __bind(this.loginStatusHandler, this);
      return StatsView.__super__.constructor.apply(this, arguments);
    }

    StatsView.prototype.template = template;

    StatsView.prototype.className = 'stats';

    StatsView.prototype.tagName = 'ul';

    StatsView.prototype.initialize = function() {
      StatsView.__super__.initialize.apply(this, arguments);
      this.subscribeEvent('loginStatus', this.loginStatusHandler);
      this.subscribeEvent('userData', this.render);
      return this.model = mediator.user ? mediator.user : null;
    };

    StatsView.prototype.loginStatusHandler = function(loggedIn) {
      this.model = loggedIn ? mediator.user : null;
      return this.render();
    };

    return StatsView;

  })(View);
  
}});

window.require.define({"views/status_view": function(exports, require, module) {
  var Status, StatusView, View, mediator, template,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  mediator = require('mediator');

  Status = require('models/status');

  View = require('views/base/view');

  template = require('views/templates/status');

  module.exports = StatusView = (function(_super) {

    __extends(StatusView, _super);

    function StatusView() {
      this.createStatus = __bind(this.createStatus, this);

      this.updateStatusText = __bind(this.updateStatusText, this);

      this.updateCharacterCount = __bind(this.updateCharacterCount, this);

      this.loginStatusHandler = __bind(this.loginStatusHandler, this);
      return StatusView.__super__.constructor.apply(this, arguments);
    }

    StatusView.prototype.template = template;

    StatusView.prototype.id = 'status';

    StatusView.prototype.className = 'status';

    StatusView.prototype.initialize = function() {
      var _this = this;
      StatusView.__super__.initialize.apply(this, arguments);
      this.subscribeEvent('loginStatus', this.loginStatusHandler);
      this.subscribeEvent('userData', this.render);
      ['keyup', 'keydown'].forEach(function(eventName) {
        return _this.delegate(eventName, '.status-text', _this.updateStatusText);
      });
      this.delegate('click', '.status-create-button', this.createStatus);
      return this.model = mediator.user ? new Status : null;
    };

    StatusView.prototype.loginStatusHandler = function(loggedIn) {
      this.model = loggedIn ? new Status : null;
      return this.render();
    };

    StatusView.prototype.updateCharacterCount = function(valid, count) {
      var $charCount, $createButton;
      $charCount = this.$('.status-character-count');
      $createButton = this.$('.status-create-button');
      $charCount.text(count);
      if (valid) {
        $charCount.removeClass('status-character-count-invalid');
        return $createButton.removeAttr('disabled');
      } else {
        if (count !== 140) {
          $charCount.addClass('status-character-count-invalid');
        }
        return $createButton.attr('disabled', 'disabled');
      }
    };

    StatusView.prototype.updateStatusText = function(event) {
      var count, text, valid;
      text = $(event.currentTarget).val();
      valid = this.model.set({
        text: text
      });
      count = this.model.calcCharCount(text.length);
      return this.updateCharacterCount(valid, count);
    };

    StatusView.prototype.createStatus = function(event) {
      var _this = this;
      return this.model.save(null, {
        error: function(model, error) {
          return console.error('Tweet error', error);
        },
        success: function(model, attributes) {
          console.debug('Tweet success', attributes);
          return _this.$('.status-text').val('').trigger('keydown');
        }
      });
    };

    return StatusView;

  })(View);
  
}});

window.require.define({"views/templates/login": function(exports, require, module) {
  module.exports = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
    helpers = helpers || Handlebars.helpers;
    var foundHelper, self=this;


    return "<div class=\"login-note\">\n  <h3>Tweet your brunch</h3>\n  <img class=\"sign-in-button twitter\" src=\"https://si0.twimg.com/images/dev/buttons/sign-in-with-twitter-l.png\" alt=\"Sign in with Twitter\" /> \n</div>\n";});
}});

window.require.define({"views/templates/navigation": function(exports, require, module) {
  module.exports = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
    helpers = helpers || Handlebars.helpers;
    var buffer = "", stack1, foundHelper, tmp1, self=this, functionType="function", helperMissing=helpers.helperMissing, undef=void 0, escapeExpression=this.escapeExpression, blockHelperMissing=helpers.blockHelperMissing;

  function program1(depth0,data) {
    
    var buffer = "", stack1, stack2;
    buffer += "\n  <div class=\"navbar-inner\">\n    <div class=\"container\">\n      <div class=\"nav-collapse\">\n        <ul class=\"nav\">\n          ";
    foundHelper = helpers.items;
    stack1 = foundHelper || depth0.items;
    stack2 = helpers.each;
    tmp1 = self.program(2, program2, data);
    tmp1.hash = {};
    tmp1.fn = tmp1;
    tmp1.inverse = self.noop;
    stack1 = stack2.call(depth0, stack1, tmp1);
    if(stack1 || stack1 === 0) { buffer += stack1; }
    buffer += "\n        </ul>\n      </div>\n    </div>\n  </div>\n";
    return buffer;}
  function program2(depth0,data) {
    
    var buffer = "", stack1;
    buffer += "\n            <li class=\"nav-item\">\n              <a class=\"nav-item-link\" href=\"#";
    stack1 = depth0.href;
    if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
    else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "this.href", { hash: {} }); }
    buffer += escapeExpression(stack1) + "\">\n                <div class=\"nav-item-icon-container\">\n                  <span class=\"nav-item-icon\"></span>\n                </div>\n                <span class=\"nav-item-title\">";
    stack1 = depth0.title;
    if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
    else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "this.title", { hash: {} }); }
    buffer += escapeExpression(stack1) + "</span>\n              </a>\n            </li>\n          ";
    return buffer;}

    foundHelper = helpers.if_logged_in;
    stack1 = foundHelper || depth0.if_logged_in;
    tmp1 = self.program(1, program1, data);
    tmp1.hash = {};
    tmp1.fn = tmp1;
    tmp1.inverse = self.noop;
    if(foundHelper && typeof stack1 === functionType) { stack1 = stack1.call(depth0, tmp1); }
    else { stack1 = blockHelperMissing.call(depth0, stack1, tmp1); }
    if(stack1 || stack1 === 0) { buffer += stack1; }
    buffer += "\n";
    return buffer;});
}});

window.require.define({"views/templates/sidebar": function(exports, require, module) {
  module.exports = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
    helpers = helpers || Handlebars.helpers;
    var buffer = "", stack1, foundHelper, tmp1, self=this, functionType="function", helperMissing=helpers.helperMissing, undef=void 0, escapeExpression=this.escapeExpression, blockHelperMissing=helpers.blockHelperMissing;

  function program1(depth0,data) {
    
    var buffer = "", stack1;
    buffer += "\n  <div class=\"account-summary-container\">\n    <div class=\"account-summary\">\n      <img class=\"account-summary-avatar avatar size32\" src=\"";
    foundHelper = helpers.profile_image_url;
    stack1 = foundHelper || depth0.profile_image_url;
    if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
    else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "profile_image_url", { hash: {} }); }
    buffer += escapeExpression(stack1) + "\" alt=\"";
    foundHelper = helpers.name;
    stack1 = foundHelper || depth0.name;
    if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
    else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "name", { hash: {} }); }
    buffer += escapeExpression(stack1) + "\">\n      <div class=\"account-summary-content\">\n        <strong class=\"account-summary-full-name\">";
    foundHelper = helpers.name;
    stack1 = foundHelper || depth0.name;
    if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
    else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "name", { hash: {} }); }
    buffer += escapeExpression(stack1) + "</strong>\n        <small class=\"account-summary-metadata\">View my profile page</small>\n      </div>\n    </div>\n  </div>\n  <div class=\"stats-container\" id=\"stats-container\"></div>\n  <div class=\"status-container\" id=\"status-container\"></div>\n";
    return buffer;}

  function program3(depth0,data) {
    
    
    return "\n  <div class=\"app-description\">\n    Tweet your brunch is a simple twitter client built with <a href=\"http://brunch.io/\">Brunch</a> &amp; <a href=\"https://github.com/paulmillr/brunch-with-chaplin\">Brunch with Chaplin</a>.\n  </div>\n";}

    foundHelper = helpers.if_logged_in;
    stack1 = foundHelper || depth0.if_logged_in;
    tmp1 = self.program(1, program1, data);
    tmp1.hash = {};
    tmp1.fn = tmp1;
    tmp1.inverse = self.program(3, program3, data);
    if(foundHelper && typeof stack1 === functionType) { stack1 = stack1.call(depth0, tmp1); }
    else { stack1 = blockHelperMissing.call(depth0, stack1, tmp1); }
    if(stack1 || stack1 === 0) { buffer += stack1; }
    buffer += "\n";
    return buffer;});
}});

window.require.define({"views/templates/stats": function(exports, require, module) {
  module.exports = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
    helpers = helpers || Handlebars.helpers;
    var buffer = "", stack1, foundHelper, self=this, functionType="function", helperMissing=helpers.helperMissing, undef=void 0, escapeExpression=this.escapeExpression;


    buffer += "<li class=\"stat-tweets\"><strong>";
    foundHelper = helpers.statuses_count;
    stack1 = foundHelper || depth0.statuses_count;
    if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
    else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "statuses_count", { hash: {} }); }
    buffer += escapeExpression(stack1) + "</strong> tweets</li>\n<li class=\"stat-following\"><strong>";
    foundHelper = helpers.friends_count;
    stack1 = foundHelper || depth0.friends_count;
    if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
    else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "friends_count", { hash: {} }); }
    buffer += escapeExpression(stack1) + "</strong> following</li>\n<li class=\"stat-followers\"><strong>";
    foundHelper = helpers.followers_count;
    stack1 = foundHelper || depth0.followers_count;
    if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
    else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "followers_count", { hash: {} }); }
    buffer += escapeExpression(stack1) + "</strong> followers</li>\n";
    return buffer;});
}});

window.require.define({"views/templates/status": function(exports, require, module) {
  module.exports = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
    helpers = helpers || Handlebars.helpers;
    var buffer = "", stack1, foundHelper, tmp1, self=this, functionType="function", blockHelperMissing=helpers.blockHelperMissing;

  function program1(depth0,data) {
    
    
    return "\n  <textarea class=\"status-text\" placeholder=\"What's happening?\"></textarea>\n  <div class=\"status-info\">\n    <span class=\"status-character-count\">140</span>\n    <button class=\"status-create-button btn btn-primary\" disabled>Tweet</button>\n  </div>\n";}

    foundHelper = helpers.if_logged_in;
    stack1 = foundHelper || depth0.if_logged_in;
    tmp1 = self.program(1, program1, data);
    tmp1.hash = {};
    tmp1.fn = tmp1;
    tmp1.inverse = self.noop;
    if(foundHelper && typeof stack1 === functionType) { stack1 = stack1.call(depth0, tmp1); }
    else { stack1 = blockHelperMissing.call(depth0, stack1, tmp1); }
    if(stack1 || stack1 === 0) { buffer += stack1; }
    buffer += "\n";
    return buffer;});
}});

window.require.define({"views/templates/tweet": function(exports, require, module) {
  module.exports = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
    helpers = helpers || Handlebars.helpers;
    var buffer = "", stack1, foundHelper, tmp1, self=this, functionType="function", helperMissing=helpers.helperMissing, undef=void 0, escapeExpression=this.escapeExpression, blockHelperMissing=helpers.blockHelperMissing;

  function program1(depth0,data) {
    
    var buffer = "", stack1, stack2;
    buffer += "\n  <div class=\"tweet-content\">\n    <header class=\"tweet-header\">\n      <a href=\"https://twitter.com/";
    foundHelper = helpers.user;
    stack1 = foundHelper || depth0.user;
    stack1 = (stack1 === null || stack1 === undefined || stack1 === false ? stack1 : stack1.screen_name);
    if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
    else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "user.screen_name", { hash: {} }); }
    buffer += escapeExpression(stack1) + "\">\n        <img class=\"avatar\" src=\"";
    foundHelper = helpers.user;
    stack1 = foundHelper || depth0.user;
    stack1 = (stack1 === null || stack1 === undefined || stack1 === false ? stack1 : stack1.profile_image_url);
    if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
    else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "user.profile_image_url", { hash: {} }); }
    buffer += escapeExpression(stack1) + "\" alt=\"\" />\n        <strong class=\"tweet-author-full-name\">\n          ";
    foundHelper = helpers.user;
    stack1 = foundHelper || depth0.user;
    stack1 = (stack1 === null || stack1 === undefined || stack1 === false ? stack1 : stack1.name);
    if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
    else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "user.name", { hash: {} }); }
    buffer += escapeExpression(stack1) + "\n        </strong>\n      </a>\n    </header>\n    <p class=\"tweet-text\">";
    foundHelper = helpers.auto_link;
    stack1 = foundHelper || depth0.auto_link;
    tmp1 = self.program(2, program2, data);
    tmp1.hash = {};
    tmp1.fn = tmp1;
    tmp1.inverse = self.noop;
    if(foundHelper && typeof stack1 === functionType) { stack1 = stack1.call(depth0, tmp1); }
    else { stack1 = blockHelperMissing.call(depth0, stack1, tmp1); }
    if(stack1 || stack1 === 0) { buffer += stack1; }
    buffer += "</p>\n    <footer class=\"tweet-footer\">\n      <a href=\"http://twitter.com/";
    foundHelper = helpers.user;
    stack1 = foundHelper || depth0.user;
    stack1 = (stack1 === null || stack1 === undefined || stack1 === false ? stack1 : stack1.screen_name);
    if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
    else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "user.screen_name", { hash: {} }); }
    buffer += escapeExpression(stack1) + "/status/";
    foundHelper = helpers.id_str;
    stack1 = foundHelper || depth0.id_str;
    if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
    else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "id_str", { hash: {} }); }
    buffer += escapeExpression(stack1) + "\">\n        <time class=\"tweet-created-at\" datetime=\"";
    foundHelper = helpers.created_at;
    stack1 = foundHelper || depth0.created_at;
    if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
    else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "created_at", { hash: {} }); }
    buffer += escapeExpression(stack1) + "\">\n          ";
    foundHelper = helpers.format_date;
    stack1 = foundHelper || depth0.format_date;
    tmp1 = self.program(4, program4, data);
    tmp1.hash = {};
    tmp1.fn = tmp1;
    tmp1.inverse = self.noop;
    if(foundHelper && typeof stack1 === functionType) { stack1 = stack1.call(depth0, tmp1); }
    else { stack1 = blockHelperMissing.call(depth0, stack1, tmp1); }
    if(stack1 || stack1 === 0) { buffer += stack1; }
    buffer += "\n        </time>\n      </a>\n      ";
    foundHelper = helpers.source;
    stack1 = foundHelper || depth0.source;
    foundHelper = helpers.unless_is_web;
    stack2 = foundHelper || depth0.unless_is_web;
    tmp1 = self.program(6, program6, data);
    tmp1.hash = {};
    tmp1.fn = tmp1;
    tmp1.inverse = self.noop;
    if(foundHelper && typeof stack2 === functionType) { stack1 = stack2.call(depth0, stack1, tmp1); }
    else { stack1 = blockHelperMissing.call(depth0, stack2, stack1, tmp1); }
    if(stack1 || stack1 === 0) { buffer += stack1; }
    buffer += "\n      ";
    foundHelper = helpers.retweeter;
    stack1 = foundHelper || depth0.retweeter;
    stack2 = helpers['if'];
    tmp1 = self.program(8, program8, data);
    tmp1.hash = {};
    tmp1.fn = tmp1;
    tmp1.inverse = self.noop;
    stack1 = stack2.call(depth0, stack1, tmp1);
    if(stack1 || stack1 === 0) { buffer += stack1; }
    buffer += "\n    </footer>\n  </div>\n";
    return buffer;}
  function program2(depth0,data) {
    
    var stack1;
    foundHelper = helpers.text;
    stack1 = foundHelper || depth0.text;
    if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
    else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "text", { hash: {} }); }
    return escapeExpression(stack1);}

  function program4(depth0,data) {
    
    var stack1;
    foundHelper = helpers.created_at;
    stack1 = foundHelper || depth0.created_at;
    if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
    else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "created_at", { hash: {} }); }
    return escapeExpression(stack1);}

  function program6(depth0,data) {
    
    var buffer = "", stack1;
    buffer += "\n        via <span class=\"tweet-source\">";
    foundHelper = helpers.source;
    stack1 = foundHelper || depth0.source;
    if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
    else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "source", { hash: {} }); }
    if(stack1 || stack1 === 0) { buffer += stack1; }
    buffer += "</span>\n      ";
    return buffer;}

  function program8(depth0,data) {
    
    var buffer = "", stack1;
    buffer += "\n        <p class=\"tweet-retweeter\">\n          Retweeted by <a class=\"tweet-retweeter-username\" href=\"https://twitter.com/";
    foundHelper = helpers.retweeter;
    stack1 = foundHelper || depth0.retweeter;
    stack1 = (stack1 === null || stack1 === undefined || stack1 === false ? stack1 : stack1.screen_name);
    if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
    else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "retweeter.screen_name", { hash: {} }); }
    buffer += escapeExpression(stack1) + "\">";
    foundHelper = helpers.retweeter;
    stack1 = foundHelper || depth0.retweeter;
    stack1 = (stack1 === null || stack1 === undefined || stack1 === false ? stack1 : stack1.screen_name);
    if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
    else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "retweeter.screen_name", { hash: {} }); }
    buffer += escapeExpression(stack1) + "</a>\n        </p>\n      ";
    return buffer;}

    foundHelper = helpers.transform_if_retweeted;
    stack1 = foundHelper || depth0.transform_if_retweeted;
    tmp1 = self.program(1, program1, data);
    tmp1.hash = {};
    tmp1.fn = tmp1;
    tmp1.inverse = self.noop;
    if(foundHelper && typeof stack1 === functionType) { stack1 = stack1.call(depth0, tmp1); }
    else { stack1 = blockHelperMissing.call(depth0, stack1, tmp1); }
    if(stack1 || stack1 === 0) { buffer += stack1; }
    buffer += "\n";
    return buffer;});
}});

window.require.define({"views/templates/tweets": function(exports, require, module) {
  module.exports = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
    helpers = helpers || Handlebars.helpers;
    var foundHelper, self=this;


    return "<header class=\"tweets-header\">\n  <h3>Tweets</h3>\n</header>\n<div class=\"tweets\"></div>\n";});
}});

window.require.define({"views/tweet_view": function(exports, require, module) {
  var TweetView, View, template,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  template = require('views/templates/tweet');

  View = require('views/base/view');

  module.exports = TweetView = (function(_super) {

    __extends(TweetView, _super);

    function TweetView() {
      return TweetView.__super__.constructor.apply(this, arguments);
    }

    TweetView.prototype.template = template;

    TweetView.prototype.className = 'tweet';

    return TweetView;

  })(View);
  
}});

window.require.define({"views/tweets_view": function(exports, require, module) {
  var CollectionView, TweetView, TweetsView, mediator, template,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  mediator = require('mediator');

  CollectionView = require('views/base/collection_view');

  TweetView = require('views/tweet_view');

  template = require('views/templates/tweets');

  module.exports = TweetsView = (function(_super) {

    __extends(TweetsView, _super);

    function TweetsView() {
      return TweetsView.__super__.constructor.apply(this, arguments);
    }

    TweetsView.prototype.template = template;

    TweetsView.prototype.tagName = 'div';

    TweetsView.prototype.id = 'tweets';

    TweetsView.prototype.itemView = TweetView;

    TweetsView.prototype.container = '#content-container';

    TweetsView.prototype.listSelector = '.tweets';

    TweetsView.prototype.fallbackSelector = '.fallback';

    TweetsView.prototype.initialize = function() {
      TweetsView.__super__.initialize.apply(this, arguments);
      return this.subscribeEvent('loginStatus', this.showHideLoginNote);
    };

    TweetsView.prototype.showHideLoginNote = function() {
      var display;
      display = (mediator.user ? 'block' : 'none');
      return this.$('.tweets, .tweets-header').css('display', display);
    };

    TweetsView.prototype.render = function() {
      TweetsView.__super__.render.apply(this, arguments);
      console.log('Render');
      return this.showHideLoginNote();
    };

    return TweetsView;

  })(CollectionView);
  
}});


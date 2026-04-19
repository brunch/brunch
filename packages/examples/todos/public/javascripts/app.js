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
  (function() {
    var Application;

    Application = {
      initialize: function() {
        var HomeView, NewTodoView, Router, StatsView, TodoView, Todos, TodosView;
        Todos = require('models/todos');
        Router = require('lib/router');
        HomeView = require('views/home_view');
        NewTodoView = require('views/new_todo_view');
        StatsView = require('views/stats_view');
        TodoView = require('views/todo_view');
        TodosView = require('views/todos_view');
        this.todos = new Todos();
        this.homeView = new HomeView();
        this.statsView = new StatsView();
        this.newTodoView = new NewTodoView();
        this.todosView = new TodosView();
        this.router = new Router();
        return typeof Object.freeze === "function" ? Object.freeze(Application) : void 0;
      }
    };

    module.exports = Application;

  }).call(this);
  
}});

window.require.define({"initialize": function(exports, require, module) {
  (function() {
    var application;

    application = require('application');

    $(function() {
      application.initialize();
      return Backbone.history.start();
    });

  }).call(this);
  
}});

window.require.define({"lib/router": function(exports, require, module) {
  (function() {
    var Router, application,
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    application = require('application');

    module.exports = Router = (function(_super) {

      __extends(Router, _super);

      function Router() {
        Router.__super__.constructor.apply(this, arguments);
      }

      Router.prototype.routes = {
        '': 'home'
      };

      Router.prototype.home = function() {
        application.homeView.render();
        return application.todos.fetch();
      };

      return Router;

    })(Backbone.Router);

  }).call(this);
  
}});

window.require.define({"lib/view_helper": function(exports, require, module) {
  (function() {

    Handlebars.registerHelper('pluralize', function(count, fn) {
      var pluralized, string;
      string = fn();
      pluralized = count === 1 ? string : "" + string + "s";
      return new Handlebars.SafeString(pluralized);
    });

  }).call(this);
  
}});

window.require.define({"models/collection": function(exports, require, module) {
  (function() {
    var Collection,
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    module.exports = Collection = (function(_super) {

      __extends(Collection, _super);

      function Collection() {
        Collection.__super__.constructor.apply(this, arguments);
      }

      return Collection;

    })(Backbone.Collection);

  }).call(this);
  
}});

window.require.define({"models/model": function(exports, require, module) {
  (function() {
    var Model,
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    module.exports = Model = (function(_super) {

      __extends(Model, _super);

      function Model() {
        Model.__super__.constructor.apply(this, arguments);
      }

      return Model;

    })(Backbone.Model);

  }).call(this);
  
}});

window.require.define({"models/todo": function(exports, require, module) {
  (function() {
    var Model, Todo,
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    Model = require('./model');

    module.exports = Todo = (function(_super) {

      __extends(Todo, _super);

      function Todo() {
        Todo.__super__.constructor.apply(this, arguments);
      }

      Todo.prototype.defaults = {
        content: 'Empty todo...',
        done: false
      };

      Todo.prototype.toggle = function() {
        return this.save({
          done: !this.get('done')
        });
      };

      Todo.prototype.clear = function() {
        this.destroy();
        return this.view.remove();
      };

      return Todo;

    })(Model);

  }).call(this);
  
}});

window.require.define({"models/todos": function(exports, require, module) {
  (function() {
    var Collection, Todo, Todos,
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    Collection = require('./collection');

    Todo = require('models/todo');

    module.exports = Todos = (function(_super) {

      __extends(Todos, _super);

      function Todos() {
        Todos.__super__.constructor.apply(this, arguments);
      }

      Todos.prototype.model = Todo;

      Todos.prototype.initialize = function() {
        return this.localStorage = new Store('todos');
      };

      Todos.prototype.done = function() {
        return this.filter(function(todo) {
          return todo.get('done');
        });
      };

      Todos.prototype.remaining = function() {
        return this.without.apply(this, this.done());
      };

      Todos.prototype.nextOrder = function() {
        if (!this.length) return 1;
        return this.last().get('order') + 1;
      };

      Todos.prototype.comparator = function(todo) {
        return todo.get('order');
      };

      Todos.prototype.clearCompleted = function() {
        return _.each(this.done(), function(todo) {
          return todo.clear();
        });
      };

      return Todos;

    })(Collection);

  }).call(this);
  
}});

window.require.define({"views/home_view": function(exports, require, module) {
  (function() {
    var HomeView, View, application, template,
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    View = require('./view');

    application = require('application');

    template = require('./templates/home');

    module.exports = HomeView = (function(_super) {

      __extends(HomeView, _super);

      function HomeView() {
        HomeView.__super__.constructor.apply(this, arguments);
      }

      HomeView.prototype.template = template;

      HomeView.prototype.el = '#home-view';

      HomeView.prototype.afterRender = function() {
        var $todo, viewName, _i, _len, _ref, _results;
        $todo = this.$el.find('#todo-app');
        _ref = ['newTodo', 'todos', 'stats'];
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          viewName = _ref[_i];
          _results.push($todo.append(application["" + viewName + "View"].render().el));
        }
        return _results;
      };

      return HomeView;

    })(View);

  }).call(this);
  
}});

window.require.define({"views/new_todo_view": function(exports, require, module) {
  (function() {
    var NewTodoView, View, application, template,
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    View = require('./view');

    application = require('application');

    template = require('./templates/new_todo');

    module.exports = NewTodoView = (function(_super) {

      __extends(NewTodoView, _super);

      function NewTodoView() {
        NewTodoView.__super__.constructor.apply(this, arguments);
      }

      NewTodoView.prototype.template = template;

      NewTodoView.prototype.id = 'new-todo-view';

      NewTodoView.prototype.events = {
        'keypress #new-todo': 'createOnEnter',
        'keyup #new-todo': 'showHint'
      };

      NewTodoView.prototype.newAttributes = function() {
        var attributes;
        attributes = {
          order: application.todos.nextOrder()
        };
        if (this.$('#new-todo').val()) {
          attributes.content = this.$('#new-todo').val();
        }
        return attributes;
      };

      NewTodoView.prototype.createOnEnter = function(event) {
        if (event.keyCode !== 13) return;
        application.todos.create(this.newAttributes());
        return this.$('#new-todo').val('');
      };

      NewTodoView.prototype.showHint = function(event) {
        var input, tooltip;
        tooltip = this.$('.ui-tooltip-top');
        input = this.$('#new-todo');
        tooltip.fadeOut();
        if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
        if (input.val() === '' || input.val() === input.attr('placeholder')) return;
        return this.tooltipTimeout = setTimeout((function() {
          return tooltip.fadeIn();
        }), 1000);
      };

      return NewTodoView;

    })(View);

  }).call(this);
  
}});

window.require.define({"views/stats_view": function(exports, require, module) {
  (function() {
    var StatsView, View, application, template,
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    View = require('./view');

    application = require('application');

    template = require('./templates/stats');

    module.exports = StatsView = (function(_super) {

      __extends(StatsView, _super);

      function StatsView() {
        StatsView.__super__.constructor.apply(this, arguments);
      }

      StatsView.prototype.template = template;

      StatsView.prototype.id = 'stats-view';

      StatsView.prototype.events = {
        'click .todo-clear': 'clearCompleted'
      };

      StatsView.prototype.getRenderData = function() {
        return {
          stats: {
            total: application.todos.length,
            done: application.todos.done().length,
            remaining: application.todos.remaining().length
          }
        };
      };

      StatsView.prototype.clearCompleted = function() {
        return application.todos.clearCompleted();
      };

      return StatsView;

    })(View);

  }).call(this);
  
}});

window.require.define({"views/templates/home": function(exports, require, module) {
  module.exports = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
    helpers = helpers || Handlebars.helpers;
    var foundHelper, self=this;


    return "<div id=\"todo-app\">\n  <h1>Todos</h1>\n</div>\n<ul id=\"instructions\">\n  <li>Double-click to edit a todo.</li>\n  <!-- <li><a href=\"../docs/todos.html\">View the annotated source.</a></li> -->\n</ul>\n<div id=\"credits\">\n  <span>Originally created by</span>\n  <a href=\"http://jgn.me/\">J&eacute;r&ocirc;me Gravel-Niquet</a>\n  <span>Rewritten by</span>\n  <a href=\"https://github.com/brunch\">Brunch Team</a>\n</div>\n";});
}});

window.require.define({"views/templates/new_todo": function(exports, require, module) {
  module.exports = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
    helpers = helpers || Handlebars.helpers;
    var foundHelper, self=this;


    return "<input id=\"new-todo\" placeholder=\"What needs to be done?\" type=\"text\">\n<div class=\"ui-tooltip-top\">Press Enter to save this task</div>\n";});
}});

window.require.define({"views/templates/stats": function(exports, require, module) {
  module.exports = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
    helpers = helpers || Handlebars.helpers;
    var buffer = "", stack1, stack2, foundHelper, tmp1, self=this, functionType="function", helperMissing=helpers.helperMissing, undef=void 0, escapeExpression=this.escapeExpression, blockHelperMissing=helpers.blockHelperMissing;

  function program1(depth0,data) {
    
    var buffer = "", stack1, stack2;
    buffer += "\n  <span class=\"todo-count\">\n    <span class=\"number\">";
    foundHelper = helpers.stats;
    stack1 = foundHelper || depth0.stats;
    stack1 = (stack1 === null || stack1 === undefined || stack1 === false ? stack1 : stack1.remaining);
    if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
    else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "stats.remaining", { hash: {} }); }
    buffer += escapeExpression(stack1) + "</span>\n    <span class=\"word\">\n      ";
    foundHelper = helpers.stats;
    stack1 = foundHelper || depth0.stats;
    stack1 = (stack1 === null || stack1 === undefined || stack1 === false ? stack1 : stack1.remaining);
    foundHelper = helpers.pluralize;
    stack2 = foundHelper || depth0.pluralize;
    tmp1 = self.program(2, program2, data);
    tmp1.hash = {};
    tmp1.fn = tmp1;
    tmp1.inverse = self.noop;
    if(foundHelper && typeof stack2 === functionType) { stack1 = stack2.call(depth0, stack1, tmp1); }
    else { stack1 = blockHelperMissing.call(depth0, stack2, stack1, tmp1); }
    if(stack1 || stack1 === 0) { buffer += stack1; }
    buffer += "\n    </span>\n    left.\n  </span>\n";
    return buffer;}
  function program2(depth0,data) {
    
    
    return "item";}

  function program4(depth0,data) {
    
    var buffer = "", stack1, stack2;
    buffer += "\n  <a class=\"todo-clear\">\n    Clear <span class=\"number-done\">";
    foundHelper = helpers.stats;
    stack1 = foundHelper || depth0.stats;
    stack1 = (stack1 === null || stack1 === undefined || stack1 === false ? stack1 : stack1.done);
    if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
    else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "stats.done", { hash: {} }); }
    buffer += escapeExpression(stack1) + "</span> completed\n    <span class=\"word-done\">\n      ";
    foundHelper = helpers.stats;
    stack1 = foundHelper || depth0.stats;
    stack1 = (stack1 === null || stack1 === undefined || stack1 === false ? stack1 : stack1.done);
    foundHelper = helpers.pluralize;
    stack2 = foundHelper || depth0.pluralize;
    tmp1 = self.program(5, program5, data);
    tmp1.hash = {};
    tmp1.fn = tmp1;
    tmp1.inverse = self.noop;
    if(foundHelper && typeof stack2 === functionType) { stack1 = stack2.call(depth0, stack1, tmp1); }
    else { stack1 = blockHelperMissing.call(depth0, stack2, stack1, tmp1); }
    if(stack1 || stack1 === 0) { buffer += stack1; }
    buffer += "\n    </span>\n  </span>\n";
    return buffer;}
  function program5(depth0,data) {
    
    
    return "item";}

    foundHelper = helpers.stats;
    stack1 = foundHelper || depth0.stats;
    stack1 = (stack1 === null || stack1 === undefined || stack1 === false ? stack1 : stack1.total);
    stack2 = helpers['if'];
    tmp1 = self.program(1, program1, data);
    tmp1.hash = {};
    tmp1.fn = tmp1;
    tmp1.inverse = self.noop;
    stack1 = stack2.call(depth0, stack1, tmp1);
    if(stack1 || stack1 === 0) { buffer += stack1; }
    buffer += "\n\n";
    foundHelper = helpers.stats;
    stack1 = foundHelper || depth0.stats;
    stack1 = (stack1 === null || stack1 === undefined || stack1 === false ? stack1 : stack1.done);
    stack2 = helpers['if'];
    tmp1 = self.program(4, program4, data);
    tmp1.hash = {};
    tmp1.fn = tmp1;
    tmp1.inverse = self.noop;
    stack1 = stack2.call(depth0, stack1, tmp1);
    if(stack1 || stack1 === 0) { buffer += stack1; }
    buffer += "\n";
    return buffer;});
}});

window.require.define({"views/templates/todo": function(exports, require, module) {
  module.exports = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
    helpers = helpers || Handlebars.helpers;
    var buffer = "", stack1, stack2, foundHelper, tmp1, self=this, functionType="function", helperMissing=helpers.helperMissing, undef=void 0, escapeExpression=this.escapeExpression;

  function program1(depth0,data) {
    
    
    return "done";}

  function program3(depth0,data) {
    
    
    return "checked=\"checked\"";}

    buffer += "<div class=\"todo ";
    foundHelper = helpers.todo;
    stack1 = foundHelper || depth0.todo;
    stack1 = (stack1 === null || stack1 === undefined || stack1 === false ? stack1 : stack1.done);
    stack2 = helpers['if'];
    tmp1 = self.program(1, program1, data);
    tmp1.hash = {};
    tmp1.fn = tmp1;
    tmp1.inverse = self.noop;
    stack1 = stack2.call(depth0, stack1, tmp1);
    if(stack1 || stack1 === 0) { buffer += stack1; }
    buffer += "\">\n  <div class=\"display\">\n    <input class=\"check\" type=\"checkbox\" ";
    foundHelper = helpers.todo;
    stack1 = foundHelper || depth0.todo;
    stack1 = (stack1 === null || stack1 === undefined || stack1 === false ? stack1 : stack1.done);
    stack2 = helpers['if'];
    tmp1 = self.program(3, program3, data);
    tmp1.hash = {};
    tmp1.fn = tmp1;
    tmp1.inverse = self.noop;
    stack1 = stack2.call(depth0, stack1, tmp1);
    if(stack1 || stack1 === 0) { buffer += stack1; }
    buffer += ">\n  <div class=\"todo-content\">";
    foundHelper = helpers.todo;
    stack1 = foundHelper || depth0.todo;
    stack1 = (stack1 === null || stack1 === undefined || stack1 === false ? stack1 : stack1.content);
    if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
    else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "todo.content", { hash: {} }); }
    buffer += escapeExpression(stack1) + "</div>\n    <span class=\"todo-destroy\"></span>\n  </div>\n  <div class=\"edit\">\n    <input class=\"todo-input\" type=\"text\" value=\"";
    foundHelper = helpers.todo;
    stack1 = foundHelper || depth0.todo;
    stack1 = (stack1 === null || stack1 === undefined || stack1 === false ? stack1 : stack1.content);
    if(typeof stack1 === functionType) { stack1 = stack1.call(depth0, { hash: {} }); }
    else if(stack1=== undef) { stack1 = helperMissing.call(depth0, "todo.content", { hash: {} }); }
    buffer += escapeExpression(stack1) + "\">\n  </div>\n</div>\n";
    return buffer;});
}});

window.require.define({"views/templates/todos": function(exports, require, module) {
  module.exports = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
    helpers = helpers || Handlebars.helpers;
    var foundHelper, self=this;


    return "<ul id=\"todos\"></ul>\n";});
}});

window.require.define({"views/todo_view": function(exports, require, module) {
  (function() {
    var TodoView, View, template,
      __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    View = require('./view');

    template = require('./templates/todo');

    module.exports = TodoView = (function(_super) {

      __extends(TodoView, _super);

      function TodoView() {
        this.update = __bind(this.update, this);
        TodoView.__super__.constructor.apply(this, arguments);
      }

      TodoView.prototype.template = template;

      TodoView.prototype.tagName = 'li';

      TodoView.prototype.events = {
        'click .check': 'toggleDone',
        'dblclick .todo-content': 'edit',
        'click .todo-destroy': 'clear',
        'keypress .todo-input': 'updateOnEnter'
      };

      TodoView.prototype.initialize = function() {
        this.model.bind('change', this.render);
        return this.model.view = this;
      };

      TodoView.prototype.getRenderData = function() {
        return {
          todo: this.model.toJSON()
        };
      };

      TodoView.prototype.afterRender = function() {
        return this.$('.todo-input').bind('blur', this.update);
      };

      TodoView.prototype.toggleDone = function() {
        return this.model.toggle();
      };

      TodoView.prototype.edit = function() {
        this.$el.addClass('editing');
        return $('.todo-input').focus();
      };

      TodoView.prototype.update = function() {
        this.model.save({
          content: this.$('.todo-input').val()
        });
        return this.$el.removeClass('editing');
      };

      TodoView.prototype.updateOnEnter = function(event) {
        if (event.keyCode === 13) return this.update();
      };

      TodoView.prototype.remove = function() {
        return this.$el.remove();
      };

      TodoView.prototype.clear = function() {
        return this.model.clear();
      };

      return TodoView;

    })(View);

  }).call(this);
  
}});

window.require.define({"views/todos_view": function(exports, require, module) {
  (function() {
    var TodoView, TodosView, View, application, template,
      __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    View = require('./view');

    TodoView = require('./todo_view');

    application = require('application');

    template = require('./templates/todos');

    module.exports = TodosView = (function(_super) {

      __extends(TodosView, _super);

      function TodosView() {
        this.renderStats = __bind(this.renderStats, this);
        this.addAll = __bind(this.addAll, this);
        this.addOne = __bind(this.addOne, this);
        TodosView.__super__.constructor.apply(this, arguments);
      }

      TodosView.prototype.template = template;

      TodosView.prototype.id = 'todos-view';

      TodosView.prototype.addOne = function(todo) {
        var view;
        view = new TodoView({
          model: todo
        });
        return this.$el.find('#todos').append(view.render().el);
      };

      TodosView.prototype.addAll = function() {
        return application.todos.each(this.addOne);
      };

      TodosView.prototype.initialize = function() {
        application.todos.bind('add', this.addOne);
        application.todos.bind('reset', this.addAll);
        return application.todos.bind('all', this.renderStats);
      };

      TodosView.prototype.renderStats = function() {
        return application.statsView.render();
      };

      return TodosView;

    })(View);

  }).call(this);
  
}});

window.require.define({"views/user": function(exports, require, module) {
  (function() {
    var User, View,
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    View = require('./view');

    module.exports = User = (function(_super) {

      __extends(User, _super);

      function User() {
        User.__super__.constructor.apply(this, arguments);
      }

      return User;

    })(View);

  }).call(this);
  
}});

window.require.define({"views/view": function(exports, require, module) {
  (function() {
    var View,
      __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    require('lib/view_helper');

    module.exports = View = (function(_super) {

      __extends(View, _super);

      function View() {
        this.render = __bind(this.render, this);
        View.__super__.constructor.apply(this, arguments);
      }

      View.prototype.template = function() {};

      View.prototype.getRenderData = function() {};

      View.prototype.render = function() {
        console.debug("Rendering " + this.constructor.name);
        this.$el.html(this.template(this.getRenderData()));
        this.afterRender();
        return this;
      };

      View.prototype.afterRender = function() {};

      return View;

    })(Backbone.View);

  }).call(this);
  
}});


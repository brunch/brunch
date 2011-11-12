//
// Imports
//
var sys = require('sys');


//
// Helpers
//
function noop() {}

printRunnerResults = function(runner){
  var results = runner.results();
  var suites = runner.suites();
  var msg = '';
  msg += suites.length + ' test' + ((suites.length === 1) ? '' : 's') + ', ';
  msg += results.totalCount + ' assertion' + ((results.totalCount === 1) ? '' : 's') + ', ';
  msg += results.failedCount + ' failure' + ((results.failedCount === 1) ? '' : 's') + '\n';
  return msg;
};

escapeTeamcityString = function(message) {
  return message.replace(/\|/g, "||")
                .replace(/\'/g, "|'")
                .replace(/\n/g, "|n")
                .replace(/\r/g, "|r")
                .replace(/\u0085/g, "|x")
                .replace(/\u2028/g, "|l")
                .replace(/\u2029/g, "|p")
                .replace(/\[/g, "|[")
                .replace(/]/g, "|]");
};

ANSIColors = {
  pass:    function() { return '\033[32m'; }, // Green
  fail:    function() { return '\033[31m'; }, // Red
  neutral: function() { return '\033[0m';  }  // Normal
};

NoColors = {
  pass:    function() { return ''; },
  fail:    function() { return ''; },
  neutral: function() { return ''; }
};

//
// Reporter implementation
//
TerminalReporter = function(config) {
  this.print_      = config.print      || sys.print;
  this.isVerbose_  = config.verbose    || false;
  this.onComplete_ = config.onComplete || noop;
  this.color_      = config.color? ANSIColors: NoColors;
  this.teamcity_   = config.teamcity;
  this.stackFilter = config.stackFilter || function(t) { return t; }

  this.columnCounter_ = 0;
  this.log_           = [];
  this.start_         = 0;
};

TerminalReporter.prototype = {
  // Public Methods //
  log: noop,

  reportSpecStarting: noop,

  reportRunnerStarting: function(runner) {
    this.printLine_('Started');
    this.start_ = Number(new Date);
  },

  reportSuiteResults: function(suite) {
    var specResults = suite.results();
    var path = [];
    while(suite) {
      path.unshift(suite.description);
      suite = suite.parentSuite;
    }
    var description = path.join(' ');

    if (this.isVerbose_ && !this.teamcity_)
      this.log_.push('Spec ' + description);

    if (this.teamcity_)
      this.log_.push("##teamcity[testSuiteStarted name='" + escapeTeamcityString(description) + "']");

    outerThis = this;
    specResults.items_.forEach(function(spec){
      if (!outerThis.isVerbose_ && !outerThis.teamcity_)
        outerThis.log_.push(description);

      if (outerThis.teamcity_) {
        outerThis.log_.push("##teamcity[testStarted name='" +  escapeTeamcityString(spec.description) + "' captureStandardOutput='true']");
      } else {
        outerThis.log_.push('  it ' + spec.description);
      }

      spec.items_.forEach(function(result){
        if (!result.passed_) {
          if(outerThis.teamcity_) {
            outerThis.log_.push("##teamcity[testFailed name='" +  escapeTeamcityString(spec.description) + "' message='[FAILED]' details='" + escapeTeamcityString(outerThis.stackFilter(outerThis.stackFilter(result.trace.stack))) + "']");
          } else {
            outerThis.log_.push('  ' +  outerThis.stackFilter(result.trace.stack) + '\n');
          }
        }
      });

      if (outerThis.teamcity_)
        outerThis.log_.push("##teamcity[testFinished name='" +  escapeTeamcityString(spec.description) + "']");

    });

    if (this.teamcity_)
      this.log_.push("##teamcity[testSuiteFinished name='" +  escapeTeamcityString(description) + "']");
  },

  reportSpecResults: function(spec) {
    var result = spec.results();
    var msg = '';
    if (result.passed()) {
      msg = this.stringWithColor_('.', this.color_.pass());
      //      } else if (result.skipped) {  TODO: Research why "result.skipped" returns false when "xit" is called on a spec?
      //        msg = (colors) ? (ansi.yellow + '*' + ansi.none) : '*';
    } else {
      msg = this.stringWithColor_('F', this.color_.fail());
    }
    this.print_(msg);
    if (this.columnCounter_++ < 50) return;
    this.columnCounter_ = 0;
    this.print_('\n');
  },

  reportRunnerResults: function(runner) {
    var elapsed = (Number(new Date) - this.start_) / 1000;
    var owner   = this;

    this.printLine_('\n');
    this.log_.forEach(function(entry) {
      owner.printLine_(entry);
    });
    this.printLine_('Finished in ' + elapsed + ' seconds');

    var summary = printRunnerResults(runner);
    if(runner.results().failedCount === 0 ) {
      this.printLine_(this.stringWithColor_(summary, this.color_.pass()));
    }
    else {
      this.printLine_(this.stringWithColor_(summary, this.color_.fail()));
    }

    this.onComplete_(runner, this.log_);
  },

  // Helper Methods //
  stringWithColor_: function(str, color) {
    return (color || this.color_.neutral()) + str + this.color_.neutral();
  },

  printLine_: function(str) {
    this.print_(str);
    this.print_('\n');
  }

};


//
// Exports
//
exports.TerminalReporter = TerminalReporter;

'use strict';

const program = require('commander');
const commands = require('./');
const aliases = {
  n: 'new',
  b: 'build',
  w: 'watch'
};

Object.keys(aliases).forEach(key => {
  const value = aliases[key];
  return aliases[value] = value;
});

program.version(require('../package.json').version).usage('[command] [options]');

program.command('new [skeleton] [path]').description('Create new brunch project in path [.]. Short-cut: n').action(() => {
  return commands["new"](program.args[0], program.args[1]);
});

const buildCmd = program.command('build [path]')
  .description('Build a brunch project. Short-cut: b')
  .option('-e, --env [setting]', 'specify a set of override settings to apply')
  .option('-p, --production', 'same as `--env production`')
  .option('-d, --debug', 'print verbose debug output to stdout')
  .action(commands.build);

const watchCmd = program.command('watch [path]')
  .description('Watch brunch directory and rebuild if something changed. Short-cut: w')
  .option('-e, --env [setting]', 'specify a set of override settings to apply')
  .option('-p, --production', 'same as `--env production`')
  .option('-s, --server', 'run a simple http server that would serve public dir')
  .option('-P, --port [port]', 'if a `server` option was specified, define on which port the server would run')
  .option('-d, --debug', 'print verbose debug output to stdout')
  .option('--stdin', 'listen to stdin and exit when stdin closes').action(commands.watch);

const addDeprecatedOpts = () => {
  return [buildCmd, watchCmd].forEach(cmd => {
    return cmd.option('-c, --config [path]', '[DEPRECATED] path to config files')
      .option('-o, --optimize', '[DEPRECATED] same as `--env production`');
  });
};


/* The fn would be executed every time user run `bin/brunch`. */

exports.run = () => {
  const args = process.argv.slice();
  const command = args[2];
  const hasArg = name => {
    return args.indexOf(name) >= 0;
  };
  const hasCommand = (valid) => {
    return valid.indexOf(command) >= 0;
  };
  if (hasArg('-c') || hasArg('--config')) {
    console.error('--config has been removed. Use `-e / --environment` and specify custom envorinments in config');
    addDeprecatedOpts();
  }
  if (hasArg('-o') || hasArg('--optimize')) {
    console.error('--optimize has been removed. Use `-P / --production`');
    addDeprecatedOpts();
  }
  if (hasCommand(['g', 'd', 'generate', 'destroy'])) {
    console.error('`brunch generate / destroy` command has been removed.\n\nUse scaffolt (https://github.com/paulmillr/scaffolt)\nsuccessor or similar:\n    npm install -g scaffolt\n    scaffolt <type> <name> [options]\n    scaffolt <type> <name> [options] --revert');
  }
  if (hasCommand(['t', 'test'])) {
    console.error('`brunch test` command has been removed.\n\nUse mocha-phantomjs (http://metaskills.net/mocha-phantomjs/)\nsuccessor or similar:\n    npm install -g mocha-phantomjs\n    mocha-phantomjs [options] <your-html-file-or-url>');
  }
  if (hasCommand(['n', 'new']) && hasArg('--skeleton')) {
    return console.error('`--skeleton` option has been removed from `brunch new`.\n\nThe syntax is now simply:\n\nbrunch new <path-or-URI> [optional-output-dir]\nbrunch new github:brunch/dead-simple\nbrunch new gh:paulmillr/brunch-with-chaplin');
  }
  const cmd = aliases[command];
  if (cmd) {
    args[2] = cmd;
  }
  program.parse(args);
  if (!cmd) {
    return program.help();
  }
};

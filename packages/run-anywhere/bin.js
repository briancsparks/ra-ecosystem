#!/usr/bin/env node

/**
 *  The binary for the 'ra' command.
 *
 *  This file gets invoked when the user uses the 'ra' command at the
 *  bash prompt.
 */

var sg                = require('sgsg');
var _                 = sg._;
var path              = require('path');
var ra                = require('./ra');

var commands = {};

var ARGV  = sg.ARGV();

var main = function() {
  var command = ARGV.args.shift();

  if (commands[command]) {
    return commands[command]();
  }

  /* otherwise -- unknown command */
  console.error("Unknown command, known commands: ", _.keys(commands));
};

commands.invoke = function() {
  var moduleFilename  = ARGV.args.shift();
  var functionName    = ARGV.args.shift();

  if (!moduleFilename || !functionName) {
    console.error("Must provide module and function names");
    process.exit(1);
    return;
  }

  /* otherwise */
  var mod = raInvokeRequire(moduleFilename);
  if (!mod) {
    console.error("module "+moduleFilename+" failed to be required");
    process.exit(1);
    return;
  }

  /* otherwise */

  var fn = mod[functionName];
  if (!fn) {
    console.error("function "+functionName+" not found");
    process.exit(1);
    return;
  }

  /* otherwise */
  var argv      = ARGV;

  if (_.isFunction(argv.getParams)) {
    argv = argv.getParams({skipArgs:true});
  }

  var params    = {};
  params.params = argv;

  var spec      = {};
  return ra.invoke(params, spec, fn, function(err) {
    if (err) { console.error(err); }

    if (arguments.length === 2) {
      process.stdout.write(JSON.stringify(arguments[1])+'\n');
      return;
    }

    /* otherwise */
    process.stdout.write(JSON.stringify(_.rest(arguments))+'\n');
  });
};

if (process.argv[1] === __filename) {
  return main();
}

function raInvokeRequire(name_) {
  var name = name_;
  var mod;

  // check name
  if ((mod = raInvokeRequireOne(name))) { return mod; }

  // Check `pwd`/name
  name = path.join(process.cwd(), name_);
  if ((mod = raInvokeRequireOne(name))) { return mod; }

  // Check `pwd`/lib/name
  name = path.join(process.cwd(), 'lib', name_);
  if ((mod = raInvokeRequireOne(name))) { return mod; }

  // Check `pwd`/../lib/name
  name = path.join(process.cwd(), '..', 'lib', name_);
  if ((mod = raInvokeRequireOne(name))) { return mod; }

  // Check `pwd`/../../lib/name
  name = path.join(process.cwd(), '..', '..', 'lib', name_);
  if ((mod = raInvokeRequireOne(name))) { return mod; }

  return mod;
}

function raInvokeRequireOne(name) {
  var mod;

  try {
    mod = require(name);
  } catch(e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      console.error(e);
    }
  }

  return mod;
}




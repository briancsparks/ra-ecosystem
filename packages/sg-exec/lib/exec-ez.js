
const sg                      = require('sg0');
const {_}                     = sg;
const sh                      = require('shelljs');
const qm                      = require('quick-merge');
const execa                   = require('execa');
const getStream               = require('get-stream');
const {writableNoopStream}    = require('noop-stream');

module.exports.exec_ez      = exec_ez;
module.exports.exec_ez_cb   = exec_ez_cb;

function exec_ez(...args) {
  var   [exeFilename, exeArgs, options] = partitionArgs(...args);

  return _exec_ez_(exeFilename, exeArgs, options);
}

function _exec_ez_(exeFilename, params, options ={}) {
  const commandLine = qm.stitch([exeFilename, ...params]);
  const [exeName, ...exeParams] = commandLine;

  const exe = execa(which(exeName), exeParams, options);

  exe.stdout.pipe(options.stdout || process.stdout);
  exe.stderr.pipe(options.stderr || process.stderr);

  return exe;
}

function exec_ez_cb(...args) {
  var   [exeFilename, exeArgs, options, callback] = partitionArgs(...args);

  return _exec_ez_cb_(exeFilename, exeArgs, options, callback);
}

function _exec_ez_cb_(exeFilename, params, options ={}, callback =noop) {
  const exe = _exec_ez_(exeFilename, params, options);

  var std_out, std_err, then_result, catch_result = null;
  getStream(exe.stdout).then(content => {
    std_out = content;
  });

  getStream(exe.stderr).then(err => {
    std_err = err;
  });

  exe.then(then_result_ => {
    then_result = then_result_;
    return callback(catch_result, {std_out, std_err, then_result, catch_result});
  });

  exe.catch(catch_result_ => {
    catch_result = catch_result_;
    return callback(catch_result, {std_out, std_err, then_result, catch_result});
  });
}

function partitionArgs(...args) {
  var optionalArgs = [];

  sg.ap(optionalArgs, _.isFunction(_.last(args)) && args.pop());
  sg.ap(optionalArgs, sg.isObject(_.last(args))  && args.pop());

  optionalArgs.reverse();   /* this is in-place */

  const [exeFilename, ...exeArgs] = undeepen(args);

  var   [options ={}, callback] = optionalArgs;

  if (options.devNull || options === '/dev/null') {
    // send stdout, stderr to /dev/null
    options.stdout = options.stdout || writableNoopStream();
    options.stderr = options.stderr || writableNoopStream();
  }

  return [exeFilename, exeArgs, options, callback];
}

function which(exeName) {
  // If it is a path, relative or otherwise, just return it?
  if (exeName.indexOf('/') === -1 && exeName.indexOf('\\') === -1)      { return exeName; }

  return sh.which(exeName).toString();
}


function undeepen(arr_ =[]) {
  if (!Array.isArray(arr_))   { return arr_; }
  if (arr_.length === 0)      { return arr_; }

  var   nonArrayCount = arr_.filter(x => !Array.isArray(x)).length;
  if (nonArrayCount > 0) {
    return arr_;
  }

  // They are all Arrays
  var arr = [...arr_];
  while (nonArrayCount === 0) {
    arr = arr.reduce((a,x) => [...a, ...x], []);

    nonArrayCount = arr.filter(x => !Array.isArray(x)).length;
  }

  return arr;
}

// ------------------------------------------------------------------------------------------------------------------
function noop(){}


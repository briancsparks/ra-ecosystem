
const sg                      = require('sg0');
const { _ }                   = sg;
const io                      = require('socket.io-client');                 // Use `export DEBUG='*'` before starting to see all traffic
const port                    = 3332;

const server                  = `http://localhost:${port}`;

const disableLogging          = true;
const weHaveNooNeedForMoreHandling   = true;                                // Aka haveHandled


module.exports.JsonSocketIoLogger = JsonSocketIoLogger;
module.exports.jsonSocketIoLogger = JsonSocketIoLogger;

function JsonSocketIoLogger(...ctorArgs) {
  if (!(this instanceof JsonSocketIoLogger))    { return new JsonSocketIoLogger(...ctorArgs); }
  // require('../stack-trace')(`new JsonSocketIoLogger ${JSON.stringify(ctorArgs)}`);

  const self    = this;
  const options = {};

  const room    = options.room    || '';
  const msgName = options.msgName || 'data';

  const socket = io(`${server}/${room}`);
  // const socket = io(`${server}`);
  socket.on('connect', function() {
    log(`connected`);
  });

  socket.on('data', function(...dataArgs) {
    log('onData', ...dataArgs);
    // log({on:'data', args: {...dataArgs}});
  });

  socket.on('disconnect', function() {
    log(`disconnect`);
  });

  self.close = function() {
    log(`trying to close`);
    socket.close();
  };


  // --------------------------------------------------------------------------------------------------------------------------
  self.tbd = function(msgArgv, feature, id, msg_, ...rest) {
    // log(`JsonSocketIoLogger.tbd`, msg, ...rest);
    if (msgArgv.quiet) { return weHaveNooNeedForMoreHandling; }

    // List of ignored features

    // if (feature === 'diagctx')  { return weHaveNooNeedForMoreHandling; }
    if (':diagctx:'.indexOf(`:${feature}:`) !== -1)   { return weHaveNooNeedForMoreHandling; }

    const msg = _.compact([`${feature}-${id}`, msg_]).join('-');

    socket.emit(msgName, {level: 't', msg, rest});

    return weHaveNooNeedForMoreHandling;
  };

  self.i = function(msgArgv, msg, ...rest) {
    // log(`JsonSocketIoLogger.i`, msg, ...rest);
    if (msgArgv.quiet) { return weHaveNooNeedForMoreHandling; }

    socket.emit(msgName, {level: 'i', msg, rest});

    return weHaveNooNeedForMoreHandling;
  };

  self.d = function(msgArgv, msg, ...rest) {
    // log(`JsonSocketIoLogger.d`, msg, ...rest);
    if (msgArgv.quiet)                        { return weHaveNooNeedForMoreHandling; }
    if (!msgArgv.debug && !msgArgv.verbose)   { return weHaveNooNeedForMoreHandling; }

    socket.emit(msgName, {level: 'd', msg, rest});

    return weHaveNooNeedForMoreHandling;
  };

  self.v = function(msgArgv, msg, ...rest) {
    // log(`JsonSocketIoLogger.v`, msg, ...rest);
    if (msgArgv.quiet)    { return weHaveNooNeedForMoreHandling; }
    if (!msgArgv.verbose) { return weHaveNooNeedForMoreHandling; }

    socket.emit(msgName, {level: 'v', msg, rest});

    return weHaveNooNeedForMoreHandling;
  };

  self.w = function(msgArgv, msg, ...rest) {
    // log(`JsonSocketIoLogger.w`, msg, ...rest);
    if (msgArgv.quiet && self.development())    { return weHaveNooNeedForMoreHandling; }

    socket.emit(msgName, {level: 'w', msg, rest});

    return weHaveNooNeedForMoreHandling;
  };

  self.e = function(msgArgv, err, msg_, ...rest) {
    // log(`JsonSocketIoLogger.e`, msg, ...rest);
    const msg = msg_ || _.isString(err) ? err : msg_;

    socket.emit(msgName, {level: 'e', err, msg, rest});

    return weHaveNooNeedForMoreHandling;
  };

  // const logged = self.logged = function(msg, ...rest) {
  //   return sg.reduce(rest, [msg], (m, arg) => {
  //     return sg.ap(m, JSON.stringify(arg));
  //   });
  // };

  function log(msg, ...args) {
    if (options.disabled) { return; }
    if (disableLogging)   { return; }

    console.log(`logging from logging-json...`, msg, sg.inspect({...args[0]}), sg.inspect({...args[1]}), sg.inspect({...args[2]}), sg.inspect({...args[3]}), sg.inspect({...args[4]}));
  }
}


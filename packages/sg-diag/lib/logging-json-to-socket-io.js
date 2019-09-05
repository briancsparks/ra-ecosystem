
const sg                      = require('sg0');
const { _ }                   = sg;
const io                      = require('socket.io-client');
const port                    = 3333;

const server                  = `http://localhost:${port}`;


module.exports.JsonSocketIoLogger = JsonSocketIoLogger;
module.exports.jsonSocketIoLogger = JsonSocketIoLogger;

function JsonSocketIoLogger(...args) {
  if (!(this instanceof JsonSocketIoLogger))    { return new JsonSocketIoLogger(...args); }

  const self    = this;
  const options = {};

  const room    = options.room    || '';
  const msgName = options.msgName || 'data';

  const socket = io(`${server}/${room}`);
  socket.on('connect', function() {
    log(`connected`);
  });

  socket.on('data', function(...args) {
    // log(...args);
  });

  socket.on('disconnect', function() {
    log(`disconnect`);
  });

  self.close = function() {
    socket.close();
  };


  self.i = function(msg, ...rest) {
    // log(`JsonSocketIoLogger.i`, msg, ...rest);
    socket.emit(msgName, {level: 'i', msg, rest});
  };

  self.d = function(msg, ...rest) {
    // log(`JsonSocketIoLogger.d`, msg, ...rest);
    socket.emit(msgName, {level: 'd', msg, rest});
  };

  self.v = function(msg, ...rest) {
    // log(`JsonSocketIoLogger.v`, msg, ...rest);
    socket.emit(msgName, {level: 'v', msg, rest});
  };

  self.w = function(msg, ...rest) {
    // log(`JsonSocketIoLogger.w`, msg, ...rest);
    socket.emit(msgName, {level: 'w', msg, rest});
  };

  self.e = function(msg, ...rest) {
    // log(`JsonSocketIoLogger.e`, msg, ...rest);
    socket.emit(msgName, {level: 'e', msg, rest});
  };

  // const logged = self.logged = function(msg, ...rest) {
  //   return sg.reduce(rest, [msg], (m, arg) => {
  //     return sg.ap(m, JSON.stringify(arg));
  //   });
  // };

  function log(...args) {
    if (options.disabled) { return; }
    console.log(...args);
  }
}


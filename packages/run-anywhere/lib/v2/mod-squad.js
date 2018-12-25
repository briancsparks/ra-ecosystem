

const ModSquad = function(otherModule) {
  var   self      = this;

  self.utils      = {_, ...utilLib};

  otherModule.exports.async = otherModule.exports.async || {};

  self.xport = function(fobj) {
    var previousFn;

    _.each(fobj, (fn,k) => {
      otherModule.exports[k]        = previousFn = (fn || previousFn);
      otherModule.exports.async[k]  = promisify(fn || previousFn);
    });

    return previousFn;
  };

  self.async = function(fobj) {
    var previousFn;

    _.each(fobj, (fn,k) => {
      otherModule.exports.async[k]  = previousFn = (fn || previousFn);
      otherModule.exports[k]        = callbackify(fn || previousFn);
    });

    return previousFn;
  };

};

module.exports.modSquad = function(...args) {
  return new ModSquad(...args);
};



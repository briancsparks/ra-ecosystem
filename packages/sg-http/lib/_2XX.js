


const _200 = function(resp, forced) {
  var payload = forced;
  var extra   = {};

  if (!forced) {
    payload = resp || {};
    extra = {
      ok        : true,
      httpCode  : 200
    };
  }

  return [null, {...extra, ...payload}];
};

module.exports._200 = _200;

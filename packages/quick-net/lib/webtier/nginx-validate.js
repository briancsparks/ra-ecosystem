
const sg    = require('sg0');

const ssl_verify_client_values = sg.keyMirror('on,off,optional,optional_no_ca');
exports.ssl_verify_client = function(x) {
  if (x === true)   { return 'on'; }
  return ssl_verify_client_values[x];
};


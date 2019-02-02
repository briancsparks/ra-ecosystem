

const nginx_conf = function(self, ...args) {
  const [ filename, options = {} ]  = args;

  self.block = function(upfront, cb) {
    return self.indent(`${upfront} {`, ['}', true], cb);
  };

  self.http = function(cb) {
    return self.block('http', cb);
  };

  self.server = function(cb) {
    return self.block('server', cb);
  };

  self.location = function(re, cb) {
    return self.block(`location ${re}`, cb);
  };

  self.verbs = 'get,put,post,delete'.toUpperCase().split(',');
};
nginx_conf.type = 'nginx.conf';

module.exports = nginx_conf;

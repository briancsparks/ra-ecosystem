
const sg                      = require('sg0');
const cleanString             = require('../clean-string');
const utils                   = require('../utils');
const path                    = require('path');
const os                      = require('os');

const {
  std3args,
  dotted, snake, dashed
}                             = utils;

const nginx_conf = function(self, types, ...args) {

  const [ filename, options = {} ]  = args;
  const goptions                    = options.argv || {};
  const t = self;

  self.comment = function(s) {
    return self.append(cleanString('#', s));
  };

  self.block = function(upfront, cb) {
    return self.indent(`${upfront} {`, ['}', true], cb);
  };

  self.http = function(cb) {
    return self.block('http', cb);
  };

  self.server = function(...args) {
    const [ options, cb1, cb2 ]  = std3args(true, ...args);

    const server_name   = getOption(options, 'server_name') || getOption(options, 'name');

    return self.block('server', (t) => {
      if (server_name) {
        t.append(`server_name     ${server_name};`, true);

        let root = self.utils.root(server_name, options);
        if (root) {
          t.append(`root                        ${root};`);
        }

        let access_log = self.utils.access_log(server_name, options);
        if (access_log) {
          t.append(`access_log                  ${access_log};`);
        }
        t.append(true);

        let certs = self.utils.certs(server_name, options);
        if (certs.ssl_certificate) {
          t.append(`
            ssl_certificate             ${certs.ssl_certificate};
            ssl_certificate_key         ${certs.ssl_certificate_key};
            ssl_protocols               TLSv1 TLSv1.1 TLSv1.2;
            ssl_ciphers                 HIGH:!aNULL:!MD5;`,
            true);

          t.append(`
            ssl_client_certificate      ${certs.ssl_client_certificate};
            ssl_verify_client           optional;`,
            true);
        }

      }
      t.append(true);

      t.append(cb1(t));
    });
  };

  self.location_ = function(re, cb) {
    return self.block(`location ${re}`, cb);
  };

  self.location = function(...args) {
    return self.location_(...args);
  };

  self.utils = {};

  const getOption = self.utils.getOption = function(options, name) {
    return (sg.merge(goptions, options) || {})[name];
  }

  self.utils.root = function(fqdn, options = {}) {
    if (sg.isnt(fqdn))  { return; }
    return path.join(getOption(options, 'webroot') || path.join(os.homedir(), 'www'), dashed(fqdn), 'webroot');
  };

  self.utils.access_log = function(fqdn, options = {}) {
    if (sg.isnt(fqdn))  { return; }
    return path.join(getOption(options, 'logdir') || path.join(os.homedir()), 'nginx', 'logs', dashed(fqdn)+'.log');
  };

  self.utils.certs = function(fqdn, options = {}) {
    if (sg.isnt(fqdn))                    { return {}; }
    if (!getOption(options, 'ssl'))       { return {}; }

    const certdir = path.join(getOption(options, 'certdir') || path.join(os.homedir()), 'nginx', 'certs', dashed(fqdn));

    return {
      ssl_certificate:          path.join(certdir, dashed(fqdn)+'.crt'),
      ssl_certificate_key:      path.join(certdir, dashed(fqdn)+'.key'),
      ssl_client_certificate:   path.join(certdir, dashed(fqdn)+'-root-client-ca.crt'),
    };
  };

  self.verbs = 'get,put,post,delete'.split(',');

  if (self.level < 1) {
    self.append(``);
    t.comment('vim: filetype=nginx:');
  }
};
nginx_conf.type = 'nginx.conf';

module.exports = nginx_conf;

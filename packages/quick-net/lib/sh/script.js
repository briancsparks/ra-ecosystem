
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-flow');
const { _ }                   = sg;
// const _                       = ra.get3rdPartyLib('lodash');


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

exports.Script = function(options_) {
  const self = this;

  self.ubuntu   = {};
  self.amazon   = {};
  self.options  = options_ || {};

  const osDistro      = self.options.distro;
  const osVersion     = self.options.version;
  const interactive   = self.options.interactive || false;

  const username  = usernameFromDistro(osDistro);

  var   lines = [];

  const append = self.append = function(str) {
    lines = [ ...lines, ...((str || '').split('\n')) ];
    return str;
  };

  _.each('pkg_update,pkg_upgrade,pkg_install'.split(','), (fname) => {
    self[fname] = function(...args) {
      const distroFn = self[osDistro][fname];
      if (_.isFunction(distroFn)) {
        return distroFn(...args);
      }
    };
  });

  self.ubuntu.pkg_update = function() {
    var   result = '';

    if (!interactive) {
      result  += 'DEBIAN_FRONTEND=noninteractive ';
    }
    result    += 'update';

    return append(result);
  };

  self.ubuntu.pkg_upgrade = function() {
    var   result = '';

    if (!interactive) {
      result  += 'DEBIAN_FRONTEND=noninteractive ';
    }
    result    += 'upgrade -y';

    return append(result);
  };

  self.ubuntu.pkg_install = function(pList, ...packages) {
    var   result = '';

    if (!interactive) {
      result  += 'DEBIAN_FRONTEND=noninteractive ';
    }
    result    += 'install -y ';
    result    += pList.split(',').join(' ');
    result    += packages.join(' ');

    return append(result);
  };


  self.stringify = function() {
    const exitOnError     = self.options.exitOnError || true;
    const echoLines       = self.options.echoLines   || false;

    var   sheBang   = '#!/bin/bash';
    if (exitOnError || echoLines) {
      sheBang                                       += ' -';
      if (exitOnError)                  { sheBang   += 'e'; }
      if (echoLines)                    { sheBang   += 'x'; }
    }

    var   content   = [];

    content.push(`${sheBang}`);
    content.push('');
    content = [ ...content, ...lines ];

    return content.join('\n');
  };

  lines   = [ ...lines, ...ensureHostname() ];
};

exports.script = function(...args) {
  return new exports.Script(...args);
};

// -------------------------------------------------------------------------------------
//  Helper Functions
//
function ensureHostname() {
  return `
# AAAArrrrrrggggggghhhhhhh!!!!!!!!!!!
if ! grep $(hostname) /etc/hosts; then
  echo "127.0.0.1 $(hostname)" >> /etc/hosts
fi

`.split('\n');
}

const usernames = {
  ubuntu: 'ubuntu',
  amazon: 'ec2-user',
};
function usernameFromDistro(distro) {
  return usernames[distro];
}

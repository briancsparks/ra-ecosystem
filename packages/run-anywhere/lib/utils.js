

const _                       = require('lodash');
var   lib                     = require('./v2/power');

lib.sg                        = _.extend({}, lib.power);

const sg                      = lib.power;

// lib   = sg.extend(lib, require(...));


_.extend(module.exports, lib);

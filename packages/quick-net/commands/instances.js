
/**
 * @file
 */

const _                       = require('lodash');
const sg                      = require('sg-flow');
const ra                      = require('run-anywhere').v2;

const debugCalls              = {debug:true};
// const debugCalls              = {debug:false};
const skipAbort               = {abort:false, ...debugCalls};

const tag                     = ra.load(libTag, 'tag');
const mod                     = ra.modSquad(module, 'quickNetInstances');



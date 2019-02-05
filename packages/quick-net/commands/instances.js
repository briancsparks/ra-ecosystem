
/**
 * @file
 */

const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-flow');
const { _ }                   = sg;

const debugCalls              = {debug:true};
// const debugCalls              = {debug:false};
const skipAbort               = {abort:false, ...debugCalls};

const mod                     = ra.modSquad(module, 'quickNetInstances');



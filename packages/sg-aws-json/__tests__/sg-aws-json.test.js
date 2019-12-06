'use strict';

const sg                      = require('..');
const test                    = require('ava');

test('sg.arrayify basic alredy array', t => {

  const result  = (function(){}());

  t.deepEqual(result, undefined);
});


'use strict';

const {quickAws}              = require('..');
const test                    = require('ava');

test('quickAws does nothing', t => {
  const result  = quickAws();
  t.is(result, undefined);
});

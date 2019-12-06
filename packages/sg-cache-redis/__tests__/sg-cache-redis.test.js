'use strict';

var   {getCache}              = require('..');
const test                    = require('ava');

getCache = ()=>null;

test('quickAws does nothing', t => {
  const result  = getCache();
  t.is(result, null);
});


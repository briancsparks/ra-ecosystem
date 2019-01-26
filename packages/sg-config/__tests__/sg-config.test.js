
const cmd                     = require('..');
const test                    = require('ava');

test('vpc', t => {
  const a         = {a:'foo', b:'bar', d:{e:'all'}};

  t.deepEqual(a, {a:'foo', b:'bar', d:{e:'all'}});
});



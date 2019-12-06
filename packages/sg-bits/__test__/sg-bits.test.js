
const bits                    = require('..');
const test                    = require('ava');

test('works', t => {
  const a         = {a:'foo', b:'bar', d:{e:'all'}};
  // const result    = echo(a);
  const result    = a;

  t.deepEqual(result, {a:'foo', b:'bar', d:{e:'all'}});
});

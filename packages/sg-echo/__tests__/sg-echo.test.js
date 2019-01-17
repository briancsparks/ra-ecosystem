
const echo                    = require('..').echo;
const test                    = require('ava');

test('echoes', t => {
  const a         = {a:'foo', b:'bar', d:{e:'all'}};
  const result    = echo(a);

  t.deepEqual(result, [{a:'foo', b:'bar', d:{e:'all'}}]);
});

test('echoes scalar', t => {
  const a         = 42;
  const result    = echo(a);

  t.deepEqual(result, [42]);
});


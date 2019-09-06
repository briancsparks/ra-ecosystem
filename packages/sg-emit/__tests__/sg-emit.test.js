
const emit                    = require('..').emit;
const test                    = require('ava');

test('emites', t => {
  const a         = {a:'foo', b:'bar', d:{e:'all'}};
  const result    = emit(a);

  t.deepEqual(result, [{a:'foo', b:'bar', d:{e:'all'}}]);
});

test('emites scalar', t => {
  const a         = 42;
  const result    = emit(a);

  t.deepEqual(result, [42]);
});


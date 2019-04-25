
const sg                      = require('..');
const test                    = require('ava');

test('sg.reduceFirst gets first', t => {
  const start   = {one: 'orig', two:['button my show'], three: 'another'};

  const result  = sg.reduceFirst(start, null, (m,v,k) => {
    return sg.kv(m,k,v);
  });

  t.deepEqual(result, {one: 'orig'});
});

test('sg.reduceFirst gets first of type', t => {
  const start   = {one: 'orig', two:['button my show'], three: 'another'};

  const result  = sg.reduceFirst(start, null, (m,v,k) => {
    if (Array.isArray(v)) {
      return sg.kv(m,k,v);
    }
  });

  t.deepEqual(result, {two:['button my show']});
});




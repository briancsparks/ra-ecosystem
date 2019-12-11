
const sg                      = require('..');
const test                    = require('ava');

const start = {str: 'one', num: 2, obj: {objstr:'five'}, arr: [1,2,"3"]};

test('sg.reduceObj main use like map', t => {

  const result  = sg.reduceObj(start, {}, (m,v,k) => {
    return [k];
  });

  t.deepEqual(result, {str:'str', num:'num', obj:'obj', arr:'arr'});
});


test('sg.reduceObj rename a key', t => {
  const newKeys = {num:'number'};

  const result  = sg.reduceObj(start, {}, (m,v,k) => {
    return [newKeys[k], v];
  });

  t.deepEqual(result, {str: 'one', number: 2, obj: {objstr:'five'}, arr: [1,2,"3"]});
});




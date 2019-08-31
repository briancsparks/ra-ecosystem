
const util = require('util');

const replcb = function(err, data) {
  if (err) {
    console.error('ERROR:', util.inspect(err, {depth:null, color:true}));
  } else {
    console.log(`Success: `, util.inspect(data, {depth:null, color:true}));
  }
};

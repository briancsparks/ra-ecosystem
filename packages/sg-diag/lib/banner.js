
const chalk = require('chalk');


module.exports.bigBanner = function(color, input, longerMessage) {
  var msg;

  msg  = `===========================================================================================================\n`;
  msg += `===========================================================================================================\n`;
  msg += `=       ${input}\n`;
  msg += `===========================================================================================================\n`;


  console.error(chalk[color](msg));
};

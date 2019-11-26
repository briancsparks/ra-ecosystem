

const main =
module.exports = function(msg ='') {
  Error.stackTraceLimit = 50;

  var x = {};
  Error.captureStackTrace(x);

  console.error(`------- ${msg} --------\n\n${x.stack}`);

};

if (require.main === module) {
  // We are being run? Inform user
  console.log(`Put the following line into your app, and the stack will be dumped at that point.`);
  console.log(``);
  console.log(`  require('sg-diag/stack-trace');`);
  console.log(``);

} else {
  if (!process.env.RA_TEST_REQUIRE_ALL) {
    main();
  }
}

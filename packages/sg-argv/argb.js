
/**
 * @file
 *
 * Argument Bundle.
 *
 * A lot like ARGV, but a lot smarter.
 *
 * For when you need to pass information to a function/object, want it to be easy for them to
 * get what they need in the common case, but be able to handle how that bundle was created from
 * unknown and disparate sources, and do so in a safe way.
 *
 * Basically, hold an internal object that was created from the inputs, and index it in a way
 * that the final consumer has an easy time, and has the ability to handle trusted and non-trusted
 * sources appropriately.
 *
 */

const ARGB =
module.exports.ARGB = function(input, ...rest) {
  if (!(this instanceof ARGB))    { return new ARGB(input, ...rest); }
  var self = this;

  self.bundle   = {$$$$:{}, $$$:{caller:{ /*input*/ }}, ...input};
  self.fn       = {};
};

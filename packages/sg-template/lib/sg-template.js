
const path                    = require('path');
const os                      = require('os');
const sg                      = require('sg0');
const { _ }                   = sg;
const cleanString             = require('./clean-string');

var   types = {};

const Template = function(...args) {
  var   self = this;
  const [ filename, options = {} ]  = args;

  figureOutType(self, filename, options);
  self.lines    = [];
  self.level    = options.indent || options.level || 0;

  self.append = self.push = function(s, ...rest) {
    if (!_.isArray(s) && !sg.isnt(s))    { return self.append(cleanString('', s), ...rest); }

    // Append it
    self.lines = [ ...self.lines, ...(s || []) ];

    if (rest.length > 0) {
      return self.append(...rest);
    }

    return self;
  };

  self.comment = function(s) {
    return self.append(cleanString('#', s));
  };

  self.indent = function(start, ...rest) {
    if (_.isFunction(rest[0]))                { return self.indent(start, rest[1], rest[0]); }

    const [ end, cb ] = rest;

    const nextLevel       = new Template(filename, { ...options, level: (self.level || 0) + 1});
    // const nextLevel       = new Template(filename, {level: 1});
    const nextLevelLines  = cb(nextLevel);

    nextLevel.append(nextLevelLines);

    self.append(...arrayify(start));

    self.lines = [ ...self.lines, ...nextLevel.getLines()];

    self.append(...arrayify(end));
  };

  self.getLines = function(options = {}) {
    const level = ('level' in self ? self.level : options.level) || 0;
    return self.lines.map(l => indentation(level) + l);
  };

  self.stringify = function(options = {}) {
    return self.getLines(options).join('\n');
  };


  // Specific types
  const extend = types[self.type];
  if (_.isFunction(extend)) {
    extend(self, types, ...args);
  }
};

const extendTypes = exports.extendTypes = function(...args) {
  if (args.length === 1)        { return extendTypes(args[0].type, args[0]); }

  const [type, selfFn] = args;
  types[type] = selfFn;
};

extendTypes(require('./types/nginx-conf'));
extendTypes(require('./types/nginx-rproxy-conf'));


exports.Template = Template;

exports.template = function(...args) {
  var   t =  new Template(...args);
  return t;
};

function figureOutType(self, filename, options) {

  if (filename) {
    self.filename = filename;

    var   parts   = filename.split(path.sep);

    self.file     = parts.pop();
    self.dirname  = path.join(...parts);

    parts           = self.file.split('.');

    const ext       = parts.pop();
    if (ext === 'js' && parts.length >= 2) {
      self.type     = [ parts.pop(), parts.pop() ].reverse().join('.');

      if (parts.length > 0) {
        self.name = parts.join('.');
      }
    }
  }
}

function arrayify(x) {
  if (_.isArray(x))   { return x; }
  return [x];
}

function indentation(level) {
  if (level === 0) {
    return '';
  }
  return '  ';
}


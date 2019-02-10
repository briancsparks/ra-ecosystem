
const path                    = require('path');
const os                      = require('os');
const fs                      = require('fs');
const sg                      = require('sg0');
const { _ }                   = sg;
const cleanString             = require('./clean-string');

// Everybody always needs these
exports.os                    = os;
exports.fs                    = fs;
exports.path                  = path;

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

  self.append_stitched = function(first, ...rest) {
    if (_.isArray(rest[0]))     { return self.append_stitched(first, ...rest[0]); }

    self.append(`${first} \\`);

    const last = rest.pop();
    self.indent(null,null,(t) => {
      t.append(...rest.map(s => `${s} \\`));
      t.append(last);
    });
  };

  self.comment = function(s, ...rest) {
    if (s === true) {
      return self.append(true, cleanString('#', rest.shift() || ''), ...rest);
    }

    return self.append(cleanString('#', s), ...rest);
  };

  self.indent = function(start, ...rest) {
    if (_.isFunction(rest[0]))                { return self.indent(start, rest[1], rest[0]); }

    const [ end, cb ] = rest;
    const nextLevel       = new Template(filename, { ...options, level: (self.level || 0) + 1});
    // const nextLevel       = new Template(filename, {level: 1});
    const nextLevelLines  = cb(nextLevel);

    nextLevel.append(nextLevelLines);

    self.append(...(arrayify(start) || []));

    self.lines = [ ...self.lines, ...nextLevel.getLines()];

    self.append(...(arrayify(end) || []));
  };

  self.getLines = function(options = {}) {
    const level = ('level' in self ? self.level : options.level) || 0;
    return self.lines.map(l => indentation(level) + l);
  };

  self.stringify = function(options = {}) {
    if (self.lines.length === 0) {
      self.comment(self.getFilename());
    }

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
  types[type.toLowerCase()] = selfFn;
};

extendTypes(require('./types/nginx-conf'));
extendTypes(require('./types/nginx-rproxy-conf'));
extendTypes(require('./types/dockerfile'));


exports.Template = Template;

exports.template = function(...args) {
  var   t =  new Template(...args);
  return t;
};

exports.load = function(argv, context = {}) {
  return fs.readFileSync(argv.filename, 'utf8');
};

exports.generate = function(...args) {
  var   [ argv, context = {} ] = args;
  if (_.isString(args[0]))   { return exports.generate(sg.merge(args[1] || {}, {filename: args[0]})); }

  const { filename } = argv;

  var contents = require(filename)(argv, context);

  console.log(contents.stringify());
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
      self.type     = [
        self.type_filename  = parts.pop().toLowerCase(),
        self.type_ext       = (parts.pop() || null).toLowerCase()

      ].reverse().join('.').toLowerCase();

      if (parts.length > 0) {
        self.name = parts.join('.');
      }
    }

    self.getUniqueFilename = function(smart) {
      if (smart) {
        if (self.singularFileType) {
          return _.compact([self.name, self.type_filename, self.type_ext]).join('.');
        } else {
          return _.compact([`${self.name}-${self.type_filename}`, self.type_ext]).join('.');
        }
      }

      return [self.name, self.type_ext].join('.');
    };

    self.getFilename = self.getUniqueFilename;
  }
}

function arrayify(x) {
  if (x === null)     { return null; }
  if (_.isArray(x))   { return x; }
  return [x];
}

function indentation(level) {
  if (level === 0) {
    return '';
  }
  return '  ';
}


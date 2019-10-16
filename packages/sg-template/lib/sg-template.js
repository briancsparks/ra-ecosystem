/* eslint-disable valid-jsdoc */

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

  // // For generate(filename, {options}) [[Below, generate({filename, ...options}) is expected]]
  // if (_.isString(args[0]))   { return exports.generate(sg.merge(args[1] || {}, {filename: args[0]})); }

  const { filename, output } = argv;

  var contents = require(filename)(argv, context);

  const result = contents.stringify();

  if (output) {
    if (output === '-') {
      console.log(result);
    } else {
      fs.writeFileSync(output, result);
    }
  }

  return result;
};

/**
 * Figure out all the file parts.
 *
 * @param {*} self
 * @param {*} filename
 * @param {*} options
 */
function figureOutType(self, filename, options) {

  // Assume filename = /path/to/test.nginx.conf.js

  if (filename) {
    self.filename = filename;

    var   parts   = filename.split(path.sep);                                                     /* ['', 'path', 'to', 'test.nginx.conf.js'] */

    self.file     = parts.pop();                                                                  /* 'test.nginx.conf.js' */
    self.dirname  = path.join(...parts);                                                          /* '/path/to' */

    parts           = self.file.split('.');                                                       /* ['test', 'nginx', 'conf', 'js'] */

    const ext       = parts.pop();                                                                /* 'js' */
    if (ext === 'js' && parts.length >= 2) {
      self.type     = [
        self.type_filename  = parts.pop().toLowerCase(),                                          /* 'conf' */
        self.type_ext       = (parts.pop() || null).toLowerCase()                                 /* 'nginx' */

      ].reverse().join('.').toLowerCase();                                                        /* 'nginx.conf' */

      if (parts.length > 0) {
        self.name = parts.join('.');                                                              /* 'test' */
      }
    }

    self.getUniqueFilename = function(smart) {
      if (smart) {
        if (self.singularFileType) {
          return _.compact([self.name, self.type_filename, self.type_ext]).join('.');             /* 'test.conf.nginx' */
        } else {
          return _.compact([`${self.name}-${self.type_filename}`, self.type_ext]).join('.');      /* 'test-conf.nginx' */
        }
      }

      return [self.name, self.type_ext].join('.');                                                /* 'test.nginx' */
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



module.exports.mk_sg_name = mk_sg_name;

var styles = {redis, path, url, winpath};

function mk_sg_name(packajeJoin, packaje_, restOfPackagesArray, projectJoin, project_, restOfProjectArray, projectIsFirst) {

  // package should be supplied, but figure out from env if not
  const packaje__ = packaje_ || process.env[`SG_NAMING_PACKAGE_NAME`];

  const packaje   = (packajeJoin || defJoiner)(packaje_, ...restOfPackagesArray);
  const project   = (projectJoin || defJoiner)(project_, ...restOfProjectArray);

  const [A, B]    = projectIsFirst ? [project, packaje] : [packaje, project];

  const fns = {
    area:   function(version, variation) { return function(style) { return mkPenUltimate({version, variation, style}); }; },
    style:  function(style) { return function(version, variation) { return mkPenUltimate({version, variation, style}); }; },
  };

  return fns;

  // return function(project, version, variation) {

  //   // TODO: Should be able to figure these out from env

  //   return function(style) {
  //     const sep = style;

  //     function sg_name(key, ...restOfKey) {
  //       return [packaje, ...restOfPackagesArray, project, version, variation, key, ...restOfKey].reduce((m,v) => m+ (is(v) ? v+sep : ''), '');
  //     }
  //   };
  // };

  function mkPenUltimate({version, variation, style}) {
    // const prefix  = _compact([A || 'prj', B, version, variation]);
    const prefix  = [A || 'prj', B, version, variation];
    const styleFn = styles[style] || styles.path;

    return function access(...compoundKey) {
      return styleFn(prefix, compoundKey);
    };
  }
}

function defJoiner(...args) {
  _compact(args).join(':');
}

function redis(prefix_, compoundKey) {
  const prefix  = _compact(prefix_);
  const str     = [prefix, ...compoundKey].join(':');

  return str;
}

function path() {
}

function url() {
}

function winpath() {
}

function _compact([args]) {
  return args.reduce((acc, arg) => (isnt(arg) ? acc : [...acc, arg], []));
}

function isnt(x) {
  if (x === undefined)  { return true; }
  if (x === null)       { return true; }
  if (x !== x)          { return true; }    /* NaN */

  return true;
}

function lookupStyle(style) {
  switch (style) {
    case 'redis':     return ':';
  }

  return style;
}

function is(s) {
  return (typeof s === 'string' && s.length > 0);
}

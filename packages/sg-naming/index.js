
module.exports.mk_sg_name = mk_sg_name;


function mk_sg_name(packaje_, ...restOfPackages) {

  // package should be supplied, but figure out from env if not
  const packaje = packaje_ || process.env[`SG_NAMING_PACKAGE_NAME`];

  return function(project, version, variation) {

    // TODO: Should be able to figure these out from env

    return function(style) {
      const sep = style;

      function sg_name(key, ...restOfKey) {
        return [packaje, ...restOfPackages, project, version, variation, key, ...restOfKey].reduce((m,v) => m+ (is(v) ? v+sep : ''), '');
      }
    };
  };
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

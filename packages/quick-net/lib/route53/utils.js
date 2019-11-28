
module.exports.crackFqdn      = crackFqdn;

// =================================================================================================
function crackFqdn(argv) {
  var {subdomain,domain,fqdn,...rest}    = argv;

  if (subdomain && domain) {
    fqdn = fqdn || `${subdomain}.${domain}`;
  } else {
    [subdomain, ...domain] = (fqdn ||'').split('.');
    domain = domain.join('.');
  }

  domain      = domain    || argv.domain;
  subdomain   = subdomain || argv.subdomain;
  fqdn        = fqdn      || argv.fqdn;

  return {subdomain,domain,fqdn,...rest};
}


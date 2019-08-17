


/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-flow');
const { _ }                   = sg;
const { getQuiet }            = ra.utils;

const mod                     = ra.modSquad(module, 'nginxConfig');

module.exports.formatServerAndUpstream = formatServerAndUpstream;

// -------------------------------------------------------------------------------------
//  Handlers
//

/**
 * Compute the `server` and upstream parts of the conf file.
 *
 */
mod.xport({serverAndUpstream: function(argv, context, callback) {
  var   {server_name = 'server'}  = argv;
  const {server_num}              = argv;
  const config                    = formatServerAndUpstream(argv, context);

  return callback(null, {[`server-${server_num}-${server_name.replace(/[.]/g, '-')}.conf`]:config});
}});

/**
 * Format the content of the `server` and upstream parts of the conf file.
 *
 */
function formatServerAndUpstream(argv, context) {

  const {service, stage, server_name, server_num, port} = argv;
  const {client_certs}                                  = argv;

  const dashed_server_name      = server_name.replace(/[.]/g, '-');

  var   lines = [...nagMissing({service, stage, server_name, server_num, port})];

  lines = [...lines, `
    upstream ${service} {
      server ${service}:${port};
    }

    # ----- ${server_name} -----
    server {
            listen 80;
            listen [::]:80  ipv6only=on;
            listen 443      ssl;
            server_name     ${server_name};

            root /usr/share/nginx/default/html;
            index index.html;

            ssl_protocols TLSv1.1 TLSv1.2;
            ssl_certificate /etc/nginx/ssl/server-${server_num}/tls.crt;
            ssl_certificate_key /etc/nginx/ssl/server-${server_num}/tls.key;`];

            if (client_certs) {
              lines = [...lines, `
                # See https://arcweb.co/securing-websites-nginx-and-client-side-certificate-authentication-linux/

                # Client certificates
                ssl_client_certificate /etc/nginx/ssl/client-certs/${dashed_server_name}-root-client-ca.crt;
                ssl_verify_client optional;`];
            }

            lines = [...lines, `
              location ~* ^/${stage}/* {
                include /etc/nginx/conf.d/proxy-params;
                proxy_pass http://${service};
              }

              location / {
                try_files $uri $uri/ =404;
              }
    }

    # vim: ft=nginx:`];

  return lines.join('\n');
}

function nagMissing(params) {
  var   result = [];
  const keys   = sg.keys(params);

  return _.compact(_.map(keys, key => {
    if (sg.isnt(params[key])) {
      return `# Missing ${key}`;
    }
    return;
  }));
}


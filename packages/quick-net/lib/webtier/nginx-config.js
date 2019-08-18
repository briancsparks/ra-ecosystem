
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-argv');
const { _ }                   = sg;
const nginxValidators         = require('./nginx-validate');
const utils                   = require('../utils');
const { getQuiet }            = ra.utils;
const {
  __asJSON, parseAsJSON
}                             = utils;

const mod                     = ra.modSquad(module, 'nginxConfig');
const ARGV                    = sg.ARGV();

module.exports.formatServerBlock    = formatServerBlock;
module.exports.formatUpstreamBlock  = formatUpstreamBlock;
module.exports.formatServerAndUpstreamBlocks = formatServerAndUpstreamBlocks;
module.exports.parseAsJSON          = parseAsJSON;

// -------------------------------------------------------------------------------------
//  Handlers
//

/**
 * Compute the `server` and upstream blocks.
 *
 */
mod.xport({serverAndUpstreamBlocks: function(argv, context, callback) {
  var   {server_name = 'server'}  = argv;
  const {server_num}              = argv;
  const config                    = formatServerAndUpstreamBlocks(argv, context);

  return callback(null, {[`server-${server_num}-${server_name.replace(/[.]/g, '-')}.conf`]: config});
}});

/**
 * Compute the `server` block.
 *
 */
mod.xport({serverBlock: function(argv, context, callback) {
  var   {server_name = 'server'}  = argv;
  const {server_num}              = argv;
  const config                    = formatServerBlock(argv, context);

  return callback(null, {[`server-${server_num}-${server_name.replace(/[.]/g, '-')}.conf`]: config});
}});

/**
 * Compute the upstream parts of the conf file.
 *
 */
mod.xport({upstreamBlock: function(argv, context, callback) {
  const config                    = formatUpstreamBlock(argv, context);

  return callback(null, {"upstream.conf": config});
}});

/**
 * Format the content of the `server` and upstream blocks.
 *
 * ra invoke ./lib/webtier/nginx-config.js serverAndUpstreamBlocks --client-certs --service=theservice --stage=thestage --server-name=the.server.name --server-num=1 --port=3000
 */
function formatServerAndUpstreamBlocks(argv, context) {
  return formatServerBlock({...argv, includeUpstream: true}, context);
}

/**
 * Format the content of the `server` block.
 *
 * ra invoke ./lib/webtier/nginx-config.js serverBlock --client-certs --service=theservice --stage=thestage --server-name=theservername --server-num=1
 */
function formatServerBlock(argv, context) {

  var   {client_certs, service, stage, server_name, server_num, port} = argv;
  const dashed_server_name      = server_name.replace(/[.]/g, '-');

  // -- Include the upstream block?
  const includeUpstream         = argv.includeUpstream || argv.inclue_upstream;
  var   upstreamName            = argv.upstreamName || argv.upstream_name || argv.upstream || service;
  let   server_prefix           = (argv.server_name ||'').replace(/[.]/g, '_');
  upstreamName                  = _.compact([server_prefix, upstreamName]).join('_');
  client_certs                  = nginxValidators.ssl_verify_client(client_certs) || false;

  var   spec_                   = {upstreamName, client_certs, service, stage, server_name, server_num: +server_num};

  if (includeUpstream) {
    spec_                       = {...spec_, port: +port};
  }

  const [jsonSpec,spec]         = __asJSON('serverBlock', server_name, spec_);


  var   lines = [];

  lines = [...lines, ...nagMissing({service, stage, server_name, server_num})];
  lines = [...lines, `

    # ${jsonSpec}

    `];

  if (includeUpstream) {
    lines = [...lines, `
      upstream ${upstreamName} {
        server ${service}:${port};
      }`];
  }

  lines = [...lines, `

    # ----- ${server_name} -----
    server {
            listen 80;
            #listen [::]:80  ipv6only=on;
            listen 443      ssl;
            server_name     ${server_name};

            root /usr/share/nginx/default/html;
            index index.html;

            ssl_protocols TLSv1.1 TLSv1.2;
            ssl_ciphers HIGH:!aNULL:!MD5;
            ssl_certificate /etc/nginx/ssl/server-${server_num}/tls.crt;
            ssl_certificate_key /etc/nginx/ssl/server-${server_num}/tls.key;`];

            if (client_certs) {
              lines = [...lines, `
                # See https://arcweb.co/securing-websites-nginx-and-client-side-certificate-authentication-linux/

                # Client certificates
                ssl_client_certificate /etc/nginx/ssl/client-cert-${server_num}/tls.crt;
                ssl_verify_client ${client_certs};
              `];
            }

            lines = [...lines, `

              location /nginx_status {
                stub_status on;
                access_log off;
                allow 127.0.0.1;
                allow 10.0.0.0/8;
                deny all;
              }

              location ~* ^/${stage}/* {
                include /etc/nginx/conf.d/proxy-params;
                proxy_pass http://${upstreamName};
              }

              location / {
                try_files $uri $uri/ =404;
              }
    }

    # vim: ft=nginx:
  `];

  lines = lines.join('\n');

  return {lines, spec};
}

/**
 * Format the content of the upstream parts of the conf file.
 *
 */
function formatUpstreamBlock(argv, context) {
  //sg.elog(`formatUpstreamBlock`, {argv});

  const server_prefix             = (argv.server_name ||'').replace(/[.]/g, '_');
  var   {service, port}           = argv;
  var   upstreamName              = argv.upstreamName || argv.upstream_name || argv.upstream || service;

  upstreamName                    = _.compact([server_prefix, upstreamName]).join('_');
  port                            = +port;
  const [jsonSpec,spec]           = __asJSON('upstreamBlock', service, {upstreamName, service, port});

  var   lines = [];

  lines = [...lines, ...nagMissing({service, port})];
  lines = [...lines, `

    # ${jsonSpec}

    upstream ${upstreamName} {
      server ${service}:${port};
    }

    # vim: ft=nginx:
  `];

  lines = lines.join('\n');

  return {lines, spec};
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


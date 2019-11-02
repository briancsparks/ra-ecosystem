

// https://www.nginx.com/resources/wiki/start/topics/examples/full/

const ra                      = require('run-anywhere').v2;
const sg0                     = ra.get3rdPartyLib('sg-flow');
const sg                      = sg0.merge(sg0, require('sg-env'));
const { _ }                   = sg;
const tar                     = require('tar-stream');
const fs                      = require('fs');
const os                      = require('os');
const path                    = require('path');
const {streamToS3}            = require('../s3');
var   {globalBlacklistIps}    = require('./snippets/ip-blacklist');

const mod                     = ra.modSquad(module, 'nginx-config');
const DIAG                    = sg.DIAG(module);
const ENV                     = sg.ENV();

// =======================================================================================================
// saveNginxConfigTarball

DIAG.usage({ aliases: { saveNginxConfigTarball: { args: {
  serverType    : 'type'
}}}});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(`--filename=${path.join(os.tmpdir(),  '_aa-nginx-conf')} --type=localapp --debug`);
DIAG.activeDevelopment(`--filename=${path.join(os.homedir(), '_aa-nginx-conf')} --type=localapp`);
DIAG.activeDevelopment(`--filename=${path.join(os.homedir(), '_aa-nginx-conf')} --location=/clientstart --upstream=clients --fqdns=example.com --type=localapp --skip-reload --debug`);
DIAG.activeDevelopment(`--filename=${path.join(os.homedir(), '_aa-nginx-conf')} --root=/usr/share/nginx/html --location=/clientstart --upstream=clients --upstream-service=10.1.2.3:3001 --fqdns=example.com --debug`);
DIAG.activeName = 'saveNginxConfigTarball';

/**
 *
 *
 * @param {*} argv
 * @param {*} context
 * @param {*} callback
 * @returns
 */
mod.xport(DIAG.xport({saveNginxConfigTarball: function(argv, context, callback) {
  const diag        = DIAG.diagnostic({argv, context, callback});
  var   {filename}  = diag.args();

  if (!(diag.haveArgs({filename})))                           { return diag.exit(); }
  // ----------- done checking args

  return getNginxConfigTarball(argv, context, function(err, data) {
    if (err) { return callback(err); }

    const {pack, cwd} = data;

    if (!filename.endsWith('.tar')) {
      filename += '.tar';
    }

    var   tarball = fs.createWriteStream(filename);
    pack.pipe(tarball);

    // console.log(`ret1 ${filename}`);
    return callback(null, {ok:true, filename});
  });
}}));


// =======================================================================================================
// saveNginxConfigTarballToS3

DIAG.usage({ aliases: { saveNginxConfigTarballToS3: { args: {
  serverType    : 'type'
}}}});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(`--filename=${path.join(os.tmpdir(),  '_aa-nginx-conf')} --type=localapp --debug`);
DIAG.activeDevelopment(`--filename=${path.join(os.homedir(), '_aa-nginx-conf')} --type=localapp`);
DIAG.activeDevelopment(`--filename=${path.join(os.homedir(), '_aa-nginx-conf')} --root=/usr/share/nginx/html --location=/clientstart --upstream=clients --upstream-service=10.1.2.3:3001 --fqdns=example.com --type=localapp --skip-reload --debug`);
DIAG.activeDevelopment(`--filename=${path.join(os.homedir(), '_aa-nginx-conf')} --root=/usr/share/nginx/html --location=/clientstart --upstream=clients --upstream-service=10.1.2.3:3001 --fqdns=example.com --debug`);
DIAG.activeName = 'saveNginxConfigTarballToS3';

/**
 *
 *
 * @param {*} argv
 * @param {*} context
 * @param {*} callback
 * @returns
 */
mod.xport(DIAG.xport({saveNginxConfigTarballToS3: function(argv, context, callback) {
  const diag        = DIAG.diagnostic({argv, context, callback});
  // var   {filename}  = diag.args();
  // const namespace   = ENV.at('NAMESPACE');
  const namespace   = 'quicknet';

  if (!(diag.haveArgs({})))                           { return diag.exit(); }
  // ----------- done checking args

  return getNginxConfigTarball(argv, context, function(err, data) {
    if (err) { return callback(err); }

    const {pack,cwd,name}   = data;
    const s3path            = `s3://quick-net/deploy/${namespace.toLowerCase()}/files/tmp/${name}`;

    return streamToS3({Body: pack, s3path, ContentType: 'application/x-tar'}, context, function(err, data) {
      diag.i(`Upload nginx config tarball`, {cwd, s3path, err, data});
      return callback(err, data);
    });
  });
}}));


// =======================================================================================================
// getNginxConfigTarball

DIAG.usage({ aliases: { getNginxConfigTarball: { args: {
  serverType    : 'type'
}}}});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(`--filename=${path.join(os.homedir(), '_aa-nginx-conf')} --debug`);
// DIAG.activeName = 'getNginxConfigTarball';

/**
 * Gets tarball.
 *
 * @param {*} argv
 * @param {*} context
 * @param {*} callback
 * @returns
 */
const getNginxConfigTarball = mod.xport(DIAG.xport({getNginxConfigTarball: function(argv, context, callback) {
  const diag                      = DIAG.diagnostic({argv, context, callback});
  const {serverType ='upstream'}  = diag.args();

  if (!(diag.haveArgs({serverType})))                           { return diag.exit(); }
  // ----------- done checking args

  var   getConfig;
  if (serverType === 'upstream')                                { getConfig =  getNginxUpstreamConfig; }
  else if (serverType === 'localappserver')                     { getConfig =  getNginxLocalAppServerConfig; }

  return getConfig(argv, context, function(err, data) {
    return callback(err, data);
  });
}}));


// =======================================================================================================
// getNginxLocalAppServerConfig

DIAG.usage({ aliases: { getNginxLocalAppServerConfig: { args: {}}}});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(`--debug`);

// DIAG.activeName = 'getNginxLocalAppServerConfig';

/**
 *  Gets a tarball that comprises the nginx config for a local app server.
 *
 * @param {*} argv
 * @param {*} context
 * @param {*} callback
 * @returns
 */
const getNginxLocalAppServerConfig = mod.xport(DIAG.xport({getNginxLocalAppServerConfig: function(argv, context, callback) {

  const {distro ='ubuntu'}      = argv;
  const {skip_reload =true}     = argv;

  var   manifest = {
    cwd       : '/etc/nginx',
    name      : 'nginx-conf.tar'
  };

  if (!skip_reload) {
    manifest = { ...manifest,
      command   : {
        sudo      : true,
        line      : `nginx -t && nginx -s reload`
      }
    };
  }

  var pack = tar.pack();

  pack.entry({ ...entryDefs(argv), name: 'manifest.json' }, JSON.stringify(manifest) +'\n');

  pack.entry({ ...entryDefs(argv), name: 'nginx.conf' },                  getNginxConf(argv));
  pack.entry({ ...entryDefs(argv), name: 'conf.d/server-default.conf' },  getLocalRevProxyAppServer(argv));

  pack.finalize();

  return callback(null, {ok:true, pack, cwd: manifest.cwd, name: manifest.name});
}}));


// =======================================================================================================
// getNginxUpstreamConfig

DIAG.usage({ aliases: { getNginxUpstreamConfig: { args: {}}}});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(`--debug`);
// DIAG.activeName = 'getNginxUpstreamConfig';

/**
 *  Gets a tarball that comprises the nginx config for an upstream server.
 *
 * @param {*} argv
 * @param {*} context
 * @param {*} callback
 * @returns
 */
const getNginxUpstreamConfig = mod.xport(DIAG.xport({getNginxUpstreamConfig: function(argv, context, callback) {
  const diag                          = DIAG.diagnostic({argv,context});

  const {distro ='ubuntu'}      = argv;
  const {skip_reload =true}     = argv;
  var   {fqdns}                 = argv;
  var   {upstream}              = argv;

  if (!(diag.haveArgs({fqdns,upstream})))                         { return diag.earlyreturn(null, ''); }
  // ----------- done checking args

  fqdns = sg.arrayify(fqdns);

  var   manifest = {
    cwd       : '/etc/nginx',
    name      : 'nginx-conf.tar'
  };

  if (!skip_reload) {
    manifest = { ...manifest,
      command   : {
        sudo      : true,
        line      : `nginx -t && nginx -s reload`
      }
    };
  }

  var pack = tar.pack();

  pack.entry({ ...entryDefs(argv), name: 'manifest.json' }, JSON.stringify(manifest) +'\n');

  pack.entry({ ...entryDefs(argv), name: 'nginx.conf' },                          getNginxConf(argv));

  pack.entry({ ...entryDefs(argv), name: `conf.d/proxy-params` },                 proxy_params(argv));
  pack.entry({ ...entryDefs(argv), name: `conf.d/rpxi` },                         rpxi(argv));

  _.each(fqdns, fqdn => {
    pack.entry({ ...entryDefs(argv), name: `conf.d/upstream-${upstream}.conf` },  getUpstream(argv));
    pack.entry({ ...entryDefs(argv), name: `conf.d/server-${fqdn}.conf` },        getUpstreamServer(argv));
  });

  pack.finalize();

  return callback(null, {ok:true, pack, cwd: manifest.cwd, name: manifest.name});
}}));



// =======================================================================================================

const entryDefs_ = {
  ubuntu: {
    uname:  'root',
    gname:  'root',
  },
  def: {
    mode:   parseInt('644', 8),
    uname:  'nginx',
    gname:  'root',
  },
};

function entryDefs(argv) {
  const {distro ='ubuntu'}  = argv;
  const {name,size,mode,mtime,type,linkname,uid,gid,uname,gname,devmajor,devminor} = argv;
  return { ...entryDefs_.def, ...(entryDefs_[distro] ||{}), name,size,mode,mtime,type,linkname,uid,gid,uname,gname,devmajor,devminor};
}


// =======================================================================================================

// TODO:
// See: https://www.nginx.com/blog/tuning-nginx/
// worker_process should be `auto` if we are using new enough nginx version; # cores; or > # cores for I/O intensive

function getNginxConf(argv) {
  const {
    worker_process =1,                              // Or 'auto'
    worker_connections =1024,                       // 512, or usually more
    default_type ='application/octet-stream',
    client_max_body_size ='25M',
    keepalive_requests =100,
    keepalive_timeout =65,
    types_hash_max_size =2048,
    blacklistIps = globalBlacklistIps,
  }                                                 = argv;

  var l=[];

  // return `

l=[...l,`
                user              nginx;
                worker_processes  ${worker_process};

                error_log  /var/log/nginx/error.log warn;
                pid        /var/run/nginx.pid;


                events {
                  worker_connections  ${worker_connections};
                }

                http {
                  include                 /etc/nginx/mime.types;
                  default_type            ${default_type};
                  client_max_body_size    ${client_max_body_size};`];

var l2=[];
_.each(blacklistIps, (list, name) => {
  l2=[...l2,`
                  # Go away ${name}
${list.map(ip => `                  deny ${ip};`).join('\n')}`];
});
l=[...l, l2.join('\n')];

l=[...l,`
                  #log_format main '$remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent $request_time $host "$http_referer" "$http_user_agent" "$http_x_forwarded_for"';
                  #log_format sock '$remote_addr - "$request" $status $body_bytes_sent $host';

                  log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                                    '$status $body_bytes_sent "$http_referer" '
                                    '"$http_user_agent" "$http_x_forwarded_for"';

                  access_log  /var/log/nginx/access.log  main;

                  sendfile        on;
                  #tcp_nopush     on;
                  #tcp_nodelay    on;

                  keepalive_requests  ${keepalive_requests};
                  keepalive_timeout   ${keepalive_timeout};

                  types_hash_max_size ${types_hash_max_size};

                  #gzip  on;
                  #gzip_disable "msie6";

                  ssl_protocols               TLSv1 TLSv1.1 TLSv1.2;
                  ssl_prefer_server_ciphers   on;

                  # Websockets or socket.io or something like that
                  map $http_upgrade $connection_upgrade {
                    default   upgrade;
                    ''        close;
                  }

                  include /etc/nginx/conf.d/upstream-*.conf;
                  include /etc/nginx/conf.d/server-*.conf;`];

l=[...l,`
                }`];

  return l.join('\n\n') + '\n';
}

// =======================================================================================================
DIAG.usage({ aliases: { getUpstream: { args: {}}}});

function getUpstream(argv, context={}) {
  const diag                          = DIAG.diagnostic({argv,context}, 'getUpstream');
  const {upstream}                    = argv; //diag.args();
  const {upstream_service}            = argv; //diag.args();

  if (!(diag.haveArgs({upstream,upstream_service})))                    { return diag.earlyreturn(null, ''); }
  // ----------- done checking args

  return `
                upstream ${upstream} {
                  server ${upstream_service};
                }\n`;
}



// =======================================================================================================
DIAG.usage({ aliases: { getUpstreamServer: { args: {}}}});

function getUpstreamServer(argv, context={}) {
  const diag                          = DIAG.diagnostic({argv,context}, 'getUpstreamServer');
  const {https,client,serverNum}      = argv; //diag.args();
  const {location,upstream}           = argv; //diag.args();
  var   {default_server,fqdns,root}   = argv; //diag.args();

  // TODO: fix by parsing arrays from cmd line
  fqdns = sg.arrayify(fqdns);

  if (!(diag.haveArgs({location,upstream})))                    { return diag.earlyreturn(null, ''); }

  if (default_server) {
                                    { default_server  = 'default_server'; }
    if (!fqdns)                     { fqdns           = ['localhost']; }
    if (!root)                      { root            = '/usr/share/nginx/html/default'; }

  } else {
                                    { default_server = ''; }

    // Need fqdns if we are not default server
    if (!(diag.haveArgs({fqdns})))                              { return diag.earlyreturn(null, ''); }
  }

  if (https) {
    if (!(diag.haveArgs({serverNum})))                          { return diag.earlyreturn(null, '', `with https, need serverNum`); }
  }

  return _getUpstreamServer_({...argv, default_server,fqdns,root}, context);
}

// =======================================================================================================
DIAG.usage({ aliases: { _getUpstreamServer_: { args: {}}}});

function _getUpstreamServer_(argv, context={}) {

  const {https,root,default_server,client,
         fqdns,serverNum,location,upstream}     = argv;
  const fqdn                                    = fqdns[0];

var l=[];

if (upstream) {
  l=[...l,`
                # include ${upstream} upstream defs`];
}

l=[...l,`

                # --------------- ${fqdn} ---------------
                server {
                  #listen [::]:80  ipv6only=on;

                  server_name   ${fqdns.join(' ')};
                  listen        80                                  ${default_server};
                  access_log    /var/log/nginx/${fqdn}.access.log   main;`];

if (https) {
  l=[...l,`
                  listen        443                                 ssl;`];
}

if (root) {
  l=[...l,`
                  root ${root}/${fqdn};
                  index index.html;`];
}

if (https) {
  l=[...l,`
                  ssl_protocols TLSv1.1 TLSv1.2;
                  ssl_ciphers HIGH:!aNULL:!MD5;
                  ssl_certificate /etc/nginx/ssl/server-${serverNum}/tls.crt;
                  ssl_certificate_key /etc/nginx/ssl/server-${serverNum}/tls.key;`];
}

                  // TODO: client certs
if (client) {
  l=[...l,`
                  ## Client certificates
                  #ssl_client_certificate /etc/nginx/ssl/client-certs/default-root-client-ca.crt;
                  #ssl_verify_client optional;`];
}

l=[...l,`
                  location /nginx_status {
                    stub_status   on;
                    access_log    off;
                    allow         127.0.0.1;
                    allow         10.0.0.0/8;
                    deny          all;
                  }`];



if (location) {
  l=[...l,`
                  location ~* ${location} {
                    include /etc/nginx/conf.d/proxy-params;
                    proxy_pass http://${upstream};
                  }`];
}

if (root) {
  l=[...l,`
                  location / {
                    try_files $uri $uri/ =404;
                  }`];
}


l=[...l,`
                }`];

  return l.join('\n\n') + '\n';
}

// =======================================================================================================

function getLocalRevProxyAppServer(argv) {

  const {
    fqdns =['example.com']
  }                     = argv;
  const fqdn            = fqdns[0];

  return `
server {
  listen       80;
  server_name  ${fqdns.join(' ')};
  access_log   /var/log/nginx/${fqdn}.access.log  main;

  # serve static files
  location ~ ^/(images|javascript|js|css|flash|media|static)/  {
    root    /var/www/virtual/${fqdn}/htdocs;
    expires 30d;
  }

  # pass requests for dynamic content to rails/turbogears/zope, et al
  location / {
    proxy_pass      http://127.0.0.1:8080;
  }
}` +'\n';
}

// =======================================================================================================
// TODO: use tar-fs to read from conf.d/
function proxy_params() {

return `
            proxy_connect_timeout                 5000;
            proxy_send_timeout                    5000;
            proxy_read_timeout                    5000;
            send_timeout                          5000;
            proxy_redirect                        off;

            proxy_set_header X-Client-Verify      $ssl_client_verify;
            proxy_set_header X-Client-I-Dn        $ssl_client_i_dn;
            proxy_set_header X-Client-S-Dn        $ssl_client_s_dn;
            #proxy_set_header X-Client-V-End       $ssl_client_v_end;
            proxy_set_header X-Client-Serial      $ssl_client_serial;

            proxy_set_header Host                 $http_host;
            proxy_set_header X-Real-IP            $remote_addr;
            proxy_set_header X-Forwarded-For      $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto    $scheme;
            proxy_set_header X-NginX-Proxy        true;
            proxy_set_header Connection           "";

            proxy_http_version                    1.1;`;

}


// =======================================================================================================
// TODO: use tar-fs to read from conf.d/
function rpxi() {

return `

        #
        # Put these lines (with a corrected proxy_pass value) AFTER you include this file.
        #
        # location / {
        #   try_files maintenance.html $uri $uri/ $uri.html @router
        # }
        #
        # location @router {
        #   internal;
        #   include /etc/nginx/conf.d/proxy-params;
        #
        #   proxy_pass http://10.13.1.10:8401;
        # }

        location ~* ^/rpxi/GET/(.*) {
          internal;

          proxy_connect_timeout                 5000;
          proxy_send_timeout                    5000;
          proxy_read_timeout                    5000;
          send_timeout                          5000;

          proxy_set_header Host                 $http_host;
          proxy_set_header X-Real-IP            $remote_addr;
          proxy_set_header X-Forwarded-For      $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto    $scheme;
          proxy_set_header X-NginX-Proxy        true;
          # proxy_set_header Connection           "";

          proxy_set_header X-Client-Verify      $ssl_client_verify;
          proxy_set_header X-Client-I-Dn        $ssl_client_i_dn;
          proxy_set_header X-Client-S-Dn        $ssl_client_s_dn;
          #proxy_set_header X-Client-V-End       $ssl_client_v_end;
          proxy_set_header X-Client-Serial      $ssl_client_serial;

          proxy_http_version                    1.1;
          proxy_method                          \${GET};
          set $other_uri                        $1;

          proxy_pass http://$other_uri$is_args$args;
        }

        location ~* ^/rpxi/PUT/(.*) {
          internal;

          proxy_connect_timeout                 5000;
          proxy_send_timeout                    5000;
          proxy_read_timeout                    5000;
          send_timeout                          5000;

          proxy_set_header Host                 $http_host;
          proxy_set_header X-Real-IP            $remote_addr;
          proxy_set_header X-Forwarded-For      $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto    $scheme;
          proxy_set_header X-NginX-Proxy        true;
          # proxy_set_header Connection           "";

          proxy_set_header X-Client-Verify      $ssl_client_verify;
          proxy_set_header X-Client-I-Dn        $ssl_client_i_dn;
          proxy_set_header X-Client-S-Dn        $ssl_client_s_dn;
          #proxy_set_header X-Client-V-End       $ssl_client_v_end;
          proxy_set_header X-Client-Serial      $ssl_client_serial;

          proxy_http_version                    1.1;
          proxy_method                          \${PUT};
          set $other_uri                        $1;

          proxy_pass http://$other_uri$is_args$args;
        }

        location ~* ^/rpxi/POST/(.*) {
          internal;

          proxy_connect_timeout                 5000;
          proxy_send_timeout                    5000;
          proxy_read_timeout                    5000;
          send_timeout                          5000;

          proxy_set_header Host                 $http_host;
          proxy_set_header X-Real-IP            $remote_addr;
          proxy_set_header X-Forwarded-For      $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto    $scheme;
          proxy_set_header X-NginX-Proxy        true;
          # proxy_set_header Connection           "";

          proxy_set_header X-Client-Verify      $ssl_client_verify;
          proxy_set_header X-Client-I-Dn        $ssl_client_i_dn;
          proxy_set_header X-Client-S-Dn        $ssl_client_s_dn;
          #proxy_set_header X-Client-V-End       $ssl_client_v_end;
          proxy_set_header X-Client-Serial      $ssl_client_serial;

          proxy_http_version                    1.1;
          proxy_method                          \${POST};
          set $other_uri                        $1;

          proxy_pass http://$other_uri$is_args$args;
        }

        location ~* ^/rpxi/HEAD/(.*) {
          internal;

          proxy_connect_timeout                 5000;
          proxy_send_timeout                    5000;
          proxy_read_timeout                    5000;
          send_timeout                          5000;

          proxy_set_header Host                 $http_host;
          proxy_set_header X-Real-IP            $remote_addr;
          proxy_set_header X-Forwarded-For      $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto    $scheme;
          proxy_set_header X-NginX-Proxy        true;
          # proxy_set_header Connection           "";

          proxy_set_header X-Client-Verify      $ssl_client_verify;
          proxy_set_header X-Client-I-Dn        $ssl_client_i_dn;
          proxy_set_header X-Client-S-Dn        $ssl_client_s_dn;
          #proxy_set_header X-Client-V-End       $ssl_client_v_end;
          proxy_set_header X-Client-Serial      $ssl_client_serial;

          proxy_http_version                    1.1;
          proxy_method                          \${HEAD};
          set $other_uri                        $1;

          proxy_pass http://$other_uri$is_args$args;
        }

        location ~* ^/rpxi/DELETE/(.*) {
          internal;

          proxy_connect_timeout                 5000;
          proxy_send_timeout                    5000;
          proxy_read_timeout                    5000;
          send_timeout                          5000;

          proxy_set_header Host                 $http_host;
          proxy_set_header X-Real-IP            $remote_addr;
          proxy_set_header X-Forwarded-For      $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto    $scheme;
          proxy_set_header X-NginX-Proxy        true;
          # proxy_set_header Connection           "";

          proxy_set_header X-Client-Verify      $ssl_client_verify;
          proxy_set_header X-Client-I-Dn        $ssl_client_i_dn;
          proxy_set_header X-Client-S-Dn        $ssl_client_s_dn;
          #proxy_set_header X-Client-V-End       $ssl_client_v_end;
          proxy_set_header X-Client-Serial      $ssl_client_serial;

          proxy_http_version                    1.1;
          proxy_method                          \${DELETE};
          set $other_uri                        $1;

          proxy_pass http://$other_uri$is_args$args;
        }`;
}


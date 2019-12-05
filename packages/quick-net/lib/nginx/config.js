

// https://www.nginx.com/resources/wiki/start/topics/examples/full/

const ra                      = require('run-anywhere').v2;
const sg0                     = ra.get3rdPartyLib('sg-flow');
const sg                      = sg0.merge(sg0, require('sg-env'));
const { _ }                   = sg;
const qnutils                 = require('../../lib/utils');
const tar                     = require('tar-stream');
const clipboardy              = require('clipboardy');
const fs                      = require('fs');
const os                      = require('os');
const path                    = require('path');
const {streamToS3,
      s3ExpiringTransferPath} = require('../s3');
var   {globalBlacklistIps}    = require('./snippets/ip-blacklist');
const {mkS3path,
       addClip,
       safePathFqdn,
       mkQuickNetPath}        = qnutils;

const mod                     = ra.modSquad(module, 'nginx-config');
const DIAG                    = sg.DIAG(module);
const ENV                     = sg.ENV();

const namespace               = ENV.lc('NAMESPACE') || 'quicknet';
const s3path                  = mkS3path(namespace);
const s3XferPath              = mkQuickNetPath('s3', namespace, 'xfer/until');

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
// DIAG.activeName = 'saveNginxConfigTarball';

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
  serverType    : 'type',
  rpxiPort      : 'rpxi_port',
}}}});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(`--type=localapp --debug`);
DIAG.activeDevelopment(`--type=localapp`);
DIAG.activeDevelopment(`--root=/usr/share/nginx/html --location=/clientstart --upstream=clients --upstream-service=10.1.2.3:3001 --fqdns=example.com --type=localapp --skip-reload --debug`);
DIAG.activeDevelopment(`--root=/usr/share/nginx/html --location=/clientstart --upstream=clients --upstream-service=10.1.2.3:3001 --fqdns=example.com --debug`);
DIAG.activeDevelopment(`--sidecar=/clientstart,3009 --root=/usr/share/nginx/html --location=/clientstart --upstream=clients --upstream-service=10.1.2.3:3001 --fqdns=example.com --debug`);
DIAG.activeDevelopment(`--type=qnwebtier --rpxi-port=3009 --debug`);
DIAG.activeDevelopment(`--type=qnwebtier --rpxi-port=3008 --skip-server --debug`);
// DIAG.activeName = 'saveNginxConfigTarballToS3';

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

  const namespace   = ENV.lc('NAMESPACE') || 'quicknet';

  if (!(diag.haveArgs({})))                           { return diag.exit(); }
  // ----------- done checking args

  return getNginxConfigTarball(argv, context, function(err, data) {
    if (err) { return callback(err); }

    const {pack,cwd,name}   = data;
    const s3deployPath      = s3XferPath(s3ExpiringTransferPath(name, 3600));

    return streamToS3({Body: pack, s3path:s3deployPath, ContentType: 'application/x-tar'}, context, function(err, data) {
      diag.v(`Upload nginx config tarball`, {cwd, s3deployPath, err, data});

      // const clip = sshcmd('ubuntu@bastionIp', sshcmd('webtierIp', `qn-untar-from-s3 ${s3deployPath}`));
      // const bastionIp   = '`instance-by-role qn:roles bastion PublicIpAddress`';
      // const webtierIp   = '`instance-by-role qn:roles webtier PrivateIpAddress`';
      // const clip        = sshcmd(`ubuntu@${bastionIp}`, '"'+sshcmd(`${webtierIp}`, `'qn-untar-from-s3 ${s3deployPath}'`)+'"');

      // // clipboardy.writeSync(clip);
      // clipboardy.writeSync([
      //   clipboardy.readSync(),
      //   `#qnsshixx webtier 'qn-untar-from-s3 ${s3deployPath}'`
      // ].join('\n'));

      addClip([`#qnsshixx webtier 'qn-untar-from-s3 ${s3deployPath}'`]);

      return callback(err, data);
    });
  });
}}));

function sshcmd(login, command) {
  // return `ssh -A -o "StrictHostKeyChecking no" -o UserKnownHostsFile=/dev/null -o ConnectTimeout=1 -o LogLevel=quiet ${login} '${command}'`;
  return `sshixx ${login} ${command}`;
}

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
  const {serverType ='general'}   = diag.args();

  if (!(diag.haveArgs({serverType})))                           { return diag.exit(); }
  // ----------- done checking args

  var   getConfig = getNginxGeneralConfig;
  if (serverType === 'upstream')                                { getConfig =  getNginxUpstreamConfig; }
  else if (serverType === 'localappserver')                     { getConfig =  getNginxLocalAppServerConfig; }
  else if (serverType === 'general')                            { getConfig =  getNginxGeneralConfig; }
  else if (serverType === 'qnwebtier')                          { getConfig =  getNginxQuicknetWebtierConfig; }

  return getConfig(argv, context, function(err, data) {
    return callback(err, data);
  });
}}));




// =======================================================================================================
// =======================================================================================================
// Specific configurations
// =======================================================================================================
// =======================================================================================================


// =======================================================================================================
// getNginxQuicknetWebtierConfig

DIAG.usage({ aliases: { getNginxQuicknetWebtierConfig: { args: {
  reloadServer:   'reload_server',
  skipSystem:     'no_system',
  skipServers:    'no_servers',
}}}});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(`--skip-system --skip-servers --root=/usr/share/nginx/html --location=/clientstart --upstream=clients --upstream-service=10.1.2.3:3001 --fqdns=example.com --debug`);
DIAG.activeDevelopment(`--sidecar=/clientstart,3009 --type=qnwebtier --debug`);
DIAG.activeDevelopment(`--debug`);
// DIAG.activeName = 'getNginxQuicknetWebtierConfig';

/**
 *  Gets a tarball that comprises the nginx config for an upstream server.
 *
 * @param {*} argv
 * @param {*} context
 * @param {*} callback
 * @returns
 */
const getNginxQuicknetWebtierConfig = mod.xport(DIAG.xport({getNginxQuicknetWebtierConfig: function(argv, context, callback) {
  const diag                        = DIAG.diagnostic({argv,context});

  const {distro ='ubuntu'}          = argv;
  const {reloadServer =false}       = diag.args();
  const {sidecar}                   = diag.args();
  var   {fqdns}                     = diag.args();
  var   {upstream}                  = diag.args();
  const {skipSystem,skipServers}    = diag.args();

  // if (!(diag.haveArgs({fqdns})))                         { return diag.earlyreturn(null, ''); }
  // ----------- done checking args

  fqdns = sg.arrayify(fqdns);

  const manifest = getManifest(diag);

  var pack = tar.pack();

  // ----- manifest.json
  entry(pack, { ...entryDefs(argv), name: 'manifest.json' }, JSON.stringify(manifest) +'\n');

  // ----- System
  return sg.__run2([function(next) {
    const utilFiles     = 'cache-proxy-params,proxy-params,rpxi,rpxi-proxy-params'.split(',');
    return sg.__eachll(utilFiles, function(filename, next) {
      const name = `conf.d/${filename}`;

      return fs.readFile(path.join(__dirname, name), 'utf8', function(err, content) {
        if (sg.ok(err, content)) {
          entry(pack, { ...entryDefs(argv), name}, proxy_params(argv), skipSystem);
        }

        return next();
      });


    }, function() {

      entry(pack, { ...entryDefs(argv), name: 'nginx.conf' },                          getNginxConf(argv),        skipSystem);
      // entry(pack, { ...entryDefs(argv), name: `conf.d/proxy-params` },                 proxy_params(argv),        skipSystem);
      // entry(pack, { ...entryDefs(argv), name: `conf.d/rpxi` },                         rpxi(argv),                skipSystem);

      // The default server
      const defArgv = _.omit(argv, 'fqdns');
      entry(pack, { ...entryDefs(argv), name: `conf.d/default.conf`},                  getServerConfig(defArgv),  skipSystem);


      // ----- Upstreams
      const upstreamConfigs = getUpstreams(diag);
      _.each(upstreamConfigs, (config) => {
        _.each(config, ({upstream,upstream_service,...rest}, name) => {
          entry(pack, { ...entryDefs(argv), name: `conf.d/upstream-${upstream}.conf` },  getUpstream({upstream,upstream_service,...rest}), skipServers);
        });
      });


      // ----- FQDNS
      const fqdn    = fqdns[0];

      var   config = {...argv};
      const locations = getLocations(diag);
      if (locations) {
        config = {...config, locations};
      }

      if (fqdn) {
        config = {...config, client: true};
      }

      var fqdnServerConfig = entry(pack, { ...entryDefs(argv), name: `conf.d/server-${fqdn}.conf`},          getServerConfig(config),   skipServers);
      // diag.i(`Config for ${fqdns[0]}`, {fqdnServerConfig});



      pack.finalize();

      return callback(null, {ok:true, pack, cwd: manifest.cwd, name: manifest.name});
    });
  }]);
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
  const diag                    = DIAG.diagnostic({argv,context});

  const {distro ='ubuntu'}      = argv;
  const {reloadServer =false}   = diag.args();

  var   manifest = {
    cwd       : '/etc/nginx',
    name      : 'nginx-conf.tar'
  };

  if (reloadServer) {
    manifest = { ...manifest,
      command   : {
        sudo      : true,
        line      : `$SUDO nginx -t && $SUDO nginx -s reload`
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

DIAG.usage({ aliases: { getNginxUpstreamConfig: { args: {
  reloadServer:   'reload_server',
}}}});

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
  const {reloadServer =false}   = diag.args();
  var   {fqdns}                 = argv;
  var   {upstream}              = argv;

  if (!(diag.haveArgs({fqdns,upstream})))                         { return diag.earlyreturn(null, ''); }
  // ----------- done checking args

  fqdns = sg.arrayify(fqdns);

  var   manifest = {
    cwd       : '/etc/nginx',
    name      : 'nginx-conf.tar'
  };

  if (reloadServer) {
    manifest = { ...manifest,
      command   : {
        sudo      : true,
        line      : `$SUDO nginx -t && $SUDO nginx -s reload`
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
    pack.entry({ ...entryDefs(argv), name: `conf.d/server-${fqdn}.conf` },        getServerConfig(argv).content);
  });

  pack.finalize();

  return callback(null, {ok:true, pack, cwd: manifest.cwd, name: manifest.name});
}}));


// =======================================================================================================
// getNginxGeneralConfig

DIAG.usage({ aliases: { getNginxGeneralConfig: { args: {
  reloadServer:   'reload_server',
}}}});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(`--debug`);
// DIAG.activeName = 'getNginxGeneralConfig';

/**
 *  Gets a tarball that comprises the nginx config for an upstream server.
 *
 * @param {*} argv
 * @param {*} context
 * @param {*} callback
 * @returns
 */
const getNginxGeneralConfig = mod.xport(DIAG.xport({getNginxGeneralConfig: function(argv, context, callback) {
  const diag                    = DIAG.diagnostic({argv,context});

  const {distro ='ubuntu'}      = argv;
  const {reloadServer =false}   = diag.args();
  var   {fqdns}                 = diag.args();
  var   {upstream}              = diag.args();

  if (!(diag.haveArgs({fqdns})))                         { return diag.earlyreturn(null, ''); }
  // ----------- done checking args

  fqdns = sg.arrayify(fqdns);

  var   manifest = {
    cwd       : '/etc/nginx',
    name      : 'nginx-conf.tar'
  };

  if (reloadServer) {
    manifest = { ...manifest,
      command   : {
        sudo      : true,
        line      : `$SUDO nginx -t && $SUDO nginx -s reload`
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
    pack.entry({ ...entryDefs(argv), name: `conf.d/server-${fqdn}.conf` },        getServerConfig(argv).content);
  });

  pack.finalize();

  return callback(null, {ok:true, pack, cwd: manifest.cwd, name: manifest.name});
}}));


// =======================================================================================================
// =======================================================================================================
// Helpers
// =======================================================================================================
// =======================================================================================================


function entry(pack, params, content, skip) {
  if (skip) { return content; }

  pack.entry(params, _.isString(content) ? content : content.content);
  return content;
}

function getLocations(diag) {
  var result = [];

  const {sidecar} = diag.args();

  if (sidecar) {
    let [location,sidecarPort] = sidecar.split(',');
    result = [...result, {location,sidecarPort}];
  }

  if (result.length > 0) {
    return result;
  }
}

function getUpstreams(diag) {
  var   {upstream,upstream_service}              = diag.args();

  var   result = [];

  if (upstream && upstream_service) {
    result = [...result, {[upstream]: {upstream,upstream_service}}];
  }

  if (result.length > 0) {
    return result;
  }
}

const def_manifest = {
  cwd       : '/etc/nginx',
  name      : 'nginx-conf.tar'
};
function getManifest(diag, manifest_) {
  var manifest = {...(manifest_ || def_manifest)};

  const {reloadServer =false}   = diag.args();
  if (reloadServer) {
    manifest = { ...manifest,
      command   : {
        sudo      : true,
        line      : `$SUDO nginx -t && $SUDO nginx -s reload`
      }
    };
  }

  return manifest;
}



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

function __asJSON(params) {
  return `__asJSON: ${JSON.stringify(params)}`;
}

// =======================================================================================================




// =======================================================================================================
// =======================================================================================================
// Content Generation
// =======================================================================================================
// =======================================================================================================


// TODO:
// See: https://www.nginx.com/blog/tuning-nginx/
// worker_process should be `auto` if we are using new enough nginx version; # cores; or > # cores for I/O intensive

// =======================================================================================================
// getNginxConf
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

// Blacklisted IPs (like BlueCoat)
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

                  # A simple config to force HTTPS for everything
                  server {
                    listen 80 default_server;

                    server_name _;

                    return 301 https://$host$request_uri;
                  }


                  include /etc/nginx/conf.d/upstream-*.conf;
                  include /etc/nginx/conf.d/default.conf;
                  include /etc/nginx/conf.d/server-*.conf;`];

l=[...l,`
                }`];

  return l.join('\n\n') + '\n';
}

// =======================================================================================================
// getUpstream
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
// getServerConfig
DIAG.usage({ aliases: { getServerConfig: { args: {}}}});

function getServerConfig(argv, context={}) {
  const diag                          = DIAG.diagnostic({argv,context}, 'getServerConfig');
  const {https,client,serverNum}      = diag.args();
  const {location,upstream}           = diag.args();
  var   {default_server,root}         = diag.args();
  var   {fqdns,fqdn}                  = diag.args();

  if (!fqdns && !fqdn) {
    default_server = true;
  }

  // if (!(diag.haveArgs({location,upstream})))                    { return diag.earlyreturn(null, ''); }

  if (default_server) {
                                    { default_server  = 'default_server'; }
    if (!fqdns)                     { fqdns           = ['localhost']; }
    if (!root)                      { root            = '/usr/share/nginx/html/default'; }

  } else {
                                    { default_server = ''; }

    // Need fqdns if we are not default server
    if (!(diag.haveArgs({fqdns})))                              { return diag.earlyreturn(null, ''); }
  }

  // TODO: fix by parsing arrays from cmd line
  fqdns = sg.arrayify(fqdns);

  if (https) {
    if (!(diag.haveArgs({serverNum})))                          { return diag.earlyreturn(null, '', `with https, need serverNum`); }
  }

  // TODO: Ensure only one of: locations, location/upstream

  return _getServerConfig_({...argv, default_server,fqdns,root}, context);
}

// =======================================================================================================
// _getServerConfig_
DIAG.usage({ aliases: { _getServerConfig_: { args: {}}}});

function _getServerConfig_(argv, context={}) {

  const {root,default_server,client,
         fqdns,serverNum,location,upstream,
        rpxiPort}                               = argv;
  var   {locations}                             = argv;
  const fqdn                                    = fqdns[0];
  const fqdnPathName                            = safePathFqdn(fqdn);
  const ssl_certificate                         = `/etc/nginx/certs/${fqdnPathName}/live/${fqdn}/fullchain.pem`;
  const ssl_certificate_key                     = `/etc/nginx/certs/${fqdnPathName}/live/${fqdn}/privkey.pem`;
  const ssl_client_certificate                  = `/etc/nginx/certs-client/${fqdnPathName}-root-client-ca.crt`;
  const https                                   = !default_server;

  if (location && upstream) {
    locations = [{location,upstream}];
  }

  // The JSON that made up this content
  var json = sg.merge({}, {upstream,fqdn,fqdns,default_server,root,https,locations,client,ssl_client_certificate,rpxiPort,ssl_certificate_key,ssl_certificate,argv});

  // Make sure we handle setting up the root, if we need to
  var handledRoot = !root;

  var l=[];







if (upstream) {
  l=[...l,`
                # include ${upstream} upstream defs`];
}

// l=[...l,`
//                 # _asjson_: ${sg.safeJSONStringify(argv)}`];

l=[...l,`

                # ${__asJSON(json)}

                # --------------- ${fqdn} ---------------
                server {
                  #listen [::]:80  ipv6only=on;

                  server_name   ${fqdns.join(' ')};
                  #listen        80                                  ${default_server};
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

if (https && fqdn !== 'localhost') {
  l=[...l,`
                  ssl_protocols                 TLSv1.1 TLSv1.2;
                  ssl_session_timeout           5m;
                  ssl_prefer_server_ciphers     on;
                  ssl_ciphers                   HIGH:!aNULL:!MD5;
                  ssl_certificate               ${ssl_certificate};
                  ssl_certificate_key           ${ssl_certificate_key};`];

                  addClip([
                    `#qnsshixx webtier 'qn-get-certs-from-s3 s3://quicknet/quick-net/secrets/certs/${fqdnPathName}.tar'`,
                    `##qnsshixx webtier 'sudo chmod -R a+rx /etc/nginx/certs/${fqdnPathName}/'`,
                  ]);
}

                  // see: https://www.ssltrust.com.au/help/setup-guides/client-certificate-authentication
                  // TODO: client certs
                  // See: https://arcweb.co/securing-websites-nginx-and-client-side-certificate-authentication-linux/
                  // See also: https://fardog.io/blog/2017/12/30/client-side-certificate-authentication-with-nginx/
                  // TODO: get ssl_crl working
                  // See: http://nginx.org/en/docs/http/ngx_http_ssl_module.html#variables for variables
                  // $ssl_client_i_dn, $ssl_client_i_dn_legacy
                  // $ssl_client_s_dn, $ssl_client_s_dn_legacy
                  // $ssl_client_serial
                  // $ssl_client_v_end
                  // $ssl_client_v_start
                  // $ssl_client_verify   --------------   "SUCCESS", "FAILED:reason", and "NONE"
                  //
                  // Headers when OK:
                  //  'x-client-verify': 'SUCCESS',
                  //  'x-client-i-dn': 'CN=api.cdr0.net,OU=cdr0.net,O=coder-zero,L=San Diego,ST=California,C=US',
                  //  'x-client-s-dn': 'CN=briancsparks@gmail.com,OU=coder-zero,O=coder-zero,L=San Diego,ST=California,C=US',
                  //  'x-client-serial': '01',
                  //  host: 'api.cdr0.net',
                  //
if (client) {
  l=[...l,`
                  # Client certificates
                  ssl_client_certificate      ${ssl_client_certificate};
                  #ssl_crl                    /etc/ssl/ca/private/ca.crl;
                  ssl_verify_client           optional;`];

                  addClip([
                    `#qnsshixx webtier 'qn-get-client-certs-from-s3 s3://quicknet/quick-net/secrets/certs-client/${fqdnPathName}-root-client-ca.crt'`
                  ]);

}


l=[...l,`
                  location /nginx_status {
                    stub_status   on;
                    access_log    off;
                    allow         127.0.0.1;
                    allow         10.0.0.0/8;
                    deny          all;
                  }`];


if (locations) {
  _.each(locations, ({location,upstream,sidecarPort}) => {
    if (location && upstream) {
      l=[...l,`
                  location ~* ${location} {
                    include /etc/nginx/conf.d/proxy-params;
                    proxy_pass http://${upstream};
                  }`];
    }

    if (location && sidecarPort) {
      l=[...l,`
                  location ~* ${location} {
                    include /etc/nginx/conf.d/proxy-params;
                    proxy_pass http://127.0.0.1:${sidecarPort};
                  }`];
    }

  });
}

if (rpxiPort) {
  handledRoot = true;

  l=[...l,`
                  location /error404 {
                    try_files $uri =404;
                  }

                  include /etc/nginx/conf.d/rpxi;

                  location / {
                    try_files maintenance.html $uri $uri/ $uri.html @sidecar;
                  }

                  location @sidecar {
                    internal;
                    include /etc/nginx/conf.d/proxy-params;
                    proxy_pass http://127.0.0.1:${rpxiPort};
                  }`];
}

if (root && !handledRoot) {
  handledRoot = true;

  l=[...l,`
                  location / {
                    try_files $uri $uri/ =404;
                  }`];
}

                  // TODO: Look into these
                  // if ($request_method !~ ^(GET|HEAD|PUT|POST|DELETE|OPTIONS)$ ){
                  //   return 405;
                  // }

                  // location ~ \.(php|html)$ {
                  //   return 405;
                  // }

l=[...l,`
                }`];

  return {content: l.join('\n\n') + '\n', json};
}

// =======================================================================================================
// getLocalRevProxyAppServer
function getLocalRevProxyAppServer(argv) {

  const {
    fqdns =['example.com']
  }                     = argv;
  const fqdn            = fqdns[0];

  return `
            server {
              #listen       80;
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

              include /etc/nginx/conf.d/rpxi-proxy-params;

              proxy_http_version                    1.1;
              proxy_method                          GET;
              set $other_uri                        $1;

              proxy_pass http://$other_uri$is_args$args;
            }

            location ~* ^/rpxi/PUT/(.*) {
              internal;

              include /etc/nginx/conf.d/rpxi-proxy-params;

              proxy_http_version                    1.1;
              proxy_method                          PUT;
              set $other_uri                        $1;

              proxy_pass http://$other_uri$is_args$args;
            }


            location ~* ^/rpxi/POST/(.*) {
              internal;

              include /etc/nginx/conf.d/rpxi-proxy-params;

              proxy_http_version                    1.1;
              proxy_method                          POST;
              set $other_uri                        $1;

              proxy_pass http://$other_uri$is_args$args;
            }

            location ~* ^/rpxi/HEAD/(.*) {
              internal;

              include /etc/nginx/conf.d/rpxi-proxy-params;

              proxy_http_version                    1.1;
              proxy_method                          HEAD;
              set $other_uri                        $1;

              proxy_pass http://$other_uri$is_args$args;
            }

            location ~* ^/rpxi/DELETE/(.*) {
              internal;

              include /etc/nginx/conf.d/rpxi-proxy-params;

              proxy_http_version                    1.1;
              proxy_method                          DELETE;
              set $other_uri                        $1;

              proxy_pass http://$other_uri$is_args$args;
            }

            # vim: ft=nginx:`;

}


module.exports.ra_active_fn_name = DIAG.activeName;

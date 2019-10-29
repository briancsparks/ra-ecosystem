

// https://www.nginx.com/resources/wiki/start/topics/examples/full/

const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-flow');
const tar                     = require('tar-stream');
const fs                      = require('fs');
const os                      = require('os');
const path                    = require('path');

const mod                     = ra.modSquad(module, 'nginx-config');
const DIAG                    = sg.DIAG(module);


// =======================================================================================================
// saveNginxConfigTarball

DIAG.usage({
  aliases: {
    saveNginxConfigTarball: {
      args: {
      }
    }
  }
});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(`--filename=${path.join(os.tmpdir(),  'nginx.conf')} --debug`);
DIAG.activeDevelopment(`--filename=${path.join(os.homedir(), 'nginx.conf')}`);
DIAG.activeDevelopment(`--filename=${path.join(os.homedir(), 'nginx.conf')} --skip-reload --debug`);
DIAG.activeDevelopment(`--filename=${path.join(os.homedir(), 'nginx.conf')} --debug`);

// DIAG.activeName = 'saveNginxConfigTarball';

mod.xport(DIAG.xport({saveNginxConfigTarball: function(argv, context, callback) {

  return module.exports.getNginxConfigTarball(argv, context, function(err, data) {
    if (err) { return callback(err); }

    const {pack, cwd} = data;
    var   {filename}  = argv;

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
// getNginxConfigTarball

DIAG.usage({
  aliases: {
    getNginxConfigTarball: {
      args: {
      }
    }
  }
});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(`--debug`);

// DIAG.activeName = 'getNginxConfigTarball';

mod.xport(DIAG.xport({getNginxConfigTarball: function(argv, context, callback) {

  const {distro ='ubuntu'}      = argv;
  const {skip_reload =true}     = argv;

  var   manifest = {
    cwd       : '/etc/nginx'
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

  pack.entry({ ...entryDefs(argv), name: 'nginx.conf' }, getNginxConf(argv));
  pack.entry({ ...entryDefs(argv), name: 'conf.d/default.conf' }, getSimpleRevProxy(argv));

  pack.finalize();

  return callback(null, {pack, cwd: manifest.cwd});
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

function getNginxConf(argv) {
  return `

user  nginx;
worker_processes  1;

error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;


events {
    worker_connections  1024;
}


http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile        on;
    #tcp_nopush     on;

    keepalive_timeout  65;

    #gzip  on;

    include /etc/nginx/conf.d/*.conf;
}` +'\n';
}

function getSimpleRevProxy(argv) {

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


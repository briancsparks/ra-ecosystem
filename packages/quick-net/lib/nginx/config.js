

// https://www.nginx.com/resources/wiki/start/topics/examples/full/

const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-flow');
const tar                     = require('tar-stream');
const fs                      = require('fs');
const os                      = require('os');
const path                    = require('path');

const mod                     = ra.modSquad(module, 'nginx-config');
const DIAG                    = sg.DIAG(module);


const entryDefs = {
  mode:   parseInt('644', 8),
  uname:  'nginx',
  gname:  'www',
};

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
DIAG.activeDevelopment(`--filename=${path.join(os.tmpdir(), 'asdf-nginx.conf')} --debug`);
DIAG.activeDevelopment(`--filename=${path.join(os.homedir(), 'asdf-nginx.conf')}`);
DIAG.activeDevelopment(`--filename=${path.join(os.homedir(), 'asdf-nginx.conf')} --debug`);

// DIAG.activeName = 'saveNginxConfigTarball';

mod.xport(DIAG.xport({saveNginxConfigTarball: function(argv, context, callback) {

  // const manifest = {
  //   cwd: '/etc/nginx'
  // };

  // var pack = tar.pack();

  // pack.entry({ ...entryDefs, name: 'manifest.json' }, JSON.stringify(manifest));

  // pack.entry({ ...entryDefs, name: 'nginx.conf' }, getNginxConf(argv));
  // pack.entry({ ...entryDefs, name: 'conf.d/default.conf' }, getSimpleRevProxy(argv));

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

  const manifest = {
    cwd: '/etc/nginx'
  };

  var pack = tar.pack();

  pack.entry({ ...entryDefs, name: 'manifest.json' }, JSON.stringify(manifest));

  pack.entry({ ...entryDefs, name: 'nginx.conf' }, getNginxConf(argv));
  pack.entry({ ...entryDefs, name: 'conf.d/default.conf' }, getSimpleRevProxy(argv));

  return callback(null, {pack, cwd: manifest.cwd});
}}));


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
}`;
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
}`;
}


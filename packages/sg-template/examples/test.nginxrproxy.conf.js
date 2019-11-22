
const sg                      = require('../lib/sg-template');
const path                    = require('path');
const os                      = require('os');

const template = function(argv_, context = {}) {

  var   argv        = argv_                                     || {};
  const workers     = argv.workers        = argv.workers        || 8;
  const connections = argv.connections    = argv.connections    || 1024;
  const webroot     = argv.webroot        = argv.webroot        || path.join(os.homedir(), 'www');
  const logdir      = argv.logdir         = argv.logdir         || path.join(os.homedir(), 'logs');

  const ssl         = argv.ssl            = ('ssl' in argv ? argv.ssl : true);

  var   t = sg.template(__filename, {module, argv, context});

  t.append(`
    user scotty staff;
    worker_process ${workers};

    events {
      worker_connections ${connections};
    }
    `);

  t.rproxy_http((t) => {
    t.append(`
      default_type            application/octet-stream;
      client_body_temp_path   /var/tmp/nginx/client_body_temp;
      client_max_body_size    25M;`, true);

  }, (t) => {

    const server = {
      server_name: 'console.example.com'
    };

    t.rproxy_server(server, (t) => {
      t.comment(`rproxy server`);
    });
  });

  t.comment(`end`);

  return t;
};

if (require.main === module) {
  console.log(template().stringify());
}

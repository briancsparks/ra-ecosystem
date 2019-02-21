
const sg                      = require('sg0');
const utils                   = require('../utils');

const {
  noop,
  std3args
}                             = utils;


const nginx_reverseproxy_conf = function(self, types, ...args) {
  const [ filename, options = {} ]  = args;
  const goptions                    = options.argv || {};
  var   t = self;

  types['nginx.conf'](self, types, ...args);

  // TODO: remove
  // t.verbs = ['get'];

  self.rproxy_http = function(...args) {
    const [ options, cb1, cb2 ]  = std3args(true, ...args);

    return self.http((t) => {

      t.append(cb1(t));

      t.sub_block(`map $http_upgrade $connection_upgrade`, (t) => {
        t.comment(`mapping`);
        return `
          default upgrade;
          "" close;`;
      });

      t.append(cb2(t));
    });

  };

  self.rproxy_server = function(...args) {
    const [ options, cb1, cb2 ]  = std3args(true, ...args);

    const serverOptions = sg.merge(options, {});

    return self.server(serverOptions, (t) => {
      t.append(cb1(t));

      t.sub_location(`/nginx_status`, (t) => `
        stub_status   on;
        access_log    off;
        allow         127.0.0.1;
        allow         10.0.0.0/8;
        deny          all;
        `);

      t.append(cb2(t));

      t.verbs.forEach((verb) => {
        const VERB  = verb.toUpperCase();

        t.sub_location(`~* ^/rpxi/${VERB}/(.*)`, (t) => {
          t.append('internal', true);

          t.append(`
            proxy_connect_timeout                 5000;
            proxy_send_timeout                    5000;
            proxy_read_timeout                    5000;
            send_timeout                          5000;

            proxy_set_header Host                 $http_host;
            proxy_set_header X-Real-IP            $remote_addr;
            proxy_set_header X-Forwarded-For      $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto    $scheme;
            proxy_set_header X-NginX-Proxy        true;

            proxy_set_header X-Client-Verify      $ssl_client_verify;
            proxy_set_header X-Client-I-Dn        $ssl_client_i_dn;
            proxy_set_header X-Client-S-Dn        $ssl_client_s_dn;

            proxy_http_version                    1.1;
            proxy_method                          ${VERB};
            set $other_uri                        $1;

            proxy_pass http://$other_uri$is_args$args;
            `);
        });
      });

      t.sub_location('/', (t) => {
        t.append(`try_files maintenance.html $uri $uri/index.html $uri.html @router;`, true);
      });

      t.sub_location(`@router`, (t) => {
        t.append('internal', true);

        t.append(`
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

          proxy_http_version                    1.1;

          proxy_pass http://10.13.1.10:8401;
          `);
      });
    });
  };

  // Wrap location(), cuz it always needs t.append()
  self.sub_location = function(...args) {
    t.append(t.location(...args));
  };

  self.sub_block = function(...args) {
    t.append(t.block(...args));
  };

  self.type_filename = 'nginx';

};
nginx_reverseproxy_conf.type = 'nginxrproxy.conf';

module.exports = nginx_reverseproxy_conf;

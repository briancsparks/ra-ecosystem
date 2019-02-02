
const sg                      = require('..');

exports.template = function(argv = {}, context = {}) {

  const workers     = argv.workers        || 8;
  const connections = argv.connections    || 1024;

  var   t = sg.template(__filename);

  t.comment('vim: filetype=nginx:');

  t.append(`
    user scotty staff;
    worker_process ${workers};

    events {
      worker_connections ${connections};
    }
    `);

  t.http((t) => {
    t.append(`
      default_type            application/octet-stream;
      client_body_temp_path   /var/tmp/nginx/client_body_temp;
      client_max_body_size    25M;`, true);

    t.block(`map $http_upgrade $connection_upgrade`, (t) => {
      t.comment(`mapping`);
      return `
        default upgrade;
        "" close;`;
    });

    t.server((t) => {
      t.location(`/nginx_status`, (t) => `
        stub_status on;
        access_log off;
        allow 127.0.0.1;
        allow 10.0.0.0/8;
        deny all;
        `);

      t.verbs.forEach((verb) => {
        t.location(`~* ^/rpxi/${verb}/(.*)`, (t) => {
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
            proxy_method                          ${verb};
            set $other_uri                        $1;

            proxy_pass http://$other_uri$is_args$args;
            `);
        });
      });

      t.location('/', (t) => {
        t.append(`try_files maintenance.html $uri $uri/index.html $uri.html @router;`, true);
      });

      t.location(`@router`, (t) => {
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

          proxy_set_header X-Real-IP            $remote_addr;
          proxy_set_header X-Forwarded-For      $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto    $scheme;
          proxy_set_header Host                 $http_host;
          proxy_set_header X-NginX-Proxy        true;
          proxy_set_header Connection           "";

          proxy_http_version                    1.1;

          proxy_pass http://10.13.1.10:8401;
          `);
      });
    });
  });

  return t;
};

console.log(exports.template().stringify());

# Notes on NGINX config

Mostly concerning security and certs.

## X-Accel-Redirect

Used to send NGINX anywhere.

```js
res.setHeader('X-Accel-Redirect', '/secret_internal_fullbalanceto/1.2.3.4/443/path/to/resouce?a=b&c=d#booya');
res.end('');
```

Used with specially-crafted nginx.conf files:

```nginx

# vim: filetype=nginx:

        location ~* ^/secret_internal_rev_proxy/(.*) {
          internal;

          proxy_buffering off;
          proxy_set_header Content-Length "";
          proxy_set_header Cookie "";

          # Do not touch local disks when proxying content to clients
          proxy_method GET;
          proxy_pass_request_body off;
          proxy_max_temp_file_size 0;

          set $download_uri $1;

          proxy_pass http://127.0.0.1/$download_uri;
        }


        location ~* ^/secret_internal_balanceto/(.*)/(.*) {
          internal;

          proxy_buffering off;
          proxy_set_header Content-Length "";
          proxy_set_header Cookie "";

          # Do not touch local disks when proxying content to clients
          proxy_method GET;
          proxy_pass_request_body off;
          proxy_max_temp_file_size 0;

          set $download_host $1;
          set $download_path $2;

          proxy_pass http://$download_host/$download_path;
        }

        location ~* ^/secret_external_rev_proxy/(.*?)/(.*) {
          internal;

          proxy_buffering off;
          proxy_set_header Content-Length "";
          proxy_set_header Cookie "";

          # Do not touch local disks when proxying content to clients
          proxy_method GET;
          proxy_pass_request_body off;
          proxy_max_temp_file_size 0;

          set $download_host $1;
          set $download_uri $2;
          set $download_url http://$download_host/$download_uri;

          proxy_set_header Host $download_host;

          proxy_pass $download_url;
        }

        include routes/def.d/internal_rev_proxy.conf;
        try_files $uri $uri/ $uri.html @def_router;
        location @def_router {
          proxy_pass         http://10.999.0.200:8100;
        }
    }
```

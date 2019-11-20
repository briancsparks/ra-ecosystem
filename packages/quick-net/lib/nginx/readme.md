# Notes on NGINX config

Mostly concerning security and certs.

## Client Certs

## X-Accel-Redirect

Used to send NGINX anywhere.

<https://www.mediasuite.co.nz/blog/proxying-s3-downloads-nginx/>
<https://github.com/ewen/s3-nginx-blog-post>
<https://wellfire.co/learn/nginx-django-x-accel-redirects/>
<https://www.nginx.com/resources/wiki/start/topics/examples/full/>
<https://www.nginx.com/resources/wiki/start/topics/examples/reverseproxycachingexample/>
<https://www.nginx.com/resources/wiki/start/topics/examples/SSL-Offloader/>
<https://kovyrin.net/2010/07/24/nginx-fu-x-accel-redirect-remote/>

```js
res.setHeader('X-Accel-Redirect', '/secret_internal_fullbalanceto/1.2.3.4/443/path/to/resouce?a=b&c=d#booya');
res.end('');
```

Used with specially-crafted nginx.conf files:

```NGINX
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
    proxy_method                          GET;
    set $other_uri                        $1;

    proxy_pass http://$other_uri$is_args$args;
  }

```

```nginx

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

}
```

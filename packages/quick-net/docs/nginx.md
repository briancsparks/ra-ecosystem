# Nginx Config

## HTTPS-ifying

### Prep

Build the nginx conf tree (`/etc/nginx/**/*`) so that certbot will work. This is somewhat TBD,
but here is the gist:

1. Change sites-available/default.
   * As originally installed, this file is very general. Need to change it so that it is
     the default_server, listening on TCP4:80, and TCP6:80. With a root pointing to the
     normal place (`root /var/www/html;`).

The seed nginx.conf file:

```nginx.conf
server {
  listen 80 default_server;
  listen [::]:80 default_server;

  root /var/www/html;

  index index.html index.htm index.nginx-debian.html;

  server_name _;

  location / {
    # file? -> dir? -> 404
    try_files $uri $uri/ =404;
  }
}
```

### Install and Run certbot, Fixup

```sh
sudo apt-get update && sudo apt-get install -y certbot python-certbot-nginx
```

Run certbot for domain

```sh
sudo certbot --nginx -d sub.example.com
```

Fixup conf files.

Certbot will duplicate the seed nginx.conf files server block, adding an identical block
that has the new FQDN in server_name. The new block will have listen 80, [::]:80, and
new listens for 443, [::]:443.

* Copy the `default` file to `<new FQDN>.conf`
* Remove the certbot-added server from default.
* Remove the default server from `<new FQDN>.conf`.
  * Change root `root /var/www/html;` to `root /var/www/<new FQDN>.conf`
* Add the new conf:
  * `ln -s /etc/nginx/sites-available/<new FQDN> sites-enabled/<new FQDN>`

## Other Changes TBD

* Update `/etc/nginx/proxy_params`

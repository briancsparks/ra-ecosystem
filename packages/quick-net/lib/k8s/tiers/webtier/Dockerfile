
# meta: {"repository":"briancsparks", "image":"quicknet-k8s-nginx-ingress"}

#FROM nginx:1.16.0-alpine-perl
#RUN  apk add inotify-tools

FROM briancsparks/quicknet-k8s-node-xenial:latest

RUN   curl -sSL "https://nginx.org/keys/nginx_signing.key" | apt-key add - && \
      echo "deb https://nginx.org/packages/mainline/ubuntu xenial nginx" | tee /etc/apt/sources.list.d/nginx.list && \
      apt-get update && \
      apt-get install -y --no-install-recommends nginx nginx-module-njs && \
      apt-get clean && \
      rm -rf /var/lib/apt/lists

COPY data/nginx-config/usr/bin/auto-reload-nginx /usr/bin/
RUN  chmod +x /usr/bin/auto-reload-nginx

RUN  mkdir -p /usr/share/nginx/html/
COPY data/nginx-config/usr/share/nginx/html/index.html /usr/share/nginx/html/
COPY data/nginx-config/usr/share/nginx/html/index.json /usr/share/nginx/html/

COPY data/nginx-config/etc/nginx/nginx.conf                       /etc/nginx/
COPY data/nginx-config/etc/nginx/conf.d/server-default.conf       /etc/nginx/conf.d/
COPY data/nginx-config/etc/nginx/conf.d/snippets---rpxi           /etc/nginx/conf.d/

EXPOSE 80



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

RUN  mkdir -p /usr/share/nginx/default/html/
COPY data/nginx-config/usr/share/nginx/default/html/index.html /usr/share/nginx/default/html/
COPY data/nginx-config/usr/share/nginx/default/html/index.json /usr/share/nginx/default/html/
COPY data/nginx-config/usr/share/nginx/default/html/index.html /usr/share/nginx/server-1/html/
COPY data/nginx-config/usr/share/nginx/default/html/index.json /usr/share/nginx/server-1/html/
COPY data/nginx-config/usr/share/nginx/default/html/index.html /usr/share/nginx/server-2/html/
COPY data/nginx-config/usr/share/nginx/default/html/index.json /usr/share/nginx/server-2/html/
COPY data/nginx-config/usr/share/nginx/default/html/index.html /usr/share/nginx/server-3/html/
COPY data/nginx-config/usr/share/nginx/default/html/index.json /usr/share/nginx/server-3/html/
COPY data/nginx-config/usr/share/nginx/default/html/index.html /usr/share/nginx/server-4/html/
COPY data/nginx-config/usr/share/nginx/default/html/index.json /usr/share/nginx/server-4/html/
COPY data/nginx-config/usr/share/nginx/default/html/index.html /usr/share/nginx/server-5/html/
COPY data/nginx-config/usr/share/nginx/default/html/index.json /usr/share/nginx/server-5/html/
COPY data/nginx-config/usr/share/nginx/default/html/index.html /usr/share/nginx/server-6/html/
COPY data/nginx-config/usr/share/nginx/default/html/index.json /usr/share/nginx/server-6/html/
COPY data/nginx-config/usr/share/nginx/default/html/index.html /usr/share/nginx/server-7/html/
COPY data/nginx-config/usr/share/nginx/default/html/index.json /usr/share/nginx/server-7/html/
COPY data/nginx-config/usr/share/nginx/default/html/index.html /usr/share/nginx/server-8/html/
COPY data/nginx-config/usr/share/nginx/default/html/index.json /usr/share/nginx/server-8/html/
COPY data/nginx-config/usr/share/nginx/default/html/index.html /usr/share/nginx/server-9/html/
COPY data/nginx-config/usr/share/nginx/default/html/index.json /usr/share/nginx/server-9/html/

COPY data/nginx-config/etc/nginx/nginx.conf                       /etc/nginx/
COPY data/nginx-config/etc/nginx/conf.d/server-default.conf       /etc/nginx/conf.d/
COPY data/nginx-config/etc/nginx/conf.d/snippets---rpxi           /etc/nginx/conf.d/

RUN  mkdir -p /etc/nginx/ssl/server
RUN  mkdir -p /etc/nginx/ssl/server-1
RUN  mkdir -p /etc/nginx/ssl/server-2
RUN  mkdir -p /etc/nginx/ssl/server-3
RUN  mkdir -p /etc/nginx/ssl/server-4
RUN  mkdir -p /etc/nginx/ssl/server-5
RUN  mkdir -p /etc/nginx/ssl/server-6
RUN  mkdir -p /etc/nginx/ssl/server-7
RUN  mkdir -p /etc/nginx/ssl/server-8
RUN  mkdir -p /etc/nginx/ssl/server-9

EXPOSE 80


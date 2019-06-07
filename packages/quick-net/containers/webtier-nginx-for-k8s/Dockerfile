
FROM nginx:1.16.0-alpine-perl

RUN  apk add inotify-tools

COPY auto-reload-nginx /usr/bin/
RUN chmod +x /usr/bin/auto-reload-nginx

RUN mkdir -p /usr/share/nginx/html
COPY index.html /usr/share/nginx/html
COPY index.json /usr/share/nginx/html

EXPOSE 80

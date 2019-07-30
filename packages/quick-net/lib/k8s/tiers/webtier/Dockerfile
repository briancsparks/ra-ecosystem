
FROM nginx:1.16.0-alpine-perl

RUN apk add inotify-tools

COPY data/nginx-config/usr/bin/auto-reload-nginx /usr/bin/
RUN chmod +x /usr/bin/auto-reload-nginx

RUN mkdir -p /usr/share/nginx/html/
COPY data/nginx-config/usr/share/nginx/html/index.html /usr/share/nginx/html/
COPY data/nginx-config/usr/share/nginx/html/index.json /usr/share/nginx/html/

EXPOSE 80



# meta: {"image":"quicknet-k8s-check-cluster", "repository":"briancsparks"}

# FROM node:alpine
# RUN apk add --no-cache socat curl redis

FROM node:12
RUN apt-get update && apt-get install -y dnsutils


RUN mkdir -p            /home/node/app

COPY src/index.js       /home/node/app
COPY src/package.json   /home/node/app

WORKDIR                 /home/node/app

RUN npm install --production

EXPOSE 3000


FROM node:12-alpine

RUN mkdir -p /home/node/app

COPY src/index.js       /home/node/app
COPY src/package.json   /home/node/app

WORKDIR /home/node/app
RUN npm install --production

EXPOSE 3000

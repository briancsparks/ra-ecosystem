
# meta: {"repository":"briancsparks", "image":"quicknet-k8s-check-cluster"}

FROM briancsparks/quicknet-k8s-node-xenial:latest

RUN mkdir -p            /home/node/app

COPY src/index.js       /home/node/app
COPY src/package.json   /home/node/app

WORKDIR                 /home/node/app

RUN npm install --production

EXPOSE 3000


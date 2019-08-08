
# meta: {"image":"quicknet-k8s-check-cluster", "repository":"briancsparks"}

FROM briancsparks/quicknet-k8s-node-xenial

RUN mkdir -p            /home/node/app

COPY src/index.js       /home/node/app
COPY src/package.json   /home/node/app

WORKDIR                 /home/node/app

RUN npm install --production

EXPOSE 3000


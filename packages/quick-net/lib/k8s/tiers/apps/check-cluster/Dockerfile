
# meta: {"repository":"briancsparks", "image":"quicknet-k8s-check-cluster"}

FROM briancsparks/quicknet-k8s-node-xenial:latest

WORKDIR  /opt/node_app/app
COPY     src/* ./

RUN npm install --production

EXPOSE 3000


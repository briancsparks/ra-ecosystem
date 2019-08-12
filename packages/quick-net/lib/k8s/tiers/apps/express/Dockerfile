
# meta: {"repository":"briancsparks", "image":"quicknet-k8s-express-example"}

FROM briancsparks/quicknet-k8s-node-xenial:latest

WORKDIR  /opt/node_app/app
COPY     src/* ./

RUN       npm install --no-optional --production && npm cache clean --force

EXPOSE 3000


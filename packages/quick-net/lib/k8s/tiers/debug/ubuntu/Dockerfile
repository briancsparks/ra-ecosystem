
# meta: {"image":"quicknet-k8s-node-xenial", "repository":"briancsparks"}

FROM ubuntu:xenial

# from https://github.com/nodesource/distributions#deb
RUN   curl -sL https://deb.nodesource.com/setup_12.x | bash - && \
      apt-get update && \
      apt-get install -y nodejs dnsutils curl && \
      which node && node -v && npm -v



# meta: {"repository":"briancsparks", "image":"quicknet-k8s-debug"}

FROM briancsparks/quicknet-k8s-node-xenial:latest

# Install debugging utils
RUN   apt-get update && \
      apt-get install -y --no-install-recommends dnsutils telnet socat && \
      apt-get clean && \
      rm -rf /var/lib/apt/lists

EXPOSE 3009

# vim: ft=dockerfile:


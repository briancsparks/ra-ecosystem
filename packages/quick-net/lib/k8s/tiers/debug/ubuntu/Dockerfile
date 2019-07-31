FROM ubuntu:xenial

# Normal tools to build source
RUN apt-get -y update && apt-get install -y \
  dnsutils \
  curl

# TODO: DO this right.  You can also replace '8' with '10' or '12', but we used 8
# from https://github.com/nodesource/distributions#deb
RUN   curl -sL https://deb.nodesource.com/setup_12.x | bash - && \
      apt-get install -y nodejs && \
      which node && node -v && npm -v

#RUN mkdir -p            /home/node/app
#
#COPY src/index.js       /home/node/app
#COPY src/package.json   /home/node/app
#
#WORKDIR                 /home/node/app
#
#RUN npm install --production
#
#EXPOSE 3000
#

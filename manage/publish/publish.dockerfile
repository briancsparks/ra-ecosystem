FROM ubuntu:xenial


RUN apt-get update && apt-get install -y --no-install-recommends \
      ntp \
      curl \
      software-properties-common \
      apt-transport-https \
      ca-certificates \
      && \
    rm -rf /var/lib/apt/lists/*   && \
    apt-get clean

RUN apt-get update && apt-get install -y --no-install-recommends \
      nodejs \
      jq \
      less \
      git \
      ssh \
      rsync \
      htop \
      tree \
      zip \
      unzip \
      silversearcher-ag \
      vim \
      inotify-tools \
      perl \
      && \
    rm -rf /var/lib/apt/lists/*   && \
    apt-get clean

RUN npm install --global \
      yarn \
      && \
    echo 'booya'

RUN npm install --global \
      lerna \
      && \
    echo 'booya'



# meta: {"repository":"briancsparks", "image":"quicknet-k8s-node-xenial"}

FROM ubuntu:xenial

RUN   apt-get update && apt-get install -y curl software-properties-common

# See: https://askubuntu.com/questions/490468/add-apt-repository-throws-python-error-unicodedecodeerror-ascii-codec-cant
ENV   LC_ALL=C.UTF-8

RUN   curl -sL https://deb.nodesource.com/setup_12.x | bash - && \
      curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
      add-apt-repository -y ppa:rmescandon/yq && \
      echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
      apt-get update && \
      apt-get install -y --no-install-recommends nodejs yarn jq yq inotify-tools \
          vim tree \
          gcc g++ make dnsutils socat telnet && \
      apt-get clean && \
      rm -rf /var/lib/apt/lists && \
      which node && node -v && npm -v



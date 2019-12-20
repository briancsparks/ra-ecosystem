FROM ubuntu:bionic

RUN apt-get update && apt-get install -y --no-install-recommends \
      ntp \
      curl \
      openssl \
      tree \
      unzip \
      apt-transport-https \
      ca-certificates  && \
    rm -rf /var/lib/apt/lists/*   && \
    apt-get clean

WORKDIR /work/bin

RUN curl -sSL "https://d1vvhvl2y92vvt.cloudfront.net/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install

VOLUME /root/.aws
VOLUME /project

COPY . .
RUN chmod +x *

COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

WORKDIR /project
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["openssl"]




FROM node:8

RUN apt-get update && apt-get install -y   \
    groff                               \
    jq                                  \
    less                                \
    python                              \
    python-pip                          \
    python-virtualenv                   \
    tree                                \
    zip                                 \
          &&                            \
    rm -rf /var/lib/apt/lists/*     &&  \
    apt-get clean                   &&  \
    npm install --global claudia        \
          &&                            \
    pip install --upgrade awscli

# ENV  LAMBDA_NAME="package"
COPY quick-lambda/quick-lambda-entrypoint.sh /usr/local/bin
RUN  chmod +x /usr/local/bin/quick-lambda-entrypoint.sh

WORKDIR /work/opt/nodejs

ENTRYPOINT ["quick-lambda-entrypoint.sh"]

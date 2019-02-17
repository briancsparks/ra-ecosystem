
FROM node:8

RUN apt-get update && apt-get install -y   \
    groff                               \
    jq                                  \
    less                                \
    python                              \
    python-pip                          \
    python-virtualenv                   \
    zip                                 \
          &&                            \
    rm -rf /var/lib/apt/lists/*     &&  \
    apt-get clean                   &&  \
    npm install --global claudia        \
          &&                            \
    pip install --upgrade awscli

WORKDIR /work/opt/nodejs

COPY . /work/src

RUN cp -r /work/src/* ./    && \
    rm -rf node_modules     && \
    cp package.json ../     && \
    cat ../package.json | jq 'del(.dependencies) + {dependencies:{}}' > ./package.json   && \
    claudia pack --output /work/package.zip   && \
    cd ..                   && \
    rm -rf nodejs/          && \
    mkdir -p nodejs         && \
    cd nodejs               && \
    cp ../package.json ./   && \
    yarn --production       && \
    cd ..                   && \
    zip -r /work/layer-for-package.zip nodejs

RUN aws s3 cp /work/package.zip s3://netlab-dev/lookieame-package.zip

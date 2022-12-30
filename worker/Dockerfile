FROM public.ecr.aws/docker/library/node:16-alpine

# required for node-gyp
RUN apk update && apk upgrade && apk add --no-cache --virtual builds-deps build-base \
  g++ make python3 python3-dev py3-pip tini

RUN apk add jq

RUN python3 -m pip install awscli

RUN aws configure set default.region ap-southeast-1

WORKDIR /usr/home/postmangovsg

COPY shared ../shared
RUN cd ../shared && npm ci

COPY ./package* ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build
RUN cd ../shared && npm run postbuild
RUN npm prune --production

COPY ./docker-entrypoint.sh ./
RUN ["chmod", "+x", "docker-entrypoint.sh"]

EXPOSE 4000
ENTRYPOINT [ "tini", "--" ]
CMD ["./docker-entrypoint.sh"]

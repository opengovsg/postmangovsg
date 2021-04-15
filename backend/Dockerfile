FROM node:12-alpine

# required for node-gyp
RUN apk update && apk upgrade && apk add --no-cache --virtual builds-deps build-base \
  g++ make python tini python2-dev

RUN apk add py-pip && apk add jq

RUN pip install awscli

RUN aws configure set default.region ap-southeast-1

WORKDIR /usr/home/postmangovsg

COPY modules ../modules

COPY ./package* ./
RUN npm ci

COPY src ./src
COPY tsconfig.json ./

RUN npm run build
RUN npm prune --production

COPY ./docker-entrypoint.sh ./
RUN ["chmod", "+x", "docker-entrypoint.sh"]

EXPOSE 4000
ENTRYPOINT [ "tini", "--" ]
CMD ["./docker-entrypoint.sh"]

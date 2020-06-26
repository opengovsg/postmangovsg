FROM node:12-alpine

# required for node-gyp
RUN apk update && apk upgrade && apk add --no-cache --virtual builds-deps build-base \
  g++ make python tini

WORKDIR /usr/home/postmangovsg/backend

COPY modules /usr/home/postmangovsg/modules

RUN cd /usr/home/postmangovsg/modules/postman-templating && npm ci

COPY backend/package* ./
RUN npm ci

COPY backend/src ./src
COPY backend/tsconfig.json ./

RUN npm run build
RUN npm prune --production

EXPOSE 4000
ENTRYPOINT [ "tini", "--" ]
CMD ["npm", "start"]
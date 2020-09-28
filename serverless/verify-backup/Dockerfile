FROM node:12-alpine

RUN apk update && apk upgrade
RUN apk add postgresql

WORKDIR /usr/home/postmangovsg

COPY ./package* ./
RUN npm ci

COPY src ./src
COPY tsconfig.json ./
COPY postmangovsg-service-account-key.json ./
COPY run.sh ./

RUN npm run build
RUN npm prune --production

ENTRYPOINT ["sh", "run.sh"]
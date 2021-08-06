FROM node:12-alpine

RUN apk update && \
  apk upgrade && \
  apk add postgresql-client

WORKDIR /usr/home/postmangovsg

COPY ./package* ./
RUN npm ci

COPY ./src ./src
COPY ./tsconfig.json ./
RUN npm run build && npm prune --production

ENTRYPOINT ["node"]
CMD ["./build/index.js"]

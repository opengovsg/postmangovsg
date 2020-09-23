FROM node:12-alpine

RUN apk update && apk upgrade
RUN apk add postgresql

WORKDIR /usr/home/postmangovsg

COPY ./package* ./
RUN npm ci

COPY src ./src
COPY tsconfig.json ./
COPY postmangovsg-service-account-key.json ./

RUN npm run build
RUN npm prune --production

RUN mkdir -p /run/postgresql/
RUN chown -R postgres:postgres /run/postgresql/

USER postgres
RUN initdb /var/lib/postgresql/data
RUN pg_ctl start -D /var/lib/postgresql/data && createdb postmangovsg_dev

USER root
EXPOSE 4000
CMD ["npm", "start"]

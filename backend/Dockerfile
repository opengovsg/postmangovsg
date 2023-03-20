FROM public.ecr.aws/docker/library/node:18-alpine as builder
WORKDIR /usr/home/postmangovsg

COPY shared ../shared
RUN cd ../shared && npm ci

COPY ./package* ./
RUN npm ci

COPY tsconfig.* ./
COPY src ./src

RUN npm run build
RUN cd ../shared && npm run postbuild

FROM public.ecr.aws/docker/library/node:18-alpine
# postman public ecr

# required for node-gyp
RUN apk update && apk upgrade && apk add --no-cache --virtual builds-deps build-base \
  g++ make python3 python3-dev py3-pip tini

RUN apk add jq

RUN python3 -m pip install awscli

RUN aws configure set default.region ap-southeast-1

WORKDIR /usr/home/postmangovsg

# this means npm will only install production deps, and optimizations in the node
# engine will take place as well
ENV NODE_ENV=production 

# expose port and copy these files first as they're unlikely to change
EXPOSE 4000
COPY ./docker-entrypoint.sh ./
RUN ["chmod", "+x", "docker-entrypoint.sh"]

COPY --from=builder /usr/home/shared/package* ../shared/
RUN cd ../shared && npm install 

COPY --from=builder /usr/home/postmangovsg/package* ./
RUN npm install

COPY --from=builder /usr/home/shared/build ../shared/build

COPY openapi.yaml ./
COPY --from=builder /usr/home/postmangovsg/build ./build

ENTRYPOINT [ "tini", "--" ]
CMD ["./docker-entrypoint.sh"]

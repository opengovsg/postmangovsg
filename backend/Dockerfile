FROM public.ecr.aws/docker/library/node:18-alpine as builder
WORKDIR /usr/home/postmangovsg

COPY shared ../shared
RUN cd ../shared && npm ci

COPY tsconfig.* ./
COPY ./package* ./
RUN npm ci

COPY src ./src

RUN npm run build
RUN cd ../shared && npm run postbuild

FROM public.ecr.aws/docker/library/node:18-alpine

# required for node-gyp
RUN apk update && apk upgrade && apk add --no-cache --virtual builds-deps build-base \
  g++ make python3 python3-dev py3-pip tini

RUN apk add jq

# There was a breaking change in the base image used that prevents us from installing via pip
# Instead of activating a virtual env, this is a simpler workaround
# https://github.com/python/cpython/issues/102134
RUN apk add --no-cache aws-cli

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

COPY --from=builder /usr/home/postmangovsg/build ./build

ENTRYPOINT [ "tini", "--" ]
CMD ["./docker-entrypoint.sh"]

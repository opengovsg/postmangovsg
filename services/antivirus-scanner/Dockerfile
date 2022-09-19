FROM public.ecr.aws/docker/library/node:16-bullseye

LABEL maintainer="Open Government Products" email="postman@open.gov.sg"

RUN echo "Prepping ClamAV"

ARG FUNCTION_DIR="/home"
WORKDIR ${FUNCTION_DIR}

RUN apt-get update && \
  apt-get install -y \
  curl

# install clamav
RUN apt-get update && \
  apt-get install -y \
  clamav \
  clamav-daemon

RUN mkdir /var/run/clamav && \
  chown clamav:clamav /var/run/clamav && \
  chmod 750 /var/run/clamav

# update clamav and virus definitions
RUN freshclam

# install app dependencies
COPY package.json package-lock.json ${FUNCTION_DIR}/
COPY tsconfig.json ${FUNCTION_DIR}/
RUN npm ci

# Point clamav log and socket to /tmp folder
RUN sed -i 's/LogFile \/var\/log\/clamav\/clamav.log/LogFile \/tmp\/clamav.log/g' /etc/clamav/clamd.conf
RUN sed -i 's/LocalSocket \/var\/run\/clamav\/clamd.ctl/LocalSocket \/tmp\/clamd.ctl/g' /etc/clamav/clamd.conf

COPY . ${FUNCTION_DIR}
RUN { \
  echo "Building..."; \
  npm run build; \
  echo "Removing devDependencies for production..."; \
  npm prune --production; \
}

EXPOSE 8080
RUN echo $(ls)

HEALTHCHECK --interval=12s --timeout=12s --start-period=60s \ 
  CMD curl --fail http://localhost:8080 || exit 1  

# Starts the ClamAV daemon, then starts Express Node server
CMD ["bash", "./run.sh"]
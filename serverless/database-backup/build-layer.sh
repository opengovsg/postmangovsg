#!/bin/bash

# This shell script installs and create a AWS Lambda layer zip that includes pg_dump and the libraries that it requires.

MAJOR_VERSION=$(echo $PG_VERSION | cut -d'.' -f1)

# Install pg_dump. We need to do this because Amazon Linux 2 is not a officially support platform. See https://stackoverflow.com/a/55809896.
# Therefore, we need to manually install subpackages instead of using the main rpm. Solution provided by https://stackoverflow.com/a/49574454
yum install -y "https://download.postgresql.org/pub/repos/yum/$MAJOR_VERSION/redhat/rhel-7-x86_64/postgresql$MAJOR_VERSION-libs-$PG_VERSION""PGDG.rhel7.x86_64.rpm"
yum install -y "https://download.postgresql.org/pub/repos/yum/$MAJOR_VERSION/redhat/rhel-7-x86_64/postgresql$MAJOR_VERSION-$PG_VERSION""PGDG.rhel7.x86_64.rpm"

# Create layer directory structure
echo "Creating layer zip"
mkdir -p /layer/{bin,lib}

# Copy pg_dump binary
cp $(which pg_dump) /layer/bin

# Copy the libraries that are required by pg_dump but are not available in the standard lambda runtime. To determine this list, manually run this script from within a container.
# After which, run ldd $(which pg_dump) to determine the list of shared libraries the binary is linked to. Compare this list with what is available in the lambda runtime. The
# list of libraries in the standard lambda runtime can be obtained by running ls /lib64 with a test lambda.
cp /lib64/{libldap_r-2.4.so.2,liblber-2.4.so.2,libsasl2.so.3,libssl3.so,libsmime3.so,libnss3.so,libcrypt.so.1} /layer/lib
cp /usr/pgsql-11/lib/libpq.so.5 /layer/lib

cd /layer && zip -r /layer.zip ./*

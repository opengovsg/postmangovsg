#!/bin/bash

PG_MAJOR_VERSION=$(echo $PG_VERSION | cut -d'.' -f1)

# Install pg_dump.
amazon-linux-extras install -y "postgresql$PG_MAJOR_VERSION"

# Create layer directory structure
rm -rf $LAMBDA_TASK_ROOT/bin $LAMBDA_TASK_ROOT/lib
mkdir -p $LAMBDA_TASK_ROOT/{bin,lib}

# Copy pg_dump binary
cp $(which pg_dump) $LAMBDA_TASK_ROOT/bin

# Copy the libraries that are required by pg_dump but are not available in the standard lambda runtime. To determine this list, manually run this script from within a container.
# After which, run ldd $(which pg_dump) to determine the list of shared libraries the binary is linked to. Compare this list with what is available in the lambda runtime. The
# list of libraries in the standard lambda runtime can be obtained by running ls /lib64 with a test lambda.
cp /lib64/{libldap_r-2.4.so.2,liblber-2.4.so.2,libsasl2.so.3,libssl3.so,libsmime3.so,libnss3.so,libcrypt.so.1,libpq.so.5} $LAMBDA_TASK_ROOT/lib

# Build and install code
npm install && npm run build && npm prune --production

echo "Creating lambda deployment zip"
rm -rf code.zip
zip -qr code.zip lib bin build src package.json node_modules/
echo "Lambda deployment zip created"

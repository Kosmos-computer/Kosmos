#!/bin/bash
set -e

# Copy config files from S3
CONFIG_S3_PATH=fathom-config/fathom-orchestration/production
aws s3 cp s3://$CONFIG_S3_PATH/ . --recursive

# Build docker image, passing docker build arguments along, such as --no-cache
docker build -t fathom-orchestration . $1
#!/bin/bash
set -e

log () {
  echo "=============== $1 =============="
}

error () {
  echo "************* ERROR! *************"
  echo $1
  echo "************* ERROR! *************"
}

log "STARTING DEPLOY..."
rm -rf .build
mkdir .build
cp -r * .build 
cd .build

# Copy config files from S3
CONFIG_S3_PATH=fathom-config/fathom-web-api/development
log "COPYING ENV CONFIG FROM ${CONFIG_S3_PATH}..."
aws s3 cp s3://$CONFIG_S3_PATH/ . --recursive

log "BUILDING DOCKER IMAGE..."
# Pass docker build arguments along, such as --no-cache
docker build -t fathom-web-api . $1

log "PUSHING TO ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 410192009209.dkr.ecr.us-east-1.amazonaws.com
docker tag fathom-web-api:latest 410192009209.dkr.ecr.us-east-1.amazonaws.com/fathom-web-api:dev
docker push 410192009209.dkr.ecr.us-east-1.amazonaws.com/fathom-web-api:dev

log "RESTARTING ECS SERVICES..."
aws ecs update-service --force-new-deployment --cluster fathom-web --service fathom-web-api-dev 1> /dev/null

log "DEPLOY COMPLETE!"
cd ../
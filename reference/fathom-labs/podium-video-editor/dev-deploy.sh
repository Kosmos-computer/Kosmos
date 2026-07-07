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
CONFIG_S3_PATH=fathom-config/podium-video-editor/development
log "COPYING ENV CONFIG FROM ${CONFIG_S3_PATH}..."
aws s3 cp s3://$CONFIG_S3_PATH/ . --recursive

log "BUILDING DOCKER IMAGE..."
# Pass docker build arguments along, such as --no-cache
docker build -t podium-video-editor . $1

log "PUSHING TO S3 REMOTION SITE..."
docker run podium-video-editor:latest npx remotion lambda sites create src/index.ts --site-name=podcast-video-dev

log "PUSHING TO ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 410192009209.dkr.ecr.us-east-1.amazonaws.com
docker tag podium-video-editor:latest 410192009209.dkr.ecr.us-east-1.amazonaws.com/podium-video-editor:dev
docker push 410192009209.dkr.ecr.us-east-1.amazonaws.com/podium-video-editor:dev

log "RESTARTING ECS SERVICES..."
aws ecs update-service --force-new-deployment --cluster podium-video-editor --service podium-video-editor-dev 1> /dev/null

log "DEPLOY COMPLETE!"
cd ../

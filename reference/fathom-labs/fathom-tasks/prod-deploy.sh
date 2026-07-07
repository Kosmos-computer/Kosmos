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
CONFIG_S3_PATH=fathom-config/fathom-tasks/production
log "COPYING ENV CONFIG FROM ${CONFIG_S3_PATH}..."
aws s3 cp s3://$CONFIG_S3_PATH/ . --recursive

log "BUILDING DOCKER IMAGE..."
# Pass docker build arguments along, such as --no-cache
docker build -t fathom-tasks . $1

log "RUNNING TESTS"
./dev-console.sh ./run-tests.sh

log "PUSHING TO ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 410192009209.dkr.ecr.us-east-1.amazonaws.com
docker tag fathom-tasks:latest 410192009209.dkr.ecr.us-east-1.amazonaws.com/fathom-tasks:latest
docker push 410192009209.dkr.ecr.us-east-1.amazonaws.com/fathom-tasks:latest

log "RESTARTING ECS SERVICES..."
aws ecs update-service --force-new-deployment --cluster fathom-tasks --service fathom-dask-workers 1> /dev/null
aws ecs update-service --force-new-deployment --cluster fathom-tasks --service fathom-prefect-agents 1> /dev/null
aws ecs update-service --force-new-deployment --cluster fathom-tasks --service fathom-prefect-agents_podcast-processing 1> /dev/null
aws ecs update-service --force-new-deployment --cluster fathom-tasks --service fathom-prefect-agents_podcast-processing-l2 1> /dev/null
aws ecs update-service --force-new-deployment --cluster fathom-tasks --service fathom-prefect-agents_episode-processing 1> /dev/null
aws ecs update-service --force-new-deployment --cluster fathom-tasks --service fathom-prefect-agents_notification-processing 1> /dev/null

log "DEPLOY COMPLETE!"
cd ../

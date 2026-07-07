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
CONFIG_S3_PATH=fathom-config/podium-web/development
log "COPYING ENV CONFIG FROM ${CONFIG_S3_PATH}..."
aws s3 cp s3://$CONFIG_S3_PATH/ . --recursive

log "BUILDING DOCKER IMAGE..."
# Pass docker build arguments along, such as --no-cache
docker build -t podium-web . $1

log "PUSHING TO ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 410192009209.dkr.ecr.us-east-1.amazonaws.com
docker tag podium-web:latest 410192009209.dkr.ecr.us-east-1.amazonaws.com/podium-web:dev
docker push 410192009209.dkr.ecr.us-east-1.amazonaws.com/podium-web:dev

log "DEPLOYING TO ECS..."

task_definition=$(aws ecs describe-services --cluster podium-web --services podium-web-dev --query "services[0].taskDefinition" --output text)

revision="""
version: 0.0
Resources:
  - TargetService:
      Type: AWS::ECS::Service
      Properties:
        TaskDefinition: $task_definition
        LoadBalancerInfo:
          ContainerName: web
          ContainerPort: 3000
        PlatformVersion: LATEST
"""

aws deploy create-deployment \
    --application-name "AppECS-podium-web-podium-web-dev" \
    --deployment-group-name "DgpECS-podium-web-podium-web-dev" \
    --revision "revisionType=AppSpecContent,appSpecContent={content=$revision}" \
    --region us-east-1

log "DEPLOY COMPLETE!"
cd ../

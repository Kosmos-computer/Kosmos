#!/bin/bash
set -e

aws ecs list-services --cluster fathom-orchestration --query 'serviceArns' | jq -r '.[]' | while read i; do
    aws ecs update-service --force-new-deployment --cluster fathom-orchestration --service $i 1> /dev/null
done
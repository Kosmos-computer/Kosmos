aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 410192009209.dkr.ecr.us-east-1.amazonaws.com
docker tag fathom-orchestration:latest 410192009209.dkr.ecr.us-east-1.amazonaws.com/fathom-orchestration:latest
docker push 410192009209.dkr.ecr.us-east-1.amazonaws.com/fathom-orchestration:latest
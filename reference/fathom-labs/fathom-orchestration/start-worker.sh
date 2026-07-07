#!/bin/bash
set -e

echo "STARTING CELERY WORKER FOR QUEUE $1..."

celery --app=fathom_orchestration.celery_services worker -Q $1 -l INFO | tee >(ncat --ssl $PAPERTRAIL_ADDRESS)
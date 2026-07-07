#!/bin/bash
set -e

echo "STARTING CELERY SCHEDULER..."

celery --app=fathom_orchestration.celery_services beat -l INFO | tee >(ncat --ssl $PAPERTRAIL_ADDRESS)   
#!/bin/bash
set -e

echo "STARTING CELERY WORKER..."

celery --app=fathom_orchestration.celery_services flower --port=80 | tee >(ncat --ssl $PAPERTRAIL_ADDRESS)
#!/bin/bash
set -e

echo "STARTING PREFECT AGENT..."

/usr/local/bin/prefect agent local start \
  --import-path "/app" \
  --name $(python -c 'import uuid; print(uuid.uuid4())') \
  --agent-address "http://localhost:8080" \
  --max-polls 10000 \
  --log-level WARNING \
  --key $PREFECT__CLOUD__API_KEY \
  --api $PREFECT__CLOUD__API \
  --tenant-id $PREFECT__CLOUD__TENANT_ID | tee >(ncat --ssl $PAPERTRAIL_ADDRESS)
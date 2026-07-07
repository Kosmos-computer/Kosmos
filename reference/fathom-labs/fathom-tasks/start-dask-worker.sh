#!/bin/bash
set -e

echo "STARTING DASK WORKER..."

/usr/local/bin/dask-worker $DASK_SCHEDULER_ADDRESS \
  --nprocs "auto" \
  --worker-port 8000:8015 \
  --nanny-port 9000:9015 | tee >(ncat --ssl $PAPERTRAIL_ADDRESS)
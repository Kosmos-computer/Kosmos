import fathom_orchestration.tasks
import fathom_core as core
import logging
import sys

# Error Reporting
# ---------------------------------------------------------------
import sentry_sdk

sentry_sdk.init(
    "https://10426591e8ee4902b9307353c349acd4@o1017717.ingest.sentry.io/6358947",
    traces_sample_rate=0.1
)

# Configure Logging
# ---------------------------------------------------------------

if core.env['environment'] == 'production':
  # Copy logs to stdout so that they can be sent to Papertrail
  handler = logging.StreamHandler(sys.stdout)
  handler.setLevel(logging.INFO)
  core.log.addHandler(handler)
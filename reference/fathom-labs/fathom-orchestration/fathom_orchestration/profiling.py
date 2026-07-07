from contextlib import contextmanager
import fathom_core as core

# Configure Datadog
# if core.env['environment'] == 'production':
#     from ddtrace import tracer
#     from datadog import statsd

# Configure transaction wrapper
@contextmanager
def transaction(name):
    yield

    # if core.env['environment'] == 'production':
    #     with tracer.trace(name):
    #         yield
    #         statsd.increment(f"fathom.{name}")
    # else:
    #     yield

# def report_metric(name, value):
#     if core.env['environment'] == 'production':
#         statsd.gauge(f"fathom.metric.{name}", value)

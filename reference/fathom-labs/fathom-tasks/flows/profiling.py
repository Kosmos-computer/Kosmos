import sentry_sdk
from contextlib import contextmanager

sentry_sdk.init(
    "https://9d2ce6dedfa448dea60eeb10018b5fa4@o1017717.ingest.sentry.io/5983725",
    traces_sample_rate=0.20
)

@contextmanager
def transaction(name):
    with sentry_sdk.start_transaction(name=name):
        try:
            yield
        except Exception as e:
            sentry_sdk.capture_exception(e)
            raise e

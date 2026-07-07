import app
import time
import asyncio
import datetime
from datetime import timedelta

def execute():

    while True:
        try:
            job_to_process = app.core.data_models.Job.next_ready_to_process()
            job.process()

        except Exception as e:
            app.log.critical(f"ERROR IN MAIN ROUTINE")
            app.log.critical(e, exc_info=True)

        time.sleep(1)

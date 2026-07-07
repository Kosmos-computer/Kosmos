import app
import time
import random
import asyncio

def execute():

    while True:

        try:
            app.log.info(f"RETRIEVING NEXT JOB...")

            job_to_process = app.core.data_models.Job.next_ready_to_process()

            if job_to_process:
                asyncio.run(job_to_process.process())

        except Exception as e:
            app.log.critical(f"ERROR IN MAIN ROUTINE")
            app.log.critical(e, exc_info=True)

        '''
        This sleepy time must be at least the double of the
        sleepy time used by whisper_coordinator. So that
        it can check if the instance is idle and stop it when needed.
        '''
        time.sleep(random.uniform(7000, 11000)/1000)

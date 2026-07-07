
import whisper_core as core
from datetime import datetime
from pytz import timezone
import time
import os

class HeartBeat:

    def __init__(self):
        self.last_processing_job = None
        self.estimated_job_finishing_time_in_seconds = None
        self.init_job = True

    def get_eastern_datetime(self):
        tz = timezone('EST')
        return datetime.now(tz)

    def stop_systemd_whisper(self):
        '''
        Stop the systemd whisper service.
        '''
        os.system('sudo systemctl stop whisper-processing.service')

    def start_systemd_whisper(self):
        '''
        Stop the systemd whisper service.
        '''
        os.system('sudo systemctl start whisper-processing.service')

    def revert_job_status(self, processing_job):
        if processing_job.attempts == 2:
            processing_job.status = 'error'
            processing_job.error = 'Job took too long to process.'
            processing_job.save()
        else:  
            processing_job.attempts += 1
            processing_job.status = 'pending'
            processing_job.instance_id = None
            processing_job.save()
        
        self.init_job = True
        self.last_processing_job = None


    def check_elapsed_time(self, processing_job, heartbeat_time):
        '''
        Try until getting episode duration in the DB.
        '''
        self.estimated_job_finishing_time_in_seconds = None
        try:
            if processing_job.model == 'whisper_small':
                self.estimated_job_finishing_time_in_seconds = (processing_job.duration * 5)/60  # 5 minutes per minute of audio
            elif processing_job.model == 'whisper_large':
                self.estimated_job_finishing_time_in_seconds = (processing_job.duration * 15)/60 # 15 minutes per minute of audio
            self.elapsed_time = heartbeat_time - self.init_time

            if self.elapsed_time.seconds > 4 * self.estimated_job_finishing_time_in_seconds:
                self.stop_systemd_whisper()
                self.revert_job_status(processing_job)
                self.start_systemd_whisper()

        except:
            pass

    def last_heartbeat(self):
        while True:
            '''
            There are two observed failure scenarios:
            1. The job is stuck while processing, exceeding 2 times the estimated time. We will stop it,
                set it to pending increacing the attempts to give a second chance.
            2. The whisper_processing.service is down for some reason (not the spot instance), leaving 
                behind processing jobs while getting new ones. In this scenario, the 
                whisper_processing.service will be stopped and all jobs will be set to pending increacing 
                the attempts to give a second chance.
            '''
            processing_jobs = core.data_models.Job.processing_job_per_instance(core.env['instance_id'])
            
            if processing_jobs:
                if len(processing_jobs) == 1:
                    processing_job = processing_jobs[0]
                    # print(processing_job.id)
                    # print(self.last_processing_job.id if self.last_processing_job else None)
                    # print(self.init_job)
                    if not self.init_job and processing_job.id != self.last_processing_job.id:
                        self.init_job = True
                    if self.init_job:
                        self.init_time = self.get_eastern_datetime()
                        self.init_job = False
                        self.last_processing_job = processing_job

                    heartbeat_time = self.get_eastern_datetime()
                    processing_job.last_heartbeat = heartbeat_time
                    processing_job.save()
                    self.check_elapsed_time(processing_job, heartbeat_time)

                elif len(processing_jobs) > 1:
                    self.stop_systemd_whisper()
                    for processing_job in processing_jobs:
                        self.revert_job_status(processing_job)
                    self.start_systemd_whisper()

            elif self.last_processing_job is not None:
                '''
                Keep updating the heartbeat of the last processing job.
                '''
                self.last_processing_job.last_heartbeat = self.get_eastern_datetime()
                self.last_processing_job.save()
                self.init_job = True

            time.sleep(5)

if __name__ == '__main__':
    HeartBeat().last_heartbeat()
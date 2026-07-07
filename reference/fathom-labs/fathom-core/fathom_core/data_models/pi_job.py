import fathom_core as core
from orator import Model

import boto3
import json

import requests

class PiJob(Model):
    __connection__ = 'pi_main'
    __table__ = 'jobs'

    def get_transcript(self):
        s3 = boto3.client('s3', aws_access_key_id=core.env['aws_access_key'], aws_secret_access_key=core.env['aws_access_secret'])
        transcript_url = s3.generate_presigned_url(
                ClientMethod='get_object',
                Params={
                    'Bucket': self.s3_bucket,
                    'Key': self.s3_key
                }
            )

        transcript = json.loads(requests.get(transcript_url).content)

        return transcript

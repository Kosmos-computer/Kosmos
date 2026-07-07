from orator import Model
from orator.orm import belongs_to
import requests
import json
import datetime
import fathom_core as core
import orjson
import boto3

class PodiumClipProps(Model):
    __table__ = 'podium_clip_props'
  

    def download_url(self):
        return f"https://s3.us-east-1.amazonaws.com/remotionlambda-useast1-pl9hex6qhc/renders/{self.render_id}/out.mp4"
   
    def clips_props(self):
        podium_package = core.data_models.PodiumPackage \
        .where('id', self.podium_package_id) \
        .first()

        podium_package = podium_package
        
        audioUrl  = podium_package.audio_url()
        
        transcript_file = core.data_models.PodiumPackageTranscriptFile \
            .where('podium_package_id', podium_package.id) \
            .select('id', 'guid', 's3_bucket', 's3_key') \
            .first()


        cached_transcript_data = core.cache.get(transcript_file.guid, cache="transcripts")

        if cached_transcript_data is not None:
            transcript = orjson.loads(cached_transcript_data)
            transcript_file.content = transcript
        else:
            transcript_file.load_content()
            transcript_file.cache_transcript()

        media_transcript = transcript_file.get_transcript_with_speakers()
        media_transcript = transcript_file.apply_speaker_edits(media_transcript)

        transcript_words = []
        transcript_start = []
        for data in media_transcript["monologues"]:
            for element in data["elements"]:
                transcript_words.append(element["value"])
                transcript_start.append(element["start"]) 

        inputProps = self.input_props
        if inputProps is None:
            inputProps = {}
        inputProps['audioUrl']=audioUrl
        inputProps['transcriptStarts']=transcript_start
        inputProps['transcriptWords']=transcript_words
        
        if self.s3_key:
            inputProps['imageUrl']=self.clip_image_url()
        else:
            inputProps['imageUrl']=None

        return inputProps
    

    def clip_image_url(self):
        if self.s3_key:
            return f"https://podium-production.s3.amazonaws.com/{self.s3_key}"
        else:
            return None
        
        



        
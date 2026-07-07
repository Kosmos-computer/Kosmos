import fathom_asr_core as core
import librosa
import soundfile as sf
import re
from orator import *
import boto3
import os
from datetime import datetime, timezone
import math
import json
import traceback

class JobPart(Model):
    '''The reason of the hung up process could be realated to the function is_instances_idle.
        The status of the last processed job is finished or error but, the instance
        already aknowleded a new job (before updating the job status) then the instance is stopped.
        The point is that it seems to be a difference between stopping the instance and termination
        of the spot instances, because when the spot instance is terminated, celery loses the contact
        with the instance and re-assings the job to another instance after some time.

        stop_instances(..., Force=True) should fix this issue.
    '''

    # ----------------------------------------------------------------------------------------------------------------------------
    # Constants
    # ----------------------------------------------------------------------------------------------------------------------------

    # #DEBUG
    # TEMP_AUDIO_PATH = '/home/yoelvis/temp/temp_audio_folder'
    TEMP_AUDIO_PATH = core.env["temp_audio_folder"]

    TEMP_MP3_AUDIO_FILE_PATH = f'{TEMP_AUDIO_PATH}/audio.mp3'
    TEMP_WAV_AUDIO_FILE_PATH = f'{TEMP_AUDIO_PATH}/audio.wav'

    # ----------------------------------------------------------------------------------------------------------------------------
    # Instance Methods
    # ----------------------------------------------------------------------------------------------------------------------------

    # def start(self):
        # self.s3_bucket = core.env["aws_s3_bucket"]
        # self.s3_key = f'{self.guid}/transcript.json'
        # self.output_url = f"https://{self.s3_bucket}.s3.amazonaws.com/{self.s3_key}"
        # self.save()

        # self.set_status('started')

        # return None

    def retrieve_media(self, wav_audio_part_key):
        # self.instance_id = core.env["instance_id"]
        self.set_status('retrieving_media')
        self.save()

        # Download file from S3
        s3 = boto3.client('s3', aws_access_key_id=core.env["aws_access_key"], aws_secret_access_key=core.env["aws_access_secret"])
        s3.download_file(core.env["aws_s3_bucket"], wav_audio_part_key, JobPart.TEMP_WAV_AUDIO_FILE_PATH)

        return None

    def transcode(self):
        # wav_audio_path = core.audio_processing.mp3_to_wav(JobPart.TEMP_MP3_AUDIO_FILE_PATH, JobPart.TEMP_WAV_AUDIO_FILE_PATH)
        y_mono, sample_rate = librosa.load(f'{JobPart.TEMP_WAV_AUDIO_FILE_PATH}', sr=None)

        self.duration = math.ceil(len(y_mono)/16000)
        self.save()

        return y_mono
    
    def check_none_timestamp(self, segments):
        for i in range(len(segments)):
            if segments[i]['start'] is None:
                if i == 0:
                    segments[i]['start'] = 0.0
                else:
                    segments[i]['start'] = segments[i-1]['end']

            if segments[i]['end'] is None:
                if i == len(segments) - 1:
                    segments[i]['end'] = self.duration
                else:
                    segments[i]['end'] = segments[i+1]['start']

        return segments

    def optimize_segments(self, segments):
        '''
        If a segments is shorter than 1 second, it will be merged with the
        previous segment.
        '''

        new_segments = []
        new_index = 0
        for segment in segments:
            if segment['end'] > self.duration:
                segment['end'] = self.duration

            if new_index == 0:
                new_segments.append({'text': segment['text'], 'start': segment['start'], 'end': segment['end']})
                new_index += 1
            else:
                if segment['end'] - segment['start'] > 1.0:
                    new_segments.append({'text': segment['text'], 'start': segment['start'], 'end': segment['end']})
                    new_index += 1
                else:
                    new_segments[new_index - 1]['text'] = new_segments[new_index - 1]['text'] + ' ' + segment['text']
                    new_segments[new_index - 1]['end'] = segment['end']
        
        # If the first segment is less than 1 second, merge it with the second segment:
        if len(new_segments) > 1:
            if new_segments[0]['end'] - new_segments[0]['start'] < 1.0:
                new_segments[0]['text'] = new_segments[0]['text'] + ' ' + new_segments[1]['text']
                new_segments[0]['end'] = new_segments[1]['end']
                new_segments.pop(1)

        return new_segments

    def aligner(self, y_mono, segments):
        '''
        If this function is modified, the following episodes must be tested:
        - It should work on g4dn.xlarge instances. Check chunk 213 (episode ID: 6296779):
        https://fathom-production.s3.amazonaws.com/podcasts/life_kit/episodes/terrestrials_a_new_kids_show_from_radiolab_uncovers_the_strangeness_on_earth_2023_01_21/audio/e057d600-1ece-47a1-8a6d-c28750142521.mp3

        - Check alignment aroud minute 1:00:
        https://fathom-production.s3.amazonaws.com/podcasts/ultraculture_with_jason_louv/episodes/ep_141_don_webb_on_how_to_become_a_modern_magus_2023_01_16/audio/5e22f63a-e9aa-4b7d-9636-ec4f69bf7265.mp3

        - This one gets messed up after minute 42.55:
        https://fathom-production.s3.amazonaws.com/podcasts/jovan_hutton_pulitzer/episodes/ga_147k_ballot_inspection_case_back_on_kari_lake_case_on_appeals_gets_expedited_2023_01_13/audio/98dfa11b-3e42-468e-984a-605eb4ae3c54.mp3 
        whisper segment:
        2575.86 3091.66
        Get it done now.  Cut the Crap.  Cut the Crap.  Cut the Crap.  Cut the Crap.  Cut the Crap.  Cut the Crap.  Cut the Crap.  Cut the Crap.  Cut the Crap.
        It get right if using: best_of=5, beam_size=5
        '''
        aligned_words = []
        for index, segment in enumerate(segments):
            clean_segment_with_replacements = core.text.clean_whisper_segment(segment['text'])

            # print()
            # print('whisper segment:')
            # print(segment['start'], segment['end'])
            # print(segment['text'])

            '''
            At this point, the segment only must contain . , ? % $ ¢ £ € - and ' 
            on it (as expected from whisper output). 
            We also have the original words (used for final display) and the replacements 
            that will be used for the forced alignment:
            '''
            # Remove the clean_segment_with_replacements elements containing empty replacements:
            clean_segment_with_replacements = [x for x in clean_segment_with_replacements if x['replacement'] != '']

            if len(clean_segment_with_replacements) > 0:
                non_numberized_segment = [x['replacement'] for x in clean_segment_with_replacements]
                original_segment = [x['original'] for x in clean_segment_with_replacements]

                non_numberized_segment_text = ' '.join(non_numberized_segment)
                
                non_numberized_segment_text = re.sub(r'[\,\.\?]', '', non_numberized_segment_text)

                '''
                To avoid cases like this, comming from whisper transcriber: 
                713.92 -> 719.92, 719.92 -> 701.92, 701.92 -> 731.76
                1105.0 -> 1112.52, 1109.52 -> 135.10000000000002, 135.10000000000002 -> 1158.4
                1236.56 -> 1269.5, 1240.5 -> 1260.5 (The first end is wrong)
                '''
                if len(aligned_words) > 0:
                    last_aligned_word = aligned_words[-1]
                else:
                    last_aligned_word = {'end': 0}
                if segment['end'] <= segment['start']:
                    if index == 0:
                        segment_start = 0
                        segment_end = segments[index + 1]['end']
                    elif index == len(segments) - 1:
                        segment_start = last_aligned_word['end']
                        segment_end = self.duration
                    else:
                        segment_start = last_aligned_word['end']
                        segment_end = segments[index + 1]['end']
                else:
                    segment_start = segment['start']
                    segment_end = segment['end'] + 3
                
                if segment['start'] < last_aligned_word['end']:
                    segment_start = last_aligned_word['end']
                    segment_end = segment['end'] + 3

                sf.write(f'{JobPart.TEMP_AUDIO_PATH}/audio_chunk_{index}.wav', y_mono[int(segment_start*16000):int((segment_end)*16000)], 16000)
                try:
                    words = core.aligner.get_alignment(non_numberized_segment_text, f'{JobPart.TEMP_AUDIO_PATH}/audio_chunk_{index}.wav')
                except:
                    '''
                    It is better to have no transcript when it can not be aligned 
                    because many times whisper generates text that does not excist in the audio
                    when the segments are incomplete and are final segments. 
                    '''
                    words = [['no-transcript', 0, segment['end'] - segment['start']]]

                # print(words)

                timed_words = []
                for word in words:
                    timed_words.append({'word': word[0], 'start': round(word[1]+segment_start, 3), 'end': round(word[2]+segment_start, 3)})
                '''
                ----- Do not modify the next segments --------
                Check if last word ends after the start of the next segment.
                (i.e. the alignment fails and aligns with part of the next segment)
                If so, recrease the segment_end by 1 second and try again.
                '''
                if index < len(segments) - 1 and segment['end'] > segment['start']:
                    if timed_words[-1]['end'] > segments[index + 1]['start']:
                        segment_end = segment_end - 1
                        try:
                            sf.write(f'{JobPart.TEMP_AUDIO_PATH}/audio_chunk_{index}.wav', y_mono[int(segment_start*16000):int((segment_end)*16000)], 16000)
                            words = core.aligner.get_alignment(non_numberized_segment_text, f'{JobPart.TEMP_AUDIO_PATH}/audio_chunk_{index}.wav')
                            timed_words = []
                            for word in words:
                                timed_words.append({'word': word[0], 'start': round(word[1]+segment_start, 3), 'end': round(word[2]+segment_start, 3)})
                        except:
                            pass

                    if timed_words[-1]['end'] > segments[index + 1]['start']:
                        segment_end = segment_end - 1
                        try:
                            sf.write(f'{JobPart.TEMP_AUDIO_PATH}/audio_chunk_{index}.wav', y_mono[int(segment_start*16000):int((segment_end)*16000)], 16000)
                            words = core.aligner.get_alignment(non_numberized_segment_text, f'{JobPart.TEMP_AUDIO_PATH}/audio_chunk_{index}.wav')
                            timed_words = []
                            for word in words:
                                timed_words.append({'word': word[0], 'start': round(word[1]+segment_start, 3), 'end': round(word[2]+segment_start, 3)})
                        except:
                            pass
                    if timed_words[-1]['end'] > segments[index + 1]['start']:
                        segment_end = segment_end - 1
                        try:
                            sf.write(f'{JobPart.TEMP_AUDIO_PATH}/audio_chunk_{index}.wav', y_mono[int(segment_start*16000):int((segment_end)*16000)], 16000)
                            words = core.aligner.get_alignment(non_numberized_segment_text, f'{JobPart.TEMP_AUDIO_PATH}/audio_chunk_{index}.wav')
                            timed_words = []
                            for word in words:
                                timed_words.append({'word': word[0], 'start': round(word[1]+segment_start, 3), 'end': round(word[2]+segment_start, 3)})
                        except:
                            pass
                    if timed_words[-1]['end'] > segments[index + 1]['start']:
                        segment_start = last_aligned_word['end']
                        segment_end = segment_end + 3
                        try:
                            sf.write(f'{JobPart.TEMP_AUDIO_PATH}/audio_chunk_{index}.wav', y_mono[int(segment_start*16000):int((segment_end)*16000)], 16000)
                            words = core.aligner.get_alignment(non_numberized_segment_text, f'{JobPart.TEMP_AUDIO_PATH}/audio_chunk_{index}.wav')
                            timed_words = []
                            for word in words:
                                timed_words.append({'word': word[0], 'start': round(word[1]+segment_start, 3), 'end': round(word[2]+segment_start, 3)})
                        except:
                            pass
                        
                    if timed_words[-1]['end'] > segments[index + 1]['start']:
                        num_words = len(timed_words)
                        spoken_time = sum([timed_words[i]['end'] - timed_words[i]['start'] for i in range(len(timed_words)-1)])
                        empty_time = min(segment['end'], segments[index + 1]['start']) - max(segment['start'], last_aligned_word['end']) - spoken_time
                        gap = empty_time/num_words
                        start = segment['start']
                        for word in timed_words:
                            word_lenght = word['end'] - word['start']
                            word['start'] = start
                            word['end'] = start + word_lenght 
                            start = word['end'] + gap

                if len(timed_words) == 1 and timed_words[0]['word'] == 'no-transcript':
                    original_timed_words = [{'word': 'no-transcript', 'start': timed_words[0]['start'], 'end': timed_words[0]['end']}]
                else:
                    original_timed_words = []
                    last_index = 0
                    for index2, words in enumerate(non_numberized_segment):
                        words_list = words.split()
                        num_words_pre_replacement = len(words_list)

                        original_timed_words.append({'word': original_segment[index2], 'start': timed_words[last_index]['start'], 'end': timed_words[last_index + num_words_pre_replacement - 1]['end']})
                        last_index += num_words_pre_replacement

                aligned_words.extend(original_timed_words)

        return aligned_words        
        
    def stamp_start_time(self):
        self.started_at = datetime.now(timezone.utc)
        self.save()

    def stamp_finished_time(self):
        self.finished_at = datetime.now(timezone.utc)
        self.save()

    def stamp_updated_time(self):
        self.updated_at = datetime.now(timezone.utc)
        self.save()

    def set_status(self, status):
        self.status = status
        self.save()

        if status == 'processing':
            self.stamp_start_time()
        
        if status == 'finished':
            self.stamp_finished_time()

    def cleanup(self):
        for file in os.listdir(JobPart.TEMP_AUDIO_PATH):
            os.remove(os.path.join(JobPart.TEMP_AUDIO_PATH, file))

    def order_speakers(self, diarization_segments):
        speakers = [segment['speaker'] for segment in diarization_segments]
        if len(speakers) > 1:
            index = 1
            speaker_ordering = {}
            for speaker in speakers:
                # If the speaker is not in the keys of the speaker_ordering dict, add it:
                if speaker not in speaker_ordering.keys():
                    speaker_ordering[speaker] = f'SPEAKER_{index}'
                    index += 1

            for segment in diarization_segments:
                segment['speaker'] = speaker_ordering[segment['speaker']]

        return diarization_segments

    def diarize(self):
        '''
        Since the visualization_timeout is 7 minutes, giving 2 attempts to the diarization
        means that the job will be finished in 14 minutes (enough to process a 9.33 hours 
        long episode).
        If the instance craches due to memory issues two times, the diarization will be set 
        to a single speaker (SPEAKER_1) by the third attempt. 
        '''
        try:
            if self.status != 'finished' and self.status != 'error':
                self.attempts += 1
                self.save()
                if self.attempts <= 2:
                    self.instance_id = core.env["instance_id"]
                    self.set_status('processing')
                    self.cleanup()
                    self.retrieve_media(self.wav_audio_part_key)

                    self.set_status('diarizing')

                    # Episodes longer than 22000 seconds (6 hours) take risk of crashing by memory issues:
                    if self.duration <= 22000:
                        diarization_segments = core.diarizer.get_diarization(JobPart.TEMP_WAV_AUDIO_FILE_PATH)
                        diarization_segments = self.order_speakers(diarization_segments)
                    else:
                        diarization_segments = [{'start': 0.0, 'end': self.duration, 'speaker': 'SPEAKER_1'}]
                
                else:
                    diarization_segments = [{'start': 0.0, 'end': self.duration, 'speaker': 'SPEAKER_1'}]

                self.diarization_segments = json.dumps(diarization_segments)

                self.save()
                self.cleanup()
                self.set_status('finished')
            else:
                print('==================Job is already finished or has an error.=================')
 
        except Exception as e:
            self.set_status('error')
            self.error = str(e) + ' | ' + traceback.format_exc()
            self.save()

    def transcribe(self):
        try:
            if self.status != 'finished' and self.status != 'error':
                self.instance_id = core.env["instance_id"]
                self.set_status('processing')
                self.cleanup()
                self.retrieve_media(self.wav_audio_part_key)
                y_mono = self.transcode()
                
                self.set_status('transcribing')

                transcript = core.transcriber.get_transcript(audio_path = JobPart.TEMP_WAV_AUDIO_FILE_PATH, model = self.model, language_code = self.language_code)
                segments = []
                for chunk in transcript['chunks']:
                    segment = {'start': chunk['timestamp'][0], 'end': chunk['timestamp'][1], 'text': chunk['text']}
                    segments.append(segment)

                ## DEBUG

                # save segments as json file:
                # with open(f'/home/yoelvis/Google_Drive/Fathom/Whisper/whisper_processing/segments_episode_test_ladies_tangent.json', 'w') as f:
                #     json.dump(segments, f)
                # Open json file:
                # with open(f'/home/yoelvis/Google_Drive/Fathom/Whisper/whisper_processing/segments_episode_test_green.json', 'r') as f:
                #     segments = json.load(f)

                new_segments = self.check_none_timestamp(segments)
                new_segments = self.optimize_segments(new_segments)

                aligned_words = self.aligner(y_mono, new_segments)
                self.aligned_words = json.dumps(aligned_words)
                self.save()

                ## DEBUG
                # compressed_transcript = self.get_compressed_transcript(aligned_words)
                # with open(f'/home/yoelvis/Google_Drive/Fathom/Whisper/whisper_processing/small_compressed_transcript_episode_{self.id}.json', 'w') as f:
                #     json.dump(compressed_transcript, f)

                # await self.final_transcript_format(aligned_words, diarization_segments)

                self.cleanup()
                self.set_status('finished')
            else:
                print('==================Job is already finished or has an error.=================')

        except Exception as e:
            if self.attempts < 2:
                self.attempts += 1
                self.save()
                self.transcribe()
            
            else:
                self.set_status('error')
                self.error = str(e) + ' | ' + traceback.format_exc()
                self.save()

    @staticmethod
    def processing_job_per_instance(instance_id):
        processing_job = JobPart \
                .where('instance_id', '=', instance_id) \
                .where('status', '!=', 'pending') \
                .where('status', '!=', 'finished') \
                .where('status', '!=', 'error') \
                .where_in('model', ['whisper_small', 'whisper_large']) \
                .where('attempts', '<=', 2) \
                .get()

        return processing_job

    # @staticmethod
    # def next_ready_to_process():
    #     next_ready_to_process = JobPart \
    #         .where('status', 'pending') \
    #         .where('attempts', '<=', 2) \
    #         .where_in('model', ['whisper_small', 'whisper_large']) \
    #         .order_by('priority', 'desc') \
    #         .order_by('created_at', 'asc') \
    #         .first()

    #     return next_ready_to_process

    @staticmethod
    def next_ready_to_process():
        pending_parts = JobPart \
            .where('status', 'pending') \
            .where('attempts', '<=', 2) \
            .where_in('model', ['whisper_small', 'whisper_large']) \
            .order_by('priority', 'desc') \
            .order_by('created_at', 'asc') \
            .get()

        next_ready_job = None
        if pending_parts:
            top_priority = pending_parts[0].priority
            # get all different job_ids with priority = top_priority:
            job_ids = []
            for job in pending_parts:
                if job.job_id not in job_ids and job.priority == top_priority:
                    job_ids.append(job.job_id)

            found = False
            for job_id in job_ids:
                if not found:
                    number_of_processing_parts = JobPart \
                        .where('status', '!=', 'pending') \
                        .where('status', '!=', 'finished') \
                        .where('status', '!=', 'error') \
                        .where('attempts', '<=', 2) \
                        .where_in('model', ['whisper_small', 'whisper_large']) \
                        .where('job_id', '=', job_id) \
                        .count()
                    # print(f'number_of_processing_jobs: {number_of_processing_parts}')
                    
                    if number_of_processing_parts < 5:
                        for job in pending_parts:
                            if job.job_id == job_id:
                                next_ready_job = job
                                # If it is still pending:
                                next_ready_job = next_ready_job.fresh()
                                if next_ready_job.status == 'pending':
                                    next_ready_job.set_status('processing')
                                    found = True
                                    break        
            if not found:
                # Get the first pending job:
                next_ready_job = pending_parts[0]
        else:
            next_ready_job = None

        return next_ready_job

    @staticmethod
    def pending_job_ids():
        pending_job_ids = JobPart \
            .where('status', 'pending') \
            .where('attempts', '<=', 2) \
            .where_in('model', ['whisper_small', 'whisper_large']) \
            .lists('id')

        return list(pending_job_ids)
    
    @staticmethod
    def processing_jobs():
        processing_jobs = JobPart \
            .where('status', '!=', 'pending') \
            .where('status', '!=', 'finished') \
            .where('status', '!=', 'error') \
            .where('attempts', '<=', 2) \
            .where_in('model', ['whisper_small', 'whisper_large']) \
            .get()

        if processing_jobs:
            return processing_jobs
        else:
            return []

    @staticmethod
    def revert_job_status(instance_id):
        abandoned_job = JobPart \
            .where('instance_id', '=', instance_id) \
            .where('status', '!=', 'pending') \
            .where('status', '!=', 'finished') \
            .where('status', '!=', 'error') \
            .where_in('model', ['whisper_small', 'whisper_large']) \
            .first()
        if abandoned_job:
            abandoned_job.status = 'pending'
            abandoned_job.instance_id = None
            abandoned_job.save()

    @staticmethod
    def is_instances_idle(instance_id):
        last_processed_job_status = JobPart \
                .where('instance_id', '=', instance_id) \
                .where_in('model', ['whisper_small', 'whisper_large']) \
                .order_by('created_at', 'desc') \
                .first()
        try: 
            if last_processed_job_status.status == 'finished' or last_processed_job_status.status == 'error':
                return True
            else:
                return False
        except:
            # Instance has no jobs yet.
            return True
        
    @staticmethod
    def get_finished_parts(job_id):
        finished_parts = JobPart \
            .where('status', '=', 'finished') \
            .where('job_id', '=', job_id) \
            .order_by('id', 'asc') \
            .get()

        return finished_parts

################### CELERY #################

    @staticmethod
    def need_processing_part_ids(limit=100, excluding=[]):
        job_parts = JobPart \
            .where_not_in('id', excluding) \
            .where('status', 'pending') \
            .where('attempts', '<=', 2) \
            .where_in('model', ['whisper_small', 'whisper_large']) \
            .order_by('created_at', 'asc') \
            .get()
        
        ids = [{'id': job_part.id, 'priority': job_part.priority} for job_part in job_parts]
        
        print(f'needs_processing_ids: {ids}')

        return ids
                

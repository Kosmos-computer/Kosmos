import fathom_asr_core as core
import librosa
import soundfile as sf
from orator import *
from orator.orm import has_one, belongs_to, has_many, has_many_through
from orator import accessor, mutator
import boto3
import os
from datetime import datetime, timezone
import math
import traceback
import json
import whisper
import numpy as np

class Job(Model):
    # ----------------------------------------------------------------------------------------------------------------------------
    # Constants
    # ----------------------------------------------------------------------------------------------------------------------------

    TEMP_AUDIO_PATH = core.env["temp_audio_folder"]
    TEMP_MP3_AUDIO_FILE_PATH = f'{TEMP_AUDIO_PATH}/audio.mp3'
    TEMP_WAV_AUDIO_FILE_PATH = f'{TEMP_AUDIO_PATH}/audio.wav'
    '''
    Diarization takes about 3 mins per hour of audio in accord to the histogram and calculations. Using
    Sliding step of 1s (0.2) it takes 1.5 mins per hour of audio.
    Transcription takes about 7 mins per hour of audio in accord to the histogram:
    For the trancriptions being done in 1.5 mins, each audio segment should last around 770s.

    WISPER-LARGE-V3 (PIPELINE) TAKES HALF OF THE TIME COMPARED WITH WHISPER-SMALL-V2. So:
    For the trancriptions being done in 1.5 mins, each audio segment should last around 770 * 2s
    and each hour of audio will generate 3600/(770*2) = 2.34 ~ 3 job parts.
    '''
    AUDIO_PARTS_LENGTH_IN_SECONDS = None # duration*770/3600 (1500 per hour max)

    whisper_base = whisper.load_model("base").to("cpu")

    languages_using_period = {
        "en": "English",
        'es': 'Spanish',
        'fr': 'French',
        'ru': 'Russian',
        'pt': 'Portuguese',
        'it': 'Italian',
        'de': 'German',
        'id': 'Indonesian',
        'sv': 'Swedish',
        'cs': 'Czech',
        'hu': 'Hungarian',
        'nl': 'Dutch',
        "fi": "Finnish",
        "uk": "Ukrainian",
        "el": "Greek",
        "ms": "Malay",
        "cs": "Czech",
        "ro": "Romanian",
        "da": "Danish",
        "no": "Norwegian",
        "pl": "Polish",
        "ca": "Catalan",
        "fi": "Finnish",
        "uk": "Ukrainian",
        "da": "Danish",
        "hr": "Croatian",
        "bg": "Bulgarian",
        "lt": "Lithuanian",
        "cy": "Welsh",
        "sk": "Slovak",
        "sl": "Slovenian",
        "is": "Icelandic",
        "hy": "Armenian",
        "ka": "Georgian",
        "be": "Belarusian"
    }

    testing_languages = {
        'zh': 'Chinese',
        'hi': 'Hindi',
        'ar': 'Arabic',
        'bn': 'Bengali',
        'ur': 'Urdu',
        'ja': 'Japanese'
    }

    # Concatenate the two dictionaries:
    allowed_languages = {**languages_using_period, **testing_languages}
    # allowed_languages = languages_using_period

    whisper_supported_languages = {
        "en": "English",
        "zh": "Chinese",
        "de": "German",
        "es": "Spanish",
        "ru": "Russian",
        "ko": "Korean",
        "fr": "French",
        "ja": "Japanese",
        "pt": "Portuguese",
        "tr": "Turkish",
        "pl": "Polish",
        "ca": "Catalan",
        "nl": "Dutch",
        "ar": "Arabic",
        "sv": "Swedish",
        "it": "Italian",
        "id": "Indonesian",
        "hi": "Hindi",
        "fi": "Finnish",
        "vi": "Vietnamese",
        "he": "Hebrew",
        "uk": "Ukrainian",
        "el": "Greek",
        "ms": "Malay",
        "cs": "Czech",
        "ro": "Romanian",
        "da": "Danish",
        "hu": "Hungarian",
        "ta": "Tamil",
        "no": "Norwegian",
        "th": "Thai",
        "ur": "Urdu",
        "hr": "Croatian",
        "bg": "Bulgarian",
        "lt": "Lithuanian",
        "la": "Latin",
        "mi": "Maori",
        "ml": "Malayalam",
        "cy": "Welsh",
        "sk": "Slovak",
        "te": "Telugu",
        "fa": "Persian",
        "lv": "Latvian",
        "bn": "Bengali",
        "sr": "Serbian",
        "az": "Azerbaijani",
        "sl": "Slovenian",
        "kn": "Kannada",
        "et": "Estonian",
        "mk": "Macedonian",
        "br": "Breton",
        "eu": "Basque",
        "is": "Icelandic",
        "hy": "Armenian",
        "ne": "Nepali",
        "mn": "Mongolian",
        "bs": "Bosnian",
        "kk": "Kazakh",
        "sq": "Albanian",
        "sw": "Swahili",
        "gl": "Galician",
        "mr": "Marathi",
        "pa": "Punjabi",
        "si": "Sinhala",
        "km": "Khmer",
        "sn": "Shona",
        "yo": "Yoruba",
        "so": "Somali",
        "af": "Afrikaans",
        "oc": "Occitan",
        "ka": "Georgian",
        "be": "Belarusian",
        "tg": "Tajik",
        "sd": "Sindhi",
        "gu": "Gujarati",
        "am": "Amharic",
        "yi": "Yiddish",
        "lo": "Lao",
        "uz": "Uzbek",
        "fo": "Faroese",
        "ht": "Haitian creole",
        "ps": "Pashto",
        "tk": "Turkmen",
        "nn": "Nynorsk",
        "mt": "Maltese",
        "sa": "Sanskrit",
        "lb": "Luxembourgish",
        "my": "Myanmar",
        "bo": "Tibetan",
        "tl": "Tagalog",
        "mg": "Malagasy",
        "as": "Assamese",
        "tt": "Tatar",
        "haw": "Hawaiian",
        "ln": "Lingala",
        "ha": "Hausa",
        "ba": "Bashkir",
        "jw": "Javanese",
        "su": "Sundanese"
        }

    # ----------------------------------------------------------------------------------------------------------------------------
    # Instance Methods
    # ----------------------------------------------------------------------------------------------------------------------------

    def detect_language(self, audio_path):
        audio = whisper.load_audio(audio_path)
        audio = whisper.pad_or_trim(audio)
        mel = whisper.log_mel_spectrogram(audio).to("cpu")
        _, probs = Job.whisper_base.detect_language(mel)

        predicted_language_code = max(probs, key=probs.get)

        ## DEBUG:
        ## Order the probs dict by value and print it:
        # ordered_probs = {k: v for k, v in sorted(probs.items(), key=lambda item: item[1], reverse=True)}
        # for k, v in ordered_probs.items():
        #     print(f'{k}: {v}')
        # print()

        if predicted_language_code != 'en' and predicted_language_code in Job.allowed_languages.keys():
            max_prob = max(probs.values())
            if probs['en']:
                if max_prob > probs['en'] + 0.1:
                    return predicted_language_code
                else:
                    return 'en'
            else:
                return predicted_language_code
        else:
            return 'en'

    def set_language(self):

        if not self.language_code:
            if self.duration >= 120:
                chunck_predicted_language = []
                # Select 4 audio segments of 30 seconds each equally spaced throughout the audio file:
                segments = np.linspace(0, self.duration, 4, endpoint=False)
                for segment in segments:
                    audio_chunk = Job.y_mono[int(segment*16000):int((segment+30)*16000)]
                    sf.write(f'{Job.TEMP_AUDIO_PATH}/sample_for_language_detection.wav', audio_chunk, 16000)
                    audio_path = f'{Job.TEMP_AUDIO_PATH}/sample_for_language_detection.wav'
                    chunck_predicted_language.append(self.detect_language(audio_path))
                    # remove the temporary audio file:
                    os.remove(audio_path)

                # Get the most common language code in the list of predicted languages:
                self.language_code = max(set(chunck_predicted_language), key=chunck_predicted_language.count)
                self.detected_language = True
                self.save()

            else:
                audio_path = Job.TEMP_WAV_AUDIO_FILE_PATH
                self.language_code = self.detect_language(audio_path)
                self.detected_language = True
                self.save()

        else:
            if self.language_code in Job.allowed_languages.keys():
                self.detected_language = False
                self.save()
            else:
                raise ValueError(f'Language "{self.language_code}" is not supported.')

        self = self.fresh()

    def retrieve_media(self):

        # Set the status to 'retrieving_media' at the distributer level:
        # self.set_status('retrieving_media')
        self.s3_bucket = core.env["aws_s3_bucket"]
        self.s3_key = f'{self.guid}/transcript.json'
        self.output_url = f"https://{self.s3_bucket}.s3.amazonaws.com/{self.s3_key}"
        self.save()

        core.audio_processing.download_file(self.media_to_process_url, Job.TEMP_AUDIO_PATH, 'audio.mp3')

        return None

    def transcode(self):
        wav_audio_path = core.audio_processing.mp3_to_wav(Job.TEMP_MP3_AUDIO_FILE_PATH, Job.TEMP_WAV_AUDIO_FILE_PATH)
        s3 = boto3.client('s3', aws_access_key_id=core.env["aws_access_key"], aws_secret_access_key=core.env["aws_access_secret"])
        s3.put_object(Body=open(f'{Job.TEMP_WAV_AUDIO_FILE_PATH}', 'rb'), \
                Bucket=core.env["aws_s3_bucket"], \
                Key=f'{self.guid}/job_id_{self.id}.wav')

        y_mono, sample_rate = librosa.load(f'{Job.TEMP_WAV_AUDIO_FILE_PATH}', sr=None)

        self.duration = math.ceil(len(y_mono)/16000)
        self.save()

        return y_mono

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

        if status == 'retrieving_media':
            self.stamp_start_time()

        if status == 'processing':
            self.stamp_start_time()

        self.stamp_updated_time()

        if status == 'finished':
            self.stamp_finished_time()


    def cleanup(self):
        for file in os.listdir(Job.TEMP_AUDIO_PATH):
            os.remove(os.path.join(Job.TEMP_AUDIO_PATH, file))

    def get_compressed_transcript(self):
        '''
        {'starts': new_starts, 'elements': new_words}
        '''
        _, aligned_words = self.get_stored_data()

        new_words = []
        new_starts = []
        for item in aligned_words:
            new_word = item['word'] + ' '
            new_start = round(item['start'], 2)

            new_words.append(new_word)
            new_starts.append(new_start)

        new_aligned_words = {'starts': new_starts, 'elements': new_words}

        return new_aligned_words

    def get_closest_segment_index(self, item, diarization_segments):
        closest_distance_before = 1000000
        closest_distance_after  = 1000000
        closest_distance_before_index = None
        closest_distance_after_index  = None

        for index, segment in enumerate(diarization_segments):
            if segment['end'] <= item['start']:
                temp_distance_previous = item['start'] - segment['end']
                if temp_distance_previous < closest_distance_before:
                    closest_distance_before = temp_distance_previous
                    closest_distance_before_index = index
            if segment['start'] >= item['end']:
                temp_distance_after = segment['start'] - item['end']
                if temp_distance_after < closest_distance_after:
                    closest_distance_after = temp_distance_after
                    closest_distance_after_index = index

        if closest_distance_before_index == None:
            index = closest_distance_after_index
        elif closest_distance_after_index == None:
            index = closest_distance_before_index
        else:
            if closest_distance_before < closest_distance_after:
                index = closest_distance_before_index
            else:
                index = closest_distance_after_index

        return index

    def get_overlaped_segments(self, item, diarization_segments):

        word_belong_to = []
        for index, segment in enumerate(diarization_segments):
            if item['start'] >= segment['start'] and item['end']   <= segment['end'] or \
                item['end']   >  segment['start'] and item['end']   <= segment['end'] or \
                item['start'] >= segment['start'] and item['start'] <  segment['end'] or \
                item['start'] <  segment['start'] and item['end']   >  segment['end']:

                overlap = min(item['end'], segment['end']) - max(item['start'], segment['start'])

                word_belong_to.append(
                    {
                    'segment_index': index,
                    'segment_length': segment['end'] - segment['start'],
                    'speaker': segment['speaker'],
                    'overlap': overlap,
                    'start': segment['start'],
                    'end': segment['end']
                    }
                )

        return word_belong_to

    def get_speaker(self, item, diarization_segments):

        word_belong_to = self.get_overlaped_segments(item, diarization_segments)

        if word_belong_to:
            if len(word_belong_to) == 1:
                speaker = word_belong_to[0]['speaker']
            else:
                fully_in = []
                for segment in word_belong_to:
                    if item['start'] >= segment['start'] and item['end'] <= segment['end']:
                        fully_in.append(segment)
                if fully_in:
                    if len(fully_in) == 1:
                        speaker = fully_in[0]['speaker']
                    else:
                        speaker = min(fully_in, key=lambda x: x['segment_length'])['speaker']
                else:
                    speaker = max(word_belong_to, key=lambda x: x['overlap'])['speaker']
        else:
            closest_segment_index = self.get_closest_segment_index(item, diarization_segments)
            speaker = diarization_segments[closest_segment_index]['speaker']

        return speaker

    async def add_paragraphs_as_monologues(self, monologues_list):

        new_monologues_list = []
        for monologue in monologues_list:

            speaker = monologue['speaker']

            monologue_num_words = len([x['value'] for x in monologue['elements'] if x['type'] == 'text'])

            if monologue_num_words > 100:
                monologue_paragraphs_object = await self.get_paragraphs_from_monologue(monologue)

                if monologue_paragraphs_object:
                    # monologue_paragraphs_object -> [{'content': paragraph_test, 'start': starts], 'end': ends}, ...]
                    elements_index_start = 0
                    num_elements = len(monologue['elements'])
                    temp_monologues = []
                    for paragraph in monologue_paragraphs_object:
                        paragraph_split = paragraph['content'].split()
                        # Remove any possible ., or ? found alone in the paragraph:
                        paragraph_split = [x for x in paragraph_split if x != ',' or x != '.' or x != '?']
                        paragraph_num_words = len(paragraph_split)
                        counter = 0
                        for i in range(elements_index_start, num_elements):
                            if monologue['elements'][i]['type'] == 'text':
                                counter += 1
                                if counter == paragraph_num_words:
                                    if monologue['elements'][i+1]['value'] == '.' or \
                                        monologue['elements'][i+1]['value'] == ',' or \
                                        monologue['elements'][i+1]['value'] == '?':
                                        # i+3 to get the punctuation and the space after it.
                                        temp_monologues.append({'speaker': speaker, 'elements': monologue['elements'][elements_index_start:i+3]})
                                        elements_index_start = i + 3
                                        break
                                    else:
                                        # i+2 to get the space after the word.
                                        temp_monologues.append({'speaker': speaker, 'elements': monologue['elements'][elements_index_start:i+2]})
                                        elements_index_start = i + 2
                                        break
                    # Checking if all words in monologue have been added to temp_monologues:
                    if monologue['elements'][-1]['value'] == ' ': # i.e. not the last element of the transcript.
                        if elements_index_start < num_elements:
                            temp_monologues[-1]['elements'].extend(monologue['elements'][elements_index_start:])
                    else:
                        if elements_index_start < num_elements + 1:
                            temp_monologues[-1]['elements'].extend(monologue['elements'][elements_index_start:])

                    # Double-Checking if the number of words in monologue is equal to the sum of the words in temp_monologues:
                    temp_monologues_num_words = 0
                    for temp_monologue_element in temp_monologues:
                        temp_monologues_num_words += len([x['value'] for x in temp_monologue_element['elements'] if x['type'] == 'text'])

                    if temp_monologues_num_words == monologue_num_words:
                        new_monologues = temp_monologues

                    else:
                        new_monologues = [monologue]

                else:
                    new_monologues = [monologue]

            else:
                new_monologues = [monologue]

            new_monologues_list.extend(new_monologues)

        return new_monologues_list

    async def get_paragraphs_from_monologue(self, monologue):

        monologue_sentences_object = core.text.get_sentences({'monologues': [monologue]})
        if len(monologue_sentences_object) > 0:
            monologue_paragraphs_object = await core.text.get_paragraphs(monologue_sentences_object)
            if len(monologue_paragraphs_object) > 0:
                return monologue_paragraphs_object
            else:
                return None
        else:
            return None

    def add_aligned_word(self, aligned_word):

        new_elements = []
        if aligned_word['word'][-1] == '.' or aligned_word['word'][-1] == ',' or aligned_word['word'][-1] == '?':
            new_elements.append({"type": "text", "value": aligned_word["word"][:-1], "ts": aligned_word["start"], "end_ts": aligned_word["end"], "confidence": 0.965})
            new_elements.append({"type": "punct", "value": aligned_word["word"][-1]})
            new_elements.append({"type": "punct", "value": " "})
        else:
            new_elements.append({"type": "text", "value": aligned_word["word"], "ts": aligned_word["start"], "end_ts": aligned_word["end"], "confidence": 0.965})
            new_elements.append({"type": "punct", "value": " "})

        return new_elements

    def cleanup_s3(self):
        # Delete all .wav files from S3:
        s3 = boto3.client('s3', aws_access_key_id=core.env["aws_access_key"], aws_secret_access_key=core.env["aws_access_secret"])
        for file in s3.list_objects(Bucket=f'{core.env["aws_s3_bucket"]}', Prefix=f'{self.guid}/')['Contents']:
            if '.wav' in file['Key']:
                s3.delete_object(Bucket=f'{core.env["aws_s3_bucket"]}', Key=file['Key'])

    def get_stored_data(self):

        job_parts = core.data_models.JobPart.get_finished_parts(self.id)

        aligned_words = []
        wav_audio_part_key = []  # To avoid adding the same job_part in the rare case that 2+ distributers worked on the same job.
        for job_part in job_parts:
            if job_part.wav_audio_part_key not in wav_audio_part_key:
                if job_part.task == 'transcription':
                    for word in job_part.aligned_words:
                        aligned_words.append({'word': word['word'], 'start': word['start'] + job_part.segment_start, 'end': word['end'] + job_part.segment_start})

                elif job_part.task == 'diarization':
                    diarization_segments = job_part.diarization_segments

                wav_audio_part_key.append(job_part.wav_audio_part_key)

        return diarization_segments, aligned_words

    def clean_up_stored_data(self):
        '''
        Delete temporar data from JopParts DB and
        Delete all temporar .wav files from S3
        '''
        job_parts = core.data_models.JobPart.get_finished_parts(self.id)
        for job_part in job_parts:
            if job_part.task == 'transcription':
                job_part.aligned_words = None
                job_part.save()
            elif job_part.task == 'diarization':
                job_part.diarization_segments = None
                job_part.save()

        self.cleanup_s3()

    def merge_same_speakers(self, monologues_list):
        '''
        If two subsequent monologues have the same speaker, they are merged if the resulting monologue has less than 100 words:
        '''
        new_monologues_list = []
        for index, monologue in enumerate(monologues_list):
            if index > 0:
                if monologue['speaker'] == new_monologues_list[-1]['speaker'] and \
                    len([x['value'] for x in monologue['elements'] if x['type'] == 'text']) + \
                    len([x['value'] for x in new_monologues_list[-1]['elements'] if x['type'] == 'text']) <= 100:
                    new_monologues_list[-1]['elements'].extend(monologue['elements'])
                else:
                    new_monologues_list.append(monologue)
            else:
                new_monologues_list.append(monologue)

        return new_monologues_list

    def is_end_of_sentence(self, elements):
        """
        Get the last element value different from ' '
        """
        # Get the last value different from ' ':
        for element in reversed(elements):
            if element['value'] != ' ':
                last_element_value = element['value']
                break
        # Check if the last value is a punctuation:
        if last_element_value == '.' or last_element_value == '?':
            return True
        else:
            return False

    def get_last_chunk_of_sentence_elements(self, elements):
        """
        Get the last sentence of the monologue. It contains the last empty space.
        """
        last_chunk_of_sentence_elements = []
        for element in reversed(elements):
            if element['value'] != '.' and element['value'] != '?':
                last_chunk_of_sentence_elements.append(element)
            else:
                break
        # reverse the list to get the elements in the correct order:
        last_chunk_of_sentence_elements.reverse()
        last_chunk_of_sentence_elements = last_chunk_of_sentence_elements[1:] if last_chunk_of_sentence_elements[0]['value'] == ' ' else last_chunk_of_sentence_elements

        return last_chunk_of_sentence_elements

    def get_next_first_chunk_of_sentence_elements(self, elements):
        """
        Get the first sentence of the monologue. It contains the last empty space.
        """
        first_chunk_of_sentence_elements = []
        for element in elements:
            if element['value'] != '.' and element['value'] != '?':
                first_chunk_of_sentence_elements.append(element)

            else:
                first_chunk_of_sentence_elements.append(element)
                first_chunk_of_sentence_elements.append({'type': 'punct', 'value': ' '})
                break

        return first_chunk_of_sentence_elements


    def fix_incomplete_end_of_monologues(self, monologues_list):
        '''
        If a monologue ends with an incomplete sentence, it is merged with its larger complement.
        '''
        new_monologues_list = []
        next_monologue_elements = [0,[]]
        for index, monologue in enumerate(monologues_list):
            if next_monologue_elements[0] == 1:
                extended_monologue_elements = next_monologue_elements[1] + monologue['elements']
                monologue['elements'] = extended_monologue_elements
            if next_monologue_elements[0] == -1:
                monologue['elements'] = monologue['elements'][len(next_monologue_elements[1]):]

            if index < len(monologues_list) - 1:
                if len(monologue['elements']) > 0:
                    if self.is_end_of_sentence(monologue['elements']):
                        new_monologues_list.append(monologue)
                        next_monologue_elements = [0, []]
                    else:
                        last_chunk_of_sentence_elements = self.get_last_chunk_of_sentence_elements(monologue['elements'])
                        next_first_chunk_of_sentence_elements = self.get_next_first_chunk_of_sentence_elements(monologues_list[index+1]['elements'])
                        '''
                        If the number of words in last_chunk_of_sentence_elements is less than the
                        number of words in next_first_chunk_of_sentence_elements,
                        it is merged with the next monologue
                        else
                        Merged the next next_first_chunk_of_sentence_elements with this monologue:
                        '''
                        if len([x['value'] for x in last_chunk_of_sentence_elements if x['type'] == 'text']) < len([x['value'] for x in next_first_chunk_of_sentence_elements if x['type'] == 'text']):
                            monologue['elements'] = monologue['elements'][:-len(last_chunk_of_sentence_elements)]
                            new_monologues_list.append(monologue)
                            next_monologue_elements = [1, last_chunk_of_sentence_elements]
                        else:

                            monologue['elements'].extend(next_first_chunk_of_sentence_elements)
                            new_monologues_list.append(monologue)
                            next_monologue_elements = [-1, next_first_chunk_of_sentence_elements]
                else:
                    next_monologue_elements = [0, []]

            else:
                if len(monologue['elements']) > 0:
                    new_monologues_list.append(monologue)

        # Remove empty monologues:
        new_monologues_list = [x for x in new_monologues_list if len(x['elements']) > 0]
        new_monologues_list = self.merge_same_speakers(new_monologues_list)

        return new_monologues_list

    def remove_fake_speakers(self, monologues_list):
        # Get the total time of each speaker::
        time_per_speaker = {}
        total_time = 0
        for monologue in monologues_list:
            speaker = monologue['speaker']
            if speaker not in time_per_speaker:
                time_per_speaker[speaker] = 0
            for element in monologue['elements']:
                if element['type'] == 'text':
                    time_per_speaker[speaker] += element['end_ts'] - element['ts']
                    total_time += element['end_ts'] - element['ts']

        # Find fake speakers if speaker time is less than 1% of total time:
        fake_speakers = []
        for speaker in time_per_speaker:
            if time_per_speaker[speaker]/total_time < 0.01:
                fake_speakers.append(speaker)

        # If a monologue has a fake speaker with less than 10 words, it is merged with the previous monologue:
        new_monologues_list = []
        for index, monologue in enumerate(monologues_list):
            if index > 0:
                if monologue['speaker'] in fake_speakers and len([x['value'] for x in monologue['elements'] if x['type'] == 'text']) <= 10:
                    new_monologues_list[-1]['elements'].extend(monologue['elements'])
                else:
                    new_monologues_list.append(monologue)
            else:
                new_monologues_list.append(monologue)

        # Remove empty monologues:
        new_monologues_list = [x for x in new_monologues_list if len(x['elements']) > 0]
        new_monologues_list = self.merge_same_speakers(new_monologues_list)

        ## DEBUG
        # for monologue in new_monologues_list:
        #     # if monologue['speaker'] in fake_speakers:
        #     print(monologue['speaker'])
        #     context = ''
        #     for element in monologue['elements']:
        #         context += element['value']
        #     print(context)
        #     # print(monologue['elements'])
        #     print('=======================')

        # speakers = []
        # for monologue in new_monologues_list:
        #     if monologue['speaker'] not in speakers:
        #         speakers.append(monologue['speaker'])

        # print(speakers)

        return new_monologues_list

    def fix_capitalization_after_added_punctuations(self, context, context_with_punctuations):
        context_list = context.split()
        context_with_punctuations_list = context_with_punctuations.split()
        # If number of commas in context_with_punctuations is different from the number of commas in context:
        if context.count(',') != context_with_punctuations.count(',') and len(context_list) == len(context_with_punctuations_list):
            for element_index in range(len(context_list) - 1):
                if context_with_punctuations_list[element_index][-1] == ',' and context[element_index][-1] != ',':
                    # turn the next element of context_with_punctuations into lowercase:
                    context_with_punctuations_list[element_index + 1] = context_with_punctuations_list[element_index + 1].lower()

        # If number of periods in context_with_punctuations is different from the number of commas in context:
        if context.count('.') != context_with_punctuations.count('.') and len(context_with_punctuations.split()) == len(context.split()):
            for element_index in range(len(context_list) - 1):
                if context_with_punctuations_list[element_index][-1] == '.' and context[element_index][-1] != '.':
                    # turn the next element of context_with_punctuations into lowercase:
                    context_with_punctuations_list[element_index + 1] = context_with_punctuations_list[element_index + 1].capitalize()

        return ' '.join(context_with_punctuations_list)

    def check_for_punctuations(self, monologues_list):
        monologues_list_with_punctuations = []
        for index, monologue in enumerate(monologues_list):
            if len(monologue['elements']) > 0:
                context = ''
                for element in monologue['elements']:
                    context += element['value']

                context_with_punctuations = core.punctuation_fixer.fix_punctuations(context)

                # if next monologue start with capital letter, add a dot at the end of the previous monologue:
                if index < len(monologues_list) - 1:
                    if context_with_punctuations[-1] == '.' and not monologues_list[index+1]['elements'][0]['value'][0].isupper():
                        context_with_punctuations = context_with_punctuations[:-1]

                context_with_punctuations = context_with_punctuations.replace('- ', ' ')
                context_with_punctuations = context_with_punctuations.replace(':', '')
                context_with_punctuations = context_with_punctuations.replace('..', '.')
                context_with_punctuations = context_with_punctuations.replace(',,', ',')
                context_with_punctuations = context_with_punctuations.replace('??', '?')

                context_with_punctuations = self.fix_capitalization_after_added_punctuations(context, context_with_punctuations)

                new_elements = []
                starts = [element['ts'] for element in monologue['elements'] if element['type'] == 'text']
                ends = [element['end_ts'] for element in monologue['elements'] if element['type'] == 'text']
                for word_index, word in enumerate(context_with_punctuations.split()):
                    if word[-1] == '.' or word[-1] == ',' or word[-1] == '?':
                        new_elements.append({"type": "text", "value": word[:-1], "ts": starts[word_index], "end_ts": ends[word_index], "confidence": 0.965})
                        new_elements.append({"type": "punct", "value": word[-1]})
                        new_elements.append({"type": "punct", "value": " "})
                    else:
                        new_elements.append({"type": "text", "value": word, "ts": starts[word_index], "end_ts": ends[word_index], "confidence": 0.965})
                        new_elements.append({"type": "punct", "value": " "})

                monologues_list_with_punctuations.append({'speaker': monologue['speaker'], 'elements': new_elements})

        return monologues_list_with_punctuations

    def fix_bad_capitalization(self, monologues_list):
        for monologue in monologues_list:
            if len(monologue['elements']) > 0:
                for index, element in enumerate(monologue['elements']):

                    if element['value'] == 'i':
                        element['value'] = 'I'

                    elif element['value'] == "i'm":
                        element['value'] = "I'm"

                    elif element['value'] == "i'll":
                        element['value'] = "I'll"

                    elif element['value'] == "i've":
                        element['value'] = "I've"

                    elif element['value'] == "i'd":
                        element['value'] = "I'd"

                    else:
                        if index >= 2:
                            if element['value'] == 'And' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'and'

                            elif element['value'] == 'The' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'the'

                            elif element['value'] == 'You' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'you'

                            elif element['value'] == "We're" and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = "we're"

                            elif element['value'] == "We" and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = "we"

                            elif element['value'] == "They're" and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = "they're"

                            elif element['value'] == "They" and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = "they"

                            elif element['value'] == "It's" and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = "it's"

                            elif element['value'] == "It" and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = "it"

                            elif element['value'] == "He's" and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = "he's"

                            elif element['value'] == "He" and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = "he"

                            elif element['value'] == "She's" and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = "she's"

                            elif element['value'] == "She" and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = "she"

                            elif element['value'] == "That's" and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = "that's"

                            elif element['value'] == "That" and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = "that"

                            elif element['value'] == "There's" and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = "there's"

                            elif element['value'] == 'There' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'there'

                            elif element['value'] == "Here's" and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = "here's"

                            elif element['value'] == "Let's" and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = "let's"

                            elif element['value'] == "What's" and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = "what's"

                            elif element['value'] == "What" and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = "what"

                            elif element['value'] == "Who's" and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = "who's"

                            elif element['value'] == "Who" and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = "who"

                            elif element['value'] == 'Oh' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'oh'

                            elif element['value'] == 'Or' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'or'

                            elif element['value'] == 'No' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'no'

                            elif element['value'] == 'But' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'but'

                            elif element['value'] == 'Being' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'being'

                            elif element['value'] == 'So' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'so'

                            elif element['value'] == 'By' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'by'

                            elif element['value'] == 'Yeah' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'yeah'

                            elif element['value'] == 'My' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'my'

                            elif element['value'] == 'Hey' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'hey'

                            elif element['value'] == 'Which' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'which'

                            elif element['value'] == 'How' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'how'

                            elif element['value'] == 'Why' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'why'

                            elif element['value'] == 'When' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'when'

                            elif element['value'] == 'Where' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'when'

                            elif element['value'] == 'Man' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'man'

                            elif element['value'] == 'Your' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'your'

                            elif element['value'] == 'Have' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'have'

                            elif element['value'] == 'Has' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'has'

                            elif element['value'] == 'Had' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'had'

                            elif element['value'] == 'As' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'as'

                            elif element['value'] == 'This' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'this'

                            elif element['value'] == 'That' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'that'

                            elif element['value'] == 'Those' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'those'

                            elif element['value'] == 'These' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'these'

                            elif element['value'] == 'Them' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'them'

                            elif element['value'] == 'Their' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'their'

                            elif element['value'] == 'There' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'there'

                            elif element['value'] == 'Here' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'here'

                            elif element['value'] == 'Yes' and monologue['elements'][index-2]['value'] != '.' and monologue['elements'][index-2]['value'] != '?':
                                element['value'] = 'yes'

                        if index < len(monologue['elements']) - 2:
                            if element['value'] == '.':
                                if monologue['elements'][index+2]['type'] == 'text':
                                    monologue['elements'][index+2]['value'] = monologue['elements'][index+2]['value'].capitalize()

                            elif element['value'] == '?':
                                if monologue['elements'][index+2]['type'] == 'text':
                                    monologue['elements'][index+2]['value'] = monologue['elements'][index+2]['value'].capitalize()

        return monologues_list

    async def assemble(self):
        try:
            if self.status == 'finished_parts':
                '''
                Rev ai format with the following considerations:
                - Monologues with more than 100 words are split into paragraphs.
                - Each paragraph is a monologue with the same speaker.
                '''
                self.set_status('assembling')
                # diarization_segments = self.diarization_segments
                diarization_segments, aligned_words = self.get_stored_data()

                monologues_list = []
                previous_speaker = ''
                elements = []
                for index, aligned_word in enumerate(aligned_words):
                    speaker = self.get_speaker(aligned_word, diarization_segments)
                    if speaker != previous_speaker:
                        if index != 0: # and index != len(aligned_words) - 1:

                            previous_speaker_index = int(previous_speaker.split("_")[-1])
                            monologue = {"speaker": previous_speaker_index, "elements": elements}
                            monologues_list.append(monologue)
                            # new_monologues = await self.add_paragraphs_as_monologues(monologue)
                            # monologues_list.extend(new_monologues)

                        elements = []
                        new_elements = self.add_aligned_word(aligned_word)
                        elements.extend(new_elements)
                        previous_speaker = speaker

                    else:
                        new_elements = self.add_aligned_word(aligned_word)
                        elements.extend(new_elements)

                    if index == len(aligned_words) - 1:
                        previous_speaker_index = int(previous_speaker.split("_")[-1])
                        monologue = {"speaker": previous_speaker_index, "elements": elements[:-1]}
                        monologues_list.append(monologue)
                        # new_monologues = await self.add_paragraphs_as_monologues(monologue)
                        # monologues_list.extend(new_monologues)

                if self.language_code in Job.languages_using_period.keys():
                    # TODO: Punctuations needs to be improved
                    # There is an assert in deepmultilingualpunctuation/punctuationmodel.py", line 49
                    # that can fail sometimes for some non-english languages.
                    try:
                        monologues_list = self.check_for_punctuations(monologues_list)
                        # print('.....................................')
                        # print('Punctuations added.')
                    except:
                        # print('.....................................')
                        # print('Punctuations not added.')
                        pass

                    monologues_list = self.fix_incomplete_end_of_monologues(monologues_list)
                    monologues_list = self.remove_fake_speakers(monologues_list)
                    monologues_list = self.fix_incomplete_end_of_monologues(monologues_list)
                    monologues_list = self.remove_fake_speakers(monologues_list)

                    if self.language_code == 'en':
                        monologues_list = self.fix_bad_capitalization(monologues_list)

                    monologues_list = await self.add_paragraphs_as_monologues(monologues_list)

                elif self.language_code in Job.testing_languages.keys():
                    '''
                    Characters than can be used to split the monologues by sentences later if needed.
                    - Chinese:
                        了, 呢, 吧, 哦, 啊,  啦, 呀, 嗎/吗, 囉 and 嘅 followed by empty space.
                    - Urdu:
                        ۔ and ؟ followed by empty space.
                    '''
                    monologues_list = self.remove_fake_speakers(monologues_list)

                # #DEBUG
                # for monologue in monologues_list:
                #     context = ''
                #     for element in monologue['elements']:
                #         context += element['value']
                #     print(f"Speaker: {monologue['speaker']}")
                #     print(context)
                #     print('=======================')

                monologues = {'language': {'code': self.language_code}, "monologues": monologues_list}
                monologues_json = json.dumps(monologues)
                # print(monologues)

                s3 = boto3.client('s3', aws_access_key_id=core.env["aws_access_key"], aws_secret_access_key=core.env["aws_access_secret"])
                s3.put_object(Body=monologues_json, Bucket=f'{core.env["aws_s3_bucket"]}', Key=self.s3_key)

                self.set_status('finished')
            else:
                print('==================Job is already assembled or has an error.=================')

        except Exception as e:
            self.set_status('error')
            self.error = str(e) + ' | ' + traceback.format_exc()
            self.save()

        else:
            self.clean_up_stored_data()

    def check_audio_parts_lenghts(self, audio_parts):
        '''
        If one audio part is less than - seconds, it is merged with the previous audio part:
        '''
        new_audio_parts = []
        new_index = 0

        for index, audio_part in enumerate(audio_parts):
            if index > 0:
                if (audio_part['end'] - audio_part['start'])/16000 < Job.AUDIO_PARTS_LENGTH_IN_SECONDS/4:
                    new_audio_parts[new_index-1]['end'] = audio_part['end']
                else:
                    new_audio_parts.append(audio_part)
                    new_index += 1
            else:
                new_audio_parts.append(audio_part)
                new_index += 1

        # If the first audio part is less than 30 seconds, it is merged with the second audio part:
        if (new_audio_parts[0]['end'] - new_audio_parts[0]['start'])/16000 < Job.AUDIO_PARTS_LENGTH_IN_SECONDS/4:
            new_audio_parts[1]['start'] = new_audio_parts[0]['start']
            new_audio_parts.pop(0)

        return new_audio_parts

    def store_audio_part(self, wav_audio_part_key, segment_start, task, duration = None):

        started_at = datetime.now(timezone.utc)

        job_part = core.data_models.JobPart()
        job_part.job_id = self.id
        job_part.wav_audio_part_key = wav_audio_part_key
        job_part.duration = duration
        job_part.status = 'pending'
        job_part.error = None
        job_part.created_at = started_at
        job_part.started_at = None
        job_part.updated_at = None
        job_part.finished_at = None
        job_part.instance_id = None
        job_part.task = task
        job_part.last_heartbeat = None
        if task == 'diarization':
            job_part.attempts = 0
        else:
            job_part.attempts = 1
        job_part.model = self.model
        job_part.priority = self.priority
        job_part.segment_start = segment_start
        job_part.language_code = self.language_code
        job_part.save()

    def distribute(self):
        try:
            if self.status == 'pending':
                self.set_status('retrieving_media')
                self.cleanup()
                self.retrieve_media()
                Job.y_mono = self.transcode()

                self.set_status('distributing')

                self.set_language()

                # Creating diarization job part:
                wav_audio_part_key = f'{self.guid}/job_id_{self.id}.wav'
                self.store_audio_part(wav_audio_part_key, segment_start = None, task = 'diarization', duration = self.duration)

                # segments can not be longer than 15000 seconds to avoid memory issues.
                # See comments at the beguining for duration*770/3600.
                Job.AUDIO_PARTS_LENGTH_IN_SECONDS = max(300, min(self.duration*770*2/3600, 15000))

                s3 = boto3.client('s3', aws_access_key_id=core.env["aws_access_key"], aws_secret_access_key=core.env["aws_access_secret"])
                if self.duration >= Job.AUDIO_PARTS_LENGTH_IN_SECONDS:
                    # This following line requires at least 16GB of RAM for large episodes (e.g. 7 hour long):
                    non_silent_intervals = core.audio_processing.get_non_silent_intervals(Job.y_mono, Job.AUDIO_PARTS_LENGTH_IN_SECONDS)
                    silent_intervals = core.audio_processing.get_silent_intervals(non_silent_intervals, Job.y_mono)
                    audio_parts = core.audio_processing.get_audio_parts(Job.y_mono, silent_intervals, non_silent_intervals, Job.AUDIO_PARTS_LENGTH_IN_SECONDS)

                    audio_parts = self.check_audio_parts_lenghts(audio_parts)

                    for index, audio_part in enumerate(audio_parts):
                        sf.write(f'{Job.TEMP_AUDIO_PATH}/job_id_{self.id}_part_{index}.wav', Job.y_mono[audio_part['start']:audio_part['end']], 16000)

                        s3.put_object(Body=open(f'{Job.TEMP_AUDIO_PATH}/job_id_{self.id}_part_{index}.wav', 'rb'), \
                                        Bucket=core.env["aws_s3_bucket"], \
                                        Key=f'{self.guid}/job_id_{self.id}_part_{index}.wav')

                        segment_start =  round(audio_part['start']/16000, 3)
                        wav_audio_part_key = f'{self.guid}/job_id_{self.id}_part_{index}.wav'
                        self.store_audio_part(wav_audio_part_key, segment_start = segment_start, task = 'transcription', duration = None)
                else:
                    sf.write(f'{Job.TEMP_AUDIO_PATH}/job_id_{self.id}_part_0.wav', Job.y_mono[:], 16000)
                    s3.put_object(Body=open(f'{Job.TEMP_AUDIO_PATH}/job_id_{self.id}_part_0.wav', 'rb'), \
                                        Bucket=core.env["aws_s3_bucket"], \
                                        Key=f'{self.guid}/job_id_{self.id}_part_0.wav')

                    segment_start =  0.0
                    wav_audio_part_key = f'{self.guid}/job_id_{self.id}_part_0.wav'
                    self.store_audio_part(wav_audio_part_key, segment_start = segment_start, task = 'transcription', duration = None)

                self.cleanup()
                self.set_status('distributed')
            else:
                print('==================Job is already finished or has an error.=================')

        except Exception as e:
            self.set_status('error')
            self.error = str(e) + ' | ' + traceback.format_exc()
            self.save()

    def update_status(self):

        job_parts = core.data_models.JobPart \
            .where('job_id', self.id) \
            .get()

        # if all job parts are finished, set the job to finished:
        if job_parts:
            all_finished = True
            for job_part in job_parts:
                if job_part.status != 'finished':
                    all_finished = False

                if job_part.status == 'error':
                    # If any job part has "CUDA out of memory." in the error column,
                    # terminate instance and revert status:
                    if 'CUDA out of memory.' in job_part.error:
                        instance_id = job_part.instance_id
                        core.aws_boto3.terminate_instance(instance_id)
                        core.log.info(f'Instance {instance_id} terminated due to CUDA out of memory.')
                        core.data_models.JobPart.where('job_id', self.id).delete()
                        self.set_status('pending')

                    else:
                        self.set_status('error')
                        self.error = 'One or more parts failed'
                        self.save()
                    break

            self = self.fresh()
            if self.status == 'finished' or self.status == 'error':
                self.clean_up_stored_data()

            elif all_finished and self.status != 'finished_parts':
                self.set_status('finished_parts')

    # def update_status(self):
    #     job_parts = core.data_models.JobPart \
    #         .where('job_id', self.id) \
    #         .where('status', '!=', 'finished') \
    #         .get()

    #     self = self.fresh()
    #     if not job_parts and self.status != 'finished_parts' and self.status != 'finished' and self.status != 'error':
    #         self.set_status('finished_parts')

    #     if self.status == 'finished' or self.status == 'error':
    #         self.clean_up_stored_data()

    #     # if any part is error, set the job to error
    #     job_parts = core.data_models.JobPart \
    #         .where('job_id', self.id) \
    #         .where('status', 'error') \
    #         .get()
    #     if job_parts:
    #         self.set_status('error')
    #         self.error = 'One or more parts failed'
    #         self.save()

################### USED BY COORDINATOR #################

    @staticmethod
    def pending_jobs_durations():
        durations = Job \
            .where_not_null('duration') \
            .where_in('model', ['whisper_small', 'whisper_large']) \
            .where('status', '!=', 'finished') \
            .where('status', '!=', 'error') \
            .where('status', '!=', 'finished_parts') \
            .where('priority', '>=', 3 ) \
            .lists('duration')

        return durations

    @staticmethod
    def count_created_jobs(start_datetime, end_datetime):
        num_created_jobs = Job \
            .where_not_null('created_at') \
            .where_in('model', ['whisper_small', 'whisper_large']) \
            .where('created_at', '>=', start_datetime) \
            .where('created_at', '<', end_datetime) \
            .where('priority', '>=', 3 ) \
            .count()

        return num_created_jobs

################### USED BY ORCHESTRATOR #################

    @staticmethod
    def need_distributing_ids(limit=100, excluding=[]):
        jobs = Job \
            .where_not_in('id', excluding) \
            .where('status', 'pending') \
            .where('priority', '>=', 1 ) \
            .where_in('model', ['whisper_small', 'whisper_large']) \
            .order_by('created_at', 'asc') \
            .get()

        ids = [{'id': job.id, 'priority': job.priority} for job in jobs]

        return ids

    @staticmethod
    def next_finished_job_ids(limit=100, excluding=[]):
        jobs = Job \
            .where_not_in('id', excluding) \
            .where('status', 'finished_parts') \
            .where_in('model', ['whisper_small', 'whisper_large']) \
            .order_by('created_at', 'asc') \
            .get()

        ids = [{'id': job.id, 'priority': job.priority} for job in jobs]

        return ids

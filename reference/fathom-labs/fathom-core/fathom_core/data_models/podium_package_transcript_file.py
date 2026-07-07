import fathom_core as core
from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through
from orator import accessor, mutator
import requests
import json
import orjson
import numpy as np
import re
import boto3
from botocore.errorfactory import ClientError

class PodiumPackageTranscriptFile(Model):

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

    __appends__ = ['content']

    @accessor
    def content(self):
        return self.get_raw_attribute('content')

    @content.mutator
    def set_content(self, value):
        self.set_raw_attribute('content', value)

    @belongs_to
    def podium_package_audio_file(self):
        return PodiumPackageAudioFile

    @belongs_to
    def podium_package(self):
        return PodiumPackage

    @has_many
    def paragraphs(self):
        return ( 
            PodiumPackageParagraph \
            .order_by('start', 'asc')
        )

    @has_many
    def speakers(self):
        return ( 
            PodiumPackageTranscriptFileSpeaker \
            .order_by('created_at', 'asc')
        )

    def url(self):
        #if self.source == 'deepgram':
        #    return f"https://{self.s3_bucket}.s3.amazonaws.com/{self.s3_key}_reformatted"
        #else:
        return f"https://{self.s3_bucket}.s3.amazonaws.com/{self.s3_key}"

    def load_content(self, timeout=10, compress=True):
        if not self.has_loaded_content() and self.can_load_content():
            print(f"Loading content for {self.id} from {self.url()}")
            self.content = json.loads(requests.get(self.url(), timeout=timeout).content)
                                    
            if compress:
                self.set_compressed_transcript()

    def has_loaded_content(self):
        return 'content' in self._attributes and self.content is not None
    
    def can_load_content(self):
        return 's3_key' in self._attributes and self.s3_key is not None

    def load_content_from_file(self, filepath):
        self.content = json.load(open(filepath))

    def set_compressed_transcript(self, force_reload = False):
        if 'compressed_transcript' not in self._attributes or self.compressed_transcript is None or force_reload:
            self.load_content(compress=False)
            if not self.has_loaded_content():
                return

            elements = []
            starts = []

            last_start = 0
            for monologue in self.content['monologues']:
                for element in monologue['elements']:
                    elements.append(element['value'])
                    if 'start' in element:
                        starts.append(element['start'])
                        last_start = element['start']
                    else:
                        starts.append(last_start)

            formatted_elements = []
            formatted_starts = []

            for index, element in enumerate(elements):
                if element == ' ' and index > 0 and len(formatted_elements) > 0:
                    formatted_elements[len(formatted_elements)-2] += ' '
                else:
                    formatted_elements.append(element)
                    formatted_starts.append(starts[index])

            transcript = {
                'elements': formatted_elements,
                'starts': formatted_starts          
            }

            self.compressed_transcript = json.dumps(transcript)

    def display_for_reading(self):
        for sentence in self.get_sentences():
            print(sentence['content'])

    def get_number_of_speakers(self):
        self.load_content(compress=False)
        
        speakers = []
        for monologue in self.content['monologues']:
            if monologue['speaker_id'] not in speakers:
                speakers.append(monologue['speaker_id'])

        return len(speakers)
    
    def get_content_with_speaker_names(self):
        self.load_content(compress=False)

        speaker_lookup = self.get_speaker_lookup()

        for monologue in self.content['monologues']:
            monologue['speaker_name'] = speaker_lookup[monologue['speaker_id']]

        return self.content

    def get_speaker_lookup(self):
        speaker_lookup = {}
        for speaker in self.speakers:
            speaker_lookup[speaker.guid] = speaker.get_display_name()
        
        return speaker_lookup

    @staticmethod
    def reformat_deepgram_transcript(content):
        formatted_content = {
            "monologues": []
        }

        space_punct = {"type":"punct","value":" "}
        punctuation_marks = ['.', '?', '!', ',']

        last_speaker = None
        for word in content['results']['channels'][0]['alternatives'][0]['words']:
            if last_speaker is None or last_speaker != word['speaker']:
                formatted_content['monologues'].append({
                    'speaker': word['speaker'] + 1,
                    'elements': []
                })

                last_speaker = word['speaker']

            value = word['punctuated_word']
            punctuation = word['punctuated_word'][len(word['word']):]

            if punctuation in punctuation_marks:
                value = word['punctuated_word'][:len(word['word'])]

            formatted_word = {
                'type': 'text',
                'value': value,
                'ts': word['start'],
                'end_ts': word['end'],
                'confidence': word['confidence']
            }

            formatted_content['monologues'][-1]['elements'].append(formatted_word)

            if punctuation in punctuation_marks:
                formatted_punctuation = {
                    'type': 'punct',
                    'value': punctuation,
                }

                formatted_content['monologues'][-1]['elements'].append(formatted_punctuation)

            formatted_content['monologues'][-1]['elements'].append(space_punct)

        return formatted_content

    #async def ingest_for_search(self):
    async def get_search_formatted_segments(self):
        segments = self.get_segments()
        elasticsearch_segments = []
        core.log.info(f"Processing {len(segments)} segments for podium package {self.podium_package.guid}")

        for segment in segments:
            del segment['word_element_sentences']
            del segment['corpus_sentences']

            start, end = PodiumPackageTranscriptFile.get_segment_start_end(segment)
            segment['start'] = start
            segment['end'] = end

            segment['podium_package_id'] = self.podium_package.guid
            segment['content_fingerprint'] = core.text.get_fingerprint(segment['content'])

            segment['embedding_vector'] = await core.inference.text_embedding_vector(segment['content'])
            if len(segment['embedding_vector']) > 0:
                segment['embedding_vector_fingerprint'] = core.vector.get_fingerprint(segment['embedding_vector'])
                elasticsearch_segments.append(segment)

        return elasticsearch_segments

    def get_segments(self, max_segment_words=350, sentence_overlap=2, start=None, end=None):
        self.load_content(compress=False)

        # Generate aligned sentences from word elements
        cleansed_corpus_sentences = self.get_sentences()

        if start is not None and end is not None:
            cleansed_corpus_sentences = core.data_models.PodiumPackageTranscriptFile.get_sentences_between_start_end(cleansed_corpus_sentences, start, end)

        # Group sentences into segments
        segments = []
        sentences_left = True
        current_sentence_start_index = 0
        while sentences_left:
            segment = {
                'word_element_sentences': None,
                'corpus_sentences': None
            }

            segment_word_count = 0
            num_sentences_to_take = 0
            for index in range(current_sentence_start_index, len(cleansed_corpus_sentences) - 1):
                num_sentence_words = len(cleansed_corpus_sentences[index]['content'].split(' '))
                if num_sentences_to_take == 0 or (num_sentence_words + segment_word_count) <= max_segment_words:
                    segment_word_count += num_sentence_words
                    num_sentences_to_take += 1
                elif (num_sentence_words + segment_word_count) > max_segment_words:
                    break

            sentence_end_index = current_sentence_start_index + num_sentences_to_take
            #segment['word_element_sentences'] = word_element_sentences[current_sentence_start_index:sentence_end_index]
            segment['word_element_sentences'] = list(map(lambda x: x['word_elements'], cleansed_corpus_sentences[current_sentence_start_index:sentence_end_index]))
            #segment['corpus_sentences'] = cleansed_corpus_sentences[current_sentence_start_index:sentence_end_index]
            segment['corpus_sentences'] = list(map(lambda x: x['content'], cleansed_corpus_sentences[current_sentence_start_index:sentence_end_index]))
            segments.append(segment)

            if (
                    current_sentence_start_index > sentence_overlap and
                    num_sentences_to_take > sentence_overlap and
                    (sentence_end_index + 1) < len(cleansed_corpus_sentences)
                ):
                current_sentence_start_index = sentence_end_index - sentence_overlap
            else:
                current_sentence_start_index = sentence_end_index

            if (current_sentence_start_index + 1) >= len(cleansed_corpus_sentences):
                sentences_left = False

            # Flatten segments
            for segment in segments:
                segment['word_elements'] = [element for sentence in segment['word_element_sentences'] for element in sentence]
                segment['content'] = ' '.join(segment['corpus_sentences'])

        return segments

    def get_words(self):
        '''
        Returns a list of all elements from the transcript
        which contains time information. This is used to
        align the clips.
        '''
        self.load_content(compress=False)

        speaker_lookup = self.get_speaker_lookup()

        words_object = []
        for monologue in self.content['monologues']:
            current_speaker_id = 0
            current_speaker_name = ""
            if 'speaker_id' in monologue:
                current_speaker_id = monologue['speaker_id']
                if current_speaker_id in speaker_lookup:
                    current_speaker_name = speaker_lookup[current_speaker_id]
                else:
                    current_speaker_name = "Speaker " + monologue['speaker_id']

            for element in monologue['elements']:
#                print(element)
                # There are three element['type']: punct, text and unknown
                if element['type'] != 'unknown':                    
                    # There are 4 puntuation types: '.' ',' '?' and ' '
                    if element['type'] == 'text':
                        # Removing any possible punctiation from the word because we can
                        # see some punctuations with the words in Deepgram transcripts.
                        word = element['value']
                        if word[-1] == ',' or word[-1] == '.' or word[-1] == '?' or word[-1] == '!':
                            word = word[:-1]
                        words_object.append({
                            'speaker_name': current_speaker_name,
                            'speaker_id': current_speaker_id,
                            'value': word,
                            'start': element['start'],
                            'end': element['end']
                        })
                        
        return words_object
    
    def get_words_and_punct(self):
        '''
        Returns a list of all elements from the transcript
        which contains time information. This is used to
        align the clips.
        '''
        self.load_content(compress=False)

        speaker_lookup = self.get_speaker_lookup()

        words_object = []
        for monologue in self.content['monologues']:
            current_speaker_id = 0
            current_speaker_name = ""
            if 'speaker_id' in monologue:
                current_speaker_id = monologue['speaker_id']
                if current_speaker_id in speaker_lookup:
                    current_speaker_name = speaker_lookup[current_speaker_id]
                else:
                    current_speaker_name = "Speaker " + monologue['speaker_id']

            for element in monologue['elements']:
#                print(element)
                # There are three element['type']: punct, text and unknown
                if element['type'] != 'unknown':                    
                    # There are 4 puntuation types: '.' ',' '?' and ' '
                    if element['type'] == 'text' or element['type'] == 'punct':
                        words_object.append({
                            'speaker_name': current_speaker_name,
                            'speaker_id': current_speaker_id,
                            'value': element['value'],
                            'start': element['start'],
                            'end': element['end']
                        })
                        
        return words_object
    
    def get_language_name(self):
        '''
        Returns the language of the transcript
        '''
        language_code = 'en'

        if self.language_code is not None:
            language_code = self.language_code
        else:
            self.load_content(compress=False)
            if 'language' in self.content and 'code' in self.content['language']:
                language_code = self.content['language']['code']

        language = PodiumPackageTranscriptFile.whisper_supported_languages[language_code]

        return language

    def get_sentences(self, custom_transcript=None, max_chars_per_sentence=None):
        '''
        "custom_transcript" can be used, for instance, to break 
        down a monologue into sentences and then into paragraphs.
        '''

        if not custom_transcript:
            self.load_content(compress=False)
            content = self.content
        else:
            content = custom_transcript

        sentence = {}
        sentences = []
        text = ''
        start_new_sentence = True

        # GUARD: If there is no content in the transcript, return empty list
        if custom_transcript is None and self.content is None:
            return sentences
        
        # GUARD: If there is no monologues in the transcript, return empty list
        if custom_transcript is None and 'monologues' not in self.content:
            return sentences
        
        speaker_lookup = self.get_speaker_lookup()
        
        for monologue in content['monologues']:
            current_speaker_id = 0
            current_speaker_name = ""
            if 'speaker_id' in monologue:
                current_speaker_id = monologue['speaker_id']
                if current_speaker_id in speaker_lookup:
                    current_speaker_name = speaker_lookup[current_speaker_id]
                else:
                    current_speaker_name = "Speaker " + monologue['speaker_id']

            # GUARD: If there are no elements in the monologue, continue
            monologue_text_elements = list(filter(lambda x: x['type'] == 'text', monologue['elements']))
            if len(monologue_text_elements) == 0:
                continue
            
            for index, element in enumerate(monologue['elements']):
                # There are three element['type']: punct, text and unknown
                if element['type'] != 'unknown':
                    # there are 4 puntuation types: '.' ',' '?' and ' '
                    # there is always a space after '.' in the current data set
                    if start_new_sentence and element['type'] == 'text':
                        text = ''
                        sentence = {}
                        sentence['start'] = element['start']
                        word_elements = []
                        start_new_sentence = False
                    elif start_new_sentence:
                        continue

                    if element['type'] == 'text':
                        word_elements.append({
                            'speaker_name': current_speaker_name,
                            'speaker_id': current_speaker_id,
                            'value': element['value'],
                            'start': element['start'],
                            'end': element['end']
                        })
                    elif element['value'] != " ":
                        if element['value'] == " ." or element['value'] == " ?" or element['value'] == " !":
                            word_elements.append({
                                'speaker_name': current_speaker_name,
                                'speaker_id': current_speaker_id,
                                'value': element['value'][:-1],
                            })
                        else:
                            word_elements.append({
                                'speaker_name': current_speaker_name,
                                'speaker_id': current_speaker_id,
                                'value': element['value']})

                    
                    at_end_of_elements = index == (len(monologue['elements']) - 1)
                    is_at_max_chars = False
                    if not at_end_of_elements and \
                        max_chars_per_sentence is not None \
                        and len(text + monologue['elements'][index + 1]['value']) > max_chars_per_sentence:
                        is_at_max_chars = True
                    
                    # There is no "!" in any trnscript
                    if element['value'] != '.' \
                        and element['value'] != '?' \
                        and element['value'] != '!' \
                        and index != (len(monologue['elements']) - 1) \
                        and not is_at_max_chars:

                        text += element['value']
                        if element['type'] == 'text':
                            end_ts = element['end']
                    else:
                        text += element['value']
                        if text[0] == ' ':
                            text = text[1:]

                        # This fixes some minor issues ralated to extra blank spaces
                        text_split = text.split()
                        text = ' '.join(text_split)

                        sentence['end'] = element['end']
                        sentence['content'] = text
                        sentence['word_elements'] = word_elements

                        if text != '' and text != '.':
                            sentences.append(sentence)
                        start_new_sentence = True
        
        return sentences

    @staticmethod
    def get_sentences_between_start_end(sentences, start, end):
        '''
        Returns the sentences between start and end timestamps
        '''
        return list(filter(lambda x: x['start'] >= start and x['end'] <= end, sentences))
    
    @staticmethod
    def get_words_between_start_end(words, start, end):
        '''
        Returns the sentences between start and end timestamps
        '''
        return list(filter(lambda x: x['start'] >= start and x['end'] <= end, words))

    def get_transcribed_length(self, content = None):
        if content is None:
            self.load_content(compress=False)
            content = self.content

        length = 0

        if 'monologues' not in content:
            return length
        
        # find the last element in the last monolouge that has an 'end' value
        for element in reversed(content['monologues'][-1]['elements']):
            if 'end' in element:
                length = element['end']
                break

        return length

    @staticmethod
    def get_segment_text_start_end(segment, text, prior_sentences=0, min_prior_words=0):
        # Find the text
        start_index = segment['content'].lower().find(text.lower())
        if start_index == -1:
            return PodiumPackageTranscriptFile.get_segment_start_end(segment)

        lead_segment_corpus = segment['content'][0:start_index + 1]

        # Calculate how many elements are in the first lead-up section
        expanded_lead_segment_corpus = core.text.expand_punctuation(lead_segment_corpus)
        expanded_lead_segment_corpus_elements = expanded_lead_segment_corpus.split(' ')

        if expanded_lead_segment_corpus_elements[0] == '':
            del expanded_lead_segment_corpus_elements[0]
        if expanded_lead_segment_corpus_elements[-1] == '':
            del expanded_lead_segment_corpus_elements[-1]

        element_start_index = 0
        if len(expanded_lead_segment_corpus_elements) > 0:
            element_start_index = len(expanded_lead_segment_corpus_elements) - 1
        if element_start_index > (len(segment['word_elements']) - 1):
            element_start_index = len(segment['word_elements']) - 1

        # Calculate how many elements are in the text itself
        expanded_text = core.text.expand_punctuation(text)
        expanded_text_elements = expanded_text.split(' ')

        if expanded_text_elements[0] == '':
            del expanded_text_elements[0]
        if expanded_text_elements[-1] == '':
            del expanded_text_elements[-1]

        element_end_index = element_start_index + len(expanded_text_elements)

        adjust_start_for_prior_sentences = False
        if prior_sentences > 0 or min_prior_words > 0:
            num_sentences = 0
            num_words = 0
            sentence_adjusted = False
            for index in range(element_start_index, 0, -1):
                if segment['word_elements'][index]['value'] in ['.', '?', '!']:
                    num_sentences += 1
                if 'start' in segment['word_elements'][index]:
                    num_words += 1
                if min_prior_words > 0 and num_words >= min_prior_words and not sentence_adjusted:
                    prior_sentences = num_sentences + 1
                    sentence_adjusted = True
                if (prior_sentences > 0 and num_sentences == prior_sentences) and (num_words >= min_prior_words) :
                    element_start_index = index
                    break
            if num_sentences < prior_sentences:
                adjust_start_for_prior_sentences = True

        # Find first start and first end
        start = None
        end = None
        for index in range(element_start_index, len(segment['word_elements']) - 1):
            if 'start' in segment['word_elements'][index]:
                start = segment['word_elements'][index]['start']
                break

        # Mis-alignment safety check
        if element_end_index >= len(segment['word_elements']):
            element_end_index = len(segment['word_elements']) - 1

        for index in range(element_end_index, 0, -1):
            if 'end' in segment['word_elements'][index]:
                end = segment['word_elements'][index]['end']
                break

        if adjust_start_for_prior_sentences:
            segment_start, segment_end = PodiumPackageTranscriptFile.get_segment_start_end(segment)
            start = segment_start

        return start, end

    @staticmethod
    def get_segment_start_end(segment):
        start = None
        end = None

        for index in range(0, len(segment['word_elements'])):
            if 'start' in segment['word_elements'][index]:
                start = segment['word_elements'][index]['start']
                break

        for index in range(len(segment['word_elements']) - 1, 0, -1):
            if 'end' in segment['word_elements'][index]:
                end = segment['word_elements'][index]['end']
                break

        return start, end

    def before_save(self):
        self.set_compressed_transcript()
        self._attributes.pop('content', None)

    # --------------------------------------------------------------------------------------------------------
    # Podium Transformations
    # --------------------------------------------------------------------------------------------------------
        
    @staticmethod
    def get_podium_format(transcript):
        # Try, just in case we want to process a transcript that 
        # doesn't have a language field added yet
        try:        
            media_transcript = {
                "monologues": [],
                "language": {
                    "code": transcript['language']['code'],
                }
            }
        except:
            media_transcript = {
                "monologues": []
            }

        
        for monologue in transcript['monologues']:
            media_monologue = {
                "speaker_id": monologue['speaker'],
                "elements": []
            }

            last_end = 0
            for element in monologue['elements']:
                if 'ts' in element:
                    start_seconds = element['ts']
                else:
                    start_seconds = last_end
                if 'end_ts' in element:
                    end_seconds = element['end_ts']
                else:
                    end_seconds = start_seconds

                media_monologue["elements"].append(
                    {
                        "type": element['type'],
                        "value": element['value'],
                        "start": round(start_seconds, 3),
                        "end": round(end_seconds, 3)
                    }
                )
                
                last_end = end_seconds
            
            media_transcript["monologues"].append(media_monologue)

        return media_transcript
    
    def process_and_set_speakers(self):
        self.load_content()

        core.data_models.PodiumPackageTranscriptFileSpeaker \
            .where('podium_package_transcript_file_id', self.id) \
            .delete()
        
        speakers = {}
        new_monologues = []
        for monologue in self.content['monologues']:
            if monologue['speaker_id'] not in speakers:
                new_speaker = core.data_models.PodiumPackageTranscriptFileSpeaker()
                new_speaker.podium_package_transcript_file_id = self.id
                new_speaker.default_name = f"Speaker {monologue['speaker_id']}"
                new_speaker.save()
                new_speaker = new_speaker.fresh()
                speakers[monologue['speaker_id']] = new_speaker.guid
                monologue['speaker_id'] = new_speaker.guid
                new_monologues.append(monologue)
            else:
                monologue['speaker_id'] = speakers[monologue['speaker_id']]
                new_monologues.append(monologue)
        
        self.content['monologues'] = new_monologues

    def change_speaker_for_monologue(self, old_speaker_id, new_speaker_id,monologue_index=None):

        self.load_content(compress=False)

        #save this as json in local
        # with open('transcript.json', 'w') as f:
        #     json.dump(self.content, f)
        new_monologues = []
        if monologue_index is None:
            for monologue in self.content['monologues']:
                if monologue['speaker_id'] == old_speaker_id:
                    
                    monologue['speaker_id'] = new_speaker_id
                    new_monologues.append(monologue)
                else:
                    new_monologues.append(monologue)
        else:
            self.content['monologues'][monologue_index]['speaker_id'] = new_speaker_id
            new_monologues = self.content['monologues']
        self.content['monologues'] = new_monologues
        
        self.update_transcript()
        

    def cache_transcript(self):
        self.load_content()

        try:
            core.cache.set(self.guid, orjson.dumps(self.content), cache="transcripts")
        except:
            pass

    def process_and_store_transcript(self, transcript):
        if transcript is None:
            return
        
        if 'monologues' not in transcript:
            return
        
        if len(transcript['monologues']) == 0:
            return
        
        # convert if in REV format
        if 'speaker' in transcript['monologues'][0]:
            self.content = PodiumPackageTranscriptFile.get_podium_format(transcript)

        # update package language code
        if 'language' in transcript and 'code' in transcript['language']:
            self.language_code = transcript['language']['code']

        self.process_and_set_speakers()

        self.s3_bucket = "podium-production"
        self.s3_key = f"podium_packages/transcripts/{self.guid}.json"

        s3 = boto3.client('s3', aws_access_key_id=core.env['aws_access_key'], aws_secret_access_key=core.env['aws_access_secret'])
        s3.put_object(Body=json.dumps(self.content), Bucket=self.s3_bucket, Key=self.s3_key, ACL='public-read')

        self.cache_transcript()

        self.save()

    def update_transcript(self):
        self.s3_bucket = "podium-production"
        self.s3_key = f"podium_packages/transcripts/{self.guid}.json"
        s3 = boto3.client('s3', aws_access_key_id=core.env['aws_access_key'], aws_secret_access_key=core.env['aws_access_secret'])
        s3.put_object(Body=json.dumps(self.content), Bucket=self.s3_bucket, Key=self.s3_key, ACL='public-read')
        self.cache_transcript
        self.save()


    def save_speaker_edits(self, edits):
        pass



    def split_and_add_speaker(self, speaker_id, monologue_index, start, end,transcript=None):
        if transcript is None:
            transcript = self.load_content(compress=False)
        else:
            transcript = transcript
        
        new_monologues = []
    
        for index,monologue in enumerate(transcript['monologues']):
            if index == monologue_index:
                first_split = monologue['elements'][0:start]
                between_split = monologue['elements'][start:end+1]
                last_split = monologue['elements'][end+1:]
                if first_split != []:
                    new_monologues.append({'speaker_id':monologue['speaker_id'],'elements':first_split})
                if between_split != []:
                    new_monologues.append({'speaker_id':speaker_id,'elements':between_split})
                if last_split != []:
                    new_monologues.append({'speaker_id':monologue['speaker_id'],'elements':last_split})
            else:
                new_monologues.append(monologue)

        if transcript is None:

            self.content['monologues'] = new_monologues
            
            self.update_transcript()
        else:
            return new_monologues
        
    #merge transcript monologues
    def merge_monologues(self, monologue_index1, monologue_index2,transcript=None):
        if transcript is None:
            transcript = self.load_content(compress=False)
        else:
            transcript = transcript
        
        new_monologues = []
        for index,monologue in enumerate(transcript['monologues']):
            if index == monologue_index1:
                new_elements = monologue['elements'] + transcript['monologues'][monologue_index2]['elements']
                new_monologues.append({'speaker_id':monologue['speaker_id'],'elements':new_elements})
            elif index == monologue_index2:
                pass
            else:
                new_monologues.append(monologue)

        return new_monologues
        
        

    def get_transcript_with_speakers(self):
        self.load_content(compress=False)

        transcript = self.content

        speakers = []
        for speaker in self.speakers:
            speakers.append(
                {
                    "id": speaker.guid,
                    "default_name": speaker.default_name,
                    "predicted_name": speaker.predicted_name,
                    "set_name": speaker.set_name,
                    "default_role": speaker.default_role,
                    "predicted_role": speaker.predicted_role,
                    "set_role": speaker.set_role,
                }
            )
        
        transcript['speakers'] = speakers

        return transcript
    
    def apply_speaker_edits(self, transcript=None):
        if transcript is None:
            transcript = self.get_transcript_with_speakers()
        print('applying speaker edits ------')
        edits = core.data_models.PodiumPackageTranscriptMonologueSpeakerEdit \
        .where('podium_package_transcript_file_id', self.id) \
                .order_by('updated_at', 'asc') \
                .get()
        print(edits.count(),'edits found ------')
        last_date = None
        
        
        for edit in edits:
                
            if last_date is None:
                medits = core.data_models.PodiumPackageTranscriptFileEdit \
                    .where('podium_package_transcript_file_id', self.id) \
                    .where('updated_at', '<', edit.updated_at) \
                    .order_by('updated_at', 'asc') \
                    .get()
                transcript = self.apply_edits(transcript,medits)
            else:
                medits = core.data_models.PodiumPackageTranscriptFileEdit \
                .where('podium_package_transcript_file_id', self.id) \
                .where('updated_at', '>', last_date) \
                .where('updated_at', '<', edit.updated_at) \
                .order_by('updated_at', 'asc') \
                .get()
                transcript = self.apply_edits(transcript,medits)
            
            last_date = edit.updated_at
            
            try:
                if edit.type == 'speaker' and edit.monologue_index is not None:
                    transcript['monologues'][edit.monologue_index]['speaker_id'] = edit.new_speaker_id
                    
                elif edit.type == 'speaker' and edit.monologue_index is None:
                    #find all speaker ids in the transcript and replace them with the new speaker id
                    for monologue in transcript['monologues']:
                        if monologue['speaker_id'] == edit.old_speaker_id:
                            monologue['speaker_id'] = edit.new_speaker_id
                elif edit.type == 'monologue_split':
                    transcript['monologues'] = self.split_and_add_speaker(edit.new_speaker_id,edit.monologue_index,edit.start_eindex,edit.end_eindex,transcript)
                elif edit.type == 'monologue_merge' and edit.monologue_index is not None:
                    transcript['monologues'] = self.merge_monologues(edit.monologue_index-1,edit.monologue_index,transcript)
                elif edit.type == 'monologue_delete':
                    transcript['monologues'].pop(edit.monologue_index)
            except Exception as e:
                print(f"Error applying edit {edit}")
                print(e)
                pass
        if last_date is None:
            medits = core.data_models.PodiumPackageTranscriptFileEdit \
                .where('podium_package_transcript_file_id', self.id) \
                .order_by('updated_at', 'asc') \
                .get()
        else:
            medits = core.data_models.PodiumPackageTranscriptFileEdit \
                    .where('podium_package_transcript_file_id', self.id) \
                    .where('updated_at', '>', last_date) \
                    .order_by('updated_at', 'asc') \
                    .get()
        transcript = self.apply_edits(transcript,medits)
        return transcript


    def apply_edits(self, transcript=None,edits=None):
        if transcript is None:
            transcript = self.get_transcript_with_speakers()
        if edits is None:
            edits = core.data_models.PodiumPackageTranscriptFileEdit \
                .where('podium_package_transcript_file_id', self.id) \
                .order_by('id', 'asc') \
                .get()
        
        for edit in edits:
            try:
                if edit.type == 'update':
                    transcript['monologues'][edit.monologue_index]['elements'][edit.element_index]['value'] = edit.value
                    transcript['monologues'][edit.monologue_index]['elements'][edit.element_index]['type'] = edit.element_type
                elif edit.type == 'insert':
                    transcript['monologues'][edit.monologue_index]['elements'].insert(edit.element_index, {
                        "type": edit.element_type,
                        "value": edit.value,
                        "start": float(edit.start),
                        "end": float(edit.end)
                    })
                elif edit.type == 'delete':
                    del transcript['monologues'][edit.monologue_index]['elements'][edit.element_index]
            except Exception as e:
                print(f"Error applying edit {edit.to_dict()}")
                print(e)
                pass

        return transcript

    # --------------------------------------------------------------------------------------------------------
    # Short Clip Generation
    # --------------------------------------------------------------------------------------------------------

    def target_sentence(self, sentences_object, requested_time_in_seconds):
        '''
        Returns the sentence that is closest to the requested time in seconds
        '''
        target_sentence_index = 0
        for item in sentences_object:
            if item['end'] >= requested_time_in_seconds:
                if target_sentence_index == 0:
                    break
                else:
                    if item['start'] <= requested_time_in_seconds:
                        break
                    else:
                        target_sentence_index -= 1
                        break
            target_sentence_index += 1
        
        return target_sentence_index

    def query_text(self, target_sentence_index, sentences):
        '''
        Returns the query text composed of the target sentence and the 
        previous sentence, until reaching at least 25 words
        '''
        good = False
        num_sentences_back =2
        while not good:
            if target_sentence_index >= num_sentences_back:
                query = ' '.join(sentences[target_sentence_index-num_sentences_back:target_sentence_index+1])
                if len(query.split()) >= 25:
                    good = True
                else:
                    num_sentences_back += 1
            else:
                query = ' '.join(sentences[:target_sentence_index+1])
                good = True
        return query

    def context_before_query(self, target_sentence_index, sentences):
        '''
        Context: Up to 1500 words around the query. (750 before and 750 after)
        '''
        context_before = []
        continuee = True
        counter = 1
        num_words = 0
        while continuee:
            num_words += len(sentences[target_sentence_index-counter].split()) 
            if target_sentence_index - counter >= 0 and num_words < 750:
                context_before.append(sentences[target_sentence_index-counter])
                counter += 1
            else:
                continuee = False
        context_before.reverse()
        return context_before

    def context_after_query(self, target_sentence_index, sentences):
        '''
        Context: Up to 1500 words around the query. (750 before and 750 after)
        '''
        context_after = []
        continuee = True
        counter = 0
        num_words = 0
        while continuee:
            if target_sentence_index + counter < len(sentences) - 1:
                num_words += len(sentences[target_sentence_index+counter].split())
                if num_words < 750:
                    context_after.append(sentences[target_sentence_index+counter])
                    counter += 1
                else:
                    continuee = False
            elif target_sentence_index + counter == len(sentences) - 1:
                context_after.append(sentences[target_sentence_index+counter])
                continuee = False
            else:
                continuee = False
        return context_after

    def generate_query_context(self, target_sentence_index, sentences):
        '''
        query: Two sentence before the query plus the query.
        context: Up to 1500 words around the query. (1500 is around the average numbers 
            of words used to train the AI previews model)
        '''
        query = self.query_text(target_sentence_index, sentences)
        context_before = self.context_before_query(target_sentence_index, sentences)
        context_after = self.context_after_query(target_sentence_index, sentences)

        context = ' '.join(context_before + context_after)

        return query, context

    def clip_star_and_end_times(self, clip, words_object):
        '''
        Returns the start and end time of the clip in seconds.
        '''
        clip_words = clip.split()
        new_clip_words = []
        for word in clip_words:
            if word[-1] == ',' or word[-1] == '.' or word[-1] == '?' or word[-1] == '!':
                new_clip_words.append(word[:-1])
            else:
                new_clip_words.append(word)
        clip_words = ' '.join(new_clip_words)
    
        transcript_words = ' '.join([item['value'] for item in words_object])

        start_index_character = transcript_words.find(clip_words)
        # print(start_index_character)
        # print('---')
        # print(clip_words)
        # print('---')
        # print(transcript_words)
        start_index_word = len(transcript_words[:start_index_character].split())
        end_index_word = start_index_word + len(clip_words.split()) - 1        

        start_time = words_object[start_index_word]['start']
        end_time = words_object[end_index_word]['end']

        return start_time, end_time

    def optimize_start_end_times(self, start_time, end_time, sentences_object):
        '''
        Ensures that the start, end and clip start and end
        with the corresponding sentences.
        '''
        starts = [x['start'] for x in sentences_object]
        ends = [x['end'] for x in sentences_object]

        previous = starts[0] 
        start_index = 0
        for start in starts:
            if start == start_time:
                new_start_time = start
                clip_start_index = start_index
                break
            elif start > start_time:
                new_start_time = previous
                clip_start_index = start_index - 1
                break
            previous = start
            start_index += 1

        end_index = 0
        for end in ends:
            if end >= end_time:
                new_end_time = end
                clip_end_index = end_index
                break
            end_index += 1
        
        new_short_clip = ' '.join([x['content'] for x in sentences_object[clip_start_index:clip_end_index+1]])

        return new_start_time, new_end_time, new_short_clip

    # TODO: Move this to text.py
    async def get_clip(self, requested_time_in_seconds, size='short', language='English'):
        '''
        Returns the short or medium clip object that is closest to the requested time in seconds.
        '''

        sentences_object = self.get_sentences()
        words_object = self.get_words()

        target_sentence_index = self.target_sentence(sentences_object, requested_time_in_seconds)
        sentences = [item['content'] for item in sentences_object]

        query, context = self.generate_query_context(target_sentence_index, sentences)
        if size == 'short':
            clip = await core.inference.short_clip(query=query, context=context)
            clip = clip['short_clip']
        elif size == 'medium':
            clip = await core.inference.medium_clip(query=query, context=context)
            clip = clip['medium_clip']

        # If for some reason there is no clip generated, the clip will be the query.
        if clip:
            if clip[0] == ' ':
                clip = clip[1:]
            clip = clip.replace(" ,", ",")
            clip = clip.replace(" .", ".")
            clip = clip.replace(" ?", "?")
        else:
            clip = query

        start_time, end_time = self.clip_star_and_end_times(clip, words_object)
        new_start_time, new_end_time, new_clip = self.optimize_start_end_times(start_time, end_time, sentences_object)

        title = core.text.gpt3_chapter_title(clip, language)

        print(clip)
        print('---')

        return {'title': title, 'clip': new_clip, 'start_time': new_start_time, 'end_time': new_end_time}

    # --------------------------------------------------------------------------------------------------------

    async def get_embedding_vector_for_start_end(self, start, end):
        '''
        Returns the embedding vector for the text between the start and end time.
        '''
        sentences = self.get_sentences()
        
        first_sentence_index = self.target_sentence(sentences, start)
        last_sentence_index = self.target_sentence(sentences, end)
        text = ' '.join([x['content'] for x in sentences[first_sentence_index:last_sentence_index]])
        
        return await core.inference.text_embedding_vector(text)

PodiumPackageTranscriptFile.saving(lambda podium_package_transcript_file: podium_package_transcript_file.before_save())

from .podium_package import PodiumPackage
from .podium_package_audio_file import PodiumPackageAudioFile
from .podium_package_paragraph import PodiumPackageParagraph
from .podium_package_transcript_file_speaker import PodiumPackageTranscriptFileSpeaker
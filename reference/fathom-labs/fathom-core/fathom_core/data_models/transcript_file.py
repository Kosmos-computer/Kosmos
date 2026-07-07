import fathom_core as core
from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through
from orator import accessor, mutator
import requests
import json
import numpy as np
import re
import orjson
import boto3
from botocore.errorfactory import ClientError

class TranscriptFile(Model):

    VECTOR_COLLECTION = "podcast-episode-transcript-segments"
    SEARCH_INDEX = "podcast-episode-transcript-segments"
    CACHE_NAME = "podcast_transcripts"

    __appends__ = ['content']

    @accessor
    def content(self):
        return self.get_raw_attribute('content')

    @content.mutator
    def set_content(self, value):
        self.set_raw_attribute('content', value)

    @belongs_to
    def audio_file(self):
        return AudioFile

    @belongs_to
    def podcast_episode(self):
        return PodcastEpisode
    
    @has_many
    def speakers(self):
        return ( 
            TranscriptFileSpeaker \
            .order_by('created_at', 'asc')
        )

    def url(self):
        if self.format_version == 1:
            if self.source == 'deepgram':
                return f"https://{self.s3_bucket}.s3.amazonaws.com/{self.s3_key}_reformatted"
            else:
                return f"https://{self.s3_bucket}.s3.amazonaws.com/{self.s3_key}"
        else:
            return f"https://{self.s3_bucket}.s3.amazonaws.com/{self.s3_key}"

    def load_content(self, timeout=10, cache_transcript=True):
        if not self.has_loaded_content() and self.can_load_content():
            self.content = self.get_cached_transcript()
            
            if self.content is None:
                self.content = json.loads(requests.get(self.url(), timeout=timeout).content)
                
                if cache_transcript and not self.needs_format_upgrade():
                    self.cache_transcript()
            
            if self.needs_format_upgrade():
                self.upgrade_format_version()
            
            self.set_compressed_transcript()

    def needs_format_upgrade(self):
        return self.format_version != 2

    def upgrade_format_version(self):
        self.process_and_store_transcript(self.content)

    def has_loaded_content(self):
        return 'content' in self._attributes and self.content is not None
    
    def can_load_content(self):
        return 's3_key' in self._attributes and self.s3_key is not None

    def load_content_from_file(self, filepath):
        self.content = json.load(open(filepath))

    def set_compressed_transcript_from_file(self, filepath):
        self.load_content_from_file(filepath)
        self.set_compressed_transcript(force_reload=True)

    def set_compressed_transcript(self, force_reload = False):
        if 'compressed_transcript' not in self._attributes or self.compressed_transcript is None or force_reload:
            self.load_content()
            if not self.has_loaded_content():
                return

            elements = []
            starts = []

            last_start = 0
            for monologue in self.content['monologues']:
                for element in monologue['elements']:
                    elements.append(element['value'])
                    if 'ts' in element:
                        starts.append(element['ts'])
                        last_start = element['ts']
                    elif 'start' in element:
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
        self.load_content()
        
        speakers = []
        for monologue in self.content['monologues']:
            if monologue['speaker_id'] not in speakers:
                speakers.append(monologue['speaker_id'])

        return len(speakers)
    
    def get_content_with_speaker_names(self):
        self.load_content()

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
            "monologues": [{
                "speaker": 0,
                "elements": []
            }]
        }

        space_punct = {"type":"punct","value":" "}
        punctuation_marks = ['.', '?', '!', ',']

        for word in content['results']['channels'][0]['alternatives'][0]['words']:
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

            formatted_content['monologues'][0]['elements'].append(formatted_word)

            if punctuation in punctuation_marks:
                formatted_punctuation = {
                    'type': 'punct',
                    'value': punctuation,
                }

                formatted_content['monologues'][0]['elements'].append(formatted_punctuation)

            formatted_content['monologues'][0]['elements'].append(space_punct)

        return formatted_content

    async def ingest_for_search(self):
        segments = self.get_segments()
        embedding_vectors = []
        elasticsearch_segments = []
        core.log.info(f"Processing {len(segments)} segments for podcast episode {self.podcast_episode.guid}")

        for segment in segments:
            del segment['word_element_sentences']
            del segment['corpus_sentences']

            start, end = TranscriptFile.get_segment_start_end(segment)
            segment['start'] = start
            segment['end'] = end

            segment['podcast_id'] = self.podcast_episode.podcast.guid
            segment['podcast_episode_id'] = self.podcast_episode.guid
            segment['content_fingerprint'] = core.text.get_fingerprint(segment['content'])

            segment['embedding_vector'] = await core.inference.text_embedding_vector(segment['content'])
            if len(segment['embedding_vector']) > 0:
                segment['embedding_vector_fingerprint'] = core.vector.get_fingerprint(segment['embedding_vector'])

                normalized_vector = np.array(segment['embedding_vector']).astype(float)
                normalized_vector = normalized_vector / np.linalg.norm(normalized_vector)
                embedding_vectors.append(normalized_vector.tolist())

                elasticsearch_segments.append(segment)

        embedding_vector_ids = core.ann.insert(
            embedding_vectors, 
            collection_name=TranscriptFile.VECTOR_COLLECTION, 
            partition_tag=self.podcast_episode.podcast.guid,
            data_model=self.podcast_episode
        )
        core.log.info(f"Inserted {len(embedding_vectors)} vectors for podcast episode {self.podcast_episode.guid}")

        if len(embedding_vector_ids) == len(elasticsearch_segments):
            for index, segment in enumerate(elasticsearch_segments):
                segment['embedding_vector_id'] = embedding_vector_ids[index]
                status = core.elastic.index(segment, index=TranscriptFile.SEARCH_INDEX)

                core.log.info(f"Ingested segement {segment['embedding_vector_id']} for podcast episode {self.podcast_episode.guid}")
                #print(dir(response))

    def get_segments(self, max_segment_words=350, sentence_overlap=2):
        self.load_content()

        # Generate list of word elements
        #word_elements = []
        #for monologue in self.content['monologues']:
        #    current_speaker = monologue['speaker']
        #    for element in monologue['elements']:
        #        if element['value'] != ' ':
        #            value = element['value']
        #            if element['type'] != "punct":
        #                value = core.text.replace_non_alphanumerics(value)
        #            formatted_element = {
        #                'speaker': current_speaker,
        #                'value': value,
        #            }
        #
        #            if 'ts' in element:
        #                formatted_element['start'] = element['ts']
        #                formatted_element['end'] = element['end_ts']

        #            word_elements.append(formatted_element)
        #
        ## Combine word elements into text corpus
        #corpus = ' '.join([element['value'] for element in word_elements])
        #corpus = core.text.contract_punctuation(corpus)
        #
        ## TODO: Improve this.
        ## Split text corpus into sentences
        #corpus_sentences = core.text.get_sentences(corpus)
        #
        #cleansed_corpus_sentences = []
        #for corpus_sentence in corpus_sentences:
        #    if (
        #            (corpus_sentence[0] == "'" or
        #            corpus_sentence[0] == "-" or
        #            corpus_sentence[0] == ">" or
        #            (len(corpus_sentence) >= 2 and corpus_sentence[1] == "'" and corpus_sentence[0] != "I") or
        #            (len(corpus_sentence) >= 2 and corpus_sentence[1] == "-")) and
        #            len(cleansed_corpus_sentences) > 1
        #        ):
        #
        #        if len(corpus_sentence) >= 2 and ((corpus_sentence[1] == "-" and corpus_sentence[0] != ' ') or (corpus_sentence[0].isupper())):
        #            corpus_sentence = ' ' + corpus_sentence
        #
        #        cleansed_corpus_sentences[len(cleansed_corpus_sentences) - 1] = cleansed_corpus_sentences[len(cleansed_corpus_sentences) - 1] + corpus_sentence
        #    elif (
        #            len(cleansed_corpus_sentences) > 0 and
        #            cleansed_corpus_sentences[len(cleansed_corpus_sentences) - 1][-1] == '-'
        #        ):
        #        cleansed_corpus_sentences[len(cleansed_corpus_sentences) - 1] = cleansed_corpus_sentences[len(cleansed_corpus_sentences) - 1] + corpus_sentence
        #    else:
        #        cleansed_corpus_sentences.append(corpus_sentence)
        #
        # Generate aligned sentences from word elements

        cleansed_corpus_sentences = self.get_sentences()

        #word_element_sentences = []
        #current_start_index = 0
        #current_end_index = 0
        #
        #for index, corpus_sentence in enumerate(cleansed_corpus_sentences):
        #    expanded_sentence = core.text.expand_punctuation(corpus_sentence)
        #    expanded_sentence_elements = expanded_sentence.split(' ')
        #    if expanded_sentence_elements[0] == '':
        #        del expanded_sentence_elements[0]
        #    if expanded_sentence_elements[-1] == '':
        #        del expanded_sentence_elements[-1]
        #
        #    current_end_index = current_start_index + (len(expanded_sentence_elements))
        #
        #    word_element_sentence = word_elements[current_start_index: current_end_index]
        #    word_element_sentences.append(word_element_sentence)

        #    if expanded_sentence_elements[-1] != word_element_sentence[-1]['value']:
        #        raise RuntimeError('Mis-aligned transcript error')
        #
        #    current_start_index = current_end_index

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
        self.load_content()

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
        self.load_content()

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

    def get_sentences(self, custom_transcript=None):
        '''
        "custom_transcript" can be used, for instance, to break 
        down a monologue into sentences and then into paragraphs.
        '''

        if not custom_transcript:
            self.load_content()
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
            
            for index, element in enumerate(monologue['elements']):
                # There are three element['type']: punct, text and unknown
                if element['type'] != 'unknown':
                    # there are 4 puntuation types: '.' ',' '?' and ' '
                    # there is always a space after '.' in the current data set
                    if start_new_sentence and element['type'] == 'text':
                        sentence['start'] = element['start']
                        word_elements = []
                        start_new_sentence = False

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

                    # There is no "!" in any trnscript
                    if element['value'] != '.' \
                        and element['value'] != '?' \
                        and element['value'] != '!' \
                        and index != (len(monologue['elements']) - 1):

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

                        sentence['end'] = end_ts
                        sentence['content'] = text
                        sentence['word_elements'] = word_elements

                        if text != '' and text != '.':
                            sentences.append(sentence)
                        text = ''
                        sentence = {}
                        start_new_sentence = True
        return sentences

    def get_sentences_from_compressed_transcript(self):
        if self.compressed_transcript is None:
            return []

        sentences = []
        sentence = {
            'start': 0,
            'end': 0,
            'content': '',
            'word_elements': []
        }
        
        for index, element in enumerate(self.compressed_transcript['elements']):
            word_element = {'speaker': 0,
                'value': '',
                'start': 0,
                'end': 0
            }
            
            word_element['value'] = element.strip()
            word_element['start'] = self.compressed_transcript['starts'][index]
            if index < len(self.compressed_transcript['elements']) - 1:
                word_element['end'] = self.compressed_transcript['starts'][index + 1]
            else:
                word_element['end'] = self.compressed_transcript['starts'][index]

            sentence['word_elements'].append(word_element)

            # determine if the current element is the end of a sentence
            if ('. ' in element or '? ' in element or '! ' in element) and element[-3] != '.':
                sentences.append(sentence)
                sentence = {
                    'start': 0,
                    'end': 0,
                    'content': '',
                    'word_elements': []
                }

        for sentence in sentences:
            sentence['start'] = sentence['word_elements'][0]['start']
            sentence['end'] = sentence['word_elements'][-1]['end']
            sentence['content'] = ' '.join(map(lambda x: x['value'], sentence['word_elements']))

        return sentences

    def get_transcribed_length(self, content = None):
        if content is None:
            self.load_content()
            content = self.content

        # Rev.ai returns elements in asc order, but just to be paranoid we will get the greatest end_ts value
        elements = list(map(lambda x: x['elements'], content['monologues']))
        elements = list(np.concatenate(elements).flat)
        lengths = list(map(lambda x: x.get('end_ts'), elements))
        lengths = list(filter(None, lengths))
        return max(lengths)

    def remove_from_search(self):
        self.remove_vectors_from_search()
        self.remove_segments_from_search()

    def remove_vectors_from_search(self):
        core.ann.delete([], collection_name=TranscriptFile.VECTOR_COLLECTION, filter={'podcast_episode_id': self.podcast_episode.id})

    def remove_segments_from_search(self):
        core.log.info(f"REMOVING SEGMENTS FOR PODCAST EPISODE {self.podcast_episode.guid} FROM ES {TranscriptFile.SEARCH_INDEX}")
        TranscriptFile.delete_segments_by_podcast_episode_id(self.podcast_episode.guid)

    @staticmethod
    def get_segment_text_start_end(segment, text, prior_sentences=0, min_prior_words=0):
        # Find the text
        start_index = segment['content'].lower().find(text.lower())
        if start_index == -1:
            return TranscriptFile.get_segment_start_end(segment)

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
            segment_start, segment_end = TranscriptFile.get_segment_start_end(segment)
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

    @staticmethod
    async def match_search_segments(query, podcast_id=None, max_results=10, page=0):
        predicates = []

        # TODO: Handle multiple sources / partitions
        if podcast_id is not None:
            predicates.append({
                'term': {
                    'podcast_id.keyword': podcast_id
                }
            })

        predicates.append({
            'match': {
                'content': query
            }
        })

        search = {
          "query": {
            "bool": {
              "must": predicates
            }
          }
        }

        if page > 0:
            from_ = max_results * page + 1
        else:
            from_ = page

        results = core.elastic.search(search, index=TranscriptFile.SEARCH_INDEX, size=max_results, from_=from_)

        segments = results['hits']['hits']

        for segment in segments:
            segment['_search_method'] = "BM25"

        return segments

    @staticmethod
    def logical_search_segments(query):
        pass

    @staticmethod
    def get_segments_by_embedding_vector_ids(source, embedding_vector_ids):
        search = {
            "query": {
                "terms": {
                    'embedding_vector_id': embedding_vector_ids
                }
            }
        }

        results = core.elastic.search(search, index=source)

        segments = []
        if len(results['hits']['hits']) > 0:
            segments = results['hits']['hits']

        return segments

    @staticmethod
    def get_segments_by_podcast_episode_id(id, source=None):
        search = {
            "query": {
                "terms": {
                    'podcast_episode_id.keyword': [id]
                }
            }
        }

        if source is not None:
            search["_source"] = source

        results = core.elastic.search(search, index=TranscriptFile.SEARCH_INDEX)
        segments = results['hits']['hits']

        return segments

    @staticmethod
    def delete_segments_by_podcast_episode_id(id):
        query = {
            "query": {
                    "bool": {
                        "must": [
                            {
                              "term": { "podcast_episode_id.keyword": id }
                            }
                        ]
                    }
              }
        }

        results = core.elastic.delete_by_query(query, index=TranscriptFile.SEARCH_INDEX)
        return results

    @staticmethod
    def get_segment_by_id(source, id):
        search = {
          "query": {
            "terms": {
              "_id": [ id ]
            }
          }
        }

        results = core.elastic.search(search, index=source)

        segment = None
        if len(results['hits']['hits']) > 0:
            part = results['hits']['hits'][0]

        return segment

    @staticmethod
    async def vector_search_segments(query, podcast_id=None, max_results=50, min_score=0.0, min_words=20):
        query_embedding_vector = await core.inference.text_embedding_vector(query)

        normalized_vector = np.array(query_embedding_vector).astype(float)
        normalized_vector = normalized_vector / np.linalg.norm(normalized_vector)

        ann_results = []
        ann_results = core.ann.search(normalized_vector.tolist(), collection_name=TranscriptFile.VECTOR_COLLECTION, partition_tag=podcast_id, max_results=max_results)

        distance_map = {}
        for result in ann_results:
            distance_map[result['vector_id']] = result['distance']

        segments = TranscriptFile.get_segments_by_embedding_vector_ids(TranscriptFile.SEARCH_INDEX, list([result['vector_id'] for result in ann_results]))

        qualified_segments = []
        for segment in segments:
            if segment['_source']['embedding_vector_id'] in distance_map:
                segment['_score'] = distance_map[segment['_source']['embedding_vector_id']]
            else:
                segment['_score'] = 0.0
            segment['_search_method'] = 'vector'
            if segment['_score'] >= min_score and len(segment['_source']['content'].split(' ')) >= min_words:
                qualified_segments.append(segment)

        qualified_segments.sort(key=lambda segment: segment['_score'], reverse=True)

        return qualified_segments

    def before_save(self):
        self.set_compressed_transcript()
        self._attributes.pop('content', None)

    # --------------------------------------------------------------------------------------------------------
    # Podium Transformations
    # --------------------------------------------------------------------------------------------------------    
    def cache_transcript(self):
        self.load_content()

        try:
            core.cache.set(self.guid, orjson.dumps(self.content), cache=TranscriptFile.CACHE_NAME)
        except:
            pass

    def get_cached_transcript(self):
        transcript = None
        try:
            cached_transcript_data = core.cache.get(self.guid, cache=TranscriptFile.CACHE_NAME)
            if cached_transcript_data is not None:
                transcript = orjson.loads(cached_transcript_data)
        except:
            pass

        return transcript

    def process_and_set_speakers(self):
        self.load_content()

        core.data_models.TranscriptFileSpeaker \
            .where('transcript_file_id', self.id) \
            .delete()
        
        speakers = {}
        new_monologues = []
        for monologue in self.content['monologues']:
            if monologue['speaker_id'] not in speakers:
                new_speaker = core.data_models.TranscriptFileSpeaker()
                new_speaker.transcript_file_id = self.id
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

    def process_and_store_transcript(self, transcript):
        if transcript is None:
            return
        
        if 'monologues' not in transcript:
            return
        
        if len(transcript['monologues']) == 0:
            return
        
        # convert if in REV format
        if 'speaker' in transcript['monologues'][0]:
            self.content = core.data_models.PodiumPackageTranscriptFile.get_podium_format(transcript)

        # update package language code
        if 'language' in transcript and 'code' in transcript['language']:
            self.language_code = transcript['language']['code']

        self.process_and_set_speakers()

        self.s3_bucket = core.env['aws_s3_bucket']
        self.s3_key = f"podcasts/{self.podcast_episode.podcast.url_slug.replace('-', '_')}/episodes/{self.podcast_episode.url_slug.replace('-', '_')}/transcripts/{self.guid}.json"

        s3 = boto3.client('s3', aws_access_key_id=core.env['aws_access_key'], aws_secret_access_key=core.env['aws_access_secret'])
        s3.put_object(Body=json.dumps(self.content), Bucket=self.s3_bucket, Key=self.s3_key, ACL='public-read')

        self.set_compressed_transcript()
        self.cache_transcript()

        self.format_version = 2
        new_transcript = self.content
        self.save()

        self.content = new_transcript

    def get_transcript_with_speakers(self):
        self.load_content()

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

    async def get_clip(self, requested_time_in_seconds, size='short', generate_title=True):
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

        if generate_title:
            title = core.text.gpt3_chapter_title(clip)
        else:
            title = ''

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

TranscriptFile.saving(lambda transcript_file: transcript_file.before_save())

from .audio_file import AudioFile
from .podcast_episode import PodcastEpisode
from .transcript_file_speaker import TranscriptFileSpeaker
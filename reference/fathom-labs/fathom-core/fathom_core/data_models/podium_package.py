import fathom_core as core
from .podium_packagemixin_podbook import PodiumPackagePodbookMixin
from .system_flag import SystemFlag

from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through, scope
from orator import accessor, mutator
from orator.query.join_clause import JoinClause

import boto3
from botocore.errorfactory import ClientError
from rev_ai import apiclient
from deepgram import Deepgram
from bs4 import BeautifulSoup
import time
import asyncio
import requests

from pathlib import Path
import shutil
import uuid
import json
import datetime
import traceback
import os
from zipfile import ZipFile
from contextlib import contextmanager
import functools
import re
import pprint

from sendgrid.helpers.mail import *
from sendgrid import SendGridAPIClient

import numpy as np
from striprtf.striprtf import rtf_to_text

class PodiumPackage(Model, PodiumPackagePodbookMixin):

    MIN_VECTORIZE_DURATION = 30 * 1

    MIN_CHAPTERIZE_DURATION = 60 * 8
    MIN_PREVIEW_EXTRACTION_DURATION = 60 * 4

    default_process_attributes = [
        'audio_stored',
        'transcription_job_requested',
        'transcription_job_finished',
        'transcribed',
        'search_ingested',
        'previews_generated',
        'vector_generated',
        'new_episode_notifications',
        'chapters_generated',
        'summary_generated',
        'package_generated'
    ]

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

    logger = core.log

    __appends__ = ['last_position']

    @accessor
    def last_position(self):
        return self.get_raw_attribute('last_position')

    @last_position.mutator
    def set_last_position(self, value):
        self.set_raw_attribute('last_position', value)

    @belongs_to
    def podium_project(self):
        return PodiumProject

    @has_many
    def podium_package_audio_files(self):
        return PodiumPackageAudioFile

    @has_one
    def podium_package_processing_configuration(self):
        return PodiumPackageProcessingConfiguration

    @has_many
    def podium_transactions(self):
        return PodiumTransaction

    @has_many
    def vectors(self):
        from .podium_package_vector import PodiumPackageVector
        return PodiumPackageVector

    def primary_vector(self):
        vector = None

        vectors = self.vectors
        if len(vectors) > 0:
            vector = vectors[0]

        return vector

    @has_many
    def podium_package_transcript_files(self):
        return PodiumPackageTranscriptFile

    def transcript_file(self):
        if self.podium_package_transcript_files and len(self.podium_package_transcript_files) > 0:
            return self.podium_package_transcript_files[0]
        else:
            return None

    @has_many
    def process_attributes(self):
        return PodiumPackageProcessAttribute

    @has_many
    def previews(self):
        return PodiumPackagePreview.order_by('start', 'asc')

    @has_many
    def chapters(self):
        return PodiumPackageChapter.order_by('start', 'asc')

    @has_many
    def assets(self):
        return PodiumPackageAsset

    def get_accepted_asset(self, type):
        asset = core.data_models.PodiumPackageAsset \
            .where('podium_package_id', self.id) \
            .where('accepted_variant', True) \
            .where('type', type) \
            .first()

        return asset

    @belongs_to('user_id')
    def user(self):
        return PodiumUser

    @contextmanager
    def error_logging(self):
        try:
            yield
            self.error = None
            self.save()
        except PodiumPackageProcessingException as e:
            self.error = traceback.format_exc()
            self.error_type = e.message
            self.save()
            self.send_user_email("d-52528e9774a8423ab980a290382ca7c8")
            raise e
        except Exception as e:
            self.error = traceback.format_exc()
            self.error_type = "Unknown"
            self.send_user_email("d-52528e9774a8423ab980a290382ca7c8")
            self.save()
            raise e

    def origin_is_api(self):
        return self.remote_media_file_url != None

    def formatted_duration(self):
        return str(datetime.timedelta(seconds=round(self.duration)))

    def set_process_attribute(self, key, value):
        process_attribute = self.get_process_attribute(key)

        if not process_attribute:
            process_attribute = PodiumPackageProcessAttribute()
            process_attribute.podium_package_id = self.id
            process_attribute.key = key

        process_attribute.value = value
        process_attribute.save()

        return process_attribute

    def get_process_attribute(self, key):
        return PodiumPackageProcessAttribute \
            .where('podium_package_id', self.id) \
            .where('key', key) \
            .first()

    def lookup_process_attribute_value(self, key):
        return next((x.value for x in self.process_attributes if x.key == key), None)

    def process_attribute_value_is(self, key, value):
        pa = self.get_process_attribute(key)
        if pa == None:
            return False
        else:
            return pa.value == value

    def get_temp_files_path(self):
        temp_files_path = f"/tmp/podium_package/{self.guid}/"
        Path(temp_files_path).mkdir(parents=True, exist_ok=True)

        return temp_files_path


    def log(self, message):
        self.logger.info(f"EPISODE ID  {self.id} | '{self.title}' : {message}")

    def podium_package_audio_file(self):
        podium_package_audio_file = PodiumPackageAudioFile \
            .where('podium_package_id', self.id) \
            .where('format', 'mp3') \
            .first()
        return podium_package_audio_file
    
    def podium_package_video_file(self):
        # filter for video formats
        podium_package_video_file = PodiumPackageAudioFile \
            .where('podium_package_id', self.id) \
            .where_in('format', ['webm', 'm4v', '3gp', 'mov', 'avi', 'mp4']) \
            .first()
        return podium_package_video_file

    def podium_package_original_media_file(self):
        podium_package_original_media_file = PodiumPackageAudioFile \
            .where('podium_package_id', self.id) \
            .order_by('id', 'asc') \
            .first()

        return podium_package_original_media_file

    def audio_url(self):
        audio_url = None
        if self.podium_package_audio_file():
            audio_url = self.podium_package_audio_file().url()

        return audio_url

    def video_url(self):
        video_url = None
        if self.podium_package_video_file():
            video_url = self.podium_package_video_file().url()
        return video_url

    def audio_url_cdn(self):
        audio_url_cdn = None
        if self.audio_url():
            audio_url_cdn = self.audio_url().replace("https://podium-production.s3.amazonaws.com/", "https://d1v4hly0mxfbpv.cloudfront.net/")

        return audio_url_cdn
    
    def video_url_cdn(self):
        video_url_cdn = None
        if self.video_url():
            video_url_cdn = self.video_url().replace("https://podium-production.s3.amazonaws.com/", "https://d1v4hly0mxfbpv.cloudfront.net/")
        return video_url_cdn

    def original_media_url(self):
        original_media_url = None
        if self.podium_package_original_media_file():
            original_media_url = self.podium_package_original_media_file().url()
        elif self.remote_media_file_url is not None:
            original_media_url = self.remote_media_file_url

        return original_media_url

    def original_media_url_cdn(self):
        original_media_url_cdn = None
        if self.podium_package_original_media_file():
            original_media_url_cdn = self.original_media_url().replace("https://podium-production.s3.amazonaws.com/", "https://d1v4hly0mxfbpv.cloudfront.net/")
        elif self.remote_media_file_url is not None:
            original_media_url_cdn = self.remote_media_file_url

        return original_media_url_cdn

    def podium_package_transcript_file(self):
        if self.podium_package_transcript_files and len(self.podium_package_transcript_files) > 0:
            return self.podium_package_transcript_files[0]
        else:
            return None

    def transcript_url(self):
        if self.podium_package_transcript_files and len(self.podium_package_transcript_files) > 0:
            return self.podium_package_transcript_file().url()
        else:
            return None

    def language_name(self):
        return self.podium_package_transcript_file().get_language_name()

    def initialize_process_attributes(self):
        if len(self.process_attributes) == 0:
            for process_attribute in PodiumPackage.default_process_attributes:
                podium_package_process_attribute = PodiumPackageProcessAttribute()
                podium_package_process_attribute.podium_package_id = self.id
                podium_package_process_attribute.key = process_attribute
                podium_package_process_attribute.value = 'false'
                podium_package_process_attribute.save()

        processing_configuration = core.data_models.PodiumPackageProcessingConfiguration()
        processing_configuration.podium_package_id = self.id
        processing_configuration.save()

    # ============================================================================================================================
    # FILE CREATION
    # ============================================================================================================================

    def create_readme_text_file(self):

        readme_text_file_path = self.get_temp_files_path() + "README.txt"

        with open(readme_text_file_path, "w") as readme_text_file:
            readme_text_file.write('Podium File Readme Documentation\n\n')
            readme_text_file.write('Thank you for using Podium! The file package you have downloaded contains the following items:\n\n')
            readme_text_file.write('**Shownotes.txt**\n')
            readme_text_file.write('This contains Episode Keywords, Episode Title Suggestions, Episode Show Notes Summary (with variations), and Chapters (with chapter summary variations)(). The chapters are specifically formatted to be identified by Fathom, Spotify, Youtube, and other high quality podcast players.\n\n')
            readme_text_file.write('**Highlights.txt**\n')
            readme_text_file.write('This contains a list of highlight clips that Podium\'s AI found noteworthy or interesting along with their timestamps and transcript segments.\n\n')
            readme_text_file.write('**Transcript.txt**\n')
            readme_text_file.write('This transcript is formatted for legibility. It contains timestamps and identifies the number of speakers. You will need to manually modify the speaker names and manually proof-read the transcript.\n\n')
            readme_text_file.write('**Transcript.vtt**\n')
            readme_text_file.write('This version of your transcript is formatted as WebVTT file that can be used for captions and subtitles by some applications. We recommend proof-reading this file and manually changing the speaker names.\n\n')
            readme_text_file.write('**Transcript.srt**\n')
            readme_text_file.write('This version of your transcript is formatted as an SRT file that can be used for captions and subtitles by some applications. We recommend proof-reading this file and manually changing the speaker names.\n\n')
            readme_text_file.write('Need Help?\n')
            readme_text_file.write('Contact us at hello@podium.page with any questions or concerns.\n\n')
            readme_text_file.write('Help us spread the word by tweeting about us at @PodiumDotPage and including us in your shownotes! https://podium.page\n')

    def create_transcript_text_file(self, transcript_file):

        transcript_text_file_path = self.get_temp_files_path() + 'Transcript.txt'

        transcript = transcript_file.get_content_with_speaker_names()

        with open(transcript_text_file_path, "w") as transcript_text_file:

            transcript_text_file.write('Transcript generated by Podium.page\n')
            transcript_text_file.write('Help us spread the word by tweeting about us at @podiumdotpage and including us in your shownotes! https://podium.page\n')

            number_of_speakers = transcript_file.get_number_of_speakers()
            if number_of_speakers > 1:
                transcript_text_file.write('\n')
                transcript_text_file.write(f'NOTE: There were {number_of_speakers} speakers identified in this transcript. Podium recommends using "Find and Replace" to change the speaker label to the appropriate name. Speaker separation errors can arise when multiple speakers speak simultaneously.\n')

            previous_speaker = None
            for monologue in transcript['monologues']:
                speaker = monologue['speaker_id']
                if speaker != previous_speaker:
                    start_times = [x['start'] for x in monologue['elements'] if x['type'] == 'text']
                    if len(start_times) > 0:
                        start_time = start_times[0]
                    else:
                        continue
                    transcript_text_file.write('\n')
                    transcript_text_file.write(f'{datetime.timedelta(seconds=round(start_time))} - {monologue["speaker_name"]}\n')
                    previous_speaker = speaker
                else:
                    transcript_text_file.write('\n')

                elements = [x['value'] for x in monologue['elements']]
                monologue_text = ''.join(elements)
                transcript_text_file.write(f'{monologue_text}\n')

            transcript_text_file.write('\n')
            transcript_text_file.write('Transcribed by https://podium.page\n')

    def convert_vtt_time_format(self, time_in_seconds):
        '''
        convert time from seconds to 00:00:00.000 or 00:00.000 format
        '''
        time_in_seconds = float(time_in_seconds)
        time = str(datetime.timedelta(seconds=time_in_seconds))
        if time_in_seconds >= 3600:
            if '.' in time:
                time = time[:time.find('.')+4]
            else:
                time = time + '.000'
            time = time.zfill(12)

        else:
            if '.' in time:
                time = time[time.find(':')+1:time.find('.')+4]
            else:
                time = time[time.find(':')+1:] + '.000'
            time = time.zfill(9)

        return time

    def create_transcript_vtt_file(self, transcript_file):
        transcript_vtt_file_path = self.get_temp_files_path() + "Transcript.vtt"

        transcript = transcript_file.get_content_with_speaker_names()

        # write elements to a text file
        number_of_speakers = transcript_file.get_number_of_speakers()
        with open(transcript_vtt_file_path, "w") as transcript_vtt_file:
            transcript_vtt_file.write('WEBVTT Kind: captions; Language: en\n\n')

            transcript_vtt_file.write(f'NOTE There were {number_of_speakers} speakers identified in this transcript. Podium recommends using "Find and Replace" to change the speaker label to the appropriate name. Speaker separation errors can arise when multiple speakers speak simultaneously. \n\n')
            self.write_vtt_transcript_from_monologues(transcript, transcript_vtt_file)

    def write_vtt_transcript_from_monologues(self, transcript, target_file):
        for monologue in transcript['monologues']:
            speaker = monologue['speaker_name']
            monologue_sentences_objects = self.podium_package_transcript_file().get_sentences({'monologues': [monologue]})

            if len(monologue_sentences_objects) > 0:
                for monologue_sentence_object in monologue_sentences_objects:
                    target_file.write(f'{self.convert_vtt_time_format(monologue_sentence_object["start"])} --> {self.convert_vtt_time_format(monologue_sentence_object["end"])}\n')
                    target_file.write(f'<v {speaker}>{monologue_sentence_object["content"]}\n\n')

            else:
                elements = [x['value'] for x in monologue['elements']]
                monologue_text = ''.join(elements)
                start_times = [x['start'] for x in monologue['elements'] if x['type'] == 'text']
                if len(start_times) > 0:
                    start_time = start_times[0]
                else:
                    continue
                end_time = [x['start'] for x in monologue['elements'] if x['type'] == 'text'][-1]

                target_file.write(f'{self.convert_vtt_time_format(start_time)} --> {self.convert_vtt_time_format(end_time)}\n')
                target_file.write(f'<v {speaker}>{monologue_text}\n\n')

    def create_transcript_srt_file(self, transcript_file):
        transcript_srt_file_path = self.get_temp_files_path() + "Transcript.srt"

        transcript = transcript_file.get_content_with_speaker_names()

        srt_counter = 1

        with open(transcript_srt_file_path, "w") as transcript_srt_file:
            for monologue in transcript['monologues']:
                speaker_name = monologue['speaker_name']
                monologue_sentences_objects = self.podium_package_transcript_file().get_sentences({'monologues': [monologue]}, max_chars_per_sentence=42)

                if len(monologue_sentences_objects) > 0:
                    for monologue_sentence_object in monologue_sentences_objects:
                        transcript_srt_file.write(f'{srt_counter}\n')
                        transcript_srt_file.write(f'{self.convert_srt_time_format(monologue_sentence_object["start"])} --> {self.convert_srt_time_format(monologue_sentence_object["end"])}\n')
                        transcript_srt_file.write(f'{speaker_name}: {monologue_sentence_object["content"]}\n\n')

                        srt_counter += 1

                else:
                    elements = [x['value'] for x in monologue['elements']]
                    monologue_text = ''.join(elements)
                    start_times = [x['start'] for x in monologue['elements'] if x['type'] == 'text']
                    if len(start_times) > 0:
                        start_time = start_times[0]
                    else:
                        continue
                    end_time = [x['end'] for x in monologue['elements'] if x['type'] == 'text'][-1]

                    transcript_srt_file.write(f'{srt_counter}\n')
                    transcript_srt_file.write(f'{self.convert_srt_time_format(start_time)} --> {self.convert_srt_time_format(end_time)}\n')
                    transcript_srt_file.write(f'{speaker_name}: {monologue_text}\n\n')
                    srt_counter += 1

    def convert_srt_time_format(self, time_in_seconds):
        # Convert time_in_seconds to timedelta
        td = datetime.timedelta(seconds=float(time_in_seconds))

        # Extract hours, minutes, seconds, and microseconds
        hours, remainder = divmod(td.seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        microseconds = td.microseconds

        # Format time string with zero-padding for hours
        time_str = f"{hours:02}:{minutes:02}:{seconds:02},{microseconds // 1000:03}"

        return time_str

    def write_highlights(self, target_file, transcript_file):
        transcript = transcript_file.get_content_with_speaker_names()
        transcript_words = transcript_file.get_words_and_punct()

        for preview in self.previews:
            if preview.title is not None:
                target_file.write(f'* {preview.title} | {datetime.timedelta(seconds=round(preview.start))} - {datetime.timedelta(seconds=round(preview.end))} ({round(preview.end - preview.start)} Seconds)\n\n')
                highlight_transcript_words = core.data_models.PodiumPackageTranscriptFile.get_words_between_start_end(transcript_words, float(preview.start), float(preview.end))

                # pp = pprint.PrettyPrinter(indent=4)
                # print(preview.title)
                # pp.pprint(highlight_transcript_sentences)
                # print('----------------------------------------------')

                self.write_highlights_from_monologues(highlight_transcript_words, target_file)
                target_file.write(f'----------------------------------------------\n\n')

    def write_highlights_from_monologues(self, highlight_transcript_words, target_file):
        elements = []
        previous_speaker_id = None
        for index, item in enumerate(highlight_transcript_words):
            if item['speaker_id'] != previous_speaker_id and 'start' in item:
                if len(elements) > 0:
                    monologue = "".join(elements)
                    target_file.write(f"{monologue} \n\n")

                elements = []
                elements.append(item['value'])
                previous_speaker_id = item['speaker_id']

                target_file.write(f"{datetime.timedelta(seconds=round(item['start']))} {item['speaker_name']}\n")
            else:
                elements.append(item['value'])

        monologue = "".join(elements)
        target_file.write(f"{monologue} \n\n")

    def create_highlights_text_file(self, transcript_file):
        highlights_text_file_path = self.get_temp_files_path() + "Highlights.txt"

        with open(highlights_text_file_path, "w") as highlights_text_file:
            highlights_text_file.write("Highlights generated by Podium.page\n")
            highlights_text_file.write("Help us spread the word by tweeting about us at @PodiumDotPage and including us in your show notes! https://podium.page")

            highlights_text_file.write(f"\n\n--------- HIGHLIGHTS ---------\n\n")

            for preview in self.previews:
                if preview.title is not None:
                    highlights_text_file.write(str(datetime.timedelta(seconds=round(preview.start))) + " - " + preview.title + " (" + str(round(preview.end - preview.start)) + " Seconds)\n")

            highlights_text_file.write(f"\n\n--------- HIGHLIGHTS WITH TRANSCRIPT ---------\n\n")
            self.write_highlights(highlights_text_file, transcript_file)

            highlights_text_file.write('Highlights created by https://podium.page\n')

    def write_shownotes_chapter_descriptions(self, target_file):

        target_file.write('Chapters:\n\n')

        # Order self.chapters by start time:
        chapters = sorted(self.chapters, key=lambda x: x.start, reverse=False)
        for index, chapter in enumerate(chapters):
            if index == 0:
                target_file.write(f'(0:00:00) - {chapter.description}\n')
            else:
                target_file.write(f'({datetime.timedelta(seconds=round(chapter.start))}) - {chapter.description}\n')

    def write_shownotes_chapter_summaries(self, target_file):

        target_file.write('Chapter Summaries:\n\n')

        chapters = sorted(self.chapters, key=lambda x: x.start, reverse=False)
        for index, chapter in enumerate(chapters):
            if index == 0:
                target_file.write(f'0:00:00 - {chapter.description} ({round((chapter.end - chapter.start)/60)} Minutes)\n')
                target_file.write(f'{chapter.summary}\n\n')
            else:
                target_file.write(f'{datetime.timedelta(seconds=round(chapter.start))} - {chapter.description} ({round((chapter.end - chapter.start)/60)} Minutes)\n')
                target_file.write(f'{chapter.summary}\n\n')


    def create_shownotes_text_file(self):

        shownotes_rtf_file_path = self.get_temp_files_path() + "Shownotes.rtf"
        shownotes_text_file_path = self.get_temp_files_path() + "Shownotes.txt"


        try:
            asset = core.data_models.PodiumPackageAsset \
                            .where('podium_package_id', self.id) \
                            .where('type', 'show_notes_summary') \
                            .order_by('updated_at', 'desc') \
                            .first()
            print("download here:")
            template = core.data_models.PodiumShowNotesTemplates.where('user_id', self.user_id).first()
            if template is None and asset.editor_content_text is None:
                with open(shownotes_rtf_file_path, 'w') as shownotes_text_file:
                    shownotes_text_file.write(r"{\rtf1\ansi\ansicpg1252\deff0\nouicompat{\fonttbl{\f0\fnil\fcharset0 Calibri;}}\viewkind4\uc1 ")
                    shownotes_text_file.write(r"\b Show notes generated by Podium.page\b0\par\n")
                    shownotes_text_file.write(r"\b Help us spread the word by tweeting about us at @PodiumDotPage and including us in your show notes! https://podium.page\b0\par\n")

                    # Writing episode keywords
                    shownotes_text_file.write(r"\b--------- EPISODE KEYWORDS ---------\b0\par\n")
                    shownotes_text_file.write(f"{self.keywords}\par\n")

                    # Writing episode title suggestions
                    shownotes_text_file.write(r"\b--------- EPISODE TITLE SUGGESTIONS ---------\b0\par\n")
                    split_titles = self.title.split("\n")
                    for split_title in split_titles:
                        shownotes_text_file.write(f"- {split_title}\par\n")

                    # Writing episode summary
                    shownotes_text_file.write(r"\b--------- EPISODE SUMMARY ---------\b0\par\n")
                    shownotes_text_file.write(self.summary + r"\par\n")

                    # Writing alternative summaries
                    summary_asset_variations = core.data_models.PodiumPackageAsset \
                        .where('podium_package_id', self.id) \
                        .where('type', 'show_notes_summary') \
                        .where('variation_type', 'alternative') \
                        .order_by('id', 'desc') \
                        .get()

                    if len(summary_asset_variations) > 0:
                        for summary_asset_variation in summary_asset_variations:
                            shownotes_text_file.write(r"\b--------- EPISODE SUMMARY ALTERNATIVE ---------\b0\par\n")
                            shownotes_text_file.write(summary_asset_variation.content + r"\par\n")

                    # Writing episode chapters
                    shownotes_text_file.write(r"\b--------- EPISODE CHAPTERS ---------\b0\par\n")
                    for chapter in self.chapters:
                        shownotes_text_file.write(f"({str(datetime.timedelta(seconds=round(chapter.start)))}) - {chapter.description}\par\n")

                    # Writing chapters with short key points
                    shownotes_text_file.write(r"\b--------- EPISODE CHAPTERS WITH SHORT KEY POINTS ---------\b0\par\n")
                    for chapter in self.chapters:
                        shownotes_text_file.write(f"({str(datetime.timedelta(seconds=round(chapter.start)))}) - {chapter.description}")

                        asset = core.data_models.PodiumPackageAsset \
                            .where('podium_package_chapter_id', chapter.id) \
                            .where('variation_type', 'short_key_points') \
                            .first()

                        if asset is not None:
                            short_key_points = asset.content
                            shownotes_text_file.write(f"\n{short_key_points}\par\n")
                        else:
                            shownotes_text_file.write(r"\par\n")

                    # Writing chapters with full summaries
                    shownotes_text_file.write(r"\b--------- EPISODE CHAPTERS WITH FULL SUMMARIES ---------\b0\par\n")
                    for chapter in self.chapters:
                        shownotes_text_file.write(f"({str(datetime.timedelta(seconds=round(chapter.start)))}) - {chapter.description} "
                                                f"({str(round((chapter.end - chapter.start) / 60))} Minutes)\par\n")
                        shownotes_text_file.write(chapter.summary + r"\par\n")

                    # Writing footer
                    shownotes_text_file.write(r"Show notes created by https://podium.page\par\n")

                    # Closing RTF document
                    shownotes_text_file.write("}")

                with open(shownotes_text_file_path, "w") as shownotes_text_file:
                    shownotes_text_file.write("Show notes generated by Podium.page\n")
                    shownotes_text_file.write("Help us spread the word by tweeting about us at @PodiumDotPage and including us in your show notes! https://podium.page")

                    shownotes_text_file.write(f"\n\n--------- EPISODE KEYWORDS ---------\n\n{self.keywords}")

                    shownotes_text_file.write(f"\n\n\n--------- EPISODE TITLE SUGGESTIONS ---------\n\n")
                    split_titles = self.title.split("\n")
                    for split_title in split_titles:
                        shownotes_text_file.write(f"- {split_title}\n")

                    shownotes_text_file.write(f"\n\n--------- EPISODE SUMMARY ---------\n\n")
                    shownotes_text_file.write(self.summary)

                    summary_asset_variations = core.data_models.PodiumPackageAsset \
                        .where('podium_package_id', self.id) \
                        .where('type', 'show_notes_summary') \
                        .where('variation_type', 'alternative') \
                        .order_by('id', 'desc') \
                        .get()

                    if len(summary_asset_variations) > 0:
                        for summary_asset_variation in summary_asset_variations:
                            shownotes_text_file.write(f"\n\n\n--------- EPISODE SUMMARY ALTERNATIVE ---------\n\n")
                            shownotes_text_file.write(summary_asset_variation.content)

                    shownotes_text_file.write(f"\n\n\n--------- EPISODE CHAPTERS ---------\n\n")
                    for chapter in self.chapters:
                        shownotes_text_file.write("(" + str(datetime.timedelta(seconds=round(chapter.start))) + ") - " + chapter.description + "\n")

                    shownotes_text_file.write(f"\n\n--------- EPISODE CHAPTERS WITH SHORT KEY POINTS ---------\n\n")
                    for chapter in self.chapters:
                        shownotes_text_file.write("(" + str(datetime.timedelta(seconds=round(chapter.start))) + ") - " + chapter.description)

                        asset = core.data_models.PodiumPackageAsset \
                            .where('podium_package_chapter_id', chapter.id) \
                            .where('variation_type', 'short_key_points') \
                            .first()

                        if asset is not None:
                            short_key_points = asset.content
                            shownotes_text_file.write("\n" + short_key_points + "\n\n")
                        else:
                            shownotes_text_file.write("\n\n")

                    shownotes_text_file.write(f"\n--------- EPISODE CHAPTERS WITH FULL SUMMARIES ---------\n\n")
                    for chapter in self.chapters:
                        shownotes_text_file.write("(" + str(datetime.timedelta(seconds=round(chapter.start))) + ") - " + chapter.description + " (" + str(round((chapter.end - chapter.start)/60)) + " Minutes)\n\n")
                        shownotes_text_file.write(chapter.summary + "\n\n")

                    shownotes_text_file.write("Show notes created by https://podium.page\n")

            elif asset.editor_content_text is not None:
                with open(shownotes_rtf_file_path, 'w') as shownotes_text_file:
                    print(asset.editor_content_text,"asset.editor_content_text")
                    shownotes_text_file.write("{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat{\\fonttbl{\\f0\\fnil\\fcharset0 Calibri;}}\\viewkind4\\uc1 ")
                    shownotes_text_file.write(asset.editor_content_text)
                    shownotes_text_file.write("}")

                with open(shownotes_text_file_path, 'w') as shownotes_text_file:
                    shownotes_text_file.write(asset.content_text)

                    # data = asset.editor_content_json
                    # for block in data:
                    #     if block["type"] == "heading":
                    #         # Extract the heading text
                    #         heading_text = block["content"][0]["text"]
                    #         shownotes_text_file.write(f"\n\n--------- {heading_text} ---------\n\n")
                    #     elif block["type"] == "paragraph" and "content" in block:
                    #         # Write the paragraph text in a new line
                    #         for paragraph in block["content"]:
                    #             if paragraph["type"] == "text":
                    #                 shownotes_text_file.write(f"{paragraph['text']}\n")
                    #             elif paragraph["type"] == "hardBreak":
                    #                 shownotes_text_file.write("\n")  # Add a line break for hardBreaks
                    #     shownotes_text_file.write("\n")  # Extra new line between paragraphs


            elif template is not None and asset.editor_content_text is None :
                 # Writing the RTF file
                with open(shownotes_rtf_file_path, 'w') as shownotes_rtf_file:
                    # Writing RTF header
                    shownotes_rtf_file.write("{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Courier;}}\n")
                    shownotes_rtf_file.write("\\b Show notes generated by Podium.page\\b0\\par\n")  # Bold format

                    # Writing the TXT file
                    with open(shownotes_text_file_path, 'w') as shownotes_txt_file:
                        # shownotes_txt_file.write("Show notes generated by Podium.page\n\n")  # Plain text header
                        shownotes_text_file.write(asset.content_text)
                        for note in template.templates:
                            summary_asset_variations = core.data_models.PodiumPackageAsset \
                                .where('podium_package_id', self.id) \
                                .where('type', 'show_notes_summary') \
                                .where('variation_type', 'alternative') \
                                .order_by('id', 'desc') \
                                .get()

                            if note == 'Chapters with timestamps:':
                                shownotes_rtf_file.write("\\b Chapters with timestamps \\b0\\par\n\n")
                                # shownotes_txt_file.write("Chapters with timestamps:\n\n")

                                for chapter in self.chapters:
                                    time_str = str(datetime.timedelta(seconds=round(chapter.start)))
                                    shownotes_rtf_file.write(f"({time_str}) - {chapter.description}\\par\n")
                                    # shownotes_txt_file.write(f"({time_str}) - {chapter.description}\n")

                            elif note == 'Chapters with Summaries:':
                                shownotes_rtf_file.write("\\b Chapters with Summaries \\b0\\par\n\n")
                                # shownotes_txt_file.write("Chapters with Summaries:\n\n")

                                for chapter in self.chapters:
                                    time_str = str(datetime.timedelta(seconds=round(chapter.start)))
                                    duration_str = str(round((chapter.end - chapter.start) / 60))
                                    shownotes_rtf_file.write(f"({time_str}) - {chapter.description} ({duration_str} Minutes)\\par\n\n")
                                    shownotes_rtf_file.write(f"{chapter.summary}\\par\n\n")
                                    # shownotes_txt_file.write(f"({time_str}) - {chapter.description} ({duration_str} Minutes)\n")
                                    # shownotes_txt_file.write(f"{chapter.summary}\n\n")

                            elif note == 'Highlights:':
                                shownotes_rtf_file.write("\\b Highlights \\b0\\par\n")
                                # shownotes_txt_file.write("Highlights:\n")

                                for preview in self.previews:
                                    if preview.title is not None:
                                        time_str = str(datetime.timedelta(seconds=round(preview.start)))
                                        duration_str = str(round(preview.end - preview.start))
                                        shownotes_rtf_file.write(f"{time_str} - {preview.title} ({duration_str} Seconds)\\par\n")
                                        # shownotes_txt_file.write(f"{time_str} - {preview.title} ({duration_str} Seconds)\n")

                                shownotes_rtf_file.write("\\b Highlights with Transcript \\b0\\par\n")
                                # shownotes_txt_file.write("\nHighlights with Transcript:\n")
                                transcript_file = self.podium_package_transcript_file()
                                self.write_highlights(shownotes_rtf_file, transcript_file)
                                self.write_highlights(shownotes_txt_file, transcript_file)

                            elif note == 'Name of Episode:':
                                shownotes_rtf_file.write("\\b Name of Episode \\b0\\par\n")
                                # shownotes_txt_file.write("Name of Episode:\n")

                                podcast = core.data_models.PodcastEpisode.where('podcast_id', self.podcast_id).first()
                                if podcast:
                                    shownotes_rtf_file.write(f"{podcast.title}\\par\n\n")
                                    # shownotes_txt_file.write(f"{podcast.title}\n\n")

                            elif note == 'Episode Summary:':
                                shownotes_rtf_file.write("\\b Episode Summary \\b0\\par\n")
                                # shownotes_txt_file.write("Episode Summary:\n")
                                shownotes_rtf_file.write(f"{self.summary}\\par\n\n")
                                # shownotes_txt_file.write(f"{self.summary}\n\n")

                            elif note == 'Keywords:':
                                shownotes_rtf_file.write("\\b Keywords \\b0\\par\n")
                                # shownotes_txt_file.write("Keywords:\n")
                                shownotes_rtf_file.write(f"{self.keywords}\\par\n")
                                # shownotes_txt_file.write(f"{self.keywords}\n")

                            else:
                                print("Warning: Unknown", note)
                                shownotes_rtf_file.write(f"\\b {note}  \\b0\\par\n")
                                # shownotes_txt_file.write(f"{note}:\n")

                                composed_prompt = self.generate_gpt_response(note)
                                shownotes_rtf_file.write(f"{composed_prompt}\\par\n")
                                # shownotes_txt_file.write(f"{composed_prompt}\n")
                        
                        # Closing the RTF document
                        shownotes_rtf_file.write("}")



        except Exception as e:
            print(f"An error occurred: {e}")
            with open(shownotes_rtf_file_path, "w") as shownotes_text_file:
                shownotes_text_file.write("Show notes generated by Podium.page\n")
                shownotes_text_file.write("Help us spread the word by tweeting about us at @PodiumDotPage and including us in your show notes! https://podium.page")

                shownotes_text_file.write(f"\n\n--------- EPISODE KEYWORDS ---------\n\n{self.keywords}")

                shownotes_text_file.write(f"\n\n\n--------- EPISODE TITLE SUGGESTIONS ---------\n\n")
                split_titles = self.title.split("\n")
                for split_title in split_titles:
                    shownotes_text_file.write(f"- {split_title}\n")

                shownotes_text_file.write(f"\n\n--------- EPISODE SUMMARY ---------\n\n")
                shownotes_text_file.write(self.summary)

                summary_asset_variations = core.data_models.PodiumPackageAsset \
                    .where('podium_package_id', self.id) \
                    .where('type', 'show_notes_summary') \
                    .where('variation_type', 'alternative') \
                    .order_by('id', 'desc') \
                    .get()

                if len(summary_asset_variations) > 0:
                    for summary_asset_variation in summary_asset_variations:
                        shownotes_text_file.write(f"\n\n\n--------- EPISODE SUMMARY ALTERNATIVE ---------\n\n")
                        shownotes_text_file.write(summary_asset_variation.content)

                shownotes_text_file.write(f"\n\n\n--------- EPISODE CHAPTERS ---------\n\n")
                for chapter in self.chapters:
                    shownotes_text_file.write("(" + str(datetime.timedelta(seconds=round(chapter.start))) + ") - " + chapter.description + "\n")

                shownotes_text_file.write(f"\n\n--------- EPISODE CHAPTERS WITH SHORT KEY POINTS ---------\n\n")
                for chapter in self.chapters:
                    shownotes_text_file.write("(" + str(datetime.timedelta(seconds=round(chapter.start))) + ") - " + chapter.description)

                    asset = core.data_models.PodiumPackageAsset \
                        .where('podium_package_chapter_id', chapter.id) \
                        .where('variation_type', 'short_key_points') \
                        .first()

                    if asset is not None:
                        short_key_points = asset.content
                        shownotes_text_file.write("\n" + short_key_points + "\n\n")
                    else:
                        shownotes_text_file.write("\n\n")

                shownotes_text_file.write(f"\n--------- EPISODE CHAPTERS WITH FULL SUMMARIES ---------\n\n")
                for chapter in self.chapters:
                    shownotes_text_file.write("(" + str(datetime.timedelta(seconds=round(chapter.start))) + ") - " + chapter.description + " (" + str(round((chapter.end - chapter.start)/60)) + " Minutes)\n\n")
                    shownotes_text_file.write(chapter.summary + "\n\n")

                shownotes_text_file.write("Show notes created by https://podium.page\n")

    def create_podiumGPT_text_file(self):

        podiumGPT_text_file_path = self.get_temp_files_path() + "PodiumGPT.txt"

        podium_gpt_documents = core.data_models.PodiumPackageAsset \
            .where('podium_package_id', self.id) \
            .where('type', 'document') \
            .order_by('created_at', 'asc') \
            .get()

        if len(podium_gpt_documents) > 0:
            with open(podiumGPT_text_file_path, "w") as podiumGPT_text_file:
                podiumGPT_text_file.write("Generated by Podium.page\n")

                for document in podium_gpt_documents:
                    podiumGPT_text_file.write(f"\n\n\n{document.title}")
                    podiumGPT_text_file.write(f"\n\n\n{document.content}")
                    podiumGPT_text_file.write(f"\n\n\n-----------------------------------------------")

    def package_files(self):
        self.log('Zipping and writing files')

        self = self.fresh(with_=['chapters'])

        # only genrate the file package if everything has been generated
        if self.has_generated_vector() and self.has_generated_previews() and self.has_generated_chapters() and self.has_generated_summary():

            transcript_file = self.podium_package_transcript_file()
            transcript_file.load_content()
            transcript = transcript_file.apply_speaker_edits(transcript_file.content)
            transcript_file.content = transcript

            self.create_transcript_text_file(transcript_file)
            self.create_transcript_vtt_file(transcript_file)
            self.create_transcript_srt_file(transcript_file)
            self.create_highlights_text_file(transcript_file)
            self.create_shownotes_text_file()
            self.create_podiumGPT_text_file()
            self.create_readme_text_file()

            zip_file_path = self.get_temp_files_path() + "files.zip"

            #delete existing zip file from temp folder
            if os.path.exists(zip_file_path):
                os.remove(zip_file_path)

            with ZipFile(zip_file_path, 'w') as zip_file:
                for file in os.listdir(self.get_temp_files_path()):

                    #change file name add


                    filename = file.split('.')


                    filename.insert(1, '-'+str(self.original_filename).replace('.','-')+'.')

                    filename = ''.join(filename)
                    filename = filename.replace(' ','-')
                    filename = filename.replace('/','-')
                    #replace all special characters except . and -
                    filename = re.sub(r'[^\w\s.-]', '-', filename)



                    if file != "files.zip":
                        zip_file.write(self.get_temp_files_path() + file, filename)

            s3_bucket = "podium-production"
            s3_key = f"podium_packages/zip_packages/{self.guid}/podium-{self.guid}.zip"

            s3 = boto3.client('s3', aws_access_key_id=core.env['aws_access_key'], aws_secret_access_key=core.env['aws_access_secret'])
            s3.upload_file(Filename=zip_file_path, Bucket=s3_bucket, Key=s3_key)

            self.set_process_attribute('package_generated', 'true')
            unsubscribe_email_confirmation = core.data_models.PodiumUserSetting.get(self.user_id, 'unsubscribe_confirmation_emails')
            if unsubscribe_email_confirmation != 'true':
                self.send_user_email("d-35017e9c8ea84cf3ac8ebc5af99106b5")

    def get_signed_url(self):
        # use boto3 to generate a signed url for the zip file
        s3_bucket = "podium-production"
        s3_key = f"podium_packages/zip_packages/{self.guid}/podium-{self.guid}.zip"




        s3 = boto3.client('s3', aws_access_key_id=core.env['aws_access_key'], aws_secret_access_key=core.env['aws_access_secret'])
        url = s3.generate_presigned_url('get_object', Params={'Bucket': s3_bucket, 'Key': s3_key,'ResponseContentDisposition': 'attachment; filename ="' + self.get_filename() + '.zip"'}, ExpiresIn=3600)

        return url

    # ============================================================================================================================
    # PodiumGPT
    # ============================================================================================================================

    def get_composed_prompt(self, prompt):
        composed_prompt = ''

        if prompt[-1] != ".":
            prompt += "."

        prompt = prompt.strip()

        composed_prompt += self.get_podiumGPT_prompt_v2(prompt=prompt)
        podcast_episode = "podcast episode"
        episode = "Episode"
        content_type = self.content_type
        if content_type:
            podcast_episode = content_type
        else:
            if self.podium_project:
                if self.podium_project.content_type:
                    podcast_episode = self.podium_project.content_type

        if podcast_episode.lower() == 'podcast':
            episode = 'Podcast'
            podcast_episode = 'podcast episode'
        elif podcast_episode.lower() == 'religious':
            episode = 'Religious'
            podcast_episode = 'Spirtual Talk'
        elif podcast_episode.lower() == 'educational':
            episode = 'Lesson'
            podcast_episode = 'educational episode'
        elif podcast_episode.lower() == 'video':
            episode = 'Video'
            podcast_episode = 'video'
        elif podcast_episode.lower() == 'meeting':
            episode = 'Meeting'
            podcast_episode = 'meeting'
        elif podcast_episode.lower() == 'customer_call':
            episode = 'Call'    
            podcast_episode = 'customer call'
        else:
            episode = podcast_episode


        composed_prompt += f"\n\nBe sure to write for the {episode} using the {episode} overview information - for instance, if asked to summarize, you'd create a summary for the {episode}, not the literal {episode} overview provided.\n\nBe sure to write in the {self.language_name()} language."
        print("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%")
        print(composed_prompt)
        print("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%")

        return composed_prompt

    def get_filename(self):
        file_name = str(self.original_filename).replace('.','-')
        file_name = file_name.replace('/','-')
        file_name = file_name + '-Podium'
        file_name = file_name.replace(' ','-')
        file_name = re.sub(r'[^\w\s.-]', '-', file_name)
        return file_name


    def generate_document(self, prompt):
        """
        Generate a document using gpt-4o.

        :param prompt: The prompt to use for the gpt-4o engine.
        :param parent_document (optional): The PodiumPackageGeneratedDocument to use as the prompt content, instead of the PodiumPackage prompt content.
        """
        composed_prompt = self.get_composed_prompt(prompt)

        token_count = core.text.count_number_of_tokens(composed_prompt, model='gpt-4o')
        max_tokens = int(8150 - token_count)

        if max_tokens > 2048:
            max_tokens = 2048

        #document = core.inference.gpt3_api(composed_prompt, 'text-davinci-003', max_tokens = 1150, temperature = 0.7, frequency_penalty = 0.5, presence_penalty = 0)
        document = core.inference.gpt_chat_api_single_prompt(composed_prompt, 'gpt-4o', max_tokens=max_tokens, temperature=1.2, top_p=0.8, allow_fallback=True)

        generated_document = core.data_models.PodiumPackageGeneratedDocument()
        generated_document.podium_package_id = self.id
        generated_document.prompt = prompt
        generated_document.document = document
        generated_document.save()

        generated_document = generated_document.fresh()

        return generated_document

    def generate_document_stream(self, prompt):
        """
        Stream the generation of a document from gpt-4o.

        :param prompt: The prompt to use for the gpt-4o engine.
        :param parent_document (optional): The PodiumPackageGeneratedDocument to use as the prompt content, instead of the PodiumPackage prompt content.
        """

        composed_prompt = self.get_composed_prompt(prompt)

        token_count = core.text.count_number_of_tokens(composed_prompt, model='gpt-4o')
        max_tokens = int(8150 - token_count)

        if max_tokens > 2048:
            max_tokens = 2048

        document_parts = []

        generated_document = core.data_models.PodiumPackageGeneratedDocument()
        generated_document.podium_package_id = self.id
        generated_document.prompt = prompt
        generated_document.document = ''.join(document_parts)
        generated_document.save()
        generated_document = generated_document.fresh()

        asset = core.data_models.PodiumPackageAsset \
            .where('podium_package_generated_document_id', generated_document.id) \
            .first()

        yield '{GUID ' + asset.guid + '}'

        for chunk in core.inference.gpt_chat_api_single_prompt_stream(composed_prompt, 'gpt-4o', max_tokens=max_tokens, temperature=1.2, top_p=0.8):
            if 'content' in chunk['choices'][0]['delta']:
                document_parts.append(chunk['choices'][0]['delta']['content'])
            yield json.dumps(chunk)

        generated_document.document = ''.join(document_parts)
        generated_document.save()

        yield '{FINISHED}'

    def get_podiumGPT_prompt_v1(self):
        self = self.fresh(with_=['chapters'])

        if self.podiumGPT_prompt is None or self.podiumGPT_prompt == "":
            max_prompt_word_length = 2000
            include_highlights_threshold = 0.9
            composed_prompt = """
    The following is an overview of a podcast episode:
    [Begin Overview]
            """

            composed_prompt += f"\n\nEpisode Title:\n{self.title}\n\n"
            composed_prompt += "Episode Summary:\n"
            composed_prompt += self.summary + "\n\n"
            composed_prompt += "Chapter Summaries:\n\n"
            for chapter in self.chapters:
                chapter_summary = "(" + str(datetime.timedelta(seconds=round(chapter.start))) + ") - " + chapter.description + " (" + str(round((chapter.end - chapter.start)/60)) + " Minutes)\n"
                chapter_summary += chapter.summary + "\n\n"
                if len(composed_prompt.split()) + len(chapter_summary.split()) < max_prompt_word_length:
                    composed_prompt += chapter_summary
                else:
                    break

            if len(composed_prompt.split()) < max_prompt_word_length - 300:
                composed_prompt += "Highlights:\n\n"

                transcript_sentences = self.podium_package_transcript_file().get_sentences()
                for preview in self.previews:
                    if preview.title is not None:
                        highlight =  f"Highlight Title: {preview.title}\n"
                        highlight += str(datetime.timedelta(seconds=round(preview.start))) + " - " + str(datetime.timedelta(seconds=round(preview.end))) + " (" + str(round(preview.end - preview.start)) + " Seconds)\n\n"

                        highlight_transcript_sentences = core.data_models.PodiumPackageTranscriptFile.get_sentences_between_start_end(transcript_sentences, preview.start, preview.end)
                        highlight_transcript_sentences_contents = [sentence['content'] for sentence in highlight_transcript_sentences]
                        highlight_transcript = " ".join(highlight_transcript_sentences_contents)
                        highlight += f"Highlight Transcript: \"{highlight_transcript}\"" + "\n\n"

                        if len(composed_prompt.split()) + len(highlight.split()) < max_prompt_word_length:
                            composed_prompt += highlight
                        else:
                            break

            composed_prompt += "\n[End Overview]"
            composed_prompt += "\n\nUsing the podcast episode overview above - "
            self.podiumGPT_prompt = composed_prompt
            self.save()

        return self.podiumGPT_prompt

    def get_podiumGPT_prompt_v2(self, prompt = '', max_prompt_token_length = 6240, force=False):
        print(" self.id", self.id)
        self = self.fresh(with_=['chapters', 'vectors'])

        # if self.podiumGPT_prompt is None or self.podiumGPT_prompt == "" or force == True:

            # Religious
            # Podcast
            # Educational
            # Video
            # Meeting
            # Customer Call
        podcast_episode = "Podcast episode"
        episode = "Podcast"
        content_type = self.content_type
        if content_type:
            podcast_episode = content_type
        else:
            if self.podium_project:
                if self.podium_project.content_type:
                    podcast_episode = self.podium_project.content_type

        if podcast_episode.lower() == 'podcast':
            episode = 'Podcast'
            podcast_episode = 'podcast episode'
        elif podcast_episode.lower() == 'religious':
            episode = 'Religious'
            podcast_episode = 'Spirtual Talk'
        elif podcast_episode.lower() == 'educational':
            episode = 'Lesson'
            podcast_episode = 'educational episode'
        elif podcast_episode.lower() == 'video':
            episode = 'Video'
            podcast_episode = 'video'
        elif podcast_episode.lower() == 'meeting':
            episode = 'Meeting'
            podcast_episode = 'meeting'
        elif podcast_episode.lower() == 'customer_call':
            episode = 'Call'    
            podcast_episode = 'customer call'
        else:
            episode = podcast_episode

        composed_prompt = f"""
                            The following is an overview of a {podcast_episode}:
                            [Begin Overview]
                        """

        composed_prompt += f"\n\n{episode} Title:\n{self.title}\n\n"
        composed_prompt += f"{episode} Summary:\n"
        composed_prompt += self.summary + "\n\n"

        composed_prompt += "Chapter Summaries:\n\n"
        init_num_tokens = core.text.count_number_of_tokens(composed_prompt, model='gpt-4o')
        previous_num_tokens = init_num_tokens
        for chapter in self.chapters:
            chapter_summary = "(" + str(datetime.timedelta(seconds=round(chapter.start))) + ") - " + chapter.description + " (" + str(round((chapter.end - chapter.start)/60)) + " Minutes)\n"
            chapter_summary += chapter.summary + "\n\n"
            num_tokens = previous_num_tokens + core.text.count_number_of_tokens(chapter_summary, model='gpt-4o')
            if num_tokens < max_prompt_token_length:
                composed_prompt += chapter_summary
                previous_num_tokens = num_tokens
            else:
                # In case that with the first chapter summary it gets too long, we just truncate it.
                if previous_num_tokens == init_num_tokens:
                    composed_prompt += chapter.summary
                    truncated_composed_prompt = core.text.truncate_text_by_number_of_tokens(input_text=composed_prompt, desired_num_tokens=max_prompt_token_length, model='gpt-4o')
                    composed_prompt = truncated_composed_prompt + "\n\n"
                    previous_num_tokens = core.text.count_number_of_tokens(composed_prompt, model='gpt-4o')
                break

        # At least 300 tokens left for the transcript samples.
        if max_prompt_token_length > previous_num_tokens + 300:
            composed_prompt += "Transcript Samples From Key Chapters:\n\n"
            max_transcript_token_length = max_prompt_token_length - previous_num_tokens
            composed_prompt += self.get_podiumGPT_chapter_transcripts(max_transcript_token_length)

        composed_prompt += "\n[End Overview]"
        composed_prompt += f"\n\nUsing the {podcast_episode} overview above - "
        self.podiumGPT_prompt = composed_prompt
        self.save()

        return self.podiumGPT_prompt + prompt

    def get_podiumGPT_chapter_transcripts(self, max_token_length=7800):
        chapters = core.data_models.PodiumPackageChapter.where('podium_package_id', self.id).order_by('start', 'asc').get()
        transcript_file = self.podium_package_transcript_file()
        transcript_sentences = transcript_file.get_sentences()
        package_vector = core.data_models.PodiumPackageVector.where('podium_package_id', self.id).first()
        composed_transcript = ""

        if len(chapters) == 0:
            return self.get_podiumGPT_transcript(max_token_length)
        if chapters[0].podium_package_chapter_vector is None:
            return self.get_podiumGPT_transcript(max_token_length)
        if package_vector is None:
            return self.get_podiumGPT_transcript(max_token_length)

        scored_chapters = []
        for index, chapter in enumerate(chapters):
            chapter_vector = chapter.podium_package_chapter_vector
            scored_chapter_object = {
                'chapter': chapter,
                'score': 0.0,
                'transcript_sentences': []
            }
            if chapter_vector is not None:
                score = package_vector.cosine_similarity(chapter_vector.vector)
                scored_chapter_object['score'] = score

            # We'll always include the first chapter
            if index == 0:
                scored_chapter_object['score'] = 1.0

            scored_chapters.append(scored_chapter_object)

        scored_chapters = sorted(scored_chapters, key=lambda x: x['score'], reverse=True)

        previous_num_tokens = 0
        for scored_chapter in scored_chapters:
            chapter = scored_chapter['chapter']
            chapter_sentences = core.data_models.PodiumPackageTranscriptFile.get_sentences_between_start_end(transcript_sentences, chapter.start, chapter.end)

            for sentence in chapter_sentences:
                num_tokens = previous_num_tokens + core.text.count_number_of_tokens(sentence['content'], model='gpt-4o')
                if num_tokens < max_token_length:
                    scored_chapter['transcript_sentences'].append(sentence)
                    previous_num_tokens = num_tokens
                else:
                    break

        # resort by start time
        scored_chapters = sorted(scored_chapters, key=lambda x: x['chapter'].start, reverse=False)
        for scored_chapter in scored_chapters:
            if len(scored_chapter['transcript_sentences']) > 5:
                composed_transcript += "Chapter '" + scored_chapter['chapter'].description + "' Transcript:\n"
                for sentence in scored_chapter['transcript_sentences']:
                    composed_transcript += sentence['content'] + "\n"
                composed_transcript += "\n\n"

        return composed_transcript

    def get_podiumGPT_transcript(self, max_token_length=7800):
        transcript_sentences = self.podium_package_transcript_file().get_sentences()

        composed_transcript = ""
        previous_num_tokens = 0
        for sentence in transcript_sentences:
            num_tokens = previous_num_tokens + core.text.count_number_of_tokens(sentence['content'], model='gpt-4o')
            if num_tokens < max_token_length:
                composed_transcript += sentence['content'] + "\n"
                previous_num_tokens = num_tokens
            else:
                # In case that with the first sentence it gets too long, we just truncate it.
                if previous_num_tokens == 0:
                    composed_transcript += sentence['content']
                    truncated_composed_transcript = core.text.truncate_text_by_number_of_tokens(input_text=composed_transcript, desired_num_tokens=max_token_length, model='gpt-4o')
                    composed_transcript = truncated_composed_transcript + "\n"
                break

        return composed_transcript

    # ============================================================================================================================
    # PROCESSING
    # ============================================================================================================================

    def processing_allowed(self):
        return self.system_processing_allowed() and self.podium_processing_allowed()

    def system_processing_allowed(self):
        if not SystemFlag.is_active('podium_processing_enabled'):
            self.log("PROCESSING NOT ALLOWED DUE SYSTEM FLAG")
            return False

        return True

    #TODO might replace this with something specific to podium
    def podium_processing_allowed(self):
        return True

    @scope
    def system_processing_enabled(self, query):
        return query \
            .where_raw(SystemFlag.where_raw_is_active("podium_processing_enabled"))

    #TODO update later with podium specific logic
    @scope
    def ready_to_process(self, query):
        return query \
            .where('podium_packages.error', None) \
            .system_processing_enabled()

    @scope
    def order_by_processing_priority(self, query):
        return query.order_by_raw("podium_packages.publication_date desc nulls last")

    @scope
    def order_by_processing_priority_performance_alt(self, query):
        return query.order_by_raw("podium_packages.publication_date is null asc, podium_packages.publication_date desc")

    @staticmethod
    def needs_pre_processing_ids(limit=100, excluding=[]):
        needs_audio_storage_ids = core.data_models.PodiumPackage.dataset_should_store_media() \
            .where_not_in('podium_packages.id', excluding) \
            .order_by_processing_priority_performance_alt() \
            .limit(limit) \
            .select('podium_packages.id') \
            .lists('id') \
            .all()

        needs_transcription_ids = core.data_models.PodiumPackage.dataset_should_request_transcription() \
            .where_not_in('podium_packages.id', excluding) \
            .order_by_processing_priority_performance_alt() \
            .limit(limit) \
            .select('podium_packages.id') \
            .lists('id') \
            .all()

        needs_pre_processing_ids = list(set(needs_audio_storage_ids + needs_transcription_ids))

        return needs_pre_processing_ids

    def pre_process(self):
        #self.determine_if_api_free_trial()
        self.store_media_if_needed()
        self.make_media_readable()
        self.verify_media_exists()
        self.transcode_media_to_mp3_if_needed()
        self.verify_audio_exists()
        self.request_transcription()
        self.associate_podcast_episode()

    @staticmethod
    def needs_post_processing_ids(limit=100, excluding=[]):
        needs_store_transcription_ids = core.data_models.PodiumPackage.dataset_should_store_transcription() \
            .where_not_in('podium_packages.id', excluding) \
            .order_by_processing_priority_performance_alt() \
            .limit(limit) \
            .select('podium_packages.id') \
            .lists('id') \
            .all()

        needs_generate_vector_ids = core.data_models.PodiumPackage.dataset_should_generate_vector() \
            .where_not_in('podium_packages.id', excluding) \
            .order_by_processing_priority_performance_alt() \
            .limit(limit) \
            .select('podium_packages.id') \
            .lists('id') \
            .all()

        needs_podbook_ids = core.data_models.PodiumPackageProcessingConfiguration \
            .where_not_in('podium_package_id', excluding) \
            .where('generate_podbook', True) \
            .where('generate_podbook_status', 'initial') \
            .where('generate_chapters_status', 'complete') \
            .lists('podium_package_id') \
            .all()

        needs_post_processing_ids =  list(set(needs_store_transcription_ids + needs_generate_vector_ids + needs_podbook_ids))

        return needs_post_processing_ids

    def post_process(self, process_credits=True):
        self.store_transcription()

        self.verify_audio_properties()

        if process_credits and not self.credits_already_deducted() and self.process_credits == True:
            self.check_credits()

        asyncio.run(self.generate_vector())
        # asyncio.run(self.search_ingest())
        asyncio.run(self.generate_ai_chapters())
        self.generate_chapter_vectors()
        asyncio.run(self.generate_previews())
        self.generate_episode_summary()

        # pre-compute the podiumGPT prompt
        self.get_podiumGPT_prompt_v2()

        # generate podbook
        self.generate_podbook()

        self.package_files()

        if process_credits and not self.credits_already_deducted() and self.process_credits == True:
            self.deduct_credits()

    def credits_already_deducted(self):
        package_transaction_exists = core.data_models.PodiumTransaction \
            .where('podium_package_id', self.id) \
            .exists()

        return package_transaction_exists

    def check_credits(self):
        sufficent_credits = True

        if self.user is not None:
            sufficent_credits = self.user.has_sufficient_credits_for_package(self)

        if not sufficent_credits:
            raise PodiumPackageProcessingException("Insufficient credits to process package.")

    def deduct_credits(self):
        if self.user is not None:
            self.user.deduct_package_credits(self)

    def get_credit_cost(self):
        if self.duration is None or self.duration == 0 or self.duration == 5432:
            return 0
        else:
            return round(float(self.duration / (60)),4)

    def determine_if_api_free_trial(self):
        if self.user is not None and self.user.api_free_trials_enabled and self.podcast_rss_url is not None and self.podcast_rss_url != "":
            count_existing_packages = core.data_models.PodiumPackage \
                .where('podcast_rss_url', self.podcast_rss_url) \
                .where('id', '<>', self.id) \
                .where('user_id', self.user.id) \
                .count()

            if count_existing_packages == 0:
                self.process_credits = False
                self.save()

    def verify_media_exists(self):
        if not self.has_stored_media() or not self.podium_package_original_media_file():
            raise PodiumPackageProcessingException("Media could not be downloaded.")

    def verify_audio_exists(self):
        if not self.podium_package_audio_file():
            raise PodiumPackageProcessingException("Media audio could not be processed.")

    def verify_audio_properties(self):
        if self.transcript_file() is None or len(self.transcript_file().get_sentences()) == 0:
            raise PodiumPackageProcessingException("Unable to transcribe audio.")
        if self.duration < self.MIN_VECTORIZE_DURATION:
            raise PodiumPackageProcessingException("Audio too short to process.")

    # ============================================================================================================================
    # Podcast Episode Association
    # ============================================================================================================================

    def associate_podcast_episode(self):

        podcast_updated = False
        if self.podcast_rss_url and 'http' in self.podcast_rss_url and self.podcast_id is None:
            podcast = core.data_models.Podcast.where ('rss_url', self.podcast_rss_url).first()
            if podcast is None:
                podcast = core.data_models.Podcast()
                podcast.rss_url = self.podcast_rss_url
                podcast.processing_level = 2
                podcast.save()
                podcast = podcast.fresh()

                try:
                    podcast_updated = True
                    podcast.update()
                except:
                    pass

            self.podcast_id = podcast.id
            self.save()

        if self.podcast_id and self.podcast_episode_rss_guid and self.podcast_episode_id is None:
            podcast_episode = core.data_models.PodcastEpisode \
                .where('podcast_id', self.podcast_id) \
                .where('rss_guid', self.podcast_episode_rss_guid) \
                .first()

            if podcast_episode is not None:
                self.podcast_episode_id = podcast_episode.id
                self.save()
            elif not podcast_updated:
                podcast = core.data_models.Podcast.find(self.podcast_id)
                if podcast is not None:
                    try:
                        podcast_updated = True
                        podcast.update()
                    except:
                        pass

                    podcast_episode = core.data_models.PodcastEpisode \
                        .where('podcast_id', self.podcast_id) \
                        .where('rss_guid', self.podcast_episode_rss_guid) \
                        .first()

                    if podcast_episode is not None:
                        self.podcast_episode_id = podcast_episode.id
                        self.save()

        self = self.fresh()

    # ============================================================================================================================
    # Notification
    # ============================================================================================================================

    def send_user_email(self, template_id):
        if self.user_email:
            from_email = "updates@podium.page"
            to_emails = [self.user_email]

            message = Mail(
                from_email=from_email,
                to_emails=to_emails
            )

            tracking_settings = TrackingSettings()
            tracking_settings.click_tracking = ClickTracking(True, False)
            tracking_settings.open_tracking = OpenTracking(True)

            message.tracking_settings = tracking_settings

            if self.error_type == "Unknown":
                error_type = "We're not quite sure what the problem is just yet - looking into it!"
            else:
                error_type = self.error_type

            # pass custom values for our HTML placeholders
            message.dynamic_template_data = {
                "email": self.user_email,
                "job_id": self.guid,
                "error_type": error_type
            }
            message.template_id = template_id

            sg = SendGridAPIClient(api_key=core.env['sendgrid_api_key'])
            response = sg.send(message)
            code, body, headers = response.status_code, response.body, response.headers

            # print(f"Response code: {code}")
            # print(f"Response headers: {headers}")
            # print(f"Response body: {body}")
            # print("Dynamic Messages Sent!")

            return str(response.status_code)

    # ----------------------------------------------------------------------------------------------------------------------------
    # Audio Storage
    # ----------------------------------------------------------------------------------------------------------------------------
    @staticmethod
    def dataset_should_store_media():
        return core.data_models.PodiumPackage \
            .join(JoinClause('podium_package_process_attributes') \
                .on('podium_packages.id', '=', 'podium_package_process_attributes.podium_package_id') \
                .where('podium_package_process_attributes.key', '=', 'audio_stored')
                .where('podium_package_process_attributes.value', '<>', 'true')
            ) \
            .where_not_null('podium_packages.remote_media_file_url') \
            .where('podium_packages.remote_media_file_url', '<>', '') \
            .ready_to_process() \

    def has_stored_media(self):
        return self.process_attribute_value_is('audio_stored', 'true')

    def store_media_if_needed(self):
        if self.has_stored_media():
            self.log("MEDIA ALREADY STORED")
            return

        if self.podium_package_original_media_file() is not None:
            self.log("MEDIA ALREADY DOWNLOADED")
            return

        if not self.remote_media_file_url or self.remote_media_file_url == "":
            self.log("NO MEDIA TO DOWNLOAD")
            return

        self.log("RETRIEVING MEDIA")
        self.store_media()

    def store_media(self, force=False):
        if self.has_stored_media() and not force:
            self.log("SKIPPING STORING MEDIA")
            return

        self.log("STORING MEDIA")

        temp_files_path = f"/tmp/podium_package/{self.guid}/"
        Path(temp_files_path).mkdir(parents=True, exist_ok=True)

        media_format = PodiumPackageAudioFile.determine_media_format_from_filename(self.remote_media_file_url)
        temp_media_file = core.utility.download_file(self.remote_media_file_url, temp_file_path=temp_files_path, local_filename=f"{self.guid}.{media_format}")
        ##DEBUG
        #temp_audio_file = '/home/yoelvis/Google_Drive/Fathom/temp/DVL5492021198.mp3'

        db_media_file = core.data_models.PodiumPackageAudioFile()
        db_media_file.podium_package_id = self.id
        db_media_file.guid = str(uuid.uuid4())
        db_media_file.format = media_format
        db_media_file.length = self.length
        db_media_file.s3_bucket = 'podium-production' #TODO: make this configurable
        db_media_file.s3_key = f"audio/{db_media_file.guid}.{media_format}"

        s3 = boto3.client('s3', aws_access_key_id=core.env['aws_access_key'], aws_secret_access_key=core.env['aws_access_secret'])
        s3.put_object(Body=open(temp_media_file, 'rb'), Bucket=db_media_file.s3_bucket, Key=db_media_file.s3_key, ACL='public-read')

        shutil.rmtree(temp_files_path)
        db_media_file.save()

        self.set_process_attribute('audio_stored', 'true')

    def make_media_readable(self, force=False):
        if not self.has_stored_media() and not force:
            self.log("MEDIA NOT STORED")
            return

        s3 = boto3.client('s3', aws_access_key_id=core.env['aws_access_key'], aws_secret_access_key=core.env['aws_access_secret'])
        s3.put_object_acl(ACL='public-read', Bucket=self.podium_package_original_media_file().s3_bucket, Key=self.podium_package_original_media_file().s3_key)

    # ----------------------------------------------------------------------------------------------------------------------------
    # Audio Transcoding
    # ----------------------------------------------------------------------------------------------------------------------------
    def can_transcode_media(self):
        return self.has_stored_media()

    def should_transcode_media(self):
        return not self.has_transcoded_media()

    def has_transcoded_media(self):
        return self.podium_package_audio_file() is not None

    def transcode_media_to_mp3_if_needed(self):
        if not self.should_transcode_media():
            self.log("MEDIA ALREADY TRANSCODED")
            return

        self.transcode_media_to_mp3()

    def transcode_media_to_mp3(self, force=False):
        if not self.can_transcode_media():
            self.log("MEDIA CANNOT BE TRANSCODED")
            return

        original_media_file = self.podium_package_original_media_file()
        transcoded_audio_file_guid = str(uuid.uuid4())
        transcode_output_s3_key = f"audio/{transcoded_audio_file_guid}.mp3"

        transcode_url = 'https://pza6g2dh52f2fhhzsil7fm6vwy0qlcrj.lambda-url.us-east-1.on.aws/'
        request_body = {
            "input_s3_bucket": self.podium_package_original_media_file().s3_bucket,
            "input_s3_key": self.podium_package_original_media_file().s3_key,
            "output_s3_bucket": self.podium_package_original_media_file().s3_bucket,
            "output_s3_key": transcode_output_s3_key,
        }

        try:
            self.log("TRANSCODING MEDIA")
            headers = {'Content-Type': 'application/json'}
            response = requests.post(transcode_url, data=json.dumps(request_body), headers=headers, timeout=600)
        except:
            raise PodiumPackageProcessingException("Unable to transcode media.")

        if response.status_code != 200:
            raise PodiumPackageProcessingException("Unable to transcode media.")

        self.log("MEDIA TRANSCODED")

        db_transcoded_audio_file = core.data_models.PodiumPackageAudioFile()
        db_transcoded_audio_file.podium_package_id = self.id
        db_transcoded_audio_file.guid = transcoded_audio_file_guid
        db_transcoded_audio_file.format = 'mp3'
        db_transcoded_audio_file.s3_bucket = self.podium_package_original_media_file().s3_bucket
        db_transcoded_audio_file.s3_key = transcode_output_s3_key
        db_transcoded_audio_file.save()

    # ----------------------------------------------------------------------------------------------------------------------------
    # Transcription Request
    # ----------------------------------------------------------------------------------------------------------------------------

    @staticmethod
    def dataset_should_request_transcription():
        return core.data_models.PodiumPackage \
            .join(JoinClause('podium_package_process_attributes') \
                .on('podium_packages.id', '=', 'podium_package_process_attributes.podium_package_id') \
                .where('podium_package_process_attributes.key', '=','audio_stored')
                .where('podium_package_process_attributes.value', '=', 'true')
            ) \
            .join(JoinClause('podium_package_process_attributes_view') \
                .on('podium_packages.id', '=', 'podium_package_process_attributes_view.podium_package_id') \
                .where('podium_package_process_attributes_view.key', '=', 'transcription_job_requested')
                .where('podium_package_process_attributes_view.value', '=', 'false')
            ) \
            .ready_to_process()

    def can_request_transcription(self):
        return self.processing_allowed() \
            and self.has_stored_media() \
            and self.podium_package_audio_file() is not None

    def has_requested_transcription(self):
        return self.process_attribute_value_is('transcription_job_requested', 'true')

    def should_request_transcription(self):
        return self.can_request_transcription() \
            and not self.has_requested_transcription()

    def request_transcription(self, force=False):
        if not self.should_request_transcription() and not force:
            self.log("SKIPPING REQUESTING TRANSCRIPTION")
            return

        self.log("REQUESTING TRANSCRIPTION")

        podium_package_transcript_file = core.data_models.PodiumPackageTranscriptFile.where('podium_package_id', self.id).first()

        # Create a transcript file if there isn't one
        if not podium_package_transcript_file:
            podium_package_transcript_file = core.data_models.PodiumPackageTranscriptFile()
            podium_package_transcript_file.podium_package_id = self.id
            podium_package_transcript_file.podium_package_audio_file_id = self.podium_package_audio_file().id

            podium_package_transcript_file.source = self.transcript_provider
            podium_package_transcript_file.source_model = self.transcript_provider_model

            podium_package_transcript_file.guid = str(uuid.uuid4())
            podium_package_transcript_file.save()
            podium_package_transcript_file = podium_package_transcript_file.fresh()

        if podium_package_transcript_file.job_id:
            # If there is an existing job, update attributes accordingly
            if podium_package_transcript_file.job_status in ['JobStatus.TRANSCRIBED', 'finished']:
                self.set_process_attribute('transcription_job_finished', 'true')
            else:
                self.set_process_attribute('transcription_job_finished', 'false')
        else:
            if podium_package_transcript_file.source == 'pi':
                job = core.data_models.PiJob()
                job.media_to_process_url = self.podium_package_audio_file().url()
                job.model = podium_package_transcript_file.source_model
                job.priority = self.transcript_priority

                if self.language_code:
                    job.language_code = self.language_code  # i.e.: 'en', 'es', 'it', etc.

                job.save()
                job = job.fresh()

                podium_package_transcript_file.job_id = job.guid
                podium_package_transcript_file.job_status = job.status
                podium_package_transcript_file.save()

            elif podium_package_transcript_file.source in ['deepgram']:
                dg_client = Deepgram(core.env['deepgram_api_key'])
                source = {'url': self.podium_package_audio_file().url()}
                options = {'punctuate': True, 'language': 'en', 'model': 'general-enhanced', 'diarize': True}

                #print("Url: " + self.podium_package_audio_file().url())

                # For the time being we will hang a thread waiting for a transcript from Deepgram
                # Deepgram is much, much faster than Rev, but this may have a performance impact on ETL
                # Near-term solution will have to involve setting up a callback API endpoint since the DG SDK
                # Does not appear to have methods for checking job statuses
                response = asyncio.run(dg_client.transcription.prerecorded(source, options))
                #print("DEEPGRAM RESPONSE")
                #print(response)

                podium_package_transcript_file.job_id = response['metadata']['request_id']
                podium_package_transcript_file.job_status = 'finished'
                podium_package_transcript_file.save()

                self.store_transcription(transcript_json=response)
                self.set_process_attribute('transcription_job_finished', 'true')

        self.set_process_attribute('transcription_job_requested', 'true')

    # ----------------------------------------------------------------------------------------------------------------------------
    # Transcription Status
    # ----------------------------------------------------------------------------------------------------------------------------
    @staticmethod
    def dataset_should_update_transcription_status():
        return core.data_models.PodiumPackage \
            .ready_to_process() \
            .join(JoinClause('podium_package_process_attributes') \
                .on('podium_packages.id', '=', 'podium_package_process_attributes.podium_package_id') \
                .where('podium_package_process_attributes.key', '=','transcription_job_requested')
                .where('podium_package_process_attributes.value', '=', 'true')
            ) \
            .join(JoinClause('podium_package_process_attributes_view') \
                .on('podium_packages.id', '=', 'podium_package_process_attributes_view.podium_package_id') \
                .where('podium_package_process_attributes_view.key', '=', 'transcription_job_finished')
                .where('podium_package_process_attributes_view.value', '=', 'false')
            )

    def transcription_is_ready(self):
        return self.process_attribute_value_is('transcription_job_finished', 'true')

    def can_update_transcription_status(self):
        return self.processing_allowed() \
            and self.has_requested_transcription()

    def should_update_transcription_status(self):
        return self.can_update_transcription_status() \
            and not self.transcription_is_ready()

    def update_transcription_status(self, force=False):
        if not self.should_update_transcription_status() and not force:
            self.log("SKIPPING UPDATING TRANSCRIPTION")
            return

        self.log("UPDATING TRANSCRIPTION STATUS")
        job_status = None
        podium_package_transcript_file = core.data_models.PodiumPackageTranscriptFile.where('podium_package_id', self.id).first()

        if podium_package_transcript_file.source == 'pi':
            job = core.data_models.PiJob.where('guid', podium_package_transcript_file.job_id).first()

            if job:
                podium_package_transcript_file.job_status = job.status
                podium_package_transcript_file.save()

                if podium_package_transcript_file.job_status not in ['finished', 'error']:
                    job_status = 'IN_PROGRESS'

                if podium_package_transcript_file.job_status == 'finished':
                    self.set_process_attribute('transcription_job_finished', 'true')
                elif podium_package_transcript_file.job_status == 'error':
                    # Retry using Deepgram
                    self.transcript_provider = 'deepgram'
                    self.transcript_provider_model = 'default'
                    self.save()
                    podium_package_transcript_file.delete()
                    self.set_process_attribute('transcription_job_requested', 'false')
                    #self.set_process_attribute('transcription_job_finished', 'error')
                    #raise RuntimeError("Transcription job failed")
            else:
                if podium_package_transcript_file.job_id is not None:
                    self.set_process_attribute('transcription_job_finished', 'error')
                raise RuntimeError("Transcription job does not exist")
        elif podium_package_transcript_file.source in ['rev', 'rev.ai']:
            client = apiclient.RevAiAPIClient(core.env['rev_ai_access_token'])

            job_details = client.get_job_details(podium_package_transcript_file.job_id)
            job_status = str(job_details.status)

            podium_package_transcript_file.job_status = job_status
            podium_package_transcript_file.save()

            if job_status == 'JobStatus.TRANSCRIBED':
                self.set_process_attribute('transcription_job_finished', 'true')
            elif job_status == 'JobStatus.FAILED':
                self.set_process_attribute('transcription_job_finished', 'error')
                raise RuntimeError("Transcription job failed")
            elif job_status == 'JobStatus.IN_PROGRESS':
                job_status = 'IN_PROGRESS'
        else:
            podium_package_transcript_file.error = 'Unknown transcription source for job status update'
            podium_package_transcript_file.save()
            self.set_process_attribute('transcription_job_finished', 'error')

        return job_status

    async def wait_until_transcription_is_finished(self):
        end = time.time() + 1800  # Bail 30 minutes from now
        while time.time() < end:
            job_status = self.update_transcription_status()

            if job_status in 'IN_PROGRESS':
                await asyncio.sleep(15)
            else:
                break

    # ----------------------------------------------------------------------------------------------------------------------------
    # Transcription Storage
    # ----------------------------------------------------------------------------------------------------------------------------

    @staticmethod
    def dataset_should_store_transcription():
        return core.data_models.PodiumPackage \
            .join(JoinClause('podium_package_process_attributes') \
                .on('podium_packages.id', '=', 'podium_package_process_attributes.podium_package_id') \
                .where('podium_package_process_attributes.key', '=','transcription_job_finished')
                .where('podium_package_process_attributes.value', '=', 'true')
            ) \
            .join(JoinClause('podium_package_process_attributes_view') \
                .on('podium_packages.id', '=', 'podium_package_process_attributes_view.podium_package_id') \
                .where('podium_package_process_attributes_view.key', '=', 'transcribed')
                .where('podium_package_process_attributes_view.value', '<>', 'true')
            ) \
            .ready_to_process()

    def can_store_transcription(self):
        return self.processing_allowed() \
            and self.transcription_is_ready()

    def has_stored_transcription(self):
        return self.process_attribute_value_is('transcribed', 'true')

    def should_store_transcription(self):
        return self.can_store_transcription() \
            and not self.has_stored_transcription()

    def has_stored_transcription(self):
        return self.process_attribute_value_is('transcribed', 'true')

    def store_transcription(self, transcript_json=None):
        if self.has_stored_transcription():
            self.log("TRANSCRIPTION ALREADY STORED")
            return

        self.log("STORING TRANSCRIPTION")

        podium_package_transcript_file = core.data_models.PodiumPackageTranscriptFile.where('podium_package_id', self.id).first()

        if transcript_json is None:
            if podium_package_transcript_file.source == 'pi':
                if podium_package_transcript_file.job_status != 'finished':
                    raise RuntimeError("Transcription is not ready for storage")

                job = core.data_models.PiJob.where('guid', podium_package_transcript_file.job_id).first()

                if job:
                    transcript_json = job.get_transcript()
                else:
                    raise RuntimeError("Transcription job does not exist")

            elif podium_package_transcript_file.source in ['rev', 'rev.ai']:
                if podium_package_transcript_file.job_status != 'JobStatus.TRANSCRIBED':
                    raise RuntimeError("Transcription is not ready for storage")

                client = apiclient.RevAiAPIClient(core.env['rev_ai_access_token'])
                transcript_json = client.get_transcript_json(podium_package_transcript_file.job_id)
        elif podium_package_transcript_file.source == 'deepgram':
            transcript_json = core.data_models.PodiumPackageTranscriptFile.reformat_deepgram_transcript(transcript_json)

        if transcript_json is None or 'monologues' not in transcript_json:
            raise PodiumPackageProcessingException("Audio resulted in empty transcript.")

        # TODO: transcript_json is an object, not a string
        podium_package_transcript_file.process_and_store_transcript(transcript_json)

        self.set_process_attribute('transcribed', 'true')

        # Fill in missing duration from transcription
        if self.duration is None or self.duration == 5432:
            self.duration = podium_package_transcript_file.get_transcribed_length()
            self.save()

    # ----------------------------------------------------------------------------------------------------------------------------
    # Preview Generation
    # ----------------------------------------------------------------------------------------------------------------------------

    @staticmethod
    def dataset_should_generate_previews():
        # no search for podium packages
        #search_ingested = "select podium_package_id from podium_package_process_attributes where key='search_ingested' and value='true'"
        previews_generated = "select podium_package_id from podium_package_process_attributes where key='previews_generated' and value='true'"

        return core.data_models.PodiumPackage \
            .ready_to_process() \
            .where_raw(f"podium_packages.id not in ({previews_generated})")
            # .where_raw(f"podium_packages.id in ({search_ingested})") \

    def can_generate_previews(self):
        return self.processing_allowed() \
            and self.duration > PodiumPackage.MIN_PREVIEW_EXTRACTION_DURATION


    def has_generated_previews(self):
        return self.process_attribute_value_is('previews_generated', 'true')

    def should_generate_previews(self):
        return self.can_generate_previews() \
            and not self.has_generated_previews()

    async def generate_previews(self, force=False):
        if not self.should_generate_previews() and not force:
            self.log("SKIPPING GENERATING PREVIEWS")
            self.set_process_attribute('previews_generated', 'true')
            return

        self.log("GENERATING PREVIEWS")

        core.data_models.PodiumPackagePreview \
            .where('podium_package_id', '=', self.id) \
            .delete()

        core.data_models.PodiumPackageAsset \
            .where('podium_package_id', '=', self.id) \
            .where('type', '=', 'highlight') \
            .delete()

        segments = await self.podium_package_transcript_file().get_search_formatted_segments()

        await self.generate_preview_representative(segments)
        if self.language_name() in PodiumPackage.languages_using_period.values():
            await self.generate_previews_interesting(segments)
            await self.generate_previews_funny(segments)

        self.remove_duplicate_previews()
        await self.optimize_previews()

        self.set_process_attribute('previews_generated', 'true')

    def remove_duplicate_previews(self):
        threshold_seconds = 60
        all_previews = core.data_models.PodiumPackagePreview \
            .where('podium_package_id', '=', self.id) \
            .order_by_raw("type = 'fathom:representative' desc, score desc") \
            .get()

        previews_to_delete = {}

        # Iterate through all previews and remove any where the start or end time is within 30
        # seconds of another preview or the preview is contained within another preview
        for index, preview in enumerate(all_previews):
            for other_preview in all_previews[index+1:]:
                if other_preview.id in previews_to_delete.keys():
                    continue

                this_preview_boundry_start = preview.start - threshold_seconds
                this_preview_boundry_end = preview.end + threshold_seconds
                other_preview_boundry_start = other_preview.start - threshold_seconds
                other_preview_boundry_end = other_preview.end + threshold_seconds

                if this_preview_boundry_start >= other_preview_boundry_start and this_preview_boundry_start <= other_preview_boundry_end:
                    previews_to_delete[other_preview.id] = other_preview
                    continue

                if this_preview_boundry_end >= other_preview_boundry_start and this_preview_boundry_end <= other_preview_boundry_end:
                    previews_to_delete[other_preview.id] = other_preview
                    continue

                if other_preview.start >= this_preview_boundry_start and other_preview.start <= this_preview_boundry_end \
                    and other_preview.end >= this_preview_boundry_start and other_preview.end <= this_preview_boundry_end:
                    previews_to_delete[other_preview.id] = other_preview
                    continue

        for preview in previews_to_delete.values():
            preview.delete()


    async def optimize_previews(self):
        previews = core.data_models.PodiumPackagePreview \
            .where('podium_package_id', '=', self.id) \
            .order_by('score', 'desc') \
            .limit(10) \
            .get()

        for preview in previews:
            try:
                clip_start_time = preview.start
                if preview.original_start:
                    clip_start_time = preview.original_start

                clip_end_time = preview.end
                if preview.original_end:
                    clip_end_time = preview.original_end


                mid_preview_time = (clip_start_time + clip_end_time) / 2
                clip = await self.generate_clip(mid_preview_time, size='medium')

                if clip['end_time'] - clip['start_time'] >= 40:
                    preview.clip_gen_point_time = mid_preview_time
                    preview.start = clip['start_time']
                    preview.end = clip['end_time']
                    preview.title = clip['title']
                    preview.embedding_vector = await self.podium_package_transcript_file().get_embedding_vector_for_start_end(preview.start, preview.end)
                    # print(f'Optimized preview: Episode: {self.id}, Starts: {preview.start}, Ends: {preview.end}, Title: {preview.title}')
                else:
                    preview.clip_gen_point_time = mid_preview_time
                    preview.title = clip['title']
                    preview.has_optimization_issue = True
                    preview.optimization_issue_description = 'optimized_medium_clip_too_short'

                preview.save()

            except:
                pass

    async def generate_preview_representative(self, segments):
        core.data_models.PodiumPackagePreview \
            .where('podium_package_id',self.id) \
            .where('type', 'fathom:representative') \
            .delete()

        representative_segment = None
        representative_similarity = 0

        for segment in segments:
            score = 0
            if segment['embedding_vector'] and self.primary_vector():
                score = core.vector.cosine_similarity(
                    segment['embedding_vector'],
                    self.primary_vector().vector
                )
            if score > representative_similarity:
                representative_segment = segment
                representative_similarity = score

        if representative_segment:

            # Determine the start and end time of the most representative sentence
            sentences = core.text.get_sentences(representative_segment['content'])

            # combine sentences into groups of 3 sentences
            sentence_groups = []
            for index, sentence in enumerate(sentences):
                if index % 4 == 0:
                    sentence_groups.append([])
                sentence_groups[-1].append(sentence)

            # join sentence groups
            sentences = []
            for sentence_group in sentence_groups:
                sentences.append(' '.join(sentence_group))

            filtered_sentences = []
            for sentence in sentences:
                if len(sentence.split(' ')) >= 10:
                    filtered_sentences.append(sentence)
            if len(filtered_sentences) == 0:
                filtered_sentences = sentences

            sentence_vectors = await core.inference.text_embedding_vectors_with_workers(filtered_sentences)
            sentence_vectors = sentence_vectors['embedding_vectors']

            scored_sentences = []
            for index, sentence in enumerate(filtered_sentences):
                score = core.vector.cosine_similarity(
                    sentence_vectors[index],
                    self.primary_vector().vector
                )
                scored_sentences.append({
                    'sentence': sentence,
                    'score': score
                })

            scored_sentences = sorted(scored_sentences, key=lambda x: x['score'], reverse=True)
            # For some languages we can not even have the representative segment.
            if len(scored_sentences) >= 1:
                representative_sentence = scored_sentences[0]

                if representative_sentence['score'] >= (representative_similarity - 0.01):
                    original_start, original_end = PodiumPackageTranscriptFile.get_segment_text_start_end(representative_segment, representative_sentence['sentence'], prior_sentences=0)
                else:
                    original_start, original_end = PodiumPackageTranscriptFile.get_segment_start_end(representative_segment)

                start, end = PodiumPackageTranscriptFile.get_segment_start_end(representative_segment)

                new_preview = core.data_models.PodiumPackagePreview()
                new_preview.podium_package_id = self.id
                new_preview.original_start = original_start
                new_preview.original_end = original_end
                new_preview.start = start - 0.300
                new_preview.end = end + 15
                new_preview.highlight = representative_segment['content'][:160]
                new_preview.score = representative_similarity
                new_preview.type = 'fathom:representative'
                new_preview.embedding_vector = representative_segment['embedding_vector']
                new_preview.save()

    async def generate_previews_interesting(self, segments):
        core.data_models.PodiumPackagePreview \
            .where('podium_package_id',self.id) \
            .where('type', 'fathom:interesting') \
            .delete()

        middle_segments = []
        questions = []
        for segment in segments:
            middle_segments.append(segment)
            questions.append({
                'context': segment['content'],
                'question': "What is interesting about this?"
            })

        answers = await core.inference.question_answer_with_workers(questions)

        for index, answer in enumerate(answers['answers']):
            if answer['answer'] and answer['answer'] != '' and len(answer['answer'].split(' ')) > 5:
                original_start, original_end = PodiumPackageTranscriptFile.get_segment_text_start_end(middle_segments[index], answer['answer'], prior_sentences=0)
                start, end = PodiumPackageTranscriptFile.get_segment_text_start_end(middle_segments[index], answer['answer'], prior_sentences=4)

                score = 0
                if middle_segments[index]['embedding_vector'] and self.primary_vector():
                    score = core.vector.cosine_similarity(
                        middle_segments[index]['embedding_vector'],
                        self.primary_vector().vector
                    )

                start = start - 0.300
                if start < 0:
                    start = 0

                end = end + 15

                new_preview = core.data_models.PodiumPackagePreview()
                new_preview.podium_package_id = self.id
                new_preview.original_start = original_start
                new_preview.original_end = original_end
                new_preview.start = start
                new_preview.end = end
                new_preview.highlight = answer['answer']
                new_preview.score = score
                new_preview.type = 'fathom:interesting'
                new_preview.embedding_vector = middle_segments[index]['embedding_vector']
                new_preview.save()

    async def generate_previews_funny(self, segments):
        core.data_models.PodiumPackagePreview \
            .where('podium_package_id',self.id) \
            .where('type', 'fathom:funny') \
            .delete()

        middle_segments = []
        questions = []
        for segment in segments:
            middle_segments.append(segment)
            questions.append({
                'context': segment['content'],
                'question': "What is funny about this?"
            })

        answers = await core.inference.question_answer_with_workers(questions)

        for index, answer in enumerate(answers['answers']):
            if answer['answer'] and answer['answer'] != '' and len(answer['answer'].split(' ')) > 5:
                original_start, original_end = PodiumPackageTranscriptFile.get_segment_text_start_end(middle_segments[index], answer['answer'], prior_sentences=0)
                start, end = PodiumPackageTranscriptFile.get_segment_text_start_end(middle_segments[index], answer['answer'], prior_sentences=4)

                score = 0
                if middle_segments[index]['embedding_vector'] and self.primary_vector():
                    score = core.vector.cosine_similarity(
                        middle_segments[index]['embedding_vector'],
                        self.primary_vector().vector
                    )

                start = start - 0.300
                if start < 0:
                    start = 0

                end = end + 15

                new_preview = core.data_models.PodiumPackagePreview()
                new_preview.podium_package_id = self.id
                new_preview.original_start = original_start
                new_preview.original_end = original_end
                new_preview.start = start
                new_preview.end = end
                new_preview.highlight = answer['answer']
                new_preview.score = score
                new_preview.type = 'fathom:funny'
                new_preview.embedding_vector = middle_segments[index]['embedding_vector']
                new_preview.save()

    # ----------------------------------------------------------------------------------------------------------------------------
    # Vector Generation
    # ----------------------------------------------------------------------------------------------------------------------------

    @staticmethod
    def dataset_should_generate_vector():
        return core.data_models.PodiumPackage \
            .join(JoinClause('podium_package_process_attributes') \
                .on('podium_packages.id', '=', 'podium_package_process_attributes.podium_package_id') \
                .where('podium_package_process_attributes.key', '=','transcribed')
                .where('podium_package_process_attributes.value', '=', 'true')
            ) \
            .join(JoinClause('podium_package_process_attributes_view') \
                .on('podium_packages.id', '=', 'podium_package_process_attributes_view.podium_package_id') \
                .where('podium_package_process_attributes_view.key', '=', 'vector_generated')
                .where('podium_package_process_attributes_view.value', '<>', 'true')
            ) \
            .ready_to_process()

    def can_generate_vector(self):
        return self.processing_allowed() \
            and self.has_stored_transcription() \
            and self.duration is not None \
            and self.duration > PodiumPackage.MIN_VECTORIZE_DURATION

    def has_generated_vector(self):
        return self.process_attribute_value_is('vector_generated', 'true')

    def should_generate_vector(self):
        return self.can_generate_vector() \
            and not self.has_generated_vector()

    async def generate_vector(self, force=False):
        if not self.should_generate_vector() and not force:
            self.log("SKIPPING GENERATING VECTOR")
            return

        # Check for transcript segments, let it fail if there are none
        segments = self.podium_package_transcript_file().get_segments(sentence_overlap=0)
        if len(segments) == 0:
            raise RuntimeError("Cannot generate vector without transcript segments")

        self.log("GENERATING VECTOR")

        if self.primary_vector():
            core.data_models.PodiumPackageVector.destroy(self.primary_vector().id)

        self.save()

        # generate vector
        embedding_vectors = await core.inference.text_embedding_vectors_with_workers(list([segment['content'] for segment in segments]))
        podium_package_vector = np.mean(embedding_vectors['embedding_vectors'], axis=0)

        # insert into podium episode vectors
        db_podium_package_vector = core.data_models.PodiumPackageVector()
        db_podium_package_vector.podium_package_id = self.id
        db_podium_package_vector.vector = podium_package_vector.tolist()
        db_podium_package_vector.save()
        self.load('vectors')

        self.set_process_attribute('vector_generated', 'true')

        return podium_package_vector

    # ----------------------------------------------------------------------------------------------------------------------------
    # AI Chapters Generation
    # ----------------------------------------------------------------------------------------------------------------------------
    def can_generate_ai_chapters(self):
        return self.duration is not None \
            and self.duration > PodiumPackage.MIN_CHAPTERIZE_DURATION \

    def has_generated_chapters(self):
        return self.process_attribute_value_is('chapters_generated', 'true')

    def should_generate_ai_chapters(self):
        return self.can_generate_ai_chapters() \
            and not self.has_generated_chapters()

    async def generate_ai_chapters(self, force=False):
        '''
        output format:
            {
                'title': 'The G Factor',
                'content': "And that's another interesting thing about g factor. ..., "
                'start': 1143.37,
                'end': 1802.45
            }
        '''

        # Always generate paragraphs first
        # TODO: This should be a separate process
        podium_package_transcript_file = core.data_models.PodiumPackageTranscriptFile \
            .where('podium_package_id', self.id) \
            .first()

        sentences_object = podium_package_transcript_file.get_sentences()
        #print(sentences_object)

        # determine paragraphs
        paragraphs_object = await core.text.get_paragraphs(sentences_object)

        # remove existing paragraphs
        core.data_models.PodiumPackageParagraph \
            .where('podium_package_transcript_file_id', podium_package_transcript_file.id) \
            .delete()

        # create new paragraphs
        for paragraph in paragraphs_object:
            db_podium_package_paragraph = core.data_models.PodiumPackageParagraph()
            db_podium_package_paragraph.podium_package_transcript_file_id = podium_package_transcript_file.id
            db_podium_package_paragraph.start = paragraph['start']
            db_podium_package_paragraph.end = paragraph['end']
            db_podium_package_paragraph.content = paragraph['content']
            db_podium_package_paragraph.save()

        if not self.should_generate_ai_chapters() and not force:
            self.log("SKIPPING AI CHAPTERS GENERATION")
            self.set_process_attribute('chapters_generated', 'true')
            return

        if self.chapters.count() > 0:
            for chapter in self.chapters:
                chapter.delete()

        paragraphs = [item['content'] for item in paragraphs_object]
        samples = core.text.get_samples_to_score_for_topical_breaks(paragraphs)
        topical_break_scores = await core.text.get_topical_break_scores(samples)
        chapters = await core.text.get_ai_chapters(paragraphs_object, topical_break_scores, self.language_name())

        self.log("GENERATING AI CHAPTERS")

        # Insert into podium_package_chapters table.
        counter = 0
        if len(chapters) > 1:
            for chapter in chapters:
                db_podium_package_chapter = core.data_models.PodiumPackageChapter()
                db_podium_package_chapter.start = chapter['start']
                if chapter['end'] is None and counter == len(chapters) - 1:
                    db_podium_package_chapter.end = self.duration
                else:
                    db_podium_package_chapter.end = chapter['end']
                db_podium_package_chapter.description = chapter['title']
                db_podium_package_chapter.podium_package_id = self.id
                db_podium_package_chapter.ai_generated = True
                db_podium_package_chapter.save()

                counter += 1


        self.set_process_attribute('chapters_generated', 'true')
        self.load('chapters')
        return chapters

    def generate_chapter_vectors(self):
        chapters = core.data_models.PodiumPackageChapter.where('podium_package_id', self.id).order_by('start', 'asc').get()
        transcript_file = self.podium_package_transcript_file()
        for chapter in chapters:
            existing_chapter_vector = core.data_models.PodiumPackageChapterVector.where('podium_package_chapter_id', chapter.id).first()
            if existing_chapter_vector is not None:
                existing_chapter_vector.delete()

            asyncio.run(chapter.generate_vector(transcript_file))

    # ----------------------------------------------------------------------------------------------------------------------------
    # Clip Generation. There is a size parameter to define the size of the clip.
    # 'short' will generate clips of about 150 words maximun.
    # 'medium' will generate clips of about 150 to 400 words.
    # The defailt is 'medium'.
    # ----------------------------------------------------------------------------------------------------------------------------
    def can_generate_clip(self):
        return self.has_stored_transcription() \
            and self.duration is not None \
            and self.duration > PodiumPackage.MIN_VECTORIZE_DURATION

    async def generate_clip(self, requested_time_in_seconds=None, size='medium'):
        if not self.can_generate_clip() or requested_time_in_seconds is None:
            self.log(f"SKIPPING {size.upper()} CLIP GENERATION")
            return

        self.log(f"GENERATING {size.upper()} CLIP")

        profile = core.profiler.start("CLIP GENERATION")

        podium_package_transcript_file = self.podium_package_transcript_file()
        clip = await podium_package_transcript_file.get_clip(requested_time_in_seconds, size, self.language_name())

        core.profiler.end(profile)

        '''
        Structure of the clip: {
            'title': title,
            'clip': clip,
            'start_time': start_time,
            'end_time': end_time
            }
        '''
        return clip

    # ----------------------------------------------------------------------------------------------------------------------------
    # Episode Summary
    # ----------------------------------------------------------------------------------------------------------------------------
    def can_generate_summary(self):
        return self.has_stored_transcription() \
            and self.has_generated_chapters() \
            and self.duration is not None \
            and self.duration > PodiumPackage.MIN_VECTORIZE_DURATION

    def has_generated_summary(self):
        return self.process_attribute_value_is('summary_generated', 'true')

    def should_generate_summary(self):
        return self.can_generate_summary() \
            and not self.has_generated_summary()

    def generate_episode_summary(self, force=False):
        '''
        1. The summary of each chapter will be generated.
        2. The chapter summaries will be concatenated and the
            summary of the episode will be generated.
        '''
        if not self.should_generate_summary() and not force:
            self.log("SKIPPING EPISODE SUMMARY GENERATION")
            return

        transcript = self.podium_package_transcript_file()
        chapters = core.data_models.PodiumPackageChapter.where('podium_package_id', self.id).order_by('start', 'asc').get()
        episode_summary = core.text.get_episode_summary(transcript, chapters, self.language_name())

        basic_summary = episode_summary['basic_summary']
        chapters_overview = episode_summary['chapters_overview']
        opening_techniques = episode_summary['opening_techniques']
        num_paragraphs = episode_summary['num_paragraphs']

        self.log("GENERATING EPISODE SUMMARY")

        # generate alternative advanced summary for non-api origins (Podium UI users)
        alternative_advanced_summary = None

        if not self.origin_is_api():
            advanced_summary = core.text.generate_advanced_summary(basic_summary, chapters_overview, opening_techniques[:1], num_paragraphs, self.language_name())
            self.summary = advanced_summary
            self.save()
            alternative_advanced_summary = core.text.generate_advanced_summary(basic_summary, chapters_overview, opening_techniques[1:4], num_paragraphs, self.language_name())
        else:
            advanced_summary = core.text.generate_advanced_summary(basic_summary, chapters_overview, opening_techniques[:4], num_paragraphs, self.language_name())
            self.summary = advanced_summary
            self.save()

        # remove old episode summary assets
        core.data_models.PodiumPackageAsset \
            .where('podium_package_id', self.id) \
            .where('type', 'show_notes_summary') \
            .delete()


        # generate asset for episode summary (advanced)
        asset = core.data_models.PodiumPackageAsset()
        asset.podium_package_id = self.id
        asset.type = "show_notes_summary"
        asset.format = "text"
        asset.accepted_variant = True
        asset.content = advanced_summary
        asset.save()
        asset = asset.fresh()

        # generate asset variant for episode summary (basic)
        asset_variant = core.data_models.PodiumPackageAsset()
        asset_variant.podium_package_id = self.id
        asset_variant.parent_id = asset.id
        asset_variant.type = "show_notes_summary"
        asset_variant.variation_type = "alternative"
        asset_variant.format = "text"
        asset_variant.accepted_variant = False
        asset_variant.content = basic_summary
        asset_variant.save()

        # generate asset variant for episode summary (alternative advanced)
        if alternative_advanced_summary is not None:
            asset_variant = core.data_models.PodiumPackageAsset()
            asset_variant.podium_package_id = self.id
            asset_variant.parent_id = asset.id
            asset_variant.type = "show_notes_summary"
            asset_variant.variation_type = "alternative"
            asset_variant.format = "text"
            asset_variant.accepted_variant = False
            asset_variant.content = alternative_advanced_summary
            asset_variant.save()

        self.log("GENERATING CHAPTER SUMMARIES AND VARIANTS")
        # walk through chapters and set summary to summaries within episode_summary
        for chapter in chapters:
            for summary in episode_summary["chapter_summaries"]:
                if summary["start"] == chapter.start:
                    chapter.summary = summary["summary"]
                    chapter.save()

                    # generate asset variant for chapter summary with a brief description
                    chapter_asset = core.data_models.PodiumPackageAsset \
                        .where('podium_package_chapter_id', chapter.id) \
                        .where_null('parent_id') \
                        .first()
                    if chapter_asset is not None:
                        # remove existing variants
                        core.data_models.PodiumPackageAsset \
                            .where('podium_package_chapter_id', chapter.id) \
                            .where_not_null('parent_id') \
                            .delete()

                        ## generate full key points from summary
                        #full_key_points = core.text.generate_full_key_points_from_summary(chapter.summary, self.language_name()
                        #
                        ## generate new variant
                        #asset_variant = core.data_models.PodiumPackageAsset()
                        #asset_variant.podium_package_id = chapter_asset.podium_package_id
                        #asset_variant.parent_id = chapter_asset.id
                        #asset_variant.podium_package_chapter_id = chapter.id
                        #asset_variant.type = "chapter"
                        #asset_variant.format = "text_timestamped"
                        #asset_variant.variation_type = "full_key_points"
                        #asset_variant.accepted_variant = False
                        #asset_variant.title = chapter_asset.title
                        #asset_variant.content = full_key_points
                        #asset_variant.start_seconds = chapter_asset.start_seconds
                        #asset_variant.end_seconds = chapter_asset.end_seconds
                        #asset_variant.save()

                        # generate short key points
                        short_key_points = core.text.generate_short_key_points(chapter.summary, self.language_name())

                        # generate new variant
                        asset_variant = core.data_models.PodiumPackageAsset()
                        asset_variant.podium_package_id = chapter_asset.podium_package_id
                        asset_variant.parent_id = chapter_asset.id
                        asset_variant.podium_package_chapter_id = chapter.id
                        asset_variant.type = "chapter"
                        asset_variant.format = "text_timestamped"
                        asset_variant.variation_type = "short_key_points"
                        asset_variant.accepted_variant = False
                        asset_variant.title = chapter_asset.title
                        asset_variant.content = short_key_points
                        asset_variant.start_seconds = chapter_asset.start_seconds
                        asset_variant.end_seconds = chapter_asset.end_seconds
                        asset_variant.save()

                    break

        self.generate_keywords()
        self.generate_title()

        if episode_summary:
            self.set_process_attribute('summary_generated', 'true')

        return episode_summary

    def generate_keywords(self):
        self = self.fresh(with_=['chapters'])

        keywords = ""
        if self.summary:
            shownotes = ""
            shownotes += "Episode Summary:\n"
            shownotes += self.summary + "\n\n"
            shownotes += "Chapters:\n\n"

            #Order self.chapters by start time:
            chapters = sorted(self.chapters, key=lambda x: x.start, reverse=False)
            for chapter in chapters:
                shownotes += str(datetime.timedelta(seconds=round(chapter.start))) + " - " + chapter.description + "\n"
            shownotes += "\n"
            shownotes += "Chapter Summaries:\n\n"
            for chapter in self.chapters:
                if chapter.summary is not None:
                    shownotes += str(datetime.timedelta(seconds=round(chapter.start))) + " - " + chapter.description + " (" + str(round((chapter.end - chapter.start)/60)) + " Minutes)\n"
                    shownotes += chapter.summary + "\n\n"

            keywords = core.text.generate_keywords_for_shownotes(shownotes, self.language_name())

        self.keywords = keywords
        self.save()

        # remove old episode keywords asset
        core.data_models.PodiumPackageAsset \
            .where('podium_package_id', self.id) \
            .where('type', 'keywords') \
            .delete()

        # generate asset for episode keywords
        asset = core.data_models.PodiumPackageAsset()
        asset.podium_package_id = self.id
        asset.type = "keywords"
        asset.format = "text"
        asset.accepted_variant = True
        asset.content = keywords
        asset.save()

        return keywords

    def generate_title(self):
        self = self.fresh(with_=['chapters'])

        title = ""
        if self.summary:
            shownotes = ""
            shownotes += "Episode Summary:\n"
            shownotes += self.summary + "\n\n"
            shownotes += "Chapters:\n\n"

            # Order self.chapters by start time:
            chapters = sorted(self.chapters, key=lambda x: x.start, reverse=False)
            for chapter in chapters:
                shownotes += str(datetime.timedelta(seconds=round(chapter.start))) + " - " + chapter.description + "\n"

            example_titles = []
            if self.podcast_id:
                example_podcast_episodes = core.data_models.PodcastEpisode \
                    .where('podcast_id', self.podcast_id) \
                    .where_not_null('title') \
                    .select('id', 'title') \
                    .order_by('publication_date', 'desc') \
                    .limit(10) \
                    .get()

                for example_podcast_episode in example_podcast_episodes:
                    example_titles.append(example_podcast_episode.title)

            title = core.text.generate_title_for_shownotes(shownotes, example_titles=example_titles, language=self.language_name())

        self.title = title
        self.save()

        # remove old title assets
        core.data_models.PodiumPackageAsset \
            .where('podium_package_id', self.id) \
            .where('type', 'titles') \
            .delete()

        # generate asset for episode titles
        split_titles = title.split("\n")
        if len(split_titles) > 0:
            # create a parent asset for the first title
            parent_asset = core.data_models.PodiumPackageAsset()
            parent_asset.podium_package_id = self.id
            parent_asset.type = "titles"
            parent_asset.format = "text"
            parent_asset.accepted_variant = True
            parent_asset.content = split_titles[0]
            parent_asset.save()

            split_title_variants = split_titles[1:]
            for title_variant in split_title_variants:
                asset = core.data_models.PodiumPackageAsset()
                asset.podium_package_id = self.id
                asset.type = "titles"
                asset.format = "text"
                asset.accepted_variant = False
                asset.variation_type = 'alternative'
                asset.content = title_variant
                asset.parent_id = parent_asset.id
                asset.save()

        return title

    def generate_gpt_response(self, prompt):

            
        composed_prompt = self.get_composed_prompt(prompt)
        print("Generating content for prompt")
        token_count = core.text.count_number_of_tokens(composed_prompt, model='gpt-4o')
        max_tokens = int(8150 - token_count)

        if max_tokens > 2048:
            max_tokens = 2048

        # Make a single call to GPT API and get the full response instead of streaming
        response = core.inference.gpt_chat_api_single_prompt(composed_prompt, 'gpt-4o', max_tokens=max_tokens, temperature=1.2, top_p=0.8)

        # Extract content from the response
        print("response: " + response)

        # Return the full document content
        return response


class PodiumPackageProcessingException(Exception):
    def __init__(self, message="", *args, **kwargs):
        self.message = message
        super().__init__(message, *args, **kwargs)

from .podium_package_process_attribute import PodiumPackageProcessAttribute
from .podium_package_preview import PodiumPackagePreview
from .podium_package_audio_file import PodiumPackageAudioFile
from .podium_package_transcript_file import PodiumPackageTranscriptFile
from .podium_package_chapter import PodiumPackageChapter
from .podium_user import PodiumUser
from .podium_project import PodiumProject
from .podium_package_processing_configuration import PodiumPackageProcessingConfiguration
from .podium_transaction import PodiumTransaction
from .podium_package_asset import PodiumPackageAsset

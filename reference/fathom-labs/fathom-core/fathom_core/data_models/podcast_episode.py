import fathom_core as core
from .podcast_episode_guest import PodcastEpisodeGuest
from .system_flag import SystemFlag

from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through, scope
from orator import accessor, mutator
from orator.query.join_clause import JoinClause

import boto3
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
from contextlib import contextmanager
import functools
from tenacity import retry, stop_after_attempt, wait_exponential

import numpy as np

class PodcastEpisode(Model):

    VECTOR_COLLECTION = "podcast-episodes"
    TITLE_VECTOR_COLLECTION = "podcast-episode-titles"
    COMBINED_TITLE_VECTOR_COLLECTION = "podcast-episode-combined-titles"

    MIN_VECTORIZE_DURATION = 60

    MAX_AGE_DAYS_NEW_EPISODE_NOTIFICATIONS = 2

    SEARCH_INDEX = "podcast_episodes"

    default_process_attributes = [
        'audio_stored',
        'transcription_job_requested',
        'transcription_job_finished',
        'transcribed',
        'search_ingested',
        'previews_generated',
        'vector_generated',
        'new_episode_notifications',
        'chapters_generated'
    ]

    logger = core.log

    __appends__ = ['last_position']

    @accessor
    def last_position(self):
        return self.get_raw_attribute('last_position')

    @last_position.mutator
    def set_last_position(self, value):
        self.set_raw_attribute('last_position', value)

    @belongs_to
    def podcast(self):
        return Podcast

    @has_many_through(PodcastEpisodeGuest)
    def guests(self):
        return PodcastGuest

    @has_many
    def audio_files(self):
        return AudioFile

    @has_many
    def vectors(self):
        from .podcast_episode_vector import PodcastEpisodeVector
        return PodcastEpisodeVector

    def primary_vector(self):
        vector = None

        vectors = self.vectors
        if len(vectors) > 0:
            vector = vectors[0]

        return vector

    @has_many
    def transcript_files(self):
        return TranscriptFile

    @has_many
    def process_attributes(self):
        return PodcastEpisodeProcessAttribute

    @has_many
    def previews(self):
        return PodcastEpisodePreview

    @has_many
    def chapters(self):
        return PodcastEpisodeChapter

    @contextmanager
    def error_logging(self):
        try:
            yield
            self.error = None
            self.save()
        except Exception as e:
            self.error = traceback.format_exc()
            self.save()
            raise e

    def get_segments(self):
        return TranscriptFile.get_segments_by_podcast_episode_id(self.guid)

    def formatted_duration(self):
        return str(datetime.timedelta(seconds=round(self.duration)))

    def set_process_attribute(self, key, value):
        process_attribute = self.get_process_attribute(key)

        if not process_attribute:
            process_attribute = PodcastEpisodeProcessAttribute()
            process_attribute.podcast_episode_id = self.id
            process_attribute.key = key

        process_attribute.value = value
        process_attribute.save()

        return process_attribute

    def get_process_attribute(self, key):
        return PodcastEpisodeProcessAttribute \
            .where('podcast_episode_id', self.id) \
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
        temp_files_path = f"/tmp/podcast_episode/{self.guid}/"
        Path(temp_files_path).mkdir(parents=True, exist_ok=True)

        return temp_files_path

    def s3_prefix(self, path=""):
        return f"podcasts/{core.text.get_url_friendly(self.podcast.url_slug).replace('-', '_')}/episodes/{core.text.get_url_friendly(self.url_slug).replace('-', '_')}/{path}"

    def log(self, message):
        self.logger.info(f"EPISODE ID  {self.id} | '{self.title}' : {message}")

    def audio_file(self):
        audio_file = None
        if len(self.audio_files) > 0:
            audio_file = self.audio_files[0]
        return audio_file

    def audio_url(self):
        audio_url = None
        if self.audio_file():
            audio_url = self.audio_file().url()
        else:
            audio_url = self.rss_audio_url

        return audio_url

    def audio_url_cdn(self):
        audio_url_cdn = None
        if self.audio_file():
            audio_url_cdn = self.audio_file().url().replace("https://fathom-production.s3.amazonaws.com/", "https://d3jbilhebgld9z.cloudfront.net/")
        else:
            audio_url_cdn = self.rss_audio_url

        return audio_url_cdn

    def transcript_file(self):
        if self.transcript_files and len(self.transcript_files) > 0:
            return self.transcript_files[0]
        else:
            return None

    def transcript_url(self):
        if self.transcript_files and len(self.transcript_files) > 0:
            return self.transcript_file().url()
        else:
            return None

    def image_url(self):
        image_url = None

        if self.image_s3_key:
            image_url = f"https://{self.s3_bucket}.s3.amazonaws.com/{self.image_s3_key}"
        #elif self.podcast.has_unique_episode_art() and self.rss_image_url:
        #    image_url = self.rss_image_url
        else:
            image_url = self.podcast.hero_image_url()

        return image_url

    def image_url_cdn(self):
        image_url_cdn = self.image_url()
        
        if image_url_cdn is not None:
            image_url_cdn = image_url_cdn.replace("https://fathom-production.s3.amazonaws.com/", "https://d3jbilhebgld9z.cloudfront.net/")

        return image_url_cdn

    def thumbnail_image_url(self):
        thumbnail_image_url = None

        if self.thumbnail_image_s3_key:
            thumbnail_image_url = f"https://{self.s3_bucket}.s3.amazonaws.com/{self.thumbnail_image_s3_key}"
        else:
            thumbnail_image_url = self.podcast.thumbnail_image_url()

        return thumbnail_image_url

    def thumbnail_image_url_cdn(self):
        thumbnail_image_url_cdn = self.thumbnail_image_url()
        
        if thumbnail_image_url_cdn is not None:
            thumbnail_image_url_cdn = thumbnail_image_url_cdn.replace("https://fathom-production.s3.amazonaws.com/", "https://d3jbilhebgld9z.cloudfront.net/")

        return thumbnail_image_url_cdn

    def share_image_url(self):
        share_image_url = None

        if self.share_image_s3_key:
            share_image_url = f"https://{self.s3_bucket}.s3.amazonaws.com/{self.share_image_s3_key}"
        else:
            share_image_url = self.podcast.share_image_url()

        return share_image_url

    def share_image_url_cdn(self):
        share_image_url_cdn = self.share_image_url()
        
        if share_image_url_cdn is not None:
            share_image_url_cdn = share_image_url_cdn.replace("https://fathom-production.s3.amazonaws.com/", "https://d3jbilhebgld9z.cloudfront.net/")

        return share_image_url_cdn

    def full_url_slug(self):
        return f"/podcast/{self.podcast.url_slug}/episode/{self.url_slug}"

    def has_unique_episode_art(self):
        has_unique_episode_art = True

        episode_rss_image_urls = core.data_models.PodcastEpisode \
            .where('podcast_id', self.podcast_id) \
            .where('rss_image_url', self.rss_image_url) \
            .where('id', '<>', self.id) \
            .lists('rss_image_url')

        if len(episode_rss_image_urls) > 0:
            has_unique_episode_art = False

        return has_unique_episode_art

    @staticmethod
    def create_from_rss(episode_rss, podcast):
        from wand.image import Image

        podcast_episode = PodcastEpisode()
        podcast_episode.podcast_id = podcast.id
        podcast_episode.rss_guid = episode_rss['guid']
        podcast_episode.save()
        podcast_episode = podcast_episode.fresh()

        if podcast.processing_level > 1:
            podcast_episode.initialize_process_attributes()
            podcast_episode.update_from_rss(episode_rss)
        else:
            podcast_episode.update_from_rss(episode_rss, fast=True)

        podcast_episode = podcast_episode.fresh()

        preview_type = 'default'
        if episode_rss['preview']:
            podcast_episode.preview_start = episode_rss['preview']['start']
            podcast_episode.preview_end = episode_rss['preview']['start'] + 30
            podcast_episode.preview_score = 0
            podcast_episode.preview_highlight = ''
            preview_type = 'rss'
        else:
            podcast_episode.preview_start = 0
            podcast_episode.preview_end = 30
            podcast_episode.preview_score = 0
            podcast_episode.preview_highlight = ''

        podcast_episode_preview = PodcastEpisodePreview()
        podcast_episode_preview.podcast_episode_id = podcast_episode.id
        podcast_episode_preview.start = podcast_episode.preview_start
        podcast_episode_preview.end = podcast_episode.preview_end
        podcast_episode_preview.score = podcast_episode.preview_score
        podcast_episode_preview.highlight = podcast_episode.preview_highlight
        podcast_episode_preview.type = preview_type
        podcast_episode_preview.save()

        if podcast.processing_level > 1 and podcast_episode.publication_date <= podcast.transcribe_after:
            podcast_episode.initiate_sending_new_episode_notifications()

    def update_from_rss(self, episode_rss, fast=False):
        self.title = episode_rss['title']
        self.publication_date = episode_rss['publication_date']
        self.url_slug = core.text.get_url_friendly(f"{self.title}-{self.publication_date.strftime('%Y-%m-%d')}")
        self.subtitle = episode_rss['subtitle']
        self.summary = episode_rss['summary']
        self.description = episode_rss['description']
        self.rss_image_url = episode_rss['image_url']
        self.rss_audio_url = episode_rss['audio_url']
        self.length = episode_rss['length']

        self.store_in_elastic()

        if episode_rss['duration']:
            self.duration = episode_rss['duration']
        else:
            self.duration = 5432

        self.update_chapters_from_rss(episode_rss)

        self.keywords = episode_rss['keywords']
        self.season_number = episode_rss['season_number']

        if not fast:
            if self.description:
                description = self.description
                if core.text.is_html(description):
                    description = BeautifulSoup(description, "lxml").text
                self.description_sentences = core.text.get_sentences(description)

            if self.summary:
                summary = self.summary
                if core.text.is_html(summary):
                    summary = BeautifulSoup(summary, "lxml").text
                self.summary_sentences = core.text.get_sentences(summary)

            if self.subtitle:
                subtitle = self.subtitle
                if core.text.is_html(subtitle):
                    subtitle = BeautifulSoup(subtitle, "lxml").text
                self.subtitle_sentences = core.text.get_sentences(subtitle)

        self.save()

    def update_chapters_from_rss(self, episode_rss):
        if episode_rss['chapters_url']:
            self.chapters_url = episode_rss['chapters_url']
            self.save()

            try:
                chapters_response = core.utility.request_as_fathom_browser(self.chapters_url, timeout=3, podcast=self.podcast)
                chapters_response.raise_for_status()
                chapters = chapters_response.json()

                if chapters and 'chapters' in chapters and len(chapters['chapters']) > 0:    
                    if self.chapters.count() > 0:
                        for chapter in self.chapters:
                            chapter.delete()

                    self.save_chapters_from_rss([chapter for chapter in chapters['chapters'] if 'toc' not in chapter or chapter['toc']])
                    self.save_chapters_from_rss([chapter for chapter in chapters['chapters'] if 'toc' in chapter and not chapter['toc']])
                    self.set_process_attribute('chapters_generated', 'true')
            except Exception as e:
                core.log.debug(f"CHAPTERS {self.chapters_url} FAILED TO LOAD: {e}")
                pass

    def save_chapters_from_rss(self, rss_chapters):
        for index, rss_chapter in enumerate(rss_chapters):
            podcast_episode_chapter = PodcastEpisodeChapter()
            podcast_episode_chapter.podcast_episode_id = self.id
            if 'title' in rss_chapter: 
                podcast_episode_chapter.description = rss_chapter['title']
            if 'startTime' in rss_chapter:
                podcast_episode_chapter.start = rss_chapter['startTime']
            if 'endTime' in rss_chapter:
                podcast_episode_chapter.end = rss_chapter['endTime']
            elif 'toc' not in rss_chapter or rss_chapter['toc']:
                # use the start time of the next chapter
                if index < len(rss_chapters) - 1:
                    podcast_episode_chapter.end = rss_chapters[index + 1]['startTime']
                else:
                    # use the end time of the episode
                    podcast_episode_chapter.end = self.duration
            if 'url' in rss_chapters:
                podcast_episode_chapter.url = rss_chapters['url']
            if 'img' in rss_chapters:
                podcast_episode_chapter.img_url = rss_chapters['img']
            if 'toc' in rss_chapters:
                podcast_episode_chapter.toc = rss_chapters['toc']
            
            podcast_episode_chapter.save()

    def initialize_process_attributes(self):
        for process_attribute in PodcastEpisode.default_process_attributes:
            if self.get_process_attribute(process_attribute) is None:
                podcast_episode_process_attribute = PodcastEpisodeProcessAttribute()
                podcast_episode_process_attribute.podcast_episode_id = self.id
                podcast_episode_process_attribute.key = process_attribute
                podcast_episode_process_attribute.value = 'false'
                podcast_episode_process_attribute.save()

    def set_image_s3_key(self):
        self.image_s3_key = self.s3_prefix("images/image.jpg")

    def set_thumbnail_image_s3_key(self):
        self.thumbnail_image_s3_key = self.s3_prefix("images/thumbnail.jpg")

    def set_share_image_s3_key(self):
        self.share_image_s3_key = self.s3_prefix("images/share.jpg")

    def process_image(self):
        from wand.image import Image
        from colorthief import ColorThief

        self.s3_bucket = core.env['aws_s3_bucket']
        temp_files_path = self.get_temp_files_path()

        if not self.image_s3_key and self.rss_image_url:
            try:
                image_file_path = f"{temp_files_path}image.jpg"
                temp_image_file = core.utility.download_file(self.rss_image_url, temp_file_path=temp_files_path)

                with Image(filename=temp_image_file) as img:
                    img.format = 'jpeg'
                    img.compression_quality = 100

                    if img.width != img.height:
                        img = img[:img.width, :]

                    if img.width > 750:
                        img.resize(750, 750)

                    img.save(filename=image_file_path)

                self.set_image_s3_key()

                s3 = boto3.client('s3', aws_access_key_id=core.env['aws_access_key'], aws_secret_access_key=core.env['aws_access_secret'])
                s3.put_object(Body=open(image_file_path, 'rb'), Bucket=self.s3_bucket, Key=self.image_s3_key, ACL='public-read')
            except Exception as e:
                self.logger.debug(f"ERROR GENERATING PODCAST EPISODE IMAGE FOR {self.podcast.title} | {self.title}")
                self.logger.critical(e, exc_info=True)

        # thumbnail image
        if not self.thumbnail_image_s3_key and self.rss_image_url:
            try:
                thumbnail_image_file_path = f"{temp_files_path}thumbnail.jpg"
                temp_image_file = core.utility.download_file(self.rss_image_url, temp_file_path=temp_files_path)

                with Image(filename=temp_image_file) as img:
                    img.format = 'jpeg'
                    img.compression_quality = 100

                    if img.width != img.height:
                        img = img[:img.width, :]

                    if img.width > 250:
                        img.resize(250, 250)

                    img.save(filename=thumbnail_image_file_path)

                self.set_thumbnail_image_s3_key()

                s3 = boto3.client('s3', aws_access_key_id=core.env['aws_access_key'], aws_secret_access_key=core.env['aws_access_secret'])
                s3.put_object(Body=open(thumbnail_image_file_path, 'rb'), Bucket=self.s3_bucket, Key=self.thumbnail_image_s3_key, ACL='public-read')
            except Exception as e:
                self.logger.debug(f"ERROR GENERATING PODCAST EPISODE THUMBNAIL IMAGE FOR {self.podcast.title} | {self.title}")
                self.logger.critical(e, exc_info=True)

        # colors
        if not self.colors and self.rss_image_url:
            try:
                temp_image_file = core.utility.download_file(self.thumbnail_image_url(), temp_file_path=temp_files_path)
                #profile = core.profiler.start('COLORS')
                color_thief = ColorThief(temp_image_file)
                palette = color_thief.get_palette(color_count=6, quality=1)

                self.colors = []
                for color in palette:
                    color_values = f"{str(color[0])},{str(color[1])},{str(color[2])}"
                    self.colors.append(color_values)
                #core.profiler.end(profile)
            except Exception as e:
                self.logger.debug(f"ERROR EXTRACTING PODCAST EPISODE IMAGE COLORS FOR {self.podcast.title} | {self.title}")
                self.logger.critical(e, exc_info=True)

        self.save()

    def generate_share_image(self):
        from wand.image import Image
        temp_files_path = self.get_temp_files_path()

        try:
            if not self.share_image_s3_key and self.rss_image_url:
                share_image_file_path = f"{temp_files_path}share.jpg"

                temp_background_image = requests.get('https://fathom-production.s3.amazonaws.com/images/composition_templates/podcast-web-og-share.jpg')
                with Image(blob=temp_background_image.content) as background_img:
                    background_img.format = 'jpeg'
                    background_img.compression_quality = 100

                    temp_podcast_image_file = core.utility.request_as_browser(self.rss_image_url)
                    with Image(blob=temp_podcast_image_file.content) as podcast_img:
                        podcast_img.format = 'jpeg'
                        podcast_img.compression_quality = 100

                        if podcast_img.width != podcast_img.height:
                            podcast_img = podcast_img[:podcast_img.width, :]
                        podcast_img.resize(630, 630)

                        background_img.composite(podcast_img, left=0, top=0)
                        background_img.save(filename=share_image_file_path)

                self.set_share_image_s3_key()

                s3 = boto3.client('s3', aws_access_key_id=core.env['aws_access_key'], aws_secret_access_key=core.env['aws_access_secret'])
                s3.put_object(Body=open(share_image_file_path, 'rb'), Bucket=self.s3_bucket, Key=self.share_image_s3_key, ACL='public-read')

                self.save()

        except Exception as e:
            self.logger.debug(f"ERROR GENERATEING SHARE IMAGE FOR PODCAST {self.id} | {self.title} ")
            self.logger.critical(e, exc_info=True)

        # clean up
        shutil.rmtree(temp_files_path)


    def get_background_color(self):
        background_color = None

        if self.colors and len(self.colors) > 0:
            print(self.title)
            background_color = core.color.get_color_from_palette(self.colors)
        else:
            background_color = self.podcast.get_background_color()

        return background_color

    def generate_simple_title(self):
        # messy title? clean it up with GPT-3....
        if any(char.isdigit() for char in self.title) and not self.simple_title:
            try:
                self.simple_title = core.inference.simplify_title(self.title)
                self.save()
            except:
                pass

    #def generate_title_vector(self):
    #    # create a vector based on episode title for search
    #    if not self.title_vector_id and self.title and self.title != '':
    #        try:
    #            embedding_vectors = asyncio.run(core.inference.text_embedding_vectors([self.title]))
    #            title_vector = embedding_vectors['embedding_vectors'][0]
    #            normalized_vector = np.array(title_vector).astype(float)
    #            normalized_vector = normalized_vector / np.linalg.norm(normalized_vector)
    #            status, vector_ids = core.ann.insert(
    #                [normalized_vector.tolist()],
    #                collection_name=PodcastEpisode.TITLE_VECTOR_COLLECTION,
    #            )
    #            self.title_vector_id = vector_ids[0]
    #            self.save()
    #        except Exception as e:
    #            self.logger.debug(f"ERROR CREATING TITLE VECTOR FOR EPISODE {self.id} | {self.title}  ")
    #            self.logger.critical(e, exc_info=True)

    # def generate_combined_title_vector(self):
    #     # create a vector based on podcast title and episode title for search
    #     if not self.combined_title_vector_id and self.title and self.title != '' and self.podcast.title and self.podcast.title != '':
    #         try:
    #             embedding_vectors = asyncio.run(core.inference.text_embedding_vectors([f"{self.podcast.title} {self.title}"]))
    #             combined_title_vector = embedding_vectors['embedding_vectors'][0]
    #             normalized_vector = np.array(combined_title_vector).astype(float)
    #             normalized_vector = normalized_vector / np.linalg.norm(normalized_vector)
    #             status, vector_ids = core.ann.insert(
    #                 [normalized_vector.tolist()],
    #                 collection_name=PodcastEpisode.COMBINED_TITLE_VECTOR_COLLECTION
    #             )
    #             self.combined_title_vector_id = vector_ids[0]
    #             self.save()
    #         except Exception as e:
    #             self.logger.debug(f"ERROR CREATING COMBINED TITLE VECTOR FOR EPISODE {self.id} | {self.title}  ")
    #             self.logger.critical(e, exc_info=True)

    # ============================================================================================================================
    # PROCESSING
    # ============================================================================================================================

    def processing_allowed(self):
        return self.system_processing_allowed() and self.episode_processing_allowed()

    def system_processing_allowed(self):
        if not SystemFlag.is_active('episode_processing_enabled'):
            self.log("PROCESSING NOT ALLOWED DUE SYSTEM FLAG")
            return False

        return True

    def episode_processing_allowed(self):
        if not self.force_transcribe:
            if self.publication_date <= self.podcast.transcribe_after:
                self.log("PROCESSING NOT ALLOWED DUE TO PUBLICATION DATE")
                return False

        return True

    @scope
    def system_processing_enabled(self, query):
        return query \
            .where_raw(SystemFlag.where_raw_is_active("episode_processing_enabled"))

    @scope
    def ready_to_process(self, query):
        return query \
            .join('podcasts', 'podcast_episodes.podcast_id', '=', 'podcasts.id') \
            .where_raw('(podcast_episodes.publication_date > podcasts.transcribe_after OR podcast_episodes.force_transcribe IS TRUE)') \
            .where('podcast_episodes.error', None) \
            .where('podcasts.language', 'english') \
            .where('podcasts.processing_level', '>=', 3) \
            .system_processing_enabled()

    @scope
    def order_by_processing_priority(self, query):
        return query.order_by_raw("podcast_episodes.publication_date desc nulls last")

    @scope
    def order_by_processing_priority_performance_alt(self, query):
        return query.order_by_raw("podcast_episodes.publication_date is null asc, podcast_episodes.publication_date desc")

    @scope
    def order_by_transcript_provider_processing_priority(self, query):
        return query.order_by_raw("podcasts.transcript_provider = 'deepgram' desc, podcast_episodes.publication_date desc nulls last")

    @staticmethod
    def needs_pre_processing_ids(limit=100, excluding=[]):
        needs_audio_storage_ids = core.data_models.PodcastEpisode.dataset_should_store_audio() \
            .where_not_in('podcast_episodes.id', excluding) \
            .order_by_processing_priority() \
            .limit(limit) \
            .select('podcast_episodes.id') \
            .lists('id') \
            .all()

        needs_transcription_ids = core.data_models.PodcastEpisode.dataset_should_request_transcription() \
            .where_not_in('podcast_episodes.id', excluding) \
            .order_by_processing_priority_performance_alt() \
            .limit(limit) \
            .select('podcast_episodes.id') \
            .lists('id') \
            .all()

        needs_pre_processing_ids = list(set(needs_audio_storage_ids + needs_transcription_ids))
        
        return needs_pre_processing_ids

    def pre_process(self):
        self.generate_chapters()
        self.store_audio()
        self.request_transcription()

    @staticmethod
    def needs_post_processing_ids(limit=100, excluding=[]):
        needs_store_transcription_ids = core.data_models.PodcastEpisode.dataset_should_store_transcription() \
            .where_not_in('podcast_episodes.id', excluding) \
            .order_by_processing_priority_performance_alt() \
            .limit(limit) \
            .select('podcast_episodes.id') \
            .lists('id') \
            .all()

        needs_generate_vector_ids = core.data_models.PodcastEpisode.dataset_should_generate_vector() \
            .where_not_in('podcast_episodes.id', excluding) \
            .order_by_processing_priority_performance_alt() \
            .limit(limit) \
            .select('podcast_episodes.id') \
            .lists('id') \
            .all()

        needs_search_ingest_ids = core.data_models.PodcastEpisode.dataset_should_search_ingest() \
            .where_not_in('podcast_episodes.id', excluding) \
            .order_by_processing_priority_performance_alt() \
            .limit(limit) \
            .select('podcast_episodes.id') \
            .lists('id') \
            .all()
        
        needs_post_processing_ids =  list(set(needs_store_transcription_ids + needs_generate_vector_ids + needs_search_ingest_ids))
        
        return needs_post_processing_ids

    def post_process(self):
        self.store_transcription()
        asyncio.run(self.generate_vector())
        asyncio.run(self.search_ingest())
        asyncio.run(self.generate_previews())
        if self.podcast.follower_count() > 1:
            asyncio.run(self.generate_ai_chapters())
        self.initiate_sending_new_episode_notifications()

    # ----------------------------------------------------------------------------------------------------------------------------
    # Audio Storage
    # ----------------------------------------------------------------------------------------------------------------------------

    @staticmethod
    def dataset_should_store_audio():
        return core.data_models.PodcastEpisode \
            .join(JoinClause('podcast_episode_process_attributes') \
                .on('podcast_episodes.id', '=', 'podcast_episode_process_attributes.podcast_episode_id') \
                .where('podcast_episode_process_attributes.key', '=', 'audio_stored')
                .where('podcast_episode_process_attributes.value', '<>', 'true')
            ) \
            .ready_to_process() \
            .where_not_null('podcast_episodes.rss_audio_url')\
            .where('podcast_episodes.rss_audio_url', '<>', '')


    def can_store_audio(self):
        return self.processing_allowed() \
            and self.rss_audio_url != None \
            and self.rss_audio_url != ''

    def has_stored_audio(self):
        return self.process_attribute_value_is('audio_stored', 'true')

    def should_store_audio(self):
        return self.can_store_audio() and not self.has_stored_audio()
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=32))
    def store_audio(self, force=False):
        if not self.should_store_audio() and not force:
            self.log("SKIPPING STORING AUDIO")
            return

        self.log("STORING AUDIO")

        temp_files_path = f"/tmp/podcast_episode/{self.guid}/"
        Path(temp_files_path).mkdir(parents=True, exist_ok=True)

        temp_audio_file = core.utility.download_file(self.rss_audio_url, temp_file_path=temp_files_path, local_filename=f"{self.guid}.mp3")

        db_audio_file = core.data_models.AudioFile()
        db_audio_file.podcast_episode_id = self.id
        db_audio_file.guid = str(uuid.uuid4())
        db_audio_file.format = 'mp3'
        db_audio_file.length = self.length
        db_audio_file.s3_bucket = core.env['aws_s3_bucket']
        db_audio_file.s3_key = self.s3_prefix(f"audio/{db_audio_file.guid}.mp3")

        s3 = boto3.client('s3', aws_access_key_id=core.env['aws_access_key'], aws_secret_access_key=core.env['aws_access_secret'])
        s3.put_object(Body=open(temp_audio_file, 'rb'), Bucket=db_audio_file.s3_bucket, Key=db_audio_file.s3_key, ACL='public-read')

        shutil.rmtree(temp_files_path)
        db_audio_file.save()

        self.set_process_attribute('audio_stored', 'true')

    # ----------------------------------------------------------------------------------------------------------------------------
    # Transcription Request
    # ----------------------------------------------------------------------------------------------------------------------------

    @staticmethod
    def dataset_should_request_transcription():
        return core.data_models.PodcastEpisode \
            .join(JoinClause('podcast_episode_process_attributes') \
                .on('podcast_episodes.id', '=', 'podcast_episode_process_attributes.podcast_episode_id') \
                .where('podcast_episode_process_attributes.key', '=','audio_stored')
                .where('podcast_episode_process_attributes.value', '=', 'true')
            ) \
            .join(JoinClause('podcast_episode_process_attributes_view') \
                .on('podcast_episodes.id', '=', 'podcast_episode_process_attributes_view.podcast_episode_id') \
                .where('podcast_episode_process_attributes_view.key', '=', 'transcription_job_requested')
                .where('podcast_episode_process_attributes_view.value', '<>', 'true')
            ) \
            .ready_to_process()

    def can_request_transcription(self):
        return self.processing_allowed() \
            and self.has_stored_audio()

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

        transcript_file = core.data_models.TranscriptFile.where('podcast_episode_id', self.id).first()

        # Create a transcript file if there isn't one
        if not transcript_file:
            transcript_file = core.data_models.TranscriptFile()
            transcript_file.podcast_episode_id = self.id
            transcript_file.audio_file_id = self.audio_file().id
            transcript_file.source = self.podcast.transcript_provider
            transcript_file.source_model = self.podcast.transcript_provider_model
            transcript_file.guid = str(uuid.uuid4())
            transcript_file.save()
            transcript_file = transcript_file.fresh()

        if transcript_file.job_id:
            # If there is an existing job, update attributes accordingly
            if transcript_file.job_status in ['JobStatus.TRANSCRIBED', 'finished']:
                self.set_process_attribute('transcription_job_finished', 'true')
            else:
                self.set_process_attribute('transcription_job_finished', 'false')
        else:
            if transcript_file.source == 'pi':
                job = core.data_models.PiJob()
                job.media_to_process_url = self.audio_file().url()
                job.model = transcript_file.source_model
                job.priority = self.podcast.processing_level
                job.save()
                job = job.fresh()

                transcript_file.job_id = job.guid
                transcript_file.job_status = job.status
                transcript_file.save()

            elif transcript_file.source in ['deepgram']:
                try:
                    dg_client = Deepgram(core.env['deepgram_api_key'])
                    source = {'url': self.audio_file().url()}
                    options = {'punctuate': True, 'language': 'en', 'model': 'general-enhanced'}

                    # For the time being we will hang a thread waiting for a transcript from Deepgram
                    # Deepgram is much, much faster than Rev, but this may have a performance impact on ETL
                    # Near-term solution will have to involve setting up a callback API endpoint since the DG SDK
                    # Does not appear to have methods for checking job statuses
                    response = asyncio.run(dg_client.transcription.prerecorded(source, options))
                    print("DEEPGRAM RESPONSE")
                    print(response)

                    transcript_file.job_id = response['metadata']['request_id']
                    transcript_file.job_status = 'finished'
                    transcript_file.save()

                    self.store_transcription(force=True, transcript_json=response)
                    self.set_process_attribute('transcription_job_finished', 'true')
                except Exception as e:
                    self.set_process_attribute('transcription_job_finished', 'error')
                    self.log(f"ERROR REQUESTING TRANSCRIPTION FROM DEEPGRAM {e}")
                    transcript_file.job_status = 'error'
                    transcript_file.error = str(e)
                    transcript_file.save()

            elif transcript_file.source in ['rev', 'rev.ai']:
                client = apiclient.RevAiAPIClient(core.env['rev_ai_access_token'])
                # Request transcription from rev.ai if there is not a job
                job = client.submit_job_url(self.audio_file().url(), remove_disfluencies=True)

                transcript_file.job_id = job.id
                transcript_file.job_status = str(job.status)
                transcript_file.save()

        self.set_process_attribute('transcription_job_requested', 'true')

    # ----------------------------------------------------------------------------------------------------------------------------
    # Transcription Status
    # ----------------------------------------------------------------------------------------------------------------------------

    @staticmethod
    def dataset_should_update_transcription_status():
        return core.data_models.PodcastEpisode \
            .ready_to_process() \
            .join(JoinClause('podcast_episode_process_attributes') \
                .on('podcast_episodes.id', '=', 'podcast_episode_process_attributes.podcast_episode_id') \
                .where('podcast_episode_process_attributes.key', '=','transcription_job_requested')
                .where('podcast_episode_process_attributes.value', '=', 'true')
            ) \
            .join(JoinClause('podcast_episode_process_attributes_view') \
                .on('podcast_episodes.id', '=', 'podcast_episode_process_attributes_view.podcast_episode_id') \
                .where('podcast_episode_process_attributes_view.key', '=', 'transcription_job_finished')
                .where('podcast_episode_process_attributes_view.value', '=', 'false')
            )

    def transcription_is_ready(self):
        return self.process_attribute_value_is('transcription_job_finished', 'true')

    def can_update_subscription_status(self):
        return self.processing_allowed() \
            and self.has_requested_transcription()

    def should_update_transcription_status(self):
        return self.can_update_subscription_status() \
            and not self.transcription_is_ready()

    def update_transcription_status(self, force=False):
        if not self.should_update_transcription_status() and not force:
            self.log("SKIPPING UPDATING TRANSCRIPTION")
            return

        self.log("UPDATING TRANSCRIPTION STATUS")
        job_status = None
        transcript_file = core.data_models.TranscriptFile.where('podcast_episode_id', self.id).first()
        transcript_file.touch()

        if transcript_file.source == 'pi':
            job = core.data_models.PiJob.where('guid', transcript_file.job_id).first()

            if job:
                transcript_file.job_status = job.status
                transcript_file.save()

                if transcript_file.job_status == 'finished':
                    self.set_process_attribute('transcription_job_finished', 'true')
                elif transcript_file.job_status == 'error':
                    self.set_process_attribute('transcription_job_finished', 'error')
                    raise RuntimeError("Transcription job failed")

                if transcript_file.job_status not in ['finished', 'error']:
                    job_status = 'IN_PROGRESS'
            else:
                if transcript_file.job_id is not None:
                    self.set_process_attribute('transcription_job_finished', 'error')
                raise RuntimeError("Transcription job does not exist")

        elif transcript_file.source in ['rev', 'rev.ai']:
            client = apiclient.RevAiAPIClient(core.env['rev_ai_access_token'])

            job_details = client.get_job_details(transcript_file.job_id)
            job_status = str(job_details.status)

            transcript_file.job_status = job_status
            transcript_file.save()

            if job_status == 'JobStatus.TRANSCRIBED':
                self.set_process_attribute('transcription_job_finished', 'true')
            elif job_status == 'JobStatus.FAILED':
                self.set_process_attribute('transcription_job_finished', 'error')
                raise RuntimeError("Transcription job failed")
            elif job_status == 'JobStatus.IN_PROGRESS':
                job_status = 'IN_PROGRESS'
        else:
            transcript_file.error = 'Unknown transcription source for job status update'
            transcript_file.save()
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
        return core.data_models.PodcastEpisode \
            .join(JoinClause('podcast_episode_process_attributes') \
                .on('podcast_episodes.id', '=', 'podcast_episode_process_attributes.podcast_episode_id') \
                .where('podcast_episode_process_attributes.key', '=','transcription_job_finished')
                .where('podcast_episode_process_attributes.value', '=', 'true')
            ) \
            .join(JoinClause('podcast_episode_process_attributes_view') \
                .on('podcast_episodes.id', '=', 'podcast_episode_process_attributes_view.podcast_episode_id') \
                .where('podcast_episode_process_attributes_view.key', '=', 'transcribed')
                .where('podcast_episode_process_attributes_view.value', '<>', 'true')
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

    def store_transcription(self, force=False, transcript_json=None):
        if not self.should_store_transcription() and not force:
            self.log("SKIPPING STORING TRANSCRIPTION")
            return

        self.log("STORING TRANSCRIPTION")

        transcript_file = core.data_models.TranscriptFile.where('podcast_episode_id', self.id).first()

        if transcript_json is None:
            if transcript_file.source == 'pi':
                if transcript_file.job_status != 'finished':
                    raise RuntimeError("Transcription is not ready for storage")

                job = core.data_models.PiJob.where('guid', transcript_file.job_id).first()

                if job:
                    transcript_json = job.get_transcript()
                else:
                    raise RuntimeError("Transcription job does not exist")

            elif transcript_file.source in ['rev', 'rev.ai']:
                if transcript_file.job_status != 'JobStatus.TRANSCRIBED':
                    raise RuntimeError("Transcription is not ready for storage")

                client = apiclient.RevAiAPIClient(core.env['rev_ai_access_token'])
                transcript_json = client.get_transcript_json(transcript_file.job_id)
            elif podium_package_transcript_file.source == 'deepgram':
                transcript_json = core.data_models.TranscriptFile.reformat_deepgram_transcript(transcript_json)
        
        transcript_file.process_and_store_transcript(transcript_json)

        self.set_process_attribute('transcribed', 'true')

        # Fill in missing duration from transcription
        if self.duration is None or self.duration == 5432:
            self.duration = transcript_file.get_transcribed_length(transcript_json)
            self.save()

    # ----------------------------------------------------------------------------------------------------------------------------
    # Search Ingestion
    # ----------------------------------------------------------------------------------------------------------------------------

    @staticmethod
    def dataset_has_search_ingested():
        search_ingested = "select podcast_episode_id from podcast_episode_process_attributes where key='search_ingested' and value='true'"
        return core.data_models.PodcastEpisode.where_raw(f"podcast_episodes.id not in ({search_ingested})")

    @staticmethod
    def dataset_should_search_ingest():
        return core.data_models.PodcastEpisode \
            .join(JoinClause('podcast_episode_process_attributes') \
                .on('podcast_episodes.id', '=', 'podcast_episode_process_attributes.podcast_episode_id') \
                .where('podcast_episode_process_attributes.key', '=','vector_generated')
                .where('podcast_episode_process_attributes.value', '=', 'true')
            ) \
            .join(JoinClause('podcast_episode_process_attributes_view') \
                .on('podcast_episodes.id', '=', 'podcast_episode_process_attributes_view.podcast_episode_id') \
                .where('podcast_episode_process_attributes_view.key', '=', 'search_ingested')
                .where('podcast_episode_process_attributes_view.value', '<>', 'true')
            ) \
            .ready_to_process()

    def can_search_ingest(self):
        return self.processing_allowed() \
            and self.has_generated_vector()

    def has_search_ingested(self):
        return self.process_attribute_value_is('search_ingested', 'true')

    def should_search_ingest(self):
        return self.can_search_ingest() \
            and not self.has_search_ingested()

    async def search_ingest(self, force=False):
        if not self.should_search_ingest() and not force:
            self.log("SKIPPING SEARCH INGESTION")
            return

        self.log("SEARCH INGEST")

        if force:
            self.remove_from_search()

        await self.transcript_file().ingest_for_search()

        self.set_process_attribute('search_ingested', 'true')

    def remove_from_search(self, update_attribute=False):
        self.transcript_file().remove_from_search()
        if update_attribute:
            self.set_process_attribute('search_ingested', 'false')

    # ----------------------------------------------------------------------------------------------------------------------------
    # Preview Generation
    # ----------------------------------------------------------------------------------------------------------------------------

    @staticmethod
    def dataset_should_generate_previews():
        search_ingested = "select podcast_episode_id from podcast_episode_process_attributes where key='search_ingested' and value='true'"
        previews_generated = "select podcast_episode_id from podcast_episode_process_attributes where key='previews_generated' and value='true'"

        return core.data_models.PodcastEpisode \
            .ready_to_process() \
            .where_raw(f"podcast_episodes.id in ({search_ingested})") \
            .where_raw(f"podcast_episodes.id not in ({previews_generated})")

    def can_generate_previews(self):
        return self.processing_allowed() \
            and self.has_search_ingested()

    def has_generated_previews(self):
        return self.process_attribute_value_is('previews_generated', 'true')

    def should_generate_previews(self):
        return self.can_generate_previews() \
            and not self.has_generated_previews()

    async def generate_previews(self, force=False):
        if not self.should_generate_previews() and not force:
            self.log("SKIPPING GENERATING PREVIEWS")
            return

        self.log("GENERATING PREVIEWS")

        core.data_models.PodcastEpisodePreview \
            .where('podcast_episode_id', '=', self.id) \
            .where('type', '!=', 'default') \
            .delete()

        segments = self.get_segments()

        await self.generate_preview_representative(segments)
        await self.generate_previews_interesting(segments)
        await self.generate_previews_funny(segments)
        
        self.remove_duplicate_previews()
        await self.optimize_previews()

        self.set_process_attribute('previews_generated', 'true')

    def remove_duplicate_previews(self):
        threshold_seconds = 60
        all_previews = core.data_models.PodcastEpisodePreview \
            .where('podcast_episode_id', '=', self.id) \
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
        previews = core.data_models.PodcastEpisodePreview \
            .where('podcast_episode_id', '=', self.id) \
            .order_by('score', 'desc') \
            .limit(10) \
            .get()

        for preview in previews:
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
                preview.embedding_vector = await self.transcript_file().get_embedding_vector_for_start_end(preview.start, preview.end)
                # print(f'Optimized preview: Episode: {self.id}, Starts: {preview.start}, Ends: {preview.end}, Title: {preview.title}')
            else:
                preview.clip_gen_point_time = mid_preview_time
                preview.title = clip['title']
                preview.has_optimization_issue = True
                preview.optimization_issue_description = 'optimized_medium_clip_too_short'

            preview.save()

    async def generate_preview_representative(self, segments):
        core.data_models.PodcastEpisodePreview \
            .where('podcast_episode_id',self.id) \
            .where('type', 'fathom:representative') \
            .delete()

        representative_segment = None
        representative_similarity = 0

        for segment in segments:
            score = 0
            if segment['_source']['embedding_vector'] and self.primary_vector():
                score = core.vector.cosine_similarity(
                    segment['_source']['embedding_vector'],
                    self.primary_vector().vector
                )
            if score > representative_similarity:
                representative_segment = segment
                representative_similarity = score

        if representative_segment:
            
            # Determine the start and end time of the most representative sentence
            sentences = core.text.get_sentences(representative_segment['_source']['content'])

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
            representative_sentence = scored_sentences[0]

            if representative_sentence['score'] >= (representative_similarity - 0.01):    
                original_start, original_end = TranscriptFile.get_segment_text_start_end(representative_segment['_source'], representative_sentence['sentence'], prior_sentences=0)
            else:
                original_start, original_end = TranscriptFile.get_segment_start_end(representative_segment['_source'])
            
            start, end = TranscriptFile.get_segment_start_end(representative_segment['_source'])

            new_preview = core.data_models.PodcastEpisodePreview()
            new_preview.podcast_episode_id = self.id
            new_preview.original_start = original_start
            new_preview.original_end = original_end 
            new_preview.start = start - 0.300
            new_preview.end = end + 15
            new_preview.highlight = representative_segment['_source']['content'][:160]
            new_preview.score = representative_similarity
            new_preview.type = 'fathom:representative'
            new_preview.embedding_vector = representative_segment['_source']['embedding_vector']
            new_preview.save()

    async def generate_previews_interesting(self, segments):
        core.data_models.PodcastEpisodePreview \
            .where('podcast_episode_id',self.id) \
            .where('type', 'fathom:interesting') \
            .delete()

        middle_segments = []
        questions = []
        for segment in segments:
            middle_segments.append(segment)
            questions.append({
                'context': segment['_source']['content'],
                'question': "What is interesting about this?"
            })

        answers = await core.inference.question_answer_with_workers(questions)

        for index, answer in enumerate(answers['answers']):
            if answer['answer'] and answer['answer'] != '' and len(answer['answer'].split(' ')) > 5:
                original_start, original_end = TranscriptFile.get_segment_text_start_end(middle_segments[index]['_source'], answer['answer'], prior_sentences=0)
                start, end = TranscriptFile.get_segment_text_start_end(middle_segments[index]['_source'], answer['answer'], prior_sentences=4)

                score = 0
                if middle_segments[index]['_source']['embedding_vector'] and self.primary_vector():
                    score = core.vector.cosine_similarity(
                        middle_segments[index]['_source']['embedding_vector'],
                        self.primary_vector().vector
                    )

                start = start - 0.300
                if start < 0:
                    start = 0

                end = end + 15

                new_preview = core.data_models.PodcastEpisodePreview()
                new_preview.podcast_episode_id = self.id
                new_preview.original_start = original_start
                new_preview.original_end = original_end
                new_preview.start = start
                new_preview.end = end
                new_preview.highlight = answer['answer']
                new_preview.score = score
                new_preview.type = 'fathom:interesting'
                new_preview.embedding_vector = middle_segments[index]['_source']['embedding_vector']
                new_preview.save()

    async def generate_previews_funny(self, segments):
        core.data_models.PodcastEpisodePreview \
            .where('podcast_episode_id',self.id) \
            .where('type', 'fathom:funny') \
            .delete()

        middle_segments = []
        questions = []
        for segment in segments:
            middle_segments.append(segment)
            questions.append({
                'context': segment['_source']['content'],
                'question': "What is funny about this?"
            })

        answers = await core.inference.question_answer_with_workers(questions)

        for index, answer in enumerate(answers['answers']):
            if answer['answer'] and answer['answer'] != '' and len(answer['answer'].split(' ')) > 5:
                original_start, original_end = TranscriptFile.get_segment_text_start_end(middle_segments[index]['_source'], answer['answer'], prior_sentences=0)
                start, end = TranscriptFile.get_segment_text_start_end(middle_segments[index]['_source'], answer['answer'], prior_sentences=4)

                score = 0
                if middle_segments[index]['_source']['embedding_vector'] and self.primary_vector():
                    score = core.vector.cosine_similarity(
                        middle_segments[index]['_source']['embedding_vector'],
                        self.primary_vector().vector
                    )

                start = start - 0.300
                if start < 0:
                    start = 0

                end = end + 15
                
                new_preview = core.data_models.PodcastEpisodePreview()
                new_preview.podcast_episode_id = self.id
                new_preview.original_start = original_start
                new_preview.original_end = original_end
                new_preview.start = start
                new_preview.end = end
                new_preview.highlight = answer['answer']
                new_preview.score = score
                new_preview.type = 'fathom:funny'
                new_preview.embedding_vector = middle_segments[index]['_source']['embedding_vector']
                new_preview.save()

    # ----------------------------------------------------------------------------------------------------------------------------
    # Vector Generation
    # ----------------------------------------------------------------------------------------------------------------------------

    @staticmethod
    def dataset_should_generate_vector():
        return core.data_models.PodcastEpisode \
            .join(JoinClause('podcast_episode_process_attributes') \
                .on('podcast_episodes.id', '=', 'podcast_episode_process_attributes.podcast_episode_id') \
                .where('podcast_episode_process_attributes.key', '=','transcribed')
                .where('podcast_episode_process_attributes.value', '=', 'true')
            ) \
            .join(JoinClause('podcast_episode_process_attributes_view') \
                .on('podcast_episodes.id', '=', 'podcast_episode_process_attributes_view.podcast_episode_id') \
                .where('podcast_episode_process_attributes_view.key', '=', 'vector_generated')
                .where('podcast_episode_process_attributes_view.value', '<>', 'true')
            ) \
            .where('duration', '>', PodcastEpisode.MIN_VECTORIZE_DURATION) \
            .ready_to_process()

    def can_generate_vector(self):
        return self.processing_allowed() \
            and self.has_stored_transcription() \
            and self.duration is not None \
            and self.duration > PodcastEpisode.MIN_VECTORIZE_DURATION

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
        segments = self.transcript_file().get_segments(sentence_overlap=0)
        if len(segments) == 0:
            raise RuntimeError("Cannot generate vector without transcript segments")

        self.log("GENERATING VECTOR")

        # remove any existing vectors
        #if self.vector_id:
        #    self.remove_vector_from_collection(self.vector_id, PodcastEpisode.VECTOR_COLLECTION)
        #    self.vector_id = None
        #if self.vector_id_new:
        #    self.remove_vector_from_collection(self.vector_id_new, PodcastEpisode.NEW_VECTOR_COLLECTION)
        #    self.vector_id_new = None
        #if self.vector_id_recent:
        #    self.remove_vector_from_collection(self.vector_id_recent, PodcastEpisode.RECENT_VECTOR_COLLECTION)
        #    self.vector_id_recent = None
        if self.primary_vector():
            core.data_models.PodcastEpisodeVector.destroy(self.primary_vector().id)
            core.data_models.SinglestorePodcastEpisodeUnitVector.delete_from_podcast_episode(self)

        self.save()

        # generate vector
        embedding_vectors = await core.inference.text_embedding_vectors_with_workers(list([segment['content'] for segment in segments]))
        podcast_episode_vector = np.mean(embedding_vectors['embedding_vectors'], axis=0)

        # insert into podcast episode vectors
        db_podcast_episode_vector = core.data_models.PodcastEpisodeVector()
        db_podcast_episode_vector.podcast_episode_id = self.id
        db_podcast_episode_vector.vector = podcast_episode_vector.tolist()
        db_podcast_episode_vector.save()
        self.load('vectors')

        # insert into singlestore unit vector table
        core.data_models.SinglestorePodcastEpisodeUnitVector.upsert_from_podcast_episode_vector(db_podcast_episode_vector)

        # insert into main podcast episodes collection
        #self.vector_id = self.insert_vector_to_collection(PodcastEpisode.VECTOR_COLLECTION)
        #self.save()

        self.set_process_attribute('vector_generated', 'true')

        return podcast_episode_vector

    #def insert_vector_to_collection(self, collection_name):
    #    self.log(f"ADDING VECTOR TO {collection_name}")

    #    normalized_vector = np.array(self.primary_vector().vector).astype(float)
    #    normalized_vector = normalized_vector / np.linalg.norm(normalized_vector)
    #    status, vector_ids = core.ann.insert(
    #        [normalized_vector.tolist()],
    #        collection_name=collection_name,
    #        partition_tag=self.podcast.guid
    #    )

    #    return vector_ids[0]

    #def remove_vector_from_collection(self, vector_id, collection_name):
    #    self.log(f"REMOVING VECTOR ID {vector_id} FROM {collection_name}")
    #    core.ann.delete([vector_id], collection_name=collection_name)

    # ----------------------------------------------------------------------------------------------------------------------------
    # Vector Collection Refresh
    # ----------------------------------------------------------------------------------------------------------------------------

    #@staticmethod
    #def dataset_should_refresh_vector_collections():
    #    publication_age_in_days                         = "date_part('day', now() - publication_date)"
    #    duration_requirement                            = f"duration > {PodcastEpisode.MIN_VECTORIZE_DURATION}"
    #    belongs_in_new_vector_collection                = f"{publication_age_in_days} <= {PodcastEpisode.NEW_VECTOR_COLLECTION_MAX_DAYS} and {duration_requirement}"
    #    belongs_in_recent_vector_collection             = f"{publication_age_in_days} <= {PodcastEpisode.RECENT_VECTOR_COLLECTION_MAX_DAYS} and {duration_requirement} and not ({belongs_in_new_vector_collection})"
    #    should_be_added_to_new_vector_collection        = f"({belongs_in_new_vector_collection}) and vector_id_new is null"
    #    should_be_removed_from_new_vector_collection    = f"not ({belongs_in_new_vector_collection}) and vector_id_new is not null"
    #    should_be_added_to_recent_vector_collection     = f"({belongs_in_recent_vector_collection}) and vector_id_recent is null"
    #    should_be_removed_from_recent_vector_collection = f"not ({belongs_in_recent_vector_collection}) and vector_id_recent is not null"

    #    collection_membership = f"""
    #        (
    #            ({should_be_added_to_new_vector_collection}) or
    #            ({should_be_removed_from_new_vector_collection}) or
    #            ({should_be_added_to_recent_vector_collection}) or
    #            ({should_be_removed_from_recent_vector_collection})
    #        )
    #    """

    #    return core.data_models.PodcastEpisode \
    #        .where_raw(f"podcast_episodes.vector_id is not null") \
    #        .where_raw(f"podcast_episodes.publication_date is not null") \
    #        .where_raw(collection_membership)

    #def can_refresh_vector_collections(self):
    #    return self.primary_vector() is not None \
    #        and self.publication_date is not None

    #def belongs_in_new_vector_collection(self):
    #    return self.publication_age_in_days() <= PodcastEpisode.NEW_VECTOR_COLLECTION_MAX_DAYS \
    #        and self.duration is not None \
    #        and self.duration > PodcastEpisode.MIN_VECTORIZE_DURATION

    #def belongs_in_recent_vector_collection(self):
    #    return self.publication_age_in_days() <= PodcastEpisode.RECENT_VECTOR_COLLECTION_MAX_DAYS \
    #        and self.duration is not None \
    #        and self.duration > PodcastEpisode.MIN_VECTORIZE_DURATION \
    #        and not self.belongs_in_new_vector_collection()
    #def should_be_added_to_new_vector_collection(self):
    #    return (self.belongs_in_new_vector_collection() and self.vector_id_new == None)

    #def should_be_removed_from_new_vector_collection(self):
    #    return (not self.belongs_in_new_vector_collection() and self.vector_id_new != None)

    #def should_be_added_to_recent_vector_collection(self):
    #    return (self.belongs_in_recent_vector_collection() and self.vector_id_recent == None)

    #def should_be_removed_from_recent_vector_collection(self):
    #    return (not self.belongs_in_recent_vector_collection() and self.vector_id_recent != None)

    #def should_refresh_vector_collections(self):
    #    return self.can_refresh_vector_collections() \
    #        and ( \
    #            self.should_be_added_to_new_vector_collection() or \
    #            self.should_be_removed_from_new_vector_collection() or \
    #            self.should_be_added_to_recent_vector_collection() or \
    #            self.should_be_removed_from_recent_vector_collection()
    #        )

    #def refresh_vector_collections(self, force=False):
    #    if not self.should_refresh_vector_collections() and not force:
    #        self.log("SKIPPING REFRESHING VECTOR COLLECTIONS")
    #        return

    #    self.log("REFRESHING VECTOR COLLECTIONS")

    #    # New vector collection
    #    if self.should_be_added_to_new_vector_collection():
    #        self.vector_id_new = self.insert_vector_to_collection(PodcastEpisode.NEW_VECTOR_COLLECTION)
    #    elif self.should_be_removed_from_new_vector_collection():
    #        self.remove_vector_from_collection(self.vector_id_new, PodcastEpisode.NEW_VECTOR_COLLECTION)
    #        self.vector_id_new = None

        # Recent vector collection
    #    if self.should_be_added_to_recent_vector_collection():
    #        self.vector_id_recent = self.insert_vector_to_collection(PodcastEpisode.RECENT_VECTOR_COLLECTION)
    #    elif self.should_be_removed_from_recent_vector_collection():
    #        self.remove_vector_from_collection(self.vector_id_recent, PodcastEpisode.RECENT_VECTOR_COLLECTION)
    #        self.vector_id_recent = None

    #    self.save()

    # ----------------------------------------------------------------------------------------------------------------------------
    # Notifications
    # ----------------------------------------------------------------------------------------------------------------------------
    @staticmethod
    def dataset_should_send_new_episode_notifications():
        ready_to_send = "select podcast_episode_id from podcast_episode_process_attributes where key='new_episode_notifications' and value='ready'"

        return core.data_models.PodcastEpisode \
            .where_raw(f"podcast_episodes.id in ({ready_to_send})") \
            .where_raw(f"date_part('day', now() - publication_date) <= {PodcastEpisode.MAX_AGE_DAYS_NEW_EPISODE_NOTIFICATIONS}") \
            .system_processing_enabled()

    def can_send_new_episode_notifications(self):
        return self.system_processing_allowed() \
            and self.process_attribute_value_is('new_episode_notifications', 'ready')

    def has_sent_new_episode_notifications(self):
        return self.process_attribute_value_is('new_episode_notifications', 'sent')

    def should_send_new_episode_notifications(self):
        count_podcast_episodes_today = core.data_models.PodcastEpisode \
            .where('podcast_id', self.podcast_id) \
            .where('publication_date', self.publication_date) \
            .count()

        return count_podcast_episodes_today == 1 \
            and self.can_send_new_episode_notifications() \
            and not self.has_sent_new_episode_notifications()

    def get_user_tokens_for_new_episode_notification(self):
        # No ability to alias joins to the same table more than once using Orator
        # Once resolved this should be a dataset...
        query = f"""
            SELECT DISTINCT ua1.value FROM user_podcast_follows
            INNER JOIN user_attributes ua1 ON
                ua1.user_id = user_podcast_follows.user_id
                AND ua1.key = 'fcm_token_mobile'
            LEFT JOIN user_attributes ua2 ON
                ua2.user_id = user_podcast_follows.user_id
                AND ua2.key = 'new_notifications_enabled'
                AND ua2.value = 'false'
            WHERE
                ua2.id is null
                AND podcast_id = {self.podcast_id}
                AND notifications_enabled = True
        """

        tokens = [ t for sub in core.database.db.select(query) for t in sub]
        return tokens

    def send_new_episode_notification(self, tokens, force=False):
        if not self.should_send_new_episode_notifications() and not force:
            self.log("SKIPPING SEND NEW EPISODE NOTIFICATION")
            return

        title = self.podcast.title
        body = F"New Episode - {self.title}"
        image_url = self.thumbnail_image_url()
        data = {
            "type": "default",
            "image": image_url,
            "url_slug": self.full_url_slug(),
        }

        core.firebase.send_message(tokens, title, body, image_url, data)

    def initiate_sending_new_episode_notifications(self):
        if not self.has_sent_new_episode_notifications() and self.publication_age_in_days() <= PodcastEpisode.MAX_AGE_DAYS_NEW_EPISODE_NOTIFICATIONS:

            #TODO: Improve efficency...
            notify_count = len(self.get_user_tokens_for_new_episode_notification())

            if (self.has_generated_previews() or not self.episode_processing_allowed()) and notify_count > 0:
                self.set_process_attribute('new_episode_notifications', 'ready')
            elif (self.has_generated_previews() or not self.episode_processing_allowed()) and notify_count == 0:
                self.set_process_attribute('new_episode_notifications', 'none')
        elif not self.has_sent_new_episode_notifications() and self.publication_age_in_days() > PodcastEpisode.MAX_AGE_DAYS_NEW_EPISODE_NOTIFICATIONS:
            self.set_process_attribute('new_episode_notifications', 'too_old')

    def finalize_sending_new_episode_notifications(self, sent_count):
        self.set_process_attribute('new_episode_notifications', 'sent')
        self.set_process_attribute('new_episode_notifications_sent_count', str(sent_count))

    def publication_age_in_days(self):
        return (datetime.date.today() - self.publication_date).days

    # ----------------------------------------------------------------------------------------------------------------------------
    # Chapters Generation
    # ----------------------------------------------------------------------------------------------------------------------------
    def can_generate_chapters(self):
        return self.duration is not None \
            and self.duration > PodcastEpisode.MIN_VECTORIZE_DURATION \
            and self.description is not None

    def has_generated_chapters(self):
        return self.process_attribute_value_is('chapters_generated', 'true') or len(self.chapters) > 0

    def should_generate_chapters(self):
        return self.can_generate_chapters() \
            and not self.has_generated_chapters()

    def generate_chapters(self, force=False):
        if not self.should_generate_chapters() and not force:
            self.log("SKIPPING CHAPTERS GENERATION")
            return

        if self.chapters.count() > 0:
            for chapter in self.chapters:
                chapter.delete()

        chapters = core.text.get_chapters(self.description)
        
        # Looking for empty titles.
        if chapters:
            titles = [chapter['title'] for chapter in chapters]
            all_empty_titles = True
            for title in titles:
                if title:
                    all_empty_titles = False
                    break

        if not chapters or all_empty_titles:
            return None

        self.log("GENERATING CHAPTERS")

        # Insert into podcast_episode_chapters table.
        counter = 0
        for chapter in chapters:
            db_podcast_episode_chapter = core.data_models.PodcastEpisodeChapter()
            db_podcast_episode_chapter.start = chapter['start']
            if chapter['end'] is None and counter == len(chapters) - 1:
                db_podcast_episode_chapter.end = self.duration
            else:
                db_podcast_episode_chapter.end = chapter['end']
            db_podcast_episode_chapter.description = chapter['title']
            db_podcast_episode_chapter.podcast_episode_id = self.id
            db_podcast_episode_chapter.ai_generated = False
            db_podcast_episode_chapter.save()
            counter += 1

        if len(chapters) > 0:
            self.set_process_attribute('chapters_generated', 'true')

        return chapters

    # ----------------------------------------------------------------------------------------------------------------------------
    # AI Chapters Generation
    # ----------------------------------------------------------------------------------------------------------------------------
    def can_generate_ai_chapters(self):
        return self.has_stored_transcription() \
            and self.duration is not None \
            and self.duration > PodcastEpisode.MIN_VECTORIZE_DURATION \

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
        if not self.should_generate_ai_chapters() and not force:
            self.log("SKIPPING AI CHAPTERS GENERATION")
            return

        if self.chapters.count() > 0:
            for chapter in self.chapters:
                chapter.delete()
            
        try:
            transcript_file = self.transcript_file()
            sentences_object = transcript_file.get_sentences()

            paragraphs_object = await core.text.get_paragraphs(sentences_object)
            paragraphs = [item['content'] for item in paragraphs_object]
            samples = core.text.get_samples_to_score_for_topical_breaks(paragraphs)
            topical_break_scores = await core.text.get_topical_break_scores(samples)
            chapters = await core.text.get_ai_chapters(paragraphs_object, topical_break_scores)

        except:
            self.log("AI CHAPTERS GENERATION FAILED")
            self.log(traceback.format_exc())
            return None

        self.log("GENERATING AI CHAPTERS")

        # Insert into podcast_episode_chapters table.
        counter = 0
        for chapter in chapters:
            db_podcast_episode_chapter = core.data_models.PodcastEpisodeChapter()
            db_podcast_episode_chapter.start = chapter['start']
            if chapter['end'] is None and counter == len(chapters) - 1:
                db_podcast_episode_chapter.end = self.duration
            else:
                db_podcast_episode_chapter.end = chapter['end']
            db_podcast_episode_chapter.description = chapter['title']
            db_podcast_episode_chapter.podcast_episode_id = self.id
            db_podcast_episode_chapter.ai_generated = True
            db_podcast_episode_chapter.save()
            counter += 1

        if len(chapters) > 0:
            self.set_process_attribute('chapters_generated', 'true')

        return chapters

    def combined_title(self):
        combined_title_elements = [self.podcast.title, self.title, self.podcast.author, self.podcast.owner_name, self.podcast.url_slug]
        return ' '.join(filter(None, combined_title_elements))
    
    def store_in_elastic(self):   
        doc_body = {
            "podcast_episode_guid": self.guid,
            "podcast_guid": self.podcast.guid,
            "combined_title": self.combined_title(),
            "combined_title_typing": self.combined_title(),
            "title": self.title,
            "description": self.description
            }
        
        search = {
            "query": {
                    "bool": {
                    "must": [
                        {
                            "match": {
                            "podcast_episode_guid": self.guid
                            }
                        }
                    ]
                }
            }
        }

        results = core.elastic.search(search, index=PodcastEpisode.SEARCH_INDEX)

        if results['hits']['hits']:
            result = results['hits']['hits'][0]
            status = core.elastic.update(result["_id"], {"doc": doc_body}, index=PodcastEpisode.SEARCH_INDEX)
        else:
            status = core.elastic.index(doc_body, index=PodcastEpisode.SEARCH_INDEX)

        return None

    @staticmethod
    def backfill_elastic():
        pe_count = core.database.db.select('select count(id) from podcast_episodes')[0][0]
        print("Episode Count: " + str(pe_count))
        pe_iterator = 0
        pe_iteration_amount = 1000
        skip_count = 0

        while pe_iterator < pe_count:
            podcast_episodes = core.data_models.PodcastEpisode \
                .order_by('id', 'asc') \
                .offset(pe_iterator).limit(pe_iteration_amount) \
                .with_('podcast') \
                .get()
            
            actions_list = []

            for podcast_episode in podcast_episodes:
                try:
                    combined_title = podcast_episode.combined_title()
                    podcast_guid = podcast_episode.podcast.guid
                except:
                    combined_title = podcast_episode.title
                    podcast_guid = ""
                    skip_count += 1

                doc_body = {
                    "_index": PodcastEpisode.SEARCH_INDEX,
                    "podcast_episode_guid": podcast_episode.guid,
                    "podcast_guid": podcast_guid,
                    "combined_title": combined_title,
                    "combined_title_typing": combined_title,
                    "title": podcast_episode.title,
                    "description": podcast_episode.description
                    }
                actions_list.append(doc_body)


            core.elastic.bulk(actions_list)
            pe_iterator += pe_iteration_amount

        print(skip_count)

    def search_test():
        search = {
          "query": {
            "match": {
              "combined_title": "rogan anthony"
            }
          }
        }
        profile = core.profiler.start("Title Search")
        results = core.elastic.search(search, index=PodcastEpisode.SEARCH_INDEX, size=25)
        core.profiler.end(profile)

    # ----------------------------------------------------------------------------------------------------------------------------
    # Clip Generation. There is a size parameter to define the size of the clip.
    # 'short' will generate clips of about 150 words maximun.
    # 'medium' will generate clips of about 150 to 400 words.
    # The defailt is 'medium'.
    # ----------------------------------------------------------------------------------------------------------------------------
    def can_generate_clip(self):
        return self.has_stored_transcription() \
            and self.duration is not None \
            and self.duration > PodcastEpisode.MIN_VECTORIZE_DURATION

    async def generate_clip(self, requested_time_in_seconds=None, size='medium', generate_title=True):
        if not self.can_generate_clip() or requested_time_in_seconds is None:
            self.log(f"SKIPPING {size.upper()} CLIP GENERATION")
            return
    
        self.log(f"GENERATING {size.upper()} CLIP")
        
        profile = core.profiler.start("CLIP GENERATION")
        
        transcript_file = self.transcript_file()
        clip = await transcript_file.get_clip(requested_time_in_seconds, size, generate_title)
        
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

    # --------------------------------------------------------------------------------------------------------
    # Episode shortening functions
    # --------------------------------------------------------------------------------------------------------

    def get_segments_per_chapter(self, chapter, segments):
        segments_per_chapter = []
        for segment in segments:
            if segment['_source']['start'] >= chapter.start and segment['_source']['start'] <= chapter.end:
                segments_per_chapter.append(
                    {
                        'content': segment['_source']['content'], 
                        'start': segment['_source']['start'], 
                        'end': segment['_source']['end'], 
                        'vector': segment['_source']['embedding_vector']
                    }
                )
        return segments_per_chapter

    def get_ordered_segments_by_chapter_similarity(self, segments_per_chapter):
        segments_vectors = [segment['vector'] for segment in segments_per_chapter]
        segments_vectors = np.array(segments_vectors)

        # chapter average vector:
        chapter_vector = np.mean(segments_vectors, axis=0)

        for segment in segments_per_chapter:
            score = core.vector.cosine_similarity(
                segment['vector'],
                chapter_vector
            )
            segment['score'] = score

        # Sort segments_per_chapter by score:
        ordered_segments_per_chapter = sorted(segments_per_chapter, key=lambda k: k['score'], reverse=True)
    
        return ordered_segments_per_chapter

    async def get_chapter_summary_clip_and_score(self, segments_ordered_by_chapter_similarity):
        good =False
        index = 0
        while not good:
            try:
                most_representatitive_segment = segments_ordered_by_chapter_similarity[index]
                middle_point = (most_representatitive_segment['start'] + most_representatitive_segment['end']) / 2
                clip = await self.generate_clip(middle_point, size='medium', generate_title=False)
                good = True
            except:
                index += 1
                if index >= len(segments_ordered_by_chapter_similarity):
                    clip = ''
                    good = True
        if clip == '':
            return None, None

        clip_vector = await core.inference.text_embedding_vector(clip['clip'])
        score = core.vector.cosine_similarity(
            clip_vector,
            self.primary_vector().vector
        )

        return clip, score

    async def get_chapter_summary_clips(self):
        chapters = core.data_models.PodcastEpisodeChapter \
            .where('podcast_episode_id', self.id) \
            .get()
        
        segments = self.get_segments()
        
        list_of_clips = []
        if chapters:
            for chapter in chapters:
                segments_per_chapter = self.get_segments_per_chapter(chapter, segments)
                segments_ordered_by_chapter_similarity = self.get_ordered_segments_by_chapter_similarity(segments_per_chapter)
                clip, score = await self.get_chapter_summary_clip_and_score(segments_ordered_by_chapter_similarity)
                if clip:
                    list_of_clips.append({'start': clip['start_time'], 'end': clip['end_time'], 'score': score})

        # print(list_of_clips)
        return list_of_clips

    # ----------------------------------------------------------------------------------------------------------------------------
    # Episode Summary
    # ----------------------------------------------------------------------------------------------------------------------------
    def can_generate_summary(self):
        return self.has_stored_transcription() \
            and self.has_generated_chapters() \
            and self.duration is not None \
            and self.duration > PodcastEpisode.MIN_VECTORIZE_DURATION

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
            
        try:
            transcript = self.transcript_file()
            chapters = core.data_models.PodcastEpisodeChapter.where('podcast_episode_id', self.id).get()
            episode_summary = core.text.get_episode_summary(transcript, chapters)

        except:
            self.log("EPISODE SUMMARY GENERATION FAILED")
            self.log(traceback.format_exc())
            return None

        self.log("GENERATING EPISODE SUMMARY")

        # #Populate podcast_episode_summary table.
        # db_podcast_episode_summary = core.data_models.PodcastEpisodeSummary()
        # db_podcast_episode_summary.description = episode_summary
        # db_podcast_episode_summary.podcast_episode_id = self.id
        ##db_podcast_episode_summary.save()

        ##if episode_summary:
            ##self.set_process_attribute('summary_generated', 'true')

        return episode_summary

    @staticmethod
    def space_out_episodes(episodes):
        # space out the episodes if they have the same podcast_id
        def find_last_index(episodes_arranged_so_far, podcast_id):
            for index in range(len(episodes_arranged_so_far)-1, -1, -1):
                if episodes_arranged_so_far[index].podcast_id == podcast_id:
                    return index
            return -1

        arranged_episodes = []
        ideal_spacing = 5
        current_index = 0
        inserted_podcast_ids_this_round = []

        while len(episodes) > 0:
            current_episode = episodes[current_index]
            last_index = find_last_index(arranged_episodes, current_episode.podcast_id)
            if last_index == -1 and current_episode.podcast_id not in inserted_podcast_ids_this_round:
                arranged_episodes.append(current_episode)
                inserted_podcast_ids_this_round.append(current_episode.podcast_id)
                del episodes[current_index]
            else:
                if last_index + ideal_spacing <= (len(arranged_episodes) - 1) and current_episode.podcast_id not in inserted_podcast_ids_this_round:
                    # insert after last_index + ideal_spacing
                    arranged_episodes.insert(last_index + ideal_spacing, current_episode)
                    inserted_podcast_ids_this_round.append(current_episode.podcast_id)
                    del episodes[current_index]
                else:
                    current_index += 1

            if current_index > (len(episodes) - 1):
                current_index = 0
                if len(inserted_podcast_ids_this_round) == 0:
                    ideal_spacing -= 1
                inserted_podcast_ids_this_round = []

        return arranged_episodes

from .podcast import Podcast
from .podcast_guest import PodcastGuest
from .podcast_episode_process_attribute import PodcastEpisodeProcessAttribute
from .podcast_episode_preview import PodcastEpisodePreview
from .audio_file import AudioFile
from .transcript_file import TranscriptFile
from .podcast_episode_chapter import PodcastEpisodeChapter

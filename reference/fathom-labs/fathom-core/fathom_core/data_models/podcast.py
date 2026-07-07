import fathom_core as core
from .system_flag import SystemFlag

from orator import Model
from orator.orm import has_one, belongs_to, belongs_to_many, has_many, has_many_through, scope
from orator import accessor, mutator
from orator.query.join_clause import JoinClause

import boto3
from pathlib import Path
import shutil
import datetime
import asyncio
import decimal
import requests

import numpy as np
import decimal
import traceback
from contextlib import contextmanager
import re

class Podcast(Model):

    VECTOR_COLLECTION = "podcasts"
    TITLE_VECTOR_COLLECTION = "podcast-titles"
    SEARCH_INDEX = "pods"
    POPULAR_IDS = [1,3,7,8,10,11,12,13,14,15,17,19,29,35,36,37,39,40,47,48,52,54,57,65,80,83,96,115,117,118,119,120,123,132,135,146,150,156,158,160,165,174,175,176,178,179,185,188,191,193,202,212,216,237,244,252,254,258,262,266,271,272,273,275,282,291,299,304,321,325,327,330,331,334,340,348,356,361,372,377,394,396,402,416,419,420,425,433,475,488,495,498,512,524,605,607,611,614,621,622,643,655,685,702,742,743,744,751,754,778,793,798,853,868,893,909,935,968,971,976,997,1014,1015,1016,1017,1018,1019,1020,1021,1022,1023,1024,1028,1030,1032,1036,1039,1041,1042,1043,1044,1045,1046,1048,1049,1051,1052,1055,1057,1063,1067,1074,1075,1079,1083,1085,1087,1091,1092,1099,1114,1119,1120,1147,1168,1169,1177,1178,1186,1196,1208,1223,1225,1231,1233,1234,1242,1251,1253,1266,1270,1271,1293,1294,1302,1303,1305,1307,8408,239129,249441,262429,386618,522317,555047,755781,803838,951504,1108607,1503414,2150117,2153879]
    logger = core.log

    __appends__ = ['followed_at', 'user_listened_count', 'user_listened_recently_count', 'user_new_episodes_count']

    @accessor
    def followed_at(self):
        if 'followed_at' in self._attributes:
            return self.get_raw_attribute('followed_at')
        else:
            return None

    @followed_at.mutator
    def set_followed_at(self, value):
        self.set_raw_attribute('followed_at', value)

    @accessor
    def user_listened_count(self):
        if 'user_listened_count' in self._attributes:
            return self.get_raw_attribute('user_listened_count')
        else:
            return 0

    @user_listened_count.mutator
    def set_user_listened_count(self, value):
        self.set_raw_attribute('user_listened_count', value)

    @accessor
    def user_listened_recently_count(self):
        if 'user_listened_recently_count' in self._attributes:
            return self.get_raw_attribute('user_listened_recently_count')
        else:
            return 0

    @user_listened_recently_count.mutator
    def set_user_listened_recently_count(self, value):
        self.set_raw_attribute('user_listened_recently_count', value)

    @accessor
    def user_new_episodes_count(self):
        if 'user_new_episodes_count' in self._attributes:
            return self.get_raw_attribute('user_new_episodes_count')
        else:
            return 0

    @user_new_episodes_count.mutator
    def set_user_new_episodes_count(self, value):
        self.set_raw_attribute('user_new_episodes_count', value)

    @belongs_to
    def user(self):
        return User

    @has_many
    def user_follows(self):
        from .user_podcast_follow import UserPodcastFollow
        return UserPodcastFollow

    @has_many
    def podcast_episodes(self):
        return PodcastEpisode

    @belongs_to_many
    def categories(self):
        return PodcastCategory

    @has_many
    def vectors(self):
        from .podcast_vector import PodcastVector
        return PodcastVector

    def primary_vector(self):
        vector = None

        vectors = self.vectors
        if len(vectors) > 0:
            vector = vectors[0]

        return vector

    @scope
    def order_by_update_priority(self, query):
        return query.order_by_raw('last_rss_updated_at asc nulls first')

    @scope
    def ready_to_update(self, query, processing_levels=[3]):
        return query.where("error_count", "<", 10) \
            .where_in("processing_level", processing_levels) \
            .where_raw(SystemFlag.where_raw_is_active("podcast_updating_enabled"))

    def follower_count(self):
        return core.data_models.UserPodcastFollow.where('podcast_id', self.id).count()
    
    def change_url_slug(self, new_url_slug):
        if new_url_slug == self.url_slug:
            return

        with core.database.db.transaction():
            old_s3_prefix = self.s3_prefix()
            old_hero_image_s3_key = self.hero_image_s3_key
            old_thumbnail_image_s3_key = self.thumbnail_image_s3_key

            self.url_slug = new_url_slug
            self.set_hero_image_s3_key()
            self.set_thumbnail_image_s3_key()
            self.save()

            new_s3_prefix = self.s3_prefix()

            self.move_s3_file(old_hero_image_s3_key, self.hero_image_s3_key)
            self.move_s3_file(old_thumbnail_image_s3_key, self.thumbnail_image_s3_key)

        podcast_episodes = f"select id from podcast_episodes where podcast_id = {self.id}"

        audio_files = core.data_models.AudioFile \
            .where_raw(f"podcast_episode_id in ({podcast_episodes})") \
            .where_raw("s3_key is not null") \
            .get()

        for audio_file in audio_files:
            with core.database.db.transaction():
                old_s3_key = audio_file.s3_key

                audio_file.s3_key = audio_file.s3_key.replace(old_s3_prefix, new_s3_prefix, 1)
                audio_file.save()

                self.move_s3_file(old_s3_key, audio_file.s3_key)

        transcript_files = core.data_models.TranscriptFile \
            .where_raw(f"podcast_episode_id in ({podcast_episodes})") \
            .where_raw("s3_key is not null") \
            .get()

        for transcript_file in transcript_files:
            with core.database.db.transaction():
                old_s3_key = transcript_file.s3_key

                transcript_file.s3_key = transcript_file.s3_key.replace(old_s3_prefix, new_s3_prefix, 1)
                transcript_file.save()

                self.move_s3_file(old_s3_key, transcript_file.s3_key)

    def s3_prefix(self, path=""):
        return f"podcasts/{core.text.get_url_friendly(self.url_slug).replace('-', '_')}/{path}"

    def set_hero_image_s3_key(self):
        self.hero_image_s3_key = self.s3_prefix("images/hero.jpg")

    def set_thumbnail_image_s3_key(self):
        self.thumbnail_image_s3_key = self.s3_prefix("images/thumbnail.jpg")

    def set_share_image_s3_key(self):
        self.share_image_s3_key = self.s3_prefix("images/share.jpg")

    def move_s3_file(self, from_key, to_key):
        s3 = boto3.client('s3', aws_access_key_id=core.env['aws_access_key'], aws_secret_access_key=core.env['aws_access_secret'])
        copy_source = {
            'Bucket': self.s3_bucket,
            'Key': from_key
        }
        s3.copy(copy_source, self.s3_bucket, to_key, {'ACL': 'public-read'})
        s3.delete_object(Bucket=self.s3_bucket, Key=from_key)

    @contextmanager
    def error_logging(self):
        try:
            yield
            self.error = None
            self.error_count = 0
            self.save()
        except Exception as e:
            self.error = traceback.format_exc()
            self.error_count += 1
            self.save()
            raise e

    def log(self, message):
        self.logger.info(f"PODCAST ID  {self.id} | '{self.title}' : {message}")

    @classmethod
    def log(self, message):
        self.logger.info(f"{self.__name__} : {message}")

    def count_episodes(self):
        return PodcastEpisode.where("podcast_id", self.id).count()
    
    def count_episodes_processed(self):
        return PodcastEpisode.where("podcast_id", self.id).where_not_null("vector_id").count()

    def hero_image_url(self):
        if self.hero_image_s3_key:
            return f"https://{self.s3_bucket}.s3.amazonaws.com/{self.hero_image_s3_key}"
        else:
            return self.rss_image_url

    def hero_image_url_cdn(self):
        hero_image_url_cdn = self.hero_image_url()
        
        if hero_image_url_cdn is not None:
            hero_image_url_cdn = hero_image_url_cdn.replace("https://fathom-production.s3.amazonaws.com/", "https://d3jbilhebgld9z.cloudfront.net/")

        return hero_image_url_cdn

    def thumbnail_image_url(self):
        if self.thumbnail_image_s3_key:
            return f"https://{self.s3_bucket}.s3.amazonaws.com/{self.thumbnail_image_s3_key}"
        else:
            return self.hero_image_url()

    def thumbnail_image_url_cdn(self):
        thumbnail_image_url_cdn = self.thumbnail_image_url()
        
        if thumbnail_image_url_cdn is not None:
            thumbnail_image_url_cdn = thumbnail_image_url_cdn.replace("https://fathom-production.s3.amazonaws.com/", "https://d3jbilhebgld9z.cloudfront.net/")

        return thumbnail_image_url_cdn

    def share_image_url(self):
        if self.share_image_s3_key:
            return f"https://{self.s3_bucket}.s3.amazonaws.com/{self.share_image_s3_key}"
        else:
            return self.hero_image_url()

    def share_image_url_cdn(self):
        share_image_url_cdn = self.share_image_url()
        
        if share_image_url_cdn is not None:
            share_image_url_cdn = share_image_url_cdn.replace("https://fathom-production.s3.amazonaws.com/", "https://d3jbilhebgld9z.cloudfront.net/")

        return share_image_url_cdn

    def has_unique_episode_art(self):
        has_unique_episode_art = True

        episode_rss_image_urls = core.data_models.PodcastEpisode \
            .where('podcast_id', self.id) \
            .order_by('publication_date', 'desc') \
            .limit(2) \
            .lists('rss_image_url')

        if len(episode_rss_image_urls) > 1:
            if episode_rss_image_urls[0] == episode_rss_image_urls[1]:
                has_unique_episode_art = False

        return has_unique_episode_art

    async def ingest_for_search(self, force=False):
        for podcast_episode in self.podcast_episodes:
            await podcast_episode.ingest_for_search(force=force)

    def updating_allowed(self):
        if not SystemFlag.is_active('podcast_updating_enabled'):
            self.log("UPDATING NOT ALLOWED DUE SYSTEM FLAG")
            return False

        return True

    def update(self):
        if self.updating_allowed():
            self.update_from_rss()
            self.update_expected_publish()
            self.update_vector()

    def update_from_rss(self):
        self.log("UPDATING FROM RSS...")

        self.last_rss_updated_at = datetime.datetime.utcnow()
        self.save()

        if not self.s3_bucket:
            self.s3_bucket = core.env['aws_s3_bucket']

        podcast_rss = core.rss.parse(self.rss_url, podcast=self)

        if podcast_rss['new_rss_url'] and self.rss_url != podcast_rss['new_rss_url']:
            self.rss_url = podcast_rss['new_rss_url']

        if podcast_rss['title'] and self.title != podcast_rss['title']:
            self.title = podcast_rss['title']
            self.title_lower = self.title.lower()

        if self.processing_level > 1:
            self.generate_title_vector()

        if not self.url_slug and podcast_rss['title']:

            def can_set_url_slug(potential_url_slug):
                count_existing = Podcast.where('url_slug', potential_url_slug).count()
                if count_existing == 0:
                    return True
                else:
                    return False

            title_url_slug = core.text.get_url_friendly(podcast_rss['title'])
            title_author_url_slug = core.text.get_url_friendly(f"{podcast_rss['title']}-{podcast_rss['author']}")

            if can_set_url_slug(title_url_slug):
                self.url_slug = title_url_slug
            elif can_set_url_slug(title_author_url_slug):
                self.url_slug = title_author_url_slug
            else:
                self.url_slug = str(self.guid)

        elif not self.url_slug and not podcast_rss['title']:
            self.url_slug = str(self.guid)

        if not self.name_id and self.url_slug:
            self.name_id = self.url_slug.replace('-', '')

        if podcast_rss['description'] and self.description != podcast_rss['description']:
            self.description = podcast_rss['description']

        if podcast_rss['image_url'] and self.rss_image_url != podcast_rss['image_url']:
            self.rss_image_url = podcast_rss['image_url']
            # clear out old values to trigger re-processing
            self.hero_image_s3_key = None
            self.thumbnail_image_s3_key = None
            self.colors = None

        if self.processing_level > 1:

            # TODO: create individual methods for each image processing step
            # hero image
            from wand.image import Image
            from colorthief import ColorThief

            if not self.hero_image_s3_key and self.rss_image_url:
                temp_files_path = self.get_temp_files_path()

                hero_image_file_path = f"{temp_files_path}hero.jpg"
                temp_image_file = core.utility.download_file(self.rss_image_url, temp_file_path=temp_files_path)

                with Image(filename=temp_image_file) as img:
                    img.format = 'jpeg'
                    img.compression_quality = 100

                    if img.width != img.height:
                        img = img[:img.width, :]

                    if img.width > 750:
                        img.resize(750, 750)

                    img.save(filename=hero_image_file_path)

                self.set_hero_image_s3_key()

                s3 = boto3.client('s3', aws_access_key_id=core.env['aws_access_key'], aws_secret_access_key=core.env['aws_access_secret'])
                s3.put_object(Body=open(hero_image_file_path, 'rb'), Bucket=self.s3_bucket, Key=self.hero_image_s3_key, ACL='public-read')

                shutil.rmtree(temp_files_path)

            # thumbnail image
            if not self.thumbnail_image_s3_key and self.rss_image_url:
                temp_files_path = self.get_temp_files_path()

                thumbnail_image_file_path = f"{temp_files_path}thumbnail.jpg"
                temp_image_file = core.utility.download_file(self.rss_image_url, temp_file_path=temp_files_path)

                with Image(filename=temp_image_file) as img:
                    img.format = 'jpeg'
                    img.compression_quality = 100

                    if img.width != img.height:
                        img = img[:img.width, :]

                    if img.width > 200:
                        img.resize(200, 200)

                    img.save(filename=thumbnail_image_file_path)

                self.set_thumbnail_image_s3_key()

                s3 = boto3.client('s3', aws_access_key_id=core.env['aws_access_key'], aws_secret_access_key=core.env['aws_access_secret'])
                s3.put_object(Body=open(thumbnail_image_file_path, 'rb'), Bucket=self.s3_bucket, Key=self.thumbnail_image_s3_key, ACL='public-read')

                shutil.rmtree(temp_files_path)

            # share image
            self.generate_share_image()

            # colors
            if not self.colors and self.rss_image_url:
                temp_files_path = self.get_temp_files_path()
                try:
                    temp_image_file = core.utility.download_file(self.hero_image_url(), temp_file_path=temp_files_path)
                    #profile = core.profiler.start('COLORS')
                    color_thief = ColorThief(temp_image_file)
                    palette = color_thief.get_palette(color_count=6, quality=1)

                    self.colors = []
                    for color in palette:
                        color_values = f"{str(color[0])},{str(color[1])},{str(color[2])}"
                        self.colors.append(color_values)
                    #core.profiler.end(profile)
                except Exception as e:
                    self.logger.debug(f"ERROR EXTRACTING PODCAST IMAGE COLORS FOR {self.title} ")
                    self.logger.critical(e, exc_info=True)

                shutil.rmtree(temp_files_path)
        else:
            self.colors = ['0,0,0']

        # Categories
        if len(self.categories) == 0:
            for category in podcast_rss['categories']:
                db_category = core.data_models.PodcastCategory.where('title', category['text']).first()
                if not db_category:
                    db_category = core.data_models.PodcastCategory()
                    db_category.title = category['text']
                    db_category.save()

                exists = core.data_models.PodcastCategoriesPodcast \
                    .where('podcast_category_id', db_category.id) \
                    .where('podcast_id', self.id) \
                    .first()
                if not exists:
                    podcast_category_to_podcast = core.data_models.PodcastCategoriesPodcast()
                    podcast_category_to_podcast.podcast_id = self.id
                    podcast_category_to_podcast.podcast_category_id = db_category.id
                    podcast_category_to_podcast.save()

        if podcast_rss['website_url'] and self.website_url != podcast_rss['website_url']:
            self.website_url = podcast_rss['website_url']

        if podcast_rss['author'] and self.author != podcast_rss['author']:
            self.author = podcast_rss['author']
            self.author_lower = self.author.lower()

        if podcast_rss['owner_name'] and self.owner_name != podcast_rss['owner_name']:
            self.owner_name = podcast_rss['owner_name']
            self.owner_name_lower = self.owner_name.lower()

        if podcast_rss['owner_email'] and self.owner_email != podcast_rss['owner_email']:
            self.owner_email = podcast_rss['owner_email']

        if not self.explicit:
            self.explicit = podcast_rss['explicit']

        if not self.episode_type:
            self.episode_type = podcast_rss['episode_type']

        self.save()

        podcast_episodes = core.data_models.PodcastEpisode \
            .where('podcast_id', self.id) \
            .get()

        rss_guids = list([podcast_episode.rss_guid for podcast_episode in podcast_episodes])

        podcast_rss_episodes = podcast_rss['episodes']
        if self.processing_level <= 1:
            podcast_rss_episodes = podcast_rss['episodes'][:25]

        for rss_episode in podcast_rss_episodes:
            try:
                if rss_episode['guid'] not in rss_guids:
                    self.log(f"CREATING PODCAST EPISODE: {rss_episode['title']}")
                    core.data_models.PodcastEpisode.create_from_rss(rss_episode, self)
                else:
                    index = rss_guids.index(rss_episode['guid'])
                    podcast_episode = podcast_episodes[index]
                    if podcast_episode.updated_at == None and rss_episode['guid'] == podcast_episode.rss_guid:
                        self.log(f"UPDATING PODCAST EPISODE: {rss_episode['title']}")
                        with podcast_episode.error_logging():
                            podcast_episode.update_from_rss(rss_episode)
            except Exception as e:
                self.logger.debug(f"ERROR CREATING/UPDATING PODCAST EPISODE FROM RSS {rss_episode} ")
                self.logger.critical(e, exc_info=True)

        
        self.store_in_elastic()

        self.log("FINISHED UPDATING FROM RSS!")

    def get_temp_files_path(self):
        temp_files_path = f"/tmp/podcast/{self.guid}/"
        Path(temp_files_path).mkdir(parents=True, exist_ok=True)

        return temp_files_path

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

        except Exception as e:
            self.logger.debug(f"ERROR GENERATEING SHARE IMAGE FOR PODCAST {self.id} | {self.title} ")
            self.logger.critical(e, exc_info=True)

        # clean up
        shutil.rmtree(temp_files_path)

    def get_background_color(self):
        background_color = core.color.get_color_from_palette(self.colors)
        return background_color

    def generate_title_vector(self):
        if not self.title_vector_id and self.title and self.title != '':
            try:
                embedding_vectors = asyncio.run(core.inference.text_embedding_vectors([self.title]))
                title_vector = embedding_vectors['embedding_vectors'][0]
                normalized_vector = np.array(title_vector).astype(float)
                normalized_vector = normalized_vector / np.linalg.norm(normalized_vector)
                vector_ids = core.ann.insert(
                    [normalized_vector.tolist()],
                    collection_name=Podcast.TITLE_VECTOR_COLLECTION,
                    data_model=self
                )
                self.title_vector_id = vector_ids[0]
                self.save()
            except Exception as e:
                self.logger.debug(f"ERROR CREATING TITLE VECTOR FOR PODCAST {self.id} | {self.title} ")
                self.logger.critical(e, exc_info=True)

    def update_expected_publish(self):
        """Updates the next expected episode date by taking the average gap between the last 5 episodes."""
        dates = core.data_models.PodcastEpisode \
            .where('podcast_id', self.id) \
            .where_raw('publication_date is not null') \
            .select('publication_date') \
            .order_by('publication_date', 'desc') \
            .limit(5) \
            .lists('publication_date')

        if len(dates) == 0:
            return

        day_gaps = list()

        for x in range(len(dates)):
            if x == len(dates)-1:
                continue
            delta = dates[x] - dates[x+1]
            day_gaps.append(delta.days)

        days_until_next_publish = round(np.average(day_gaps))

        self.last_publish_on = dates[0]
        self.expected_to_publish_on = dates[0] + datetime.timedelta(days=days_until_next_publish)
        self.save()

    @staticmethod
    def dataset_valid_podcast_episode_vectors(query):
        return query \
            .join(JoinClause('podcast_episode_vectors') \
                .on('podcast_episode_vectors.podcast_episode_id', '=', 'podcast_episodes.id')
            ) \
            .where_not_null('duration') \
            .where('duration', '>', PodcastEpisode.MIN_VECTORIZE_DURATION) \


    def should_update_vector(self):
        max_vectorized_episode_pub_date_query = core.database.db.table('podcast_episodes').where('podcast_id', self.id)
        max_vectorized_episode_pub_date_query = Podcast.dataset_valid_podcast_episode_vectors(max_vectorized_episode_pub_date_query)
        max_vectorized_episode_pub_date = max_vectorized_episode_pub_date_query.max('publication_date')

        vectorized_episodes_count_query = core.database.db.table('podcast_episodes').where('podcast_id', self.id)
        vectorized_episodes_count_query = Podcast.dataset_valid_podcast_episode_vectors(vectorized_episodes_count_query)
        vectorized_episodes_count= vectorized_episodes_count_query.count()

        return max_vectorized_episode_pub_date is not None \
            and max_vectorized_episode_pub_date > self.vector_updated_at

    def update_vector(self, force=False):
        if self.should_update_vector() or force:
            self.log("UPDATING VECTOR...")

            # remove previous vector
            if self.primary_vector():
                core.data_models.PodcastVector.destroy(self.primary_vector().id)
                core.data_models.SinglestorePodcastUnitVector.delete_from_podcast(self)
            if self.vector_id:
                status = core.ann.delete([self.vector_id], collection_name=Podcast.VECTOR_COLLECTION)

            # get all episode vectors
            podcast_episodes_query = core.data_models.PodcastEpisode \
                .with_('vectors') \
                .select('podcast_episodes.id', 'podcast_episodes.publication_date') \
                .where('podcast_id', self.id)
            podcast_episodes_query = Podcast.dataset_valid_podcast_episode_vectors(podcast_episodes_query)
            podcast_episodes = podcast_episodes_query.get()

            podcast_episode_vectors = []
            for podcast_episode in podcast_episodes:
                if (datetime.date.today() - podcast_episode.publication_date).days <= 15:
                    weight = 3
                elif (datetime.date.today() - podcast_episode.publication_date).days <= 90:
                    weight = 2
                else:
                    weight = 1

                weighted_vector = {
                    'vector': np.array(podcast_episode.primary_vector().vector).astype(float),
                    'weight': weight
                }
                podcast_episode_vectors.append(weighted_vector)

            podcast_vector = np.average(
                list([pev['vector'] for pev in podcast_episode_vectors]),
                weights=list([pev['weight'] for pev in podcast_episode_vectors]),
                axis=0
            )

            # insert into podcast vectors
            db_podcast_vector = core.data_models.PodcastVector()
            db_podcast_vector.podcast_id = self.id
            db_podcast_vector.vector = podcast_vector.tolist()
            db_podcast_vector.save()
            self.load('vectors')

            # insert into singlestore unit vector table
            core.data_models.SinglestorePodcastUnitVector.upsert_from_podcast_vector(db_podcast_vector)

             # insert into main podcast collection
            normalized_vector = podcast_vector / np.linalg.norm(podcast_vector)
            vector_ids = core.ann.insert(
                [normalized_vector.tolist()], 
                collection_name=Podcast.VECTOR_COLLECTION,
                data_model=self
            )
            self.vector_id = vector_ids[0]
            self.vector_updated_at = datetime.date.today()
            self.save()

            self.log("FINISHED UPDATING VECTOR!")

    @classmethod
    def update_all_processing_levels(self):
        """
        Updates processing levels for all podcasts in level 1 or 2.
        """

        table = self().get_table()

        # Downgrade from level 2 to 1 if popularity = 0
        # count = core.database.db.update(f"""
        #     update {table}
        #     set processing_level = 1
        #     where podcast_index_popularity_score = 0
        #     and processing_level = 2;
        # """)

        # self.log(f"Downgraded {count} podcasts from level 1 to 2")

        # Upgrade from level 1 to 2 if popularity > 0
        count = core.database.db.update(f"""
            update {table}
            set processing_level = 2
            where podcast_index_popularity_score > 0
            and processing_level = 1;
        """)

        self.log(f"Upgraded {count} podcasts from level 1 to 2")

    def combined_title(self):
        combined_title_elements = [self.title, self.author, self.owner_name, self.url_slug]
        return ' '.join(filter(None, combined_title_elements))

    def store_in_elastic(self):
        doc_body = {
            "podcast_guid": self.guid,
            "title": self.title,
            "combined_title": self.combined_title(),
            "combined_title_typing": self.combined_title()
            }
        
        search = {
            "query": {
                    "bool": {
                    "must": [
                        {
                            "match": {
                            "podcast_guid": self.guid
                            }
                        }
                    ]
                }
            }
        }

        results = core.elastic.search(search, index=Podcast.SEARCH_INDEX)

        if results['hits']['hits']:
            result = results['hits']['hits'][0]
            if result['_source']['combined_title'] != self.combined_title():
                status = core.elastic.update(result["_id"], {"doc": doc_body}, index=Podcast.SEARCH_INDEX)
        else:
            status = core.elastic.index(doc_body, index=Podcast.SEARCH_INDEX)

        return None

    @staticmethod
    def backfill_elastic():
        podcast_count = core.database.db.select('select count(id) from podcasts where processing_level < 2')[0][0]
        print("Podcast Count: " + str(podcast_count))
        podcast_iterator = 0
        podcast_iteration_amount = 1000

        while podcast_iterator < podcast_count:
            podcasts = core.data_models.Podcast \
                .where('processing_level', '<', 2) \
                .order_by('id', 'asc') \
                .offset(podcast_iterator).limit(podcast_iteration_amount) \
                .get()
            
            actions_list = []

            for podcast in podcasts:
                doc_body = {
                    "_index": Podcast.SEARCH_INDEX,
                    "podcast_guid": podcast.guid,
                    "title": podcast.title,
                    "combined_title": podcast.combined_title(),
                    "combined_title_typing": podcast.combined_title()
                    }
                actions_list.append(doc_body)


            core.elastic.bulk(actions_list)
            podcast_iterator += podcast_iteration_amount

from .podcast_episode import PodcastEpisode
from .podcast_category import PodcastCategory

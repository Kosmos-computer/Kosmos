import fathom_core as core
from .usermixin_recommendation import UserRecommendationMixin

import datetime
from datetime import date, timedelta

from orator import Model
from orator.orm import has_one, belongs_to, belongs_to_many, has_many, has_many_through
from orator.query.join_clause import JoinClause

import boto3
from boto3.dynamodb.conditions import Key

import numpy as np
from scipy.spatial.distance import *


class User(Model, UserRecommendationMixin):

    @has_many
    def user_taste_vectors(self):
        return UserTasteVector

    @has_many
    def attributes(self):
        from .user_attribute import UserAttribute
        return UserAttribute

    def set_user_attribute(self, key, value):
        user_attribute = self.get_attribute(key)

        if not user_attribute:
            user_attribute = UserAttribute()
            user_attribute.user_id = self.id
            user_attribute.key = key

        user_attribute.value = value
        user_attribute.save()

        return user_attribute

    def get_user_attribute(self, key):
        return UserAttribute \
            .where('user_id', self.id) \
            .where('key', key) \
            .first()

    @has_many
    def podcasts(self):
        from .podcast import Podcast
        return Podcast

    @has_many
    def searches(self):
        from .user_search import UserSearch
        return UserSearch.order_by('created_at', 'desc')

    @belongs_to_many
    def podcast_categories(self):
        from .podcast_category import PodcastCategory
        return PodcastCategory

    def podcast(self):
        return self.podcasts[0]

    @has_many
    def podcast_follows(self):
        from .user_podcast_follow import UserPodcastFollow
        return UserPodcastFollow.order_by('created_at', 'desc')

    def followed_podcasts(self):
        from .podcast import Podcast
        podcasts = core.data_models.Podcast \
            .with_('categories') \
            .with_({'user_follows': core.data_models.UserPodcastFollow.query().where('user_id', self.id)}) \
            .join('user_podcast_follows', 'user_podcast_follows.podcast_id', '=', 'podcasts.id') \
            .where('user_podcast_follows.user_id', self.id) \
            .select('podcasts.*', 'user_podcast_follows.created_at as followed_at') \
            .order_by('user_podcast_follows.created_at', 'desc') \
            .get()

        user_podcasts_listened_count = self.user_podcasts_listened_count()
        
        for podcast in podcasts:
            if podcast.id in user_podcasts_listened_count:
                podcast.user_listened_count = user_podcasts_listened_count[podcast.id]

        user_podcasts_listened_recently_count = self.user_podcasts_listened_recently_count()
        
        for podcast in podcasts:
            if podcast.id in user_podcasts_listened_recently_count:
                podcast.user_listened_recently_count = user_podcasts_listened_recently_count[podcast.id]

        user_podcasts_new_episodes_count = self.user_podcasts_new_episodes_count()

        for podcast in podcasts:
            if podcast.id in user_podcasts_new_episodes_count:
                podcast.user_new_episodes_count = user_podcasts_new_episodes_count[podcast.id]
        
        return podcasts

    def dataset_user_podcasts_listened_count(self):
        from .podcast_episode import PodcastEpisode
        return core.data_models.Podcast \
            .join('podcast_episodes', 'podcast_episodes.podcast_id', '=', 'podcasts.id') \
            .join('user_queue_podcast_episodes', 'user_queue_podcast_episodes.podcast_episode_id', '=', 'podcast_episodes.id') \
            .where('user_queue_podcast_episodes.user_id', self.id) \
            .group_by('podcasts.id') \
            .order_by(core.database.db.raw('count(podcasts.id)'), 'desc') \
            .select('podcasts.id', core.database.db.raw('count(podcasts.id)')) \
            
    def user_podcasts_listened_count(self):
        user_podcasts_listened_count = self.dataset_user_podcasts_listened_count()
        return user_podcasts_listened_count.lists('count', 'id')

    def user_podcasts_listened_recently_count(self):
        user_podcasts_listened_recently_count = self.dataset_user_podcasts_listened_count()
        user_podcasts_listened_recently_count = user_podcasts_listened_recently_count \
            .where('user_queue_podcast_episodes.created_at', '>', datetime.datetime.now() - datetime.timedelta(days=21))

        return user_podcasts_listened_recently_count.lists('count', 'id')

    def user_podcasts_new_episodes_count(self):
        from .podcast_episode import PodcastEpisode
        user_podcasts_new_episodes_count = core.data_models.Podcast \
            .join('podcast_episodes', 'podcast_episodes.podcast_id', '=', 'podcasts.id') \
            .join('user_podcast_follows', 'user_podcast_follows.podcast_id', '=', 'podcasts.id') \
            .where('user_podcast_follows.user_id', self.id) \
            .where_raw('podcast_episodes.publication_date > user_podcast_follows.last_viewed') \
            .where('podcast_episodes.publication_date', '>', datetime.datetime.now() - datetime.timedelta(days=30)) \
            .group_by('podcasts.id') \
            .order_by(core.database.db.raw('count(podcasts.id)'), 'desc') \
            .select('podcasts.id', core.database.db.raw('count(podcasts.id)')) \

        return user_podcasts_new_episodes_count.lists('count', 'id')

    def followed_podcast_guids(self):
        from .podcast import Podcast
        podcast_guids = core.data_models.Podcast \
            .join('user_podcast_follows', 'user_podcast_follows.podcast_id', '=', 'podcasts.id') \
            .where('user_podcast_follows.user_id', self.id) \
            .order_by('user_podcast_follows.created_at', 'desc') \
            .select('podcasts.guid') \
            .get()

        return list([podcast_guid.guid for podcast_guid in podcast_guids])

    def followed_podcast_ids(self):
        from .podcast import Podcast
        podcast_ids = core.data_models.Podcast \
            .join('user_podcast_follows', 'user_podcast_follows.podcast_id', '=', 'podcasts.id') \
            .where('user_podcast_follows.user_id', self.id) \
            .order_by('user_podcast_follows.created_at', 'desc') \
            .select('podcasts.id') \
            .get()

        return list([podcast_id.id for podcast_id in podcast_ids])

    def update_last_viewed_for_podcast(self, podcast):
        from .user_podcast_follow import UserPodcastFollow
        user_podcast_follow = UserPodcastFollow \
            .where('user_id', self.id) \
            .where('podcast_id', podcast.id) \
            .first()

        if user_podcast_follow:
            user_podcast_follow.last_viewed = datetime.datetime.now()
            user_podcast_follow.save()
        
    @has_many
    def podcast_episode_likes(self):
        from .user_podcast_episode_like import UserPodcastEpisodeLike
        return UserPodcastEpisodeLike.order_by('created_at', 'desc')

    def liked_podcast_episodes(self):
        from .podcast_episode import PodcastEpisode
        podcast_episodes = core.data_models.PodcastEpisode \
            .with_('audio_files') \
            .with_('podcast') \
            .with_('podcast.categories') \
            .join('user_podcast_episode_likes', 'user_podcast_episode_likes.podcast_episode_id', '=', 'podcast_episodes.id') \
            .where('user_podcast_episode_likes.user_id', self.id) \
            .order_by('user_podcast_episode_likes.created_at', 'desc') \
            .get()

        return podcast_episodes

    def liked_podcast_episode_guids(self):
        from .podcast_episode import PodcastEpisode
        podcast_episode_guids = core.data_models.PodcastEpisode \
            .join('user_podcast_episode_likes', 'user_podcast_episode_likes.podcast_episode_id', '=', 'podcast_episodes.id') \
            .where('user_podcast_episode_likes.user_id', self.id) \
            .order_by('user_podcast_episode_likes.created_at', 'desc') \
            .select('podcast_episodes.guid') \
            .get()

        return list([podcast_episode_guid.guid for podcast_episode_guid in podcast_episode_guids])

    @has_many
    def user_queue_podcast_episodes(self):
        from .user_queue_podcast_episode import UserQueuePodcastEpisode
        return UserQueuePodcastEpisode.order_by('updated_at', 'desc')

    def queued_podcast_episodes(self):
        from .podcast_episode import PodcastEpisode
        podcast_episodes = core.data_models.PodcastEpisode \
            .join('user_queue_podcast_episodes', 'user_queue_podcast_episodes.podcast_episode_id', '=', 'podcast_episodes.id') \
            .with_('audio_files') \
            .with_('transcript_files') \
            .with_('podcast') \
            .with_('podcast.categories') \
            .with_({'previews': core.data_models.PodcastEpisodePreview.query().where_null('user_id').select('id', 'start', 'end', 'highlight', 'title', 'type', 'score', 'podcast_episode_id')}) \
            .where('user_queue_podcast_episodes.user_id', self.id) \
            .select('podcast_episodes.*', 'user_queue_podcast_episodes.last_position') \
            .order_by('user_queue_podcast_episodes.updated_at', 'desc') \
            .limit(100) \
            .get()

        return podcast_episodes

    def send_test_notification(self):
        fcm_mobile_token = self.get_user_attribute('fcm_token_mobile')

        if fcm_mobile_token is None or fcm_mobile_token.value == '':
            core.log.info("Missing FCM Token. Cannot send test notification.")
        else:
            title = "Fathom Test Notification"
            body = F"This is just a test."
            image_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/9/96/Meme_Man_on_transparent_background.webp/316px-Meme_Man_on_transparent_background.webp.png'
            data = {
                "type": "default",
                "image": image_url,
                "url_slug": '/podcast/this-week-in-startups/episode/square-becomes-block-spotify-wrappeds-genius-grab-debut-founders-of-fathom-deft-krepling-e1338-2021-12-03',
            }

            core.firebase.send_message([fcm_mobile_token.value], title, body, image_url, data)

from .user_attribute import UserAttribute

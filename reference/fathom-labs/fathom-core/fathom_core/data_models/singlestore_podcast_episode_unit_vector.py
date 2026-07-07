import fathom_core as core
from orator import Model
import numpy as np
import json
from .podcast_episode import PodcastEpisode

class SinglestorePodcastEpisodeUnitVector(Model):
    __connection__ = 'singlestore'
    __table__ = 'podcast_episode_unit_vectors'
    __timestamps__ = False

    @staticmethod
    def upsert_from_podcast_episode_vector(podcast_episode_vector):
        vector = SinglestorePodcastEpisodeUnitVector \
            .where('podcast_episode_id', podcast_episode_vector.podcast_episode_id) \
            .first()

        if not vector:
            vector = SinglestorePodcastEpisodeUnitVector()

        vector.podcast_episode_id = podcast_episode_vector.podcast_episode.id
        vector.podcast_id = podcast_episode_vector.podcast_episode.podcast_id
        vector.publication_date = podcast_episode_vector.podcast_episode.publication_date

        unit_vector = core.vector.convert_to_unit_vector(podcast_episode_vector.vector)
        unit_vector = json.dumps(list(unit_vector))
        vector.unit_vector = core.database.db.raw(f"JSON_ARRAY_PACK('{unit_vector}')")

        vector.save()
    
    @staticmethod
    def delete_from_podcast_episode(podcast_episode):
        vector = SinglestorePodcastEpisodeUnitVector \
            .where('podcast_episode_id', podcast_episode.id) \
            .first()

        if vector:
            vector.delete()

    @staticmethod
    def get_similar_episodes(episode_id, min_dot_product=0.8, limit=20):
        unit_vector = f"(select unit_vector from podcast_episode_unit_vectors where podcast_episode_id = {episode_id})"
        dot_product = f"DOT_PRODUCT(unit_vector, {unit_vector})"
        
        dataset = SinglestorePodcastEpisodeUnitVector
        dataset = dataset.where('podcast_episode_id', '!=', episode_id)
        if min_dot_product is not None:
            dataset = dataset.where_raw(f"{dot_product} > {min_dot_product}")
        dataset = dataset.order_by_raw(f"{dot_product} desc")
        dataset = dataset.limit(limit)
        episode_ids = dataset.lists('podcast_episode_id')

        if not episode_ids:
            return []
            
        episode_ids_string = map(lambda x: str(x), episode_ids)
        episode_ids_string = ",".join(list(episode_ids_string))
        episodes = PodcastEpisode \
            .where_raw(f"id in ({episode_ids_string})") \
            .with_('audio_files') \
            .with_('chapters') \
            .with_('transcript_files') \
            .with_('podcast') \
            .get()
        
        episodes_map = {}
        for episode in episodes:
            episodes_map[episode.id] = episode
        
        episodes = []
        for episode_id in episode_ids:
            episodes.append(episodes_map[episode_id])
        
        return episodes

    @staticmethod
    def get_vector_search_episode_ids(vector, podcast_id = None, min_dot_product=0.2, limit=15):
        unit_vector = core.vector.convert_to_unit_vector(vector)
        unit_vector = json.dumps(list(unit_vector))
        dot_product = f"DOT_PRODUCT(unit_vector, JSON_ARRAY_PACK('{unit_vector}'))"

        dataset = SinglestorePodcastEpisodeUnitVector
        if min_dot_product is not None:
            dataset = dataset.where_raw(f"{dot_product} > {min_dot_product}")
        if podcast_id is not None:
            print('***FILTERING FOR INDIVIDUAL PODCAST***')
            dataset = dataset.where('podcast_id', podcast_id)
        dataset = dataset.order_by_raw(f"{dot_product} desc")
        dataset = dataset.limit(limit)
        episode_ids = dataset.lists('podcast_episode_id')

        return episode_ids



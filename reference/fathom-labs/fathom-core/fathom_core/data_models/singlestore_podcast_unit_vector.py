import fathom_core as core
from orator import Model
import numpy as np
import json
from .podcast import Podcast

class SinglestorePodcastUnitVector(Model):
    __connection__ = 'singlestore'
    __table__ = 'podcast_unit_vectors'
    __timestamps__ = False

    @staticmethod
    def upsert_from_podcast_vector(podcast_vector):
        vector = SinglestorePodcastUnitVector \
            .where('podcast_id', podcast_vector.podcast_id) \
            .first()

        if not vector:
            vector = SinglestorePodcastUnitVector()

        vector.podcast_id = podcast_vector.podcast.id
        vector.last_publish_on = podcast_vector.podcast.last_publish_on

        unit_vector = core.vector.convert_to_unit_vector(podcast_vector.vector)
        unit_vector = json.dumps(list(unit_vector))
        vector.unit_vector = core.database.db.raw(f"JSON_ARRAY_PACK('{unit_vector}')")

        vector.save()
    
    @staticmethod
    def delete_from_podcast(podcast):
        vector = SinglestorePodcastUnitVector \
            .where('podcast_id', podcast.id) \
            .first()

        if vector:
            vector.delete()

    @staticmethod
    def get_similar_podcasts(podcast, min_dot_product=0.8, limit=20):
        unit_vector = f"(select unit_vector from podcast_unit_vectors where podcast_id = {podcast.id})"
        dot_product = f"DOT_PRODUCT(unit_vector, {unit_vector})"
        
        dataset = SinglestorePodcastUnitVector
        dataset = dataset.where('podcast_id', '!=', podcast.id)
        if min_dot_product is not None:
            dataset = dataset.where_raw(f"{dot_product} > {min_dot_product}")
        dataset = dataset.order_by_raw(f"{dot_product} desc")
        dataset = dataset.limit(limit)
        podcast_ids = dataset.lists('podcast_id')

        if not podcast_ids:
            return []
            
        podcast_ids_string = map(lambda x: str(x), podcast_ids)
        podcast_ids_string = ",".join(list(podcast_ids_string))

        similar_podcasts = Podcast \
            .where_raw(f"id in ({podcast_ids_string})") \
            .get()

        similar_podcasts_map = {}
        for similar_podcast in similar_podcasts:
            similar_podcasts_map[similar_podcast.id] = similar_podcast
        
        similar_podcasts = []
        for podcast_id in podcast_ids:
            similar_podcasts.append(similar_podcasts_map[podcast_id])
        
        return similar_podcasts

import fathom_core as core
from orator import Model
import numpy as np
import json
from .singlestore_podcast_unit_vector import SinglestorePodcastUnitVector
from .podcast import Podcast
import datetime

class SinglestoreUserUnitVector(Model):
    __connection__ = 'singlestore'
    __table__ = 'user_unit_vectors'
    __timestamps__ = True

    @staticmethod
    def update_user(user_id, vector, type="taste"):
        taste_vector = SinglestoreUserUnitVector \
            .where('user_id', user_id) \
            .where('type', type) \
            .first()

        if not taste_vector:
            taste_vector = SinglestoreUserUnitVector()

        taste_vector.type = type
        taste_vector.user_id = user_id
        unit_vector = core.vector.convert_to_unit_vector(vector)
        unit_vector = json.dumps(list(unit_vector))
        taste_vector.vector = core.database.db.raw(f"JSON_ARRAY_PACK('{unit_vector}')")

        taste_vector.save()
        
    @staticmethod
    def user_has_vector(user_id, type="taste"):
        return core.data_models.SinglestoreUserUnitVector.where('user_id', user_id).where('type', type).exists()

    @staticmethod
    def get_user_vector(user_id, type="taste"):
        # TODO: Upgrade SS to 7.6+
        vector = SinglestoreUserUnitVector \
            .where('user_id', user_id) \
            .where('type', type) \
            .first()

        if not vector:
            return None

        # decode vector single-precision floating-point numbers in little-endian byte order
        vector = np.frombuffer(vector.vector, dtype=np.float32)

        return vector
        
    @staticmethod
    def get_similar_podcasts(user, vector_type="taste", count=50, exclude_followed=True, exclude_podcast_ids=[]):
        excluded_podcast_ids = []
        
        if exclude_followed:
            excluded_podcast_ids = user.followed_podcast_ids()
        
        if len(exclude_podcast_ids) > 0:
            excluded_podcast_ids = excluded_podcast_ids + exclude_podcast_ids
            excluded_podcast_ids = list(set(excluded_podcast_ids))
            
        if len(excluded_podcast_ids) == 0:
            excluded_podcast_ids.append(-1)

        sql_query = f"""
              SELECT
                podcast_id, 
                DOT_PRODUCT(unit_vector, (select vector from {SinglestoreUserUnitVector.__table__} where user_id = {user.id} and type = '{vector_type}')) AS similarity
              FROM
                podcast_unit_vectors
              WHERE
                podcast_id NOT IN ({','.join(str(podcast_id) for podcast_id in excluded_podcast_ids)})
              ORDER BY
                similarity DESC
              LIMIT {count} 
            """

        results = []
        
        profile = core.profiler.start('Singlestore User Unit Vector Get Similar Podcasts')
        
        if SinglestoreUserUnitVector.user_has_vector(user.id, type=vector_type):
            results = core.database.db.connection('singlestore').select(sql_query)

        core.profiler.end(profile)
        
        return results
            
    @staticmethod
    def get_similar_podcasts_within_category(user, category_id, vector_type="taste", count=50, exclude_followed=True, exclude_podcast_ids=[]):
        excluded_podcast_ids = []
        
        if exclude_followed:
            excluded_podcast_ids = user.followed_podcast_ids()
            
        if len(exclude_podcast_ids) > 0:
            excluded_podcast_ids = excluded_podcast_ids + exclude_podcast_ids
            excluded_podcast_ids = list(set(excluded_podcast_ids))
            
        if len(excluded_podcast_ids) == 0:
            excluded_podcast_ids.append(-1)
            
        sql_query = f"""
          SELECT 
            podcast_id, 
            DOT_PRODUCT(unit_vector, (SELECT vector FROM {SinglestoreUserUnitVector.__table__} WHERE user_id = {user.id} and type = '{vector_type}')) AS similarity 
          FROM 
            podcast_unit_vectors 
          WHERE podcast_id IN
            (SELECT podcast_unit_vectors.podcast_id 
             FROM podcast_unit_vectors
             JOIN podcast_categories_podcasts ON podcast_categories_podcasts.podcast_id = podcast_unit_vectors.podcast_id
               AND podcast_categories_podcasts.podcast_category_id = {category_id})
               AND podcast_id NOT IN ({','.join(str(podcast_id) for podcast_id in excluded_podcast_ids)})
          ORDER BY 
            similarity DESC
          LIMIT {count}
        """
        
        results = []

        profile = core.profiler.start('Singlestore User Unit Vector Get Similar Podcasts Within Category')
  
        if SinglestoreUserUnitVector.user_has_vector(user.id, type=vector_type):
            results = core.database.db.connection('singlestore').select(sql_query)

        core.profiler.end(profile)
        
        return results

    @staticmethod
    def get_similar_podcast_episodes(user, vector_type="taste", count=50, published_after=None, podcast_id=None, exclude_podcast_episode_ids=[]):
      

      if published_after is None:
        published_after = datetime.datetime(1900, 1, 1, 0, 0)
      published_after_formatted = published_after.strftime("%Y-%m-%d")

      if len(exclude_podcast_episode_ids) == 0:
        exclude_podcast_episode_ids.append(-1)
      
      podcast_filter = ""
      if podcast_id is not None and isinstance(podcast_id, int):
        podcast_filter = f"AND podcast_id = {podcast_id}"

      sql_query = f"""
            SELECT
              podcast_episode_id, 
              DOT_PRODUCT(unit_vector, (select vector from {SinglestoreUserUnitVector.__table__} where user_id = {user.id} and type = '{vector_type}')) AS similarity
            FROM
              podcast_episode_unit_vectors
            WHERE publication_date > '{published_after_formatted}'
            AND podcast_episode_id NOT IN ({','.join(str(podcast_episode_id) for podcast_episode_id in exclude_podcast_episode_ids)})
            {podcast_filter}
            ORDER BY
              similarity DESC
            LIMIT {count} 
          """
      
      results = []
      
      profile = core.profiler.start('Singlestore User Unit Vector Get Similar Podcast Episodes')
      
      if SinglestoreUserUnitVector.user_has_vector(user.id, type=vector_type):
          results = core.database.db.connection('singlestore').select(sql_query)

      core.profiler.end(profile)

      return results

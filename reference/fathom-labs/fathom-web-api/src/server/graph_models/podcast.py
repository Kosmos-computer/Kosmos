import app
import graphene
from orator.query.join_clause import JoinClause

from .podcast_episode import PodcastEpisode
from .podcast_info import PodcastInfo

class Podcast(graphene.ObjectType):
    info = graphene.Field(PodcastInfo)
    episode_years = graphene.List(graphene.Int)
    episodes_total_count = graphene.Int()
    episodes = graphene.List(PodcastEpisode)
    recommended_episodes = graphene.List(PodcastEpisode)
    popular_episodes = graphene.List(PodcastEpisode)

    @staticmethod
    def get_episodes(user=None, podcast_id=None, podcast_episode_ids=None, info=None):
        db_podcast_episodes = app.core.data_models.PodcastEpisode

        if user is not None:
            user_queue_podcast_episodes_clause = JoinClause('user_queue_podcast_episodes') \
                .on('user_queue_podcast_episodes.podcast_episode_id', '=', 'podcast_episodes.id') \
                .where('user_queue_podcast_episodes.user_id', '=', user.id)
            db_podcast_episodes = db_podcast_episodes.left_join(user_queue_podcast_episodes_clause)
            db_podcast_episodes = db_podcast_episodes.select('podcast_episodes.*', 'user_queue_podcast_episodes.last_position')
        else:
            db_podcast_episodes = db_podcast_episodes.select('podcast_episodes.*')

        db_podcast_episodes = db_podcast_episodes.with_('vectors') \
            .with_('podcast') \
            .with_('podcast.categories') \
            .with_('audio_files') \
            .with_('transcript_files') \
            .with_({
                'previews': app.core.data_models.PodcastEpisodePreview.query() \
                    .where_null('user_id')
                    .select('id', 'start', 'end', 'highlight', 'title', 'type', 'score', 'podcast_episode_id')
            }) \
            .with_('process_attributes') \
            .with_('podcast') \
            .where('podcast_id', podcast_id) \
            .where_not_null('rss_audio_url') \

        if podcast_episode_ids is not None:
            db_podcast_episodes = db_podcast_episodes.where_in('podcast_episodes.id', podcast_episode_ids)
            
        db_podcast_episodes = db_podcast_episodes.order_by('publication_date', 'desc') \
            .limit(25) \
            .get()

        return db_podcast_episodes
    
    async def resolve_recommended_episodes(parent, info):
        podcast_episodes = []

        user = app.auth.get_user_from_info(info)
        if user is not None:
            recommended_episodes = await user.get_podcast_episode_recommendations_for_podcast(parent.info.internal_id)
            recommended_episode_ids = [episode['podcast_episode_id'] for episode in recommended_episodes]
            db_recommended_episodes = Podcast.get_episodes(user, parent.info.internal_id, podcast_episode_ids=recommended_episode_ids)
            sorted_recommended_episodes = app.core.utility.sort_objects_by_score(
                db_recommended_episodes, 
                recommended_episodes,
                'podcast_episode_id',
                'similarity',
            )

            user_taste_vector = await user.get_quick_taste_vector()
            for db_podcast_episode in sorted_recommended_episodes:
                podcast_episodes.append(PodcastEpisode.convert(db_podcast_episode['object'], user_taste_vector=user_taste_vector))

        return podcast_episodes

    async def resolve_popular_episodes(parent, info):
        podcast_episodes = []

        user_taste_vector = None
        listened_podcast_episode_ids = []
        
        user = app.auth.get_user_from_info(info)
        if user is not None:
            user_taste_vector = await user.get_quick_taste_vector()

            listened_podcast_episode_ids = app.core.data_models.PodcastEpisode \
            .join('user_queue_podcast_episodes', 'user_queue_podcast_episodes.podcast_episode_id', '=', 'podcast_episodes.id') \
            .where('user_queue_podcast_episodes.user_id', user.id) \
            .where('podcast_episodes.podcast_id', parent.info.internal_id) \
            .select('podcast_episodes.id') \
            .lists('id') \
            .all()

        popular_podcast_episode_ids = app.core.data_models.PodcastEpisode \
            .join('user_queue_podcast_episodes', 'user_queue_podcast_episodes.podcast_episode_id', '=', 'podcast_episodes.id') \
            .where('podcast_episodes.podcast_id', parent.info.internal_id) \
            .where_not_in('podcast_episodes.id', listened_podcast_episode_ids) \
            .group_by('podcast_episodes.id', 'podcast_episodes.title') \
            .order_by(app.db.raw('count(podcast_episodes.id)'), 'desc') \
            .order_by('podcast_episodes.publication_date', 'desc') \
            .select('podcast_episodes.id', 'podcast_episodes.title', app.db.raw('count(podcast_episodes.id) as count')) \
            .limit(20) \
            .lists('count', 'id')
        
        # reformat the popular podcast episode ids with listen counts into a list 
        popular_podcast_episode_ids_score_map = []
        for k in list(popular_podcast_episode_ids.keys()):
            popular_podcast_episode_ids_score_map.append({
                'podcast_episode_id': k,
                'count_listened': popular_podcast_episode_ids[k]
            })

        db_popular_episodes = Podcast.get_episodes(user, parent.info.internal_id, podcast_episode_ids=list(popular_podcast_episode_ids.keys()), info=info)

        sorted_db_popular_episodes = app.core.utility.sort_objects_by_score(
                db_popular_episodes, 
                popular_podcast_episode_ids_score_map,
                'podcast_episode_id',
                'count_listened',
            )

        for db_podcast_episode in sorted_db_popular_episodes:
            if user_taste_vector is None and db_podcast_episode['object'].primary_vector() is not None:
                user_taste_vector = db_podcast_episode['object'].primary_vector().vector
            podcast_episodes.append(PodcastEpisode.convert(db_podcast_episode['object'], user_taste_vector=user_taste_vector))

        return podcast_episodes
        
    async def resolve_episodes(parent, info):
        #print('HERE!!')
        #print(app.get_field_names(info))
        podcast_episodes = []
        if not parent.episodes:
            user = app.auth.get_user_from_info(info)
            
            db_podcast_episodes = Podcast.get_episodes(user, podcast_id=parent.info.internal_id, info=info)

            user_taste_vector = None
            if user is not None:
                user_taste_vector = await user.get_quick_taste_vector()

            for db_podcast_episode in db_podcast_episodes:
                if user_taste_vector is None and db_podcast_episode.primary_vector() is not None:
                    user_taste_vector = db_podcast_episode.primary_vector().vector
                   
                podcast_episodes.append(PodcastEpisode.convert(db_podcast_episode, user_taste_vector=user_taste_vector))
                #podcast_episodes.append(PodcastEpisode.convert(db_podcast_episode, fast=True))
        else:
            podcast_episodes = parent.episodes
        
        return podcast_episodes
            
    def resolve_episode_years(parent, info):
        db_podcast_episode_years = app.db.table('podcast_episodes') \
            .select(app.db.raw("distinct(date_part('year', publication_date))")) \
            .where('podcast_id', parent.info.internal_id) \
            .order_by('date_part', 'desc') \
            .get()
            
        formatted_podcast_episode_years = []
        for year in db_podcast_episode_years:
            if year['date_part']:
                formatted_podcast_episode_years.append(year['date_part'])
        
        return formatted_podcast_episode_years
        
    def resolve_episodes_total_count(parent, info):
        return app.db.table('podcast_episodes').where('podcast_id', parent.info.internal_id).count()

    @staticmethod
    def convert(db_podcast):
        if db_podcast == None :
            return None
        else:
            podcast = Podcast()
            podcast.info = PodcastInfo.convert(db_podcast)
            
            if 'podcast_episodes' in db_podcast._relations:
                for db_podcast_episode in db_podcast.podcast_episodes:
                    podcast.episodes.append(PodcastEpisode.convert(db_podcast_episode))

            return podcast

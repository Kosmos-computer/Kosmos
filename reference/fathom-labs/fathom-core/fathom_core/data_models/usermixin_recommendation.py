import fathom_core as core

from orator.query.join_clause import JoinClause

import boto3
from boto3.dynamodb.conditions import Key

import numpy as np
from scipy.spatial.distance import *

import datetime
from datetime import date, timedelta, datetime

class UserRecommendationMixin:

    async def get_quick_taste_vector(self):
        if core.data_models.SinglestoreUserUnitVector.user_has_vector(self.id, 'taste'):
            return core.data_models.SinglestoreUserUnitVector.get_user_vector(self.id, 'taste')
        else:
            listened_vector = None
            liked_vector = None
            followed_vector = None

            user_podcasts_listened_count = self.user_podcasts_listened_count()

            # ------------------------------------------------------------------------------
            # Listened Vector
            # ------------------------------------------------------------------------------
            listened_podcast_episodes = []
            user_queue_podcast_episode_clause = JoinClause('user_queue_podcast_episodes') \
                .on('user_queue_podcast_episodes.podcast_episode_id', '=', 'podcast_episodes.id') \
                .where('user_queue_podcast_episodes.user_id', '=', self.id) \

            podcast_episodes = core.data_models.PodcastEpisode \
                .join(JoinClause('podcast_episode_vectors') \
                    .on('podcast_episode_vectors.podcast_episode_id', '=', 'podcast_episodes.id')
                ) \
                .with_('vectors') \
                .join(user_queue_podcast_episode_clause) \
                .select('podcast_episodes.id', 'podcast_episodes.podcast_id', 'podcast_episodes.guid', 'podcast_episodes.title', 'user_queue_podcast_episodes.created_at') \
                .order_by('user_queue_podcast_episodes.created_at', 'desc') \
                .limit(30) \
                .get()

            if len(podcast_episodes) > 0:
                # construct listened episodes
                for podcast_episode in podcast_episodes:
                    if podcast_episode.primary_vector() is not None:
                        listened_episode = {
                            'podcast_episode': podcast_episode,
                            'vector': np.array(podcast_episode.primary_vector().vector).astype(float),
                        }

                        listened_podcast_episodes.append(listened_episode)

                # calculate weights
                start_date = podcast_episodes[-1].created_at
                end_date = podcast_episodes[0].created_at
                num_days_listening = (end_date - start_date).days
                if num_days_listening < 1:
                    num_days_listening = 1

                for episode in listened_podcast_episodes:
                    try:
                        days_since_listened = (end_date - episode['podcast_episode'].created_at).days

                        # recency
                        curve = ((num_days_listening - days_since_listened) / num_days_listening)**3
                        recency_weight = 1 + curve

                        # result
                        episode['weight_recency'] = recency_weight
                    
                    except:
                        episode['weight_recency'] = 0.00


                # standardize
                recency_total_weight = sum(list([lep['weight_recency'] for lep in listened_podcast_episodes]))
                for episode in listened_podcast_episodes:
                    if recency_total_weight > 0:
                        episode['weight_recency'] = episode['weight_recency'] / recency_total_weight

                # debug
                core.log.debug('****************************************************************')
                core.log.debug('LISTENED EPISODES BY RECENCY WEIGHTS')
                core.log.debug('****************************************************************')
                listened_podcast_episodes.sort(key=lambda x: x['weight_recency'], reverse=True)
                for episode in listened_podcast_episodes:
                    core.log.debug(episode['podcast_episode'].title)
                    core.log.debug(episode['podcast_episode'].created_at)
                    core.log.debug(episode['weight_recency'])
                    core.log.debug('---')

                recency_averaged_podcast_episode_vector = np.average(
                    list([lep['vector'] for lep in listened_podcast_episodes]),
                    weights=list([lep['weight_recency'] for lep in listened_podcast_episodes]),
                    axis=0
                )

                listened_vector = recency_averaged_podcast_episode_vector

            # ------------------------------------------------------------------------------
            # Liked Vector
            # ------------------------------------------------------------------------------
            liked_podcast_episodes = []
            user_podcast_episode_likes_clause = JoinClause('user_podcast_episode_likes') \
                .on('user_podcast_episode_likes.podcast_episode_id', '=', 'podcast_episodes.id') \
                .where('user_podcast_episode_likes.user_id', '=', self.id) \

            podcast_episodes = core.data_models.PodcastEpisode \
                .join(JoinClause('podcast_episode_vectors') \
                    .on('podcast_episode_vectors.podcast_episode_id', '=', 'podcast_episodes.id')
                ) \
                .with_('vectors') \
                .join(user_podcast_episode_likes_clause) \
                .select('podcast_episodes.id', 'podcast_episodes.guid', 'podcast_episodes.title', 'user_podcast_episode_likes.created_at') \
                .order_by('user_podcast_episode_likes.created_at', 'desc') \
                .limit(30) \
                .get()

            if len(podcast_episodes) > 0:
                # construct liked episodes
                for podcast_episode in podcast_episodes:
                    if podcast_episode.primary_vector() is not None:
                        liked_episode = {
                            'podcast_episode': podcast_episode,
                            'vector': np.array(podcast_episode.primary_vector().vector).astype(float),
                        }

                        liked_podcast_episodes.append(liked_episode)

                # calculate weights
                start_date = podcast_episodes[-1].created_at
                end_date = podcast_episodes[0].created_at
                num_days_liking = (end_date - start_date).days
                if num_days_liking < 1:
                    num_days_liking = 1

                for episode in liked_podcast_episodes:
                    try:
                        days_since_liked = (end_date - episode['podcast_episode'].created_at).days

                        # maturity
                        user_maturity = ((num_days_liking) / 60) # TODO: Magic number - represents user maturity before full curve
                        if user_maturity > 1:
                            user_maturity = 1

                        # recency
                        curve = ((num_days_liking - days_since_liked) / num_days_liking)**3
                        max_weight_c = user_maturity * 4 # TODO: Magic number - represents max weight based on recency
                        recency_weight = 1 + (max_weight_c * curve)

                        # result
                        episode['weight_recency'] = recency_weight

                    except:
                        episode['weight_recency'] = 0.00


                # standardize
                recency_total_weight = sum(list([lep['weight_recency'] for lep in liked_podcast_episodes]))
                for episode in liked_podcast_episodes:
                    if recency_total_weight > 0:
                        episode['weight_recency'] = episode['weight_recency'] / recency_total_weight

                # debug
                core.log.debug('****************************************************************')
                core.log.debug('LIKED EPISODES BY RECENCY WEIGHTS')
                core.log.debug('****************************************************************')
                liked_podcast_episodes.sort(key=lambda x: x['weight_recency'], reverse=True)
                for episode in liked_podcast_episodes:
                    core.log.debug(episode['podcast_episode'].title)
                    core.log.debug(episode['podcast_episode'].created_at)
                    core.log.debug(episode['weight_recency'])
                    core.log.debug('---')

                recency_averaged_podcast_episode_vector = np.average(
                    list([lep['vector'] for lep in liked_podcast_episodes]),
                    weights=list([lep['weight_recency'] for lep in liked_podcast_episodes]),
                    axis=0
                )

                liked_vector = recency_averaged_podcast_episode_vector

            # ------------------------------------------------------------------------------
            # Followed Vector
            # ------------------------------------------------------------------------------
            user_followed_podcast_clause = JoinClause('user_podcast_follows') \
                .on('user_podcast_follows.podcast_id', '=', 'podcasts.id') \
                .where('user_podcast_follows.user_id', '=', self.id) \

            podcasts = core.data_models.Podcast \
                .join(JoinClause('podcast_vectors') \
                    .on('podcast_vectors.podcast_id', '=', 'podcasts.id')
                ) \
                .with_('vectors') \
                .join(user_followed_podcast_clause) \
                .select('podcasts.id', 'podcasts.title', 'podcasts.guid') \
                .limit(50) \
                .get()

            if len(podcasts) > 0:
                # construct followed podcasts
                followed_podcasts = []
                for podcast in podcasts:
                    if podcast.primary_vector() is not None:
                        if podcast.id not in user_podcasts_listened_count:
                            user_podcasts_listened_count[podcast.id] = 1
                        
                        followed_podcast = {
                            'podcast': podcast,
                            'vector': np.array(podcast.primary_vector().vector).astype(float),
                            'weight_represent': user_podcasts_listened_count[podcast.id]
                        }

                        followed_podcasts.append(followed_podcast)

                # debug
                core.log.debug('****************************************************************')
                core.log.debug('FOLLOWED PODCASTS BY REPRESENT WEIGHTS')
                core.log.debug('****************************************************************')
                followed_podcasts.sort(key=lambda x: x['weight_represent'], reverse=True)
                for followed_podcast in followed_podcasts:
                    core.log.debug(followed_podcast['podcast'].title)
                    core.log.debug(followed_podcast['weight_represent'])
                    core.log.debug('---')

                represent_averaged_podcast_vector = np.average(
                    list([p['vector'] for p in followed_podcasts]),
                    weights=list([p['weight_represent'] for p in followed_podcasts]),
                    axis=0
                )

                followed_vector = represent_averaged_podcast_vector

            # ------------------------------------------------------------------------------
            # User Taste Vector
            # ------------------------------------------------------------------------------
            user_taste_vectors = []

            listened_vector_weight = 3.00
            liked_vector_weight = 2.00
            followed_vector_weight = 1.00

            if listened_vector is not None:
                user_taste_vectors.append({
                    'vector': listened_vector,
                    'weight': listened_vector_weight,
                })

            if liked_vector is not None:
                user_taste_vectors.append({
                    'vector': liked_vector,
                    'weight': liked_vector_weight,
                })

            if followed_vector is not None:
                user_taste_vectors.append({
                    'vector': followed_vector,
                    'weight': followed_vector_weight,
                })

            user_taste_vector = None

            if len(user_taste_vectors) > 0:
                user_taste_vector = np.average(
                    list([uv['vector'] for uv in user_taste_vectors]),
                    weights=list([uv['weight'] for uv in user_taste_vectors]),
                    axis=0
                )

            return user_taste_vector

    async def get_taste_profile(self):
        user_taste_profile = {
            'taste_vector': None,
            'followed_vector': None,
            'liked_podcast_episodes': [],
            'liked_vector': None,
            'top_listened_podcast_episodes': [],
            'listened_vector': None,
            'activity_level': 0.00
        }

        # TODO: Break this up

        # ------------------------------------------------------------------------------
        # Stage Interactions
        # ------------------------------------------------------------------------------
        raw_podcast_episode_interactions = self.get_podcast_episode_interactions()

        # filter and transform
        podcast_episode_interactions = []
        podcast_episode_interactions_lookup = {}
        for raw_interaction in raw_podcast_episode_interactions:
            if raw_interaction['totalPodcastEpisodeListenDuration'] > 15: # TODO: Magic number - represents minimum listen seconds for inclusion
                episode_duration = raw_interaction['podcastEpisodeDuration']
                if episode_duration is None or episode_duration == '':
                    episode_duration = float(raw_interaction['totalPodcastEpisodeListenDuration'])
                else:
                    episode_duration = float(raw_interaction['podcastEpisodeDuration'])

                interaction = {
                    'guid': raw_interaction['podcastEpisodeGuid'],
                    'last_epoch': raw_interaction['lastListenedEpoch'],
                    'listen_duration': float(raw_interaction['totalPodcastEpisodeListenDuration']),
                    'listen_percentage': float(raw_interaction['totalPercentagePodcastEpisodeListened']),
                    'podcast_episode_duration': episode_duration,
                }

                interaction['distinct_listen_duration'] = interaction['listen_percentage'] * interaction['podcast_episode_duration']

                podcast_episode_interactions.append(interaction)
                podcast_episode_interactions_lookup[raw_interaction['podcastEpisodeGuid']] = interaction

        # ------------------------------------------------------------------------------
        # Listened Vector
        # ------------------------------------------------------------------------------
        if len(podcast_episode_interactions) > 0:
            # calculate weights
            podcast_episode_interactions.sort(key=lambda x: x['last_epoch'], reverse=True)
            most_recent_epoch = podcast_episode_interactions[0]['last_epoch']
            start_epoch = podcast_episode_interactions[-1]['last_epoch']
            
            num_days_listening = (float(most_recent_epoch) - float(start_epoch)) / 86400
            if num_days_listening < 1:
                num_days_listening = 1
            
            user_maturity = ((num_days_listening) / 60) # TODO: Magic number - represents user maturity before full curve
            if user_maturity > 1:
                user_maturity = 1

            for interaction in podcast_episode_interactions:
                try:
                    days_since_listened = (float(most_recent_epoch) / 86400) - (float(interaction['last_epoch']) / 86400)
                    
                    # recency
                    recency_weight = ((num_days_listening - days_since_listened) / num_days_listening)**3

                    # result
                    interaction['recency_weight'] = recency_weight

                except:
                    interaction['recency_weight'] = 0.00

            total_recency_weight = sum(list([pei['recency_weight'] for pei in podcast_episode_interactions]))
            total_listen_duration = sum(list([pei['distinct_listen_duration'] for pei in podcast_episode_interactions]))

            for interaction in podcast_episode_interactions:
                try:
                    # recency
                    interaction['recency_weight'] = interaction['recency_weight'] / total_recency_weight

                    # listen
                    interaction['listen_weight'] = ((interaction['distinct_listen_duration']) / total_listen_duration)

                    # result
                    interaction['weight'] = (interaction['recency_weight'] * 0.75) + (interaction['listen_weight'] * 0.25)

                except:
                    interaction['weight'] = 0.00

            ## standardize
            #total_weight = sum(list([pei['weight'] for pei in podcast_episode_interactions]))
            #for interaction in podcast_episode_interactions:
            #    if total_weight > 0:
            #        interaction['weight'] = interaction['weight'] / total_weight

           # sort podcast_episode_interactions by weight
            podcast_episode_interactions.sort(key=lambda x: x['weight'], reverse=True)
            
            # get top 100
            podcast_episode_interactions = podcast_episode_interactions[:100]

            # hydrate
            podcast_episodes = core.data_models.PodcastEpisode \
                .join(JoinClause('podcast_episode_vectors') \
                    .on('podcast_episode_vectors.podcast_episode_id', '=', 'podcast_episodes.id')
                ) \
                .with_('vectors') \
                .where_in('guid', list([pei['guid'] for pei in podcast_episode_interactions])) \
                .select(
                    'podcast_episodes.id', 
                    'podcast_episodes.guid', 
                    'podcast_episodes.title', 
                    'podcast_episodes.duration', 
                    'podcast_episodes.podcast_id'
                ) \
                .get()

            podcast_episode_lookup = {}
            for podcast_episode in podcast_episodes:
                podcast_episode_lookup[podcast_episode.guid] = podcast_episode

            interactions_with_episodes = []
            for interaction in podcast_episode_interactions:
                if interaction['guid'] in podcast_episode_lookup:
                    interaction['podcast_episode'] = podcast_episode_lookup[interaction['guid']]
                    if interaction['podcast_episode'].primary_vector() is not None:
                        interaction['vector'] = interaction['podcast_episode'].primary_vector().vector
                        interactions_with_episodes.append(interaction)
            podcast_episode_interactions = interactions_with_episodes

            # debug
            core.log.debug('****************************************************************')
            core.log.debug('LISTENED EPISODES BY WEIGHTS')
            core.log.debug('****************************************************************')
            podcast_episode_interactions.sort(key=lambda x: x['weight'], reverse=True)
            for interaction in podcast_episode_interactions:
                core.log.debug(interaction['podcast_episode'].title)
                core.log.debug(interaction['weight'])
                core.log.debug('---')

            if len(podcast_episode_interactions) > 0:
                # average
                averaged_podcast_episode_vector = np.average(
                    list([np.array(pev['vector']).astype(float) for pev in podcast_episode_interactions]),
                    weights=list([pev['weight'] for pev in podcast_episode_interactions]),
                    axis=0
                )

                user_taste_profile['listened_vector'] = averaged_podcast_episode_vector
                user_taste_profile['top_listened_podcast_episodes'] = podcast_episode_interactions

        # ------------------------------------------------------------------------------
        # Liked Vector
        # ------------------------------------------------------------------------------
        user_podcast_episode_likes_clause = JoinClause('user_podcast_episode_likes') \
            .on('user_podcast_episode_likes.podcast_episode_id', '=', 'podcast_episodes.id') \
            .where('user_podcast_episode_likes.user_id', '=', self.id) \

        podcast_episodes = core.data_models.PodcastEpisode \
            .with_('vectors') \
            .join(user_podcast_episode_likes_clause) \
            .join(JoinClause('podcast_episode_vectors') \
                .on('podcast_episode_vectors.podcast_episode_id', '=', 'podcast_episodes.id')
            ) \
            .select('podcast_episodes.id', 'podcast_episodes.guid', 'podcast_episodes.title', 'user_podcast_episode_likes.created_at') \
            .order_by('user_podcast_episode_likes.created_at', 'desc') \
            .limit(40) \
            .get()

        if len(podcast_episodes) > 0:
            # construct liked episodes
            interacted_liked_podcast_episodes = []
            for podcast_episode in podcast_episodes:
                if podcast_episode.primary_vector() is not None:
                    liked_episode = {
                        'podcast_episode': podcast_episode,
                        'vector': np.array(podcast_episode.primary_vector().vector).astype(float),
                        'interaction': None
                    }
                    if podcast_episode.guid in podcast_episode_interactions_lookup:
                        liked_episode['interaction'] = podcast_episode_interactions_lookup[podcast_episode.guid]

                    user_taste_profile['liked_podcast_episodes'].append(liked_episode)
                    if liked_episode['interaction'] is not None:
                        interacted_liked_podcast_episodes.append(liked_episode)

            # calculate weights
            start_date = podcast_episodes[-1].created_at
            end_date = podcast_episodes[0].created_at
            num_days_liking = (end_date - start_date).days
            if num_days_liking < 1:
                num_days_liking = 1

            total_listen_duration = sum(list([lep['interaction']['distinct_listen_duration'] for lep in interacted_liked_podcast_episodes]))

            for episode in user_taste_profile['liked_podcast_episodes']:
                try:
                    days_since_liked = (end_date - episode['podcast_episode'].created_at).days

                    # maturity
                    user_maturity = ((num_days_liking) / 60) # TODO: Magic number - represents user maturity before full curve
                    if user_maturity > 1:
                        user_maturity = 1

                    # recency
                    curve = ((num_days_liking - days_since_liked) / num_days_liking)**3
                    max_weight_c = user_maturity * 4 # TODO: Magic number - represents max weight based on recency
                    recency_weight = 1 + (max_weight_c * curve)

                    # result
                    episode['weight_recency'] = recency_weight

                    if episode['interaction'] is not None:
                        listen_weight = (episode['interaction']['distinct_listen_duration'] / total_listen_duration)**3
                        episode['weight_listen'] = listen_weight
                    else:
                        episode['weight_listen'] = 0.00
                except:
                    episode['weight_recency'] = 0.00
                    episode['weight_listen'] = 0.00


            # standardize
            recency_total_weight = sum(list([lep['weight_recency'] for lep in user_taste_profile['liked_podcast_episodes']]))
            listen_total_weight = sum(list([lep['weight_listen'] for lep in user_taste_profile['liked_podcast_episodes']]))
            for episode in user_taste_profile['liked_podcast_episodes']:
                if recency_total_weight > 0:
                    episode['weight_recency'] = episode['weight_recency'] / recency_total_weight
                if listen_total_weight > 0:
                    episode['weight_listen'] = episode['weight_listen'] / listen_total_weight

            # debug
            core.log.debug('****************************************************************')
            core.log.debug('LIKED EPISODES BY RECENCY WEIGHTS')
            core.log.debug('****************************************************************')
            user_taste_profile['liked_podcast_episodes'].sort(key=lambda x: x['weight_recency'], reverse=True)
            for episode in user_taste_profile['liked_podcast_episodes']:
                core.log.debug(episode['podcast_episode'].title)
                core.log.debug(episode['podcast_episode'].created_at)
                core.log.debug(episode['weight_recency'])
                core.log.debug('---')

            core.log.debug('****************************************************************')
            core.log.debug('LIKED EPISODES BY LISTEN WEIGHTS')
            core.log.debug('****************************************************************')
            user_taste_profile['liked_podcast_episodes'].sort(key=lambda x: x['weight_listen'], reverse=True)
            for episode in user_taste_profile['liked_podcast_episodes']:
                core.log.debug(episode['podcast_episode'].title)
                core.log.debug(episode['weight_listen'])
                core.log.debug('---')

            if len(user_taste_profile['liked_podcast_episodes']) > 0:

                recency_averaged_podcast_episode_vector = np.average(
                    list([lep['vector'] for lep in user_taste_profile['liked_podcast_episodes']]),
                    weights=list([lep['weight_recency'] for lep in user_taste_profile['liked_podcast_episodes']]),
                    axis=0
                )


                if len(interacted_liked_podcast_episodes) > 0:
                    listen_averaged_podcast_episode_vector = np.average(
                        list([lep['vector'] for lep in user_taste_profile['liked_podcast_episodes']]),
                        weights=list([lep['weight_listen'] for lep in user_taste_profile['liked_podcast_episodes']]),
                        axis=0
                    )

                    averaged_podcast_episode_vector = np.average([
                        recency_averaged_podcast_episode_vector,
                        listen_averaged_podcast_episode_vector
                    ], weights=[0.5, 0.5], axis=0)
                else:
                    averaged_podcast_episode_vector = recency_averaged_podcast_episode_vector


                user_taste_profile['liked_vector'] = averaged_podcast_episode_vector

        # ------------------------------------------------------------------------------
        # Followed Vector
        # ------------------------------------------------------------------------------
        user_followed_podcast_clause = JoinClause('user_podcast_follows') \
            .on('user_podcast_follows.podcast_id', '=', 'podcasts.id') \
            .where('user_podcast_follows.user_id', '=', self.id) \

        podcasts = core.data_models.Podcast \
            .join(JoinClause('podcast_vectors') \
                .on('podcast_vectors.podcast_id', '=', 'podcasts.id')
            ) \
            .with_('vectors') \
            .join(user_followed_podcast_clause) \
            .select('podcasts.id', 'podcasts.title', 'podcasts.guid') \
            .get()

        if len(podcasts) > 0:
            # calculate total listen durations for podcasts
            podcast_listen_durations = {}
            for podcast_episode in user_taste_profile['top_listened_podcast_episodes']:
                if podcast_episode['podcast_episode'].podcast_id not in podcast_listen_durations:
                    podcast_listen_durations[podcast_episode['podcast_episode'].podcast_id] = podcast_episode['distinct_listen_duration']
                else:
                    podcast_listen_durations[podcast_episode['podcast_episode'].podcast_id] += podcast_episode['distinct_listen_duration']

            # construct followed podcasts
            followed_podcasts = []
            for podcast in podcasts:
                if podcast.primary_vector() is not None:
                    followed_podcast = {
                        'podcast': podcast,
                        'vector': np.array(podcast.primary_vector().vector).astype(float),
                        'weight_represent': 1
                    }
                    if podcast.id in podcast_listen_durations:
                        followed_podcast['listen_duration'] = podcast_listen_durations[podcast.id]
                    else:
                        followed_podcast['listen_duration'] = 0.00

                    followed_podcasts.append(followed_podcast)

            total_listen_duration = sum(list([fp['listen_duration'] for fp in followed_podcasts]))

            # listen weight
            for followed_podcast in followed_podcasts:
                if total_listen_duration > 0:
                    listen_weight = (followed_podcast['listen_duration'] / total_listen_duration)**3
                    followed_podcast['weight_listen'] = listen_weight
                else:
                    followed_podcast['weight_listen'] = 0.00

            # standardize
            represent_total_weight = sum(list([fp['weight_represent'] for fp in followed_podcasts]))
            listen_total_weight = sum(list([fp['weight_listen'] for fp in followed_podcasts]))
            for followed_podcast in followed_podcasts:
                if represent_total_weight > 0:
                    followed_podcast['weight_represent'] = followed_podcast['weight_represent'] / represent_total_weight
                if listen_total_weight > 0:
                    followed_podcast['weight_listen'] = followed_podcast['weight_listen'] / listen_total_weight

            # debug
            core.log.debug('****************************************************************')
            core.log.debug('FOLLOWED PODCASTS BY REPRESENT WEIGHTS')
            core.log.debug('****************************************************************')
            followed_podcasts.sort(key=lambda x: x['weight_represent'], reverse=True)
            for followed_podcast in followed_podcasts:
                core.log.debug(followed_podcast['podcast'].title)
                core.log.debug(followed_podcast['weight_represent'])
                core.log.debug('---')

            core.log.debug('****************************************************************')
            core.log.debug('FOLLOWED PODCASTS BY LISTEN WEIGHTS')
            core.log.debug('****************************************************************')
            followed_podcasts.sort(key=lambda x: x['weight_listen'], reverse=True)
            for followed_podcast in followed_podcasts:
                core.log.debug(followed_podcast['podcast'].title)
                core.log.debug(followed_podcast['weight_listen'])
                core.log.debug('---')

            if len(followed_podcasts) > 0:
                represent_averaged_podcast_vector = np.average(
                    list([p['vector'] for p in followed_podcasts]),
                    weights=list([p['weight_represent'] for p in followed_podcasts]),
                    axis=0
                )

                if total_listen_duration > 0:
                    listen_averaged_podcast_vector = np.average(
                        list([p['vector'] for p in followed_podcasts]),
                        weights=list([p['weight_listen'] for p in followed_podcasts]),
                        axis=0
                    )

                    averaged_podcast_vector = np.average([
                        represent_averaged_podcast_vector,
                        listen_averaged_podcast_vector,
                    ], weights=[0.2, 0.8], axis=0)

                    user_taste_profile['followed_vector'] = averaged_podcast_vector
                else:
                    user_taste_profile['followed_vector'] = represent_averaged_podcast_vector

        # ------------------------------------------------------------------------------
        # User Taste Vector
        # ------------------------------------------------------------------------------
        user_taste_vectors = []

        listened_vector_weight = 10.0
        liked_vector_weight = 1.5
        followed_vector_weight = 1.00

        if user_taste_profile['listened_vector'] is not None:
            user_taste_vectors.append({
                'vector': user_taste_profile['listened_vector'],
                'weight': listened_vector_weight,
            })

        if user_taste_profile['liked_vector'] is not None:
            user_taste_vectors.append({
                'vector': user_taste_profile['liked_vector'],
                'weight': liked_vector_weight,
            })

        if user_taste_profile['followed_vector'] is not None:
            user_taste_vectors.append({
                'vector': user_taste_profile['followed_vector'],
                'weight': followed_vector_weight,
            })

        user_taste_vector = None
        if len(user_taste_vectors) > 0:
            user_taste_vector = np.average(
                list([uv['vector'] for uv in user_taste_vectors]),
                weights=list([uv['weight'] for uv in user_taste_vectors]),
                axis=0
            )

        user_taste_profile['taste_vector'] = user_taste_vector

        if user_taste_profile['taste_vector'] is not None:
            if user_taste_profile['listened_vector'] is None:
                user_taste_profile['listened_vector'] = user_taste_profile['taste_vector']
            if user_taste_profile['liked_vector'] is None:
                user_taste_profile['liked_vector'] = user_taste_profile['taste_vector']
            if user_taste_profile['followed_vector'] is None:
                user_taste_profile['followed_vector'] = user_taste_profile['taste_vector']

        # Insert into singlestore user_vectors table.
        if user_taste_profile['taste_vector'] is not None:
            core.data_models.SinglestoreUserUnitVector.update_user(self.id, user_taste_profile['taste_vector'], type="taste")
        if user_taste_profile['listened_vector'] is not None:
            core.data_models.SinglestoreUserUnitVector.update_user(self.id, user_taste_profile['listened_vector'], type="listened")
        if user_taste_profile['liked_vector']is not None:
            core.data_models.SinglestoreUserUnitVector.update_user(self.id, user_taste_profile['liked_vector'], type="liked")
        if user_taste_profile['followed_vector'] is not None:
            core.data_models.SinglestoreUserUnitVector.update_user(self.id, user_taste_profile['followed_vector'], type="followed")

        # Activity level override - use more of the AI recommendations
        count_queued = core.data_models.UserQueuePodcastEpisode.where('user_id', self.id).count()
        if (count_queued >= 1 and user_taste_profile['listened_vector'] is not None) or user_taste_profile['liked_vector'] is not None or user_taste_profile['followed_vector'] is not None:
            user_taste_profile['activity_level'] = 1.00
        else:
            user_taste_profile['activity_level'] = float(len(user_taste_vectors)) / 3.00

        return user_taste_profile

    def get_podcast_episode_interactions(self):
        dynamodb = boto3.resource('dynamodb', aws_access_key_id=core.env['aws_access_key'], aws_secret_access_key=core.env['aws_access_secret'], region_name = 'us-east-1')

        table = dynamodb.Table('fathomPodcastEpisodeInteractions')

        profile = core.profiler.start("DYNAMODB QUERY fathomPodcastEpisodeInteractions")
        response_items = []
        finished = False
        response = None
        while not finished:
            # The dynamodb client is dumb. This is the best-ish way. Client pagination is worse...returns strings for numbers, ridiculous
            # https://github.com/boto/botocore/issues/1688
            if response is not None and 'LastEvaluatedKey' in response.keys() and response['LastEvaluatedKey'] is not None:
                response = table.query(
                    ProjectionExpression="podcastEpisodeGuid, totalPodcastEpisodeListenDuration, totalPercentagePodcastEpisodeListened, lastListenedEpoch, podcastEpisodeDuration",
                    KeyConditionExpression=Key('userGuid').eq(self.guid),
                    ExclusiveStartKey=response['LastEvaluatedKey']
                )
            else:
                response = table.query(
                    ProjectionExpression="podcastEpisodeGuid, totalPodcastEpisodeListenDuration, totalPercentagePodcastEpisodeListened, lastListenedEpoch, podcastEpisodeDuration",
                    KeyConditionExpression=Key('userGuid').eq(self.guid)
                )

            if 'LastEvaluatedKey' not in response.keys() or response['LastEvaluatedKey'] is None:
                finished = True
            
            response_items += response['Items']

        core.profiler.end(profile)

        #print(response_items)

        return response_items
    
    def compute_user_full_episode_listening_minutes_by_week(self):
        interactions = self.get_podcast_episode_interactions()
        
        formatted_interactions = []

        # Compute number of minutes the user has listened every week
        for interaction in interactions:
            if interaction['lastListenedEpoch'] is None:
                next
            else:
                formatted_interaction = {}
                formatted_interaction['lastListenedEpoch'] = int(interaction['lastListenedEpoch'])
                formatted_interaction['lastListenedDate'] = datetime.fromtimestamp(interaction['lastListenedEpoch'])
                formatted_interaction['lastListenedWeek'] = formatted_interaction['lastListenedDate'].isocalendar()[1]
                formatted_interaction['lastListenedYear'] = formatted_interaction['lastListenedDate'].isocalendar()[0]
                formatted_interaction['lastListenedWeekYear'] = str(formatted_interaction['lastListenedYear']) + "-" + str(formatted_interaction['lastListenedWeek'])
                
                formatted_interaction['totalPercentagePodcastEpisodeListened'] = float(interaction['totalPercentagePodcastEpisodeListened'])
                formatted_interaction['totalPodcastEpisodeListenDuration'] = float(interaction['totalPodcastEpisodeListenDuration'])
                formatted_interaction['podcastEpisodeDuration'] = float(interaction['podcastEpisodeDuration'])
                formatted_interaction['totalPodcastEpisodeListenDurationMinutes'] = formatted_interaction['totalPodcastEpisodeListenDuration'] / 60.0
                
                formatted_interactions.append(formatted_interaction)

        # Compute number of minutes the user has listened every week
        user_episode_listening = {}
        for interaction in formatted_interactions:
            if interaction['lastListenedYear'] not in user_episode_listening.keys():
                user_episode_listening[interaction['lastListenedYear']] = {}

            if interaction['lastListenedWeek'] not in user_episode_listening[interaction['lastListenedYear']].keys():
                user_episode_listening[interaction['lastListenedYear']][interaction['lastListenedWeek']] = 0.00

            if interaction['totalPodcastEpisodeListenDurationMinutes'] > 5.0:
                user_episode_listening[interaction['lastListenedYear']][interaction['lastListenedWeek']] += interaction['totalPodcastEpisodeListenDurationMinutes']

        user_episode_listening_year_weeks = {}
        
        for year, weeks in user_episode_listening.items():
            user_episode_listening_year_weeks[year] = []
            for week, minutes in weeks.items():
                user_episode_listening_year_weeks[year].append({
                    'week': week,
                    'minutes': minutes
                })

        # Fill in missing weeks
        for year, weeks in user_episode_listening_year_weeks.items():
            for week in range(1, 53):
                if week not in [x['week'] for x in weeks]:
                    user_episode_listening_year_weeks[year].append({
                        'week': week,
                        'minutes': 0.00
                    })

        # Sort by week
        for year, weeks in user_episode_listening_year_weeks.items():
            user_episode_listening_year_weeks[year] = sorted(weeks, key=lambda k: k['week'])

        return user_episode_listening_year_weeks

    @classmethod
    def combine_user_full_episode_listening_minutes_by_week(self, user_ids):
        user_episode_listening_year_weeks = {}
        for user_id in user_ids:
            user = core.data_models.User.find(user_id)
            user_episode_listening_year_weeks[user_id] = user.compute_user_full_episode_listening_minutes_by_week()

        # Combine minutes listend for each week
        combined_user_episode_listening_year_weeks = {}
        for user_id, user_episode_listening in user_episode_listening_year_weeks.items():
            for year, weeks in user_episode_listening.items():
                if year not in combined_user_episode_listening_year_weeks.keys():
                    combined_user_episode_listening_year_weeks[year] = {}
                for week in weeks:

                    if week['week'] not in combined_user_episode_listening_year_weeks[year].keys():
                        combined_user_episode_listening_year_weeks[year][week['week']] = week['minutes']
                    else:
                        combined_user_episode_listening_year_weeks[year][week['week']] += week['minutes']

        combined_user_episode_listening_year_arrays = {}
        
        for year, weeks in combined_user_episode_listening_year_weeks.items():
            combined_user_episode_listening_year_arrays[year] = []
            for week, minutes in weeks.items():
                combined_user_episode_listening_year_arrays[year].append({
                    'week': week,
                    'minutes': minutes
                })

        # Sort by week
        for year, weeks in combined_user_episode_listening_year_arrays.items():
            combined_user_episode_listening_year_arrays[year] = sorted(weeks, key=lambda k: k['week'])

        return combined_user_episode_listening_year_arrays

    @classmethod
    def chart_user_full_episode_listening_minutes_by_week_for_users(self, user_ids, rolling_average_weeks=1):
        import pygal

        user_stats = {}
        for user_id in user_ids:
            # If user_id is an Array, then it's a list of user_ids
            if isinstance(user_id, list):
                primary_user = core.data_models.User.find(user_id[0])
                user_stats[primary_user.name] = self.combine_user_full_episode_listening_minutes_by_week(user_id)
            else:
                user = core.data_models.User.find(user_id)
                user_stats[user.name] = user.compute_user_full_episode_listening_minutes_by_week()

        # Compute Rolling Average
        for user_name, stats in user_stats.items():
            for year, weeks in stats.items():
                for week in weeks:
                    week['rolling_average'] = 0.00
                    for i in range(1, rolling_average_weeks+1):
                        if week['week'] - i >= 0:
                            week['rolling_average'] += weeks[week['week'] - i]['minutes']
                    week['rolling_average'] = week['rolling_average'] / rolling_average_weeks
        
        # Get all years
        years = []
        for user, stats in user_stats.items():
            for year in stats.keys():
                if year not in years:
                    years.append(year)

        # Create a chart for each year with lines for each user
        charts = {}
        for year in years:
            chart = pygal.Line()
            chart.title = 'Minutes Listened to Podcasts by Week in ' + str(year)
            chart.x_labels = [str(x) for x in range(1, 53)]
            for user, stats in user_stats.items():
                if year in stats.keys():
                    chart.add(user, [x['rolling_average'] for x in stats[year]])
            charts[year] = chart

        # Render charts
        for year, chart in charts.items():
            chart.render_to_file(str(year) + '_minutes_listened_to_podcasts_by_week_rolling_' + str(rolling_average_weeks) + '.svg')

    @classmethod
    def analyze_fathom_accounts(self):
        users = core.data_models.User.where("email", "ilike", "%fathom.fm%").get()
        #users = core.data_models.User.where_in('id', [4,38,75,4676,10]).get()
        listening_users = []
        for user in users:
            usage = user.compute_user_full_episode_listening_minutes_by_week()
            total_minutes_listened = 0
            for year, weeks in usage.items():
                if year == 2022:
                    for week in weeks:
                        if week['minutes'] > 0.0:
                            total_minutes_listened += week['minutes']

            if total_minutes_listened >= 30:
                listening_users.append({ "user": user, "total_minutes_listened": total_minutes_listened })
                print(" ")
                print("*****************************************************************************************************")
                print("*****************************************************************************************************")
                print(f"{user.email} | {user.id} has listened to {total_minutes_listened} minutes of podcasts in 2022")
                print("*****************************************************************************************************")
                print("*****************************************************************************************************")
                print(" ")

        for user in listening_users:
            print(f"{user['user'].id} | {user['user'].email} | {user['user'].name} has listened to {user['total_minutes_listened']} minutes of podcasts in 2022")

    #def compute_total_highlight_listening_minutes(self):
    #    interactions = self.get_podcast_episode_interactions()
    #
    #    total_minutes = 0.0
    #
    #    # Compute number of minutes the user has listened for interactions with no lastListenedEpoch
    #    for interaction in interactions:
    #        if interaction['lastListenedEpoch'] is not None:
    #            next
    #        else:
    #            try:
    #                print(interaction)
    #                formatted_interaction = {}
    #                formatted_interaction['totalPercentagePodcastEpisodeListened'] = float(interaction['totalPercentagePodcastEpisodeListened'])
    #                formatted_interaction['totalPodcastEpisodeListenDuration'] = float(interaction['totalPodcastEpisodeListenDuration'])
    #                formatted_interaction['podcastEpisodeDuration'] = float(interaction['podcastEpisodeDuration'])
    #                formatted_interaction['totalPodcastEpisodeListenDurationMinutes'] = formatted_interaction['totalPodcastEpisodeListenDuration'] / 60.0
    #
    #                total_minutes += formatted_interaction['totalPodcastEpisodeListenDurationMinutes']
    #            except:
    #                next
    #
    #    return total_minutes
        
    async def get_podcast_episode_recommendations_for_podcast(self, podcast_id, limit=None):
        if limit is None:
            limit = 10
            
            podcast = core.data_models.Podcast.find(podcast_id)
            count_episodes_processed = podcast.count_episodes_processed()
            
            if count_episodes_processed > 100:
                limit = int((count_episodes_processed / 100) * 10)
            
            if limit > 30:
                limit = 30
        
        listened_podcast_episode_ids = core.data_models.PodcastEpisode \
            .join('user_queue_podcast_episodes', 'user_queue_podcast_episodes.podcast_episode_id', '=', 'podcast_episodes.id') \
            .where('user_queue_podcast_episodes.user_id', self.id) \
            .where('podcast_episodes.podcast_id', podcast_id) \
            .select('podcast_episodes.id') \
            .lists('id') \
            .all()
        
        vector_type = 'taste'
        if core.data_models.SinglestoreUserUnitVector.user_has_vector(self.id, 'listened'):
            vector_type = 'listened'
        
        episode_recommendations = core.data_models.SinglestoreUserUnitVector.get_similar_podcast_episodes(
            self, 
            vector_type=vector_type,
            podcast_id=podcast_id,
            #published_after=datetime.datetime.now() - datetime.timedelta(days=15),
            exclude_podcast_episode_ids=listened_podcast_episode_ids,
            count=limit
        )

        return episode_recommendations
        

    async def get_podcast_episode_content_recommendations(self, ignore_guids=[], ignore_podcast_ids=[]):
        user_taste_profile = await self.get_taste_profile()
        
        # TODO: Once steeled, refactor all of this into proper abstractions
        listened_new_recommended_podcast_episodes = []
        listened_global_recommended_podcast_episodes = []

        liked_new_recommended_podcast_episodes = []
        liked_recent_recommended_podcast_episodes = []

        taste_new_recommended_podcast_episodes = []
        taste_recent_recommended_podcast_episodes = []

        new_recommended_podcast_episodes = []
        recent_recommended_podcast_episodes = []

        similar_podcast_recommended_podcast_episodes = []

        followed_recommended_podcast_episodes = []
        newest_followed_podcast_episode = None

        used_podcast_ids = {}
        used_podcast_episode_ids = {}

        profile = core.profiler.start(f"CONTENT RECCOMENDATION VECTOR SIMILARITY")
        if user_taste_profile['listened_vector'] is not None:
            #normalized_vector = np.array(user_taste_profile['listened_vector']).astype(float)
            #normalized_vector = normalized_vector / np.linalg.norm(normalized_vector)

            listened_new_results = core.data_models.SinglestoreUserUnitVector.get_similar_podcast_episodes(
                self, 
                vector_type="listened", 
                published_after=datetime.now() - timedelta(days=15),
                count=75
            )
            listened_recent_results = core.data_models.SinglestoreUserUnitVector.get_similar_podcast_episodes(
                self, 
                vector_type="listened", 
                #published_after=datetime.datetime.now() - datetime.timedelta(days=90),
                count=400
            )

            if user_taste_profile['liked_vector'] is None:
                #similar_pods_ann_results = core.(normalized_vector.tolist(), collection_name='pods', max_results=60, nprobe=16)
                similar_pods_results = core.data_models.SinglestoreUserUnitVector.get_similar_podcasts(
                    self,
                    vector_type="listened", 
                    count=60
                )

        if user_taste_profile['liked_vector'] is not None:
            #normalized_vector = np.array(user_taste_profile['liked_vector']).astype(float)
            #normalized_vector = normalized_vector / np.linalg.norm(normalized_vector)
            liked_recent_results = core.data_models.SinglestoreUserUnitVector.get_similar_podcast_episodes(
                self, 
                vector_type="liked", 
                published_after=datetime.now() - timedelta(days=90),
                count=300
            )
            similar_pods_results = core.data_models.SinglestoreUserUnitVector.get_similar_podcasts(
                self,
                vector_type="liked", 
                count=75
            )
        core.profiler.end(profile)

        profile = core.profiler.start(f"CONTENT RECCOMENDATION DATABASE LOOKUP")

        # ------------------------------------------------------------------------------
        # Listened
        # ------------------------------------------------------------------------------

        # New
        if user_taste_profile['listened_vector'] is not None:


            distance_lookup = {}
            for result in listened_new_results:
                distance_lookup[result['podcast_episode_id']] = result['similarity']

            profile_query = core.profiler.start(f"CONTENT RECCOMENDATION DATABASE LOOKUP filtered_podcast_episodes")
            
            filtered_podcast_episodes = core.data_models.PodcastEpisode \
                .where_in('podcast_episodes.id', list([r['podcast_episode_id'] for r in listened_new_results])) \
                .where_raw("podcast_episodes.id in (select distinct podcast_episode_id from podcast_episode_previews where podcast_episode_id = podcast_episodes.id and type like '%%fathom%%')") \
                .left_join(JoinClause('user_podcast_episode_views') \
                    .on('podcast_episodes.id', '=', 'user_podcast_episode_views.podcast_episode_id') \
                    .where('user_podcast_episode_views.user_id', '=', self.id) \
                ) \
                .where_null('user_podcast_episode_views.id') \
                .left_join(JoinClause('user_podcast_episode_likes') \
                    .on('podcast_episodes.id', '=', 'user_podcast_episode_likes.podcast_episode_id') \
                    .where('user_podcast_episode_likes.user_id', '=', self.id) \
                ) \
                .where_null('user_podcast_episode_likes.id') \
                .left_join(JoinClause('user_queue_podcast_episodes') \
                    .on('podcast_episodes.id', '=', 'user_queue_podcast_episodes.podcast_episode_id') \
                    .where('user_queue_podcast_episodes.user_id', '=', self.id) \
                ) \
                .where_null('user_queue_podcast_episodes.id') \
                .left_join(JoinClause('user_podcast_follows') \
                    .on('podcast_episodes.podcast_id', '=', 'user_podcast_follows.podcast_id') \
                    .where('user_podcast_follows.user_id', '=', self.id) \
                ) \
                .where_null('user_podcast_follows.id') \
                .where_not_in('podcast_episodes.guid', ignore_guids) \
                .where_not_in('podcast_episodes.podcast_id', ignore_podcast_ids) \
                .select('podcast_episodes.id', 'podcast_episodes.vector_id_new', 'podcast_episodes.podcast_id') \
                .get()
            
            core.profiler.end(profile_query)

            scored_filtered_podcast_episodes = []
            for episode in filtered_podcast_episodes:
                if episode.podcast_id not in used_podcast_ids and episode.id not in used_podcast_episode_ids:
                    scored_filtered_podcast_episode = {
                        'id': episode.id,
                        'score': distance_lookup[episode.id]
                    }
                    scored_filtered_podcast_episodes.append(scored_filtered_podcast_episode)

            scored_filtered_podcast_episodes.sort(key=lambda x: x['score'], reverse=True)
            scored_filtered_podcast_episodes = scored_filtered_podcast_episodes[:20]

            
            profile_query = core.profiler.start(f"CONTENT RECCOMENDATION DATABASE LOOKUP podcast_episodes")

            podcast_episodes = core.data_models.PodcastEpisode \
                .with_('podcast') \
                .with_('podcast.vectors') \
                .with_('podcast.categories') \
                .with_('audio_files') \
                .with_('transcript_files') \
                .with_({'previews': core.data_models.PodcastEpisodePreview.query().where_null('user_id').select('id', 'start', 'end', 'highlight', 'title', 'type', 'score', 'podcast_episode_id')}) \
                .left_join(JoinClause('user_queue_podcast_episodes') \
                    .on('podcast_episodes.id', '=', 'user_queue_podcast_episodes.podcast_episode_id') \
                    .where('user_queue_podcast_episodes.user_id', '=', self.id) \
                ) \
                .where_in('podcast_episodes.id', list([episode['id'] for episode in scored_filtered_podcast_episodes])) \
                .select('podcast_episodes.*', 'user_queue_podcast_episodes.last_position') \
                .get()

            core.profiler.end(profile_query)

            for episode in podcast_episodes:
                distance = distance_lookup[episode.id]
                if distance >= 0.65:

                    podcast_distance = -1.00
                    podcast_euclidean_distance = -1.00
                    if episode.podcast.primary_vector():
                        podcast_distance = 1 - cosine(user_taste_profile['taste_vector'], np.array(episode.podcast.primary_vector().vector).astype(float))
                        podcast_euclidean_distance = euclidean(user_taste_profile['taste_vector'], np.array(episode.podcast.primary_vector().vector).astype(float))

                    listened_new_recommended_podcast_episodes.append({
                        'episode': episode,
                        'distance': distance,
                        'podcast_distance': podcast_distance,
                        'podcast_euclidean_distance': podcast_euclidean_distance,
                        'weighted_distance': np.average([distance, podcast_distance], weights=[0.7, 0.3]),
                        'type': 'listened',
                        'collection': 'new',
                        'source_podcast_episode_id': None,
                    })

                    used_podcast_ids[episode.podcast_id] = True
                    used_podcast_episode_ids[episode.id] = True


            # Recent

            distance_lookup = {}
            for result in listened_recent_results:
                distance_lookup[result['podcast_episode_id']] = result['similarity']

            filtered_podcast_episodes = core.data_models.PodcastEpisode \
                .where_in('podcast_episodes.id', list([r['podcast_episode_id'] for r in listened_recent_results])) \
                .where_raw("podcast_episodes.id in (select distinct podcast_episode_id from podcast_episode_previews where podcast_episode_id = podcast_episodes.id and type like '%%fathom%%')") \
                .left_join(JoinClause('user_podcast_episode_views') \
                    .on('podcast_episodes.id', '=', 'user_podcast_episode_views.podcast_episode_id') \
                    .where('user_podcast_episode_views.user_id', '=', self.id) \
                ) \
                .where_null('user_podcast_episode_views.id') \
                .left_join(JoinClause('user_podcast_episode_likes') \
                    .on('podcast_episodes.id', '=', 'user_podcast_episode_likes.podcast_episode_id') \
                    .where('user_podcast_episode_likes.user_id', '=', self.id) \
                ) \
                .where_null('user_podcast_episode_likes.id') \
                .left_join(JoinClause('user_queue_podcast_episodes') \
                    .on('podcast_episodes.id', '=', 'user_queue_podcast_episodes.podcast_episode_id') \
                    .where('user_queue_podcast_episodes.user_id', '=', self.id) \
                ) \
                .where_null('user_queue_podcast_episodes.id') \
                .where_not_in('podcast_episodes.guid', ignore_guids) \
                .where_not_in('podcast_episodes.podcast_id', ignore_podcast_ids) \
                .select('podcast_episodes.id', 'podcast_episodes.vector_id', 'podcast_episodes.podcast_id') \
                .get()

            scored_filtered_podcast_episodes = []
            for episode in filtered_podcast_episodes:
                if episode.podcast_id not in used_podcast_ids and episode.id not in used_podcast_episode_ids:
                    scored_filtered_podcast_episode = {
                        'id': episode.id,
                        'score': distance_lookup[episode.id]
                    }
                    scored_filtered_podcast_episodes.append(scored_filtered_podcast_episode)

            scored_filtered_podcast_episodes.sort(key=lambda x: x['score'], reverse=True)
            scored_filtered_podcast_episodes = scored_filtered_podcast_episodes[:20]

            podcast_episodes = core.data_models.PodcastEpisode \
                .with_('podcast') \
                .with_('podcast.vectors') \
                .with_('podcast.categories') \
                .with_('audio_files') \
                .with_('transcript_files') \
                .with_({'previews': core.data_models.PodcastEpisodePreview.query().where_null('user_id').select('id', 'start', 'end', 'highlight', 'title', 'type', 'score', 'podcast_episode_id')}) \
                .left_join(JoinClause('user_queue_podcast_episodes') \
                    .on('podcast_episodes.id', '=', 'user_queue_podcast_episodes.podcast_episode_id') \
                    .where('user_queue_podcast_episodes.user_id', '=', self.id) \
                ) \
                .where_in('podcast_episodes.id', list([episode['id'] for episode in scored_filtered_podcast_episodes])) \
                .select('podcast_episodes.*', 'user_queue_podcast_episodes.last_position') \
                .get()

            for episode in podcast_episodes:
                distance = distance_lookup[episode.id]
                if distance >= 0.65:

                    podcast_distance = -1.00
                    podcast_euclidean_distance = -1.00
                    if episode.podcast.primary_vector():
                        podcast_distance = 1 - cosine(user_taste_profile['taste_vector'], np.array(episode.podcast.primary_vector().vector).astype(float))
                        podcast_euclidean_distance = euclidean(user_taste_profile['taste_vector'], np.array(episode.podcast.primary_vector().vector).astype(float))

                    listened_global_recommended_podcast_episodes.append({
                        'episode': episode,
                        'distance': distance,
                        'podcast_distance': podcast_distance,
                        'podcast_euclidean_distance': podcast_euclidean_distance,
                        'weighted_distance': np.average([distance, podcast_distance], weights=[0.35, 0.65]),
                        'type': 'listened',
                        'collection': 'global',
                        'source_podcast_episode_id': None,
                    })

                    used_podcast_ids[episode.podcast_id] = True
                    used_podcast_episode_ids[episode.id] = True


        # ------------------------------------------------------------------------------
        # Liked
        # ------------------------------------------------------------------------------
        if user_taste_profile['liked_vector'] is not None:
            # New

            # TODO: Re-enable once we have something faster than Milvus seach in place, like SingleStore

            #
            #distance_lookup = {}
            #for result in ann_results:
            #    distance_lookup[result['vector_id']] = result['distance']
            #
            #podcast_episodes = core.data_models.PodcastEpisode \
            #    .with_('podcast') \
            #    .with_('podcast.vectors') \
            #    .with_('podcast.categories') \
            #    .with_('audio_files') \
            #    .with_({'previews': core.data_models.PodcastEpisodePreview.query().where_null('user_id').select('id', 'start', 'end', 'highlight', 'type', 'score', 'podcast_episode_id')}) \
            #    .where_in('vector_id_new', list([r['vector_id'] for r in ann_results])) \
            #    .where_raw("podcast_episodes.id in (select distinct podcast_episode_id from podcast_episode_previews where podcast_episode_id = podcast_episodes.id and type like '%%fathom%%')") \
            #    .left_join(JoinClause('user_podcast_episode_views') \
            #        .on('podcast_episodes.id', '=', 'user_podcast_episode_views.podcast_episode_id') \
            #        .where('user_podcast_episode_views.user_id', '=', self.id) \
            #    ) \
            #    .where_null('user_podcast_episode_views.id') \
            #    .left_join(JoinClause('user_podcast_episode_likes') \
            #        .on('podcast_episodes.id', '=', 'user_podcast_episode_likes.podcast_episode_id') \
            #        .where('user_podcast_episode_likes.user_id', '=', self.id) \
            #    ) \
            #    .where_null('user_podcast_episode_likes.id') \
            #    .left_join(JoinClause('user_queue_podcast_episodes') \
            #        .on('podcast_episodes.id', '=', 'user_queue_podcast_episodes.podcast_episode_id') \
            #        .where('user_queue_podcast_episodes.user_id', '=', self.id) \
            #    ) \
            #    .where_null('user_queue_podcast_episodes.id') \
            #    .left_join(JoinClause('user_podcast_follows') \
            #        .on('podcast_episodes.podcast_id', '=', 'user_podcast_follows.podcast_id') \
            #        .where('user_podcast_follows.user_id', '=', self.id) \
            #    ) \
            #    .where_null('user_podcast_follows.id') \
            #    .where_not_in('podcast_episodes.guid', ignore_guids) \
            #    .where_not_in('podcast_episodes.podcast_id', ignore_podcast_ids) \
            #    .select('podcast_episodes.*', 'user_queue_podcast_episodes.last_position') \
            #    .get()
            #
            #for episode in podcast_episodes:
            #    distance = distance_lookup[episode.vector_id_new]
            #    if distance >= 0.80:
            #
            #        podcast_distance = -1.00
            #        if episode.podcast.primary_vector():
            #            podcast_distance = 1 - cosine(user_vectors['taste_vector'], np.array(episode.podcast.primary_vector().vector).astype(float))

            #        liked_new_recommended_podcast_episodes.append({
            #            'episode': episode,
            #            'distance': distance,
            #            'podcast_distance': podcast_distance,
            #            'weighted_distance': np.average([distance, podcast_distance], weights=[0.35, 0.65]),
            #            'type': 'liked',
            #            'collection': 'new',
            #            'source_podcast_episode_id': None,
            #        })
            #

            # Recent


            distance_lookup = {}
            for result in liked_recent_results:
                distance_lookup[result['podcast_episode_id']] = result['similarity']

            filtered_podcast_episodes = core.data_models.PodcastEpisode \
                .where_in('podcast_episodes.id', list([r['podcast_episode_id'] for r in liked_recent_results])) \
                .where_raw("podcast_episodes.id in (select distinct podcast_episode_id from podcast_episode_previews where podcast_episode_id = podcast_episodes.id and type like '%%fathom%%')") \
                .left_join(JoinClause('user_podcast_episode_views') \
                    .on('podcast_episodes.id', '=', 'user_podcast_episode_views.podcast_episode_id') \
                    .where('user_podcast_episode_views.user_id', '=', self.id) \
                ) \
                .where_null('user_podcast_episode_views.id') \
                .left_join(JoinClause('user_podcast_episode_likes') \
                    .on('podcast_episodes.id', '=', 'user_podcast_episode_likes.podcast_episode_id') \
                    .where('user_podcast_episode_likes.user_id', '=', self.id) \
                ) \
                .where_null('user_podcast_episode_likes.id') \
                .left_join(JoinClause('user_queue_podcast_episodes') \
                    .on('podcast_episodes.id', '=', 'user_queue_podcast_episodes.podcast_episode_id') \
                    .where('user_queue_podcast_episodes.user_id', '=', self.id) \
                ) \
                .where_null('user_queue_podcast_episodes.id') \
                .left_join(JoinClause('user_podcast_follows') \
                    .on('podcast_episodes.podcast_id', '=', 'user_podcast_follows.podcast_id') \
                    .where('user_podcast_follows.user_id', '=', self.id) \
                ) \
                .where_null('user_podcast_follows.id') \
                .where_not_in('podcast_episodes.guid', ignore_guids) \
                .where_not_in('podcast_episodes.podcast_id', ignore_podcast_ids) \
                .select('podcast_episodes.id', 'podcast_episodes.vector_id_recent', 'podcast_episodes.podcast_id') \
                .get()

            scored_filtered_podcast_episodes = []
            for episode in filtered_podcast_episodes:
                if episode.podcast_id not in used_podcast_ids and episode.id not in used_podcast_episode_ids:
                    scored_filtered_podcast_episode = {
                        'id': episode.id,
                        'score': distance_lookup[episode.id]
                    }
                    scored_filtered_podcast_episodes.append(scored_filtered_podcast_episode)

            scored_filtered_podcast_episodes.sort(key=lambda x: x['score'], reverse=True)
            scored_filtered_podcast_episodes = scored_filtered_podcast_episodes[:20]

            podcast_episodes = core.data_models.PodcastEpisode \
                .with_('podcast') \
                .with_('podcast.vectors') \
                .with_('podcast.categories') \
                .with_('audio_files') \
                .with_('transcript_files') \
                .with_({'previews': core.data_models.PodcastEpisodePreview.query().select('id', 'start', 'end', 'highlight', 'title', 'type', 'score', 'podcast_episode_id')}) \
                .left_join(JoinClause('user_queue_podcast_episodes') \
                    .on('podcast_episodes.id', '=', 'user_queue_podcast_episodes.podcast_episode_id') \
                    .where('user_queue_podcast_episodes.user_id', '=', self.id) \
                ) \
                .where_in('podcast_episodes.id', list([episode['id'] for episode in scored_filtered_podcast_episodes])) \
                .select('podcast_episodes.*', 'user_queue_podcast_episodes.last_position') \
                .get()

            for episode in podcast_episodes:
                distance = distance_lookup[episode.id]
                if distance >= 0.65:

                    podcast_distance = -1.00
                    podcast_euclidean_distance = -1.00
                    if episode.podcast.primary_vector():
                        podcast_distance = 1 - cosine(user_taste_profile['taste_vector'], np.array(episode.podcast.primary_vector().vector).astype(float))
                        podcast_euclidean_distance =  euclidean(user_taste_profile['taste_vector'], np.array(episode.podcast.primary_vector().vector).astype(float))

                    liked_recent_recommended_podcast_episodes.append({
                        'episode': episode,
                        'distance': distance,
                        'podcast_distance': podcast_distance,
                        'podcast_euclidean_distance': podcast_euclidean_distance,
                        'weighted_distance': np.average([distance, podcast_distance], weights=[0.35, 0.65]),
                        'type': 'liked',
                        'collection': 'recent',
                        'source_podcast_episode_id': None,
                    })

                    used_podcast_ids[episode.podcast_id] = True
                    used_podcast_episode_ids[episode.id] = True



        # ------------------------------------------------------------------------------
        # Similar Podcasts, New Content
        # ------------------------------------------------------------------------------
        if user_taste_profile['liked_vector'] is not None:
            distance_lookup = {}
            for result in similar_pods_results:
                distance_lookup[result['podcast_id']] = result['similarity']

            filtered_podcasts = core.data_models.Podcast \
                .left_join(JoinClause('user_podcast_follows') \
                    .on('podcasts.id', '=', 'user_podcast_follows.podcast_id') \
                    .where('user_podcast_follows.user_id', '=', self.id) \
                ) \
                .where_null('user_podcast_follows.id') \
                .where_in('podcasts.id', list([r['podcast_id'] for r in similar_pods_results])) \
                .select('podcasts.id', 'podcasts.vector_id') \
                .get()

            scored_filtered_podcasts = []
            for podcast in filtered_podcasts:
                if podcast.id not in used_podcast_ids:
                    scored_filtered_podcast = {
                        'id': podcast.id,
                        'score': distance_lookup[podcast.id]
                    }
                    scored_filtered_podcasts.append(scored_filtered_podcast)

            scored_filtered_podcasts.sort(key=lambda x: x['score'], reverse=True)
            scored_filtered_podcasts = scored_filtered_podcasts[:20]

            podcast_episodes = core.data_models.PodcastEpisode \
                .with_('vectors') \
                .with_('podcast') \
                .with_('podcast.vectors') \
                .with_('podcast.categories') \
                .with_('audio_files') \
                .with_('transcript_files') \
                .with_({'previews': core.data_models.PodcastEpisodePreview.query().where_null('user_id').select('id', 'start', 'end', 'highlight', 'title', 'type', 'score', 'podcast_episode_id')}) \
                .where_in('podcast_episodes.podcast_id', list([podcast['id'] for podcast in scored_filtered_podcasts])) \
                .where_raw("podcast_episodes.id in (select distinct podcast_episode_id from podcast_episode_previews where podcast_episode_id = podcast_episodes.id and type like '%%fathom%%')") \
                .left_join(JoinClause('user_podcast_episode_views') \
                    .on('podcast_episodes.id', '=', 'user_podcast_episode_views.podcast_episode_id') \
                    .where('user_podcast_episode_views.user_id', '=', self.id) \
                ) \
                .where_null('user_podcast_episode_views.id') \
                .left_join(JoinClause('user_podcast_episode_likes') \
                    .on('podcast_episodes.id', '=', 'user_podcast_episode_likes.podcast_episode_id') \
                    .where('user_podcast_episode_likes.user_id', '=', self.id) \
                ) \
                .where_null('user_podcast_episode_likes.id') \
                .left_join(JoinClause('user_queue_podcast_episodes') \
                    .on('podcast_episodes.id', '=', 'user_queue_podcast_episodes.podcast_episode_id') \
                    .where('user_queue_podcast_episodes.user_id', '=', self.id) \
                ) \
                .where_null('user_queue_podcast_episodes.id') \
                .left_join(JoinClause('user_podcast_follows') \
                    .on('podcast_episodes.podcast_id', '=', 'user_podcast_follows.podcast_id') \
                    .where('user_podcast_follows.user_id', '=', self.id) \
                ) \
                .where_null('user_podcast_follows.id') \
                .where_not_in('podcast_episodes.guid', ignore_guids) \
                .where_not_in('podcast_episodes.podcast_id', ignore_podcast_ids) \
                .select('podcast_episodes.*', 'user_queue_podcast_episodes.last_position') \
                .order_by('publication_date', 'desc') \
                .limit(100) \
                .get()

            for episode in podcast_episodes:
                if episode.primary_vector():
                    distance = 1 - cosine(user_taste_profile['taste_vector'], np.array(episode.primary_vector().vector).astype(float))
                    if distance >= 0.65:

                        podcast_distance = -1.00
                        podcast_euclidean_distance = -1.00
                        if episode.podcast.primary_vector():
                            podcast_distance = 1 - cosine(user_taste_profile['taste_vector'], np.array(episode.podcast.primary_vector().vector).astype(float))
                            podcast_euclidean_distance = euclidean(user_taste_profile['taste_vector'], np.array(episode.podcast.primary_vector().vector).astype(float))
                        similar_podcast_recommended_podcast_episodes.append({
                            'episode': episode,
                            'distance': distance,
                            'podcast_distance': podcast_distance,
                            'podcast_euclidean_distance': podcast_euclidean_distance,
                            'weighted_distance': np.average([distance, podcast_distance], weights=[0.4, 0.6]),
                            'type': 'similar-podcast',
                            'collection': None,
                            'source_podcast_episode_id': None,
                        })

                        used_podcast_ids[episode.podcast_id] = True
                        used_podcast_episode_ids[episode.id] = True


        # ------------------------------------------------------------------------------
        # Followed
        # ------------------------------------------------------------------------------

        podcast_episodes = core.data_models.PodcastEpisode \
            .with_('vectors') \
            .with_('podcast') \
            .with_('podcast.vectors') \
            .with_('podcast.categories') \
            .with_('audio_files') \
            .with_('transcript_files') \
            .with_({'previews': core.data_models.PodcastEpisodePreview.query().select('id', 'start', 'end', 'highlight', 'title', 'type', 'score', 'podcast_episode_id')}) \
            .where_raw("podcast_episodes.id in (select distinct podcast_episode_id from podcast_episode_previews where podcast_episode_id = podcast_episodes.id and type like '%%fathom%%')") \
            .left_join(JoinClause('user_podcast_episode_views') \
                .on('podcast_episodes.id', '=', 'user_podcast_episode_views.podcast_episode_id') \
                .where('user_podcast_episode_views.user_id', '=', self.id) \
            ) \
            .where_null('user_podcast_episode_views.id') \
            .left_join(JoinClause('user_podcast_episode_likes') \
                .on('podcast_episodes.id', '=', 'user_podcast_episode_likes.podcast_episode_id') \
                .where('user_podcast_episode_likes.user_id', '=', self.id) \
            ) \
            .where_null('user_podcast_episode_likes.id') \
            .left_join(JoinClause('user_queue_podcast_episodes') \
                .on('podcast_episodes.id', '=', 'user_queue_podcast_episodes.podcast_episode_id') \
                .where('user_queue_podcast_episodes.user_id', '=', self.id) \
            ) \
            .where_null('user_queue_podcast_episodes.id') \
            .left_join(JoinClause('user_podcast_follows') \
                .on('podcast_episodes.podcast_id', '=', 'user_podcast_follows.podcast_id') \
                .where('user_podcast_follows.user_id', '=', self.id) \
            ) \
            .where_not_null('user_podcast_follows.id') \
            .where_not_in('podcast_episodes.guid', ignore_guids) \
            .where_not_in('podcast_episodes.podcast_id', ignore_podcast_ids) \
            .select('podcast_episodes.*', 'user_queue_podcast_episodes.last_position') \
            .order_by('publication_date', 'desc') \
            .limit(50) \
            .get()

        if len(podcast_episodes) > 0:
            episode = podcast_episodes[0]

            distance = -1.00
            if episode.primary_vector():
                distance = 1 - cosine(user_taste_profile['taste_vector'], np.array(episode.primary_vector().vector).astype(float))

            podcast_distance = -1.00
            podcast_euclidean_distance = -1.00
            if episode.podcast.primary_vector():
                podcast_distance = 1 - cosine(user_taste_profile['taste_vector'], np.array(episode.podcast.primary_vector().vector).astype(float))
                podcast_euclidean_distance = euclidean(user_taste_profile['taste_vector'], np.array(episode.podcast.primary_vector().vector).astype(float))

            newest_followed_podcast_episode = {
                'episode': podcast_episodes[0],
                'distance': distance,
                'podcast_distance': podcast_distance,
                'podcast_euclidean_distance': podcast_euclidean_distance,
                'weighted_distance': np.average([distance, podcast_distance], weights=[0.35, 0.65]),
                'type': 'followed-newest',
                'collection': None,
                'source_podcast_episode_id': None,
            }

        for episode in podcast_episodes:
            if episode.primary_vector():
                distance = 1 - cosine(user_taste_profile['taste_vector'], np.array(episode.primary_vector().vector).astype(float))

                podcast_distance = -1.00
                podcast_euclidean_distance = -1.00
                if episode.podcast.primary_vector():
                    podcast_distance = 1 - cosine(user_taste_profile['taste_vector'], np.array(episode.podcast.primary_vector().vector).astype(float))
                    podcast_euclidean_distance = euclidean(user_taste_profile['taste_vector'], np.array(episode.podcast.primary_vector().vector).astype(float))

                followed_recommended_podcast_episodes.append({
                    'episode': episode,
                    'distance': distance,
                    'podcast_distance': podcast_distance,
                    'podcast_euclidean_distance': podcast_euclidean_distance,
                    'weighted_distance': np.average([distance, podcast_distance], weights=[0.35, 0.65]),
                    'type': 'followed',
                    'collection': None,
                    'source_podcast_episode_id': None,
                })

        # ------------------------------------------------------------------------------
        # Mix the cocktail 1
        # ------------------------------------------------------------------------------
        #listened_new_recommended_podcast_episodes.sort(key=lambda x: x['weighted_distance'], reverse=True)
        #liked_new_recommended_podcast_episodes.sort(key=lambda x: x['weighted_distance'], reverse=True)
        #taste_new_recommended_podcast_episodes.sort(key=lambda x: x['weighted_distance'], reverse=True)
        #
        #max_len = np.amax([
        #    len(listened_new_recommended_podcast_episodes),
        #    len(liked_new_recommended_podcast_episodes),
        #    len(taste_new_recommended_podcast_episodes)
        #])
        #
        #for index in range(0, max_len):
        #    if index < (len(taste_new_recommended_podcast_episodes) - 1):
        #        new_recommended_podcast_episodes.append(taste_new_recommended_podcast_episodes[index])
        #    if index < (len(listened_new_recommended_podcast_episodes) - 1):
        #        new_recommended_podcast_episodes.append(listened_new_recommended_podcast_episodes[index])
        #    if index < (len(liked_new_recommended_podcast_episodes) - 1):
        #        new_recommended_podcast_episodes.append(liked_new_recommended_podcast_episodes[index])

        #listened_recent_recommended_podcast_episodes.sort(key=lambda x: x['weighted_distance'], reverse=True)
        #liked_recent_recommended_podcast_episodes.sort(key=lambda x: x['weighted_distance'], reverse=True)
        #taste_recent_recommended_podcast_episodes.sort(key=lambda x: x['weighted_distance'], reverse=True)
        #
        #max_len = np.amax([
        #    len(listened_recent_recommended_podcast_episodes),
        #    len(liked_recent_recommended_podcast_episodes),
        #    len(taste_recent_recommended_podcast_episodes)
        #])
        #
        #for index in range(0, max_len):
        #    if index < (len(taste_recent_recommended_podcast_episodes) - 1):
        #        recent_recommended_podcast_episodes.append(taste_recent_recommended_podcast_episodes[index])
        #    if index < (len(listened_recent_recommended_podcast_episodes) - 1):
        #        recent_recommended_podcast_episodes.append(listened_recent_recommended_podcast_episodes[index])
        #    if index < (len(liked_recent_recommended_podcast_episodes) - 1):
        #        recent_recommended_podcast_episodes.append(liked_recent_recommended_podcast_episodes[index])

        ## De-dup filter by episodes
        #used_podcast_episode_guids = {}
        #filtered_new_recommended_podcast_episodes = []
        #for episode in new_recommended_podcast_episodes:
        #    if episode['episode'].guid not in used_podcast_episode_guids:
        #        used_podcast_episode_guids[episode['episode'].guid] = True
        #        filtered_new_recommended_podcast_episodes.append(episode)
        #
        #filtered_recent_recommended_podcast_episodes = []
        #for episode in recent_recommended_podcast_episodes:
        #    if episode['episode'].guid not in used_podcast_episode_guids:
        #        used_podcast_episode_guids[episode['episode'].guid] = True
        #        filtered_recent_recommended_podcast_episodes.append(episode)
        #
        ## Intermix
        #max_len = np.amax([
        #    len(filtered_new_recommended_podcast_episodes),
        #    len(filtered_recent_recommended_podcast_episodes)
        #])
        #
        #recommended_podcast_episodes = []
        #for index in range(0, max_len):
        #    if index < (len(filtered_new_recommended_podcast_episodes) - 1):
        #        recommended_podcast_episodes.append(filtered_new_recommended_podcast_episodes[index])
        #    if index < (len(filtered_recent_recommended_podcast_episodes) - 1):
        #        recommended_podcast_episodes.append(filtered_recent_recommended_podcast_episodes[index])

        # ------------------------------------------------------------------------------
        # Mix the cocktail 2
        # ------------------------------------------------------------------------------

        recommended_podcast_episodes = []
        recommended_podcast_episodes += listened_new_recommended_podcast_episodes
        recommended_podcast_episodes += liked_new_recommended_podcast_episodes
        recommended_podcast_episodes += taste_new_recommended_podcast_episodes
        recommended_podcast_episodes += liked_recent_recommended_podcast_episodes
        recommended_podcast_episodes += taste_recent_recommended_podcast_episodes
        recommended_podcast_episodes += similar_podcast_recommended_podcast_episodes

        # Sort
        recommended_podcast_episodes.sort(key=lambda x: x['weighted_distance'], reverse=True)

        # Insert new
        if len(listened_new_recommended_podcast_episodes) > 0:
            listened_new_recommended_podcast_episodes.sort(key=lambda x: x['weighted_distance'], reverse=True)
            recommended_podcast_episodes.insert(1,listened_new_recommended_podcast_episodes[0])

        # Insert listened
        if len(listened_global_recommended_podcast_episodes) > 0:
            listened_global_recommended_podcast_episodes.sort(key=lambda x: x['weighted_distance'], reverse=True)
            recommended_podcast_episodes.insert(1,listened_global_recommended_podcast_episodes[0])

        # Top with newest followed
        if newest_followed_podcast_episode is not None:
            recommended_podcast_episodes.insert(0, newest_followed_podcast_episode)

        # Insert Followed
        if len(followed_recommended_podcast_episodes) > 0:
            followed_recommended_podcast_episodes.sort(key=lambda x: x['weighted_distance'], reverse=True)

            followed_recommended_podcast_episodes_to_use = []
            used_podcast_guids = {}
            used_podcast_guids[newest_followed_podcast_episode['episode'].podcast.guid] = True
            for episode in followed_recommended_podcast_episodes:
                if episode['episode'].podcast.guid not in used_podcast_guids:
                    used_podcast_guids[episode['episode'].podcast.guid] = True
                    followed_recommended_podcast_episodes_to_use.append(episode)
                    if len(followed_recommended_podcast_episodes_to_use) == 2:
                        break
            if len(followed_recommended_podcast_episodes_to_use) > 0:
                recommended_podcast_episodes.insert(3, followed_recommended_podcast_episodes_to_use[0])
            if len(followed_recommended_podcast_episodes_to_use) > 1:
                recommended_podcast_episodes.insert(7, followed_recommended_podcast_episodes_to_use[1])

        # De-dup filter by podcast episode
        used_podcast_episode_guids = {}
        filtered_recommended_podcast_episodes = []
        for episode in recommended_podcast_episodes:
            if episode['episode'].guid not in used_podcast_episode_guids:
                used_podcast_episode_guids[episode['episode'].guid] = True
                filtered_recommended_podcast_episodes.append(episode)

        # De-dup filter by podcast
        used_podcast_ids = {}
        refined_recommended_podcast_episodes = []
        for episode in filtered_recommended_podcast_episodes:
            # allow for multiple episodes from the same podcast in the future
            if episode['episode'].podcast_id not in used_podcast_ids or used_podcast_ids[episode['episode'].podcast_id] < 1:
                if episode['episode'].podcast_id not in used_podcast_ids:
                    used_podcast_ids[episode['episode'].podcast_id] = 1
                else:
                    used_podcast_ids[episode['episode'].podcast_id] += 1

                refined_recommended_podcast_episodes.append(episode)

        core.profiler.end(profile)

        core.log.debug('***************************************************************')
        core.log.debug('CONTENT RECCOMENDATIONS')
        core.log.debug('***************************************************************')
        for episode in refined_recommended_podcast_episodes:
            core.log.debug(episode['episode'].podcast.title)
            core.log.debug(episode['episode'].title)
            core.log.debug(episode['episode'].guid)
            core.log.debug(episode['episode'].id)
            core.log.debug(episode['distance'])
            core.log.debug(episode['podcast_distance'])
            core.log.debug(episode['weighted_distance'])
            core.log.debug(episode['podcast_euclidean_distance'])
            core.log.debug(episode['type'])
            core.log.debug(episode['collection'])
            core.log.debug(episode['source_podcast_episode_id'])
            core.log.debug('-----------------------------------------------------------')

        return user_taste_profile, refined_recommended_podcast_episodes

    async def default_user_reccomendations(self, ignore_guids, ignore_podcast_ids=[]):
        user_followed_podcast_rss_urls = []
        user_podcast_categories = []
        for category in self.podcast_categories:
            user_podcast_categories.append(category.id)

        for podcast in self.followed_podcasts():
            user_followed_podcast_rss_urls.append(podcast.rss_url)

            for category in podcast.categories:
                if category.id not in user_podcast_categories:
                    user_podcast_categories.append(category.id)

        # Related Podcasts
        db_related_podcast_ids = [0]
        related_podcasts_scores = {}
        if len(user_followed_podcast_rss_urls) > 0:
            stats_related_podcasts = core.data_models.StatsAppleRelatedPodcast \
                .where_in('podcast_rss_url', user_followed_podcast_rss_urls) \
                .get()

            for stats_related_podcast in stats_related_podcasts:
                if stats_related_podcast.related_podcast_rss_url not in related_podcasts_scores:
                    related_podcasts_scores[stats_related_podcast.related_podcast_rss_url] = 1 / (stats_related_podcast.related_order + 1)
                else:
                    related_podcasts_scores[stats_related_podcast.related_podcast_rss_url] += 1 / (stats_related_podcast.related_order + 1)

            related_podcasts = core.data_models.Podcast \
                .where_in('rss_url', list([related_podcast.related_podcast_rss_url for related_podcast in stats_related_podcasts])) \
                .where('processing_level', '>=', 3) \
                .select('id', 'rss_url') \
                .get()

            for podcast in related_podcasts:
                db_related_podcast_ids.append(podcast.id)
                related_podcasts_scores[podcast.id] = related_podcasts_scores[podcast.rss_url]

        db_category_podcasts = core.data_models.PodcastCategoriesPodcast \
            .join(JoinClause('podcasts').on('podcasts.id', '=', 'podcast_categories_podcasts.podcast_id')) \
            .where_in('podcast_category_id', user_podcast_categories) \
            .where('podcasts.processing_level', '>=', 3) \
            .distinct() \
            .order_by('last_publish_on', 'desc') \
            .order_by('apple_rank', 'desc') \
            .limit(100) \
            .select('podcast_id', 'last_publish_on', 'apple_rank') \
            .get()

        db_category_podcast_ids = []
        used_podcast_ids = {}
        for podcast in db_category_podcasts:
            db_category_podcast_ids.append(podcast.podcast_id)
            used_podcast_ids[podcast.podcast_id] = True

        for id in db_related_podcast_ids:
            if id not in used_podcast_ids:
                db_category_podcast_ids.append(id)

        # New Episodes
        db_podcast_episodes = core.data_models.PodcastEpisode


        user_queue_podcast_episodes_clause = JoinClause('user_queue_podcast_episodes') \
            .on('user_queue_podcast_episodes.podcast_episode_id', '=', 'podcast_episodes.id') \
            .where('user_queue_podcast_episodes.user_id', '=', self.id) \

        db_podcast_episodes = db_podcast_episodes.left_join(user_queue_podcast_episodes_clause) \
            .select('podcast_episodes.*', 'user_queue_podcast_episodes.last_position')

        db_new_podcast_episodes = db_podcast_episodes.with_('audio_files') \
            .with_('transcript_files') \
            .with_('podcast') \
            .with_('podcast.categories') \
            .with_({'previews': core.data_models.PodcastEpisodePreview.query().where_null('user_id').select('id', 'start', 'end', 'highlight', 'title', 'type', 'score', 'podcast_episode_id')}) \
            .join(JoinClause('podcasts').on('podcasts.id', '=', 'podcast_episodes.podcast_id')) \
            .left_join(JoinClause('user_podcast_episode_views') \
                .on('podcast_episodes.id', '=', 'user_podcast_episode_views.podcast_episode_id') \
                .where('user_podcast_episode_views.user_id', '=', self.id) \
            ) \
            .where_null('user_podcast_episode_views.id') \
            .left_join(JoinClause('user_podcast_episode_likes') \
                .on('podcast_episodes.id', '=', 'user_podcast_episode_likes.podcast_episode_id') \
                .where('user_podcast_episode_likes.user_id', '=', self.id) \
            ) \
            .where_null('user_podcast_episode_likes.id') \
            .where_null('user_queue_podcast_episodes.id') \
            .where_not_in('podcast_episodes.guid', ignore_guids) \
            .where_not_in('podcast_episodes.podcast_id', ignore_podcast_ids) \
            .where_raw("podcast_episodes.id in (select distinct podcast_episode_id from podcast_episode_previews where podcast_episode_id = podcast_episodes.id and type like '%%fathom%%')") \
            .where_in('podcast_id', db_category_podcast_ids) \
            .order_by('publication_date', 'desc') \
            .order_by_raw(f"podcast_id in (0,{','.join(str(id) for id in db_related_podcast_ids)}) desc") \
            .order_by('apple_rank', 'desc') \
            .limit(100) \
            .get()

        new_podcast_episodes_ids = list([podcast_episode.podcast.id for podcast_episode in db_new_podcast_episodes])
        available_podcast_episode_ids = []

        for id in db_category_podcast_ids:
            if id not in new_podcast_episodes_ids:
                available_podcast_episode_ids.append(id)

        # Recent Episodes
        db_podcast_episodes = core.data_models.PodcastEpisode


        user_queue_podcast_episodes_clause = JoinClause('user_queue_podcast_episodes') \
            .on('user_queue_podcast_episodes.podcast_episode_id', '=', 'podcast_episodes.id') \
            .where('user_queue_podcast_episodes.user_id', '=', self.id) \

        db_podcast_episodes = db_podcast_episodes.left_join(user_queue_podcast_episodes_clause) \
            .select('podcast_episodes.*', 'user_queue_podcast_episodes.last_position')

        start_date = date.today() - timedelta(days=90)
        end_date = date.today() - timedelta(days=5)

        db_recent_podcast_episodes = db_podcast_episodes.with_('audio_files') \
            .with_('transcript_files') \
            .with_('podcast') \
            .with_('podcast.categories') \
            .with_({'previews': core.data_models.PodcastEpisodePreview.query().where_null('user_id').select('id', 'start', 'end', 'highlight', 'title', 'type', 'score', 'podcast_episode_id')}) \
            .join(JoinClause('podcasts').on('podcasts.id', '=', 'podcast_episodes.podcast_id')) \
            .left_join(JoinClause('user_podcast_episode_views') \
                .on('podcast_episodes.id', '=', 'user_podcast_episode_views.podcast_episode_id') \
                .where('user_podcast_episode_views.user_id', '=', self.id) \
            ) \
            .where_null('user_podcast_episode_views.id') \
            .left_join(JoinClause('user_podcast_episode_likes') \
                .on('podcast_episodes.id', '=', 'user_podcast_episode_likes.podcast_episode_id') \
                .where('user_podcast_episode_likes.user_id', '=', self.id) \
            ) \
            .where_null('user_podcast_episode_likes.id') \
            .where_null('user_queue_podcast_episodes.id') \
            .where_not_in('podcast_episodes.guid', ignore_guids) \
            .where_not_in('podcast_episodes.podcast_id', ignore_podcast_ids) \
            .where_raw("podcast_episodes.id in (select distinct podcast_episode_id from podcast_episode_previews where podcast_episode_id = podcast_episodes.id and type like '%%fathom%%')") \
            .where_in('podcast_id', available_podcast_episode_ids) \
            .where('publication_date', '>', start_date) \
            .where('publication_date', '<', end_date) \
            .order_by_raw(f"podcast_id in ({','.join(str(id) for id in db_related_podcast_ids)}) desc") \
            .order_by('apple_rank', 'desc') \
            .order_by('publication_date', 'desc') \
            .limit(100) \
            .get()


        # Scoring

        user_podcast_category_weights = {}
        for category_id in user_podcast_categories:
            user_podcast_category_weights[category_id] = 1

        for podcast in self.followed_podcasts():
            for category in podcast.categories:
                if category.id in user_podcast_category_weights:
                    user_podcast_category_weights[category.id] += 2
                else:
                    user_podcast_category_weights[category.id] = 2

        db_new_podcast_episode_scores = []
        for db_podcast_episode in db_new_podcast_episodes:
            score = 0.0
            in_count = 0
            for category in db_podcast_episode.podcast.categories:
                if category.id in user_podcast_category_weights:
                    score += user_podcast_category_weights[category.id]
                    in_count += 1
                else:
                    score -= 50

            if score > 0:
                score = score * ((in_count / len(user_podcast_category_weights.keys())) ** 2.0)

            if db_podcast_episode.podcast_id in related_podcasts_scores:
                score += related_podcasts_scores[db_podcast_episode.podcast_id] * 100

            db_new_podcast_episode_scores.append({
                'episode': db_podcast_episode,
                'score': (score * float(db_podcast_episode.podcast.featured_multiplier)) * float(db_podcast_episode.featured_multiplier)
            })

        db_new_podcast_episode_scores.sort(key=lambda x: x['score'], reverse=True)

        db_recent_podcast_episode_scores = []
        for db_podcast_episode in db_recent_podcast_episodes:
            score = 0.0
            in_count = 0
            for category in db_podcast_episode.podcast.categories:
                if category.id in user_podcast_category_weights:
                    score += user_podcast_category_weights[category.id]
                    in_count += 1
                else:
                    score -= 50

            if score > 0:
                score = score * ((in_count / len(user_podcast_category_weights.keys())) ** 2.0)

            if db_podcast_episode.podcast_id in related_podcasts_scores:
                score += related_podcasts_scores[db_podcast_episode.podcast_id] * 100

            db_recent_podcast_episode_scores.append({
                'episode': db_podcast_episode,
                'score': (score * float(db_podcast_episode.podcast.featured_multiplier)) * float(db_podcast_episode.featured_multiplier)
            })

        db_recent_podcast_episode_scores.sort(key=lambda x: x['score'], reverse=True)

        # Get best most recent
        db_podcast_episode_scores = []

        most_recent_date = None
        best_most_recent_scored_episode = None
        for scored_episode in reversed(db_new_podcast_episode_scores):
            if (most_recent_date == None or most_recent_date <= scored_episode['episode'].publication_date) \
                and scored_episode['episode'].publication_date <= date.today():
                most_recent_date = scored_episode['episode'].publication_date
                best_most_recent_scored_episode = scored_episode

        db_podcast_episode_scores.append(best_most_recent_scored_episode)

        # Intermix
        max_len = 0
        if len(db_recent_podcast_episode_scores) > len(db_new_podcast_episode_scores):
            max_len = len(db_recent_podcast_episode_scores)
        else:
            max_len = len(db_new_podcast_episode_scores)

        for index in range(0, max_len):
            if index < (len(db_new_podcast_episode_scores) - 1):
                db_podcast_episode_scores.append(db_new_podcast_episode_scores[index])
                if index < (len(db_new_podcast_episode_scores) - 2):
                    db_podcast_episode_scores.append(db_new_podcast_episode_scores[index+1])
            if index < (len(db_recent_podcast_episode_scores) - 1):
                db_podcast_episode_scores.append(db_recent_podcast_episode_scores[index])

        # Filter
        db_podcast_episodes_ranked = []
        used_podcast_ids = []
        for scored_podcast_episode in db_podcast_episode_scores:
            if scored_podcast_episode['episode'].podcast.id not in used_podcast_ids:
                db_podcast_episodes_ranked.append(scored_podcast_episode['episode'])
                used_podcast_ids.append(scored_podcast_episode['episode'].podcast.id)

        # print('***************************************************************')
        # print('DEFAULT RECCOMENDATIONS')
        # print('***************************************************************')
        # for episode in db_podcast_episodes_ranked:
        #     print(episode.podcast.title)
        #     print(episode.title)
        #     print('---')

        return db_podcast_episodes_ranked

    async def get_trending_episode_recommendations(self):
        uv = await self.get_quick_taste_vector()

        listened_episodes = core.data_models.UserQueuePodcastEpisode \
            .where('user_id', self.id) \
            .lists('podcast_episode_id') \

        trending = core.data_models.UserQueuePodcastEpisode \
            .where('created_at', '>=', datetime.now() - timedelta(days=30)) \
            .where_not_in('podcast_episode_id', list(listened_episodes)) \
            .group_by('podcast_episode_id') \
            .order_by('popularity_score', 'desc') \
            .limit(200) \
            .select_raw('podcast_episode_id, count(*) as popularity_score') \
            .lists('popularity_score', 'podcast_episode_id')

        total_views = 0
        for episode_id, popularity_score in trending.items():
            total_views += popularity_score

        scored_trending_episodes = {}
        for episode_id, popularity_score in trending.items():
            scored_trending_episodes[episode_id] = {
                'popularity_score': popularity_score / total_views,
                'similarity_score': 0,
                'final_score': 0,
                'episode': None
            }

        # get episodes with vectors
        ids = list(scored_trending_episodes.keys())
        episodes = core.data_models.PodcastEpisode \
            .join(JoinClause('podcast_episode_vectors') \
                .on('podcast_episode_vectors.podcast_episode_id', '=', 'podcast_episodes.id')
            ) \
            .with_('vectors') \
            .where_in('podcast_episodes.id', ids) \
            .select('podcast_episodes.id', 'podcast_episodes.title', 'podcast_episodes.podcast_id') \
            .get()

        for episode in episodes:
            scored_trending_episodes[episode.id]['episode'] = episode
            vector = episode.primary_vector()
            if vector is not None:
                scored_trending_episodes[episode.id]['similarity_score'] = vector.cosine_similarity(uv)

        # normalize similarity scores
        total_similarity = 0
        for episode_id, scores in scored_trending_episodes.items():
            total_similarity += scores['similarity_score']

        for episode in episodes:
            scored_trending_episodes[episode.id]['similarity_score'] = scored_trending_episodes[episode.id]['similarity_score'] / total_similarity
            scored_trending_episodes[episode.id]['final_score'] = scored_trending_episodes[episode.id]['popularity_score'] * scored_trending_episodes[episode.id]['similarity_score'] #np.average([scored_trending_episodes[episode.id]['popularity_score'], scored_trending_episodes[episode.id]['similarity_score']], weights=[0.3, 0.7])

        sorted_episodes = sorted(scored_trending_episodes.items(), key=lambda item: item[1]['final_score'], reverse=True)
        trending_recommendations = [episode['episode'] for episode_id, episode in sorted_episodes if episode['episode'] is not None]

        return self.space_out_episodes(trending_recommendations[:50])

    def space_out_episodes(self, episodes):
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



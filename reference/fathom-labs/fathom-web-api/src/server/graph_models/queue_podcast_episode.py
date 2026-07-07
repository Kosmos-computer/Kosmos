import app
import graphene

class QueuePodcastEpisode(graphene.Mutation):
    class Arguments:
        podcast_episode_guid = graphene.String()
        last_position = graphene.Int()

    ok = graphene.Boolean()

    def mutate(root, info, podcast_episode_guid, last_position):
        ok = None
        
        user = app.auth.get_user_from_info(info)
        
        podcast_episode = app.core.data_models.PodcastEpisode.where('guid', podcast_episode_guid).first()
        if podcast_episode is not None:
            existing_queued_podcast_episode = app.core.data_models.UserQueuePodcastEpisode \
                .where('user_id', user.id) \
                .where('podcast_episode_id', podcast_episode.id) \
                .first()
            
            if existing_queued_podcast_episode is not None:
                if existing_queued_podcast_episode.last_position != last_position:
                    existing_queued_podcast_episode.last_position = last_position
                    existing_queued_podcast_episode.save()
                else:
                    existing_queued_podcast_episode.touch()
            else:
                queue_podcast_episode = app.core.data_models.UserQueuePodcastEpisode()
                queue_podcast_episode.user_id = user.id
                queue_podcast_episode.podcast_episode_id = podcast_episode.id
                queue_podcast_episode.last_position = last_position
                queue_podcast_episode.save()
            ok = True
        else:
            ok = False
        
        return QueuePodcastEpisode(ok=ok)

import app
import graphene

class UpdateQueueLastPosition(graphene.Mutation):
    class Arguments:
        podcast_episode_guid = graphene.String()
        last_position = graphene.Int()

    ok = graphene.Boolean()

    def mutate(root, info, podcast_episode_guid, last_position):
        ok = None
        
        user = app.auth.get_user_from_info(info)
        
        podcast_episode = app.core.data_models.PodcastEpisode.where('guid', podcast_episode_guid).first()
        
        if podcast_episode is not None:        
            queued_podcast_episode = app.core.data_models.UserQueuePodcastEpisode \
                .where('user_id', user.id) \
                .where('podcast_episode_id', podcast_episode.id) \
                .order_by('created_at', 'desc') \
                .first()
            
            if queued_podcast_episode is not None:
                queued_podcast_episode.last_position = last_position
                queued_podcast_episode.save()
                ok = True
            else:
                ok = False
        else:
            ok = False
        
        return UpdateQueueLastPosition(ok=ok)

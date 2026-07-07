import app
import graphene

class UnlikePodcastEpisode(graphene.Mutation):
    class Arguments:
        podcast_episode_guid = graphene.String()

    ok = graphene.Boolean()

    def mutate(root, info, podcast_episode_guid):
        ok = None
        
        user = app.auth.get_user_from_info(info)
        
        podcast_episode = app.core.data_models.PodcastEpisode.where('guid', podcast_episode_guid).first()

        if podcast_episode is not None:
            app.core.data_models.UserPodcastEpisodeLike \
            .where('user_id', user.id) \
            .where('podcast_episode_id', podcast_episode.id) \
            .delete()
            
            ok = True

        else:
            ok = False
        
        return UnlikePodcastEpisode(ok=ok)

import app
import graphene

class LikePodcastEpisode(graphene.Mutation):
    class Arguments:
        podcast_episode_guid = graphene.String()

    ok = graphene.Boolean()

    def mutate(root, info, podcast_episode_guid):
        ok = None
        
        user = app.auth.get_user_from_info(info)
        
        podcast_episode = app.core.data_models.PodcastEpisode.where('guid', podcast_episode_guid).first()
        
        if podcast_episode is not None:
            existingLike = app.core.data_models.UserPodcastEpisodeLike \
            .where('podcast_episode_id', podcast_episode.id) \
            .where('user_id', user.id) \
            .first()
            
            if existingLike is None:
                new_like = app.core.data_models.UserPodcastEpisodeLike()
                new_like.user_id = user.id
                new_like.podcast_episode_id = podcast_episode.id
                new_like.save()
            
            ok = True
        else:
            ok = False
        
        return LikePodcastEpisode(ok=ok)

import app
import graphene

class UnfollowPodcast(graphene.Mutation):
    class Arguments:
        podcast_guid = graphene.String()

    ok = graphene.Boolean()

    def mutate(root, info, podcast_guid):
        ok = None
        
        user = app.auth.get_user_from_info(info)
        
        podcast = app.core.data_models.Podcast.where('guid', podcast_guid).first()
        
        if podcast is not None:
            app.core.data_models.UserPodcastFollow \
            .where('user_id', user.id) \
            .where('podcast_id', podcast.id) \
            .delete()
            
            ok = True
        else:
            ok = False
        
        return UnfollowPodcast(ok=ok)

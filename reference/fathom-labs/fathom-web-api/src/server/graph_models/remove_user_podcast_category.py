import app
import graphene

class RemoveUserPodcastCategory(graphene.Mutation):
    class Arguments:
        podcast_category_id = graphene.Int()

    ok = graphene.Boolean()

    def mutate(root, info, podcast_category_id):
        ok = None
        
        user = app.auth.get_user_from_info(info)
        
        existing_user_podcast_category = app.core.data_models.PodcastCategoriesUser \
            .where('user_id', user.id) \
            .where('podcast_category_id', podcast_category_id) \
            .first()
            
        if existing_user_podcast_category is not None:
            existing_user_podcast_category.delete()
            ok = True
        else:
            ok = False
        
        return RemoveUserPodcastCategory(ok=ok)

import app
import graphene

class AutoSetUserPodcastCategories(graphene.Mutation):

    ok = graphene.Boolean()

    def mutate(root, info):
        ok = None
        
        user = app.auth.get_user_from_info(info)

        podcast_category_ids = []

        followed_podcasts_with_categories = app.core.data_models.UserPodcastFollow \
            .where('user_id', user.id) \
            .with_('podcast') \
            .with_('podcast.categories') \
            .get()

        for followed_podcast in followed_podcasts_with_categories:
            for category in followed_podcast.podcast.categories:
                if category.id not in podcast_category_ids:
                    podcast_category_ids.append(category.id)

        for podcast_category_id in podcast_category_ids:
            existing_user_podcast_category = app.core.data_models.PodcastCategoriesUser \
                .where('user_id', user.id) \
                .where('podcast_category_id', podcast_category_id) \
                .first()
            
            if existing_user_podcast_category is None:
                new_user_category = app.core.data_models.PodcastCategoriesUser()
                new_user_category.user_id = user.id
                new_user_category.podcast_category_id = podcast_category_id
                new_user_category.save()

        
        return AutoSetUserPodcastCategories(ok=True)

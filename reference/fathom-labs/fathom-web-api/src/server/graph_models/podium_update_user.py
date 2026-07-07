import app
import graphene
import uuid
from hashlib import sha256
import jwt

from .podium_user import *

class PodiumUpdateUser(graphene.Mutation):
    class Arguments:
        podium_user = PodiumUserInput(required=True)
        category = graphene.String(required=False)
        hearAboutPodium = graphene.String(required=False)

    ok = graphene.Boolean()

    def mutate(root, info, podium_user,category=None,hearAboutPodium=None):
        ok = None      
        user = app.auth.get_podium_user_from_info(info)
        if category is not None and user is not None:
            db_category = app.core.data_models.PodcastCategory.where('title', category).first()
            if not db_category:
                db_category = app.core.data_models.PodcastCategory()
                db_category.title = category
                db_category.save()

            existing_user_podcast_category = app.core.data_models.PodcastCategoriesUser \
                .where('user_id', user.id) \
                .where('podcast_category_id', db_category.id) \
                .first()
            
            if existing_user_podcast_category is None:
                new_user_category = app.core.data_models.PodcastCategoriesUser()
                new_user_category.user_id = user.id
                new_user_category.podcast_category_id = db_category.id
                new_user_category.save()

        if hearAboutPodium is not None and user is not None:
            hearAbout = app.core.data_models.PodiumUserSetting.where('podium_user_id', user.id).where('key', 'hear_about_podium').first()
            if hearAbout is None:
                hearAbout = app.core.data_models.PodiumUserSetting()
                hearAbout.podium_user_id = user.id
                hearAbout.key = 'hear_about_podium'
                hearAbout.value = hearAboutPodium
                hearAbout.save()
            else:
                hearAbout.value = hearAboutPodium
                hearAbout.save()


        

      
        if user is not None:
            # update user
            user.name = podium_user.name
            user.company_name = podium_user.company_name
            user.podcast_count = podium_user.podcast_count
            user.rss_feeds = podium_user.rss_feeds
            user.role = podium_user.role
            user.new_user_info_complete = True
            user.save()

            ok = True
        else:
            ok = False
            
        return PodiumUpdateUser(ok=ok)
import app
import graphene
import requests

from . import *

class Mutations(graphene.ObjectType):
    follow_podcast = FollowPodcast.Field()
    unfollow_podcast = UnfollowPodcast.Field()
    like_podcast_episode = LikePodcastEpisode.Field()
    unlike_podcast_episode = UnlikePodcastEpisode.Field()
    queue_podcast_episode = QueuePodcastEpisode.Field()
    update_queue_last_position = UpdateQueueLastPosition.Field()
    set_user_podcast_category = SetUserPodcastCategory.Field()
    remove_user_podcast_category = RemoveUserPodcastCategory.Field()
    set_user_attribute = SetUserAttribute.Field()
    auto_set_user_podcast_categories = AutoSetUserPodcastCategories.Field()
    upsert_clip = UpsertClip.Field()
    delete_clip = DeleteClip.Field()
    delete_user = DeleteUser.Field()
    create_podium_package = CreatePodiumPackage.Field()
    update_podium_package = UpdatePodiumPackage.Field()
    get_podium_package_signed_url = GetPodiumPackageSignedUrl.Field()
    podium_sign_in = PodiumSignIn.Field()
    podium_create_user = PodiumCreateUser.Field()
    podium_update_user = PodiumUpdateUser.Field()
    podium_expo = PodiumExpo.Field()

import app
import graphene

class PodcastInfo(graphene.ObjectType):
    internal_id = graphene.Int()
    guid = graphene.ID()
    url_slug = graphene.String()
    title = graphene.String()
    description = graphene.String()
    hero_image_url = graphene.String()
    thumbnail_image_url = graphene.String()
    share_image_url = graphene.String()
    colors = graphene.List(graphene.String)
    background_color = graphene.String()
    alt_one_color = graphene.String()
    alt_two_color = graphene.String()
    alt_three_color = graphene.String()
    text_color = graphene.String()
    rss_url = graphene.String()
    name_id = graphene.String()
    author = graphene.String()
    owner_email = graphene.String()
    website_url = graphene.String()
    categories = graphene.List(graphene.String)
    followed = graphene.Boolean()
    followed_at = graphene.DateTime()
    notifications_enabled = graphene.Boolean()
    user_listened_count = graphene.Int()
    user_listened_recently_count = graphene.Int()
    user_new_episodes_count = graphene.Int()

    def resolve_categories(parent, info):
        categories = []
        if not parent.categories:
            db_podcast =  app.core.data_models.Podcast \
                .with_('categories') \
                .where('id', parent.internal_id) \
                .first()

            if db_podcast:
                for category in db_podcast.categories:
                    categories.append(category.title)
        else:
            categories = parent.categories

        return categories

    @staticmethod
    def convert(db_podcast):
        if db_podcast == None :
            return None
        else:
            podcast_info = PodcastInfo()
            podcast_info.internal_id = db_podcast.id
            podcast_info.guid = db_podcast.guid

            if db_podcast.url_slug and db_podcast.url_slug != '':
                podcast_info.url_slug = db_podcast.url_slug
            else:
                podcast_info.url_slug = db_podcast.guid

            podcast_info.title = db_podcast.title
            podcast_info.description = db_podcast.description
            podcast_info.hero_image_url = db_podcast.hero_image_url_cdn()
            podcast_info.thumbnail_image_url = db_podcast.thumbnail_image_url_cdn()
            podcast_info.share_image_url = db_podcast.share_image_url_cdn()

            colors = []
            if db_podcast.colors is not None:
                colors = db_podcast.colors
            podcast_info.colors = colors

            background_color = db_podcast.get_background_color()
            if background_color is not None:
                try:
                    podcast_info.background_color = f"{background_color['rgb_color'][0]},{background_color['rgb_color'][1]},{background_color['rgb_color'][2]}"
                    podcast_info.alt_one_color = f"{background_color['alt_one_rgb_color'][0]},{background_color['alt_one_rgb_color'][1]},{background_color['alt_one_rgb_color'][2]}"
                    podcast_info.alt_two_color = f"{background_color['alt_two_rgb_color'][0]},{background_color['alt_two_rgb_color'][1]},{background_color['alt_two_rgb_color'][2]}"
                    podcast_info.alt_three_color = f"{background_color['alt_three_rgb_color'][0]},{background_color['alt_three_rgb_color'][1]},{background_color['alt_three_rgb_color'][2]}"
                    podcast_info.text_color = f"{background_color['text_rgb_color'][0]},{background_color['text_rgb_color'][1]},{background_color['text_rgb_color'][2]}"
                except:
                    podcast_info.background_color = "0,0,0"
                    podcast_info.alt_one_color = "0,0,0"
                    podcast_info.alt_two_color = "0,0,0"
                    podcast_info.alt_three_color = "0,0,0"
                    podcast_info.text_color = "255,255,255"

            podcast_info.rss_url = db_podcast.rss_url
            podcast_info.name_id = db_podcast.name_id
            podcast_info.author = db_podcast.author
            podcast_info.owner_email = db_podcast.owner_email
            podcast_info.website_url = db_podcast.website_url

            podcast_info.categories = []

            if 'categories' in db_podcast._relations:
                for category in db_podcast.categories:
                    podcast_info.categories.append(category.title)

            if 'user_follows' in db_podcast._relations and len(db_podcast.user_follows) > 0:
                podcast_info.followed = True
                podcast_info.followed_at = db_podcast.user_follows[0].created_at
                podcast_info.notifications_enabled = db_podcast.user_follows[0].notifications_enabled
            
            podcast_info.user_listened_count = db_podcast.user_listened_count
            podcast_info.user_listened_recently_count = db_podcast.user_listened_recently_count
            podcast_info.user_new_episodes_count = db_podcast.user_new_episodes_count
            
            return podcast_info

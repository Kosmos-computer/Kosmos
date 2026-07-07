import app
import graphene
 
from .podcast_category import PodcastCategory
from .attribute import Attribute

class UserInfo(graphene.ObjectType):

    #liked_podcast_episode_guids = graphene.List(graphene.String)
    #followed_podcast_guids = graphene.List(graphene.String)
    
    podcast_categories = graphene.List(PodcastCategory)
    attributes = graphene.List(Attribute)

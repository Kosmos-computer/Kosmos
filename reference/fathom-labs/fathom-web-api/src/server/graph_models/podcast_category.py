import graphene

from .podcast import Podcast

class PodcastCategory(graphene.ObjectType):
    
    internal_id = graphene.Int()
    title = graphene.String()
    primary = graphene.Boolean()
    podcasts = graphene.List(Podcast)
    
    @staticmethod
    def convert(db_category):
        if db_category == None :
            return None
        else:
            category = PodcastCategory()
            category.internal_id = db_category.id
            category.title = db_category.title
            category.primary = db_category.primary
            
            return category

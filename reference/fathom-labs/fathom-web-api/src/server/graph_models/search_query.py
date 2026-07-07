import app
import graphene

class SearchQuery(graphene.InputObjectType):
    query = graphene.String()
    podcast_guid = graphene.String()

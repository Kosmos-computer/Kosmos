import graphene

class PodcastEpisodeChapter(graphene.ObjectType):

    start = graphene.Float()
    end = graphene.Float()
    ai_generated = graphene.Boolean()
    description = graphene.String()

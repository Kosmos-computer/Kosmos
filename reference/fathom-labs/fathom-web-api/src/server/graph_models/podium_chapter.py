import graphene

class PodiumChapter(graphene.ObjectType):

    start = graphene.Float()
    end = graphene.Float()
    description = graphene.String()
    summary = graphene.String()


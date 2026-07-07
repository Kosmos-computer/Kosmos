import graphene

class PodiumMonologue(graphene.ObjectType):

    start = graphene.Float()
    speaker = graphene.Int()
    content = graphene.String()

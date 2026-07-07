import graphene

class PodiumParagraph(graphene.ObjectType):

    start = graphene.Float()
    end = graphene.Float()
    content = graphene.String()

import graphene
from .transcript import Transcript

class HighlightType(graphene.Enum):
    PREVIEW = 1
    SEARCH_ANSWER = 2
    SEARCH_RESULT = 3

class Highlight(graphene.ObjectType):

    start = graphene.Float()
    end = graphene.Float()
    snippet = graphene.String()
    context = graphene.String()
    type = graphene.Field(HighlightType)
    score = graphene.Float()
    origin = graphene.String()
    url_slug = graphene.String()
    guid = graphene.ID()
    title = graphene.String()
    transcript = graphene.Field(Transcript)

import app
import graphene

from .attribute import Attribute

class SystemInfo(graphene.ObjectType):
    attributes = graphene.List(Attribute)
import graphene

class Attribute(graphene.ObjectType):
    key = graphene.String()
    value = graphene.String()

    @staticmethod
    def convert(db_attribute):
        if db_attribute == None :
            return None
        else:
            attribute = Attribute()
            attribute.key = db_attribute.key
            attribute.value = db_attribute.value
            return attribute
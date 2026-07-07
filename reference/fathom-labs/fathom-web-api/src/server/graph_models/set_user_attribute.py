import app
import graphene

class SetUserAttribute(graphene.Mutation):
    class Arguments:
        key = graphene.String()
        value = graphene.String()

    ok = graphene.Boolean()

    def mutate(root, info, key, value):
        ok = None
        
        user = app.auth.get_user_from_info(info)
        
        existing_attribute = app.core.data_models.UserAttribute \
            .where('user_id', user.id) \
            .where('key', key) \
            .first()
        
        if existing_attribute is not None:
            existing_attribute.value = value
            existing_attribute.save()
            ok = True
        else:
            attribute = app.core.data_models.UserAttribute()
            attribute.user_id = user.id
            attribute.key = key
            attribute.value = value
            attribute.save()
            ok = True
        
        return SetUserAttribute(ok=ok)

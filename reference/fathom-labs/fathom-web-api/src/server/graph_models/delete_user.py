import app
import graphene

class DeleteUser(graphene.Mutation):
    #class Arguments:
    #    clip_guid = graphene.String()

    ok = graphene.Boolean()

    def mutate(root, info):
        ok = None
        
        user = app.auth.get_user_from_info(info)
        
        if user is not None:
            user.is_deleted = True
            user.save()
            ok = True
        else:
            ok = False
        
        return DeleteUser(ok=ok)
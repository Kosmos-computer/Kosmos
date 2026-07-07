import app
import graphene

class DeleteClip(graphene.Mutation):
    class Arguments:
        clip_guid = graphene.String()

    ok = graphene.Boolean()

    def mutate(root, info, clip_guid):
        ok = None
        
        user = app.auth.get_user_from_info(info)
        
        
        existing_clip = app.core.data_models.PodcastEpisodePreview \
            .where('user_id', user.id) \
            .where('guid', clip_guid) \
            .first()
        
        if existing_clip is not None:
            #TODO This needs to be a logical delete?
            #existing_clip.delete()
            ok = True
        else:
            ok = False
        
        return DeleteClip(ok=ok)
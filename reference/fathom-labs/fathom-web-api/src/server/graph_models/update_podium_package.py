import app
import graphene
import boto3
import uuid
from .clip import Clip

class UpdatePodiumPackage(graphene.Mutation):
    class Arguments:
        podium_package_guid = graphene.String()
        user_email = graphene.String(required=False)
        audio_stored = graphene.Boolean(required=False)

    ok = graphene.Boolean()

    def mutate(root, info, podium_package_guid, user_email=None, audio_stored=None):   
        ok = None
        user = app.auth.get_podium_user_from_info(info)

        podium_package = app.core.data_models.PodiumPackage \
            .where('guid', podium_package_guid) \
            .where('user_id', user.id) \
            .first()

        if podium_package is not None:
            if user_email is not None:
                podium_package.user_email = user_email
            podium_package.save()

            if audio_stored is not None:
                if audio_stored:
                    podium_package.set_process_attribute('audio_stored', 'true')
                    unsubscribe_email_confirmation = app.core.data_models.PodiumUserSetting.get(podium_package.user_id, 'unsubscribe_confirmation_emails')
                    if unsubscribe_email_confirmation != 'true':
                        podium_package.send_user_email("d-d4a9434c8cc4426ea37e8ff377ca62f6")
                else:
                    podium_package.set_process_attribute('audio_stored', 'false')

            ok = True
        else:
            ok = False

        return UpdatePodiumPackage(ok=ok)

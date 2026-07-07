import app
import graphene
import boto3
from botocore.config import Config
import uuid
import json
from .clip import Clip

class CreatePodiumPackage(graphene.Mutation):
    class Arguments:
        user_email = graphene.String()
        original_filename = graphene.String()
        project_id = graphene.String()
        language_code = graphene.String()  
        content_type = graphene.String()     

    podium_package_guid = graphene.String()
    url = graphene.String()
    key = graphene.String()
    AWSAccessKeyId = graphene.String()
    policy = graphene.String()
    signature = graphene.String()


    def mutate(root, info, user_email, original_filename,language_code=None, project_id=None,content_type=None):      
        user = app.auth.get_podium_user_from_info(info)

        podium_package = app.core.data_models.PodiumPackage()

        podium_project = None
        if project_id is not None:
            podium_project = app.core.data_models.PodiumProject.where('guid', project_id).first()
        
        if user is not None:
            podium_package.user_id = user.id
            podium_package.user_email = user.email
            if podium_project is not None:
                podium_package.podium_project_id = podium_project.id
        else:
            podium_package.user_email = user_email
            if podium_project is not None:
                podium_package.podium_project_id = podium_project.id
            
            # find visiting user
            visiting_user = app.core.data_models.PodiumUser \
                .where('email', user_email.lower()) \
                .where('is_visitor', True) \
                .first()
            
            if visiting_user is None:
                # create visiting user
                visiting_user = app.core.data_models.PodiumUser()
                visiting_user.email = user_email
                visiting_user.is_visitor = True
                visiting_user.save()
                visiting_user = visiting_user.fresh()
                visiting_user.grant_credits(180, 'Free Trial Credits')
            
            podium_package.user_id = visiting_user.id

        podium_package.original_filename = original_filename
        #check if language_code exist
        if language_code is not None:
            podium_package.language_code = language_code
        if content_type:
            formatted_content_type = content_type.lower().replace(" ", "_")
            podium_package.content_type = formatted_content_type #json.dumps({'content_type': formatted_content_type})
        #podium_package.user_id = user.id
        podium_package.save()

        #reload the podium_package to get the guid
        podium_package = app.core.data_models.PodiumPackage \
            .query().select('id', 'guid') \
            .where('id', podium_package.id) \
            .first()
            #.where('user_id', user.id) \

        #add meta data to the package

        podium_package.initialize_process_attributes()
        
        
        db_podium_package_audio_file = app.core.data_models.PodiumPackageAudioFile()
        db_podium_package_audio_file.podium_package_id = podium_package.id
        db_podium_package_audio_file.guid = str(uuid.uuid4())
        
        media_format = app.core.data_models.PodiumPackageAudioFile.determine_media_format_from_filename(original_filename)
        db_podium_package_audio_file.format = media_format

        db_podium_package_audio_file.s3_bucket = 'podium-production'
        db_podium_package_audio_file.s3_key = f"audio/{db_podium_package_audio_file.guid}.{media_format}"
        db_podium_package_audio_file.save()

        #use boto3 to generate a signed post for the podium package
        s3 = boto3.client('s3', aws_access_key_id=app.core.env['aws_access_key'], aws_secret_access_key=app.core.env['aws_access_secret'], config=Config(s3={"use_accelerate_endpoint": True}))
        response = s3.generate_presigned_post(db_podium_package_audio_file.s3_bucket, db_podium_package_audio_file.s3_key)

        return CreatePodiumPackage(podium_package_guid=podium_package.guid, url = response['url'], key=response['fields']['key'], AWSAccessKeyId=response['fields']['AWSAccessKeyId'], policy=response['fields']['policy'], signature=response['fields']['signature'])

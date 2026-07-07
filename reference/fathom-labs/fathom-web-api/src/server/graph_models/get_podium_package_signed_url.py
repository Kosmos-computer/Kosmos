import app
import graphene
import boto3
import uuid
from .clip import Clip

class GetPodiumPackageSignedUrl(graphene.Mutation):
    class Arguments:
        podium_package_guid = graphene.String()

    podium_package_guid = graphene.String()
    url = graphene.String()
    key = graphene.String()
    AWSAccessKeyId = graphene.String()
    policy = graphene.String()
    signature = graphene.String()


    def mutate(root, info, podium_package_guid):      
        #user = app.auth.get_user_from_info(info)

        podium_package = app.core.data_models.PodiumPackage \
            .query().select('id', 'guid') \
            .where('guid', podium_package_guid) \
            .first()
            #.where('user_id', user.id) \

        podium_package_audio_file = app.core.data_models.PodiumPackageAudioFile \
            .query().select('id', 'guid', 's3_bucket', 's3_key') \
            .where('podium_package_id', podium_package.id) \
            .first()

        #use boto3 to generate a signed post for the podium package
        s3 = boto3.client('s3', aws_access_key_id=app.core.env['aws_access_key'], aws_secret_access_key=app.core.env['aws_access_secret'])
        response = s3.generate_presigned_post(podium_package_audio_file.s3_bucket, podium_package_audio_file.s3_key)

        # print out the response to the console
        print(response)

        return GetPodiumPackageSignedUrl(podium_package_guid=podium_package.guid, url = response['url'], key=response['fields']['key'], AWSAccessKeyId=response['fields']['AWSAccessKeyId'], policy=response['fields']['policy'], signature=response['fields']['signature'])

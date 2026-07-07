import app
import graphene
import boto3
import uuid
from hashlib import sha256
import jwt
import requests

from .podium_user import *

class PodiumSignIn(graphene.Mutation):
    class Arguments:
        podium_user = PodiumUserInput(required=True)

    podium_user = graphene.Field(PodiumUser)

    def mutate(root, info, podium_user):
        signed_in_podium_user = None      
        
        if (podium_user.social_provider is None and podium_user.social_access_token is None):       
            # lookup user
            db_user = app.core.data_models.PodiumUser.where('email', podium_user.email.lower()) \
                .where('is_deleted', '<>', True) \
                .where('is_visitor', False) \
                .first()
        
            if db_user is not None:
                # verify password
                if sha256((podium_user.password + db_user.salt).encode('utf-8')).hexdigest() == db_user.password_hash:
                    signed_in_podium_user = PodiumUser.convert(db_user)
      
        elif podium_user.social_provider is not None and podium_user.social_access_token is not None:
            # social auth login
            valid_providers = {
                'google': 'https://www.googleapis.com/oauth2/v3/userinfo',
            }
            
            formatted_social_user_info = {}
            
            if podium_user.social_provider in valid_providers and podium_user.social_access_token is not None:
                # get social user info
                formatted_token = podium_user.social_access_token
                response = requests.get(valid_providers[podium_user.social_provider], params={ 'access_token': formatted_token })
                social_user_info = response.json()
                
                # format social user info
                if podium_user.social_provider == 'google':
                    formatted_social_user_info = {
                        'name': social_user_info['name'],
                        'email': social_user_info['email'],
                        'social_id': social_user_info['sub'],
                        'profile_image_url': social_user_info['picture'],
                    }
                    
                # find existing user
                existing_db_user = app.core.data_models.PodiumUser.where(podium_user.social_provider + '_id', formatted_social_user_info['social_id'])
                if formatted_social_user_info['email'] is not None and formatted_social_user_info['email'] != "":
                    existing_db_user = existing_db_user.or_where('email', formatted_social_user_info['email'].lower())
                db_user = existing_db_user.first()

                if db_user is None and podium_user.alternate_email is not None and podium_user.alternate_email != "":
                    db_user = app.core.data_models.PodiumUser \
                        .where('email', podium_user.alternate_email.lower()) \
                        .where('is_visitor', True) \
                        .first()
                            
                # create new user account 
                if db_user is None:                  
                    # create new user
                    new_db_user = app.core.data_models.PodiumUser()
                    new_db_user.email = formatted_social_user_info['email'].lower()
                    if podium_user.alternate_email is not None and podium_user.alternate_email != "":
                        new_db_user.alternate_email = podium_user.alternate_email.lower()
                    if podium_user.social_provider == 'google':
                        new_db_user.google_id = formatted_social_user_info['social_id']
                    new_db_user.profile_image_url = formatted_social_user_info['profile_image_url']
                    new_db_user.save()

                    new_db_user = new_db_user.fresh()

                    new_db_user.grant_credits(180, 'Free Trial Credits')
                    
                    signed_in_podium_user = PodiumUser.convert(new_db_user)
                else:
                    # update user profile image if none
                    db_user.is_visitor = False
                    if not db_user.manually_updated:      
                        db_user.email = formatted_social_user_info['email'].lower()
                    if podium_user.alternate_email is not None and podium_user.alternate_email != "" \
                        and (db_user.alternate_email is None or db_user.alternate_email == ""):
                        db_user.alternate_email = podium_user.alternate_email.lower()
                    if podium_user.social_provider == 'google' and (db_user.google_id is None or db_user.google_id == ''):
                        db_user.google_id = formatted_social_user_info['social_id']
                    db_user.profile_image_url = formatted_social_user_info['profile_image_url']

                    db_user.save()

                    signed_in_podium_user = PodiumUser.convert(db_user)

        return PodiumSignIn(podium_user=signed_in_podium_user)
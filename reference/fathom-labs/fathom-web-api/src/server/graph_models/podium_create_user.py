import app
import graphene
import uuid
from hashlib import sha256
import jwt

from .podium_user import *

class PodiumCreateUser(graphene.Mutation):
    class Arguments:
        podium_user = PodiumUserInput(required=True)

    ok = graphene.Boolean()

    def mutate(root, info, podium_user):
        ok = None
        
        existing_user = app.core.data_models.PodiumUser \
            .where('email', podium_user.email.lower()) \
            .or_where('alternate_email', podium_user.email.lower())
        if podium_user.alternate_email is not None and podium_user.alternate_email != "":
            existing_user = existing_user \
                .or_where('alternate_email', podium_user.alternate_email.lower()) \
                .or_where('email', podium_user.alternate_email.lower())
        
        
        existing_user = existing_user.first()

        if existing_user is not None:
            if existing_user.is_visitor == False:
                
                # user already exists
                ok = False
            else:
                existing_user.email = podium_user.email.lower()
                if podium_user.alternate_email is not None and podium_user.alternate_email != "":
                    existing_user.alternate_email = podium_user.alternate_email.lower()
                existing_user.salt = str(uuid.uuid4())
                existing_user.password_hash = sha256((podium_user.password + existing_user.salt).encode('utf-8')).hexdigest()
                existing_user.is_visitor = False
                existing_user.save()
              
                ok = True
        else:
            # create new user
            new_db_user = app.core.data_models.PodiumUser()
            new_db_user.email = podium_user.email.lower()
            if podium_user.alternate_email is not None and podium_user.alternate_email != "":
                new_db_user.alternate_email = podium_user.alternate_email.lower()
            new_db_user.salt = str(uuid.uuid4())
            new_db_user.password_hash = sha256((podium_user.password + new_db_user.salt).encode('utf-8')).hexdigest()
            new_db_user.save()
            
            new_db_user = new_db_user.fresh()
            new_db_user.grant_credits(180, 'Free Trial Credits')

            ok = True
            
        return PodiumCreateUser(ok=ok)
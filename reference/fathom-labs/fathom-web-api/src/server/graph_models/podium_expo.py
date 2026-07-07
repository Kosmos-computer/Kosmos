import app
import graphene
import boto3
import uuid

class PodiumExpo(graphene.Mutation):
    class Arguments:
        email = graphene.String(required=True)

    ok = graphene.Boolean()

    def mutate(root, info, email=None):   
        ok = True
   
        user = app.core.data_models.PodiumUser \
            .where('email', email) \
            .first()

        if user is not None:
            # determine if user has already been granted credits
            existing_transaction = app.core.data_models.PodiumTransaction \
                .where('user_id', user.id) \
                .where('reason', 'Podcast Movement Denver Bonus') \
                .first()
            if existing_transaction is None:
                user.grant_credits(60, 'Podcast Movement 2023 Bonus')
                user.send_email('d-59ec4d7be66a4973bfef5433ce04fe23')

            else:
                ok = False
        else:
            # create visiting user
            visiting_user = app.core.data_models.PodiumUser()
            visiting_user.email = email
            visiting_user.is_visitor = True
            visiting_user.save()
            visiting_user = visiting_user.fresh()
            visiting_user.grant_credits(180, 'Free Trial Credits')
            visiting_user.grant_credits(60, 'Podcast Movement 2023 Bonus')
            visiting_user.send_email('d-59ec4d7be66a4973bfef5433ce04fe23')

        return PodiumExpo(ok=ok)

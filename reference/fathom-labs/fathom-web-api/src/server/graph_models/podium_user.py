import app
import graphene
from hashlib import sha256
import jwt
import datetime
from orator.query.join_clause import JoinClause

class PodiumUserBase():

    guid = graphene.String()
    email = graphene.String()
    password = graphene.String()
    social_provider = graphene.String()
    social_access_token = graphene.String()

    name = graphene.String()
    profileImageUrl = graphene.String()
    alternate_email = graphene.String()
    company_name = graphene.String()
    podcast_count = graphene.String()
    rss_feeds = graphene.String()
    role = graphene.String()

    podium_token = graphene.String()
    new_user_info_complete = graphene.Boolean()
    is_visitor = graphene.Boolean()

    current_subscription_title = graphene.String()
    current_subscription_credits_balance = graphene.Float()
    additional_credits_balance = graphene.Float()
    additional_credits_stripe_price_id = graphene.String()

    @staticmethod
    def convert(db_user):
        podium_user = PodiumUser()
        podium_user.guid = db_user.guid
        podium_user.email = db_user.email
        podium_user.name = db_user.name
        podium_user.profileImageUrl = db_user.profile_image_url
        podium_user.company_name = db_user.company_name
        podium_user.podcast_count = db_user.podcast_count
        podium_user.rss_feeds = db_user.rss_feeds
        podium_user.role = db_user.role
        podium_user.new_user_info_complete = db_user.new_user_info_complete
        podium_user.is_visitor = db_user.is_visitor
        
        encoded_token = jwt.encode({ "podium_user_guid": db_user.guid }, app.env['fathom_jwt_secret'], algorithm="HS256")
        podium_user.podium_token = encoded_token
        
        subscription = db_user.get_current_subscription_purchase()
        
        if subscription is not None:
            podium_user.current_subscription_title = subscription.podium_product.title
            podium_user.current_subscription_credits_balance = db_user.get_current_subscription_credits_balance()
        else:
            podium_user.current_subscription_title = None
            podium_user.current_subscription_credits_balance = 0

        podium_user.additional_credits_balance = db_user.get_additional_credits_balance()
        podium_user.additional_credits_stripe_price_id = db_user.get_additional_credits_product().stripe_price_id

        return podium_user 

class PodiumUser(PodiumUserBase, graphene.ObjectType):
    pass

class PodiumUserInput(PodiumUserBase, graphene.InputObjectType):
    pass
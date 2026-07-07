import app
from modules import *
import time
import datetime
import requests
from random import randrange
import random
import uuid
from hashlib import sha256
import jwt
import sentry_sdk
import stripe

from pydantic import BaseModel
from typing import Optional, List
from fastapi import APIRouter, Header, HTTPException, Request
router = APIRouter()

USERNAME_APPENDS = ['awesome', 'radical', 'supreme', 'amazing', 'fun', 'super', 'cool', 'fantastic', 'groovy']

class UserInfo(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    provider: Optional[str] = None
    access_token: Optional[str] = None

@router.post('/api/auth/login', include_in_schema=False)
async def auth_login(user_info: UserInfo):
    user = None

    if (user_info.provider is None and user_info.access_token is None):
        # manual login

        if (user_info.name and user_info.name != '' and user_info.username and user_info.username != ''):
            # create new user account

            # ensure no duplicate email
            existing_user_email = app.core.data_models.User.where('email', user_info.email).where('is_deleted', '<>', True).first()
            if existing_user_email is not None:
                raise HTTPException(status_code=400, detail="User Email Taken")

            # ensure unique user
            existing_user_username = app.core.data_models.User.where('username', user_info.username).where('is_deleted', '<>', True).first()
            if existing_user_username is not None:
                for username_append in USERNAME_APPENDS:
                    try_username = user_info.username + '-' + username_append
                    existing_user_username = app.core.data_models.User.where('username', try_username).where('is_deleted', '<>', True).first()
                    if existing_user_username is None:
                        user_info.username = try_username
                        break
            existing_user_username = app.core.data_models.User.where('username', user_info.username).where('is_deleted', '<>', True).first()
            if existing_user_username is not None:
                # TODO: Generate random number
                raise HTTPException(status_code=400, detail="Username Taken")

            # create new user
            new_user = app.core.data_models.User()
            new_user.name = user_info.name
            new_user.username = user_info.username
            new_user.email = user_info.email
            new_user.salt = str(uuid.uuid4())
            new_user.password_hash = sha256((user_info.password + new_user.salt).encode('utf-8')).hexdigest()
            new_user.save()

        # lookup user
        user = app.core.data_models.User.where('email', user_info.email).where('is_deleted', '<>', True).first()

        if user is not None:
            # verify password
            if sha256((user_info.password + user.salt).encode('utf-8')).hexdigest() == user.password_hash:
                pass
            else:
                user = None

    elif user_info.provider is not None and user_info.access_token is not None:
        # social auth login
        valid_providers = {
            'google': 'https://www.googleapis.com/oauth2/v3/userinfo',
            'apple': ''
        }

        formatted_social_user_info = {}

        if user_info.provider in valid_providers and user_info.access_token is not None:
            if user_info.provider != 'apple':
                # get social user info
                formatted_token = user_info.access_token[7:]
                response = requests.get(valid_providers[user_info.provider], params={ 'access_token': formatted_token })
                social_user_info = response.json()

                # format social user info
                if user_info.provider == 'google':
                    formatted_social_user_info = {
                        'name': social_user_info['name'],
                        'username': social_user_info['name'].lower().replace(" ", "-"),
                        'email': social_user_info['email'],
                        'social_id': social_user_info['sub'],
                        'profile_image_url': social_user_info['picture'],
                    }
            else:

                try:
                    apple_user = app.apple.AppleResolver.authenticate(user_info.access_token)
                except Exception as e:
                    sentry_sdk.capture_exception(e)
                    raise HTTPException(status_code=404, detail="Invalid User")

                # ensure no account hijacking
                if apple_user['email'] is not None \
                    and apple_user['email'] != "" \
                    and user_info.email is not None \
                    and user_info.email != "" \
                    and user_info.email != apple_user['email']:

                    raise HTTPException(status_code=404, detail="Invalid User")

                if user_info.email is None or user_info.email == "":
                    if apple_user['email'] is not None and apple_user['email'] != "":
                        user_info.email = apple_user['email']

                if user_info.name is None or user_info.name == "":
                    if user_info.email is not None and user_info.email != "":
                        user_info.name = user_info.email.split('@')[0]
                    else:
                        user_info.name = str(random.randint(10000000,99999999))

                formatted_social_user_info = {
                    'name': user_info.name,
                    'username': user_info.name.lower().replace(" ", "-"),
                    'email': user_info.email,
                    'social_id': apple_user['id'],
                    'profile_image_url': '',
                }

            # find existing user
            existing_user = app.core.data_models.User.where(user_info.provider + '_id', formatted_social_user_info['social_id']).where('is_deleted', '<>', True)
            if formatted_social_user_info['email'] is not None and formatted_social_user_info['email'] != "":
                existing_user = existing_user.or_where('email', formatted_social_user_info['email'])
            user = existing_user.first()

            # create new user account
            if user is None:

                # ensure username is available
                existing_user_username = app.core.data_models.User.where('username', formatted_social_user_info['username']).where('is_deleted', '<>', True).first()
                if existing_user_username is not None:
                    for username_append in USERNAME_APPENDS:
                        try_username = formatted_social_user_info['username'] + '-' + username_append
                        existing_user_username = app.core.data_models.User.where('username', try_username).where('is_deleted', '<>', True).first()
                        if existing_user_username is None:
                            formatted_social_user_info['username'] = try_username
                            break
                existing_user_username = app.core.data_models.User.where('username', formatted_social_user_info['username']).where('is_deleted', '<>', True).first()
                if existing_user_username is not None:
                    formatted_social_user_info['username'] = formatted_social_user_info['username'] + '-' + str(random.randint(10000, 99999))

                # create new user
                new_user = app.core.data_models.User()
                new_user.name = formatted_social_user_info['name']
                new_user.username = formatted_social_user_info['username']
                new_user.email = formatted_social_user_info['email']
                if user_info.provider == 'google':
                    new_user.google_id = formatted_social_user_info['social_id']
                if user_info.provider == 'apple':
                    new_user.apple_id = formatted_social_user_info['social_id']
                new_user.profile_image_url = formatted_social_user_info['profile_image_url']
                new_user.save()

                # retrieve newly created user
                user = app.core.data_models.User.where('id', new_user.id).where('is_deleted', '<>', True).first()

            else:
                # update user profile image if none
                if user.profile_image_url is None or user.profile_image_url == '':
                    user.profile_image_url = formatted_social_user_info['profile_image_url']
                    user.save()

                # update user provider id if none
                if user_info.provider == 'apple' and (user.apple_id is None or user.apple_id == ''):
                    user.apple_id = formatted_social_user_info['social_id']
                    user.save()

                # update user provider id if none
                if user_info.provider == 'google' and (user.google_id is None or user.google_id == ''):
                    user.google_id = formatted_social_user_info['social_id']
                    user.save()

    if user is None:
        raise HTTPException(status_code=404, detail="Invalid User")

    # generate JWT token
    encoded_token = jwt.encode({ "user_guid": user.guid }, app.env['fathom_jwt_secret'], algorithm="HS256")

    response = {
        'token': encoded_token
    }

    return response

@router.post('/api/auth/logout', include_in_schema=False)
async def auth_logout():
    pass

@router.get('/api/auth/user', include_in_schema=False)
async def auth_user(authorization: Optional[str] = Header(None)):
    user = app.auth.get_user_from_authorization(authorization)

    if user is None:
        raise HTTPException(status_code=404, detail="Invalid Token")

    response = {
        'user': {
            'name': user.name,
            'username': user.username,
            'email': user.email,
            'profile_image_url': user.profile_image_url,
            'tracking_guid': user.tracking_guid
        }
    }

    return response

@router.get('/api/sitemap/podcasts', include_in_schema=False)
async def sitemap_podcasts(authorization: Optional[str] = Header(None)):
    podcast_url_slugs = app.core.data_models.Podcast.where_not_null('url_slug').lists('url_slug').all()

    response = {
        'podcasts': podcast_url_slugs
    }

    return response

@router.post('/api/stripe_webhook', include_in_schema=False)
async def webhook_received(request: Request, stripe_signature: str = Header(str)):
    webhook_secret = app.env['stripe_webhook_secret']
    data = await request.body()
    try:
        event = stripe.Webhook.construct_event(data, stripe_signature, webhook_secret)
        event_data = event['data']
    except Exception as e:
        return {"error": str(e)}
    event_type = event['type']
    
    print(event)
    if event_type == 'checkout.session.completed':
        # get line items
        line_items = stripe.checkout.Session.list_line_items(event_data['object']['id'], limit=100)
        if len(line_items['data']) > 0:

            # create a podium purchase
            db_podium_purchase = app.core.data_models.PodiumPurchase \
                .where('stripe_checkout_session_id', event_data['object']['id']) \
                .first()

            db_podium_purchase.podium_user.stripe_customer_id = event_data['object']['customer']
            db_podium_purchase.podium_user.save()

            db_podium_purchase.stripe_payment_id = event_data['object']['payment_intent']
            db_podium_purchase.stripe_invoice_id = event_data['object']['invoice']
            db_podium_purchase.stripe_subscription_id = event_data['object']['subscription']
            db_podium_purchase.stripe_customer_id = event_data['object']['customer']
            db_podium_purchase.quantity = line_items['data'][0]['quantity']
            db_podium_purchase.completed = True
            db_podium_purchase.paid = True
            db_podium_purchase.save()

            # create a podium transaction
            if db_podium_purchase.podium_product.type == 'payment':
                db_podium_transaction = app.core.data_models.PodiumTransaction()
                db_podium_transaction.podium_purchase_id = db_podium_purchase.id
                db_podium_transaction.user_id = db_podium_purchase.podium_user_id
                db_podium_transaction.credits = db_podium_purchase.quantity * db_podium_purchase.podium_product.credits
                db_podium_transaction.reason = 'credits purchase'
                db_podium_transaction.save()
            elif db_podium_purchase.podium_product.type == 'subscription':
                stripe_subscription = stripe.Subscription.retrieve(db_podium_purchase.stripe_subscription_id)
                db_podium_purchase.start_date = datetime.datetime.fromtimestamp(stripe_subscription['current_period_start'])
                db_podium_purchase.end_date = datetime.datetime.fromtimestamp(stripe_subscription['current_period_end'])
                db_podium_purchase.save()

    elif event_type == 'invoice.paid':
        # TODO: Can we move this into the checkout.session.completed event now that we're retrieving the line items?
        # update the podium purchase if one exists

        # update the podium modified purchase
        if 'modification_purchase_id' in event_data['object']['subscription_details']['metadata']:
            db_podium_purchase = app.core.data_models.PodiumPurchase \
                .where('guid', event_data['object']['subscription_details']['metadata']['modification_purchase_id']) \
                .where_null('paid') \
                .first()
            
            if db_podium_purchase is not None:
                # update the podium purchase
                db_podium_purchase.stripe_invoice_id = event_data['object']['id']
                db_podium_purchase.paid = True
                db_podium_purchase.save()

        db_podium_purchase = app.core.data_models.PodiumPurchase \
            .where('stripe_invoice_id', event_data['object']['id']) \
            .first()

        if db_podium_purchase is not None:
            return
            # We're now handling the setting of start and end dates in checkout.session.completed
            # # update the podium purchase
            # db_podium_purchase.paid = True
            # db_podium_purchase.stripe_payment_id = event_data['object']['payment_intent']
            # db_podium_purchase.save()

            # # set the subscription start and end dates
            # if db_podium_purchase.podium_product.type == 'subscription':
            #     db_podium_purchase.start_date = datetime.datetime.fromtimestamp(event_data['object']['lines']['data'][0]['period']['start'])
            #     db_podium_purchase.end_date = datetime.datetime.fromtimestamp(event_data['object']['lines']['data'][0]['period']['end'])
            #     db_podium_purchase.save()
        else:
            # handle subscription renewal
            if event_data['object']['subscription'] is not None:
                # find the previous subscription purchase
                db_previous_podium_purchase = app.core.data_models.PodiumPurchase \
                    .where('stripe_subscription_id', event_data['object']['subscription']) \
                    .order_by('end_date', 'desc') \
                    .first()
                
                if db_previous_podium_purchase is not None:
                    # create a new purchase
                    db_podium_purchase = app.core.data_models.PodiumPurchase()
                    db_podium_purchase.podium_user_id = db_previous_podium_purchase.podium_user_id
                    db_podium_purchase.podium_product_id = db_previous_podium_purchase.podium_product_id
                    db_podium_purchase.stripe_payment_id = event_data['object']['payment_intent']
                    db_podium_purchase.stripe_invoice_id = event_data['object']['id']
                    db_podium_purchase.stripe_subscription_id = event_data['object']['subscription']
                    db_podium_purchase.stripe_customer_id = event_data['object']['customer']
                    db_podium_purchase.quantity = db_previous_podium_purchase.quantity
                    db_podium_purchase.completed = True
                    db_podium_purchase.paid = True
                    db_podium_purchase.start_date = datetime.datetime.fromtimestamp(event_data['object']['lines']['data'][0]['period']['start'])
                    db_podium_purchase.end_date = datetime.datetime.fromtimestamp(event_data['object']['lines']['data'][0]['period']['end'])
                    db_podium_purchase.save()
    elif event_type == 'customer.subscription.updated':
        # Update the podium modified purchase
        # we need to hadle this here for modifications that do not result in a new invoice
        if 'modification_purchase_id' in event_data['object']['metadata']:
            db_podium_purchase = app.core.data_models.PodiumPurchase \
                .where('guid', event_data['object']['metadata']['modification_purchase_id']) \
                .where_null('completed') \
                .first()
            
            if db_podium_purchase is not None:
                # update the podium purchase
                db_podium_purchase.completed = True
                db_podium_purchase.stripe_subscription_id = event_data['object']['id']
                db_podium_purchase.stripe_customer_id = event_data['object']['customer']
                db_podium_purchase.start_date = datetime.datetime.fromtimestamp(event_data['object']['current_period_start'])
                db_podium_purchase.end_date = datetime.datetime.fromtimestamp(event_data['object']['current_period_end'])
                db_podium_purchase.save()

                # update the end date of the previous purchase
                db_previous_podium_purchase = app.core.data_models.PodiumPurchase \
                    .where('guid', '!=', db_podium_purchase.guid) \
                    .where('stripe_subscription_id', event_data['object']['id']) \
                    .where('completed', True) \
                    .order_by('end_date', 'desc') \
                    .first()
                
                if db_previous_podium_purchase is not None and db_previous_podium_purchase.end_date.timestamp() > event_data['object']['current_period_start']:
                    db_previous_podium_purchase.end_date = datetime.datetime.fromtimestamp(event_data['object']['current_period_start'])
                    db_previous_podium_purchase.save() 
    else:
        print(f'unhandled event: {event_type}')
        #print(event)
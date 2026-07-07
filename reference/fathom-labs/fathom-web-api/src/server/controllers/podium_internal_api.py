import app
from modules import *

from fastapi import APIRouter, Header, HTTPException, Request, Depends,Query, File, UploadFile

from fastapi.security import HTTPBearer
from sse_starlette.sse import EventSourceResponse
from fastapi.responses import ORJSONResponse

from pydantic import BaseModel, Field
from typing import Optional, List
from orator.query.join_clause import JoinClause

from pathlib import Path
import time
import datetime
import requests
import asyncio
import sentry_sdk
import openai
import json
import orjson
import uuid
from hashids import Hashids
import jwt
from secrets import token_urlsafe
from hashlib import sha256
import stripe
import boto3
from botocore.client import Config
import zipfile
from tempfile import TemporaryDirectory
import os
import copy
import random,re

stripe.api_key = app.core.env['stripe_api_key']

router = APIRouter()
auth_scheme = HTTPBearer()

class ResetPasswordRequest(BaseModel):
    email: str

class ResetPasswordData(BaseModel):
    token: str
    new_password: str

INTIAL_DATA = {
            "fps": 30,
            "width": 270,
            "height": 480,
            "hieght": 400,
            "start": 20,
            "end": 90,
            "backgroundColor": "#191970",
            'opacityPercent': 50,
            'overlayColor' : '#111111',
            "isGradient":True,
            "isVideo":False,
            "square": {
                "layout": "square",
                "clipTitle": "",
                "showTitle": "",
                "episodeTitle": "",
                "clipTitleFont": "Inter",
                "showTitleFont": "Inter",
                "clipTitleWidth": 199,
                "showTitleWidth": "134",
                "clipTitleHeight": 23,
                "showTitleHeight": "19",
                "clipTitlePadding": 1,
                "episodeTitleFont": "Inter",
                "showTitlePadding": 1,
                "clipTitleFontSize": 15,
                "episodeTitleWidth": 295,
                "showTitleFontSize": "14",
                "clipTitleFontColor": "#FFFFFF",
                "clipTitleTopPixels": 251,
                "episodeTitleHeight": 38,
                "showTitleFontColor": "#FFFFFF",
                "showTitleTopPixels": 20,
                "clipTitleLeftPixels": 19,
                "episodeTitlePadding": 1,
                "showTitleLeftPixels": 19,
                "transcriptTitleFont": "Inter",
                "episodeTitleFontSize": 20,
                "transcriptTitleWidth": 250,
                "episodeTitleFontColor": "#FFFFFF",
                "episodeTitleTopPixels": 40,
                "is_rendering_complete": True,
                "transcriptTitleHeight": 54,
                "episodeTitleLeftPixels": 19,
                "transcriptTitlePadding": 1,
                "transcriptTitleFontSize": 30,
                "clipTitleBackgroundColor": "null",
                "clipTitleDropShadowColor": "null",
                "showTitleBackgroundColor": "null",
                "showTitleDropShadowColor": "null",
                "transcriptTitleFontColor": "#FFFFFF",
                "transcriptTitleTopPixels": 292,
                "clipTitleDropShadowSpread": 1,
                "showTitleDropShadowSpread": "Small",
                "transcriptTitleLeftPixels": 19,
                "clipTitleOutlineStrokeColor": "null",
                "clipTitleOutlineStrokeWidth": 1,
                "episodeTitleBackgroundColor": "null",
                "episodeTitleDropShadowColor": "null",
                "showTitleOutlineStrokeColor": "null",
                "showTitleOutlineStrokeWidth": 1,
                "episodeTitleDropShadowSpread": "Small",
                "episodeTitleOutlineStrokeColor": "null",
                "episodeTitleOutlineStrokeWidth": 1,
                "transcriptTitleBackgroundColor": "null",
                "transcriptTitleDropShadowColor": "null",
                "transcriptTitleDropShadowSpread": "Small",
                "transcriptTitleOutlineStrokeColor": "null",
                "transcriptTitleOutlineStrokeWidth": 1,
                "clipTitleTextAlign": 'left',
                "clipTitleFontOpacity": 100,
                "clipTitleRotation": 0,
                "clipTitleZIndex": 2,
                "showTitleTextAlign": 'left',
                "showTitleFontOpacity": 100,
                "showTitleRotation": 0,
                "showTitleZIndex": 2,
                "episodeTitleTextAlign": 'left',
                "episodeTitleFontOpacity": 100,
                "episodeTitleRotation": 0,
                "episodeTitleZIndex": 2,
                "transcriptTitleTextAlign": 'left',
                "transcriptTitleFontOpacity": 100,
                "transcriptTitleRotation": 0,
                "transcriptTitleZIndex": 2,
                "imageWidth": "0",
                "imageHeight": "0",
                "imageTopPixels": 127,
                "imageLeftPixels": 68,
                "imageDropShadowColor": "null",
                "imageDropShadowSpread": "Small",
                "imageOutlineStrokeColor": "null",
                "imageOutlineStrokeWidth": 1,
                "imageCornerRadius": 1,
                "videoAlignment": 'center',
                "videoOpacityPercent": 100,
                "videoScalePercent": 100
            },
            "imageUrl": None,
            "imageAspectRatio": 0,
            "portrait": {
                "layout": "portrait",
                "clipTitle": "",
                "showTitle": "",
                "episodeTitle": "",
                "clipTitleFont": "Inter",
                "showTitleFont": "Inter",
                "clipTitleWidth": 199,
                "showTitleWidth": "134",
                "clipTitleHeight": 23,
                "showTitleHeight": "19",
                "clipTitlePadding": 1,
                "episodeTitleFont": "Inter",
                "showTitlePadding": 1,
                "clipTitleFontSize": 15,
                "episodeTitleWidth": 240,
                "showTitleFontSize": "14",
                "clipTitleFontColor": "#FFFFFF",
                "clipTitleTopPixels": 338,
                "episodeTitleHeight": 52,
                "showTitleFontColor": "#FFFFFF",
                "showTitleTopPixels": 20,
                "clipTitleLeftPixels": 19,
                "episodeTitlePadding": 1,
                "showTitleLeftPixels": 19,
                "transcriptTitleFont": "Inter",
                "episodeTitleFontSize": "20",
                "transcriptTitleWidth": 250,
                "episodeTitleFontColor": "#FFFFFF",
                "episodeTitleTopPixels": 40,
                "is_rendering_complete": True,
                "transcriptTitleHeight": 54,
                "episodeTitleLeftPixels": 19,
                "transcriptTitlePadding": 1,
                "transcriptTitleFontSize": 30,
                "clipTitleBackgroundColor": "null",
                "clipTitleDropShadowColor": "null",
                "showTitleBackgroundColor": "null",
                "showTitleDropShadowColor": "null",
                "transcriptTitleFontColor": "#FFFFFF",
                "transcriptTitleTopPixels": 386,
                "clipTitleDropShadowSpread": 1,
                "showTitleDropShadowSpread": "Small",
                "transcriptTitleLeftPixels": 19,
                "clipTitleOutlineStrokeColor": "null",
                "clipTitleOutlineStrokeWidth": 1,
                "episodeTitleBackgroundColor": "null",
                "episodeTitleDropShadowColor": "null",
                "showTitleOutlineStrokeColor": "null",
                "showTitleOutlineStrokeWidth": 1,
                "episodeTitleDropShadowSpread": "Small",
                "episodeTitleOutlineStrokeColor": "null",
                "episodeTitleOutlineStrokeWidth": 1,
                "transcriptTitleBackgroundColor": "null",
                "transcriptTitleDropShadowColor": "null",
                "transcriptTitleDropShadowSpread": "Small",
                "transcriptTitleOutlineStrokeColor": "null",
                "transcriptTitleOutlineStrokeWidth": 1,
                "clipTitleTextAlign": 'left',
                "clipTitleFontOpacity": 100,
                "clipTitleRotation": 0,
                "clipTitleZIndex": 2,
                "showTitleTextAlign": 'left',
                "showTitleFontOpacity": 100,
                "showTitleRotation": 0,
                "showTitleZIndex": 2,
                "episodeTitleTextAlign": 'left',
                "episodeTitleFontOpacity": 100,
                "episodeTitleRotation": 0,
                "episodeTitleZIndex": 2,
                "transcriptTitleTextAlign": 'left',
                "transcriptTitleFontOpacity": 100,
                "transcriptTitleRotation": 0,
                "transcriptTitleZIndex": 2,
                "imageWidth": "0",
                "imageHeight": "0",
                "imageTopPixels": 140,
                "imageLeftPixels": 1,
                "imageDropShadowColor": "null",
                "imageDropShadowSpread": "Small",
                "imageOutlineStrokeColor": "null",
                "imageOutlineStrokeWidth": 1,
                "imageCornerRadius": 1,
                "videoAlignment": 'center',
                "videoOpacityPercent": 100,
                "videoScalePercent": 100
            },
            "landscape": {
                "layout": "landscape",
                "clipTitle": "",
                "showTitle": "",
                "episodeTitle": "",
                "clipTitleFont": "Inter",
                "showTitleFont": "Inter",
                "clipTitleWidth": 199,
                "showTitleWidth": "134",
                "clipTitleHeight": 23,
                "showTitleHeight": "19",
                "clipTitlePadding": 1,
                "episodeTitleFont": "Inter",
                "showTitlePadding": 1,
                "clipTitleFontSize": 15,
                "episodeTitleWidth": 293,
                "showTitleFontSize": "14",
                "clipTitleFontColor": "#FFFFFF",
                "clipTitleTopPixels": 138,
                "episodeTitleHeight": 52,
                "showTitleFontColor": "#FFFFFF",
                "showTitleTopPixels": 20,
                "clipTitleLeftPixels": 19,
                "episodeTitlePadding": 1,
                "showTitleLeftPixels": 19,
                "transcriptTitleFont": "Inter",
                "episodeTitleFontSize": "20",
                "transcriptTitleWidth": 250,
                "episodeTitleFontColor": "#FFFFFF",
                "episodeTitleTopPixels": 40,
                "is_rendering_complete": True,
                "transcriptTitleHeight": 54,
                "episodeTitleLeftPixels": 19,
                "transcriptTitlePadding": 1,
                "transcriptTitleFontSize": 30,
                "clipTitleBackgroundColor": "null",
                "clipTitleDropShadowColor": "null",
                "showTitleBackgroundColor": "null",
                "showTitleDropShadowColor": "null",
                "transcriptTitleFontColor": "#FFFFFF",
                "transcriptTitleTopPixels": 175,
                "clipTitleDropShadowSpread": 1,
                "showTitleDropShadowSpread": "Small",
                "transcriptTitleLeftPixels": 19,
                "clipTitleOutlineStrokeColor": "null",
                "clipTitleOutlineStrokeWidth": 1,
                "episodeTitleBackgroundColor": "null",
                "episodeTitleDropShadowColor": "null",
                "showTitleOutlineStrokeColor": "null",
                "showTitleOutlineStrokeWidth": 1,
                "episodeTitleDropShadowSpread": "Small",
                "episodeTitleOutlineStrokeColor": "null",
                "episodeTitleOutlineStrokeWidth": 1,
                "transcriptTitleBackgroundColor": "null",
                "transcriptTitleDropShadowColor": "null",
                "transcriptTitleDropShadowSpread": "Small",
                "transcriptTitleOutlineStrokeColor": "null",
                "transcriptTitleOutlineStrokeWidth": 1,
                "clipTitleTextAlign": 'left',
                "clipTitleFontOpacity": 100,
                "clipTitleRotation": 0,
                "clipTitleZIndex": 2,
                "showTitleTextAlign": 'left',
                "showTitleFontOpacity": 100,
                "showTitleRotation": 0,
                "showTitleZIndex": 2,
                "episodeTitleTextAlign": 'left',
                "episodeTitleFontOpacity": 100,
                "episodeTitleRotation": 0,
                "episodeTitleZIndex": 2,
                "transcriptTitleTextAlign": 'left',
                "transcriptTitleFontOpacity": 100,
                "transcriptTitleRotation": 0,
                "transcriptTitleZIndex": 2,
                "imageWidth": "0",
                "imageHeight": "0",
                "imageTopPixels": 60,
                "imageLeftPixels": 220,
                "imageDropShadowColor": "null",
                "imageDropShadowSpread": "Small",
                "imageOutlineStrokeColor": "null",
                "imageOutlineStrokeWidth": 1,
                "imageCornerRadius": 1,
                "videoAlignment": 'center',
                "videoOpacityPercent": 100,
                "videoScalePercent": 100
            },

        }

COLOR_SCHEME = [
    {
        "backgroundColor": "#1A535C",
        "Text_Color": "#FFFFFF",
        
    },
    {
        "backgroundColor": "#FF9F1C",
        "Text_Color": "#FFFFFF",
        
    },
    {
        "backgroundColor": "#011627",
        "Text_Color": "#FFFFFF",
        
    },
    {
        "backgroundColor": "#2B2D42",
        "Text_Color": "#FFFFFF",
        
    },
    {
        "backgroundColor": "#06D6A0",
        "Text_Color": "#FFFFFF",
        
    },
    {
        "backgroundColor": "#F4A261",
        "Text_Color": "#FFFFFF",
        
    },
    {
        "backgroundColor": "#000000",
        "Text_Color": "#FFFFFF",
        
    },
    {
        "backgroundColor": "#D4A373",
        "Text_Color": "#FFFFFF",
        
    },
    {
        "backgroundColor": "#F72585",
        "Text_Color": "#FFFFFF",
        
    },
    {
        "backgroundColor": "#3B3B58",
        "Text_Color": "#FFFFFF",
        
    }
]


@router.post('/api/podium/internal/v1/user/request_reset_password', description="Request password reset", include_in_schema=False)
async def request_reset_password(request: ResetPasswordRequest):
    podium_user = app.core.data_models.PodiumUser.where('email', request.email).first()

    if not podium_user:
        return {"detail": "Reset password request processed. If an account with the provided email exists, a reset email will be sent."}

    # Create a unique token
    token = token_urlsafe(20)
    # Hash the token
    hashed_token = sha256(token.encode()).hexdigest()

    # Set the expiration time for the token, e.g. 1 hour from now
    expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)

    podium_user.reset_password_token = hashed_token
    podium_user.reset_password_expires_at = expires_at
    podium_user.save()

    # Send email to user with the token
    podium_user.send_reset_email(token)
    #print(f"Reset password token: {token}")

    return {"detail": "Reset password request processed. If an account with the provided email exists, a reset email will be sent."}

@router.post('/api/podium/internal/v1/user/reset_password', description="Reset password", include_in_schema=False)
async def reset_password(data: ResetPasswordData):
    hashed_token = sha256(data.token.encode()).hexdigest()

    podium_user = app.core.data_models.PodiumUser.where('reset_password_token', hashed_token).first()

    if not podium_user or datetime.datetime.now(datetime.timezone.utc) > podium_user.reset_password_expires_at:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    # Set the new password, make sure to hash it before saving
    podium_user.salt = str(uuid.uuid4())
    podium_user.password_hash = sha256((data.new_password + podium_user.salt).encode('utf-8')).hexdigest()
    podium_user.reset_password_token = None
    podium_user.reset_password_expires_at = None
    podium_user.save()

    return {"detail": "Password reset successful."}

@router.get('/api/podium/internal/v1/user', description="Get user information", include_in_schema=False)
async def get_user(api_key: str = Depends(auth_scheme)):
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    user_settings = app.core.data_models.PodiumUserSetting
        
    user_data = {
        'id': user.guid,
        'guid': user.guid,
        'email': user.email,
        'name': user.name,
        'profile_image_url': user.profile_image_url,
        'company_name': user.company_name,
        'podcast_count': user.podcast_count,
        'rss_feeds': user.rss_feeds,
        'role': user.role,
        'new_user_info_complete': user.new_user_info_complete,
        'is_visitor': user.is_visitor,
        'primary_stripe_customer_id': user.stripe_customer_id,
        'current_subscription_title': None,
        'current_subscription_price': None,
        'current_subscription_period': None,
        'current_subscription_renews_on': None,
        'current_subscription_credits_balance': 0,
        'current_subscription_credits_expire_on': None,
        'current_subscription_already_availed_free_offer': False,
        'current_subscription_cancel_or_paused': None,
        'primary_stripe_customer_id': None,
        'additional_credits_balance': user.get_additional_credits_balance(),
        'additional_credits_stripe_price_id': user.get_additional_credits_product().stripe_price_id,
        'payment_method_brand': None,
        'payment_method_last4': None,
        'payment_method_exp_month': None,
        'payment_method_exp_year': None,
        'number_of_completed_purchases': 0,
        'has_used_podium_gpt': False,
        'settings': {
            'unsubscribe_confirmation_emails': user_settings.get(user.id, 'unsubscribe_confirmation_emails'),
            'api_access':user_settings.get(user.id, 'api_access')
        }
    }
        
    encoded_token = jwt.encode({ "podium_user_guid": user.guid }, app.env['fathom_jwt_secret'], algorithm="HS256")
    user_data['podium_token'] = encoded_token
    
    subscription = user.get_current_subscription_purchase()
    
    if subscription is not None:
        user_data['current_subscription_title'] = subscription.podium_product.title
        user_data['current_subscription_price'] = subscription.podium_product.price
        user_data['current_subscription_period'] = subscription.podium_product.period
        user_data['current_subscription_renews_on'] = subscription.end_date if subscription.was_cancelled != True else None
        user_data['current_subscription_credits_balance'] = user.get_current_subscription_credits_balance()
        user_data['current_subscription_credits_expire_on'] = user.get_current_subscription_credits_balance_expiration()
        user_data['primary_stripe_customer_id'] = subscription.stripe_customer_id
        user_data['current_subscription_already_availed_free_offer'] = subscription.already_availed_free_offer
        if subscription.was_cancelled:
            user_data['current_subscription_renews_on'] = None
            user_data['current_subscription_cancel_or_paused'] = 'cancelled'
        elif subscription.is_paused:
            user_data['current_subscription_renews_on'] = None
            user_data['current_subscription_cancel_or_paused'] = 'paused'
        else:
            user_data['current_subscription_cancel_or_paused'] = None
        

        try:
            # Retrieve a list of payment methods associated with the customer
            payment_methods = stripe.PaymentMethod.list(
                customer=subscription.stripe_customer_id,
                type="card",
            )
            
            if len(payment_methods.data) > 0:
                payment_method = payment_methods.data[0]
                user_data['payment_method_brand'] = payment_method.card.brand
                user_data['payment_method_last4'] = payment_method.card.last4
                user_data['payment_method_exp_month'] = payment_method.card.exp_month
                user_data['payment_method_exp_year'] = payment_method.card.exp_year

        except stripe.error.StripeError as e:
            print(e)
            pass
    else:
        last_subscription = user.get_last_subscription_purchase()
        if last_subscription is not None:
            user_data['primary_stripe_customer_id'] = last_subscription.stripe_customer_id

    number_of_podium_gpt_documents = app.core.data_models.PodiumPackageAsset \
        .join(JoinClause('podium_packages') \
            .on('podium_packages.id', '=', 'podium_package_assets.podium_package_id') \
        ) \
        .where('podium_packages.user_id', user.id) \
        .where('podium_package_assets.type', 'document') \
        .count()

    if number_of_podium_gpt_documents > 0:
        user_data['has_used_podium_gpt'] = True
    
    number_of_completed_purchases = app.core.data_models.PodiumPurchase \
        .where('podium_user_id', user.id) \
        .where('completed', True) \
        .count()
    
    user_data['number_of_completed_purchases'] = number_of_completed_purchases
    
    return user_data

@router.get('/api/podium/internal/v1/user/settings/get/{key}', description="Get user settings with key", include_in_schema=False)
async def get_user_settings(key: str, api_key: str = Depends(auth_scheme)):
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    user_settings = app.core.data_models.PodiumUserSetting.get(user.id, key)
    
    return {"value": user_settings}

@router.post('/api/podium/internal/v1/user/settings/set/{key}', description="Set user settings with key", include_in_schema=False)
async def set_user_settings(key: str, request: Request , api_key: str = Depends(auth_scheme)):
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    data = await request.json()
    value = data.get('value', None)
    print(value)
    response = app.core.data_models.PodiumUserSetting.set(user.id, key, value)
    if response is not None:
        return {"value": response.value, "key": response.key,'status': 'updated'}
    else:
        return {"value": response.value, "key": response.key,'status': 'created'}

@router.get('/api/podium/internal/v1/get_system_media_processing_status', description="Get system media processing status", include_in_schema=False)
async def get_system_media_processing_status():    
    # total number of podium packages incomplete in the past hour that are at least 20 minutes old and shorter than 2 hours

    total_number_of_podium_packages_20_complete = app.core.data_models.PodiumPackage \
        .where('podium_packages.created_at', '>=', datetime.datetime.utcnow() - datetime.timedelta(minutes=20)) \
        .where_not_null('podium_packages.title') \
        .count()
    
    if total_number_of_podium_packages_20_complete == 0:
        total_number_of_podium_packages_uploaded_60_20_incomplete = app.core.data_models.PodiumPackage \
            .join(JoinClause('podium_package_process_attributes') \
                .on('podium_packages.id', '=', 'podium_package_process_attributes.podium_package_id') \
                .where('podium_package_process_attributes.key', '=', 'audio_stored') \
            ) \
            .where('podium_packages.created_at', '>=', datetime.datetime.utcnow() - datetime.timedelta(minutes=60)) \
            .where('podium_packages.created_at', '<=', datetime.datetime.utcnow() - datetime.timedelta(minutes=20)) \
            .where('podium_packages.duration', '<=', 7200) \
            .where_null('podium_packages.title') \
            .where(
                app.core.database.db.query() \
                .where_not_in('podium_packages.error_type', ['Audio too short to process.', 'Insufficient credits to process package.']) \
                .or_where_null('podium_packages.error_type') \
            ) \
            .where(
                app.core.database.db.query() \
                .where('podium_package_process_attributes.value', 'true') \
                .or_where_not_null('podium_packages.remote_media_file_url') \
            ) \
            .where('system_check_ignore', False) \
            .count()
        
        if total_number_of_podium_packages_uploaded_60_20_incomplete > 1:
            # Check to see if there are multiple customers or files affected
            podium_packages_uploaded_60_20_incomplete = app.core.data_models.PodiumPackage \
                .join(JoinClause('podium_package_process_attributes') \
                    .on('podium_packages.id', '=', 'podium_package_process_attributes.podium_package_id') \
                    .where('podium_package_process_attributes.key', '=', 'audio_stored') \
                ) \
                .where('podium_packages.created_at', '>=', datetime.datetime.utcnow() - datetime.timedelta(minutes=60)) \
                .where('podium_packages.created_at', '<=', datetime.datetime.utcnow() - datetime.timedelta(minutes=20)) \
                .where('podium_packages.duration', '<=', 7200) \
                .where_null('podium_packages.title') \
                .where(
                    app.core.database.db.query() \
                    .where_not_in('podium_packages.error_type', ['Audio too short to process.', 'Insufficient credits to process package.']) \
                    .or_where_null('podium_packages.error_type') \
                ) \
                .where(
                    app.core.database.db.query() \
                    .where('podium_package_process_attributes.value', 'true') \
                    .or_where_not_null('podium_packages.remote_media_file_url') \
                ) \
                .where('system_check_ignore', False) \
                .get()

            customers_affected = []
            files_affected = []
            for podium_package in podium_packages_uploaded_60_20_incomplete:
                if podium_package.user_id not in customers_affected:
                    customers_affected.append(podium_package.user_id)
                if podium_package.original_filename not in files_affected:
                    files_affected.append(podium_package.original_filename)

            if len(customers_affected) > 1 or len(files_affected) > 1:
                raise HTTPException(status_code=500, detail="Media processing has halted based on incomplete packages.")
        
        # total number of podium packages errored with unknown errors in the past in the past 60 minutes
        total_number_of_podium_packages_uploaded_60_errored_unknown = app.core.data_models.PodiumPackage \
            .where('created_at', '>=', datetime.datetime.utcnow() - datetime.timedelta(minutes=60)) \
            .where_not_null('error') \
            .where_not_in('error_type', ['Audio too short to process.', 'Insufficient credits to process package.']) \
            .where('system_check_ignore', False) \
            .count()
        
        if total_number_of_podium_packages_uploaded_60_errored_unknown >= 3:
            podium_packages_uploaded_60_errored_unknown = app.core.data_models.PodiumPackage \
                .where('created_at', '>=', datetime.datetime.utcnow() - datetime.timedelta(minutes=60)) \
                .where_not_null('error') \
                .where_not_in('error_type', ['Audio too short to process.', 'Insufficient credits to process package.']) \
                .where('system_check_ignore', False) \
                .get()
            
            customers_affected = []
            files_affected = []
            for podium_package in podium_packages_uploaded_60_errored_unknown:
                if podium_package.user_id not in customers_affected:
                    customers_affected.append(podium_package.user_id)
                if podium_package.original_filename not in files_affected:
                    files_affected.append(podium_package.original_filename)

            if len(customers_affected) > 1 or len(files_affected) > 1:
                raise HTTPException(status_code=500, detail="Media processing has halted based on incomplete packages.")

    return {"status": "ok"}

@router.get('/api/podium/internal/v1/user/stripe_billing_info_url', description="Get url for user to update payment method", include_in_schema=False)
async def get_stripe_billing_info_url(return_url: str, api_key: str = Depends(auth_scheme)):
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    subscription = user.get_current_subscription_purchase()
    
    if not subscription:
        raise HTTPException(status_code=400, detail="User has no subscription")

    session = stripe.billing_portal.Session.create(
        customer=subscription.stripe_customer_id,
        return_url=return_url,
    )

    return {"url": session.url}

class CancelSubscription(BaseModel):
    password: str
    reason : str
    feedback: str

@router.post('/api/podium/internal/v1/user/cancel_subscription', description="Cancel user's current stripe subscription", include_in_schema=False)
async def cancel_subscription(CancelSubscription: CancelSubscription, api_key: str = Depends(auth_scheme)):
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    subscription = user.get_current_subscription_purchase()
    
    if not subscription:
        raise HTTPException(status_code=400, detail="User has no subscription")

    try:
        stripe.Subscription.delete(subscription.stripe_subscription_id, prorate=False)
        subscription.reason = CancelSubscription.reason
        subscription.comments = CancelSubscription.feedback
        subscription.was_cancelled = True
        subscription.save()
    except stripe.error.StripeError as e:
        print(e)
        raise HTTPException(status_code=400, detail="Failed to cancel subscription")

    return {"detail": "Subscription cancelled successfully."}

#avail one month free subscription
@router.post('/api/podium/internal/v1/user/avail_one_month_free_subscription', description="Avail one month free subscription", include_in_schema=False)
async def avail_one_month_free_subscription(api_key: str = Depends(auth_scheme)):
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    subscription = user.get_current_subscription_purchase()
    
    if subscription:
        #check is already avail one month free subscription
        if subscription.already_availed_free_offer:
            raise HTTPException(status_code=400, detail="Already avail one month free subscription")
      
       
        subscription.already_availed_free_offer = True
        subscription.end_date = subscription.end_date + datetime.timedelta(days=30)
        #increase trial period to subscription.end_date
        stripe.Subscription.modify(subscription.stripe_subscription_id, trial_end=round(subscription.end_date.timestamp()))
        subscription.save()

    else:
        raise HTTPException(status_code=400, detail="User has no subscription")

    return {"detail": "One month free subscription credits granted successfully."}

#pause subscription
@router.post('/api/podium/internal/v1/user/pause_subscription', description="Pause user's current stripe subscription", include_in_schema=False)
async def pause_subscription(api_key: str = Depends(auth_scheme)):
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    subscription = user.get_current_subscription_purchase()
    
    if not subscription:
        raise HTTPException(status_code=400, detail="User has no subscription")

    try:
        stripe.Subscription.modify(subscription.stripe_subscription_id, pause_collection={"behavior": "void"})
        subscription.is_paused = True
        subscription.save()
    except stripe.error.StripeError as e:
        print(e)
        raise HTTPException(status_code=400, detail="Failed to pause subscription")

    return {"detail": "Subscription paused successfully."}

#resume subscription
@router.post('/api/podium/internal/v1/user/resume_subscription', description="Resume user's current stripe subscription", include_in_schema=False)
async def resume_subscription(api_key: str = Depends(auth_scheme)):
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    subscription = user.get_current_subscription_purchase()
    
    if not subscription:
        raise HTTPException(status_code=400, detail="User has no subscription")

    try:
        stripe.Subscription.modify(subscription.stripe_subscription_id, pause_collection='')
        subscription.is_paused = False
        subscription.save()
    except stripe.error.StripeError as e:
        print(e)
        raise HTTPException(status_code=400, detail="Failed to resume subscription")

    return {"detail": "Subscription resumed successfully."}


#apiKeys List
@router.get('/api/podium/internal/v1/user/api_keys', description="Get user's api keys", include_in_schema=False)
async def api_keys(api_key: str = Depends(auth_scheme)):
    print(api_key)
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    api_keys = user.podium_user_api_keys().get()
    
    keys_list = [api_key.to_dict() for api_key in api_keys]

    return  ORJSONResponse(keys_list)

class ApiKeys(BaseModel):
    api_key_id: Optional[int]
    name: Optional[str]
    api_key :Optional[str]

#Endpoint to update the name of an API key
@router.put('/api/podium/internal/v1/user/api_keys/update/{api_key_id}', include_in_schema=False)
async def update_api_key_name(request: ApiKeys,api_key_id: int, api_key: str = Depends(auth_scheme)):
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    api_key_instance = app.core.data_models.PodiumUserApiKey.where('id', api_key_id).where('podium_user_id', user.id).first()
    if not api_key_instance:
        raise HTTPException(status_code=404, detail="API key not found")
    if request.name == None:
        raise HTTPException(status_code=400, detail="Name is required")

    api_key_instance.name = request.name
    api_key_instance.save()

    return {"status": "success", "message": "API key name updated successfully"}

#generate new api keys
@router.post('/api/podium/internal/v1/user/api_keys/generate', description="Generate new user's api keys", include_in_schema=False)
async def generate_api_keys(request: ApiKeys,api_key: str = Depends(auth_scheme)):
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    #create new api keys
    db_api_key = app.core.data_models.PodiumUserApiKey()
    db_api_key.podium_user_id = user.id
    db_api_key.generate_api_key()
    if request.name is not None:
        db_api_key.name = request.name
    else:
        db_api_key.name = None
    db_api_key.save()
    
    return {"api_key": db_api_key.api_key, "name": db_api_key.name}

#delete api keys
@router.delete('/api/podium/internal/v1/user/api_keys/delete/{api_key_id}', description="Delete user's api key", include_in_schema=False)
async def delete_api_keys(api_key_id: int,api_key: str = Depends(auth_scheme)):
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    db_api_key = app.core.data_models.PodiumUserApiKey \
                .where('id', api_key_id) \
                .where('podium_user_id', user.id) \
                .first()
    if db_api_key is None:
        raise HTTPException(status_code=404, detail="No API key found")
    db_api_key.delete()
    return {"detail": "Api key deleted successfully."}


#api dashboard
@router.get('/api/podium/internal/v1/user/credits_usage', description="It provide user usage ", include_in_schema=False)
async def credits_usage(api_key: str = Depends(auth_scheme), from_date: Optional[str] = Query(None),to_date: Optional[str] = Query(None)):
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    query = app.core.data_models.PodiumTransaction \
            .where('user_id', user.id) \
            .where('reason', 'Podium AI Media Processing') \
            .where('credits', '<', 0)

    # Apply date filters if provided
    if from_date:
        from_date = datetime.datetime.strptime(from_date, '%Y-%m-%d')
        query = query.where('updated_at', '>=', from_date)
    if to_date:
        to_date = datetime.datetime.strptime(to_date, '%Y-%m-%d') + datetime.timedelta(days=1) - datetime.timedelta(microseconds=1)
        query = query.where('updated_at', '<=', to_date)
    
    query = query.order_by('updated_at', 'asc')

    transaction_data = query.get()

    # Calculate the total credits consumed
    total_credits_consumed = sum(transaction.credits for transaction in transaction_data)

    # Calculate the total hours processed, ensuring the value is positive
    total_hours_processed = abs(total_credits_consumed) / 60  

    # Round the total hours to two decimal places
    total_hours_processed = round(total_hours_processed, 2)

    # Create a list of dictionaries from the transaction data
    filtered_transaction_data = [
        {
            "podium_package_id" : transaction.podium_package_id,
            "credits": abs(transaction.credits),
            "updated_at": transaction.updated_at,
        } 
        for transaction in transaction_data
    ]
        # Return a dictionary with the calculated data
    return {
        "creditsConsumed": abs(total_credits_consumed),
        "hoursProcessed": total_hours_processed,
        "apiCallsMade": len(transaction_data),
        "data": filtered_transaction_data
    }
    

class UpdateUser(BaseModel):
    name: str
    email: str

@router.put('/api/podium/internal/v1/user/update', description="Update user information", include_in_schema=False)
async def update_user(request: UpdateUser, api_key: str = Depends(auth_scheme)):
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    if user.email.lower() != request.email.lower():
        existing_user = app.core.data_models.PodiumUser.where('email', request.email.lower()).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already in use")
        
    user.name = request.name
    user.email = request.email.lower()
    user.manually_updated = True
    user.save()

    return {"detail": "User information updated successfully."}

class GptContentTune(BaseModel):
    text: str
    prompt: str

@router.post('/api/podium/internal/v1/media/{media_id}/gpt/content/tune/stream', include_in_schema=False)
async def media_gpt_content_tune_stream(media_id: str, gpt_content_tune: GptContentTune, request: Request, authorization: Optional[str] = Header(None)):
    """
    Stream a response from the GPT-4 engine for the given PodiumPackage and prompt.
    :param guid: The GUID of the PodiumPackage to use.
    """
    podium_package = app.core.data_models.PodiumPackage.where('guid', media_id).first()
    if not podium_package:
        raise HTTPException(status_code=404, detail="Podium Package not found")
        
    return EventSourceResponse(podium_package.generate_content_tune_stream(gpt_content_tune.prompt, gpt_content_tune.text))

class MediaDownloadFilesUrl(BaseModel):
    url: str

@router.get('/api/podium/clients/v1/media/{media_id}/download_files_url', description="Returns a URL to download a media's files.", tags=["Media"], include_in_schema=False, response_model=MediaDownloadFilesUrl)
async def get_media_download_files_url(media_id: str, api_key: str = Depends(auth_scheme)) -> MediaDownloadFilesUrl:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials, allow_media_tokens=True, requested_media_id=media_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_package = app.core.data_models.PodiumPackage \
        .where('guid', media_id) \
        .where('user_id', user.id) \
        .where('is_deleted', False) \
        .first()

    if not podium_package:
        raise HTTPException(status_code=404, detail="Media not found")
    
    package_generated_attribute = podium_package.get_process_attribute('package_generated')
    max_asset_updated = app.core.data_models.PodiumPackageAsset \
        .where('podium_package_id', podium_package.id) \
        .max('updated_at')

    podium_package_transcript_file = app.core.data_models.PodiumPackageTranscriptFile \
        .where('podium_package_id', podium_package.id) \
        .select('id') \
        .first()
    
    max_transcript_edit_updated = app.core.data_models.PodiumPackageTranscriptFileEdit \
        .where('podium_package_transcript_file_id', podium_package_transcript_file.id) \
        .max('updated_at')

    max_transcript_speakers_updated = app.core.data_models.PodiumPackageTranscriptFileSpeaker \
        .where('podium_package_transcript_file_id', podium_package_transcript_file.id) \
        .max('updated_at')
    
    max_transcript_monolouge_speakers_updated = app.core.data_models.PodiumPackageTranscriptMonologueSpeakerEdit \
        .where('podium_package_transcript_file_id', podium_package_transcript_file.id) \
        .max('updated_at')

    if (max_asset_updated is not None and max_asset_updated > package_generated_attribute.updated_at) \
        or (max_transcript_edit_updated is not None and max_transcript_edit_updated > package_generated_attribute.updated_at) \
        or (max_transcript_speakers_updated is not None and max_transcript_speakers_updated > package_generated_attribute.updated_at) or podium_package.updated_at > package_generated_attribute.updated_at \
            or (max_transcript_monolouge_speakers_updated is not None and max_transcript_monolouge_speakers_updated > package_generated_attribute.updated_at):
        podium_package.package_files()
        podium_package.set_process_attribute('package_generated', 'true')
        package_generated_attribute.touch()

    
    url = podium_package.get_signed_url()
    print(url)

    media_download_files_url = MediaDownloadFilesUrl(
        url = url
    )

    return media_download_files_url

class SpecialExpo(BaseModel):
    email: str
    podcast_rss_url: str
    podcast_episode_rss_guid: str
    file_url: str

@router.post('/api/podium/internal/v1/expo/7516a8f7-25b2-4f99-ba16-ac2651eb571c', description="Special Expo Endpoint", include_in_schema=False)
async def expo(request: SpecialExpo):
    user = app.core.data_models.PodiumUser \
        .where('email', request.email.lower()) \
        .first()

    if user is None:
        # create new user
        user = app.core.data_models.PodiumUser()
        user.email = request.email.lower()
        user.is_visitor = True
        user.save()
        user = user.fresh()
        user.grant_credits(180, 'Free Trial Credits')

    podium_package = app.core.data_models.PodiumPackage()
    podium_package.user_id = user.id
    podium_package.original_filename = "Podcast Movement Denver Example"
    podium_package.transcript_priority = 10
    podium_package.process_credits = False

    #DEBUG ONLY
    #podium_package.error = 'Testing'

    # find podcast
    podium_package.podcast_rss_url = request.podcast_rss_url
    podium_package.podcast_episode_rss_guid = request.podcast_episode_rss_guid

    podcast = app.core.data_models.Podcast \
        .where('rss_url', request.podcast_rss_url) \
        .select('id') \
        .first()
    if podcast:
        podium_package.podcast_id = podcast.id
        # find episode
        episode = app.core.data_models.PodcastEpisode \
            .where('podcast_id', podcast.id) \
            .where('rss_guid', request.podcast_episode_rss_guid) \
            .select('id') \
            .first()
        if episode:
            podium_package.podcast_episode_id = episode.id

    # save package
    podium_package.save()
    podium_package.initialize_process_attributes()

    # configure processing tasks
    processing_configuration = app.core.data_models.PodiumPackageProcessingConfiguration \
        .where('podium_package_id', podium_package.id) \
        .first()
    if processing_configuration:
        processing_configuration.generate_transcript = True
        processing_configuration.generate_titles = True
        processing_configuration.generate_show_notes_summary = True
        processing_configuration.generate_links_and_mentions = True
        processing_configuration.generate_keywords = True
        processing_configuration.generate_chapters = True
        processing_configuration.generate_highlights = True
        processing_configuration.generate_quotes = True
        processing_configuration.generate_podbook = True
        processing_configuration.save()

    # set the remote media url (triggers processing)
    podium_package.remote_media_file_url = request.file_url
    podium_package.save()


    return {"detail": "Success."}

#### CLIPS ####

def get_progress(render_id):  
          
        url = f"{app.env['video_editor_url']}/api/render/get_progress?renderId={render_id}"
        headers = {
        'x-api-key': app.env['video_editor_x_api_key']
        }
        response = requests.request("GET", url, headers=headers)
        # if response.json()['progress']['done'] == True:
        #      clip.is_rendering_complete = True
        #      clip.save()
        return response.json()
def clip_video_url(clip, render_ids):
    s3 = boto3.client(
        's3',
        aws_access_key_id=app.core.env['aws_access_key'],
        aws_secret_access_key=app.core.env['aws_access_secret'],
        config=Config(signature_version='s3v4')
    )

    bucket_name = app.env['video_editor_s3_bucket_url']
    zip_file_name = clip.title

    if not zip_file_name:
        zip_file_name = "output"

    # Define zip file's S3 key
    zip_object_key = f"renders/{render_ids[0]}/{zip_file_name}.zip"

    # Check if the zip file already exists in the S3 bucket
    try:
        s3.head_object(Bucket=bucket_name, Key=zip_object_key)
        # If the object exists, generate a pre-signed URL for it
        zip_url = s3.generate_presigned_url('get_object',
                                            Params={'Bucket': bucket_name,
                                                    'Key': zip_object_key,
                                                    'ResponseContentDisposition': f'attachment; filename="{zip_file_name}.zip"'},
                                            ExpiresIn=300)
        return zip_url
    except s3.exceptions.ClientError as e:
        # If the object does not exist, continue to create and upload the zip file
        if e.response['Error']['Code'] != '404':
            # If the error is not a 404, something else went wrong
            raise

    # If the zip file doesn't exist, create it
    with TemporaryDirectory() as temp_dir:
        video_files = []
        layouts = ["square", "portrait", "landscape"]
        
        for index, render_id in enumerate(render_ids):
            object_key = f"renders/{render_id}/out.mp4"
            file_name = f"{zip_file_name}_{layouts[index]}.mp4"
            
            # Download the video file from S3
            video_path = os.path.join(temp_dir, file_name)
            video_files.append(video_path)
            
            response = s3.get_object(Bucket=bucket_name, Key=object_key)
            with open(video_path, 'wb') as f:
                f.write(response['Body'].read())

        # Create a zip file with all downloaded videos
        zip_file_path = os.path.join(temp_dir, f'{zip_file_name}.zip')
        with zipfile.ZipFile(zip_file_path, 'w') as zipf:
            for video_file in video_files:
                zipf.write(video_file, os.path.basename(video_file))

        # Upload the zip file to S3
        s3.upload_file(zip_file_path, bucket_name, zip_object_key)

        # Generate pre-signed URL for the zip file
        zip_url = s3.generate_presigned_url('get_object',
                                            Params={'Bucket': bucket_name,
                                                    'Key': zip_object_key,
                                                    'ResponseContentDisposition': f'attachment; filename="{zip_file_name}.zip"'},
                                            ExpiresIn=300)

    return zip_url

def clip_video_url_single(clip,render_id,layout):
    s3 = boto3.client(
            's3',
            aws_access_key_id=app.core.env['aws_access_key'],
            aws_secret_access_key=app.core.env['aws_access_secret'],
            config=Config(signature_version='s3v4')
        )

    bucket_name = app.env['video_editor_s3_bucket_url']
    object_key = f"renders/{render_id}/out.mp4"
    if clip.title:
        file_name = f"{clip.title}_{layout}.mp4"
    elif layout in clip.input_props and clip.input_props[layout]['clipTitle']:
        file_name = f"{clip.input_props[layout]['clipTitle']}.mp4"
    else:
        file_name = "output.mp4"

    # # Generate pre-signed URL with attachment disposition and custom filename
    url = s3.generate_presigned_url('get_object',
                                    Params={'Bucket': bucket_name,
                                            'Key': object_key,
                                            'ResponseContentDisposition': f'attachment; filename="{file_name}"'},
                                    ExpiresIn=300)  # URL expiration time in seconds
    return url


def process_video(clip, props_data, layouts):
        data = copy.deepcopy(props_data)

        for layout in layouts:
            del data[layout]

        url = f"{app.env['video_editor_url']}/api/render/start"
        print("Process start video")
        payload = data
        headers = {
        'x-api-key': app.env['video_editor_x_api_key'],
        'Content-Type': 'application/json'
        }
        response = requests.request("POST", url, headers=headers, json=payload)
        clip.is_rendering_complete = False
        clip.last_rendered = datetime.datetime.now()
        clip.save()
        print("################################")
        print(response.json())
        return response.json()['renderId']
   


@router.put('/api/podium/internal/v1/clip/{clip_id}/update/',include_in_schema=False)
async def clip_update(request: Request,clip_id: str ,api_key: str = Depends(auth_scheme)):
    
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    clip = app.core.data_models.PodiumClipProps.where('guid',clip_id).first()

    if not clip:
        raise HTTPException(status_code=404, detail="Podium clip not found")
    
    podium_pacakge = app.core.data_models.PodiumPackage \
        .where('id', clip.podium_package_id) \
        .first()
    
    if not podium_pacakge:
        raise HTTPException(status_code=404, detail="Media not found")


    if podium_pacakge.user_id != user.id or podium_pacakge.is_deleted == True:    
        raise HTTPException(status_code=401,detail="Asset not found")
    
    body = await request.json()

    print("data: ", body["renameTitle"])
    if body["renameTitle"]:
        clip.title = body["renameTitle"]
        clip.save()

        asset = app.core.data_models.PodiumPackageAsset.where('guid',clip.highlight_id).first()
        asset.title = body["renameTitle"]
        asset.save()

        return ORJSONResponse(status_code=200,content={'status':'name update successfully'})
    
    clip.input_props = json.dumps(body)
    clip.is_rendering_complete = False
    clip.is_updated = True
    clip.save()

    return ORJSONResponse(status_code=200,content={'status':'update successfully'})
    

@router.get('/api/podium/internal/v1/clip/{clip_id}/details/', include_in_schema=False)
async def clip_details(clip_id: str ,api_key: str = Depends(auth_scheme)):
    
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    clip = app.core.data_models.PodiumClipProps.where('guid',clip_id).first()

    if not clip:
        raise HTTPException(status_code=404, detail="Podium clip not found")

    podium_pacakge = app.core.data_models.PodiumPackage \
        .where('id', clip.podium_package_id) \
        .first()
    
    if not podium_pacakge:
        raise HTTPException(status_code=404, detail="Media not found")

    if podium_pacakge.user_id != user.id or podium_pacakge.is_deleted == True:    
        raise HTTPException(status_code=401,detail="clip not found")

    clip_data = clip.clips_props()

    clip_data["clipTitle"] = clip.title
    return clip_data

@router.get('/api/podium/internal/v1/media/{media_id}/clips/', include_in_schema=False)
async def media_clips(media_id: str ,api_key: str = Depends(auth_scheme)):
    
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_package = app.core.data_models.PodiumPackage \
        .where('guid', media_id) \
        .where('user_id', user.id) \
        .where('is_deleted', False) \
        .first()

    if not podium_package:
        raise HTTPException(status_code=404, detail="Media not found")
    
    if podium_package.user_id != user.id or podium_package.is_deleted == True:    
        raise HTTPException(status_code=401,detail="clip not found")
    
    assets = app.core.data_models.PodiumPackageAsset \
        .where('podium_package_id', podium_package.id) \
        .where('type','highlight') \
        .get()
    
    clips = app.core.data_models.PodiumClipProps \
        .where('podium_package_id', podium_package.id) \
        .order_by('id') \
        .get()

    if len(clips) == 0 and len(assets) > 0:
        clips = create_clips(assets,podium_package.id)

    clips_list = []

    for clip in clips:
        data = {
            'id': clip.guid,
            'pacakge_id': podium_package.guid,
            'title': clip.title,
            'start_seconds': clip.input_props["start"],
            'end_seconds': clip.input_props["end"],
            'duration': (clip.input_props["end"] - clip.input_props["start"]) if clip.input_props is not None else None,
            'image_url': clip.clip_image_url()
        }

        clips_list.append(data)

    return(clips_list)


@router.get('/api/podium/internal/v1/clip/{media_id}/clip_status_changed/', include_in_schema=False)
async def clip_status_changed(media_id: str ,api_key: str = Depends(auth_scheme)):
    
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_package = app.core.data_models.PodiumPackage \
        .where('guid', media_id) \
        .where('user_id', user.id) \
        .where('is_deleted', False) \
        .first()

    if not podium_package:
        raise HTTPException(status_code=404, detail="Media not found")
    

    clips = app.core.data_models.PodiumClipProps.where('podium_package_id',podium_package.id).get()

    if not clips:
        raise HTTPException(status_code=404, detail="Podium clip not found")

    for clip in clips:
        clip.is_updated = False
        clip.save()

    return ORJSONResponse({"success": True, "message": "status changed"})


def get_random_intial_data():
        data = INTIAL_DATA

        random_scheme = random.choice(COLOR_SCHEME)

    #      {
    #     "backgroundColor": "#1A535C",
    #     "Text_Color": "#FF6B6B",
        
    # },
        # Define the keys for each category
        categories = ["square", "portrait", "landscape"]
        color_keys = {
            "backgroundColor": random_scheme["backgroundColor"],
        }
        text_color = random_scheme["Text_Color"]
        # text_background = random_scheme["Text_Background"]

        # Apply the color scheme to general properties
        for key, value in color_keys.items():
            data[key] = value

        # Apply text color
        for category in categories:
            for text_key in ["clipTitleFontColor", "showTitleFontColor", "episodeTitleFontColor", "transcriptTitleFontColor"]:
                data[category][text_key] = text_color

        # Apply text background color
        # for category in categories:
        #     for bg_key in ["clipTitleBackgroundColor", "showTitleBackgroundColor", "episodeTitleBackgroundColor", "transcriptTitleBackgroundColor"]:
        #         data[category][bg_key] = text_background

        # Apply shadow color
        # for category in categories:
        #     for shadow_key in ["clipTitleDropShadowColor", "showTitleDropShadowColor", "episodeTitleDropShadowColor", "transcriptTitleDropShadowColor", "imageDropShadowColor"]:
        #         data[category][shadow_key] = shadow_color

        return data


def create_clips(assets,podium_package_id):
    for asset in assets:
        
        data = get_random_intial_data()
        data["landscape"]["clipTitle"] = asset.title
        data["portrait"]["clipTitle"] = asset.title
        data["square"]["clipTitle"] = asset.title
        data["end"] = float(asset.end_seconds) + 1
        data["start"] = float(asset.start_seconds)
        
        clip = app.core.data_models.PodiumClipProps()
        clip.podium_package_id = podium_package_id
        clip.render_id = None
        clip.guid = str(uuid.uuid4())
        clip.input_props = json.dumps(data)
        clip.is_rendering_complete = False
        clip.title = asset.title
        clip.highlight_id = asset.guid
        clip.save()
    
    clips = app.core.data_models.PodiumClipProps \
    .where('podium_package_id', podium_package_id) \
    .order_by('id') \
    .get()  
    
    return clips
@router.get('/api/podium/internal/v1/clip/{clip_id}/progress/', include_in_schema=False)
async def get_clip_progress(clip_id: str, api_key: str = Depends(auth_scheme),
                            layout: Optional[str] = Query(None, description="name of layout"
                                                          )):
    
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    podium_clip = app.core.data_models.PodiumClipProps.where('guid',clip_id).first()
    if not podium_clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    
    podium_pacakge = app.core.data_models.PodiumPackage \
        .where('id', podium_clip.podium_package_id) \
        .first()
    
    if not podium_pacakge:
        raise HTTPException(status_code=404, detail="Media not found")

    if podium_pacakge.user_id != user.id:    
        raise HTTPException(status_code=401,detail="Asset not found")
    

    layouts = ["square", "portrait", "landscape"]
    render_ids = []
    props_data = podium_clip.input_props
    progress = 0
    
    if layout:
        if layout not in layouts:
            return{'error':"please provide a valid layout"}
        
        if "render_id" not in props_data.get(layout, {}):
            return {"status": False, "message": "Please process the clip first","url":None} 
        layouts = [layout]

    for layout_arr in layouts:
        if "render_id" not in props_data.get(layout_arr, {}):
            return {"status": False, "message": "Please process the clip first","url":None}

        if props_data[layout_arr]["render_id"]:
            render_ids.append(props_data[layout_arr]["render_id"])
            progress_data = get_progress(props_data[layout_arr]["render_id"])
            data = progress_data["progress"]

            if data["fatalErrorEncountered"]:
                podium_clip.last_rendered = None
                podium_clip.save()
                return {"status": False, "message": "Something went wrong"}
            
            if progress_data["progress"]["outputFile"]:
                podium_clip.input_props = json.dumps(props_data)
                podium_clip.save()
            
            progress += progress_data["progress"]["overallProgress"] * 100
       
        else:
            return {"status": False, "message": "Please process the clip first","url":None}
        
    podium_clip = app.core.data_models.PodiumClipProps.where('guid',clip_id).first()
           


    if len(render_ids) == 0:
        return {"status": False, "message": "Please process the clip first","url":None}

    if layout:
        value = False
        if progress == 100:
            value = True
        return {
            "render_id":render_ids,
            "status":value,
            "progress":round(progress,2),
            "url":clip_video_url_single(podium_clip,render_ids[0],layout)
            }

    if progress == 300:      
        podium_clip.is_rendering_complete = True
        podium_clip.save()
        return {
            "render_id":render_ids,
            "status":True,
            "progress":round((progress/3),2),
            "url":clip_video_url(podium_clip,render_ids)
            }       
    return {
        "render_id":render_ids,
        "status":False,
        "progress":round((progress/3),2),
        "url":None
        }       


@router.post('/api/podium/internal/v1/clip/{clip_id}/process/',  include_in_schema=False)
async def process_clip_video(clip_id: str, api_key: str = Depends(auth_scheme), 
                             layout: Optional[str] = Query(None, description="name of layout"),
):
    
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_clip = app.core.data_models.PodiumClipProps.where('guid',clip_id).first()

    if not podium_clip:
        raise HTTPException(status_code=404, detail="Podium clip not found")
    

    podium_pacakge = app.core.data_models.PodiumPackage \
        .where('id', podium_clip.podium_package_id) \
        .first()
    
    if not podium_pacakge:
        raise HTTPException(status_code=404, detail="Media not found")

    if podium_pacakge.user_id != user.id:    
        raise HTTPException(status_code=401,detail="Podium clip not found")
    
    podium_clip = app.core.data_models.PodiumClipProps.where('guid',clip_id).first()

    layouts = ["square", "portrait", "landscape"]
   
    if layout:
        if layout not in layouts:
            return{'error':"please provide a valid layout"}
        layouts = [layout]
    
    
    props_data = podium_clip.clips_props()

    input_props = podium_clip.input_props

    if podium_clip.is_rendering_complete:
        render_ids = []
        for layout in layouts:
            if "render_id"  in props_data.get(layout, {}):
                render_ids.append(input_props[layout]["render_id"])

        if len(render_ids) <= 3:    
            return ORJSONResponse({"success": True, "message": "video already processed",})
    
    # if podium_clip.last_rendered is not None:
    #     return ORJSONResponse({"success": True, "message": "video already processing"})


    # Process video for each layout type (square, portrait, landscape)

    keys_list = list(props_data["square"].keys())

    for layout in layouts:
        for key, value in props_data[layout].items():
            if layout == "square":
                props_data["hieght"] = 400
                props_data["width"] = 400
            elif layout == "portrait":
                props_data["width"] = 480
                props_data["height"] = 270
            elif layout == "landscape":
                props_data["width"] = 270
                props_data["height"] = 480

            props_data[key] = value

        input_props[layout]["render_id"] = process_video(podium_clip,props_data,layouts)
        
    # Remove unnecessary keys from props_data
    remove_keys = ["audioUrl","transcriptStarts","transcriptWords"]

    # Combine the keys with remove_keys
    allkeys = remove_keys + keys_list

    for key in allkeys:
        if key != "render_id":
            del input_props[key]
        
    podium_clip.input_props = json.dumps(input_props)
    podium_clip.last_rendered = datetime.datetime.now()
    podium_clip.save()
    # Return the response with success and data
    return ORJSONResponse({"success": True, "message": "processing video"})


@router.post('/api/podium/internal/v1/clip/{clip_id}/duplicate/',include_in_schema=False)
async def clip_duplicate(clip_id: str ,api_key: str = Depends(auth_scheme)):
    
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_clip = app.core.data_models.PodiumClipProps.where('guid',clip_id).first()

    if not podium_clip:
        raise HTTPException(status_code=404, detail="Podium clip not found")
  
    podium_pacakge = app.core.data_models.PodiumPackage \
        .where('id', podium_clip.podium_package_id) \
        .first()
    
    if not podium_pacakge:
        raise HTTPException(status_code=404, detail="Media not found")

    if podium_pacakge.user_id != user.id:    
        raise HTTPException(status_code=401,detail="Podium clip not found")

    data = app.core.data_models.PodiumClipProps \
    .where('podium_package_id', podium_clip.podium_package_id) \
    .get()

    title_arr = []
    
    for prop in data:
        title_arr.append(prop.title)


    title = podium_clip.title

    new_title = podium_clip.title
    while True:
        title = update_title(new_title)
        print("podium_clip while start",title)
        if title not in title_arr:
            break
        new_title = title

    new_preview = app.core.data_models.PodiumPackagePreview()
    new_preview.podium_package_id = podium_pacakge.id
    new_preview.original_start = podium_clip.input_props["start"]
    new_preview.original_end = podium_clip.input_props["end"]
    new_preview.start = podium_clip.input_props["start"]
    new_preview.end = podium_clip.input_props["end"]
    new_preview.highlight = podium_clip.title
    new_preview.title = title
    new_preview.score = 1
    new_preview.type = 'fathom:interesting'
    new_preview.embedding_vector = None
    new_preview.save()
    
    asset = app.core.data_models.PodiumPackageAsset()
    asset.guid = str(uuid.uuid4())
    asset.podium_package_id = podium_pacakge.id
    asset.podium_package_preview_id = new_preview.id
    asset.type = 'highlight'
    asset.format = 'text_timestamped'
    asset.title = title
    asset.content = None
    asset.start_seconds = podium_clip.input_props["start"]
    asset.end_seconds = podium_clip.input_props["end"]
    asset.accepted_variant = False
    asset.save()

    new_clip = app.core.data_models.PodiumClipProps()

    new_clip.guid = str(uuid.uuid4())
    new_clip.input_props = json.dumps(podium_clip.input_props)
    new_clip.podium_package_id = podium_clip.podium_package_id
    new_clip.title = title
    new_clip.render_id = None
    new_clip.highlight_id = asset.guid
    new_clip.is_rendering_complete = False
    new_clip.s3_key = podium_clip.s3_key
    new_clip.last_rendered = None
    new_clip.save()

    return ORJSONResponse(status_code=201,content={'id': new_clip.guid,'title':new_clip.title,'status':'Create duplicate record successfully'})
    

def update_title(title):
    match = re.search(r'(Copy \d+)$', title)
    
    if match:
        # Extract the current copy number from the match and increment it
        current_copy = int(match.group(0).split(' ')[1])
        new_copy = current_copy + 1
        # Replace the old copy number with the new copy number
        updated_title = re.sub(r'Copy \d+$', f'Copy {new_copy}', title)
    else:
        # If 'Copy <number>' is not found at the end, add 'Copy 1'
        updated_title = title + ' Copy 1'
    
    return updated_title
    
@router.post('/api/podium/internal/v1/clip/{media_id}/create/',include_in_schema=False)
async def clip_create(request: Request ,media_id: str ,api_key: str = Depends(auth_scheme)):
    
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")


    podium_pacakge = app.core.data_models.PodiumPackage \
        .where('guid', media_id) \
        .first()
    
    if not podium_pacakge:
        raise HTTPException(status_code=404, detail="Media not found")
    

    if podium_pacakge.user_id != user.id:    
        raise HTTPException(status_code=401,detail="Podium clip not found acces not allowed")

    body = await request.json()

    data = get_random_intial_data()
    
    data["landscape"]["clipTitle"] = body["title"]
    data["portrait"]["clipTitle"] = body["title"]
    data["square"]["clipTitle"] = body["title"]
    data["end"] = float(body["end"])
    data["start"] = float(body["start"])
  
    assets = app.core.data_models.PodiumPackageAsset \
        .where('podium_package_id', podium_pacakge.id) \
        .where('type','highlight') \
        .get()
    
    clips = app.core.data_models.PodiumClipProps \
        .where('podium_package_id', podium_pacakge.id) \
        .order_by('id') \
        .get()


    if len(clips) == 0 and len(assets) > 0:
       create_clips(assets,podium_pacakge.id)


    new_preview = app.core.data_models.PodiumPackagePreview()
    new_preview.podium_package_id = podium_pacakge.id
    new_preview.original_start = float(body["start"])
    new_preview.original_end = float(body["end"])
    new_preview.start = float(body["start"])
    new_preview.end = float(body["end"])
    new_preview.highlight = body["title"]
    new_preview.title = body["title"]
    new_preview.score = 1
    new_preview.type = 'fathom:interesting'
    new_preview.embedding_vector = None
    new_preview.save()


      

    asset = app.core.data_models.PodiumPackageAsset()
    asset.guid = str(uuid.uuid4())
    asset.podium_package_id = podium_pacakge.id
    asset.type = 'highlight'
    asset.podium_package_preview_id = new_preview.id
    asset.format = 'text_timestamped'
    asset.title = body["title"]
    asset.content = None
    asset.start_seconds = float(body["start"])
    asset.end_seconds = float(body["end"])
    asset.accepted_variant = True
    asset.save()

    new_clip = app.core.data_models.PodiumClipProps()

    new_clip.guid = str(uuid.uuid4())
    new_clip.podium_package_id = podium_pacakge.id
    new_clip.title = body["title"]
    new_clip.highlight_id = asset.guid
    new_clip.input_props = json.dumps(data)
    new_clip.save()

    return ORJSONResponse(status_code=201,content={'id':new_clip.guid,'status':'Create clip successfully'})
    
@router.delete('/api/podium/internal/v1/clip/{clip_id}/delete/',include_in_schema=False)
async def clip_delete(clip_id: str ,api_key: str = Depends(auth_scheme)):
    
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_clip = app.core.data_models.PodiumClipProps.where('guid',clip_id).first()

    if not podium_clip:
        raise HTTPException(status_code=404, detail="Podium clip not found")
    
    asset = app.core.data_models.PodiumPackageAsset \
        .where('guid', podium_clip.highlight_id) \
        .first()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    if asset.type == 'highlight':
        preview = app.core.data_models.PodiumPackagePreview \
            .where('id', asset.podium_package_preview_id) \
            .first()
        preview.delete()
        asset.delete()

        
    podium_pacakge = app.core.data_models.PodiumPackage \
    .where('id', podium_clip.podium_package_id) \
    .first()

    if not podium_pacakge:
        raise HTTPException(status_code=404, detail="Media not found")

    if podium_pacakge.user_id != user.id:    
        raise HTTPException(status_code=401,detail="Podium clip not found")

    podium_clip.delete()
    podium_pacakge.package_files()
    podium_pacakge.set_process_attribute('package_generated', 'true')
    podium_pacakge.touch()
    
    return {"detail": "Clip deleted successfully."}


class CreateClipResponse(BaseModel):
    clip_id: str
    url: str
    key: str
    AWSAccessKeyId: str
    policy: str
    signature: str

@router.post('/api/podium/internal/v1/clip/{clip_id}/image_upload/',  include_in_schema=False)
async def upload_image(request: Request,clip_id: str, api_key: str = Depends(auth_scheme)):
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_clip = app.core.data_models.PodiumClipProps.where('guid',clip_id).first()

    if not podium_clip:
        raise HTTPException(status_code=404, detail="Podium clip not found")
        
    podium_pacakge = app.core.data_models.PodiumPackage \
    .where('id', podium_clip.podium_package_id) \
    .first()
    
    if not podium_pacakge:
        raise HTTPException(status_code=404, detail="Media not found")

    if podium_pacakge.user_id != user.id or podium_pacakge.is_deleted == True:    
        raise HTTPException(status_code=401,detail="Asset not found")
    

    body = await request.json()
    original_filename = body["original_filename"]
    
    podium_clip.s3_key = f"images/clips/{podium_clip.guid.replace('-', '_')}/{original_filename}"
    podium_clip.save()

    s3 = boto3.client(
        's3',
        aws_access_key_id=app.core.env['aws_access_key'],
        aws_secret_access_key=app.core.env['aws_access_secret'],
        region_name = 'us-east-1',
        config=Config(s3={"use_accelerate_endpoint": True})
    )
    

    # Generate a presigned URL for S3 POST with public-read ACL
    response = s3.generate_presigned_post(
        Bucket='podium-production',
        Key=podium_clip.s3_key,
        Fields={"acl": "public-read"},
        Conditions=[
            {"acl": "public-read"},
            ["starts-with", "$key", f"images/clips/{podium_clip.guid.replace('-', '_')}/"]
        ]
    )

    return CreateClipResponse(
        clip_id=podium_clip.guid,
        url=response['url'],
        key=response['fields']['key'],
        AWSAccessKeyId=response['fields']['AWSAccessKeyId'],
        policy=response['fields']['policy'],
        signature=response['fields']['signature']
    )


@router.delete('/api/podium/internal/v1/clip/{clip_id}/image/delete',  include_in_schema=False)
async def delete_clip_image(request: Request,clip_id: str, api_key: str = Depends(auth_scheme)):
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_clip = app.core.data_models.PodiumClipProps.where('guid',clip_id).first()

    if not podium_clip:
        raise HTTPException(status_code=404, detail="Podium clip not found")
        
    podium_pacakge = app.core.data_models.PodiumPackage \
    .where('id', podium_clip.podium_package_id) \
    .first()
    
    if not podium_pacakge:
        raise HTTPException(status_code=404, detail="Media not found")

    if podium_pacakge.user_id != user.id or podium_pacakge.is_deleted == True:    
        raise HTTPException(status_code=401,detail="Asset not found")
    
    
    s3 = boto3.client(
        's3',
        aws_access_key_id=app.core.env['aws_access_key'],
        aws_secret_access_key=app.core.env['aws_access_secret'],
    )
    if podium_clip.s3_key is None:
        raise HTTPException(status_code=404, detail="Clip Image not found")
    
    try:
        s3.delete_object(Bucket='podium-production', Key=podium_clip.s3_key)
    except Exception as e:
        return ORJSONResponse({'error':e})
    podium_clip.s3_key = None
    podium_clip.save()

    return ORJSONResponse({'status':'done'})


@router.put('/api/podium/internal/v1/chapter/{chapter_id}/update',  include_in_schema=False)
async def chapter_update(request: Request,chapter_id: str, api_key: str = Depends(auth_scheme)):
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_package_chapter = app.core.data_models.PodiumPackageChapter.where('guid',chapter_id).first()

    if not podium_package_chapter:
        raise HTTPException(status_code=404, detail="Podium Chapter not found")
        

    if podium_package_chapter.podium_package.user_id != user.id or podium_package_chapter.podium_package.is_deleted == True:    
        raise HTTPException(status_code=401,detail="Podium Chapter not found")



    chapter_data = await request.json()
    # start = chapter_data.get("start")
    # end = chapter_data.get("end")

    # try:
    #     start_time = datetime.fromisoformat(start)
    #     end_time = datetime.fromisoformat(end)
    # except ValueError:
    #     raise HTTPException(status_code=400, detail="Invalid datetime format")
    
    description = chapter_data.get("description")
    summary = chapter_data.get("summary")

    podium_package_chapter.description = description
    podium_package_chapter.summary = summary
    # podium_package_chapter.summary = start_time
    # podium_package_chapter.summary = end_time


    # Save the updated chapter to the database
    podium_package_chapter.save()

    return ORJSONResponse({"success": True})
    



@router.post('/api/podium/internal/v1/chapter/create', include_in_schema=False)
async def chapter_create(
    request: Request, 
    api_key: str = Depends(auth_scheme)
):
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    chapter_data = await request.json()
    
    podium_package_id = chapter_data.get("podium_package_id")


    podium_pacakge = app.core.data_models.PodiumPackage \
        .where('guid', podium_package_id) \
        .where('user_id', user.id) \
        .where('is_deleted', False) \
        .first()
    
    if not podium_pacakge:
        raise HTTPException(status_code=404, detail="Media not found")

   
    # Parse the request body to get the chapter details

    # Extract the chapter details
    # start = chapter_data.get("start")
    # end = chapter_data.get("end")
    description = chapter_data.get("description",None)
    summary = chapter_data.get("summary",None)

    # Create a new chapter record
    new_chapter = app.core.data_models.PodiumPackageChapter()

    new_chapter.guid=str(uuid.uuid4())
    new_chapter.podium_package_id=podium_pacakge.id
    new_chapter.description=description,
    new_chapter.summary=summary,
    
    # Save the new chapter to the database
    new_chapter.save()


    new_asset = app.core.data_models.PodiumPackageAsset()
    new_asset.guid = str(uuid.uuid4())
    new_asset.podium_package_id = podium_pacakge.id
    new_asset.podium_package_chapter_id = new_chapter.id
    new_asset.type = 'show_notes_summary'
    new_asset.format = 'text'
    new_asset.title = None
    new_asset.content = None
    # new_asset.start_seconds = podium_clip.input_props["start"]
    # new_asset.end_seconds = podium_clip.input_props["end"]
    new_asset.accepted_variant = False
    new_asset.save()



    return ORJSONResponse({
        "success": True, 
        "chapter_id": new_chapter.guid,
        "asset_id": new_asset.guid,
        "description": description,
        "summary": summary
    })

@router.get('/api/podium/v1/gpt/show_notes_prompts/{guid}/{prompt}', include_in_schema=False)
async def show_notes_prompts(guid: str, prompt: str, request: Request):
    """
    Fetch and return a single response from GPT-4 engine for the given PodiumPackage and prompt.
    """
    podium_package = app.core.data_models.PodiumPackage \
        .where('guid', guid) \
        .where('is_deleted', False) \
        .first()

    if not podium_package:
        raise HTTPException(status_code=404, detail="Media not found")
    
    return EventSourceResponse(generate_document_stream(prompt,podium_package))


@router.post('/api/podium/v1/gpt/show_notes_prompts_continue_writing', include_in_schema=False)
async def show_notes_prompts_continue_writing(request: Request):

    try:
        # Extract prompt from request body
        body = await request.json()
        prompt = body.get('prompt')

        if not prompt:
            raise HTTPException(status_code=400, detail="Prompt is required")

        # Stream the GPT-4 response
        return EventSourceResponse(generate_document_stream(prompt))

    except Exception as e:
        return ORJSONResponse(status_code=500, content={"detail": str(e)})


@router.get('/api/podium/v1/gpt/continue_generate/{guid}/{prompt}', include_in_schema=False)
async def continue_generate(guid: str, prompt: str, request: Request):
   
    podium_package = app.core.data_models.PodiumPackage \
        .where('guid', guid) \
        .where('is_deleted', False) \
        .first()

    if not podium_package:
        raise HTTPException(status_code=404, detail="Media not found")

    composed_prompt = podium_package.get_composed_prompt(prompt)

    token_count = app.core.text.count_number_of_tokens(composed_prompt, model='gpt-4o')
    max_tokens = int(8150 - token_count)

    if max_tokens > 2048:
        max_tokens = 2048

    response = gpt_response(composed_prompt, 'gpt-4', max_tokens=max_tokens, temperature=1.2, top_p=0.8)
    print(response)

    return ORJSONResponse(status_code=200,content={"response":response})


async def generate_document_stream(prompt: str, podium_package=None):
    """
    Stream the generation of a document from GPT-4 without saving data in the database.
    
    :param prompt: The prompt to use for the GPT-4 engine.
    """
    if podium_package:
        composed_prompt = podium_package.get_composed_prompt(prompt)
    else:
        composed_prompt = prompt

    token_count = app.core.text.count_number_of_tokens(composed_prompt, model='gpt-4o')
    max_tokens = int(8150 - token_count)

    if max_tokens > 2048:
        max_tokens = 2048

    document_parts = []

    # Stream the response in chunks from GPT-4
    if podium_package:    
        async for chunk in gpt_chat_api_single_prompt_stream(composed_prompt, 'gpt-4', max_tokens=max_tokens, temperature=1.2, top_p=0.8):
            if 'content' in chunk['choices'][0]['delta']:
                document_parts.append(chunk['choices'][0]['delta']['content'])
            # Yield each chunk to the client as it's received
            yield json.dumps(chunk)
    else:    
        async for chunk in gpt_chat_api_single_prompt_stream(prompt, 'gpt-4', max_tokens=max_tokens, temperature=1.2, top_p=0.8):
            if 'content' in chunk['choices'][0]['delta']:
                # Extract and send only the content part
                yield chunk['choices'][0]['delta']['content']

    # Once the stream is complete, yield a finished signal
    yield '{FINISHED}'


# @retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=4, max=32))
async def gpt_chat_api_single_prompt_stream(prompt, model, max_tokens=20, temperature=0.7, top_p=1.0, frequency_penalty=0, presence_penalty=0, timeout=80):
    """
    Stream GPT-4 response in chunks asynchronously.
    """
    try:
        # Asynchronous GPT-4 API call with streaming
        response = await openai.ChatCompletion.acreate(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
            frequency_penalty=frequency_penalty,
            presence_penalty=presence_penalty,
            timeout=timeout,
            stream=True
        )

        # Stream the response chunks
        async for chunk in response:
            yield chunk
    except Exception as e:
        # Handle exceptions properly
        raise HTTPException(status_code=500, detail=str(e))

def gpt_response(prompt, model, max_tokens=20, temperature=0.7, top_p=1.0, frequency_penalty=0, presence_penalty=0, timeout=80):
    response = openai.ChatCompletion.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=top_p,
                frequency_penalty=frequency_penalty,
                presence_penalty=presence_penalty,
                timeout=timeout
            )
            
    return response['choices'][0]['message']['content']

@router.post('/api/podium/v1/show-notes-template/create', include_in_schema=False)
async def show_notes_template_create_or_update(request: Request, api_key: str = Depends(auth_scheme)):

    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    data = await request.json()
    template = data.get('templates', [])

    podium_show_notes = app.core.data_models.PodiumShowNotesTemplates.where('user_id', user.id).first()

    if podium_show_notes is None:
        podium_show_notes = app.core.data_models.PodiumShowNotesTemplates()

    podium_show_notes.user_id = user.id
    podium_show_notes.guid = str(uuid.uuid4())
    podium_show_notes.templates = template

    podium_show_notes.save()

    return {"status": True,"templates": podium_show_notes.templates}



@router.get('/api/podium/v1/show-notes-template', include_in_schema=False)
async def show_notes_template_get(request: Request, api_key: str = Depends(auth_scheme)):

    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    
    podium_show_notes = app.core.data_models.PodiumShowNotesTemplates.where('user_id', user.id).first()
    
    return {"status": True,"templates": podium_show_notes.templates}


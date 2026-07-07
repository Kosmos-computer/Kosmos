import app
from orator.query.join_clause import JoinClause
import graphene
import requests
import numpy as np
from datetime import date, timedelta
import random
import boto3
import stripe
from boto3.dynamodb.conditions import Key
from scipy.spatial.distance import *
from uuid import UUID

from . import *
import pandas as pd
from collections import defaultdict

stripe.api_key = app.env['stripe_api_key']

class Query(graphene.ObjectType):
    podcast_categories = graphene.List(
        PodcastCategory,
        description='Returns all podcast categories'
    )

    explore = graphene.List(
        PodcastCategory,
        description='Returns features, recommendations, and categories for explore'
    )

    all_podcasts = graphene.List(
        Podcast,
        description='DEPRECATED: DO NOT PULL ALL EPISODES! Retrieves all podcasts. Use only for an interim Explore page. Will be removed.'
    )

    podcast_category = graphene.Field(
        PodcastCategory,
        slug=graphene.String(required=True),
        description='Retrieves a podcast category.'
    )

    podcast = graphene.Field(
        Podcast,
        url_slug=graphene.String(required=False),
        guid=graphene.String(required=False),
        description='Retrieves podcasts and associated podcast episodes. Returns the Top 50 podcast most recent episodes for a podcast. Additional paging/filtering to come.'
    )

    podcast_episode = graphene.Field(
        PodcastEpisode,
        url_slug=graphene.String(required=False),
        guid=graphene.String(required=False),
        description='Retrieves a podcast episode.'
    )

    for_you = graphene.List(
        PodcastEpisode,
        ignore_guids=graphene.List(graphene.String, required=False),
        description='Retrieves a curated, continuously evolving list of podcast episodes for a user. Currently returning the Top 50 latest podcast episodes.'
    )

    search_podcast_episodes = graphene.List(
        PodcastEpisode,
        search_query=SearchQuery(required=True),
        fast=graphene.Boolean(required=False),
        description='Retrieves podcast episodes matching the supplied search query.'
    )

    search_podcast_episode_clips = graphene.List(
        PodcastEpisode,
        search_query=SearchQuery(required=True),
        podcast_guid=graphene.String(required=False),
        description='Retrieves podcast episode clips matching the supplied search query.'
    )

    search_podcasts = graphene.List(
        Podcast,
        search_query=SearchQuery(required=False),
        search_titles=graphene.List(graphene.String, required=False),
        search_itunes_ids=graphene.List(graphene.String, required=False),
        fast=graphene.Boolean(required=False),
        description='Retrieves podcast matching the supplied search query.'
    )

    recommended_podcasts = graphene.List(
        Podcast,
        category_ids=graphene.List(graphene.Int, required=False),
        description='Returns podcasts recommended for the authorized user'
    )

    followed_podcasts = graphene.List(
        Podcast,
        description='Returns podcasts followed by the authorized user'
    )

    followed_podcast_episodes = graphene.List(
        PodcastEpisode,
        description='Returns podcast episodes from podcasts followed by the authorized user'
    )

    followed_podcast_guids = graphene.List(
        graphene.String,
        description='Returns podcast guids followed by the authorized user'
    )

    trending_podcast_episodes = graphene.List(
        PodcastEpisode,
        description='Returns trending podcast episodes arranged for the authorized user'
    )

    download_followed_podcast_episodes = graphene.List(
        Podcast,
        episode_limit=graphene.Int(required=True),
        description='Returns podcast episodes from podcasts followed by the authorized user'
    )

    liked_podcast_episode_guids = graphene.List(
        graphene.String,
        description='Returns podcast episode guids liked by the authorized user'
    )

    liked_podcast_episodes = graphene.List(
        PodcastEpisode,
        description='Returns podcast episodes liked by the authorized user'
    )

    queue = graphene.List(
        PodcastEpisode,
        description='Returns podcast episode guids liked by the authorized user'
    )

    user_info = graphene.Field(
        UserInfo,
        description='Returns info for a User.'
    )

    system_info = graphene.Field(
        SystemInfo,
        description='Returns system info.'
    )

    initialize_clip = graphene.Field(
        Clip,
        guid=graphene.String(required=True),
        selection=graphene.Float(required=True),
        description='Returns an initialized podcast clip'
    )

    user_clips = graphene.List(
        PodcastEpisode,
        description='Returns all of a users clips'
    )

    podium_progress = graphene.Field(
        PodiumProgress,
        podiumPackageGuid=graphene.String(required=True),
        description='Returns the progress of the Podium Processing'
    )

    podium_checkout_link = graphene.Field(
        graphene.String,
        purchase_guid=graphene.String(required=True),
        success_url=graphene.String(required=True),
        cancel_url=graphene.String(required=True),
        price_id=graphene.String(required=True),
        quantity=graphene.Int(required=False),
        coupon_id=graphene.String(required=False),
        description='Returns the checkout link'
    )

    podium_get_podium_purchase = graphene.Field(
        PodiumPurchase,
        purchase_guid=graphene.String(required=True)
    )

    podium_get_user = graphene.Field(
        PodiumUser,
        email=graphene.String(required=False),
        description='Returns the authorized user for Podium'
    )

    podium_email_requires_login = graphene.Field(
        graphene.Boolean,
        email=graphene.String(required=False),
        description='Returns the authorized user for Podium'
    )

    podium_get_user_podium_packages = graphene.List(
        PodiumPackage,
        description='Returns the authorized users podium packages'
    )

    podium_get_podium_package = graphene.Field(
        PodiumPackage,
        guid=graphene.String(required=True),
        description='Returns a podium package'
    )

    podium_generate_package_document = graphene.Field(
        graphene.String,
        guid=graphene.String(required=True),
        prompt=graphene.String(required=True),
        description='Returns a podium package generated document'
    )

    async def resolve_podium_generate_package_document(self, info, guid, prompt):

        podium_package = app.core.data_models.PodiumPackage.where('guid', guid).first()

        if podium_package is None:
            raise Exception('Podium Package not found')

        generated_document = podium_package.generate_document(prompt)

        return generated_document.document

    async def resolve_podium_email_requires_login(self, info, email):
        podium_user = app.core.data_models.PodiumUser \
            .where('is_visitor', False) \
            .where(
                app.core.data_models.PodiumUser \
                .where('email', email.lower()) \
                .or_where('alternate_email', email.lower()) \
            ) \
            .first()

        if podium_user is None:
            return False

        return True

    async def resolve_podium_get_podium_purchase(self, info, purchase_guid):
        auth_user = app.auth.get_podium_user_from_info(info)

        if auth_user is None:
            raise Exception('Not authorized')

        db_purchase = app.core.data_models.PodiumPurchase.where('guid', purchase_guid).first()

        if db_purchase is None:
            raise Exception('Purchase not found')

        if db_purchase.podium_user_id != auth_user.id:
            raise Exception('Purchase invalid')

        return PodiumPurchase.convert(db_purchase)

    async def resolve_podium_checkout_link(self, info, purchase_guid, success_url, cancel_url, price_id, quantity=None, coupon_id=None):
        auth_user = app.auth.get_podium_user_from_info(info)
        if auth_user is None:
            raise Exception('Not authorized')

        product = app.core.data_models.PodiumProduct.where('stripe_price_id', price_id).first()
        if product is None:
            raise Exception('Product not found')
        
        stripe_price = stripe.Price.retrieve(price_id)
        if stripe_price is None:
            raise Exception('Stripe price id not found')

        # handle subscriber credits product switch
        if product.type == 'payment':
            product = auth_user.get_additional_credits_product()
        
        # Check for subscription upgrade/downgrade
        user_current_subscription = auth_user.get_current_subscription_purchase()
        if product.type == 'subscription' and user_current_subscription is not None and user_current_subscription.was_cancelled != True:
            purchase = app.core.data_models.PodiumPurchase()
            purchase.podium_user_id = auth_user.id
            purchase.guid = purchase_guid
            purchase.stripe_price_id = product.stripe_price_id
            purchase.podium_product_id = product.id
            purchase.quantity = quantity
            purchase.stripe_coupon_id = coupon_id
            purchase.save()

            stripe_subscription = stripe.Subscription.retrieve(user_current_subscription.stripe_subscription_id)
            stripe_subscription_item_id = stripe_subscription['items']['data'][0]['id']

            try:
                modified_subscription = stripe.Subscription.modify(
                    user_current_subscription.stripe_subscription_id,
                    items=[{
                        'id': stripe_subscription_item_id,
                        'price': product.stripe_price_id,
                    }],
                    proration_behavior='always_invoice',
                    proration_date=auth_user.get_current_subscription_proration_date(),
                    payment_behavior='error_if_incomplete',
                    metadata={
                        'modification_purchase_id': f"{purchase.guid}"
                    }
                )
            except:
                try:
                    purchase.delete()
                except:
                    pass
                raise Exception('Cannot upgrade/downgrade subscription')

            return success_url
        
        # handle incoming coupons
        discounts = []
        try:
            if coupon_id is not None:
                # TESTING ONLY handle affiliate coupon
                # if coupon_id == 'OlkE8jOE':
                #     coupon_id = 'QyHPuUmy'
                # if coupon_id == 'QyHPuUmy' and product.type == 'payment':
                #     coupon_id = None
                # if coupon_id == 'QyHPuUmy' and product.period == 'yearly':
                #     coupon_id = 'Y94tmnlM'

                # handle affiliate coupon
                # 1. Disallow coupon on payment product
                if coupon_id == 'OlkE8jOE' and product.type == 'payment':
                    coupon_id = None
                # 2. Switch to 5% off coupon for yearly product
                if coupon_id == 'OlkE8jOE' and product.period == 'yearly':
                    coupon_id = 'vy5sc17X'

                promo_code_id = None
                promo_code = stripe.PromotionCode.list(code=coupon_id, limit=1)
                if len(promo_code.data) > 0:
                    promo_code_id = promo_code.data[0].id

                discount = {}
                if promo_code_id is not None:
                    # validate promo code
                    stripe_promo_code = stripe.PromotionCode.retrieve(promo_code_id)
                    if stripe_promo_code and stripe_promo_code.active:
                        # validate coupon
                        # TODO: refactor into core method
                        stripe_coupon = stripe.Coupon.retrieve(stripe_promo_code.coupon.id, expand=['applies_to'])
                        
                        applies_to = None
                        if getattr(stripe_coupon, 'applies_to', None) is not None:
                            applies_to = stripe_coupon.applies_to.products
                        
                        if stripe_coupon and stripe_coupon.valid and (applies_to is None or stripe_price.product in applies_to):   
                            discount['promotion_code'] = promo_code_id
                            discounts.append(discount)
                else:
                    # validate coupon
                    # TODO: refactor into core method
                    stripe_coupon = stripe.Coupon.retrieve(coupon_id, expand=['applies_to'])

                    applies_to = None
                    if getattr(stripe_coupon, 'applies_to', None) is not None:
                        applies_to = stripe_coupon.applies_to.products
                    
                    if stripe_coupon and stripe_coupon.valid and (applies_to is None or stripe_price.product in applies_to):
                        discount['coupon'] = coupon_id
                        discounts.append(discount)
        except Exception as e:
            # TODO: add coupon error logging
            print(e)
            pass

        # if quantity was set, then we don't want to allow the user to change the quantity
        adjustable_quantity = []
        if quantity is None:
            quantity = 1
            adjustable_quantity = {'enabled': True, 'minimum': 1, 'maximum': 5000}
            
        purchase = app.core.data_models.PodiumPurchase()
        purchase.podium_user_id = auth_user.id
        purchase.guid = purchase_guid
        purchase.stripe_price_id = product.stripe_price_id
        purchase.podium_product_id = product.id
        purchase.quantity = quantity
        purchase.stripe_coupon_id = coupon_id
        purchase.save()

        session = stripe.checkout.Session.create(
            line_items=[{
                'price': purchase.stripe_price_id,
                'quantity': quantity,
                'adjustable_quantity': adjustable_quantity,
            }],
            mode=product.type,
            discounts=discounts,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                'quantity': f"{quantity}",
                'purchase_id': f"{purchase.guid}"
            }
        )

        purchase.stripe_checkout_session_id = session.id
        purchase.save()

        return session.url

    async def resolve_podium_get_podium_package(self, info, guid):
        fields = app.get_field_names(info)
        auth_user = app.auth.get_podium_user_from_info(info)
        podium_package = None

        db_podium_package = app.core.data_models.PodiumPackage \
            .with_('process_attributes') \
            .with_('chapters') \
            .with_('podium_package_transcript_files') \
            .with_('podium_package_transcript_files.paragraphs') \
            .where('guid', guid) \
            .order_by('created_at', 'desc') \
            .first()

        if db_podium_package is not None:
            podium_package = PodiumPackage.convert(db_podium_package, fields=fields)

        return podium_package

    async def resolve_podium_get_user_podium_packages(self, info):
        fields = app.get_field_names(info)
        print(fields)
        auth_user = app.auth.get_podium_user_from_info(info)
        podium_packages = []

        if auth_user is not None:
            db_podium_packages = app.core.data_models.PodiumPackage \
                .with_('process_attributes') \
                .with_('podium_package_audio_files') \
                .where('user_id', auth_user.id) \
                .order_by('created_at', 'desc') \
                .get()

            podium_packages = [PodiumPackage.convert(db_podium_package, fields=fields) for db_podium_package in db_podium_packages if db_podium_package.lookup_process_attribute_value('audio_stored') == "true"]

        return podium_packages

    async def resolve_podium_get_user(self, info, email=None):
        podium_user = None
        auth_user = app.auth.get_podium_user_from_info(info)

        if auth_user is not None:
            podium_user = PodiumUser.convert(auth_user)
        elif email is not None:
            # If the user is not logged in, check if they are a visitor
            db_podium_user = app.core.data_models.PodiumUser \
            .where('email', email) \
            .where('is_visitor', True) \
            .first()

            if db_podium_user is not None:
                podium_user = PodiumUser.convert(db_podium_user)

        return podium_user


    async def resolve_podium_progress(self, info, podiumPackageGuid):
        #user = app.auth.get_user_from_info(info)

        db_podium_package = app.core.data_models.PodiumPackage \
            .with_('process_attributes') \
            .where('guid', podiumPackageGuid) \
            .first()

        podium_progress = PodiumProgress.convert(db_podium_package)

        return podium_progress


    async def resolve_initialize_clip(self, info, guid=None, selection=None):
        clip = Clip()

        user = app.auth.get_user_from_info(info)
        if user is None:
            return clip

        db_podcast_episode = app.core.data_models.PodcastEpisode.where('guid', guid).first()

        generated_clip = await db_podcast_episode.generate_clip(requested_time_in_seconds=selection, size='short')
        clip.title = generated_clip['title']
        clip.start = generated_clip['start_time']
        clip.end = generated_clip['end_time']

        return clip

    async def resolve_user_clips(self, info):
        user = app.auth.get_user_from_info(info)

        # leverage existing convert function to manually load only user generated highlights
        result_podcast_episode_ids = []
        clips = defaultdict(list)
        previews = app.core.data_models.PodcastEpisodePreview \
                    .query().select('id', 'guid', 'start', 'end', 'clip_gen_point_time', 'highlight', 'title', 'type', 'score', 'podcast_episode_id') \
                    .where('podcast_episode_previews.user_id', '=', user.id) \
                    .get()

        for preview in previews:
            if preview.podcast_episode_id not in result_podcast_episode_ids:
                result_podcast_episode_ids.append(preview.podcast_episode_id)

            clip = Clip.convert(preview)

            clips[preview.podcast_episode_id].append(clip)

        podcast_episodes = []

        # only get the episodes where there is a user generated preview
        db_podcast_episodes = app.core.data_models.PodcastEpisode \
            .select('podcast_episodes.*') \
            .with_('podcast') \
            .with_('podcast.categories') \
            .with_('audio_files') \
            .with_('transcript_files') \
            .with_('chapters') \
            .where_in('podcast_episodes.id', result_podcast_episode_ids) \
            .limit(100) \
            .get()

        for db_podcast_episode in db_podcast_episodes:
            podcast_episode = PodcastEpisode.convert(db_podcast_episode, clips=clips[db_podcast_episode.id])
            podcast_episodes.append(podcast_episode)

        return podcast_episodes

    async def resolve_explore(self, info):

        explore = []
        used_podcast_ids = []

        user = app.auth.get_user_from_info(info)

        # don't include podcasts already followed
        user_followed_podcasts  = []

        if user is not None:
            user_followed_podcasts = user.followed_podcasts()
            for id in list([podcast.id for podcast in user_followed_podcasts]):
                used_podcast_ids.append(id)

        # defaults for visitors
        # TODO: Customize this for visitors based on usage
        user_podcast_categories = [1, 2, 4]

        if user is not None:
            user_podcast_categories = []
            for category in user.podcast_categories:
                user_podcast_categories.append(category.id)

            for podcast in user_followed_podcasts:
                for category in podcast.categories:
                    if category.id not in user_podcast_categories:
                        user_podcast_categories.append(category.id)


        # Category weighting not used...yet
        # user_podcast_category_weights = {}
        # for category_id in user_podcast_categories:
        #     user_podcast_category_weights[category_id] = 1

        # for podcast in user.followed_podcasts():
        #     for category in podcast.categories:
        #         if category.id in user_podcast_category_weights:
        #             user_podcast_category_weights[category.id] += 2
        #         else:
        #             user_podcast_category_weights[category.id] = 2

        # Featured
        db_featured_podcast_ids = app.core.data_models.Podcast \
            .where_not_null('title') \
            .where_not_null('featured_order') \
            .order_by('featured_order', 'asc') \
            .limit(20) \
            .lists('id') \
            .all()

        #db_featured_podcast_ids = random.sample(db_featured_podcast_ids, 5)
        featured_db_podcasts = app.core.data_models.Podcast.where_in('id', db_featured_podcast_ids).order_by('featured_order', 'asc').get()
        podcast_category = PodcastCategory()
        podcast_category.podcasts = []
        podcast_category.title = 'Featured'
        for featured_db_podcast in featured_db_podcasts:
            used_podcast_ids.append(featured_db_podcast.id)
            podcast_category.podcasts.append(Podcast.convert(featured_db_podcast))

        explore.append(podcast_category)

        # Reccomended
        if user is not None:
            # Even when we are excluding the user.followed_podcast_ids in SinglestoreUserUnitVector.get_similar_podcasts,
            # we should pass exclude_podcast_ids=used_podcast_ids, because used_podcast_ids includes the featured_db_podcast.id.
            similar_podcasts = app.core.data_models.SinglestoreUserUnitVector.get_similar_podcasts(user, count=20, exclude_podcast_ids=used_podcast_ids)

            if similar_podcasts is not None:
                # Getting the apple rank of the podcasts closest to the user taste vector.
                scored_podcasts = {}
                for podcast in similar_podcasts:
                    scored_podcasts[podcast['podcast_id']] = {
                        'id': podcast['podcast_id'],
                        'similarity': podcast['similarity']
                    }

                simliar_db_podcasts = app.core.data_models.Podcast \
                    .with_('categories') \
                    .where_in('id', [podcast['podcast_id'] for podcast in similar_podcasts]) \
                    .get()

                for podcast in simliar_db_podcasts:
                    scored_podcasts[podcast.id]['apple_rank'] = float(podcast.apple_rank)
                    scored_podcasts[podcast.id]['db_podcast'] = podcast

                #  Applying min-max approach (normalization) rescales each rank in the range of [0,1]
                similarity_min = min([o['similarity'] for o in scored_podcasts.values()])
                similarity_max = max([o['similarity'] for o in scored_podcasts.values()])
                similarity_range = (similarity_max - similarity_min) + 0.00000000001
                for podcast_id in scored_podcasts:
                    scored_podcasts[podcast_id]['similarity_norm'] = (scored_podcasts[podcast_id]['similarity'] - similarity_min) / similarity_range

                apple_rank_min = min([o['apple_rank'] for o in scored_podcasts.values()])
                apple_rank_max = max([o['apple_rank'] for o in scored_podcasts.values()])
                apple_rank_range = (apple_rank_max - apple_rank_min) + 0.00000000001
                for podcast_id in scored_podcasts:
                    scored_podcasts[podcast_id]['apple_rank_norm'] = (scored_podcasts[podcast_id]['apple_rank'] - apple_rank_min) / apple_rank_range

                for podcast_id in scored_podcasts:
                    scored_podcasts[podcast_id]['hybrid_rank'] = (scored_podcasts[podcast_id]['similarity_norm'] * 0.8) + (scored_podcasts[podcast_id]['apple_rank_norm'] * 0.2)

                recommended_db_podcasts = list(scored_podcasts.values())
                recommended_db_podcasts.sort(key=lambda o: o['hybrid_rank'], reverse=True)
                recommended_db_podcasts = [o['db_podcast'] for o in recommended_db_podcasts]

                # The first 5 recommended podcasts will not be reused next by categories.
                used_podcast_ids = used_podcast_ids + [o.id for o in recommended_db_podcasts[:5]]
            else:
                recommended_podcast_ids = app.core.data_models.PodcastCategoriesPodcast \
                    .join(JoinClause('podcasts').on('podcasts.id', '=', 'podcast_categories_podcasts.podcast_id')) \
                    .where_in('podcast_category_id', user_podcast_categories) \
                    .where_not_in('podcast_id', used_podcast_ids) \
                    .order_by('featured_multiplier', 'desc') \
                    .order_by('apple_rank', 'desc') \
                    .limit(40) \
                    .lists('podcast_id') \
                    .all()

                recommended_podcast_ids = random.sample(recommended_podcast_ids, 20)
                recommended_db_podcasts = app.core.data_models.Podcast.with_('categories').where_in('id', recommended_podcast_ids).get()

                used_podcast_ids = used_podcast_ids + [p.id for p in recommended_db_podcasts[:5]]

            podcast_category = PodcastCategory()
            podcast_category.podcasts = []
            podcast_category.title = 'Recommended'

            for recommended_db_podcast in recommended_db_podcasts:
                podcast_category.podcasts.append(Podcast.convert(recommended_db_podcast))

            explore.append(podcast_category)

        # Categories
        display_user_podcast_categories = [1, 2, 4]
        if user is not None:
            display_user_podcast_categories = []
            for category in user.podcast_categories:
                display_user_podcast_categories.append(category.id)

        db_categories = app.core.data_models.PodcastCategory.where_in('id', display_user_podcast_categories).get()

        for db_category in db_categories:
            similar_podcasts_within_category = None

            if user is not None:
                similar_podcasts_within_category = app.core.data_models.SinglestoreUserUnitVector.get_similar_podcasts_within_category(user, db_category.id, count=20, exclude_podcast_ids=used_podcast_ids)

            if similar_podcasts_within_category is not None:
                # Getting the apple rank of the podcasts closest to the user taste vector.
                scored_podcasts = {}
                for podcast in similar_podcasts_within_category:
                    scored_podcasts[podcast['podcast_id']] = {
                        'id': podcast['podcast_id'],
                        'similarity': podcast['similarity']
                    }

                simliar_db_podcasts = app.core.data_models.Podcast \
                    .with_('categories') \
                    .where_in('id', [podcast['podcast_id'] for podcast in similar_podcasts_within_category]) \
                    .get()

                for podcast in simliar_db_podcasts:
                    scored_podcasts[podcast.id]['apple_rank'] = float(podcast.apple_rank)
                    scored_podcasts[podcast.id]['db_podcast'] = podcast

                #  Applying min-max approach (normalization) rescales each rank in the range of [0,1]
                similarity_min = min([o['similarity'] for o in scored_podcasts.values()])
                similarity_max = max([o['similarity'] for o in scored_podcasts.values()])
                similarity_range = (similarity_max - similarity_min) + 0.00000000001
                for podcast_id in scored_podcasts:
                    scored_podcasts[podcast_id]['similarity_norm'] = (scored_podcasts[podcast_id]['similarity'] - similarity_min) / similarity_range

                apple_rank_min = min([o['apple_rank'] for o in scored_podcasts.values()])
                apple_rank_max = max([o['apple_rank'] for o in scored_podcasts.values()])
                apple_rank_range = (apple_rank_max - apple_rank_min) + 0.00000000001
                for podcast_id in scored_podcasts:
                    scored_podcasts[podcast_id]['apple_rank_norm'] = (scored_podcasts[podcast_id]['apple_rank'] - apple_rank_min) / apple_rank_range

                for podcast_id in scored_podcasts:
                    scored_podcasts[podcast_id]['hybrid_rank'] = (scored_podcasts[podcast_id]['similarity_norm'] * 0.8) + (scored_podcasts[podcast_id]['apple_rank_norm'] * 0.2)

                category_db_podcasts = list(scored_podcasts.values())
                category_db_podcasts.sort(key=lambda o: o['hybrid_rank'], reverse=True)
                category_db_podcasts = [o['db_podcast'] for o in category_db_podcasts]

                # The first 5 recommended podcasts will not be reused next by categories.
                used_podcast_ids = used_podcast_ids + [o.id for o in category_db_podcasts[:5]]

            else:
                category_podcast_ids = app.core.data_models.PodcastCategoriesPodcast \
                    .join(JoinClause('podcasts').on('podcasts.id', '=', 'podcast_categories_podcasts.podcast_id')) \
                    .where('podcast_category_id', db_category.id) \
                    .where_not_in('podcast_id', used_podcast_ids) \
                    .order_by('featured_multiplier', 'desc') \
                    .order_by('apple_rank', 'desc') \
                    .limit(40) \
                    .lists('podcast_id') \
                    .all()

                category_podcast_ids = random.sample(category_podcast_ids, 20)
                category_db_podcasts = app.core.data_models.Podcast.with_('categories').where_in('id', category_podcast_ids).get()
                used_podcast_ids = used_podcast_ids + [p.id for p in category_db_podcasts[:5]]

            podcast_category = PodcastCategory.convert(db_category)
            podcast_category.podcasts = []

            for category_db_podcast in category_db_podcasts:
                podcast_category.podcasts.append(Podcast.convert(category_db_podcast))

            explore.append(podcast_category)

        return explore

    async def resolve_recommended_podcasts(self, info, category_ids=None):
        user = app.auth.get_user_from_info(info)

        user_podcast_categories = []

        if user is not None:
            user_podcast_categories = []
            for category in user.podcast_categories:
                user_podcast_categories.append(category.id)

        if category_ids is not None:
            for category_id in category_ids:
                user_podcast_categories.append(category_id)


        db_category_podcast_ids = app.core.data_models.PodcastCategoriesPodcast \
            .join(JoinClause('podcasts').on('podcasts.id', '=', 'podcast_categories_podcasts.podcast_id')) \
            .where_in('podcast_category_id', user_podcast_categories) \
            .order_by('featured_multiplier', 'desc') \
            .order_by('apple_rank', 'desc') \
            .order_by('podcast_index_popularity_score', 'desc') \
            .limit(30) \
            .lists('podcast_id') \
            .all()

        recommended_db_podcasts = app.core.data_models.Podcast \
            .where_in('id', db_category_podcast_ids) \
            .order_by('apple_rank', 'desc') \
            .order_by('podcast_index_popularity_score', 'desc') \
            .get()

        recommended_podcasts = []
        for recommended_db_podcast in recommended_db_podcasts:
            recommended_podcasts.append(Podcast.convert(recommended_db_podcast))

        return recommended_podcasts

    async def resolve_user_info(self, info):
        user_info = UserInfo()
        user_info.podcast_categories = []
        user_info.attributes = []

        user = app.auth.get_user_from_info(info)

        db_podcast_categories = user.podcast_categories
        for db_podcast_category in db_podcast_categories:
            podcast_category = PodcastCategory.convert(db_podcast_category)
            user_info.podcast_categories.append(podcast_category)

        db_user_attributes = user.attributes
        for db_user_attribute in db_user_attributes:
            user_attribute = Attribute.convert(db_user_attribute)
            user_info.attributes.append(user_attribute)

        return user_info

    async def resolve_system_info(self, info):
        system_info = SystemInfo()
        system_info.attributes = []

        db_system_attributes = app.core.data_models.SystemAttribute.all()
        for db_system_attribute in db_system_attributes:
            system_attribute = Attribute.convert(db_system_attribute)
            system_info.attributes.append(system_attribute)

        return system_info

    async def resolve_podcast_categories(self, info):
        podcast_categories = []
        db_podcast_categories = app.core.data_models.PodcastCategory.all()
        for db_podcast_category in db_podcast_categories:
            podcast_category = PodcastCategory.convert(db_podcast_category)
            podcast_categories.append(podcast_category)

        return podcast_categories

    async def resolve_queue(self, info):
        queue = []
        user = app.auth.get_user_from_info(info)
        db_queued_podcast_episodes = user.queued_podcast_episodes()
        for db_podcast_episode in db_queued_podcast_episodes:
            queued_podcast_episode = PodcastEpisode.convert(db_podcast_episode)
            queue.append(queued_podcast_episode)

        return queue

    async def resolve_liked_podcast_episode_guids(self, info):
        user = app.auth.get_user_from_info(info)
        return user.liked_podcast_episode_guids()

    async def resolve_followed_podcast_guids(self, info):
        user = app.auth.get_user_from_info(info)
        return user.followed_podcast_guids()

    async def resolve_podcast_category(self, info, slug=None):
        user = app.auth.get_user_from_info(info)

        formatted_slug = slug.replace('_', ' ')
        db_podcast_category = app.core.data_models.PodcastCategory.where('title', 'ilike', formatted_slug).first()
        podcast_category = PodcastCategory.convert(db_podcast_category)

        podcast_category.podcasts = []

        similar_podcasts_within_category = None
        if user is not None:
            similar_podcasts_within_category = app.core.data_models.SinglestoreUserUnitVector.get_similar_podcasts_within_category(user, db_podcast_category.id, count=100)

        if similar_podcasts_within_category is not None:
            # Getting the apple rank of the podcasts closest to the user taste vector.
            scored_podcasts = {}
            for podcast in similar_podcasts_within_category:
                scored_podcasts[podcast['podcast_id']] = {
                    'id': podcast['podcast_id'],
                    'similarity': podcast['similarity']
                }

            simliar_db_podcasts = app.core.data_models.Podcast \
                .with_('categories') \
                .where_in('id', [podcast['podcast_id'] for podcast in similar_podcasts_within_category]) \
                .get()

            for podcast in simliar_db_podcasts:
                scored_podcasts[podcast.id]['apple_rank'] = float(podcast.apple_rank)
                scored_podcasts[podcast.id]['db_podcast'] = podcast

            #  Applying min-max approach (normalization) rescales each rank in the range of [0,1]
            similarity_min = min([o['similarity'] for o in scored_podcasts.values()])
            similarity_max = max([o['similarity'] for o in scored_podcasts.values()])
            similarity_range = (similarity_max - similarity_min) + 0.00000000001
            for podcast_id in scored_podcasts:
                scored_podcasts[podcast_id]['similarity_norm'] = (scored_podcasts[podcast_id]['similarity'] - similarity_min) / similarity_range

            apple_rank_min = min([o['apple_rank'] for o in scored_podcasts.values()])
            apple_rank_max = max([o['apple_rank'] for o in scored_podcasts.values()])
            apple_rank_range = (apple_rank_max - apple_rank_min) + 0.00000000001
            for podcast_id in scored_podcasts:
                scored_podcasts[podcast_id]['apple_rank_norm'] = (scored_podcasts[podcast_id]['apple_rank'] - apple_rank_min) / apple_rank_range

            for podcast_id in scored_podcasts:
                scored_podcasts[podcast_id]['hybrid_rank'] = scored_podcasts[podcast_id]['similarity_norm'] #(scored_podcasts[podcast_id]['similarity_norm'] * 0.8) + (scored_podcasts[podcast_id]['apple_rank_norm'] * 0.2)

            category_db_podcasts = list(scored_podcasts.values())
            category_db_podcasts.sort(key=lambda o: o['hybrid_rank'], reverse=True)
            category_db_podcasts = [o['db_podcast'] for o in category_db_podcasts]

        else:
            category_db_podcasts = app.core.data_models.Podcast \
                .join(JoinClause('podcast_categories_podcasts').on('podcasts.id', '=', 'podcast_categories_podcasts.podcast_id')) \
                .with_('categories') \
                .where('podcast_categories_podcasts.podcast_category_id', db_podcast_category.id) \
                .order_by('podcasts.apple_rank', 'desc') \
                .order_by('podcasts.podcast_index_popularity_score', 'desc') \
                .select('podcasts.*') \
                .limit(100) \
                .get()
                # TODO: improve performance here
                #.select('podcasts.id', 'podcasts.guid', 'podcasts.url_slug', 'podcasts.title', 'podcasts.name_id', 'podcasts.s3_bucket', 'podcasts.hero_image_s3_key') \

        for category_db_podcast in category_db_podcasts:
            podcast_category.podcasts.append(Podcast.convert(category_db_podcast))

        return podcast_category


    async def resolve_podcast(self, info, url_slug=None, guid=None):
        podcast = None
        db_podcast = None
        user = app.auth.get_user_from_info(info)

        db_podcast = app.core.data_models.Podcast \
            .with_('categories')

        if url_slug:
            try:
                # test to check if the url slug is a valid UUID
                guid = UUID(url_slug)
                db_podcast = db_podcast.where('guid', str(guid))

            except ValueError:
                db_podcast = db_podcast.where('url_slug', url_slug) \
                    .or_where('name_id', url_slug) \
                    .or_where('itunes_id', url_slug)
        elif guid:
            db_podcast = db_podcast.where('guid', guid)

        db_podcast = db_podcast.first()

        if db_podcast:
            episode_count = app.core.data_models.PodcastEpisode.where('podcast_id', db_podcast.id).count()

            if db_podcast.processing_level > 1 and episode_count > 0:
                podcast = Podcast.convert(db_podcast)
            else:
                db_podcast.update_from_rss()
                db_podcast = app.core.data_models.Podcast \
                    .with_('categories') \
                    .where('id', db_podcast.id) \
                    .first()
                podcast = Podcast.convert(db_podcast)

                # If a user is accessing this podcast, we'll increase the processing level
                if user:
                    db_podcast.processing_level = 2
                    db_podcast.save()

            if user:
                user.update_last_viewed_for_podcast(db_podcast)

        return podcast

    async def resolve_podcast_episode(self, info, url_slug=None, guid=None):
        user = app.auth.get_user_from_info(info)

        db_podcast_episode = None
        pinned_highlights = None

        def add_previews_to_db_podcast_episode(db_podcast_episode):
            db_podcast_episode = db_podcast_episode.with_({'previews': app.core.data_models.PodcastEpisodePreview.query().where_null('user_id').select('id', 'start', 'end', 'highlight', 'title', 'type', 'score', 'podcast_episode_id')})
            return db_podcast_episode

        db_podcast_episode = app.core.data_models.PodcastEpisode \
            .with_('audio_files') \
            .with_('chapters') \
            .with_('transcript_files') \
            .with_('podcast') \

        if user is not None:
            user_queue_podcast_episodes_clause = JoinClause('user_queue_podcast_episodes') \
                .on('user_queue_podcast_episodes.podcast_episode_id', '=', 'podcast_episodes.id') \
                .where('user_queue_podcast_episodes.user_id', '=', user.id)
            db_podcast_episode = db_podcast_episode.left_join(user_queue_podcast_episodes_clause)
            db_podcast_episode = db_podcast_episode.select('podcast_episodes.*', 'user_queue_podcast_episodes.last_position')
        else:
            db_podcast_episode = db_podcast_episode.select('podcast_episodes.*')

        if url_slug:
            # pin highlight...
            if '_H_' in url_slug:
                start = url_slug.index('_H_') + 3
                end = url_slug[start:].index('_') + start
                highlight_id = url_slug[start:end]
                url_slug = url_slug[:start-3]
                db_pinned_highlight = app.core.data_models.PodcastEpisodePreview.find(int(highlight_id))
                if db_pinned_highlight:
                    pinned_highlight = Highlight()
                    pinned_highlight.start = db_pinned_highlight.start
                    if db_pinned_highlight.title is not None:
                        pinned_highlight.end = db_pinned_highlight.end
                    else:
                        pinned_highlight.end = db_pinned_highlight.start + 40 #preview.end
                    pinned_highlight.snippet = db_pinned_highlight.highlight
                    pinned_highlight.context = ''
                    pinned_highlight.type = HighlightType.PREVIEW
                    pinned_highlight.origin = db_pinned_highlight.type
                    pinned_highlight.title = db_pinned_highlight.title
                    pinned_highlight.url_slug = f"_H_{db_pinned_highlight.id}_"

                    pinned_highlights = []
                    pinned_highlights.append(pinned_highlight)
            else:
                db_podcast_episode = add_previews_to_db_podcast_episode(db_podcast_episode)

            db_podcast_episode = db_podcast_episode.where('url_slug', 'like', f"%{url_slug}%")
        elif guid:
            db_podcast_episode = add_previews_to_db_podcast_episode(db_podcast_episode)
            db_podcast_episode = db_podcast_episode.where('guid', guid)

        db_podcast_episode = db_podcast_episode.order_by('publication_date', 'desc').first()

        user_taste_vector = None
        if user is not None:
            user_taste_vector = await user.get_quick_taste_vector()

        if user_taste_vector is None and db_podcast_episode.primary_vector() is not None:
            user_taste_vector = db_podcast_episode.primary_vector().vector

        podcast_episode = PodcastEpisode.convert(db_podcast_episode, user_taste_vector=user_taste_vector, highlights=pinned_highlights)

        return podcast_episode

    async def resolve_all_podcasts(self, info):
        podcasts = []
        db_podcasts = app.core.data_models.Podcast.all()
        for db_podcast in db_podcasts:
            podcasts.append(Podcast.convert(db_podcast))

        return podcasts

    async def resolve_followed_podcasts(self, info):
        user = app.auth.get_user_from_info(info)

        podcasts = []
        db_podcasts = user.followed_podcasts()
        for db_podcast in db_podcasts:
            podcasts.append(Podcast.convert(db_podcast))

        return podcasts

    async def resolve_download_followed_podcast_episodes(self, info, episode_limit=1):
        user = app.auth.get_user_from_info(info)
        fields = app.get_field_names(info)

        podcasts = []
        db_podcasts = user.followed_podcasts()
        db_podcasts = sorted(db_podcasts, key=lambda podcast: podcast.last_publish_on, reverse=True)

        for db_podcast in db_podcasts:
            podcasts.append(Podcast.convert(db_podcast))

        for podcast in podcasts:
            db_podcast_episodes = app.core.data_models.PodcastEpisode \
                .with_('audio_files') \
                .where('podcast_id', podcast.info.internal_id) \
                .order_by('publication_date', 'desc') \
                .order_by('id', 'desc') \
                .limit(episode_limit) \
                .get()

            podcast_episodes = []
            for db_podcast_episode in db_podcast_episodes:
                podcast_episode = PodcastEpisode.convert(db_podcast_episode, fields=fields)
                podcast_episodes.append(podcast_episode)

            podcast.episodes = podcast_episodes

        return podcasts

    async def resolve_followed_podcast_episodes(self, info):
        user = app.auth.get_user_from_info(info)

        user_taste_vector = None
        if user is not None:
            user_taste_vector = await user.get_quick_taste_vector()

        podcast_episodes = []

        user_queue_podcast_episodes_clause = JoinClause('user_queue_podcast_episodes') \
            .on('user_queue_podcast_episodes.podcast_episode_id', '=', 'podcast_episodes.id') \
            .where('user_queue_podcast_episodes.user_id', '=', user.id) \

        user_podcast_follows_clause = JoinClause('user_podcast_follows') \
            .on('user_podcast_follows.podcast_id', '=', 'podcast_episodes.podcast_id') \
            .where('user_podcast_follows.user_id', '=', user.id) \

        db_podcast_episodes = app.core.data_models.PodcastEpisode \
            .join(user_podcast_follows_clause) \
            .left_join(user_queue_podcast_episodes_clause) \
            .select('podcast_episodes.*', 'user_queue_podcast_episodes.last_position') \
            .with_('vectors') \
            .with_('podcast') \
            .with_('podcast.categories') \
            .with_('audio_files') \
            .with_('transcript_files') \
            .with_('chapters') \
            .with_({'previews': app.core.data_models.PodcastEpisodePreview.query().where_null('user_id').where_not_null('title').select('id', 'start', 'end', 'highlight', 'title', 'type', 'score', 'podcast_episode_id')}) \
            .where_not_null('rss_audio_url') \
            .where_null('user_queue_podcast_episodes.id') \
            .order_by('publication_date', 'desc') \
            .limit(50) \
            .get()

        db_podcast_episodes_with_titled_previews = []
        db_podcast_episodes_without_titled_previews = []
        for db_podcast_episode in db_podcast_episodes:
            if len(db_podcast_episode.previews) > 0 and db_podcast_episode.primary_vector() is not None:
                db_podcast_episodes_with_titled_previews.append(db_podcast_episode)
            elif db_podcast_episode.primary_vector() is not None:
                db_podcast_episodes_without_titled_previews.append(db_podcast_episode)

        # ensure db_podcast_episodes_with_titled_previews has at least 30 items
        # if not, fill the rest with db_podcast_episodes_without_titled_previews
        if len(db_podcast_episodes_with_titled_previews) < 30:
            db_podcast_episodes_with_titled_previews.extend(db_podcast_episodes_without_titled_previews[:30-len(db_podcast_episodes_with_titled_previews)])

        # order db_podcast_episodes_with_titled_previews by publication_date
        db_podcast_episodes_with_titled_previews = sorted(db_podcast_episodes_with_titled_previews, key=lambda x: x.publication_date, reverse=True)

        # group db_podcast_episodes_with_titled_previews by publication date into buckets based on the day buckets array
        day_buckets = [1,2,3,5,8]
        day_buckets_index = 0
        db_podcast_episodes_with_titled_previews_by_bucket = []
        for db_podcast_episode in db_podcast_episodes_with_titled_previews:
            if len(db_podcast_episodes_with_titled_previews_by_bucket) == 0:
                db_podcast_episodes_with_titled_previews_by_bucket.append([db_podcast_episode])
            else:
                last_bucket = db_podcast_episodes_with_titled_previews_by_bucket[-1]
                if last_bucket[0].publication_date - db_podcast_episode.publication_date < timedelta(days=day_buckets[day_buckets_index]):
                    last_bucket.append(db_podcast_episode)
                else:
                    db_podcast_episodes_with_titled_previews_by_bucket.append([db_podcast_episode])

                    if day_buckets_index < len(day_buckets) - 1:
                        day_buckets_index += 1


        # order the episodes within each bucket by the cosine similarity of their primary vector to the user's taste vector
        for bucket in db_podcast_episodes_with_titled_previews_by_bucket:
            bucket.sort(key=lambda x: x.primary_vector().cosine_similarity(user_taste_vector), reverse=True)
            for episode in bucket:
                app.core.log.debug("Podcast:" + episode.podcast.title)
                app.core.log.debug("Episode:" + episode.title)
                app.core.log.debug(episode.primary_vector().cosine_similarity(user_taste_vector))
                app.core.log.debug(episode.publication_date)
                app.core.log.debug('---')
            app.core.log.debug('***************************************')

        # flatten the weeks into a single list
        db_podcast_episodes_with_titled_previews = [item for sublist in db_podcast_episodes_with_titled_previews_by_bucket for item in sublist]

        # space out the episodes if they have the same podcast_id
        db_podcast_episodes_with_titled_previews_spaced_out = []
        while len(db_podcast_episodes_with_titled_previews) > 0:
            if len(db_podcast_episodes_with_titled_previews_spaced_out) == 0:
                db_podcast_episodes_with_titled_previews_spaced_out.append(db_podcast_episodes_with_titled_previews.pop(0))
            else:
                last_episode = db_podcast_episodes_with_titled_previews_spaced_out[-1]
                if last_episode.podcast_id == db_podcast_episodes_with_titled_previews[0].podcast_id:
                    # find next episode with a different podcast_id
                    found_different = False
                    for i in range(len(db_podcast_episodes_with_titled_previews)):
                        if db_podcast_episodes_with_titled_previews[i].podcast_id != last_episode.podcast_id:
                            db_podcast_episodes_with_titled_previews_spaced_out.append(db_podcast_episodes_with_titled_previews.pop(i))
                            found_different = True
                            break
                    if not found_different:
                        db_podcast_episodes_with_titled_previews_spaced_out.append(db_podcast_episodes_with_titled_previews.pop(0))
                else:
                    db_podcast_episodes_with_titled_previews_spaced_out.append(db_podcast_episodes_with_titled_previews.pop(0))
#
        for db_podcast_episode in db_podcast_episodes_with_titled_previews_spaced_out:
            if user_taste_vector is None and db_podcast_episode.primary_vector() is not None:
                user_taste_vector = db_podcast_episode.primary_vector().vector

            podcast_episode = PodcastEpisode.convert(db_podcast_episode, user_taste_vector=user_taste_vector)
            podcast_episodes.append(podcast_episode)

        return podcast_episodes

    async def resolve_trending_podcast_episodes(self, info):
        user = app.auth.get_user_from_info(info)
        if user is None:
            return []

        user_taste_vector = await user.get_quick_taste_vector()

        db_trending_episodes = await user.get_trending_episode_recommendations()

        db_trending_episodes_ids = []
        db_trending_episodes_sort = {}
        for index, episode in enumerate(db_trending_episodes):
            db_trending_episodes_sort[episode.id] = {
                'index': index,
                'episode': None
            }
            db_trending_episodes_ids.append(episode.id)

        db_trending_episodes_full = app.core.data_models.PodcastEpisode \
            .select('podcast_episodes.*') \
            .with_('vectors') \
            .with_('podcast') \
            .with_('podcast.categories') \
            .with_('audio_files') \
            .with_('transcript_files') \
            .with_('chapters') \
            .with_({'previews': app.core.data_models.PodcastEpisodePreview.query().where_null('user_id').where_not_null('title').select('id', 'start', 'end', 'highlight', 'title', 'type', 'score', 'podcast_episode_id')}) \
            .where_not_null('rss_audio_url') \
            .where_in('podcast_episodes.id', db_trending_episodes_ids) \
            .get()

        for episode in db_trending_episodes_full:
            db_trending_episodes_sort[episode.id]['episode'] = episode

        db_trending_episodes_full_sorted = sorted(db_trending_episodes_sort.values(), key=lambda x: x['index'])
        db_trending_episodes_full_sorted = [x['episode'] for x in db_trending_episodes_full_sorted]

        podcast_episodes = []
        for db_podcast_episode in db_trending_episodes_full_sorted:
            if user_taste_vector is None and db_podcast_episode.primary_vector() is not None:
                user_taste_vector = db_podcast_episode.primary_vector().vector

            podcast_episode = PodcastEpisode.convert(db_podcast_episode, user_taste_vector=user_taste_vector)
            podcast_episodes.append(podcast_episode)

        return podcast_episodes

    async def resolve_liked_podcast_episodes(self, info):
        user = app.auth.get_user_from_info(info)

        podcast_episodes = []

        user_queue_podcast_episodes_clause = JoinClause('user_queue_podcast_episodes') \
            .on('user_queue_podcast_episodes.podcast_episode_id', '=', 'podcast_episodes.id') \
            .where('user_queue_podcast_episodes.user_id', '=', user.id) \

        user_podcast_episode_likes_clause = JoinClause('user_podcast_episode_likes') \
            .on('user_podcast_episode_likes.podcast_episode_id', '=', 'podcast_episodes.id') \
            .where('user_podcast_episode_likes.user_id', '=', user.id) \

        db_podcast_episodes = app.core.data_models.PodcastEpisode \
            .join(user_podcast_episode_likes_clause) \
            .left_join(user_queue_podcast_episodes_clause) \
            .select('podcast_episodes.*', 'user_queue_podcast_episodes.last_position') \
            .with_('podcast') \
            .with_('podcast.categories') \
            .with_('audio_files') \
            .with_('transcript_files') \
            .with_('chapters') \
            .with_({'previews': app.core.data_models.PodcastEpisodePreview.query().where_null('user_id').select('id', 'start', 'end', 'highlight', 'title', 'type', 'score', 'podcast_episode_id')}) \
            .order_by('user_podcast_episode_likes.created_at', 'desc') \
            .limit(100) \
            .get()

        for db_podcast_episode in db_podcast_episodes:
            podcast_episode = PodcastEpisode.convert(db_podcast_episode)
            podcast_episodes.append(podcast_episode)

        return podcast_episodes

    async def resolve_search_podcasts(self, info, search_query=None, search_titles=None, search_itunes_ids=None, fast=None):
        podcast_search_results = []

        user = app.auth.get_user_from_info(info)
        user_id = None
        if user is not None:
            user_id = user.id

        # Handle regular query
        if search_query is not None:
            payload = {
                'query': search_query.query,
                'user_id': user_id,
                'fast': False
            }

            if fast:
                payload['fast'] = True

            response = requests.post(
                app.env['engine_api_url'] + '/search/query/podcasts',
                json=payload
            )

            if len(response.json()['results']) > 0:
                podcast_score_map = {}
                for result in response.json()['results']:
                    podcast_score_map[result['guid']] = {
                        'score': result['score'],
                        'podcast': None
                    }

                db_podcasts = app.core.data_models.Podcast \
                    .where_in('guid', list([r['guid'] for r in response.json()['results']])) \
                    .get()

                for db_podcast in db_podcasts:
                    podcast_score_map[db_podcast.guid]['podcast'] = db_podcast

                scored_db_podcasts = list(podcast_score_map.values())
                scored_db_podcasts.sort(key=lambda o: o['score'], reverse=True)

                for db_podcast in [o['podcast'] for o in scored_db_podcasts]:
                    podcast_search_results.append(Podcast.convert(db_podcast))

        # Handle titles query
        elif search_titles is not None:
            db_podcasts = app.core.data_models.Podcast \
                .where_in('title', search_titles) \
                .order_by('title', 'asc') \
                .order_by('apple_rank', 'desc') \
                .order_by('podcast_index_popularity_score', 'desc') \
                .get()

            used_titles = []
            for db_podcast in db_podcasts:
                if db_podcast.title not in used_titles:
                    used_titles.append(db_podcast.title)
                    podcast_search_results.append(Podcast.convert(db_podcast))

        # Handle itunes ids query
        elif search_itunes_ids is not None:
            db_podcasts = app.core.data_models.Podcast \
                .where_in('itunes_id', search_itunes_ids) \
                .order_by('title', 'asc') \
                .get()

            for db_podcast in db_podcasts:
                podcast_search_results.append(Podcast.convert(db_podcast))


        return podcast_search_results

    async def resolve_search_podcast_episodes(self, info, search_query, fast=None):
        podcast_episode_search_results = []
        result_podcast_episode_guids = {}
        space_out_episodes = False

        # TODO: Make call to engine async
        user = app.auth.get_user_from_info(info)

        user_id = None
        if user is not None:
            user_id = user.id

        podcast_match = { "term" : { "podcast_guid": search_query.podcast_guid } }

        if fast:
            search = {
                "query": {
                    "bool": {
                        "should": [
                            {
                                "multi_match": {
                                    "query": search_query.query,
                                    "type": "bool_prefix",
                                    "fields": [
                                        "combined_title_typing",
                                        "combined_title_typing._2gram^2",
                                        "combined_title_typing._3gram^3"
                                    ]
                                }
                            },
                            {
                                "match": {
                                    "combined_title_typing": {
                                        "query": search_query.query + ".*",
                                        "fuzziness": 1
                                    }
                                }
                            }
                        ]
                    }
                }
            }

            if search_query.podcast_guid is not None:
                search['query']['bool']['filter'] = podcast_match

            results = app.core.elastic.search(search, index="podcast_episodes", size=7)

            if results['hits']['hits']:
                for result in results['hits']['hits']:
                    print(result)
                    result_podcast_episode_guids[result['_source']['podcast_episode_guid']] = {
                        "score": result['_score'],
                        "podcast_episode": None
                    }
        else:
            search_intent_category = app.core.inference.categorize_episode_search_query_intent(search_query.query)

            podcast = None
            if search_query.podcast_guid is not None:
                podcast = app.core.data_models.Podcast \
                    .where('guid', search_query.podcast_guid) \
                    .first()

            new_search = app.core.data_models.UserSearch()
            new_search.search_query = search_query.query
            new_search.search_intent_category = search_intent_category
            if user is not None:
                new_search.user_id = user.id
            if podcast is not None:
                new_search.podcast_id = podcast.id
            new_search.save()

            search = {
                "query": {
                    "bool": {
                        "should": [
                            {
                                "match": {
                                    "combined_title": {
                                        "query": search_query.query + ".*",
                                        "fuzziness": 3
                                    }
                                }
                            }
                        ]
                    }
                }
            }

            if search_query.podcast_guid is not None:
                search['query']['bool']['filter'] = podcast_match

            results = app.core.elastic.search(search, index="podcast_episodes", size=15)


            if search_intent_category in [6,7]:
                # podcast search, or topic / question search

                # if no podcast guid, then space out episodes to show more variety
                if podcast is None:
                    space_out_episodes = True

                query_for_embedding_vector = search_query.query
                query_embedding_vector = await app.core.inference.text_embedding_vector(query_for_embedding_vector)

                # first score keyword results semantically...
                if results['hits']['hits']:
                    max_score = results['hits']['hits'][0]['_score']
                    titles = []
                    for result in results['hits']['hits']:
                        title_for_vector = ""
                        if result['_source']['combined_title'] is not None:
                            title_for_vector += result['_source']['combined_title'] + " | "
                        if result['_source']['description'] is not None:
                            title_for_vector += result['_source']['description']
                        titles.append(title_for_vector)

                    title_vectors = await app.core.inference.text_embedding_vectors_with_workers(titles, chunk_size=5)
                    title_vectors = title_vectors['embedding_vectors']

                    for index, result in enumerate(results['hits']['hits']):
                        similarity_score = 1.6 * (result['_score'] / (max_score + 0.0001)) * app.core.vector.cosine_similarity(query_embedding_vector, title_vectors[index])
                        print(result['_score'])
                        print(similarity_score)
                        print("------")
                        result_podcast_episode_guids[result['_source']['podcast_episode_guid']] = {
                            "score": min(0.85, similarity_score),
                            "original_keyword_score": result['_score'],
                            "podcast_episode": None,
                            "source": "keyword"
                        }

                # next, retrieve semantic matches
                keyword_segment_matches = await app.core.data_models.TranscriptFile.match_search_segments(search_query.query, None, 50)
                keyword_vectors = []
                keyword_vector_weights = []
                #print(len(keyword_segment_matches))
                if len(keyword_segment_matches) > 5:
                    for keyword_segment_match in keyword_segment_matches:
                        #print(keyword_segment_match['_score'])
                        #print(keyword_segment_match['_source']['content'])
                        #print("---------------------------------------------------------------")
                        keyword_vectors.append(np.array(keyword_segment_match['_source']['embedding_vector']).astype(float))
                        keyword_vector_weights.append(keyword_segment_match['_score'])

                    query_embedding_vector = np.average(
                        keyword_vectors,
                        weights=keyword_vector_weights,
                        axis=0
                    )
                    query_embedding_vector = np.array(query_embedding_vector).astype(float)
                    query_embedding_vector = query_embedding_vector / np.linalg.norm(query_embedding_vector)

                semantic_match_similarity_score_map = {}
                if podcast is not None:
                    semantic_match_episode_ids = app.core.data_models.SinglestorePodcastEpisodeUnitVector.get_vector_search_episode_ids(query_embedding_vector, podcast_id=podcast.id)
                else:
                    semantic_match_episode_ids = app.core.data_models.SinglestorePodcastEpisodeUnitVector.get_vector_search_episode_ids(query_embedding_vector)

                db_semantic_podcast_episodes = app.core.data_models.PodcastEpisode \
                    .join(JoinClause('podcasts').on('podcasts.id', '=', 'podcast_episodes.podcast_id')) \
                    .with_('vectors') \
                    .with_('podcast') \
                    .with_('podcast.categories') \
                    .with_('audio_files') \
                    .with_('transcript_files') \
                    .with_('chapters') \
                    .with_({'previews': app.core.data_models.PodcastEpisodePreview.query() \
                        .where_null('user_id') \
                        .where('type', 'fathom:representative') \
                        .select('id', 'start', 'end', 'highlight', 'title', 'type', 'score', 'podcast_episode_id') \
                        .order_by('score', 'desc')}) \
                    .select('podcast_episodes.*') \
                    .where_in('podcast_episodes.id', list(semantic_match_episode_ids)) \
                    .where('podcasts.language', 'english') \
                    .order_by('publication_date', 'desc') \
                    .get()

                for db_semantic_podcast_episode in db_semantic_podcast_episodes:
                    primary_vector = db_semantic_podcast_episode.primary_vector()
                    if primary_vector is not None:
                        score = 0
                        query_similarity = app.core.vector.cosine_similarity(query_embedding_vector, primary_vector.vector)
                        if user is not None:
                            user_vector = await user.get_quick_taste_vector()
                            if user_vector is not None:
                                user_similarity = app.core.vector.cosine_similarity(user_vector, primary_vector.vector)
                                score = np.average([query_similarity, user_similarity], weights=[0.8, 0.2])
                        else:
                            score = query_similarity

                        semantic_match_similarity_score_map[db_semantic_podcast_episode.guid] = {
                            "score": score,
                            "podcast_episode": db_semantic_podcast_episode
                        }
                for key, value in semantic_match_similarity_score_map.items():
                    if key in result_podcast_episode_guids:
                        # bump to top with 2 * score
                        result_podcast_episode_guids[key]['score'] = 2 * np.max([result_podcast_episode_guids[key]['score'], value['score']])
                        result_podcast_episode_guids[key]['original_keyword_score'] = 0
                        result_podcast_episode_guids[key]['podcast_episode'] = value['podcast_episode']
                        result_podcast_episode_guids[key]['source'] = 'semantic/keyword'
                    else:
                        result_podcast_episode_guids[key] = value
                        result_podcast_episode_guids[key]['source'] = 'semantic'
                        result_podcast_episode_guids[key]['original_keyword_score'] = 0

            else:
                if results['hits']['hits']:
                    for index, result in enumerate(results['hits']['hits']):
                        result_podcast_episode_guids[result['_source']['podcast_episode_guid']] = {
                            "score": result['_score'],
                            "original_keyword_score": result['_score'],
                            "podcast_episode": None,
                            "source": "keyword"
                        }

        # retrieve podcast episodes from database
        podcast_episode_guids_to_retrieve = []
        for key, value in result_podcast_episode_guids.items():
            if value['podcast_episode'] is None:
                podcast_episode_guids_to_retrieve.append(key)

        db_podcast_episodes = app.core.data_models.PodcastEpisode \
            .with_('vectors') \
            .with_('podcast') \
            .with_('podcast.categories') \
            .with_('audio_files') \
            .with_('transcript_files') \
            .with_('chapters') \
            .with_({'previews': app.core.data_models.PodcastEpisodePreview.query() \
                .where_null('user_id') \
                .where('type', 'fathom:representative') \
                .select('id', 'start', 'end', 'highlight', 'title', 'type', 'score', 'podcast_episode_id') \
                .order_by('score', 'desc')}) \
            .where_in('guid', podcast_episode_guids_to_retrieve) \
            .order_by('publication_date', 'desc') \
            .get()

        for db_podcast_episode in db_podcast_episodes:
            result_podcast_episode_guids[db_podcast_episode.guid]['podcast_episode'] = db_podcast_episode

        # debug
        #for key, value in result_podcast_episode_guids.items():
        #    print(value['podcast_episode'].podcast.title)
        #    print(value['podcast_episode'].title)
        #    print(value['score'])
        #    if 'original_keyword_score' in value:
        #        print(value['original_keyword_score'])
        #    if 'original_similarity_score' in value:
        #        print(value['original_similarity_score'])
        #    if 'source' in value:
        #        print(value['source'])
        #    print('----------------')

        if space_out_episodes:
            # punish episodes that were not AI processed
            for key, value in result_podcast_episode_guids.items():
                primary_vector = value['podcast_episode'].primary_vector()
                if primary_vector is None:
                    value['score'] = value['score'] * 0.70

        scored_podcast_episodes = list(result_podcast_episode_guids.values())
        scored_podcast_episodes.sort(key=lambda o: o['score'], reverse=True)

        db_podcast_episode_search_results = []
        for scored_podcast_episode in scored_podcast_episodes:
            db_podcast_episode_search_results.append(scored_podcast_episode['podcast_episode'])

        if space_out_episodes:
            db_podcast_episode_search_results = app.core.data_models.PodcastEpisode.space_out_episodes(db_podcast_episode_search_results)

        podcast_episode_search_results = []
        for podcast_episode in db_podcast_episode_search_results:
            podcast_episode_search_results.append(PodcastEpisode.convert(podcast_episode, fast=True))

        return podcast_episode_search_results

    async def resolve_search_podcast_episode_clips(self, info, search_query):
        podcast_search_results = []

        # TODO: Make call to engine async, handle insertion while waiting...
        user = app.auth.get_user_from_info(info)
        new_search = app.core.data_models.UserSearch()
        if user is not None:
            new_search.user_id = user.id
        new_search.search_query = search_query.query
        new_search.save()

        user_id = None
        if user is not None:
            user_id = user.id

        response = requests.post(
            app.env['engine_api_url'] + '/search/query',
            json={
                'query': search_query.query,
                'podcast_id': search_query.podcast_guid,
                'user_id': user_id
            }
        )

        result_podcast_episode_guids = []
        highlights = {}
        for result in response.json()['results']:
            if result['podcast_episode_id'] not in result_podcast_episode_guids:
                result_podcast_episode_guids.append(result['podcast_episode_id'])

                highlight = Highlight()
                highlight.start = result['start']
                highlight.end = result['start'] + 40 # default clip length
                highlight.score = result['score']
                highlight.snippet = result['highlight']
                highlight.context = result['content']
                if result['highlight_type'] == 'answer':
                    highlight.type = HighlightType.SEARCH_ANSWER
                else:
                    highlight.type = HighlightType.SEARCH_RESULT
                highlight.origin = 'fathom:search'

                highlights[result['podcast_episode_id']] = highlight

        db_podcast_episodes = app.core.data_models.PodcastEpisode \
            .with_('podcast') \
            .with_('podcast.categories') \
            .with_('audio_files') \
            .with_('transcript_files') \
            .with_('chapters') \
            .where_in('guid', result_podcast_episode_guids) \
            .order_by('publication_date', 'desc') \
            .get()

        for db_podcast_episode in db_podcast_episodes:
            podcast_episode = PodcastEpisode.convert(db_podcast_episode, highlights=[highlights[db_podcast_episode.guid]])
            podcast_search_results.append(podcast_episode)

        podcast_search_results = sorted(podcast_search_results, key=lambda x: (x.highlights[0].type != HighlightType.SEARCH_ANSWER, 1.00 / (x.highlights[0].score + 1.00), x.publication_date))

        # spread out results from same podcast...
        used_indexes = {}

        def find_next_unique_result(current_index, results):
            current_id = results[current_index].internal_podcast_id
            for index in range(current_index + 1, len(results)):
                if index not in used_indexes and results[index].internal_podcast_id != current_id:
                    return results[index], index
            return None, None

        distributed_results = []
        last_id = None
        for index, result in enumerate(podcast_search_results):
            if index not in used_indexes:
                if last_id is None or last_id != result.internal_podcast_id:
                    distributed_results.append(result)
                    last_id = result.internal_podcast_id
                else:
                    unique_result, used_index = find_next_unique_result(index, podcast_search_results)
                    if unique_result is not None:
                        print('found unique')
                        distributed_results.append(unique_result)
                        used_indexes[used_index] = True
                        distributed_results.append(result)
                    else:
                        print('NOT found unique')
                        distributed_results.append(result)

        return distributed_results

    async def resolve_for_you(self, info, ignore_guids=None):
        user = app.auth.get_user_from_info(info)


        recent_podcast_episode_views = app.core.data_models.UserPodcastEpisodeView \
            .where('user_id', user.id) \
            .order_by('id', 'desc') \
            .limit(30) \
            .get()

        ignore_podcast_ids = app.core.data_models.PodcastEpisode \
            .where_in('id', list([pev.podcast_episode_id for pev in recent_podcast_episode_views])) \
            .or_where_in('guid', ignore_guids) \
            .lists('podcast_id')

        db_podcast_episodes = []
        db_podcast_episode_content_recommendations = []

        profile = app.core.profiler.start(f"GET CONTENT RECOMMENDATIONS")
        user_taste_profile, db_podcast_episode_content_recommendations = await user.get_podcast_episode_content_recommendations(ignore_guids, ignore_podcast_ids)
        app.core.profiler.end(profile)

        for episode in db_podcast_episode_content_recommendations:
            db_podcast_episodes.append(episode['episode'])

        if len(db_podcast_episodes) < 10:
            profile = app.core.profiler.start(f"GET DEFAULT RECOMMENDATIONS")
            db_podcast_episodes_default_reccomendations = await user.default_user_reccomendations(ignore_guids, ignore_podcast_ids)
            app.core.profiler.end(profile)

            for episode in db_podcast_episodes_default_reccomendations:
                db_podcast_episodes.append(episode)
                if len(db_podcast_episodes) == 10:
                    break

        podcast_episodes = []
        for db_podcast_episode in db_podcast_episodes:
            profile = app.core.profiler.start(f"PODCAST EPISODE DB->GQL OBJECT CONVERSION")
            podcast_episode = PodcastEpisode.convert(db_podcast_episode, user_taste_vector=user_taste_profile['taste_vector'])
            app.core.profiler.end(profile)

            podcast_episodes.append(podcast_episode)

        return podcast_episodes
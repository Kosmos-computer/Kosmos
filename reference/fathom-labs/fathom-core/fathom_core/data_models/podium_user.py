import fathom_core as core
import datetime
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta

from orator import Model
from orator.orm import has_one, belongs_to, belongs_to_many, has_many, has_many_through
from orator.query.join_clause import JoinClause

from sendgrid.helpers.mail import *
from sendgrid import SendGridAPIClient

import jwt
import stripe
import pytz

stripe.api_key = core.env['stripe_api_key']

class PodiumUser(Model):

    @has_many('user_id')
    def podium_packages(self):
        return PodiumPackage

    @has_many()
    def podium_user_api_keys(self):
        return PodiumUserApiKey

    #def associate_past_packages(self):
    #    # get all podium packages
    #    podium_packages = core.data_models.PodiumPackage \
    #        .where('user_email', self.email)
    #    if self.alternate_email is not None and self.alternate_email != '':
    #        podium_packages = podium_packages.or_where('user_email', self.alternate_email) \
    #
    #    podium_packages = podium_packages.get()
    #
    #    # associate with user
    #    for podium_package in podium_packages:
    #        if podium_package.user_id is None:
    #            podium_package.user_id = self.id
    #            podium_package.save()

    @staticmethod
    def get_by_api_key(api_key, allow_media_tokens=False, requested_media_id=None):
        user = None

        if len(api_key) < 50:
            db_api_key = core.data_models.PodiumUserApiKey \
                .where('api_key', api_key) \
                .first()

            if db_api_key:
                user = db_api_key.podium_user

        else:
            try:
                decoded_token = jwt.decode(api_key, core.env['fathom_jwt_secret'], algorithms=["HS256"])
                if decoded_token:
                    if allow_media_tokens and 'media_id' in decoded_token:
                        decoded_media_id = decoded_token['media_id']
                        if decoded_media_id is not None and (decoded_media_id == requested_media_id or requested_media_id is None):
                            podium_package = core.data_models.PodiumPackage \
                                .where('guid', decoded_media_id) \
                                .select('id', 'user_id') \
                                .first()
                            if podium_package:
                                user = core.data_models.PodiumUser.find(podium_package.user_id)
                    elif 'podium_user_guid' in decoded_token:
                        decoded_user_guid = decoded_token['podium_user_guid']
                        if decoded_user_guid is not None:
                            user = core.data_models.PodiumUser.where('guid', decoded_user_guid).first()

            except Exception as e:
                print(e)
                pass

        return user
    
    def get_client_token(self):
        return jwt.encode({ "podium_user_guid": self.guid }, core.env['fathom_jwt_secret'], algorithm="HS256")

    def get_current_subscription_purchase(self):
        """
        This method retrieves the current subscription purchase made by the user.
        It joins the PodiumPurchase and PodiumProducts tables on the product id,
        filters for the current user and subscription type products, and orders
        the results by the end date in descending order. It then selects the first
        result, which will be the most recent subscription purchase that is still active.
        
        Returns:
            PodiumPurchase: The current active subscription purchase made by the user.
        """
        purchase = core.data_models.PodiumPurchase \
            .join(JoinClause('podium_products').on('podium_products.id', '=', 'podium_purchases.podium_product_id')) \
            .where('podium_user_id', self.id) \
            .where_not_null('end_date') \
            .where('end_date', '>=', datetime.datetime.now()) \
            .where('podium_products.type', 'subscription') \
            .order_by('end_date', 'desc') \
            .select('podium_purchases.*') \
            .first()

        return purchase

    def get_last_subscription_purchase(self):
        """
        This method retrieves the last subscription purchase made by the user.
        It joins the PodiumPurchase and PodiumProducts tables on the product id,
        filters for the current user and subscription type products, and orders
        the results by the end date in descending order. It then selects the first
        result, which will be the most recent subscription purchase either active or inactive.
        
        Returns:
            PodiumPurchase: The last subscription purchase made by the user.
        """
        purchase = core.data_models.PodiumPurchase \
            .join(JoinClause('podium_products').on('podium_products.id', '=', 'podium_purchases.podium_product_id')) \
            .where('podium_user_id', self.id) \
            .where_not_null('end_date') \
            .where('podium_products.type', 'subscription') \
            .order_by('end_date', 'desc') \
            .select('podium_purchases.*') \
            .first()

        return purchase
    
    def get_current_subscription_proration_date(self):
        current_subscription_purchase = self.get_current_subscription_purchase()
        if current_subscription_purchase is None:
            return None
        
        subscription_monthly_credits = current_subscription_purchase.podium_product.credits
        current_subscription_credits_balance = self.get_current_subscription_credits_balance()

        percentage_of_monthly_credits_used = (subscription_monthly_credits - current_subscription_credits_balance) / subscription_monthly_credits
        effective_used_days = int(percentage_of_monthly_credits_used * 30)
        proration_date = self.determine_start_date_for_subscription_monthly_period() + relativedelta(days=effective_used_days)
        # Convert the proration date into an epoch timestamp
        proration_date = proration_date.timestamp()
        

        # Use Stripe to get the original start and end dates for the user's subscription
        stripe_subscription = stripe.Subscription.retrieve(current_subscription_purchase.stripe_subscription_id)
        original_start_date = stripe_subscription.current_period_start
        original_end_date = stripe_subscription.current_period_end

        # If the proration date is before the original start date, use the original start date
        if proration_date < original_start_date:
            proration_date = original_start_date
        
        # If the proration date is after the original end date, use the original end date
        if proration_date > original_end_date:
            proration_date = original_end_date

        # Convert proration_date from timestamp to datetime
        proration_date = datetime.datetime.fromtimestamp(proration_date)
        
        return proration_date

    def get_additional_credits_product(self):
        additional_credits_product = None

        # default to the default credits product
        additional_credits_product = core.data_models.PodiumProduct.where('is_default_credits_product', True).first()

        # determine if the user has a subscription, and if so, use the additional credits product for that subscription
        subscription = self.get_current_subscription_purchase()
        if subscription is not None and subscription.podium_product.additional_credits_product_id is not None:
            subscription_additional_credits_product = core.data_models.PodiumProduct.find(subscription.podium_product.additional_credits_product_id)
            if subscription_additional_credits_product is not None:
                additional_credits_product = subscription_additional_credits_product

        return additional_credits_product

    def determine_start_date_for_subscription_monthly_period(self):
        start_date = None

        purchase = self.get_current_subscription_purchase()

        if purchase is None:
            pass
        else:
            if purchase.podium_product.period == "monthly":
                start_date = purchase.start_date
            elif purchase.podium_product.period == "yearly":
                today = datetime.datetime.now(datetime.timezone.utc)
                # determine the start date of the current monthly period
                monthly_periods = []
                current_monthly_period_start_date = purchase.start_date
                current_monthly_period_start_date += relativedelta(months=1)
                while current_monthly_period_start_date < today:
                    monthly_periods.append(current_monthly_period_start_date)
                    current_monthly_period_start_date += relativedelta(months=1)
                if len(monthly_periods) > 0:
                    start_date = monthly_periods[-1]
                else:
                    start_date = purchase.start_date
            else:
                pass

        return start_date

    def get_current_subscription_credits_balance(self):
        subscription_credits_balance = 0

        purchase = self.get_current_subscription_purchase()
        if purchase is None:
            pass
        else:
            transactions = core.data_models.PodiumTransaction \
                .where('podium_purchase_id', purchase.id)

            if purchase.podium_product.period == "yearly":
                # determine the start date of the current monthly period
                start_date = self.determine_start_date_for_subscription_monthly_period()
                if start_date is not None:
                    transactions = transactions.where('created_at', '>=', start_date)
                else:
                    return 0

            transactions = transactions.get()

            initial_subscription_credits = purchase.podium_product.credits

            credits_used = 0
            for transaction in transactions:
                credits_used += transaction.credits

            subscription_credits_balance = initial_subscription_credits - credits_used

        return subscription_credits_balance
    
    def get_current_subscription_credits_balance_expiration(self):
        purchase = self.get_current_subscription_purchase()
        
        if purchase is None:
            return None
        else:
            if purchase.podium_product.period == "yearly":
                # determine the start date of the current monthly period
                start_date = self.determine_start_date_for_subscription_monthly_period()
                if start_date is not None:
                    return start_date + relativedelta(months=1)
                else:
                    return None
            else:
                return purchase.end_date

    def get_additional_credits_balance(self):
        transactions = core.data_models.PodiumTransaction \
            .where('user_id', self.id) \
            .get()

        credits = 0
        for transaction in transactions:
            credits += transaction.credits

        return credits

    def grant_credits(self, credits, reason, purchase=None):
        transaction = core.data_models.PodiumTransaction()
        transaction.user_id = self.id
        transaction.credits = credits
        transaction.reason = reason
        if purchase is not None:
            transaction.podium_purchase_id = purchase.id
        transaction.save()

    def grant_credits_from_subscription(self, package):
        current_subscription_purchase = self.get_current_subscription_purchase()
        if current_subscription_purchase is not None:
            current_subscription_credits_balance = self.get_current_subscription_credits_balance()
            if current_subscription_credits_balance > 0:
                # use subscription credits
                if current_subscription_credits_balance >= package.get_credit_cost():
                    self.grant_credits(package.get_credit_cost(), 'Subscription Usage', current_subscription_purchase)
                else:
                    self.grant_credits(current_subscription_credits_balance, 'Subscription Usage', current_subscription_purchase)

                    # TODO: Handle this edge case where from the time processing began till now,
                    # the user has used up all their credits
                    if self.get_additional_credits_balance() < 0:
                        # Zero out account balance
                        self.grant_credits(-self.get_additional_credits_balance(), 'Bonus Credits')

    def has_sufficient_credits_for_package(self, package):
        has_sufficient_credits = True

        # check for existing package transaction
        transaction = core.data_models.PodiumTransaction \
            .where('user_id', self.id) \
            .where('podium_package_id', package.id ) \
            .first()

        # guard against duplicate transactions
        if transaction is not None:
            return True

        # check for sufficient credits
        available_credits = self.get_additional_credits_balance() + self.get_current_subscription_credits_balance()

        if available_credits >= package.get_credit_cost():
            pass
        else:
            # If user does not have a subscription and they have any credits at all, let them pass
            # WARNING: This is a hack to allow users to use their credits before they purchase a subscription
            # TODO: Remove this hack once we have a better way to handle this, esp. for users who have already purchased credits
            if self.get_current_subscription_purchase() is None and available_credits > 0:
                pass
            else:
                has_sufficient_credits = False

        return has_sufficient_credits

    def deduct_package_credits(self, package):
        # check for existing package transaction
        transaction = core.data_models.PodiumTransaction \
            .where('user_id', self.id) \
            .where('podium_package_id', package.id ) \
            .first()

        # guard against duplicate transactions
        if transaction is not None:
            return

        transaction = core.data_models.PodiumTransaction()
        transaction.user_id = self.id
        transaction.podium_package_id = package.id
        transaction.credits = -package.get_credit_cost()
        transaction.reason = 'Podium AI Media Processing'
        transaction.save()

        if self.get_current_subscription_purchase() is None:
            available_credits = self.get_additional_credits_balance()
            if available_credits < 0:
                # grant visitor bonus credits
                self.grant_credits(-available_credits, 'Trial Bonus Credits')
        else:
            self.grant_credits_from_subscription(package)

    def send_email(self, template_id, dynamic_template_data={}):
        from_email = "updates@podium.page"
        to_emails = [self.email]

        message = Mail(
            from_email=from_email,
            to_emails=to_emails
        )

        tracking_settings = TrackingSettings()
        tracking_settings.click_tracking = ClickTracking(True, False)
        tracking_settings.open_tracking = OpenTracking(True)

        message.tracking_settings = tracking_settings

        # pass custom values for our HTML placeholders
        if 'email' not in dynamic_template_data:
            dynamic_template_data['email'] = self.email

        message.dynamic_template_data = dynamic_template_data
        message.template_id = template_id

        sg = SendGridAPIClient(api_key=core.env['sendgrid_api_key'])
        response = sg.send(message)
        code, body, headers = response.status_code, response.body, response.headers

        print(f"Response code: {code}")
        print(f"Response headers: {headers}")
        print(f"Response body: {body}")
        print("Dynamic Messages Sent!")

        return str(response.status_code)

    def send_reset_email(self, token):
        # setup email
        from_email = "updates@podium.page"
        to_emails = [self.email]

        message = Mail(
            from_email=from_email,
            to_emails=to_emails
        )

        reset_link = f"https://podium.page/reset-password?token={token}"

        # pass custom values for our HTML placeholders
        message.dynamic_template_data = {
            "link": reset_link,
            "email": self.email
        }
        message.template_id = "d-72a4a239a41642339ebf2c74e5bd4a5d"

        sg = SendGridAPIClient(api_key=core.env['sendgrid_api_key'])
        response = sg.send(message)
        code, body, headers = response.status_code, response.body, response.headers

        #print(f"Response code: {code}")
        #print(f"Response headers: {headers}")
        #print(f"Response body: {body}")
        #print("Dynamic Messages Sent!")

        return str(response.status_code)

from .podium_package import PodiumPackage
from .podium_user_api_key import PodiumUserApiKey

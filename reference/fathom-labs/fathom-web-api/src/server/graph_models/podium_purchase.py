import app
import graphene
from hashlib import sha256
import jwt

class PodiumPurchase(graphene.ObjectType):

    completed = graphene.String()
    quantity = graphene.Int()
    product_title = graphene.String()
    product_description = graphene.String()
    product_type = graphene.String()
    product_credits = graphene.String()
    product_price = graphene.Float()
    product_period = graphene.String()

    @staticmethod
    def convert(db_purchase):
        podium_purchase = PodiumPurchase()
        podium_purchase.completed = db_purchase.completed
        podium_purchase.quantity = db_purchase.quantity
        podium_purchase.product_title = db_purchase.podium_product.title
        podium_purchase.product_description = db_purchase.podium_product.description
        podium_purchase.product_type = db_purchase.podium_product.type
        podium_purchase.product_credits = db_purchase.podium_product.credits
        podium_purchase.product_price = db_purchase.podium_product.price
        podium_purchase.product_period = db_purchase.podium_product.period

        return podium_purchase
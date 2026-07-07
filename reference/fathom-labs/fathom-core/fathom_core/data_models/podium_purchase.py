from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through

import datetime

class PodiumPurchase(Model):

    @has_many
    def podium_transactions(self):
        return PodiumTransaction

    @belongs_to
    def podium_product(self):
        return PodiumProduct

    @belongs_to
    def podium_user(self):
        return PodiumUser

from .podium_transaction import PodiumTransaction
from .podium_product import PodiumProduct
from .podium_user import PodiumUser

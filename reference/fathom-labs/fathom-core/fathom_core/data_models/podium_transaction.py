from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through

import datetime

class PodiumTransaction(Model):

    @belongs_to
    def podium_package(self):
        return PodiumPackage

    @belongs_to
    def podium_purchase(self):
        return PodiumPurchase

from .podium_package import PodiumPackage
from .podium_purchase import PodiumPurchase

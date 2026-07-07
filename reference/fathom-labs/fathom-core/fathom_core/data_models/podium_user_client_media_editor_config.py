from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through

import datetime

class PodiumUserClientMediaEditorConfig(Model):

    @belongs_to
    def podium_user(self):
        return PodiumUser

from .podium_user import PodiumUser
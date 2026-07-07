import fathom_core as core
import datetime
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from orator import Model
from orator.orm import has_one, belongs_to, belongs_to_many, has_many, has_many_through
from orator.query.join_clause import JoinClause
import jwt
import stripe
import pytz


class PodiumUserSetting(Model):
    __table__ = 'podium_user_settings'

    @classmethod
    def get(self, user_id,key):
        user_settings = self.where('podium_user_id', user_id).where('key', key).first()
        if user_settings:
            return user_settings.value
        else:
            return None

    @classmethod
    def set(self, user_id,key,value):
        user_settings = self.where('podium_user_id', user_id).where('key', key).first()
        if not user_settings:
            user_settings = self()
            user_settings.podium_user_id = user_id
            user_settings.key = key
            user_settings.value = value
            user_settings.save()
        else:
            user_settings.value = value
            user_settings.save()
        return user_settings
from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through

class UserPodcastFollow(Model):

    @belongs_to
    def podcast(self):
        from .podcast import Podcast
        return Podcast

    @belongs_to
    def user(self):
        from .user import User
        return User

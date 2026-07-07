from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through

class UserQueuePodcastEpisode(Model):

    @belongs_to
    def podcast_episode(self):
        from .podcast_episode import PodcastEpisode
        return PodcastEpisode

    @belongs_to
    def user(self):
        from .user import User
        return User

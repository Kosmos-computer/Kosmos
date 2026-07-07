from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through

class PodcastEpisodeGuest(Model):

    @has_one
    def podcast_episode(self):
        from .podcast_episode import PodcastEpisode
        return PodcastEpisode

    @has_one
    def podcast_episode_guest(self):
        return PodcastEpisodeGuest

from .podcast_episode_guest import PodcastEpisodeGuest

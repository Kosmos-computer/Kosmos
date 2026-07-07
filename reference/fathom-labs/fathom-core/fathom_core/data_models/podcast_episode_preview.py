from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through

import datetime

class PodcastEpisodePreview(Model):

    @belongs_to
    def podcast_episode(self):
        return PodcastEpisode

    def formatted_start(self):
        return str(datetime.timedelta(seconds=round(self.start)))

    def formatted_end(self):
        return str(datetime.timedelta(seconds=round(self.end)))

from .podcast_episode import PodcastEpisode

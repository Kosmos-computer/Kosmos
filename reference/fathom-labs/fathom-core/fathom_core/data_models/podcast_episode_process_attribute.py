from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through

class PodcastEpisodeProcessAttribute(Model):

    ATTRIBUTES = [ 
        # In natural order
        'audio_stored',
        'transcription_job_requested',
        'transcription_job_finished',
        'transcribed',
        'search_ingested',
        'previews_generated',
        'vector_generated',
    ]

    @belongs_to
    def podcast_episode(self):
        return PodcastEpisode

from .podcast_episode import PodcastEpisode

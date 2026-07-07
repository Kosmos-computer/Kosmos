from orator import Model

class StatsAppleRelatedPodcast(Model):
    __fillable__ = [
        'podcast_rss_url',
        'related_podcast_rss_url',
    ]

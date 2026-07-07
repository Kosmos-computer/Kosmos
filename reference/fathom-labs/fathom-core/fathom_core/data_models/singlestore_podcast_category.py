from orator import Model

class SinglestorePodcastCategory(Model):
    __connection__ = 'singlestore'
    __table__ = 'podcast_categories'


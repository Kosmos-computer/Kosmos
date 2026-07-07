from orator import Model

class SinglestorePodcastCategoriesPodcast(Model):
    __connection__ = 'singlestore'
    __table__ = 'podcast_categories_podcasts'


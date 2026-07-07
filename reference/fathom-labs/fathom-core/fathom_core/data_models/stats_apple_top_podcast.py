from orator import Model

class StatsAppleTopPodcast(Model):
    __fillable__ = [
        'number_of_ratings',
        'as_of_epoch',
        'rating',
        'five_star_percentage',
        'four_star_percentage',
        'three_star_percentage',
        'two_star_percentage',
        'one_star_percentage',
        'title',
        'rss_url',
        'similar_podcast_titles',
        'podcast_id',
        'itunes_id',
        'category',
        'total_episodes',
        'email'
    ]

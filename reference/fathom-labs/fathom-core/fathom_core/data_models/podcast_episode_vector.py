from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through

import numpy as np
from scipy.spatial.distance import *

class PodcastEpisodeVector(Model):
    
    @belongs_to
    def podcast_episode(self):
        from .podcast_episode import PodcastEpisode
        return PodcastEpisode

    def get_vector(self):
        if self.vector is None:
            return None

        return np.array(self.vector).astype(float)

    def cosine_similarity(self, other_vector):
        vector = self.get_vector()
        if vector is None:
            return 0

        return (1 - cosine(vector, other_vector))

    def euclidean_similarity(self, other_vector):
        vector = self.get_vector()
        if vector is None:
            return 0

        return (10 - euclidean(vector, other_vector))
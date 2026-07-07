import fathom_core as core
from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through

import numpy as np
from scipy.spatial.distance import *

class PodcastVector(Model):
    
    @belongs_to
    def podcast(self):
        from .podcast import Podcast
        return Podcast

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
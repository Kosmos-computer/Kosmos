from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through

from scipy.spatial.distance import *
import numpy as np

import datetime

class PodiumPackageChapterVector(Model):

    @belongs_to
    def podium_package_chapter(self):
        return PodiumPackageChapter
    
    def get_vector(self):
        if self.vector is None:
            return None

        return np.array(self.vector).astype(float)
    
    def cosine_similarity(self, other_vector):
        vector = self.get_vector()
        if vector is None:
            return 0

        other_vector = np.array(other_vector).astype(float)
        return (1 - cosine(vector, other_vector))

    def euclidean_similarity(self, other_vector):
        vector = self.get_vector()
        if vector is None:
            return 0

        other_vector = np.array(other_vector).astype(float)
        return (10 - euclidean(vector, other_vector))

from .podium_package_chapter import PodiumPackageChapter
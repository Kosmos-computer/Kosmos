import numpy as np
from scipy.spatial.distance import cosine
import hashlib
#import pyhash
import math

class Vector:
    
    def __init__(self):
        pass

    def get_nearest(self, target_vector, destination_vectors, n=1):
        destination_vector_results = []
        distances = []

        for destination_vector in destination_vectors:
            distance = cosine(target_vector, destination_vector)
            distances.append(distance)

            destination_vector_result = {
                'vector': destination_vector,
                'score': 100 - (distance * 100)
            }
            destination_vector_results.append(destination_vector_result)
        
        if n > len(destination_vectors):
            n = len(destination_vectors)
        
        nearest_indicies = np.array(distances).argsort()[:n]
        return np.array(destination_vector_results)[nearest_indicies], nearest_indicies
    
    def get_fingerprint(self, vector):
        #hasher = pyhash.city_64()
        #return hasher(repr(vector).encode('utf-8')) - math.pow(2, 63)
        return 0
        
    def get_md5_signature(self, vector):
        encoded_vector = repr(vector).encode('utf-8')
        signature = hashlib.md5(encoded_vector).hexdigest()
        return signature
        
    @staticmethod
    def convert_to_unit_vector(vector):
        float_vector = np.array(vector).astype(float)
        unit_vector = float_vector / np.linalg.norm(float_vector)
        return unit_vector
        
    @staticmethod
    def cosine_similarity(v1, v2):
        v1 = np.array(v1).astype(float)
        v2 = np.array(v2).astype(float)
        cosine_similarity = 1 - cosine(v1, v2)
        return cosine_similarity

import fathom_core as core

from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through

import numpy as np

import datetime

class PodiumPackageChapter(Model):

    @belongs_to
    def podium_package(self):
        return PodiumPackage

    @has_one
    def podium_package_chapter_vector(self):
        return PodiumPackageChapterVector
    

    def formatted_start(self):
        return str(datetime.timedelta(seconds=round(self.start)))

    def formatted_end(self):
        return str(datetime.timedelta(seconds=round(self.end)))

    async def generate_vector(self, transcript_file):
        if self.podium_package_chapter_vector:
            self.podium_package_chapter_vector.delete()
        
        chapter_segments = transcript_file.get_segments(start=self.start, end=self.end)

        # generate vector
        embedding_vectors = await core.inference.text_embedding_vectors_with_workers(list([segment['content'] for segment in chapter_segments]))
        vector = np.mean(embedding_vectors['embedding_vectors'], axis=0)

        # insert into podium episode vectors
        chapter_vector = core.data_models.PodiumPackageChapterVector()
        chapter_vector.podium_package_chapter_id = self.id
        chapter_vector.vector = vector.tolist()
        chapter_vector.save()

        self.load('podium_package_chapter_vector')

class PodiumPackageChapterObserver(object):

    def saving(self, chapter):
        pass

    def saved(self, chapter):
        PodiumPackageAsset.upsert_from_chapter(chapter)

PodiumPackageChapter.observe(PodiumPackageChapterObserver())

from .podium_package_asset import PodiumPackageAsset
from .podium_package import PodiumPackage
from .podium_package_chapter_vector import PodiumPackageChapterVector


from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through

import datetime

class PodiumPackagePreview(Model):

    @belongs_to
    def podium_package(self):
        return PodiumPackage

    def formatted_start(self):
        return str(datetime.timedelta(seconds=round(self.start)))

    def formatted_end(self):
        return str(datetime.timedelta(seconds=round(self.end)))
    
class PodiumPackagePreviewObserver(object):

    def saving(self, preview):
        pass

    def saved(self, preview):
        PodiumPackageAsset.upsert_from_preview(preview)

PodiumPackagePreview.observe(PodiumPackagePreviewObserver())

from .podium_package_asset import PodiumPackageAsset
from .podium_package import PodiumPackage

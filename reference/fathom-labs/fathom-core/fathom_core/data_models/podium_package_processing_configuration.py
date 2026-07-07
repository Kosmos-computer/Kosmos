import fathom_core as core
from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through

class PodiumPackageProcessingConfiguration(Model):
    
    @belongs_to
    def podium_package(self):
        return PodiumPackage

from .podium_package import PodiumPackage
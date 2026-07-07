import fathom_core as core

from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through

import datetime

class PodiumPackageGeneratedDocument(Model):

    @belongs_to
    def podium_package(self):
        return PodiumPackage
    
    def get_podiumGPT_prompt(self, prompt = ''):
        composed_prompt = f"""
[BEGIN content]
{self.document}
[END content]

Using the content of the document above - {prompt}

Return only the revised content with no [BEGIN content] or [END content] tags.
"""
        return composed_prompt
    
class PodiumPackageGeneratedDocumentObserver(object):

    def saving(self, document):
        pass

    def saved(self, document):
        PodiumPackageAsset.upsert_from_generated_document(document)

PodiumPackageGeneratedDocument.observe(PodiumPackageGeneratedDocumentObserver())

from .podium_package_asset import PodiumPackageAsset
from .podium_package import PodiumPackage
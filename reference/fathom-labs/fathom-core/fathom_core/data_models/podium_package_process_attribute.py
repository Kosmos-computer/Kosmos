from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through

class PodiumPackageProcessAttribute(Model):

    ATTRIBUTES = [ 
        # In natural order
        'audio_stored',
        'transcription_job_requested',
        'transcription_job_finished',
        'transcribed',
        'search_ingested',
        'previews_generated',
        'vector_generated',
        'summary_generated',
    ]

    @belongs_to
    def podium_package(self):
        return PodiumPackage

from .podium_package import PodiumPackage

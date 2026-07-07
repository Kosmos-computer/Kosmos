from orator import Model
from orator.orm import belongs_to

class PodiumPackageParagraph(Model):
    
    @belongs_to
    def podium_package_transcript_file(self):
        return PodiumPackageTranscriptFile

from .podium_package_transcript_file import PodiumPackageTranscriptFile

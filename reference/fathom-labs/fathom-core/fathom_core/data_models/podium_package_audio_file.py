from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through

class PodiumPackageAudioFile(Model):

    @belongs_to
    def podium_package(self):
        return PodiumPackage

    @has_many
    def podium_package_transcripts(self):
        return PodiumPackageTranscriptFile

    def podium_package_transcript(self):
        return self.podium_package_transcripts[0]
        
    def url(self):
        return f"https://{self.s3_bucket}.s3.amazonaws.com/{self.s3_key}"
    
    @staticmethod
    def determine_media_format_from_filename(filename):
        if '.mp3' in filename:
            return 'mp3'
        elif '.wav' in filename:
            return 'wav'
        elif '.m4a' in filename:
            return 'm4a'
        elif '.ogg' in filename:
            return 'ogg'
        elif '.flac' in filename:
            return 'flac'
        elif '.opus' in filename:
            return 'opus'
        elif '.mp4' in filename:
            return 'mp4'
        elif '.webm' in filename:
            return 'webm'
        elif '.mov' in filename:
            return 'mov'
        elif '.avi' in filename:
            return 'avi'
        elif '.m4v' in filename:
            return 'm4v'
        elif '.vob' in filename:
            return 'vob'
        elif '.3gp' in filename:
            return '3gp'
        else:
            return 'mp3'


from .podium_package import PodiumPackage
from .podium_package_transcript_file import PodiumPackageTranscriptFile
from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through

class AudioFile(Model):

    @belongs_to
    def podcast_episode(self):
        return PodcastEpisode

    @has_many
    def transcripts(self):
        return Transcript

    def transcript(self):
        return self.transcripts[0]
        
    def url(self):
        return f"https://{self.s3_bucket}.s3.amazonaws.com/{self.s3_key}"

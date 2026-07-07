import fathom_core as core
from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through

class PodiumProject(Model):
    
    @belongs_to
    def podium_user(self):
        return PodiumUser

    @has_many
    def podium_packages(self):
        return PodiumPackage
    
    def resolve_podcast(self):
      # work-around for saved event
      self = PodiumProject.where('id', self.id).first()
      
      if self.podcast_rss_url != None:
        podcast = core.data_models.Podcast \
          .where('rss_url', self.podcast_rss_url) \
          .first()
        
        if not podcast:
          podcast = core.data_models.Podcast()
          podcast.rss_url = self.podcast_rss_url
          podcast.transcribe_after = '2099-01-01'
          podcast.processing_level = 2
          podcast.save()

          self.podcast_id = podcast.id
          self.save()

          try:
            podcast.update_from_rss()
          except:
            pass
        else:
          if self.podcast_id != podcast.id:
            self.podcast_id = podcast.id
            self.save()
        

class PodiumProjectObserver(object):

    def saving(self, podium_project):
        pass

    def saved(self, podium_project):
        podium_project.resolve_podcast()

PodiumProject.observe(PodiumProjectObserver())


from .podium_package import PodiumPackage
from .podium_user import PodiumUser
from orator import Model
from orator.orm import belongs_to

class PodiumPackageMeta(Model):
    __table__ = 'podium_package_meta'

    @belongs_to('podium_package_id', 'id')

    
    
    #get value of specific key from metadata column json and package_id
    def get_value(self, key):
        metadata = self.get_meta()
        return metadata[key]

    
    def get_meta(self):
        return self.where('podium_package_id', self.podium_package_id).get()

    

  



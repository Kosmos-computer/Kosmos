from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through

import datetime

class TranscriptFileSpeaker(Model):
    
    def get_display_name(self):
        if self.set_name:
            return self.set_name
        elif self.predicted_name:
            return self.predicted_name
        else:
            return self.default_name
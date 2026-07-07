from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through

class UserTasteVector(Model):
    
    @belongs_to
    def user(self):
        return User

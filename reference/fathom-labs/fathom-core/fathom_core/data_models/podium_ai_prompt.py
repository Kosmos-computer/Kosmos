from orator import Model
from orator.orm import belongs_to

class PodiumAiPrompt(Model):
    """Represents an AI prompt saved by a user for re-use in PodiumGPT."""

    @belongs_to
    def podium_user(self):
        return PodiumUser

from .podium_user import PodiumUser

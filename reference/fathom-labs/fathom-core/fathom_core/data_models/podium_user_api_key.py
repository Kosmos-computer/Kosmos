from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through

import secrets
import string
import datetime

class PodiumUserApiKey(Model):

  @belongs_to
  def podium_user(self):
      return PodiumUser

  def generate_api_key(self):
      self.api_key = self.generate_api_key_string()
      self.save()
  
  @staticmethod
  def generate_api_key_string(length=48):
    """
    Generates a secure API key for a SaaS app API.

    Args:
        length (int, optional): The desired length of the API key. Default is 32.

    Returns:
        str: A secure API key.
    """
    if length < 1:
        raise ValueError("Length must be a positive integer.")

    # Define the character set for the API key: alphanumeric characters (both lowercase and uppercase)
    characters = string.ascii_letters + string.digits

    # Generate the API key using the secrets module
    api_key = ''.join(secrets.choice(characters) for _ in range(length))

    return api_key
  
from .podium_user import PodiumUser

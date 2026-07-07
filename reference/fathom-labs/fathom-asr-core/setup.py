from setuptools import setup, find_packages
import os

setup(name='fathom-asr-core',
      version='1.0',
      description='Whisper core objects and functions',
      url='https://github.com/fathom-labs/fathom-asr-core',
      author='Whisper',
      author_email='',
      license='',
      packages=find_packages(),
      install_requires=[
        'orator @ git+https://github.com/fathom-labs/orator@new-pendulum#egg=orator',
        'boto3',
        'requests',
        'mutagen',
        'librosa',
        'soundfile',
        'torchaudio',
        'spacy',
        'num2words',
        'unidecode',
        'pyannote.audio',
        'deepmultilingualpunctuation'
      ],
      zip_safe=False
)

# pip uninstall whisper
# pip install git+https://github.com/yorozcogonzalez/whisper.git
os.system('python3 -m spacy download en_core_web_sm')

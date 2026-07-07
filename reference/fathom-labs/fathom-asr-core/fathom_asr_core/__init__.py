import os, sys; sys.path.append(os.path.dirname(os.path.realpath(__file__)))

# Environment
import environment

env = environment.Environment()

# Logging
import logging
import os

logging.basicConfig(format='%(asctime)s : %(levelname)s : %(message)s', level=logging.INFO)
log = logging.getLogger("fathom")

if env['log_level']:
    log.setLevel(level=os.environ.get("LOGLEVEL", env['log_level']))

# Data Stores Initialization
import data_stores.database as database

# Data Models
import data_models

# Utilities
#from utilities import *
from utilities import inference
from utilities import text
from utilities import audio_processing
from utilities import aws
text = text.Text()
aws_boto3 = aws.AWS()

from utilities import asr
if env['load_asr'] == 'True':
    transcriber = asr.Transcriber()
    aligner = asr.Aligner()
    diarizer = asr.Diarizer()

if env['load_punctuation_model'] == 'True':
    punctuation_fixer = asr.Punctuation()

    

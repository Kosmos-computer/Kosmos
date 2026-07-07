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

# Data Models
import data_models

# Data Stores Initialization
import data_stores.database as database
import data_stores.elastic as elastic
import data_stores.ann as ann
#import data_stores.milvus as milvus
import data_stores.pinecone as pinecone
import data_stores.redis_caches as redis_caches
cache = redis_caches.RedisCaches()

# Services
from services import *

# Utilities
from utilities import *
text = text.Text()
vector = vector.Vector()

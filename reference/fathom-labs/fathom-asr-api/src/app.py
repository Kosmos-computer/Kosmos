# For shared_modules
import os,sys,inspect
current_dir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

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

# Modules
from modules import *

# Sanic
from sanic import Sanic
from sanic.response import json

web = Sanic('Fathom Inference API')

# Route Blueprints
from server.controllers import *

web.blueprint(root.blueprint)

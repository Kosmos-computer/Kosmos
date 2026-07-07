# For shared_modules
import os,sys,inspect
current_dir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

# Internal Module Packages
import fathom_core as core

log = core.log
env = core.env

# Modules
from modules import *

# Sanic
from sanic import Sanic
from sanic.response import json

web = Sanic('Fathom Engine API')

# Route Blueprints
from server.controllers import *

web.blueprint(root.blueprint)
web.blueprint(search.blueprint)

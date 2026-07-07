# For shared_modules
import os,sys,inspect
current_dir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

# Internal Module Packages
import whisper_core as core

log = core.log
env = core.env

# Modules
import modules.processor as processor
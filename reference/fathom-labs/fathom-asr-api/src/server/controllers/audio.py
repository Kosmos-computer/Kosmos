import app
from sanic.response import json
from sanic import Blueprint
import requests

blueprint = Blueprint('transcript')

@blueprint.route('/audio/transcript')
async def audio_transcript(request):
    audio_url = request.json['audio_url']
    response = {
    }
    return json(response)

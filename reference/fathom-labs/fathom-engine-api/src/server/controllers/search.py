import app
from modules import *
from sanic.response import json
from sanic import Blueprint

blueprint = Blueprint('search')

@blueprint.post('/search/query')
async def query(request):
    # override for no results
    # return json({'results': []})

    query = request.json['query']

    user_id = None
    user = None
    if 'user_id' in request.json:
        user_id = request.json['user_id']
    if user_id is not None and user_id != '':
        user = app.core.data_models.User.find(user_id)

    podcast_id = None
    if 'podcast_id' in request.json:
        podcast_id = request.json['podcast_id']

    if podcast_id == '':
        podcast_id = None


    response = await search_engine.query(query, podcast_id, user)

    return json(response)

@blueprint.post('/search/query/podcasts')
async def query_podcasts(request):
    # override for no results
    # return json({'results': []})

    query = request.json['query']
    user_id = request.json['user_id']
    fast = request.json['fast']

    user = None
    if user_id is not None and user_id != '':
        user = app.core.data_models.User.find(user_id)

    podcasts = await search_engine.query_podcasts(query, user, fast)

    response = {
        'results': podcasts
    }

    return json(response)

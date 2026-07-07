from sanic.response import json
from sanic import Blueprint

blueprint = Blueprint('root')

@blueprint.route('/')
async def root(request):
    info = {
        'name': 'Fathom Engine API',
        'version': 0.1
    }
    
    return json(info)

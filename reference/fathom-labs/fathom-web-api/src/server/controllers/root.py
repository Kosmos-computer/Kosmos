import app
from modules import *
import time

from fastapi import APIRouter
router = APIRouter()

@router.get('/', include_in_schema=False)
async def root():
    info = {
        'name': 'Podium/Fathom Web API',
        'version': '1.0.0'
    }
    
    return info

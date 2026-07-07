import app
import jwt
from starlette.exceptions import HTTPException

def get_user_from_authorization(authorization):
    user = None
    token = authorization[7:]
 
    if token != '':
        decoded_token = jwt.decode(token, app.env['fathom_jwt_secret'], algorithms="HS256")
        user = app.core.data_models.User.where('guid', decoded_token['user_guid']).where('is_deleted', '<>', True).first()
    
    return user
    
def get_user_from_info(info):
    user = None
    
    request = info.context["request"]
    authorization = request.headers.get("Authorization")
    
    if authorization is not None:
        user = get_user_from_authorization(authorization)
    
    #if user is None:
        #raise HTTPException(401, detail="Invalid Authorization")
        
    return user

def get_podium_user_from_authorization(authorization):
    user = None
    token = authorization
 
    if token != '':
        decoded_token = jwt.decode(token, app.env['fathom_jwt_secret'], algorithms="HS256")
        user = app.core.data_models.PodiumUser.where('guid', decoded_token['podium_user_guid']).where('is_deleted', '<>', True).first()
    
    return user
    
def get_podium_user_from_info(info):
    user = None
    
    request = info.context["request"]
    authorization = request.headers.get("Authorization")
    
    if authorization is not None:
        user = get_podium_user_from_authorization(authorization)
    
    #if user is None:
        #raise HTTPException(401, detail="Invalid Authorization")
        
    return user 

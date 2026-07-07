import app
import uvicorn
import logging
import uuid
import json
from fastapi import Request, FastAPI,HTTPException,Response
from typing import Optional
from datetime import datetime

web = app.web


# Ensure middleware is added only once
if not hasattr(web, '_middleware_user_authorization'):
    
    @web.middleware("http")
    async def user_authorization(request: Request, call_next):
        authorization: Optional[str] = request.headers.get('Authorization')
        user = None

        if authorization and authorization.startswith('Bearer '):
            token = authorization.split('Bearer ')[1]
            user = app.core.data_models.PodiumUser.get_by_api_key(token)
            if user and len(token) < 50:
                user_settings = app.core.data_models.PodiumUserSetting
                subscription = user.get_current_subscription_purchase()
                if subscription:
                    if subscription.was_cancelled or subscription.is_paused or subscription.end_date.replace(tzinfo=None) < datetime.now():
                        return Response(content="Permission Denied", status_code=401)                       
                    elif user_settings.get(user.id, 'api_access') == 'False' or user_settings.get(user.id, 'api_access') == 'false':
                        return Response(content="Permission Denied", status_code=401)  
                elif user.id in [1363,1143]:
                    pass                         
                else:
                     return Response(content="Permission Denied", status_code=401)
            
        response = await call_next(request)

        return response

    web._middleware_user_authorization = True

if __name__ == '__main__':
    uvicorn.run(
        "start:web", 
        host='0.0.0.0', 
        port=int(app.env['port']), 
        log_level=app.env['log_level'].lower(),
        reload=(app.env['auto_reload'] == 'True'),
        workers=int(app.env['workers'])
    )

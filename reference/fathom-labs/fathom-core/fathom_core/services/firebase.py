import fathom_core as core
import firebase_admin
from firebase_admin import credentials
from firebase_admin import messaging

try:
    cred = credentials.Certificate("firebase.json")
    firebase_admin.initialize_app(cred)
except Exception as e:
    core.log.debug(f"ERROR INITIALIZING FIREBASE")
    core.log.debug(e, exc_info=True)

def send_message(tokens, title, body, image, data={}):
    message = messaging.MulticastMessage(
        notification=messaging.Notification(
            title=title, 
            body=body,
            image=image
        ),
        apns=messaging.APNSConfig(payload=messaging.APNSPayload(messaging.Aps(mutable_content=True, custom_data=data))),
        fcm_options=messaging.FCMOptions(),
        data=data,
        tokens=tokens,
    )
    
    response = messaging.send_multicast(message)
    
    # Response is a message ID string.
    core.log.info(f"Successfully sent message: {response}")
    

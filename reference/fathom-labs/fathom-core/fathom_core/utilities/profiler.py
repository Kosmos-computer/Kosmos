import fathom_core as core
import datetime

def start(description):
    profile_object = {
        'description': description,
        'start': datetime.datetime.now(),
        'end': None
    }
    
    return profile_object
    
def end(profile_object):
    profile_object['end'] = datetime.datetime.now()
    profile_object['delta'] = profile_object['end'] - profile_object['start']
    profile_object['total_milliseconds'] = profile_object['delta'].total_seconds() * 1000
    
    core.log.info(f"PROFILE: {profile_object['description']} took {profile_object['total_milliseconds']} milliseconds")
    
    return profile_object

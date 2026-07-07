import fathom_core as core
import redis

class RedisCaches:
    
    clients = {}
    
    def __init__(self):
        self.clients['podium'] = redis.Redis(host=core.env['podium_redis_host'], port=6379, db=0)

    def set(self, key, value, host='podium', cache='general', ttl=604800):
        self.clients[host].set(cache + '-' + str(key), value, ttl)

    def get(self, key, host='podium', cache='general'):
        return self.clients[host].get(cache + '-' + str(key))

    
import configparser

class Environment:
    
    current_config = {}
    
    def __init__(self):
        config = configparser.ConfigParser()
        config.read('config.ini')
        
        self.current_config = config[config['default']['environment']]
        self.current_config['environment'] = config['default']['environment']
        
    def __getitem__(self, key):
        if key in self.current_config:
            return self.current_config[key]
        else:
            return None

import fathom_asr_core as core
from orator import DatabaseManager
from orator import Model
from urllib.parse import urlparse
import logging

fathom_whisper_db_conn = urlparse(core.env['whisper_main_db'])

db_config = {
    'whisper_main_db': {
        'driver': 'postgres',
        'host': fathom_whisper_db_conn.hostname,
        'database': fathom_whisper_db_conn.path[1:],
        'user': fathom_whisper_db_conn.username,
        'password': fathom_whisper_db_conn.password,
        'prefix': '',
        'log_queries': core.env['debug'] == 'True'
    }

}

db = DatabaseManager(db_config)
Model.set_connection_resolver(db)

logger = logging.getLogger('orator.connection.queries')

if core.env['debug'] == 'True':
    logger.setLevel(logging.DEBUG)

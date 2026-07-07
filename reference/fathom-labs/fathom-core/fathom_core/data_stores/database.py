import fathom_core as core
from orator import DatabaseManager
from orator import Model
from urllib.parse import urlparse
import logging

fathom_main_db_conn = urlparse(core.env['fathom_main_db'])
pi_main_db_conn = urlparse(core.env['pi_main_db'])

db_config = {
    'default': 'fathom_main',
    'fathom_main': {
        'driver': 'postgres',
        'host': fathom_main_db_conn.hostname,
        'database': fathom_main_db_conn.path[1:],
        'user': fathom_main_db_conn.username,
        'password': fathom_main_db_conn.password,
        'prefix': '',
        'log_queries': core.env['debug'] == 'True'
    },
    'pi_main': {
        'driver': 'postgres',
        'host': pi_main_db_conn.hostname,
        'database': pi_main_db_conn.path[1:],
        'user': pi_main_db_conn.username,
        'password': pi_main_db_conn.password,
        'prefix': '',
        'log_queries': core.env['debug'] == 'True'
    },
    'singlestore': {
        'driver': 'mysql',
        'host': core.env['fathom_singlestore_db_host'],
        'user': core.env['fathom_singlestore_db_user'],
        'password': core.env['fathom_singlestore_db_password'],
        'database': core.env['fathom_singlestore_db_database'],
        'prefix': '',
        'log_queries': core.env['debug'] == 'True'
    }
}

db = DatabaseManager(db_config)
Model.set_connection_resolver(db)

logger = logging.getLogger('orator.connection.queries')

if core.env['debug'] == 'True':
    logger.setLevel(logging.DEBUG)

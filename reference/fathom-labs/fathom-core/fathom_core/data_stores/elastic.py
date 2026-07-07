import fathom_core as core
from elasticsearch import Elasticsearch, RequestError, helpers
import uuid
import traceback

DEFAULT_INDICES = [
    {
        'name': 'podcasts',
        'body' : {  
            "mappings":{
                "properties": {  
                    "content_fingerprint": {  
                        "type": "long"
                    },
                    "embedding_vector_fingerprint": {  
                        "type": "long"
                    },
                    "embedding_vector_id": {  
                        "type": "long"
                    },
                }
            }
        }
    }
]
DEFAULT_INDEX = DEFAULT_INDICES[0]

client = Elasticsearch(core.env['elastic_search_host'], http_auth=(core.env['elastic_search_username'], core.env['elastic_search_password']))

def bulk(doc_list):
    response = None
    try:
        response = helpers.bulk(client, doc_list)
        core.log.info(response)
    except:
        core.log.error(dir(response))
        core.log.error(traceback.format_exc())

def create_default_indices():
    for index in DEFAULT_INDICES:
        response = None
        try:
            response = client.indices.create(index['name'], body=index['body'])
        except:
            core.log.error(dir(response))
            core.log.error(traceback.format_exc())

def search(body, index=DEFAULT_INDEX, size=1500, from_=0):
    response = client.search(index=index, body=body, size=size, from_=from_)
    
    return response

def index(body, index=DEFAULT_INDEX):
    response = None
    try:
        response = client.index(
            index=index,
            doc_type='_doc',
            id=uuid.uuid4(),
            body=body
        )            
        core.log.info(response)
    except:
        core.log.error(dir(response))
        core.log.error(traceback.format_exc())
    
    return response
    
def update(id, body, index=DEFAULT_INDEX):
    index = index.lower()
    response = client.update(
        index=index,
        doc_type='_doc',
        id=id,
        body=body
    )
    
    return response

def delete_by_query(body, index=DEFAULT_INDEX):
    response = None
    try:
        response = client.delete_by_query(index=index, body=body, ignore=400)
    except:
        core.log.error(dir(response))
        core.log.error(traceback.format_exc())
        
    return response
        
def delete_all_from_index(index=DEFAULT_INDEX):
    response = None
    try:
        response = client.delete_by_query(index=index, body={"query": {"match_all": {}}}, ignore=400)
    except:
        core.log.error(dir(response))
        core.log.error(traceback.format_exc())
        
    return response
    
def delete_index(index=DEFAULT_INDEX):
    response = None
    try:
        response = client.indices.delete(index)
    except:
        core.log.error(dir(response))
        core.log.error(traceback.format_exc())
        
    return response
    

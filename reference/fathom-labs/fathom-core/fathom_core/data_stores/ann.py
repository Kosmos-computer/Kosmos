import fathom_core as core
import data_stores.pinecone as pinecone
#import data_stores.milvus as milvus

_GLOBAL_COLLECTION_NAME = 'fathom'

# Pick primary ANN engine for search and get
#if core.env['ann'] == 'pinecone':
primary_ann = pinecone
#else:
#    primary_ann = milvus

# ANN interface common to all engines
def search(vector, collection_name=_GLOBAL_COLLECTION_NAME, partition_tag=None, max_results=20):    
    return primary_ann.search(vector, collection_name=collection_name, partition_tag=partition_tag, max_results=max_results)

def get(ids, collection_name=_GLOBAL_COLLECTION_NAME):
    return primary_ann.get(ids, collection_name=collection_name)

def delete(ids, collection_name=_GLOBAL_COLLECTION_NAME, filter=None):
    pinecone.delete(ids, collection_name=collection_name, filter=filter)
    #milvus.delete(ids, collection_name=collection_name)
    
def insert(vectors, collection_name=_GLOBAL_COLLECTION_NAME, partition_tag=None, data_model=None):
    #ids = milvus.insert(vectors, collection_name=collection_name, partition_tag=partition_tag)
    
    # Use milvus IDs as pinecone IDs
    #pinecone.upsert(vectors, collection_name=collection_name, partition_tag=partition_tag, data_model=data_model, ids=ids)

    # FUTURE: Use pinecone IDs
    ids = pinecone.upsert(vectors, collection_name=collection_name, partition_tag=partition_tag, data_model=data_model)
    
    return ids
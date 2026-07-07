import fathom_core as core
import fathom_pinecone as pinecone
import uuid
import numpy as np
from datetime import datetime

# ================================================================
# Interface
# ================================================================
def search(vector, collection_name=None, partition_tag=None, max_results=20):    
    profile = core.profiler.start(f"PINECONE SEARCH {collection_name} FOR TOP {max_results}")
    filter = {'_partition_tag': partition_tag} if partition_tag else None
    results = pinecone.search(vector, index_name=collection_name, filter=filter, max_results=max_results)
    core.profiler.end(profile)
    return results

def get(ids, collection_name=None):
    results = pinecone.get(ids, index_name=collection_name)
    return [v.values for v in results.vectors.values()] if results.vectors else None

def delete(ids, collection_name=None, filter=None):
    pinecone.delete(ids, index_name=collection_name, filter=filter)
    
def upsert(vectors, collection_name=None, partition_tag=None, data_model=None, ids=None):
    metadata = prepare_metadata_for_insert(partition_tag, data_model)
    tuples = []

    if ids is None:
        # Generate UUIDs for each vector, which is required by pinecone
        ids = []
        for i in range(len(vectors)):
            ids.append(str(uuid.uuid4()))

    tuples = [(ids[i], vector, metadata) for i, vector in enumerate(vectors)]
    
    pinecone.upsert(tuples, index_name=collection_name)
    return ids

# ================================================================
# Utilities
# ================================================================

def prepare_metadata_for_insert(partition_tag=None, data_model=None):
    metadata = {}

    if partition_tag:
        metadata['_partition_tag'] = partition_tag

    if data_model.__class__ == core.data_models.Podcast:
        metadata['podcast_id'] = data_model.id
        
    elif data_model.__class__ == core.data_models.PodcastEpisode:
        metadata['podcast_id'] = data_model.podcast_id
        metadata['podcast_episode_id'] = data_model.id
        metadata['timestamp'] = int(round(datetime(data_model.publication_date.year, data_model.publication_date.month, data_model.publication_date.day).timestamp()))

    return metadata

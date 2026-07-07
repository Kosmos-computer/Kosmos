# import fathom_core as core
# from milvus import Milvus, IndexType, MetricType, Status

# # Vector parameters
# _DIM = 768  # Dimension of vector
# _INDEX_FILE_SIZE = 2048  # Max file size of stored index
# _GLOBAL_COLLECTION_NAME = 'fathom'

# milvus = Milvus(core.env['milvus_host'], core.env['milvus_port'])

# LEGACY_COLLECTION_NAMES = {
#     # New name: Old name
#     'podcasts': 'pods',
#     'podcast-titles': 'podcast_titles',
#     'podcast-episode-transcript-segments': 'podcasts'
# }

# # ================================================================
# # Interface
# # ================================================================
# def search(vector, collection_name=_GLOBAL_COLLECTION_NAME, partition_tag=None, max_results=20, nprobe=1024):    
#     collection_name = transpose_collection_name(collection_name)
#     final_results = []
    
#     param = {
#         'collection_name': collection_name,
#         'query_records': [vector],
#         'top_k': max_results,
#         'partition_tags': [partition_tag] if partition_tag else None,
#         'params': {'nprobe': nprobe},
#     }
    
#     profile = core.profiler.start(f"MIVLUS SEARCH {collection_name} FOR TOP {max_results}")
#     status, results = milvus.search(**param)
#     core.profiler.end(profile)
    
#     if status.OK():
#         for result in results[0]:
#             final_results.append({
#                 'vector_id': result.id,
#                 'distance': result.distance
#             })
#     else:
#         core.log.warning("ANN: Search failed: {}".format(status))

#     return final_results

# def get(ids, collection_name=_GLOBAL_COLLECTION_NAME):
#     collection_name = transpose_collection_name(collection_name)
#     status, result_vectors = milvus.get_entity_by_id(collection_name, ids)
#     return result_vectors

# def delete(ids, collection_name=_GLOBAL_COLLECTION_NAME):
#     collection_name = transpose_collection_name(collection_name)
#     status = milvus.delete_entity_by_id(collection_name, ids)
#     return status
    
# def insert(vectors, ids=None, collection_name=_GLOBAL_COLLECTION_NAME, partition_tag=None):
#     collection_name = transpose_collection_name(collection_name)
#     ensure_collection(collection_name)
    
#     if partition_tag:
#         ensure_partition(collection_name, partition_tag)
    
#     status, ids = milvus.insert(collection_name=collection_name, records=vectors, ids=ids, partition_tag=partition_tag)
    
#     if not status.OK():
#         core.log.warning("ANN: Insert failed: {}".format(status))
#     #else:
#         #milvus.flush([collection_name])
        
#     return ids

# # ================================================================
# # Utilities
# # ================================================================
# def initialize():
#     # Create global if it dosen't exist.
#     ensure_collection(_GLOBAL_COLLECTION_NAME)

# def transpose_collection_name(new_name):
#     return LEGACY_COLLECTION_NAMES.get(new_name, new_name)

# def ensure_collection(collection_name):
#     collection_name = transpose_collection_name(collection_name)
#     status, ok = milvus.has_collection(collection_name)
    
#     if not ok:
#         param = {
#             'collection_name': collection_name,
#             'dimension': _DIM,
#             'index_file_size': _INDEX_FILE_SIZE,
#             'metric_type': MetricType.IP
#         }
        
#         core.log.info("ANN: Creating collection: {}".format(param))
#         milvus.create_collection(param)
        
#         index_param = {
#             'nlist': 4096
#         }

#         core.log.info("ANN: Creating index: {}".format(index_param))
#         status = milvus.create_index(collection_name, IndexType.IVF_FLAT, index_param)
        
# def ensure_partition(collection_name, partition_tag):
#     collection_name = transpose_collection_name(collection_name)
#     status, ok = milvus.has_partition(collection_name, partition_tag)
    
#     if not ok:
#         core.log.info("ANN: Creating partition: {} {}".format(collection_name, partition_tag))
#         milvus.create_partition(collection_name, partition_tag)
        
# def drop_partition(collection_name, partition_tag):
#     collection_name = transpose_collection_name(collection_name)
#     status = milvus.drop_partition(collection_name=collection_name, partition_tag=partition_tag)
#     return status

# def reset_all():
#     _, collections = milvus.list_collections()
    
#     for collection in collections:
#         status = milvus.drop_collection(collection)

#         if not status.OK():
#             core.log.warning("ANN: Drop collection failed: {}".format(status))
        

# initialize()
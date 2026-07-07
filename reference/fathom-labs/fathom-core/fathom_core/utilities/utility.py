import fathom_core as core
from itertools import islice
import requests

def drive(c):
    while True:
        try:
            c.send(None)
        except StopIteration as e:
            return e.value
            
def chunk(it, size):
    it = iter(it)
    chunks = iter(lambda: tuple(islice(it, size)), ())
    
    formatted_chunks = []
    for chunk in chunks:
        formatted_chunks.append(list(chunk))
    return formatted_chunks

def sort_objects_by_score(objects, scores_array, id_attribute, score_attribute):
    objects_with_scores = []
    score_map = {}
    for score in scores_array:
        score_map[score[id_attribute]] = score[score_attribute]

    for object in objects:
        object_score = 0
        if object.id in score_map:
            object_score = score_map[object.id]

        object_with_score = {
            'object': object,
            'score': object_score
        }
        objects_with_scores.append(object_with_score)
    
    objects_with_scores.sort(key=lambda x: x['score'], reverse=True)
    
    return objects_with_scores
    
def balanced_chunks(items, max_chunks):
    n_chunks = min(max_chunks, len(items))
    return [items[i::n_chunks] for i in range(n_chunks)]
    
def request_as_browser(url, stream=False, timeout=5):
    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36'}
    return requests.get(url, headers=headers, stream=stream, timeout=timeout)

def request_as_fathom_browser(url, stream=False, timeout=5, podcast=None):
    if podcast:
        headers = {'User-Agent': f'Fathom/2.0 Podcast Sync ({podcast.follower_count()} followers; feed-id={podcast.id};)'}
    else:
        headers = {'User-Agent': 'Fathom/2.0 Podcast Sync'}
    print(headers)
    return requests.get(url, headers=headers, stream=stream, timeout=timeout)

def download_file(url, temp_file_path='', local_filename=None):
    if local_filename is None:
        local_filename = url.split('/')[-1]
        
    file_path = temp_file_path + local_filename
    # NOTE the stream=True parameter below
    with request_as_browser(url, stream=True) as r:
        r.raise_for_status()
        with open(file_path, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192): 
                # If you have chunk encoded response uncomment if
                # and set chunk_size parameter to None.
                #if chunk: 
                f.write(chunk)
    return file_path
            
def reset_search():
    
    print('WARNING!!!')
    print('This will delete all data from Elastic Search, Milvus.')
    print(f"Database: {core.env['fathom_main_db']}")
    print(f"ElasticSearch: {core.env['elastic_search_host']}")
    print(f"Mivlus: {core.env['milvus_host']}")
    print('If you wish to proceed type: reset')

    reset = input('>')

    if reset == 'reset':
        print('Now deleting all data from Elastic Search, Milvus...')
        core.elastic.delete_all_from_index(index='podcasts')
        core.elastic.delete_index(index='podcasts')

        core.ann.reset_all()
    else:
        print('Reset cancelled.')

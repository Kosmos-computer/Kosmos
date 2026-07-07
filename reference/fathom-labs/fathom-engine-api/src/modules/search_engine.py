import app
import numpy as np
from datetime import date
import timestring
from scipy.spatial.distance import *

# TODO: Refactor this. All of this.
problematic_titles = ['Scott H Young Podcast', 'Serial', 'Little Stories for Tiny People: Anytime and bedtime stories for kids', 'Articles of Interest', 'Skeptoid', 'The Nonduality Podcast']

async def query_podcasts(query, user=None, fast=False):

    podcast_results = []

    # keyword search first
    keyword_title_results = []
    like_query = query.lower().replace(' ', '%')
    podcasts = app.core.data_models.Podcast \
        .where('title_lower', 'like', f"{like_query}%") \
        .or_where('url_slug', 'like', f"{like_query}%") \
        .or_where('title_lower', 'like', f"the {like_query}%") \
        .or_where('title_lower', 'like', f"a {like_query}%") \
        .or_where('author_lower', 'like', f"%{like_query}%") \
        .or_where('owner_name_lower', 'like', f"%{like_query}%") \
        .select('id', 'guid', 'title', 'author', 'owner_name') \
        .order_by('apple_rank', 'desc') \
        .order_by('podcast_index_popularity_score', 'desc') \
        .limit(20) \
        .get()

    for podcast in podcasts[:10]:
        podcast_result = {
            'id': podcast.id,
            'guid': podcast.guid,
            'title': podcast.title,
            'source': 'keyword_query',
            'score': 2.8 if query.lower() in podcast.title.lower() else 2.7
        }
        keyword_title_results.append(podcast_result)

    for podcast in podcasts:
        if len(podcast.title) > 1 and (podcast.title.lower() == query.lower() or (podcast.author and podcast.author.lower() == query.lower()) or (podcast.owner_name and podcast.owner_name.lower() == query.lower())):
            podcast_result = {
                'id': podcast.id,
                'guid': podcast.guid,
                'title': podcast.title,
                'source': 'keyword_query_exact_match',
                'score': 3,
            }
            keyword_title_results.append(podcast_result)

    # handle fast search for auto-suggest
    if fast:
        keyword_title_results.sort(key=lambda o: o['score'], reverse=True)

        # filter duplicates
        final_podcast_results = []
        used_podcast_ids = {}
        for result in keyword_title_results:
            if result['id'] not in used_podcast_ids:
                used_podcast_ids[result['id']] = True
                final_podcast_results.append(result)

        return final_podcast_results

    # vector based approaches
    query_embedding_vector_title = await app.core.inference.text_embedding_vector(query.title())
    query_embedding_vector_title = np.array(query_embedding_vector_title).astype(float)
    query_embedding_vector_title_normalized = query_embedding_vector_title / np.linalg.norm(query_embedding_vector_title)

    query_embedding_vector_title_with = await app.core.inference.text_embedding_vector(query.title() + ' with')
    query_embedding_vector_title_with = np.array(query_embedding_vector_title_with).astype(float)
    query_embedding_vector_title_with_normalized = query_embedding_vector_title_with / np.linalg.norm(query_embedding_vector_title_with)

    # create vector for topical search
    keyword_segment_matches = await app.core.data_models.TranscriptFile.match_search_segments(query, None, 50)
    keyword_vectors = []
    keyword_vector_weights = []
    #print(len(keyword_segment_matches))
    if len(keyword_segment_matches) > 5:
        for keyword_segment_match in keyword_segment_matches:
            #print(keyword_segment_match['_score'])
            #print(keyword_segment_match['_source']['content'])
            #print("---------------------------------------------------------------")
            keyword_vectors.append(np.array(keyword_segment_match['_source']['embedding_vector']).astype(float))
            keyword_vector_weights.append(keyword_segment_match['_score'])

        query_embedding_vector = np.average(
            keyword_vectors,
            weights=keyword_vector_weights,
            axis=0
        )
        query_embedding_vector = np.array(query_embedding_vector).astype(float)
        query_embedding_vector_normalized = query_embedding_vector / np.linalg.norm(query_embedding_vector)
    else:
        #print("USING QUERY FOR VECTOR")
        query_embedding_vector = await app.core.inference.text_embedding_vector(query)
        query_embedding_vector = np.array(query_embedding_vector).astype(float)
        query_embedding_vector_normalized = query_embedding_vector / np.linalg.norm(query_embedding_vector)


    # first vector pass
    ann_results = []
    ann_results = app.core.ann.search(
        query_embedding_vector_title_normalized.tolist(),
        collection_name=app.core.data_models.Podcast.TITLE_VECTOR_COLLECTION,
        max_results=10
    )

    distance_map = {}
    for ann_result in ann_results:
        distance_map[str(ann_result['vector_id'])] = ann_result['distance']

    podcasts = app.core.data_models.Podcast \
    .where_in('title_vector_id', list([str(ann_result['vector_id']) for ann_result in ann_results])) \
    .select('id', 'guid', 'title', 'title_vector_id') \
    .get()

    top_title_results = []
    bottom_title_results = []
    for podcast in podcasts:
        podcast_result = {
            'id': podcast.id,
            'guid': podcast.guid,
            'title': podcast.title,
            'source': 'titles_original_query',
            'score': distance_map[str(podcast.title_vector_id)],
        }

        if distance_map[str(podcast.title_vector_id)] > 0.75 and query.lower() in podcast.title.lower() and podcast.title.lower() not in problematic_titles:
            podcast_result['score'] = podcast_result['score'] + 2
            top_title_results.append(podcast_result)
        if distance_map[str(podcast.title_vector_id)] > 0.75 and query.lower() not in podcast.title.lower() and podcast.title.lower() not in problematic_titles:
            podcast_result['score'] = podcast_result['score'] + 1.5
            top_title_results.append(podcast_result)
        elif distance_map[str(podcast.title_vector_id)] > 0.65 and podcast.title.lower() not in problematic_titles:
            bottom_title_results.append(podcast_result)

    top_title_results.sort(key=lambda o: o['score'], reverse=True)
    bottom_title_results.sort(key=lambda o: o['score'], reverse=True)
    bottom_title_results = bottom_title_results[:1]

    # second pass "with" query
    if len(top_title_results) == 0:
        ann_results = []
        ann_results = app.core.ann.search(
            query_embedding_vector_title_with_normalized.tolist(),
            collection_name=app.core.data_models.Podcast.TITLE_VECTOR_COLLECTION,
            max_results=10
        )

        distance_map = {}
        for ann_result in ann_results:
            distance_map[str(ann_result['vector_id'])] = ann_result['distance']

        podcasts = app.core.data_models.Podcast \
        .where_in('title_vector_id', list([str(ann_result['vector_id']) for ann_result in ann_results])) \
        .select('id', 'guid', 'title', 'title_vector_id') \
        .get()

        for podcast in podcasts:
            podcast_result = {
                'id': podcast.id,
                'guid': podcast.guid,
                'title': podcast.title,
                'source': 'titles_original_query_plus_with',
                'score': distance_map[str(podcast.title_vector_id)],
            }

            if distance_map[str(podcast.title_vector_id)] > 0.75 and query.lower() in podcast.title.lower() and podcast.title.lower() not in problematic_titles:
                podcast_result['score'] = podcast_result['score'] + 2
                top_title_results.append(podcast_result)

            if distance_map[str(podcast.title_vector_id)] > 0.75 and query.lower() not in podcast.title.lower() and podcast.title.lower() not in problematic_titles:
                podcast_result['score'] = podcast_result['score'] + 1.5
                top_title_results.append(podcast_result)

    # have title good results? ditch the bad ones...
    if len(top_title_results) > 0 or len(keyword_title_results) > 0:
        bottom_title_results = []

    # fill in name with relevant podcasts
    topical_results = get_topical_results(query_embedding_vector_normalized)

    # no topical results from query, so, let's try similar podcasts to the top podcast
    if len(topical_results) == 0 and (len(keyword_title_results) > 0 or len(top_title_results) > 0):
        if len(keyword_title_results) > 0:
            top_podcast_id = keyword_title_results[0]['id']
        elif len(top_title_results) > 0:
            top_podcast_id = top_title_results[0]['id']

        podcast = app.core.data_models.Podcast.find(top_podcast_id)
        if podcast is not None and podcast.primary_vector() is not None:
            search_vector = np.array(podcast.primary_vector().vector).astype(float)
            search_vector = search_vector / np.linalg.norm(search_vector)

            topical_results = get_topical_results(search_vector)

    podcast_results = keyword_title_results + top_title_results + topical_results + bottom_title_results

    podcast_results.sort(key=lambda o: o['score'], reverse=True)

    # filter duplicates
    final_podcast_results = []
    used_podcast_ids = {}
    for result in podcast_results:
        if result['id'] not in used_podcast_ids:
            used_podcast_ids[result['id']] = True
            final_podcast_results.append(result)

    return final_podcast_results

def get_topical_results(search_vector):
    topical_results = []
    ann_results = []

    ann_results = app.core.ann.search(
        search_vector.tolist(),
        collection_name=app.core.data_models.Podcast.VECTOR_COLLECTION,
        max_results=30
    )

    distance_map = {}
    for ann_result in ann_results:
        distance_map[str(ann_result['vector_id'])] = ann_result['distance']

    podcasts = app.core.data_models.Podcast \
        .where_in('vector_id', list([str(ann_result['vector_id']) for ann_result in ann_results])) \
        .select('id', 'guid', 'title', 'vector_id') \
        .get()

    for podcast in podcasts:
        #print(podcast.title)
        #print(distance_map[podcast.vector_id])
        #print('---')
        if distance_map[str(podcast.vector_id)] >= 0.80 and podcast.title not in problematic_titles:
            podcast_result = {
                'id': podcast.id,
                'guid': podcast.guid,
                'title': podcast.title,
                'source': 'podcasts',
                'score': distance_map[str(podcast.vector_id)] + 1
            }

            topical_results.append(podcast_result)

    topical_results.sort(key=lambda o: o['score'], reverse=True)

    return topical_results

async def query(query, podcast_id=None, user=None):
    user_taste_vector = None
    if user is not None:
        user_taste_vector = await user.get_quick_taste_vector()
        if user_taste_vector is not None:
            user_taste_vector = np.array(user_taste_vector).astype(float)

    final_result = {
        'query_type': None,
        'results': []
    }

    print('Query:', query)
    query_analysis = await app.core.inference.text_analyze([query], 'statement_type')

    # Query structure determination
    # TODO: Refactor this entirely
    # secondary check - need better neural network
    question_starts = ["should", "would", "could", "can", "may", "shall", "will", "won't", "don't", "doesn't", "wouldn't", "shouldn't", "is", "isn't", "was", "wasn't", "were", "weren't", "have", "haven't", "had", "hadn't", "do", "does", "don't", "doesn't", "who", "whom", "what", "when", "where", "how", "why", "which"]
    query_parts = query.split()
    if len(query_parts) <= 4 and len(query_parts) > 0 and query_parts[0] not in question_starts:
        query_analysis['analyses'][0]['statement_type'] = 'statement'

    query_embedding_vector = 'None'
    if query_analysis['analyses'][0]['statement_type'] == 'question':
        final_result['query_type'] = 'question'
        #print('searching for ' + query)
        query_embedding_vector = await app.core.inference.text_embedding_vector(query)
        query = query[:1].upper() + query[1:]
        if '?' not in query:
            query = query + '?'
    else:
        # convert to question on the sly
        query = "what is " + query
        query_embedding_vector = await app.core.inference.text_embedding_vector(query)
        query = query[:1].upper() + query[1:]
        if '?' not in query:
            query = query + '?'
        final_result['query_type'] = 'question'


    # Branch based on query structure - after modifications everything is a question
    if final_result['query_type'] == 'question':
        # Handle question...
        if podcast_id is not None:
            num_results = 100
        else:
            num_results = 100

        # TODO: refactor
        keyword_segment_matches = await app.core.data_models.TranscriptFile.match_search_segments(query, podcast_id, num_results)
        #print('FROM KEYWORDS***************************************************')
        #for segment in keyword_segment_matches:
        #    print(segment['_score'])
        #    print(segment['_source']['content'])
        #    print('-----------------------------------------------------------')

        vector_segment_matches = await app.core.data_models.TranscriptFile.vector_search_segments(query, podcast_id, max_results=num_results, min_score=0.00, min_words=80)
        #print('FROM VECTORS***************************************************')
        #for segment in vector_segment_matches:
        #    print(segment['_score'])
        #    print(segment['_source']['content'])
        #    print('-----------------------------------------------------------')

        segment_matches = combine_segment_matches(keyword_segment_matches, vector_segment_matches)

        # START SCORING
        # Calculate episode vectors
        podcast_episodes = app.core.data_models.PodcastEpisode \
            .with_('vectors') \
            .with_('podcast') \
            .with_('podcast.vectors') \
            .select('title', 'guid', 'duration', 'id', 'podcast_id') \
            .where_in('guid', list([segment_match['_source']['podcast_episode_id'] for segment_match in segment_matches])) \
            .get()

        podcast_episode_vectors_map = {}
        for podcast_episode in podcast_episodes:
            if podcast_episode.primary_vector() is not None and podcast_episode.podcast.primary_vector() is not None:
                podcast_episode_vectors_map[str(podcast_episode.guid)] = {
                    'embedding_vector': podcast_episode.primary_vector().vector,
                    'podcast_embedding_vector': podcast_episode.podcast.primary_vector().vector,
                    'duration': podcast_episode.duration,
                    'title': podcast_episode.title,
                }

        # time / content filtering
        time_filtered_segment_matches = []
        for segment in segment_matches:
            if segment['_source']['podcast_episode_id'] in podcast_episode_vectors_map:
                duration = podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['duration']
                if duration == None:
                    duration = 0
                min_percent_duration = duration * 0.05
                min_start = min_percent_duration
                max_start = duration - min_percent_duration
                if segment['_source']['start'] > min_start and segment['_source']['start'] < max_start and not ("~~2com" or "~~2org") in segment['_source']['content']:
                    time_filtered_segment_matches.append(segment)
        segment_matches = time_filtered_segment_matches

        # initial scoring
        for segment in segment_matches:
            score_result_cosine = 1 - cosine(np.array(query_embedding_vector), np.array(segment['_source']['embedding_vector']))
            segment['_score_result_cosine'] = score_result_cosine

            score_result = 1 / euclidean(np.array(query_embedding_vector), np.array(segment['_source']['embedding_vector']))
            if user_taste_vector is not None:
                score_result_taste = 1 / euclidean(user_taste_vector, np.array(segment['_source']['embedding_vector']))
                score_result = np.average([score_result, score_result_taste], weights=[0.6, 0.4])
            segment['_score_result'] = score_result

            if podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['embedding_vector'] is not None \
                and len(podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['embedding_vector']) > 0:
                podcast_episode_vector = np.array(podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['embedding_vector']).astype(float)
                score_podcast_episode = 1 / euclidean(np.array(query_embedding_vector), podcast_episode_vector)
                if user_taste_vector is not None:
                    score_podcast_episode_taste = 1 / euclidean(user_taste_vector, podcast_episode_vector)
                    score_podcast_episode = np.average([score_podcast_episode, score_podcast_episode_taste], weights=[0.8, 0.2])
            else:
                score_podcast_episode = -1.0
            segment['_score_podcast_episode'] = score_podcast_episode

            if podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['embedding_vector'] is not None \
                and len(podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['podcast_embedding_vector']) > 0:
                podcast_vector = np.array(podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['podcast_embedding_vector']).astype(float)
                score_podcast = 1 / euclidean(np.array(query_embedding_vector), podcast_vector)
                if user_taste_vector is not None:
                    score_podcast_taste = 1 / euclidean(user_taste_vector, podcast_vector)
                    score_podcast = np.average([score_podcast, score_podcast_taste], weights=[0.8, 0.2])
            else:
                score_podcast = -1.0
            segment['_score_podcast'] = score_podcast

            segment['_score'] = np.average([score_result, score_podcast_episode, score_podcast], weights=[0.2, 0.4, 0.4])

            # print(score_result)
            # print(score_podcast)
            # print(segment['_score'])
            # print(podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['title'])
            # print(segment['_source']['content'])

        # standardize
        total_score = sum(list([s['_score'] for s in segment_matches]))
        for segment in segment_matches:
            segment['_score'] = segment['_score'] / total_score

        segment_matches = sorted(segment_matches, key=lambda x: (x['_score']), reverse=True)

        # get question answers
        results = await get_question_results(query, segment_matches[:100])

        # answer scoring
        # standardize
        total_score = sum(list([r['_highlight']['score'] for r in results]))
        for result in results:
            result['_highlight']['score'] = result['_highlight']['score'] / total_score

            final_score = np.average([result['_score'], result['_highlight']['score']], weights=[0.9, 0.1])
            result['_highlight']['score_answer'] = result['_highlight']['score']
            result['_highlight']['score'] = final_score

            # print(result['_search_method'])
            # print(result['_highlight'])
            # print(result['_source']['content'])
            # print('result:')
            # print(result['_score_result'])
            # print('podcast:')
            # print(result['_score_podcast'])
            # print('combined:')
            # print(result['_score'])
            # print('highlight:')
            # print(result['_highlight']['score'])
            # print('final:')
            # print(final_score)
            # print('---')

        if len(results) == 0:
            high_quality_segment_matches = []
            for segment in segment_matches:
                if segment['_score_result_cosine'] >= 0.45: # threshold non-answering results
                    high_quality_segment_matches.append(segment)
            results = await get_general_search_results(query, high_quality_segment_matches[:20])
        if len(results) < 10:
            unused_segments = []
            used_ids = list([segment['_source']['podcast_episode_id'] for segment in results])
            for segment in segment_matches:
                if segment['_source']['podcast_episode_id'] not in used_ids and segment['_score_result_cosine'] >= 0.45: # threshold non-answering results
                    unused_segments.append(segment)
                    if len(unused_segments) == 10:
                        break
            general_results = await get_general_search_results(query, unused_segments)
            for result in general_results:
                results.append(result)

        results = sorted(results, key=lambda x: (x['_highlight']['score']), reverse=True)
        results = results[:50]

        # Additional scoreing based on what will be played back to the user...

        playback_contents = [result['_playback']['content'] for result in results]
        playback_content_vectors = await app.core.inference.text_embedding_vectors_with_workers(playback_contents)
        playback_content_vectors = playback_content_vectors['embedding_vectors']
        for index, result in enumerate(results):
            score_playback = 1 / euclidean(np.array(query_embedding_vector), np.array(playback_content_vectors[index]).astype(float))
            if user_taste_vector is not None:
                score_user_taste = 1 / euclidean(user_taste_vector, np.array(playback_content_vectors[index]).astype(float))
                score_playback = np.average([score_playback, score_user_taste], weights=[0.3, 0.7])
            result['_playback']['score'] = score_playback
        total_playback_score = sum(list([r['_playback']['score'] for r in results]))

        for result in results:
            result['_playback']['score'] = result['_playback']['score'] / total_playback_score
            if 'score_answer' not in result['_highlight']:
                result['_highlight']['score_answer'] = 0
            final_score = np.average([result['_playback']['score'] , result['_highlight']['score_answer']], weights=[0.1, 0.9])
            result['_highlight']['score_original'] = result['_highlight']['score']
            result['_highlight']['score'] = final_score

        #results = sorted(results, key=lambda x: (x['_highlight']['score']), reverse=True)

        final_result['results'] = format_results(results)

        #print('FINAL RESULTS')
        #for result in final_result['results']:
        #    print(result)

    else:
        if podcast_id is not None:
            num_results = 50
        else:
            num_results = 50

        keyword_segment_matches = await app.core.data_models.TranscriptFile.match_search_segments(query, podcast_id, num_results)
        vector_segment_matches = await app.core.data_models.TranscriptFile.vector_search_segments(query, podcast_id, max_results=num_results, min_score=0.00, min_words=80)

        segment_matches = combine_segment_matches(keyword_segment_matches, vector_segment_matches)

        # START SCORING
        # Calculate episode vectors
        podcast_episodes = app.core.data_models.PodcastEpisode \
            .with_('vectors') \
            .with_('podcast') \
            .with_('podcast.vectors') \
            .select('title', 'simple_title', 'guid', 'duration', 'id', 'podcast_id') \
            .where_in('guid', list([segment_match['_source']['podcast_episode_id'] for segment_match in segment_matches])) \
            .get()

        for podcast_episode in podcast_episodes:
            if podcast_episode.simple_title is not None:
                podcast_episode.title = podcast_episode.simple_title

        #titles = list([podcast_episode.title.lower().replace('?', '.') for podcast_episode in podcast_episodes])
        #podcast_episode_descriptions_vectors = await app.core.inference.text_embedding_vectors_with_workers(titles)

        podcast_episode_vectors_map = {}
        for index, podcast_episode in enumerate(podcast_episodes):
            if podcast_episode.primary_vector() is not None and podcast_episode.podcast.primary_vector() is not None:
                podcast_episode_vectors_map[str(podcast_episode.guid)] = {
                    'embedding_vector': podcast_episode.primary_vector().vector,
                    #'description_vector': np.array(podcast_episode_descriptions_vectors['embedding_vectors'][index]).astype(float),
                    'podcast_embedding_vector': podcast_episode.podcast.primary_vector().vector,
                    'duration': podcast_episode.duration,
                    'title': podcast_episode.title,
                }

        # time and content filtering
        time_filtered_segment_matches = []
        for segment in segment_matches:
            if segment['_source']['podcast_episode_id'] in podcast_episode_vectors_map:
                duration = podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['duration']
                if duration == None:
                    duration = 0
                min_percent_duration = duration * 0.05
                min_start = min_percent_duration
                max_start = duration - (min_percent_duration * 3)
                if segment['_source']['start'] > min_start and segment['_source']['start'] < max_start and not ("~~2com" or "~~2org") in segment['_source']['content']:
                    time_filtered_segment_matches.append(segment)
        segment_matches = time_filtered_segment_matches

        # scoring

        # result
        for segment in segment_matches:
            result_vector = np.array(segment['_source']['embedding_vector']).astype(float)
            score_result = 1 / cosine(np.array(query_embedding_vector).astype(float), result_vector)

            if user_taste_vector is not None:
                score_result_taste = 1 / cosine(user_taste_vector, result_vector)
                score_result = np.average([score_result, score_result_taste], weights=[1.0, 0.0])

            segment['_score_result_cosine'] = score_result

        total_score = sum(list([s['_score_result_cosine'] for s in segment_matches]))
        for segment in segment_matches:
            segment['_score_result_cosine'] = segment['_score_result_cosine'] / total_score

        for segment in segment_matches:
            result_vector = np.array(segment['_source']['embedding_vector']).astype(float)
            score_result = 1 / euclidean(np.array(query_embedding_vector).astype(float), result_vector)

            if user_taste_vector is not None:
                score_result_taste = 1 / euclidean(user_taste_vector, result_vector)
                score_result = np.average([score_result, score_result_taste], weights=[1.0, 0.0])

            segment['_score_result_euclidean'] = score_result

        total_score = sum(list([s['_score_result_euclidean'] for s in segment_matches]))
        for segment in segment_matches:
            segment['_score_result_euclidean'] = segment['_score_result_euclidean'] / total_score

        for segment in segment_matches:
            segment['_score_result'] = np.average([segment['_score_result_euclidean'], segment['_score_result_cosine']], weights=[1.0, 1.0])

        # episode
        for segment in segment_matches:
            if podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['embedding_vector'] is not None \
                and len(podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['embedding_vector']) > 0:
                podcast_episode_vector = np.array(podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['embedding_vector']).astype(float)
                score_podcast_episode = 1 / cosine(np.array(query_embedding_vector).astype(float), podcast_episode_vector)

                if user_taste_vector is not None:
                    score_podcast_episode_taste = 1 / cosine(user_taste_vector, podcast_episode_vector)
                    score_podcast_episode = np.average([score_podcast_episode, score_podcast_episode_taste], weights=[1.0, 0.0])
            else:
                score_podcast_episode = -1.0
            segment['_score_podcast_episode_cosine'] = score_podcast_episode

        total_score = sum(list([s['_score_podcast_episode_cosine'] for s in segment_matches]))
        for segment in segment_matches:
            segment['_score_podcast_episode_cosine'] = segment['_score_podcast_episode_cosine'] / total_score

        for segment in segment_matches:
            if podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['embedding_vector'] is not None \
                and len(podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['embedding_vector']) > 0:
                podcast_episode_vector = np.array(podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['embedding_vector']).astype(float)
                score_podcast_episode = 1 / euclidean(np.array(query_embedding_vector).astype(float), podcast_episode_vector)

                if user_taste_vector is not None:
                    score_podcast_episode_taste = 1 / euclidean(user_taste_vector, podcast_episode_vector)
                    score_podcast_episode = np.average([score_podcast_episode, score_podcast_episode_taste], weights=[1.0, 0.0])
            else:
                score_podcast_episode = -1.0
            segment['_score_podcast_episode_euclidean'] = score_podcast_episode

        total_score = sum(list([s['_score_podcast_episode_euclidean'] for s in segment_matches]))
        for segment in segment_matches:
            segment['_score_podcast_episode_euclidean'] = segment['_score_podcast_episode_euclidean'] / total_score

        for segment in segment_matches:
            segment['_score_podcast_episode'] = np.average([segment['_score_podcast_episode_cosine'], segment['_score_podcast_episode_euclidean']], weights=[1.0, 1.0])

        # episode description
        #for segment in segment_matches:
        #    if podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['description_vector'] is not None \
        #        and len(podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['description_vector']) > 0:
        #        podcast_episode_description_vector = podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['description_vector']
        #        score_podcast_episode_description = 1 / cosine(np.array(query_embedding_vector).astype(float), podcast_episode_description_vector)
        #    else:
        #        score_podcast_episode_description = -1.0
        #    segment['_score_podcast_episode_description'] =  score_podcast_episode_description

        #total_score = sum(list([s['_score_podcast_episode_description'] for s in segment_matches]))
        #for segment in segment_matches:
        #    segment['_score_podcast_episode_description'] = segment['_score_podcast_episode_description'] / total_score

        # podcast
        for segment in segment_matches:
            if podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['embedding_vector'] is not None \
                and len(podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['podcast_embedding_vector']) > 0:
                podcast_vector = np.array(podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['podcast_embedding_vector']).astype(float)
                score_podcast = 1 / cosine(np.array(query_embedding_vector).astype(float), podcast_vector)

                if user_taste_vector is not None:
                    score_podcast_taste = 1 / cosine(user_taste_vector, podcast_vector)
                    score_podcast = np.average([score_podcast, score_podcast_taste], weights=[1.0, 0.0])
            else:
                score_podcast = -1.0
            segment['_score_podcast_cosine'] = score_podcast

        total_score = sum(list([s['_score_podcast_cosine'] for s in segment_matches]))
        for segment in segment_matches:
            segment['_score_podcast_cosine'] = segment['_score_podcast_cosine'] / total_score

        for segment in segment_matches:
            if podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['embedding_vector'] is not None \
                and len(podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['podcast_embedding_vector']) > 0:
                podcast_vector = np.array(podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['podcast_embedding_vector']).astype(float)
                score_podcast = 1 / cosine(np.array(query_embedding_vector).astype(float), podcast_vector)

                if user_taste_vector is not None:
                    score_podcast_taste = 1 / euclidean(user_taste_vector, podcast_vector)
                    score_podcast = np.average([score_podcast, score_podcast_taste], weights=[1.0, 0.0])
            else:
                score_podcast = -1.0
            segment['_score_podcast_euclidean'] = score_podcast

        total_score = sum(list([s['_score_podcast_euclidean'] for s in segment_matches]))
        for segment in segment_matches:
            segment['_score_podcast_euclidean'] = segment['_score_podcast_euclidean'] / total_score

        for segment in segment_matches:
            segment['_score_podcast'] = np.average([segment['_score_podcast_euclidean'], segment['_score_podcast_cosine']], weights=[1.0, 1.0])

        # average components
        for segment in segment_matches:
            segment['_score'] = np.average([
                segment['_score_result'],
                #segment['_score_podcast_episode_description'],
                segment['_score_podcast_episode'],
                segment['_score_podcast'],
            ], weights=[
                0.1,
                #0.1,
                0.5,
                0.4
            ])

        total_score = sum(list([s['_score'] for s in segment_matches]))
        for segment in segment_matches:
            segment['_score'] = segment['_score'] / total_score

        segment_matches = sorted(segment_matches, key=lambda x: (x['_score']), reverse=True)

        # for segment in segment_matches[:50]:
        #     print(podcast_episode_vectors_map[segment['_source']['podcast_episode_id']]['title'])
        #     print(segment['_source']['content'])
        #     print(segment['_search_method'])
        #     print('result')
        #     print(segment['_score_result'])
        #     print('episode')
        #     print(segment['_score_podcast_episode'])
        #     print('podcast')
        #     print(segment['_score_podcast'])
        #     print('overall')
        #     print(segment['_score'])
        #    print('---')

        results = await get_general_search_results(query, segment_matches[:50])

        final_result['results'] = format_results(results[:50])

    return final_result

def combine_segment_matches(keyword_segment_matches, vector_segment_matches):
    # Combine matches
    seen_content = []
    segment_matches = []
    l1 = len(vector_segment_matches)
    l2 = len(keyword_segment_matches)

    for i in range(max(l1, l2)):
        if i < l1:
            if vector_segment_matches[i]['_source']['content'] not in seen_content:
                segment_matches.append(vector_segment_matches[i])
                seen_content.append(vector_segment_matches[i]['_source']['content'])
        if i < l2:
            if keyword_segment_matches[i]['_source']['content'] not in seen_content:
                segment_matches.append(keyword_segment_matches[i])
                seen_content.append(keyword_segment_matches[i]['_source']['content'])

    return segment_matches

def format_results(segments):
    formatted_segments = []
    for segment in segments:
        formatted_segment = {
            'podcast_id': segment['_source']['podcast_id'],
            'podcast_episode_id': segment['_source']['podcast_episode_id'],
            'content': app.core.text.restore_non_alphanumerics(segment['_source']['content']),
            'highlight': segment['_highlight']['content'],
            'highlight_type': segment['_highlight']['type'],
            'start': segment['_playback']['start'],
            'end': segment['_playback']['end'],
            'score': segment['_highlight']['score'],
            'score_answer': segment['_highlight']['score_answer'],
            'playback_content': segment['_playback']['content'],
        }

        formatted_segments.append(formatted_segment)

    return formatted_segments

async def get_question_results(query, segments):
    answered_segments = []

    questions = []
    for segment in segments:
        question = {
            'context': segment['_source']['content'],
            'question': query
        }
        questions.append(question)

    inference = await app.core.inference.question_answer_with_workers(questions)

    for index, segment in enumerate(segments):
        answer = inference['answers'][index]['answer']
        score = inference['answers'][index]['score']

        if answer and answer not in [existing_answer['_highlight']['content'] for existing_answer in answered_segments]:
            #sentences = [sent.text for sent in app.nlp(document_part['_source']['content']).sents]
            segment['_sentences'] = []
            segment['_highlight'] = {
                'content': answer,
                'score': score,
                'type': 'answer'
            }

            start, end = app.core.data_models.TranscriptFile.get_segment_text_start_end(segment['_source'], answer, prior_sentences=3, min_prior_words=21)
            segment['_playback'] = {
                'start': start,
                'end': end,
                'content': get_segment_start_end_text(segment, start, end)
            }

            answered_segments.append(segment)

    answered_segments.sort(key=lambda segment: segment['_highlight']['score'], reverse=True)
    #top_indexes = np.array(list(map(lambda r: r['score'], answers))).argsort()[-10:][::-1]
    #answers = [answers[index] for index in top_indexes]
    #results[key]['items'] = answers
    return answered_segments

async def get_general_search_results(query, segments):
    text_contents = list([app.core.text.restore_non_alphanumerics(segment['_source']['content']) for segment in segments])

    analyses = await app.core.inference.text_analyze_with_workers(text_contents, 'keys')

    for index, segment in enumerate(segments):
        highlight_content = ''
        keyphrase = ''
        keyword = ''

        if analyses['analyses'][index]['keys'] and len(analyses['analyses'][index]['keys']['keyphrases']) > 0 and len(analyses['analyses'][index]['keys']['keywords']) > 0:
            keyphrase = analyses['analyses'][index]['keys']['keyphrases'][0]['text'].lower()

            for potential_keyword in analyses['analyses'][index]['keys']['keywords']:
                if potential_keyword['text'].lower() not in keyphrase:
                    keyword = potential_keyword['text'].lower()
                    break

            if keyword != '':
                highlight_content = highlight_content + '#' + keyword.title().replace(' ', '')

            if keyphrase != '':
                highlight_content = highlight_content + ' #' + keyphrase.title().replace(' ', '')

        segment['_sentences'] = []
        segment['_highlight'] = {
            'content': highlight_content,
            'score': segment['_score'],
            'type': 'keys'
        }

        start, end = app.core.data_models.TranscriptFile.get_segment_start_end(segment['_source'])
        segment['_playback'] = {
            'start': start,
            'end': end,
            'content': get_segment_start_end_text(segment, start, end)
        }

    return segments

def get_segment_start_end_text(segment, start, end):
    text = ''
    start_index = None
    end_index = None

    for index, word_element in enumerate(segment['_source']['word_elements']):
        if 'start' in word_element and word_element['start'] >= start and start_index is None:
            start_index = index
        if 'end' in word_element and word_element['end'] >= end and end_index is None:
            end_index = index

        if start_index is not None and end_index is not None:
            break

    # safety checks
    if start_index is None:
        start_index = 0
    if end_index is None:
        end_index = len(segment) - 1
    if end_index < 0:
        end_index = 0

    for word_element in segment['_source']['word_elements'][start_index:end_index]:
        if 'start' in word_element:
            text += f" {word_element['value']}"
        else:
            text += f"{word_element['value']}"

    return text

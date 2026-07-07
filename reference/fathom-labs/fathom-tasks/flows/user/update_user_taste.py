import fathom_core as core
log = core.log
env = core.env

from prefect import task, Flow, Parameter

import numpy as np
from datetime import timedelta

import boto3
from boto3.dynamodb.conditions import Key



def retrieve_podcast_episode_interactions(user_guid, dynamodb=None):
    if not dynamodb:
        dynamodb = boto3.resource('dynamodb')

    table = dynamodb.Table('fathomPodcastEpisodeInteractions')
    response = table.query(
        KeyConditionExpression=Key('userGuid').eq(user_guid)
    )
    return response['Items']

@task(max_retries=3, retry_delay=timedelta(seconds=3))
def retrieve_podcast_episode_transcript_segments(podcast_episode_interaction):
    #TODO KGM: Retrieve based on distinctListenedSegments, not all segments
    #TODO KGM: Retrieve episode vector and calculate weighted average limit overweighting of concepts
    #TODO KGM: Limit based on totalPodcastEpisodeListenDuration > 20 seconds
    segments = core.data_models.TranscriptFile.get_segments_by_podcast_episode_id(podcast_episode_interaction['podcastEpisodeGuid'])
    print('here')
    return segments

@task(max_retries=3, retry_delay=timedelta(seconds=3))
def calculate_user_taste(user_guid, podcast_episode_interactions, podcast_episodes_transcript_segments):    
    content_embedding_vectors = []
    for podcast_episode_segments in podcast_episodes_transcript_segments:
        for segment in podcast_episode_segments:
            content_embedding_vectors.append(segment['_source']['embedding_vector'])
    
    #TODO KGM: Weight based on episode dwell times
    new_taste_vector = np.mean(content_embedding_vectors, axis=0)
    # print(new_taste_vector.tolist())
    
    user = core.data_models.User.where('guid', user_guid).first()
    user_taste_vector = core.data_models.UserTasteVector()
    user_taste_vector.user_id = user.id
    user_taste_vector.type = 'interaction'
    user_taste_vector.save()
    
    user_taste_vector.vector = new_taste_vector.tolist()
    user_taste_vector.save()

@task(max_retries=3, retry_delay=timedelta(seconds=3))
def retrieve_users_needing_update():
    pass

@task(max_retries=3, retry_delay=timedelta(seconds=3))
def update_user_taste():
    pass

with Flow("update_user_tastes") as flow:
    user_ids = retrieve_users_needing_update()
    update_user_taste.map(user_ids)

from prefect.storage import Local
flow.storage = Local(path="/app/flows/user/update_user_taste.py", stored_as_script=True)

from prefect.run_configs import LocalRun
flow.run_config = LocalRun(working_dir="/app", labels=["fathom-tasks"])

# from prefect.run_configs import DockerRun
# flow.run_config = DockerRun(
#     image="410192009209.dkr.ecr.us-east-1.amazonaws.com/fathom-tasks:latest",
#     labels=["fathom-tasks"]
# )

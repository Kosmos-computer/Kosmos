import fathom_core as core
log = core.log
env = core.env

from prefect import task, Flow, Parameter

import numpy as np
from datetime import timedelta
import time

import boto3
from boto3.dynamodb.conditions import Key

# ------------------------------------------------------------------------------
# Utility Functions
# ------------------------------------------------------------------------------

def retrieve_podcast_episode_interactions(user_guid):
    if env['aws_access_key'] is not None and env['aws_access_secret'] is not None:
        dynamodb = boto3.resource('dynamodb', aws_access_key_id=env['aws_access_key'], aws_secret_access_key=env['aws_access_secret'], region_name = 'us-east-1')
    else:
        dynamodb = boto3.resource('dynamodb')

    table = dynamodb.Table('fathomPodcastEpisodeInteractions')
    response = table.query(
        KeyConditionExpression=Key('userGuid').eq(user_guid)
    )
    return response['Items']

def retrieve_podcast_episode_transcript_segments(podcast_episode_interaction):
    # TODO KGM: Retrieve based on distinctListenedSegments, not all segments
    # TODO KGM: Retrieve episode vector and calculate weighted average limit overweighting of concepts
    # TODO KGM: Limit based on totalPodcastEpisodeListenDuration > 20 seconds
    return core.data_models.TranscriptFile.get_segments_by_podcast_episode_id(podcast_episode_interaction['podcastEpisodeGuid'],  source='embedding_vector')

def calculate_user_taste(user_guid, podcast_episode_interactions, podcast_episodes_transcript_segments):    
    content_embedding_vectors = []
    for podcast_episode_segments in podcast_episodes_transcript_segments:
        for segment in podcast_episode_segments:
            content_embedding_vectors.append(segment['_source']['embedding_vector'])
    
    # TODO KGM: Weight based on episode dwell times
    new_taste_vector = np.mean(content_embedding_vectors, axis=0)
    # print(new_taste_vector.tolist())
    
    user = core.data_models.User.where('guid', user_guid).first()
    user_taste_vector = core.data_models.UserTasteVector()
    user_taste_vector.user_id = user.id
    user_taste_vector.type = 'interaction'
    user_taste_vector.save()
    
    user_taste_vector.vector = new_taste_vector.tolist()
    user_taste_vector.save()
    
def finalize_user_taste_update(user_guid):    
    user = core.data_models.User.where('guid', user_guid).first()
    user.last_taste_update_epoch = int(time.time())
    user.save()
    
# ------------------------------------------------------------------------------
# Tasks
# ------------------------------------------------------------------------------
    
@task(max_retries=3, retry_delay=timedelta(seconds=3))
def retrieve_users_needing_update():
    system_settings = core.data_models.SystemSettings.first()
    
    users_to_update = core.data_models.User \
        .where_raw('last_request_taste_update_epoch > last_taste_update_epoch or (last_request_taste_update_epoch is not null and last_taste_update_epoch is null)') \
        .limit(system_settings.user_taste_updates_per_flow_run) \
        .select('guid') \
        .get()

    user_guids = []
    for user_to_update in users_to_update:
        user_guids.append(user_to_update.guid)

    # prevent duplicate task on next scheduled run, less than ideal since update is not complete
    current_unix_epoch = int(time.time())
    for guid in user_guids:
        core.data_models.User.where('guid', guid).update({ 'last_taste_update_epoch': current_unix_epoch })
    
    # LOAD TESTING
    # user_guids = []
    # for index in range(0,500):
    #     user_guids.append('7d60e698-1ae0-4667-97b9-d8f835b1bb54')
    
    return user_guids

@task(max_retries=3, retry_delay=timedelta(seconds=3))
def update_user_taste(user_guid):
    podcast_episode_interactions = retrieve_podcast_episode_interactions(user_guid)
    
    podcast_episodes_transcript_segments = []
    for podcast_episode_interaction in podcast_episode_interactions:
        podcast_episodes_transcript_segments.append(retrieve_podcast_episode_transcript_segments(podcast_episode_interaction))
    
    calculate_user_taste(user_guid, podcast_episode_interactions, podcast_episodes_transcript_segments)
    finalize_user_taste_update(user_guid)

# ------------------------------------------------------------------------------
# Flow
# ------------------------------------------------------------------------------

with Flow("update_users_tastes") as flow:
    user_guids = retrieve_users_needing_update()
    update_user_taste.map(user_guids)
    
    # TODO FUTURE: Schedule another run-of-self at end-of-flow instead of interval scheduling to prevent concurrent execution

# from prefect.schedules import IntervalSchedule
# flow.schedule = IntervalSchedule(interval=timedelta(minutes=1))

from prefect.storage import Local
flow.storage = Local(path="/app/flows/user/update_users_tastes.py", stored_as_script=True)

# ECS Containers
from prefect.run_configs import LocalRun
flow.run_config = LocalRun(working_dir="/app", labels=["fathom-tasks"])

# EC2 Prefect Docker Agent
# from prefect.run_configs import DockerRun
# flow.run_config = DockerRun(
#     image="410192009209.dkr.ecr.us-east-1.amazonaws.com/fathom-tasks:latest",
#     labels=["fathom-tasks"]
# )

# from prefect.executors import DaskExecutor
# flow.executor = DaskExecutor(
#     address="tcp://54.146.111.46:8786",
#     client_kwargs={
#         "asynchronous": "True",
#     }
# )
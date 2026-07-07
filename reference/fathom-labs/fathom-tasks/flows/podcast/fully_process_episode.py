# ###################################################################################
# Flow: Fully Process Episode
# 
# This flow fully processes a podcast episode in any state. This
# is intended for one-off runs. It will block asynchronously until transcription
# is finished, so running it at-scale is not an efficient use of threads/resources.
# 
# ###################################################################################

import fathom_core as core

import prefect
from prefect import task, Flow, Parameter
from prefect.engine import signals

from datetime import timedelta
import asyncio

FLOW_NAME = "fully_process_episode"

# ------------------------------------------------------------------------------
# Utility Functions
# ------------------------------------------------------------------------------

def fetch_episode(id):
    logger = prefect.context.get("logger")
    logger.info(f"FETCHING EPISODE: ID #{id}")
    return core.data_models.PodcastEpisode.find_or_fail(id)

# ------------------------------------------------------------------------------
# Tasks
# ------------------------------------------------------------------------------

@task(max_retries=3, retry_delay=timedelta(seconds=3))
def store_audio(id):
    # This check is necessary and bizarre - Prefect will literally pass in a Parameter for the id when registering the flow, raising an exception with orator
    if isinstance(id, Parameter):
        return True

    episode = fetch_episode(id)

    if not episode.should_store_audio():
        raise signals.SKIP()

    episode.store_audio()

    return True

@task(skip_on_upstream_skip=False, max_retries=3, retry_delay=timedelta(seconds=3))
def transcribe(id, depends):
    if isinstance(id, Parameter):
        return True

    episode = fetch_episode(id)

    if episode.should_request_transcription() and not episode.should_store_transcription():
        raise signals.SKIP()
   
    episode.request_transcription()
    asyncio.run(episode.wait_until_transcription_is_finished())
    episode.store_transcription()
    
    return True
    
@task(skip_on_upstream_skip=False, max_retries=3, retry_delay=timedelta(seconds=3))
def ingest_search(id, depends):
    if isinstance(id, Parameter):
        return True

    episode = fetch_episode(id)

    if not episode.should_search_ingest():
        raise signals.SKIP()
    
    asyncio.run(episode.search_ingest())

    return True
    
@task(skip_on_upstream_skip=False, max_retries=3, retry_delay=timedelta(seconds=3))
def generate_preview(id, depends):
    if isinstance(id, Parameter):
        return True

    episode = fetch_episode(id)

    if not episode.should_generate_previews():
        raise signals.SKIP()
    
    asyncio.run(episode.generate_previews())

    return True

# ------------------------------------------------------------------------------
# Flow
# ------------------------------------------------------------------------------

with Flow(FLOW_NAME) as flow:
    id = Parameter('id', required=True)
    audio_stored = store_audio(id)
    transcribed = transcribe(id, audio_stored)
    search_ingested = ingest_search(id, transcribed)
    generate_preview(id, search_ingested)
    
from prefect.storage import Local
flow.storage = Local(path=f"/app/flows/podcast/{FLOW_NAME}.py", stored_as_script=True)

# ECS Containers
from prefect.run_configs import LocalRun
flow.run_config = LocalRun(working_dir="/app", labels=["fathom-episode-processing"])
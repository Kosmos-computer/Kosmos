# ###################################################################################
# Flow: Update Episode Transcription Status
# 
# This flow fetches episodes that were submitted for transcription to Rev.AI and
# updates the status of the transcription job. When transcription is complete,
# the episode is picked up for post-processing.
# 
# ###################################################################################

import fathom_core as core

import prefect
import pendulum
from prefect import task, Flow
from prefect.engine import signals
from prefect.tasks.prefect import create_flow_run
from prefect.triggers import always_run

from flows.graphql import running_flow_count_exceeds
from flows.profiling import transaction

FLOW_NAME = "update_episode_transcription_status"

# ------------------------------------------------------------------------------
# Tasks
# ------------------------------------------------------------------------------

@task(timeout = 300)
def fetch_episode_ids():
    if running_flow_count_exceeds(FLOW_NAME, 1):
        raise signals.SKIP()

    ids = core.data_models.PodcastEpisode \
        .dataset_should_update_transcription_status() \
        .order_by_processing_priority() \
        .limit(20) \
        .select('podcast_episodes.id') \
        .lists('id')

    return ids

@task(timeout = 300)
def update_episode_transcription_status(id):
    with transaction("update_episode_transcription_status"):
        logger = prefect.context.get("logger")

        logger.info(f"FETCHING EPISODE: ID #{id}")
        episode = core.data_models.PodcastEpisode.find_or_fail(id)
        episode.logger = logger

        logger.info(f"UPDATING TRANSCRIPTION STATUS FOR EPISODE: {episode.title}")
        with episode.error_logging():
            episode.update_transcription_status()

        return True

@task(trigger=always_run)
def schedule_next_run(updates):
    if len(updates) == 0:
        delay_minutes = 1
    else:
        delay_minutes = 0

    create_flow_run.run(
        flow_name=FLOW_NAME,
        scheduled_start_time=pendulum.now().add(minutes=delay_minutes)
    )

# ------------------------------------------------------------------------------
# Flow
# ------------------------------------------------------------------------------

with Flow(FLOW_NAME) as flow:
    ids = fetch_episode_ids()
    updates = update_episode_transcription_status.map(id=ids)
    schedule_next_run(updates)
    
from prefect.storage import Local
flow.storage = Local(path=f"/app/flows/podcast/{FLOW_NAME}.py", stored_as_script=True)

# ECS Containers
from prefect.run_configs import LocalRun
flow.run_config = LocalRun(working_dir="/app", labels=["fathom-episode-processing"])
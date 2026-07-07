# ###################################################################################
# Flow: Pre-Process Episodes
#
# This flow fetches episodes that need to be pre-processed (storing audio and/or
# requesting transcription jobs) and does so. Then it reschedules itself.
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

FLOW_NAME = "pre_process_episodes"

# ------------------------------------------------------------------------------
# Tasks
# ------------------------------------------------------------------------------

@task(timeout = 600) # performing deepgram transcription in-process temporarily (should take < 1 min)
def fetch_episode_ids():
    if running_flow_count_exceeds(FLOW_NAME, 1):
        raise signals.SKIP()

    ids = core.data_models.PodcastEpisode \
        .dataset_needs_pre_processing() \
        .order_by_processing_priority() \
        .limit(20) \
        .select('podcast_episodes.id') \
        .lists('id')

    return ids

@task(timeout = 300)
def pre_process_episode(id):
    with transaction("pre_process_episode"):
        logger = prefect.context.get("logger")

        logger.info(f"FETCHING EPISODE: ID #{id}")
        episode = core.data_models.PodcastEpisode.find_or_fail(id)
        episode.logger = logger

        logger.info(f"PRE-PROCESSING EPISODE: {episode.title}")
        with episode.error_logging():
            episode.pre_process()

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
    updates = pre_process_episode.map(id=ids)
    schedule_next_run(updates)

from prefect.storage import Local
flow.storage = Local(path=f"/app/flows/podcast/{FLOW_NAME}.py", stored_as_script=True)

# ECS Containers
from prefect.run_configs import LocalRun
flow.run_config = LocalRun(working_dir="/app", labels=["fathom-episode-processing"])

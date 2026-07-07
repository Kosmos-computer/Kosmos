# ###################################################################################
# Flow: Refresh Vector Collections for Episodes
# 
# This flow fetches episodes that need to be added/removed from vector collections
# and does so.
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

FLOW_NAME = "refresh_episode_vector_collections"

# ------------------------------------------------------------------------------
# Tasks
# ------------------------------------------------------------------------------

@task(timeout = 300)
def fetch_episode_ids():
    if running_flow_count_exceeds(FLOW_NAME, 1):
        raise signals.SKIP()

    ids = core.data_models.PodcastEpisode \
        .dataset_should_refresh_vector_collections() \
        .order_by_processing_priority() \
        .limit(100) \
        .select('podcast_episodes.id') \
        .lists('id')

    return ids

@task(timeout = 300)
def refresh_episode_vector_collections(id):
    with transaction("refresh_episode_vector_collections"):
        logger = prefect.context.get("logger")

        logger.info(f"FETCHING EPISODE: ID #{id}")
        episode = core.data_models.PodcastEpisode.find_or_fail(id)
        episode.logger = logger

        logger.info(f"REFRESHING VECTOR COLLECTIONS FOR EPISODE: {episode.title}")
        episode.refresh_vector_collections()

        return True

@task(trigger=always_run)
def schedule_next_run(updates):
    if len(updates) == 0:
        delay_minutes = 5
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
    updates = refresh_episode_vector_collections.map(id=ids)
    schedule_next_run(updates)
    
from prefect.storage import Local
flow.storage = Local(path=f"/app/flows/podcast/{FLOW_NAME}.py", stored_as_script=True)

# ECS Containers
from prefect.run_configs import LocalRun
flow.run_config = LocalRun(working_dir="/app", labels=["fathom-episode-processing"])

# ###################################################################################
# Flow: Load SingleStore Unit Vectors
# 
# This flow fetches all episode vectors without a SingleStore sibling and 
# loads them into SingleStore.
# 
# ###################################################################################

import fathom_core as core
log = core.log
env = core.env

import prefect
from prefect import task, Flow

FLOW_NAME = "load_singlestore_episode_unit_vectors"

# ------------------------------------------------------------------------------
# Tasks
# ------------------------------------------------------------------------------

@task
def fetch_podcast_episode_ids_to_load():
    existing_single_store_ids = core.data_models.SinglestorePodcastEpisodeUnitVector \
        .lists('podcast_episode_id')

    existing_postgres_ids = core.data_models.PodcastEpisodeVector \
        .lists('podcast_episode_id')
        
    missing_podcast_episode_ids = list(set(existing_postgres_ids).symmetric_difference(existing_single_store_ids))

    return missing_podcast_episode_ids

@task
def load_vectors(podcast_episode_ids):
    logger = prefect.context.get("logger")
    logger.info(f"LOADING {len(podcast_episode_ids)} PODCAST EPISODE VECTORS INTO SINGLESTORE...")
    
    for podcast_episode_id in podcast_episode_ids:
        logger.info(f"FETCHING VECTOR FOR PODCAST EPISODE: ID #{podcast_episode_id}")
        vector = core.data_models.PodcastEpisodeVector.where('podcast_episode_id', podcast_episode_id).first()
        
        if vector and vector.podcast_episode:
            logger.info(f"LOADING VECTOR FOR PODCAST EPISODE: ID #{podcast_episode_id}")
            core.data_models.SinglestorePodcastEpisodeUnitVector.upsert_from_podcast_episode_vector(vector)
            vector.podcast_episode.set_process_attribute('vector_generated', 'true')

    return True

# ------------------------------------------------------------------------------
# Flow
# ------------------------------------------------------------------------------

with Flow(FLOW_NAME) as flow:
    podcast_episode_ids = fetch_podcast_episode_ids_to_load()
    load_vectors(podcast_episode_ids)
    
from prefect.storage import Local
flow.storage = Local(path=f"/app/flows/utility/{FLOW_NAME}.py", stored_as_script=True)

# ECS Containers
from prefect.run_configs import LocalRun
flow.run_config = LocalRun(working_dir="/app", labels=["fathom-tasks"])

#flow.run()

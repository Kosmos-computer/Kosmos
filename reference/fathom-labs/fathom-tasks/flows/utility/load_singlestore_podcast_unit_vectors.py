# ###################################################################################
# Flow: Load SingleStore Unit Vectors
# 
# This flow fetches all podcast vectors without a SingleStore sibling and 
# loads them into SingleStore.
# 
# ###################################################################################

import fathom_core as core
log = core.log
env = core.env

import prefect
from prefect import task, Flow

FLOW_NAME = "load_singlestore_podcast_unit_vectors"

# ------------------------------------------------------------------------------
# Tasks
# ------------------------------------------------------------------------------

@task
def fetch_podcast_ids_to_load():
    existing_single_store_ids = core.data_models.SinglestorePodcastUnitVector \
        .lists('podcast_id')

    existing_postgres_ids = core.data_models.PodcastVector \
        .lists('podcast_id')
        
    missing_podcast_ids = list(set(existing_postgres_ids).symmetric_difference(existing_single_store_ids))

    return missing_podcast_ids

@task
def load_vectors(podcast_ids):
    logger = prefect.context.get("logger")
    logger.info(f"LOADING {len(podcast_ids)} PODCAST VECTORS INTO SINGLESTORE...")

    for podcast_id in podcast_ids:
        logger.info(f"FETCHING VECTOR FOR PODCAST: ID #{podcast_id}")
        vector = core.data_models.PodcastVector.where('podcast_id', podcast_id).first()
        
        if vector and vector.podcast:
            logger.info(f"LOADING VECTOR FOR PODCAST: ID #{podcast_id}")
            core.data_models.SinglestorePodcastUnitVector.upsert_from_podcast_vector(vector)

    return True

# ------------------------------------------------------------------------------
# Flow
# ------------------------------------------------------------------------------

with Flow(FLOW_NAME) as flow:
    podcast_ids = fetch_podcast_ids_to_load()
    load_vectors(podcast_ids)
    
from prefect.storage import Local
flow.storage = Local(path=f"/app/flows/utility/{FLOW_NAME}.py", stored_as_script=True)

# ECS Containers
from prefect.run_configs import LocalRun
flow.run_config = LocalRun(working_dir="/app", labels=["fathom-tasks"])

#flow.run()

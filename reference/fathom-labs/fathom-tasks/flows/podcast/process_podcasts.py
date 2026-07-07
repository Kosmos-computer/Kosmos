# ###################################################################################
# Flow: Process Podcasts
# 
# This flow takes 100 podcasts off the update priority list, and processes them in
# parallel (given the number of processor threads), then reschedules itself to run 
# again. Errors during processing show up at both the Prefect Task level and on
# the podcasts.error field in the database. This flow will always be successful
# regardless of individual podcast updates.
# 
# ###################################################################################

import fathom_core as core
log = core.log
env = core.env

import pendulum
import prefect
from prefect import task, Flow
from prefect.tasks.prefect import create_flow_run
from prefect.triggers import always_run
from prefect.engine import signals

from flows.graphql import running_flow_count_exceeds
from flows.profiling import transaction
from prefect.executors import LocalDaskExecutor

from datetime import timedelta

FLOW_NAME = "process_podcasts"

# ------------------------------------------------------------------------------
# Tasks
# ------------------------------------------------------------------------------

@task(timeout = 128)
def fetch_podcast_ids_to_update():
    if running_flow_count_exceeds(FLOW_NAME, 1):
        raise signals.SKIP()

    level_3_ids = core.data_models.Podcast \
        .ready_to_update(processing_levels=[3]) \
        .order_by_update_priority() \
        .limit(512) \
        .lists('id')
        
    level_3_id_groups = core.utility.balanced_chunks(level_3_ids, 4)
    
    formatted_level_3_id_groups = []
    for level_3_id_group in level_3_id_groups:
        formatted_level_3_id_group = {
            'ids': level_3_id_group
        }
        formatted_level_3_id_groups.append(formatted_level_3_id_group)

    return formatted_level_3_id_groups

@task(timeout = 32768)
def process_podcasts(id_group):
    for id in id_group['ids']:
        try:
            with transaction("process_podcast"):
                logger = prefect.context.get("logger")

                logger.info(f"FETCHING PODCAST: ID #{id}")
                podcast = core.data_models.Podcast.find_or_fail(id)
                podcast.logger = logger

                logger.info(f"PROCESSING PODCAST: {podcast.title}")
                with podcast.error_logging():
                    podcast.update()
        except:
            pass
            
    return True

@task(trigger=always_run)
def schedule_next_run(updates):
    if updates == None or len(updates) == 0:
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

with Flow(FLOW_NAME, executor=LocalDaskExecutor(scheduler="threads", num_workers=4)) as flow:
    podcast_id_groups = fetch_podcast_ids_to_update()
    updates = process_podcasts.map(id_group=podcast_id_groups)
    schedule_next_run(updates)
    
from prefect.storage import Local
flow.storage = Local(path=f"/app/flows/podcast/{FLOW_NAME}.py", stored_as_script=True)

# ECS Containers
from prefect.run_configs import LocalRun
flow.run_config = LocalRun(working_dir="/app", labels=["fathom-podcast-processing"])

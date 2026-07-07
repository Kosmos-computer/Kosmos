from prefect import task, Flow, context
from prefect.tasks.prefect import create_flow_run

from flows.graphql import flow_is_not_running
from flows.podcast.process_podcasts import flow as process_podcasts
from flows.podcast.process_podcasts_l2 import flow as process_podcasts_l2
from flows.podcast.post_process_episodes import flow as post_process_episodes
from flows.podcast.pre_process_episodes import flow as pre_process_episodes
from flows.podcast.update_episode_transcription_status import flow as update_episode_transcription_status
from flows.podcast.refresh_episode_vector_collections import flow as refresh_episode_vector_collections
from flows.podcast.send_new_episode_notifications import flow as send_new_episode_notifications


FLOW_NAME = "keep_flows_alive"

flows_to_keep_alive = [
    process_podcasts,
    process_podcasts_l2,
    post_process_episodes,
    pre_process_episodes,
    send_new_episode_notifications
]

@task
def keep_flows_alive():
    for flow in flows_to_keep_alive:
        if flow_is_not_running(flow.name):
            logger = context.get("logger")
            logger.info(f"Flow {flow.name} is not running! Creating flow run...")
            create_flow_run.run(flow_name=flow.name)

# ------------------------------------------------------------------------------
# Flow
# ------------------------------------------------------------------------------

with Flow(FLOW_NAME) as flow:
    keep_flows_alive()

from prefect.storage import Local
flow.storage = Local(path=f"/app/flows/utility/{FLOW_NAME}.py", stored_as_script=True)

# ECS Containers
from prefect.run_configs import LocalRun
flow.run_config = LocalRun(working_dir="/app", labels=["fathom-tasks"])

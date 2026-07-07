import sys

from flows.podcast.fully_process_episode import flow as fully_process_episode
from flows.podcast.post_process_episodes import flow as post_process_episodes
from flows.podcast.pre_process_episodes import flow as pre_process_episodes
from flows.podcast.send_new_episode_notifications import flow as send_new_episode_notifications
from flows.podcast.process_podcasts import flow as process_podcasts
from flows.podcast.process_podcasts_l2 import flow as process_podcasts_l2
from flows.podcast.refresh_episode_vector_collections import flow as refresh_episode_vector_collections
from flows.podcast.update_episode_transcription_status import flow as update_episode_transcription_status
from flows.user.update_users_tastes import flow as update_users_tastes
from flows.utility.keep_flows_alive import flow as keep_flows_alive
from flows.utility.load_singlestore_episode_unit_vectors import flow as load_singlestore_episode_unit_vectors
from flows.utility.load_singlestore_podcast_unit_vectors import flow as load_singlestore_podcast_unit_vectors
from flows.test.dask import flow as test_dask

flows = [
    fully_process_episode,
    post_process_episodes,
    pre_process_episodes,
    send_new_episode_notifications,
    process_podcasts,
    process_podcasts_l2,
    refresh_episode_vector_collections,
    update_episode_transcription_status,
    update_users_tastes,
    keep_flows_alive,
    load_singlestore_episode_unit_vectors,
    load_singlestore_podcast_unit_vectors,
    test_dask,
]

def register():
    for flow in flows:
        flow.register(project_name="Fathom", add_default_labels=False)

if sys.argv[1] == "test":
    import fathom_core as core
    print("fathom-tasks loaded successfully")

if sys.argv[1] == "register":
    register()

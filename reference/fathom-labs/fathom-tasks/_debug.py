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

# fully_process_episode.register(project_name="Fathom", add_default_labels=False)
# post_process_episodes.register(project_name="Fathom", add_default_labels=False)
# pre_process_episodes.register(project_name="Fathom", add_default_labels=False)
# send_new_episode_notifications.register(project_name="Fathom", add_default_labels=False)
# process_podcasts.register(project_name="Fathom", add_default_labels=False)
# process_podcasts_l2.register(project_name="Fathom", add_default_labels=False)
# refresh_episode_vector_collections.register(project_name="Fathom", add_default_labels=False)
# update_episode_transcription_status.register(project_name="Fathom", add_default_labels=False)
# update_users_tastes.register(project_name="Fathom", add_default_labels=False)
# keep_flows_alive.register(project_name="Fathom", add_default_labels=False)
# load_singlestore_episode_unit_vectors.register(project_name="Fathom", add_default_labels=False)
# load_singlestore_podcast_unit_vectors.register(project_name="Fathom", add_default_labels=False)

from prefect.executors import LocalExecutor
from prefect.executors import LocalDaskExecutor


#if __name__ == '__main__':
#    state = send_new_episode_notifications.run(executor=LocalExecutor())

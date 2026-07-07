# ###################################################################################
# Flow: Send Notifications
#
# This flow fetches new episodes that need to send out notifications to users.
# Then it reschedules itself.
#
# ###################################################################################

import fathom_core as core

import prefect
import pendulum
from prefect import task, Flow, flatten
from prefect.engine import signals
from prefect.tasks.prefect import create_flow_run
from prefect.triggers import always_run

from flows.graphql import running_flow_count_exceeds
from flows.profiling import transaction

FLOW_NAME = "send_new_episode_notifications"

# ------------------------------------------------------------------------------
# Tasks
# ------------------------------------------------------------------------------

@task(timeout = 300)
def fetch_podcast_episodes():
    if running_flow_count_exceeds(FLOW_NAME, 1):
        raise signals.SKIP()

    podcast_episodes = core.data_models.PodcastEpisode.dataset_should_send_new_episode_notifications().get().all()

    return podcast_episodes

@task(timeout = 300)
def get_notification_packages(podcast_episode):
    logger = prefect.context.get("logger")

    logger.info(f"CREATING NEW EPISODE NOTIFICATIONS FOR EPISODE: ID #{podcast_episode.id}")
    user_tokens = podcast_episode.get_user_tokens_for_new_episode_notification()
    user_token_chunks = list(core.utility.chunk(user_tokens, 100))

    notification_packages = []
    for user_token_chunk in user_token_chunks:
        notification_packages.append({
            'podcast_episode': podcast_episode,
            'user_tokens': user_token_chunk
        })

    return notification_packages

@task(timeout = 300)
def send_notification_package(notification_package):
    logger = prefect.context.get("logger")

    logger.info(f"SENDING NEW EPISODE NOTIFICATIONS FOR EPISODE: ID #{notification_package['podcast_episode'].id}")

    notification_package['podcast_episode'].send_new_episode_notification(
        list(notification_package['user_tokens'])
    )

    return notification_package

@task(timeout = 300)
def finalize_sending_new_episode_notifications(notification_packages):
    logger = prefect.context.get("logger")
    sent_results = {}

    for notification_package in notification_packages:
        if notification_package['podcast_episode'].id in sent_results:
            sent_results[notification_package['podcast_episode'].id]['sent_count'] += len(notification_package['user_tokens'])
        else:
            sent_results[notification_package['podcast_episode'].id] = {
                'podcast_episode': notification_package['podcast_episode'],
                'sent_count': len(notification_package['user_tokens'])
            }

    updates = []

    for key in sent_results:
        logger.info(f"FINALIZING NEW EPISODE NOTIFICATIONS FOR EPISODE: ID #{sent_results[key]['podcast_episode'].id}")
        sent_results[key]['podcast_episode'].finalize_sending_new_episode_notifications(sent_results[key]['sent_count'])
        updates.append(key)

    return updates

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
    with transaction("notifications_fetch"):
        podcasts_episodes = fetch_podcast_episodes()
    with transaction("notifications_package"):
        notification_packages = get_notification_packages.map(podcast_episode=podcasts_episodes)
    with transaction("notifications_send"):
        sent_notification_packages = send_notification_package.map(notification_package=flatten(notification_packages))
    with transaction("notifications_finalize"):
        updates = finalize_sending_new_episode_notifications(sent_notification_packages)

    schedule_next_run(updates)

from prefect.storage import Local
flow.storage = Local(path=f"/app/flows/podcast/{FLOW_NAME}.py", stored_as_script=True)

# ECS Containers
from prefect.run_configs import LocalRun
flow.run_config = LocalRun(working_dir="/app", labels=["fathom-notification-processing"])

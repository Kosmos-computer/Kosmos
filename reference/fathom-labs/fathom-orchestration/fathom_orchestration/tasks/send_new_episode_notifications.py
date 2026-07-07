# ###################################################################################
# Task: Send New Episode Notifications
#
# This task sends notifications to users about new episodes.
# ###################################################################################

# import fathom_core as core
# from fathom_orchestration.tasks.base.fathom_collection_processor import FathomCollectionProcessor
# 
# class SendNewEpisodeNotifications(FathomCollectionProcessor):
# 
#     def queue(self):
#         return "episode_processing"
# 
#     def time_limit(self):
#         return 300; # seconds
#         
#     def get_ids(self, limit=100, excluding=[]):
#         return core.data_models.PodcastEpisode \
#             .dataset_should_send_new_episode_notifications() \
#             .where_not_in('podcast_episodes.id', excluding) \
#             .limit(limit) \
#             .select('podcast_episodes.id') \
#             .lists('id')
# 
#     def process(self, id):
#         episode = core.data_models.PodcastEpisode.find_or_fail(id)
# 
#         self.log(f"SENDING NEW EPISODE NOTIFICATIONS FOR EPISODE: ID #{episode.id}")
#         user_tokens = episode.get_user_tokens_for_new_episode_notification()
#       
#         for chunk in list(core.utility.chunk(user_tokens, 100)):
#             episode.send_new_episode_notification(chunk)
# 
#         episode.finalize_sending_new_episode_notifications(len(user_tokens))


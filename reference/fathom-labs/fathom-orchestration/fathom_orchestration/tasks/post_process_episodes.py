# ###################################################################################
# Task: Post-Process Episodes
# 
# This task fetches episodes that need to be pre-processed (storing audio and/or
# requesting transcription jobs) and does so. Then it reschedules itself.
# 
# ###################################################################################


# import fathom_core as core
# from fathom_orchestration.tasks.base.fathom_collection_processor import FathomCollectionProcessor
# 
# class PostProcessEpisodes(FathomCollectionProcessor):
# 
#     def queue(self):
#         return "episode_processing"
#     
#     def time_limit(self):
#         return 300; # seconds
# 
#     def get_ids(self, limit=100, excluding=[]):
#         return core.data_models.PodcastEpisode.needs_post_processing_ids(limit, excluding)
# 
#     def process(self, id):
#         episode = core.data_models.PodcastEpisode.find_or_fail(id)
# 
#         self.log(f"POST-PROCESSING EPISODE: {episode.title}")
#         with episode.error_logging():
#             episode.post_process()

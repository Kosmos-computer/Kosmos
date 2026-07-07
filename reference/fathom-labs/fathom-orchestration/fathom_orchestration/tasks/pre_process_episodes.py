# ###################################################################################
# Task: Pre-Process Episodes
#
# This task fetches episodes that need to be pre-processed (storing audio and/or
# requesting transcription jobs) and does so. Then it reschedules itself.
#
# ###################################################################################

# import fathom_core as core
# from fathom_orchestration.tasks.base.fathom_collection_processor import FathomCollectionProcessor
# 
# class PreProcessEpisodes(FathomCollectionProcessor):
# 
#     def queue(self):
#         return "episode_processing"
# 
#     def time_limit(self):
#         return 600; # seconds - in-process processing of deepgram transcript temporarily
# 
#     def get_ids(self, limit=100, excluding=[]):
#         return core.data_models.PodcastEpisode.needs_pre_processing_ids(limit, excluding)
# 
#     def process(self, id):
#         episode = core.data_models.PodcastEpisode.find_or_fail(id)
# 
#         self.log(f"PRE-PROCESSING EPISODE: {episode.title}")
#         with episode.error_logging():
#             episode.pre_process()

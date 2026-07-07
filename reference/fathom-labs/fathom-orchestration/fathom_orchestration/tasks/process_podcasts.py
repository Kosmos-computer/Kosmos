# ###################################################################################
# Task: Process Podcasts
#
# This task fetches podcasts that need to be processed, from level 2 and level 4
# equally, and processes them.
#
# ###################################################################################

# import fathom_core as core
# from fathom_orchestration.tasks.base.fathom_collection_processor import FathomCollectionProcessor
# 
# class ProcessPodcasts(FathomCollectionProcessor):
# 
#     def queue(self):
#         return "podcast_processing"
# 
#     def time_limit(self):
#         return 300; # seconds
# 
#     def get_ids(self, limit=100, excluding=[]):
#         level_2_ids = core.data_models.Podcast \
#             .ready_to_update(processing_levels=[2]) \
#             .order_by_update_priority() \
#             .where_not_in('podcasts.id', excluding) \
#             .limit(limit/2) \
#             .lists('id')
# 
#         level_3_ids = core.data_models.Podcast \
#             .ready_to_update(processing_levels=[3]) \
#             .order_by_update_priority() \
#             .where_not_in('podcasts.id', excluding) \
#             .limit(limit/4) \
#             .lists('id')
#         
#         level_4_ids = core.data_models.Podcast \
#             .ready_to_update(processing_levels=[4]) \
#             .order_by_update_priority() \
#             .where_not_in('podcasts.id', excluding) \
#             .limit(limit/4) \
#             .lists('id')
# 
#         ids = []
#         ids.extend(level_2_ids)
#         ids.extend(level_3_ids)
#         ids.extend(level_4_ids)
# 
#         return ids
# 
#     def process(self, id):
#         podcast = core.data_models.Podcast.find_or_fail(id)
# 
#         self.log(f"PROCESSING PODCAST: {podcast.title}")
#         with podcast.error_logging():
#             podcast.update()

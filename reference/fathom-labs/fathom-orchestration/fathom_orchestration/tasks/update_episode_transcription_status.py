# ###################################################################################
# Task: Update Episode Transcription Status
#
# This task fetches episodes that were submitted for transcription to Rev.AI and
# updates the status of the transcription job. When transcription is complete,
# the episode is picked up for post-processing.
#
# ###################################################################################

# import fathom_core as core
# from fathom_orchestration.tasks.base.fathom_collection_processor import FathomCollectionProcessor
# from orator.query.join_clause import JoinClause
# 
# class UpdateEpisodeTranscriptionStatus(FathomCollectionProcessor):
# 
#     def queue(self):
#         return "episode_processing"
# 
#     def time_limit(self):
#         return 300; # seconds
#         
#     def get_ids(self, limit=100, excluding=[]):
#         return core.data_models.PodcastEpisode \
#             .dataset_should_update_transcription_status() \
#             .join(JoinClause('transcript_files') \
#                 .on('podcast_episodes.id', '=', 'transcript_files.podcast_episode_id') \
#             ) \
#             .order_by_raw("transcript_files.updated_at asc nulls last") \
#             .where_not_in('podcast_episodes.id', excluding) \
#             .limit(limit) \
#             .select('podcast_episodes.id') \
#             .lists('id')
# 
#     def process(self, id):
#         episode = core.data_models.PodcastEpisode.find_or_fail(id)
# 
#         self.log(f"UPDATING TRANSCRIPTION STATUS FOR EPISODE: {episode.title}")
#         with episode.error_logging():
#             episode.update_transcription_status()

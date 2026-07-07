# ###################################################################################
# Task: ReportPodcastStats
# 
# Gathers various metrics about podcasts, such as total number, number in error, etc
# ###################################################################################

# import fathom_core as core
# from fathom_orchestration.tasks.base.fathom_scheduled_task import FathomScheduledTask
# from fathom_orchestration.profiling import report_metric
# 
# class ReportPodcastStats(FathomScheduledTask):
# 
#     def queue(self):
#         return "metrics"
#     
#     def time_limit(self):
#         return 60; # seconds
# 
#     def cron(self):
#         return "5 * * * *" # every 5 minutes
# 
#     def execute(self):
#         self.log(f"REPORTING PODCAST STATS...")
# 
#         report_metric("podcasts.total", self.total_podcasts())
#         report_metric("podcasts.with_error", self.podcasts_with_error())
#         report_metric("podcasts.processing_level_1.total", self.podcasts_with_processing_level(1))
#         report_metric("podcasts.processing_level_2.total", self.podcasts_with_processing_level(2))
#         report_metric("podcasts.processing_level_3.total", self.podcasts_with_processing_level(3))
# 
#         self.log(f"REPORTED PODCAST STATS!")
# 
# 
#     def total_podcasts(self):
#         return core.data_models.Podcast \
#             .count()
# 
#     def podcasts_with_error(self):
#         return core.data_models.Podcast \
#             .where_raw("error is not null") \
#             .count()
# 
#     def podcasts_with_processing_level(self, level):
#         return core.data_models.Podcast \
#             .where("processing_level", level) \
#             .count()
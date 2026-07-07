# ###################################################################################
# Task: Update Podium Package Transcription Status
#
# This task fetches episodes that were submitted for transcription and
# updates the status of the transcription job. When transcription is complete,
# the episode is picked up for post-processing.
#
# ###################################################################################

import fathom_core as core
from fathom_orchestration.tasks.base.fathom_collection_processor import FathomCollectionProcessor

class UpdatePodiumPackageTranscriptionStatus(FathomCollectionProcessor):

    def queue(self):
        return "podium_package_processing"

    def time_limit(self):
        return 60; # seconds
        
    def get_ids(self, limit=100, excluding=[]):
        return core.data_models.PodiumPackage \
            .dataset_should_update_transcription_status() \
            .order_by('podium_packages.id', 'asc') \
            .where_not_in('podium_packages.id', excluding) \
            .limit(limit) \
            .select('podium_packages.id') \
            .lists('id')

    def process(self, id):
        package = core.data_models.PodiumPackage.find_or_fail(id)

        self.log(f"UPDATING TRANSCRIPTION STATUS FOR PODIUM PACKAGE: {package.id}")
        with package.error_logging():
            package.update_transcription_status()
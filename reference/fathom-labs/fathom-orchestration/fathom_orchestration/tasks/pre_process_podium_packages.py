# ###################################################################################
# Task: Pre-Process Podium Packages
#
# This task fetches podium packages that need to be pre-processed (storing audio and/or
# requesting transcription jobs) and does so. Then it reschedules itself.
#
# ###################################################################################

import fathom_core as core
import gc
from fathom_orchestration.tasks.base.fathom_collection_processor import FathomCollectionProcessor

class PreProcessPodiumPackages(FathomCollectionProcessor):

    def queue(self):
        return "podium_package_processing"

    def time_limit(self):
        return 600; # seconds - in-process processing of deepgram transcript temporarily

    def get_ids(self, limit=100, excluding=[]):
        return core.data_models.PodiumPackage.needs_pre_processing_ids(limit, excluding)

    def process(self, id):
        package = core.data_models.PodiumPackage.find_or_fail(id)

        self.log(f"PRE-PROCESSING PODIUM PACKAGE: {package.id}")
        with package.error_logging():
            package.pre_process()

        gc.collect()

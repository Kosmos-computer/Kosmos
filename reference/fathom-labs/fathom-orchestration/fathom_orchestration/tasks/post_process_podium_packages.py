# ###################################################################################
# Task: Post-Process Podium Packages
#
# This task fetches podium packages that need to be post-processed (highlights / summary / chapter generation) 
# and does so. Then it reschedules itself.
# ###################################################################################

import fathom_core as core
import gc
from fathom_orchestration.tasks.base.fathom_collection_processor import FathomCollectionProcessor

class PostProcessPodiumPackages(FathomCollectionProcessor):

    def queue(self):
        return "podium_package_processing"

    def time_limit(self):
        return 2400;

    def get_ids(self, limit=100, excluding=[]):
        return core.data_models.PodiumPackage.needs_post_processing_ids(limit, excluding)

    def process(self, id):
        package = core.data_models.PodiumPackage.find_or_fail(id)

        self.log(f"POST-PROCESSING PODIUM PACKAGE: {package.id}")
        with package.error_logging():
            package.post_process()
        
        gc.collect()
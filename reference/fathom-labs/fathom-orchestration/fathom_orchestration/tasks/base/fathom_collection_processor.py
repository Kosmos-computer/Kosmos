# ###################################################################################
# Class: FathomCollectionProcessor
# 
# This abstract class can be extended to provide a basic task to "fetch these ids 
# then process then in a distributed fashion". Any class that inherits 
# FathomCollectionProcessor will be picked up by the orchestrator module and have 
# its get_ids function called regularly, the resulting ids scheduled for processing
# with its process function.
# ###################################################################################

import fathom_core as core
from abc import ABC, abstractmethod

class FathomCollectionProcessor(ABC):

    # Internal functions
    # ---------------------------------------------------------------

    def class_name(self):
        return self.__class__.__name__

    def log(self, message):
        core.log.info(f"{self.class_name()}: {message}")

    def call_get_ids(self, limit=100, excluding=[]):
        return self.get_ids(limit=limit, excluding=excluding)

    def call_process(self, id):
        self.process(id)

    # Implementation functions
    # ---------------------------------------------------------------

    @abstractmethod
    def queue(self):
        pass

    @abstractmethod
    def time_limit(self):
        pass

    @abstractmethod
    def get_ids(self, limit=100, excluding=[]):
        pass

    @abstractmethod
    def process(self, id):
        pass

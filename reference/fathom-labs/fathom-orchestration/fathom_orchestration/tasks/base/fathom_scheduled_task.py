# ###################################################################################
# Class: FathomScheduledTask
# 
# This abstract class can be extended to provide a basic task to execute something
# on the given schedule. Any class that inherits FathomScheduledTask will be picked
# up by the orchestrator module and have its execute function called regularly.
# ###################################################################################

import fathom_core as core
from abc import ABC, abstractmethod

class FathomScheduledTask(ABC):

    # Internal functions
    # ---------------------------------------------------------------

    def class_name(self):
        return self.__class__.__name__

    def log(self, message):
        core.log.info(f"{self.class_name()}: {message}")

    def call_execute(self):
        self.execute()

    # Implementation functions
    # ---------------------------------------------------------------

    @abstractmethod
    def queue(self):
        pass

    @abstractmethod
    def time_limit(self):
        pass

    @abstractmethod
    def cron(self):
        """
        Cron expression that determines the schedule on which this task will be executed.
        Resources:
            https://en.wikipedia.org/wiki/Cron
            https://crontab.guru/
        """
        pass

    @abstractmethod
    def execute(self):
        pass

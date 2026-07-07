# ###################################################################################
# Module: orchestrator
#
# The purpose of this module is to schedule Fathom tasks for processing in a way
# that keeps the dependency on Celery in this class. This allow Fathom tasks to be
# defined in a way that is not dependent on the task processing engine, nor requiring
# them to be registered with the task processing engine explicitely.
#
# ###################################################################################

from celery_once import QueueOnce
from celery.schedules import crontab
from pydoc import locate

import fathom_core as core
from fathom_orchestration.celery_services import app, get_all_tasks
from fathom_orchestration.profiling import transaction
from fathom_orchestration.tasks.base.fathom_collection_processor import FathomCollectionProcessor
from fathom_orchestration.tasks.base.fathom_scheduled_task import FathomScheduledTask

####################################################################################
# Orchestrator Scheduling
####################################################################################

def generate_task_schedule():
    task_schedule = {
        'orchestrate': {
            'task': 'orchestrator.orchestrate',
            'schedule': 5.0 # 5 seconds
        }
    }

    for klass in FathomScheduledTask.__subclasses__():
        task_class = klass.__module__ + '.' + klass.__qualname__

        klass = locate(task_class)
        instance = klass()
        queue = instance.queue()
        minute, hour, day_of_month, month_of_year, day_of_week = instance.cron().split()
        schedule = crontab(
            minute = minute, 
            hour = hour, 
            day_of_month = day_of_month, 
            month_of_year = month_of_year, 
            day_of_week = day_of_week
        )

        task_schedule[f"execute.{task_class}"] = {
            'task': 'orchestrator.execute',
            'args': [task_class],
            'options': {'queue' : queue},
            'schedule': schedule
        }

    return task_schedule

app.conf.beat_schedule = generate_task_schedule()

####################################################################################
# Orchestrator Celery Tasks
####################################################################################

@app.task(name="orchestrator.orchestrate", base=QueueOnce, once={'timeout': 15, 'graceful': True})
def orchestrator__orchestrate():
    """ Invoke different kinds of Fathom base tasks"""
    for klass in FathomCollectionProcessor.__subclasses__():
        task_class = klass.__module__ + '.' + klass.__qualname__
        collection_processor__get_ids.delay(task_class)

@app.task(name="orchestrator.execute", base=QueueOnce, once={'keys': ['task_class'], 'timeout': 30, 'graceful': True})
def orchestrator__execute(task_class):
    """Execute a single task with the given class, with no arguments"""
    klass = locate(task_class)
    instance = klass()
    with transaction(F"{instance.class_name()}.execute"):
        instance.call_execute()

####################################################################################
# FathomCollectionProcessor Celery Tasks
####################################################################################

GET_IDS_TASK_NAME = 'collection_processor.get_ids'
PROCESS_TASK_NAME = 'collection_processor.process'
MAX_ACTIVE_PER_TASK = 100

def get_ids_of_active_process_tasks(task_class):
    # Get all scheduled tasks
    tasks = get_all_tasks(with_name = PROCESS_TASK_NAME)

    # Pick only process tasks with the given name
    # PROCESS_TASK_NAME is defined below with two arguments: task_class, id
    tasks = list(filter(lambda c: c['args'][0] == task_class, tasks))

    # Take the IDs
    ids = [d['args'][1] for d in tasks]
    return ids

@app.task(name=GET_IDS_TASK_NAME, base=QueueOnce, once={'keys': ['task_class'], 'timeout': 30, 'graceful': True})
def collection_processor__get_ids(task_class):
    klass = locate(task_class)
    instance = klass()

    # Lookup id param of active tasks, also skip if max active tasks have been reached
    excluding = get_ids_of_active_process_tasks(task_class = task_class)
    if len(excluding) > MAX_ACTIVE_PER_TASK:
        core.log.info(f"Max active tasks reached for {task_class}")
        return

    queue = instance.queue()
    time_limit = instance.time_limit()

    with transaction(F"{instance.class_name()}.get_ids"):
        ids = instance.call_get_ids(excluding=excluding)

    for id in ids:
        args = [task_class, id]
        collection_processor__process.apply_async(args=args, queue=queue, time_limit=time_limit)

    return len(ids)

@app.task(name=PROCESS_TASK_NAME, base=QueueOnce, once={'keys': ['task_class', 'id'], 'graceful': True})
def collection_processor__process(task_class, id):
    klass = locate(task_class)
    instance = klass()
    with transaction(F"{instance.class_name()}.process"):
        instance.call_process(id)

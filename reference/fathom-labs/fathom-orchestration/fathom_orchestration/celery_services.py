from celery import Celery
import fathom_core as core

# Configure Celery
# ---------------------------------------------------------------

app = Celery('fathom', 
    broker  = core.env['celery_redis_url'],
    backend = core.env['celery_redis_url'],
    include = ['fathom_orchestration.orchestrator']
)

app.conf.task_default_queue = 'default'

app.conf.ONCE = {
  'backend': 'celery_once.backends.Redis',
  'settings': {
    'url': core.env['celery_redis_url'],
    'default_timeout': 60 * 5 # 5 minutes
  }
}


# Celery Utilities
# ---------------------------------------------------------------

def get_all_tasks(with_name = None):
    # Lookup workers and their tasks
    i = app.control.inspect()
    reserved = i.reserved()
    active = i.active()
    scheduled = i.scheduled()

    # Combine all tasks into a flat list
    all_tasks = []
    all_tasks.extend(list(reserved.values()))
    all_tasks.extend(list(active.values()))
    all_tasks.extend(list(scheduled.values()))
    all_tasks = [item for sublist in all_tasks for item in sublist]

    # Filter by name (if provided)
    if with_name:
        all_tasks = list(filter(lambda c: c['name'] == with_name, all_tasks))

    return all_tasks

# Start the Celery Worker
# ---------------------------------------------------------------

if __name__ == '__main__':
    core.log.info("Celery starting.")
    app.start()
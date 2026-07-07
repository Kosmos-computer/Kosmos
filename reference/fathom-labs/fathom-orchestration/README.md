# Fathom Orchestration

This repo orchestrates the various background tasks that are needed for Fathom to operate, for example:

- Continuously loading podcasts from RSS and processing them
- Continuously adding new podcast episodes
- Updating episode vector collections
- Sending new episode notifications to users

## Separation of Concerns

Currently, the repo uses [Celery](https://docs.celeryq.dev/) to schedule and execute tasks among distributed workers. However, the code that interfaces with celery is isolated to two files:

1. [fathom_orchestration/celery.py](fathom_orchestration/celery.py): Bootstrap Celery and start a worker
2. [fathom_orchestration/orchestrator.py](fathom_orchestration/orchestrator.py): Schedule the different task types for execution in the appropriate Celery worker

The tasks themselves are defined in [fathom_orchestration/tasks](fathom_orchestration/tasks). Each task inherits from a base class in [fathom_orchestration/tasks/base](fathom_orchestration/tasks/base). The base classes is how the orchestrator knows which tasks to execute and how. 

Note that the tasks themselves are agnostic to Celery or any other distributed task execution implementation - the orchestrator plugs the tasks in and handles the implementation details of executing them in a distributed fashion. This ensures that tasks remain free of implementation-specific cruft, making them easy to develop and test.

In order to retain the benefits of separating the concerns of what tasks do and how they are executed, take advantage of the base classes and avoid referencing Celery directly in the tasks (such as with `@app.task` decorators - let the orchestrator do that for you). The orchestrator performs several important functions that plain-old-Celery-tasks lack:

- Automatically registering tasks based on base class inheritance
- Ensuring unique task execution
- Filling up queues with tasks (but not too many of them at once)
- Profiling task execution for alerting and performance analysis via Datadog
- Enforcing timeout limits for tasks that run too long

In essence, the orchestrator handles [negative engineering](https://medium.com/the-prefect-blog/positive-and-negative-data-engineering-a02cb497583d) concerns that are crucial for a distributed task system to run smoothly in production, while creating space for developers to write tasks without worrying (as much) about those concerns.

## Task Development

Guidelines for developing a new task:

1. Pick a base class appropriate to your use case, referencing the documentation in [docs/tasks/base](docs/tasks/base)
2. Write your implementation of the base class in [fathom_orchestration/tasks](fathom_orchestration/tasks)
3. Add an import of your new class in [fathom_orchestration/tasks/__init__.py](fathom_orchestration/tasks/__init__.py)

If none of the base classes fit your use case, write a new base class:

1. Create the base class in [fathom_orchestration/tasks/base](fathom_orchestration/tasks/base)
2. Add an import of your new base class in [fathom_orchestration/tasks/base/__init__.py](fathom_orchestration/tasks/base/__init__.py)
3. Extend [fathom_orchestration/orchestrator.py](fathom_orchestration/orchestrator.py) to support your new base class. For example:
    1. Define the appropriate Celery task(s)
    2. Trigger your new Celery task(s) from the `orchestrator()` method, which is a Celery task that is executed every 5 seconds. Note: the timeout for this task is 15 seconds, so please keep it performant by only using it to trigger other Celery task(s)
4. Add documentation for your new base class in [docs/tasks/base](docs/tasks/base)

## Task Debugging

To debug a task locally:
1. Open a console using `docker-compose run web bash`
2. Start the python REPL with `python`
3. Import your task, ie `from fathom_orchestration.tasks.process_podcasts import ProcessPodcasts`
4. Run the task methods, ie `ProcessPodcasts().get_ids()`

You can also start the whole system using `docker-compose up`, however, this may prove difficult for debugging individual tasks.

## Infrastructure for Queues

This repo uses HashiCorp Terraform to manage ECS services corresponding to celery worker queues.

To add/update/remove queues, modify the locals.queues mapping in the [infrastructure/locals.tf](infrastructure/locals.tf) file. The key corresponds to the name of the celery worker queue. When your changes are merged into `main`, a GitHub action (defined [here](.github/workflows/terraform.yml)) will use Terraform to make the necessary infrastructure changes to AWS ECS.

## TODO

- [x] Abstraction layer from Celery
- [x] Move tasks from Prefect
- [x] Collection processing
- [x] Prevent pile-ups
- [x] Unique tasks
- [x] Queueing
- [x] Terraform scripts for easy queue creation
- [X] Datadog instrumentation
- [X] Documentation
- [ ] Create base class for scheduled tasks
- [ ] Refactor common base task functionality
- [ ] Tests
# FathomCollectionProcessor Base Task

This base task ensures that a collection of entities meeting the given criteria are continuously processed. For example, podcasts that have not been processed and need processing. 

## Implementation

The key functionality lives in the following methods that you must implement:

- `get_ids(limit=100, excluding=[])`: Get the next batch of entities to process. 
    - The `limit` parameter can generally be left at its default.
    - The `excluding` parameter is a list of IDs of entities that are currently being processed or are in the queue. Exclude them from your query or the resulting IDs so that the orchestrator doesn't try to schedule the same set of entities to be processed over and over (but rather works its way down the list).
    - The ordering of the query to get IDs is very important (see Tip #1 below). 
- `process(id)`: Process the entity with the given ID. 
- `queue()`: Return the string name of the worker queue that this task should go in. If you are defining a new queue, see the [Infrastructure for Queues](../../../README.md#infrastructure-for-queues) section to create the requisite AWS infrastructure for your queue to have workers assigned to it. Do not use the "default" Celery queue, which is reserved for orchestration.
- `time_limit()`: Return the number of seconds that this task is allowed to run for. This is key for protecting the system from hangups. Pick a reasonably large number and fine-tune in production as needed. 

## Tips

1. The processing logic should ideally put the entity at the bottom of the list that `get_ids` generates, so that workers cycle through the list instead of always picking entities off the top. One common way to do this is to give the entity a `processing_attempted_on` datetime field and update the field immediate when starting to process (in case of errors). Then make sure the `get_ids` query orders by `processing_attempted_on` ascending, to pick up the "older" entities.
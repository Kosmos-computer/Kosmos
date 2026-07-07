from prefect import task, Flow
from prefect.storage import Local
from prefect.run_configs import LocalRun

import fathom_core
import datetime
import random
from time import sleep

@task
def inc(x):
    sleep(random.random() / 10)
    return x + 1

@task
def dec(x):
    sleep(random.random() / 10)
    return x - 1

@task
def add(x, y):
    sleep(random.random() / 10)
    return x + y

@task(name="sum")
def list_sum(arr):
    return sum(arr)

with Flow("test_dask") as flow:
    incs = inc.map(x=range(100))
    decs = dec.map(x=range(100))
    adds = add.map(x=incs, y=decs)
    total = list_sum(adds)

flow.storage = Local(path="/app/flows/test/dask.py", stored_as_script=True)
flow.run_config = LocalRun(working_dir="/app", labels=["fathom-dask-tasks"])

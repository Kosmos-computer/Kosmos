# Docker

This repo is built as a Docker image and published AWS ECR, then deployed as a Docker Container to AWS ECS. This provides a consistent production environment for both Prefect Agents and Dask Workers.

Files and their function:
- `Dockerfile`: Build instructions for Docker
- `docker-compose.yml`: A Docker Compose utility config for running the app locally
- `env.dev` / `env.prod`: Houses environment variables for working locally - primarily which Prefect GraphQL to connect to
- `dev-console.sh` / `prod-console.sh`: Utility script for starting a Docker container to run a local console, assuming `config.ini` is using the corresponding environment
- `dev-deploy.sh` / `prod-deploy.sh`: Builds and publishes to dev or prod- assuming AWS credentials are present
- `start-dask-worker.sh`: Starts the Dask Worker, given the `DASK_SCHEDULER_ADDRESS`, `DASK_NANNY_PORT`, and `DASK_WORKER_PORT` are properly defined (in `env.prod` locally and in the ECS task definition in AWS)
- `start-prefect-agent.sh`: Registers Prefect flows and starts the Prefect Agent, given the `PREFECT__CLOUD__API`, `PREFECT__CLOUD__API_KEY`, and `PREFECT__CLOUD__TENANT_ID` are properly defined (in `env.prod` locally and in the ECS task definition in AWS)

## Aggressive Caching

Docker aggresively caches each step of its build process. This means that some changes are not always captured when performing a build. To build without caching, use `./deploy.sh --no-cache`.

When using a Python package from GitHub, such as `fathom-core`, Docker does not know to pick up new changes, so you must `docker build --no-cache -t fathom-tasks .` in order to re-build an image without caching.
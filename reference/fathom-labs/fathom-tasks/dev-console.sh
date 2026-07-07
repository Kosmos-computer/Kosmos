#!/bin/bash
set -e

ENV_FILE=env.dev docker-compose run app "$@"

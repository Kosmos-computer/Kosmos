# For shared_modules
import os,sys,inspect
current_dir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

# Internal Module Packages
import fathom_core as core

db = core.database.db

log = core.log
env = core.env
is_development = (env['environment'] in ['development', 'local'])

# Modules
from modules import *
from server.controllers import *
from server.graph_models.query import Query
from server.graph_models.mutations import Mutations

# FastAPI
from fastapi import FastAPI

tags_metadata = [
    {
        "name": "Media",
        "description": "Add and retrieve AI generated assets and transcripts for media files.",
    },
    {
        "name": "Projects",
        "description": "Create and retrieve projects and their associated media files.",
    },
    {
        "name": "AI Models",
        "description": "Run a variety of inferences using Podium's AI models.",
    },
    {
        "name": "Podcasts",
        "description": "Search for and retrieve podcasts, episodes, and AI intelligence about the world of podcasts.",
    },
]

web = FastAPI(
    title="Podium API",
    description="The Podium API provides cutting edge AI content generation and analytics for podcasters.",
    version="1.0.0",
    servers=[{"url": "https://api.podium.page", "description": "The production Podium API server URL."}],
    openapi_tags=tags_metadata
)

# Sentry Middleware
from sentry_sdk.integrations.asgi import SentryAsgiMiddleware
import sentry_sdk
from sentry_sdk.api import start_transaction
from sentry_sdk import configure_scope

sentry_enabled = False #(env['sentry_dsn'] is not None and env['sentry_dsn'] != '')

if sentry_enabled:
    log.info(f"Logging to Sentry {env['environment']} at DSN {env['sentry_dsn']}")
    sentry_sdk.init(
        dsn=env['sentry_dsn'],
        environment=env['environment'],
        send_default_pii=is_development,
        debug=is_development,
        request_bodies='medium',
        traces_sample_rate=0.1,
    )
    web.add_middleware(SentryAsgiMiddleware)

#CORS Middleware
from fastapi.middleware.cors import CORSMiddleware
origins = ["*"]
web.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Old REST routes
web.include_router(root.router)
web.include_router(podcast.router)
web.include_router(for_you.router)
web.include_router(api.router)
web.include_router(podium.router)
web.include_router(podium_clients_api.router)
web.include_router(podium_internal_api.router)
web.include_router(podium_clients_podcast_api.router)

# GQL API Route with custom GraphQLAppWithMiddleware GraphQLApp
import graphene
from starlette.graphql import GraphQLApp
from starlette.concurrency import run_in_threadpool
from graphql.execution.executors.asyncio import AsyncioExecutor
from graphql import parse

class GraphQLAppWithMiddleware(GraphQLApp):
    def __init__(self, *args, **kwargs):
       """
       :param middleware: List of Graphene middleware.
                          See https://docs.graphene-python.org/en/latest/execution/middleware/
       """
       self._middleware = kwargs.pop('middleware', None)
       super().__init__(*args, **kwargs)

    async def execute(  # type: ignore
       self, query, variables=None, context=None, operation_name=None
    ):

        query_document = parse(query)
        op_name = query_document.definitions[0].operation
        transaction_name = query_document.definitions[0].selection_set.selections[0].name.value

        with configure_scope() as scope:
            scope.transaction = f"{op_name}:{transaction_name}"

        if self.is_async:
           return await self.schema.execute(
               query,
               variables=variables,
               operation_name=operation_name,
               executor=self.executor,
               return_promise=True,
               context=context,
               middleware=self._middleware,
           )
        else:
           return await run_in_threadpool(
               self.schema.execute,
               query,
               variables=variables,
               operation_name=operation_name,
               context=context,
               middleware=self._middleware,
           )

class GraphQLSentryMiddleware(object):

   def resolve(self, next, root, info, **args):
       promise = next(root, info, **args)
       # Capture exceptions, and reraise such that Graphene can respond with a nice error message.
       return promise.then(did_reject=capture_and_reraise)

async def capture_and_reraise(e):
   sentry_sdk.capture_exception(e)
   raise e

gql_middleware = []
if sentry_enabled:
    gql_middleware.append(GraphQLSentryMiddleware())

web.add_route(
    "/graphql",
    GraphQLAppWithMiddleware(
        schema=graphene.Schema(query=Query, mutation=Mutations),
        executor_class=AsyncioExecutor,
        middleware=gql_middleware
    )
)

def get_field_names(info):
    """
    Parses a query info into a list of composite field names.
    For example the following query:
        {
          carts {
            edges {
              node {
                id
                name
                ...cartInfo
              }
            }
          }
        }
        fragment cartInfo on CartType { whatever }

    Will result in an array:
        [
            'carts',
            'carts.edges',
            'carts.edges.node',
            'carts.edges.node.id',
            'carts.edges.node.name',
            'carts.edges.node.whatever'
        ]
    """

    from graphql.language.ast import FragmentSpread

    fragments = info.fragments

    def iterate_field_names(prefix, field):
        name = field.name.value

        if isinstance(field, FragmentSpread):
            _results = []
            new_prefix = prefix
            sub_selection = fragments[field.name.value].selection_set.selections
        else:
            _results = [prefix + name]
            new_prefix = prefix + name + "."
            if field.selection_set:
                sub_selection = field.selection_set.selections
            else:
                sub_selection = []

        for sub_field in sub_selection:
            _results += iterate_field_names(new_prefix, sub_field)

        return _results

    results = iterate_field_names('', info.field_asts[0])

    return results

def query_contains(fields, field_name):
    for field in fields:
        if field_name in field:
            return True

    return False 

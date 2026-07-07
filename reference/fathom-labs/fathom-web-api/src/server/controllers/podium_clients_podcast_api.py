import app
from modules import *

from fastapi import APIRouter, Header, HTTPException, Request, Depends, Path, Query
from fastapi.security import HTTPBearer

from pydantic import BaseModel, Field
from typing import Optional, List, Union

import time
import datetime
import requests
import asyncio
import sentry_sdk
import openai
import json
import orjson
import uuid
from hashids import Hashids
import jwt

from scipy.spatial.distance import *
import numpy as np

router = APIRouter()
auth_scheme = HTTPBearer()

class Podcast(BaseModel):
    id: str = Field(
        default=None,
        description="The Podium id of the podcast.",
        example="df016ed9-eeba-4687-8211-65cce053c2a2"
    )
    title: Optional[str] = Field(
        description="The title of the podcast.",
        example="Lex Fridman Podcast"
    )
    description: Optional[str] = Field(
        default=None,
        description="The description of the podcast.",
        example="Conversations about science, technology, history, philosophy and the nature of intelligence..."
    )
    author: Optional[str] = Field(
        default=None,
        description="The author of the podcast.",
        example="Lex Fridman"
    )
    website_url: Optional[str] = Field(
        default=None,
        description="The website of the podcast.",
        example="https://lexfridman.com/"
    )
    rss_url: Optional[str] = Field(
        default=None,
        description="The RSS feed URL for the podcast.",
        example="https://lexfridman.com/feed/podcast/"
    )
    image_thumbnail_url: Optional[str] = Field(
        default=None,
        description="The image thumbnail URL for the podcast."
    )

    @staticmethod
    def convert_list(db_podcasts):
        return [Podcast.convert(db_podcast) for db_podcast in db_podcasts]

    @staticmethod
    def convert(db_podcast):
        return Podcast(
            id=db_podcast.guid,
            title=db_podcast.title,
            description=db_podcast.description,
            author=db_podcast.author,
            website_url=db_podcast.website_url,
            rss_url=db_podcast.rss_url,
            image_thumbnail_url=db_podcast.thumbnail_image_url_cdn()
        )

class PodcastEpisodeClip(BaseModel):
    id: Optional[str] = Field(
        default=None,
        description="The Podium id of the podcast episode clip. Will be null when clip is a dynamic search result.",
        example="b2fcf483-4c62-4039-953f-8c3173a9c333"
    )
    title: Optional[str] = Field(
        default=None,
        description="The title of the clip. May be null."
    )
    start_seconds: float = Field(
        default=None,
        description="The start time of the clip in seconds."
    )
    end_seconds: float = Field(
        default=None,
        description="The end time of the clip in seconds."
    )
    transcript_context: str = Field(
        default=None,
        description="The raw transcript context of the clip. May be null when the clip is a podcast episode highlight."
    )
    origin: str = Field(
        default=None,
        description="The origin of the clip. Can be 'podium:search', 'podium:ai' or 'podium:user'."
    )
    type: str = Field(
        default=None,
        description="The type of clip. Can be 'podium:search:answer', 'podium:search:result', 'podium:user:selected', 'podium:interesting', 'podium:funny', 'podium:representative', or 'podcaster:highlight'."
    )

class PodcastEpisodeChapter(BaseModel):
    title: Optional[str] = Field(
        default=None,
        description="The title of the clip. May be null."
    )
    start_seconds: float = Field(
        default=None,
        description="The start time of the clip in seconds."
    )
    end_seconds: float = Field(
        default=None,
        description="The end time of the clip in seconds."
    )
    is_toc: bool = Field(
        default=None,
        description="Whether the chapter is a table of contents chapter."
    )
    associated_url: str = Field(
        default=None,
        description="The associated URL for the chapter if supplied in podcasting 2.0 rss feed."
    )
    image_url: Optional[str] = Field(
        default=None,
        description="The image URL for the chapter if supplied in podcasting 2.0 rss feed."
    )
    origin: str = Field(
        default=None,
        description="The origin of the chapter. Can be 'episode:data', 'podium:ai'."
    )

class PodcastEpisode(BaseModel):
    id: Optional[str] = Field(
        default=None,
        description="The Podium id of the podcast episode.",
        example="e1aaf482-5c70-4039-953f-9b3193a9c152"
    )
    rss_guid: Optional[str] = Field(
        default=None,
        description="The RSS guid of the podcast episode.",
        example="episode-123"
    )
    title: Optional[str] = Field(
        description="The title of the podcast episode.",
        example="#321 – Ray Kurzweil: Singularity, Superintelligence, and Immortality"
    )
    description: Optional[str] = Field(
        default=None,
        description="The description of the podcast episode. May contain HTML.",
        example="Ray Kurzweil is an author, inventor, and futurist..."
    )
    publication_date: datetime.date = Field(
        default=None,
        description="The publication date of the podcast episode.",
        example="2022-09-17"
    )
    duration_seconds: Optional[float] = Field(
        default=None,
        description="The duration of the podcast episode in seconds.",
        example=7200
    )
    media_url: Optional[str] = Field(
        default=None,
        description="The media url of the podcast episode.",
        example="https://media.blubrry.com/takeituneasy/content.blubrry.com/takeituneasy/lex_ai_ray_kurzweil.mp3"
    )
    image_url: Optional[str] = Field(
        default=None,
        description="The image URL for the podcast episode."
    )
    image_thumbnail_url: Optional[str] = Field(
        default=None,
        description="The image thumbnail URL for the podcast episode."
    )
    highlights: List[PodcastEpisodeClip] = Field(
        default=None,
        description="The highlight clips for the podcast episode."
    )
    chapters: List[PodcastEpisodeChapter] = Field(
        default=None,
        description="The chapters for the podcast episode."
    )
    podcast: Podcast = Field(
        default=None,
        description="The podcast to which the episode belongs. This will be null when returning a list of podcast episodes for a specific podcast."
    )

    @staticmethod
    def convert_list(db_podcast_episodes, include_podcast=True):
        return [PodcastEpisode.convert(db_podcast_episode, include_podcast=include_podcast) for db_podcast_episode in db_podcast_episodes]
    
    @staticmethod
    def convert(db_podcast_episode, include_podcast=True):
        podcast = None
        if include_podcast:
            podcast = Podcast.convert(db_podcast_episode.podcast)

        highlights = []
        for db_preview in db_podcast_episode.previews:
            clip = PodcastEpisodeClip()
            clip.id = db_preview.guid
            clip.start_seconds = db_preview.start
            clip.end_seconds = db_preview.end
            clip.title = db_preview.title
            clip.origin = 'podium:ai'
            clip.type = db_preview.type.replace('fathom', 'podium')
            highlights.append(clip)

        chapters = []
        for db_chapter in db_podcast_episode.chapters:
            origin = 'episode:data'
            if db_chapter.ai_generated:
                origin = 'podium:ai'

            chapter = PodcastEpisodeChapter()
            chapter.title = db_chapter.description
            chapter.start_seconds = db_chapter.start
            chapter.end_seconds = db_chapter.end
            chapter.is_toc = db_chapter.is_toc
            chapter.associated_url = db_chapter.url
            chapter.image_url = db_chapter.img_url
            chapter.origin = origin
            chapters.append(chapter)


        return PodcastEpisode(
            id=db_podcast_episode.guid,
            rss_guid=db_podcast_episode.rss_guid,
            title=db_podcast_episode.title,
            description=db_podcast_episode.description,
            publication_date=db_podcast_episode.publication_date,
            duration_seconds=db_podcast_episode.duration,
            media_url=db_podcast_episode.rss_audio_url,
            image_url=db_podcast_episode.image_url_cdn(),
            image_thumbnail_url=db_podcast_episode.thumbnail_image_url_cdn(),
            highlights=highlights,
            chapters=chapters,
            podcast=podcast
        )

class PodcastEpisodeDetailedClip(PodcastEpisodeClip):
    podcast: Podcast = Field(
        default=None,
        description="The podcast the clip is from."
    )
    podcast_episode: PodcastEpisode = Field(
        default=None,
        description="The podcast episode the clip is from."
    )

class PodcastEpisodeSearchClip(BaseModel):
    clip: PodcastEpisodeDetailedClip = Field(
        default=None,
        description="The clip."
    )
    result_type: str = Field(
        default=None,
        description="The type of result the clip is from. Either 'answer' or 'result'."
    )
    transcript_context_snippet: str = Field(
        default=None,
        description="A snippet of the clip transcript context that is most relevant to a search."
    )

@router.get('/api/podium/clients/v1/podcasts/search', description="Returns a list of podcasts that match the search criteria", tags=["Podcasts"], response_model=List[Podcast])
async def search_podcasts(query: str) -> List[Podcast]:
    podcast_list = []

    like_query = query.lower().replace(' ', '%')
    db_podcasts = app.core.data_models.Podcast \
        .where('title_lower', 'like', f"{like_query}%") \
        .or_where('url_slug', 'like', f"{like_query}%") \
        .or_where('title_lower', 'like', f"the {like_query}%") \
        .or_where('title_lower', 'like', f"a {like_query}%") \
        .or_where('author_lower', 'like', f"%{like_query}%") \
        .or_where('owner_name_lower', 'like', f"%{like_query}%") \
        .select('id', 'guid', 'title', 'description', 'author', 'owner_name', 'website_url', 'rss_url') \
        .order_by('apple_rank', 'desc') \
        .order_by('podcast_index_popularity_score', 'desc') \
        .limit(20) \
        .get()
    
    podcast_list = Podcast.convert_list(db_podcasts)
    
    return podcast_list

@router.get('/api/podium/clients/v1/podcast/{podcast_id}/episodes', description="Returns a list of podcast episodes for a podcast", tags=["Podcasts"], response_model=List[PodcastEpisode])
async def get_podcast_episodes(
        podcast_id: str = Path(
            default=None,
            description="The id of the podcast from which to return episodes. Can be a Podium id, iTunes id, or RSS URL MD5 hash."
        ), 
        page: Optional[int] = 1, 
        page_size: Optional[int] = 20,
        api_key: str = Depends(auth_scheme)
) -> List[PodcastEpisode]:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    if page_size > 50:
        raise HTTPException(status_code=400, detail="Page size must be less than or equal to 50")
    
    podcast_episode_list = []

    db_podcast = app.core.data_models.Podcast \
        .where('guid', podcast_id) \
        .or_where('itunes_id', podcast_id) \
        .or_where('rss_url_md5', podcast_id) \
        .select('id', 'guid') \
        .first()

    if not db_podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")

    if db_podcast is None:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    db_podcast_episodes = app.core.data_models.PodcastEpisode \
        .with_('podcast') \
        .with_({'previews': app.core.data_models.PodcastEpisodePreview.query().where_null('user_id').where_not_null('title').select('id', 'guid', 'start', 'end', 'highlight', 'title', 'type', 'score', 'podcast_episode_id').order_by('score', 'desc')}) \
        .with_('chapters') \
        .where('podcast_id', '=', db_podcast.id) \
        .order_by('publication_date', 'desc') \
        .paginate(page_size, page)
    
    podcast_episode_list = PodcastEpisode.convert_list(db_podcast_episodes, include_podcast=False)
    
    return podcast_episode_list


@router.get('/api/podium/clients/v1/podcast/{podcast_id}/episodes/clips/search', description="Returns a list of podcast episode clips from a podcast matching a search query", tags=["Podcasts"], response_model=List[PodcastEpisodeSearchClip])
async def search_podcast_episodes_clips(
        podcast_id: str = Path(
            default=None,
            description="The id of the podcast to search episode clips from. Can be a Podium id, iTunes id, or RSS URL MD5 hash."
        ), 
        query: str = Query(
        default=None,
            description="The search query to search for in the podcast episodes."
        ),
        api_key: str = Depends(auth_scheme)
) -> List[PodcastEpisodeSearchClip]:

    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    podcast = app.core.data_models.Podcast \
        .where('guid', podcast_id) \
        .or_where('itunes_id', podcast_id) \
        .or_where('rss_url_md5', podcast_id) \
        .select('id', 'guid') \
        .first()

    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    response = requests.post(
        app.env['engine_api_url'] + '/search/query',
        json={
            'query': query,
            'podcast_id': podcast.guid,
            'user_id': None
        }
    )

    result_podcast_episode_guids = []
    for result in response.json()['results']:
        if result['podcast_episode_id'] not in result_podcast_episode_guids:
            result_podcast_episode_guids.append(result['podcast_episode_id'])

    db_podcast_episodes = app.core.data_models.PodcastEpisode \
        .with_('podcast') \
        .where_in('guid', result_podcast_episode_guids) \
        .order_by('publication_date', 'desc') \
        .get()
    
    podcast_episodes = {}
    for db_podcast_episode in db_podcast_episodes:
        podcast_episodes[db_podcast_episode.guid] = db_podcast_episode
    
    podcast_episode_clip_search_results = []
    for result in response.json()['results']:
        if result['podcast_episode_id'] in podcast_episodes:
            search_clip = PodcastEpisodeSearchClip()
            clip = PodcastEpisodeDetailedClip()
            clip.start_seconds = result['start']
            clip.end_seconds = result['start'] + 40 # default clip length
            clip.transcript_context = result['content']
            clip.origin = 'podium:search'
            
            search_clip.transcript_context_snippet = result['highlight']
            if result['highlight_type'] == 'answer':
                search_clip.result_type = 'answer'
            else:
                search_clip.result_type = 'result'
            
            clip.type = 'podium:search:' + search_clip.result_type
            clip.podcast_episode = PodcastEpisode.convert(podcast_episodes[result['podcast_episode_id']])
            clip.podcast = Podcast.convert(podcast_episodes[result['podcast_episode_id']].podcast)
            search_clip.clip = clip

            podcast_episode_clip_search_results.append(search_clip)
    
    return podcast_episode_clip_search_results
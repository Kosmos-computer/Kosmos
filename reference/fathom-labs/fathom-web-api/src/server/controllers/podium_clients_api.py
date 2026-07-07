import app
from modules import *

from fastapi import APIRouter, Header, HTTPException, Request, Depends, File, UploadFile, Form
from fastapi.security import HTTPBearer
from fastapi.responses import ORJSONResponse
# from fastapi import APIRouter, Depends, File, UploadFile, HTTPException

from pydantic import BaseModel, Field
from typing import Optional, List
from sse_starlette.sse import EventSourceResponse

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
from secrets import token_urlsafe
from hashlib import sha256
import boto3
from botocore.exceptions import NoCredentialsError, ClientError
import copy 
import pypandoc


router = APIRouter()
auth_scheme = HTTPBearer()

S3_BUCKET_NAME = 'podium-production' 
S3_REGION = 'us-east-1'
S3_ACCESS_KEY = app.core.env['aws_access_key']
S3_SECRET_KEY = app.core.env['aws_access_secret']


class ProcessingTasksConfiguration(BaseModel):
    generate_transcript: bool = Field(
        default=True,
        description="Whether to generate a transcript for the media."
    )
    generate_titles: bool = Field(
        default=True,
        description="Whether to generate a titles asset for the media."
    )
    generate_show_notes_summary: bool = Field(
        default=True,
        description="Whether to generate a show notes summary asset for the media."
    )
    generate_links_and_mentions: bool = Field(
        default=True,
        description="Whether to generate a list of links and mentions asset for the media."
    )
    generate_keywords: bool = Field(
        default=True,
        description="Whether to generate a list of keywords asset for the media."
    )
    generate_chapters: bool = Field(
        default=True,
        description="Whether to generate chapter assets for the media. Chapter assets will include a title, summary, and start/end times (in seconds)."
    )
    generate_highlights: bool = Field(
        default=True,
        description="Whether to generate a highlight clip assets for the media. Highlight clip assets will include a title, transcript, and start/end times (in seconds)."
    )
    generate_quotes: bool = Field(
        default=True,
        description="Whether to generate a quote assets for the media. Quote assets will include a title, transcript, and start/end times (in seconds)."
    )
    generate_podbook: Optional[bool] = Field(
        default=False,
        description="Whether to generate a quote assets for the media. Quote assets will include a title, transcript, and start/end times (in seconds)."
    )

    @staticmethod
    def from_podium_package_processing_configuration(configuration):
        processing_tasks_configuration = ProcessingTasksConfiguration(
            generate_transcript = configuration.generate_transcript,
            generate_titles = configuration.generate_titles,
            generate_show_notes_summary = configuration.generate_show_notes_summary,
            generate_links_and_mentions = configuration.generate_links_and_mentions,
            generate_keywords = configuration.generate_keywords,
            generate_chapters = configuration.generate_chapters,
            generate_highlights = configuration.generate_highlights,
            generate_quotes = configuration.generate_quotes,
            generate_podbook = configuration.generate_podbook
        )

        return processing_tasks_configuration

class ProcessingTaskStatus(BaseModel):
    task: str = Field(
        description="The name of the task.",
    )
    completed: bool = Field(
        description="Whether the task has been completed.",
    )

class EmbeddingVector(BaseModel):
    embedding_vector: List[float] = Field(
        description="The 768 dimension embedding vector for the supplied.",
    )

class TextContent(BaseModel):
    content: str = Field(
        description="The text content. Can be any text content, such as a news article, HTML, or code.",
    )


class BaseMediaInfo(BaseModel):
    name: Optional[str] = Field(
        default='',
        description="The name of the media. Can be any string, such as a short description or original filename.",
        example="#367 – Sam Altman: OpenAI CEO on GPT-4, ChatGPT, and the Future of Artificial Intelligence"
    )
    project_id: Optional[str] = Field(
        default=None,
        description="The id of a Podium project to associate this media with. Useful for grouping media together, filtering, and (in the future) searching.",
        example="b92c8157-c18a-40ef-b6e7-c1fc6a3b5d46"
    )
    keywords: Optional[str] = Field(
        default='',
        description="A comma-separated list of keywords related to the media. Useful for filtering and organizing media.",
        example="openai, gpt-4, chatgpt, artificial intelligence, news, technology"
    )
    summary : Optional[str] = Field(
        description="summary of the media",
        example="summary of the media",
    )
    title : Optional[str] = Field(
        description="title of the media",
        example="Sam Altman, Google Inc.",
        )

class AddMediaInfo(BaseMediaInfo):
    file_url: str = Field(
        default=None,
        description="The URL of the media file to process. Required when adding media. Must be publicly accessible. Only MP3 audio files are currently supported.",
        example="https://fathom-production.s3.amazonaws.com/podcasts/lex_fridman_podcast/episodes/367_sam_altman_openai_ceo_on_gpt_4_chatgpt_and_the_future_of_ai_2023_03_25/audio/8e4bd9a1-01a0-46cf-bf1f-ceb93b0ad269.mp3"
    )
    language_code: Optional[str] = Field(
        default=None,
        description="The language code of the media. If not provided, media language will be automatically detected. Valid code values are available here: https://api-docs.podium.page/page/language-codes",
        example="en"
    )
    podcast_rss_url: Optional[str] = Field(
        default=None,
        description="The RSS feed URL of the podcast this media is associated with. Improves the accuracy, style, and tone of AI-generated media assets.",
        example="https://lexfridman.com/feed/podcast/"
    )
    podcast_episode_rss_guid: Optional[str] = Field(
        default=None,
        description="The RSS GUID of the podcast episode this media is associated with, if any. This is typically resolved from the podcast RSS feed URL using AI after the episode is published.",
        example="https://lexfridman.com/?p=5626"
    )
    youtube_channel_url: Optional[str] = Field(
        default=None,
        description="The YouTube channel URL of the podcast this media is associated with. Improves the accuracy, style, and tone of AI-generated media assets.",
        example="https://www.youtube.com/@lexfridman"
    )
    content_type: Optional[str] = Field(
        default=None,
        description="The content type of the media. Can be 'podcast', 'religious', or 'video'.",
        example="podcast"
    )
    processing_tasks_configuration: ProcessingTasksConfiguration

class MediaInfo(AddMediaInfo):
    id: str = Field(
        description="The id of the media.",
        example="b92c8157-c18a-40ef-b6e7-c1fc6a3b5d46"
    )
    created_at: datetime.datetime = Field(
        description="The date and time the media was added.",
        example=""
    )
    updated_at: datetime.datetime = Field(
        description="The date and time the media was last updated.",
        example=""
    )
    video_file_url: str = Field(
        default=None,
        description="The URL of the video file if the original media is a video.",
        example="https://fathom-production.s3.amazonaws.com/podcasts/lex_fridman_podcast/episodes/367_sam_altman_openai_ceo_on_gpt_4_chatgpt_and_the_future_of_ai_2023_03_25/audio/8e4bd9a1-01a0-46cf-bf1f-ceb93b0ad269.mp4"
    )
    podium_page_url: str = Field(
        description="The public URL of the Podium page for this media - primarily used as a link to the media's transcript for display.",
        example="https://podium.page/s/XDz5"
    )
    podium_edit_page_url: str = Field(
        description="The private transcript / asset editing interface for this media. Add a URL encoded return_url query parameter to redirect the user to a specific page after editing (when they click 'Finished').",
        example="https://podium.page/job/b88eaa8f-092e-4e8a-808f-aebb865da031?a=eyJhbGciOiJIUzI1Ni..."
    )
    podcast_id: Optional[str] = Field(
        default=None,
        description="The Podium podcast id of the podcast this media is associated with, if any.",
    )
    podcast_episode_id: Optional[str] = Field(
        default=None,
        description="The Podium podcast episode id of the podcast episode this media is associated with, if any. This is typically resolved from the podcast RSS feed URL using AI after the episode is published.",
    )
    duration: Optional[float] = Field(
        default=None,
        description="The duration of the media in seconds.",
    )
    content_type : Optional[str] = Field(
        description="The content type of the media.",
        example="podcast",
        default="podcast"
    )
    credit_minutes_used: Optional[float] = Field(
        default=None,
        description="The number of Podium credit minutes used to process this media.",
    )
    processing_completed: bool = Field(
        description="Whether all processing tasks have been completed.",
    )
    processing_tasks: List[ProcessingTaskStatus] = Field(
        description="The status of each processing task.",
    )
    processing_error: bool = Field(
        description="Whether an error was encountered during processing.",
    )
    processing_error_description: Optional[str] = Field(
        description="A description of the processing error, if one was encountered.",
    )
    image_url : Optional[str] = Field(
        description="The URL of the image if available"
    )
    episode_title : Optional[str] = Field(
        description= " episode title",
    )
    show_title : Optional[str] = Field(
        description=" show title",
    )
    show_notes : Optional[dict] = Field(
        description = " show notes",
    )
    
    @staticmethod
    def from_podium_package(package):
        # cross-linked media
        podcast_rss_url = package.podcast_rss_url
        youtube_channel_url = package.youtube_channel_url
        podcast_id = None
        podcast_episode_id = None
        podcast_episode_rss_guid = None

        # resolve podcast / episode ids
        if package.podcast_episode_id:
            podcast_episode = app.core.data_models.PodcastEpisode \
                .where('id', package.podcast_episode_id) \
                .select('rss_guid', 'guid', 'podcast_id') \
                .first()
            if podcast_episode:
                podcast_episode_rss_guid = podcast_episode.rss_guid
                podcast_episode_id = podcast_episode.guid

                podcast = app.core.data_models.Podcast \
                    .where('id', podcast_episode.podcast_id) \
                    .select('guid') \
                    .first()
                if podcast:
                    podcast_id = podcast.guid


        # duration
        duration = None
        if package.duration != 5432:
            duration = package.duration

        # credit minutes used
        credit_minutes_used = None
        if len(package.podium_transactions) > 0:
            credit_minutes_used = 0.00
            for transaction in package.podium_transactions:
                if transaction.credits:
                    credit_minutes_used += float(transaction.credits) * -1.00


        # project
        project_id = None
        if package.podium_project_id:
            project = app.core.data_models.PodiumProject.find(package.podium_project_id)
            if project:
                project_id = project.guid
                if project.podcast_rss_url and not podcast_rss_url:
                    podcast_rss_url = project.podcast_rss_url
                if project.youtube_channel_url and not youtube_channel_url:
                    youtube_channel_url = project.youtube_channel_url
                if project.podcast_id and not podcast_id:
                    podcast = app.core.data_models.Podcast \
                        .where('id', project.podcast_id) \
                        .select('guid') \
                        .first()
                    if podcast:
                        podcast_id = podcast.guid

        # processing tasks
        processing_completed = True
        processing_tasks = []
        processing_configuration = package.podium_package_processing_configuration

        if processing_configuration:
            if processing_configuration.generate_transcript:
                task = ProcessingTaskStatus(task='generate_transcript', completed=False)
                if package.lookup_process_attribute_value('transcribed') == 'true':
                    task.completed = True
                processing_tasks.append(task)
            if processing_configuration.generate_titles:
                task = ProcessingTaskStatus(task='generate_titles', completed=False)
                if package.lookup_process_attribute_value('summary_generated') == 'true':
                    task.completed = True
                processing_tasks.append(task)
            if processing_configuration.generate_show_notes_summary:
                task = ProcessingTaskStatus(task='generate_show_notes_summary', completed=False)
                if package.lookup_process_attribute_value('summary_generated') == 'true':
                    task.completed = True
                processing_tasks.append(task)
            if processing_configuration.generate_links_and_mentions:
                task = ProcessingTaskStatus(task='generate_links_and_mentions', completed=False)
                if package.lookup_process_attribute_value('summary_generated') == 'true':
                    task.completed = True
                processing_tasks.append(task)
            if processing_configuration.generate_keywords:
                task = ProcessingTaskStatus(task='generate_keywords', completed=False)
                if package.lookup_process_attribute_value('summary_generated')== 'true':
                    task.completed = True
                processing_tasks.append(task)
            if processing_configuration.generate_chapters:
                task = ProcessingTaskStatus(task='generate_chapters', completed=False)
                if package.lookup_process_attribute_value('chapters_generated') == 'true':
                    task.completed = True
                processing_tasks.append(task)
            if processing_configuration.generate_highlights:
                task = ProcessingTaskStatus(task='generate_highlights', completed=False)
                if package.lookup_process_attribute_value('previews_generated') == 'true':
                    task.completed = True
                processing_tasks.append(task)
            if processing_configuration.generate_quotes:
                task = ProcessingTaskStatus(task='generate_quotes', completed=False)
                if package.lookup_process_attribute_value('summary_generated') == 'true':
                    task.completed = True
                processing_tasks.append(task)
            if processing_configuration.generate_podbook:
                task = ProcessingTaskStatus(task='generate_podbook', completed=False)
                if processing_configuration.generate_podbook_status == 'complete':
                    task.completed = True
                processing_tasks.append(task)

            # processing completed
            for task in processing_tasks:
                if not task.completed:
                    processing_completed = False
                    break
        else:
            processing_completed = False

        hashids = Hashids()

        encoded_token = jwt.encode({ "media_id": package.guid }, app.env['fathom_jwt_secret'], algorithm="HS256")

        file_url = None
        if package.audio_url_cdn():
            file_url = package.audio_url_cdn()
        elif package.original_media_url_cdn():
            file_url = package.original_media_url_cdn()

        video_file_url = None
        if package.video_url_cdn():
            video_file_url = package.video_url_cdn()

        image_url = None
        if package.thumbnail_image_s3_key:
            image_url = f"https://{S3_BUCKET_NAME}.s3.{S3_REGION}.amazonaws.com/{package.thumbnail_image_s3_key}"

        #check for content_type from podiumpackagemeta
        content_type = 'podcast'
        try:
            content_type = package.content_type
        except:
            pass

        return MediaInfo(
            id=package.guid,
            created_at=package.created_at,
            updated_at=package.updated_at,
            name=package.original_filename,
            file_url=file_url,
            video_file_url=video_file_url,
            content_type=content_type,
            image_url = image_url,
            language_code=package.language_code,
            project_id=project_id,
            podcast_rss_url=podcast_rss_url,
            youtube_channel_url=youtube_channel_url,
            podium_page_url='https://podium.page/s/' + hashids.encode(package.id),
            podium_edit_page_url='https://podium.page/client-media-editor/' + package.guid + '?a=' + encoded_token,
            duration=duration,
            credit_minutes_used=credit_minutes_used,
            podcast_id=podcast_id,
            podcast_episode_id=podcast_episode_id,
            podcast_episode_rss_guid=podcast_episode_rss_guid,
            processing_completed=processing_completed,
            processing_tasks=processing_tasks,
            processing_tasks_configuration=ProcessingTasksConfiguration.from_podium_package_processing_configuration(processing_configuration),
            processing_error=(package.error is not None),
            processing_error_description=package.error_type
        )

class MediaInfoList(BaseModel):
    page: int = Field(
        default=1,
        description="The page number of the media results to return.",
        example=1,
    )
    page_size: int = Field(
        default=10,
        description="The number of media results to return per page. Cannot be greater than 50.",
        example=10,
    )
    total_count: int = Field(
        description="The total number of media results available.",
    )
    media: List[MediaInfo] = Field(
        description="The list of media.",
    )

class MonologueElement(BaseModel):
    type: str = Field(
        description="The type of element. Can be 'text' or 'punct'."
    )
    value: str = Field(
        description="The value of the element. May be a word, punctuation, or space."
    )
    start_seconds: Optional[float] = Field(
        description="DEPRECATED: The start time of the element in seconds."
    )
    end_seconds: Optional[float] = Field(
        description="DEPRECATED: The end time of the element in seconds."
    )
    start: float = Field(
        description="The start time of the element in seconds."
    )
    end: float = Field(
        description="The end time of the element in seconds."
    )

class Monologue(BaseModel):
    speaker_id: str = Field(
        description="The id of the speaker."
    )
    elements: List[MonologueElement] = Field(
        description="The list of elements (words, spaces, punctuation) in the monologue."
    )

class BaseSpeaker(BaseModel):
    id: str = Field(
        description="The id of the speaker."
    )
    set_name: Optional[str] = Field(
        description="The name of the speaker as set by the user, if the user has set the name.",
        example="Andrew Huberman"
    )
    set_role: Optional[str] = Field(
        description="""
The role of the speaker in the media as set by the user, if the user has set the role.
Can be any value. Recommended values are 'host', 'guest', 'co-host', 'caller', 'interviewer', 'interviewee', 'ad', 'other' or 'unknown'.
""",
        example="host"
    )

class Speaker(BaseSpeaker):
    default_name: str = Field(
        description="The default name of the speaker.",
        example="Speaker 1"
    )
    default_role: str = Field(
        description="The default role of the speaker in the media. Is always 'unknown'.",
        example="unknown"
    )
    predicted_name: Optional[str] = Field(
        description="The AI predicted name of the speaker, if available.",
        example="Andrew Hughberman"
    )
    predicted_role: Optional[str] = Field(
        description="""
The AI predicted role of the speaker in the media, if available.
Can be one of 'host', 'guest', 'co-host', 'caller', 'interviewer', 'interviewee', 'ad', 'other' or 'unknown'.
""",
        example="guest"
    )

    @staticmethod
    def convert(db_speaker):
        speaker = Speaker(
            id=db_speaker.guid,
            default_name=db_speaker.default_name,
            default_role=db_speaker.default_role,
            set_name=db_speaker.set_name,
            set_role=db_speaker.set_role,
            predicted_name=db_speaker.predicted_name,
            predicted_role=db_speaker.predicted_role
        )
        return speaker

class MediaTranscript(BaseModel):
    monologues: List[Monologue] = Field(
        description="The list of monologues in the media."
    )
    speakers: List[Speaker] = Field(
        description="The list of speakers in the media."
    )

class MediaAssetVariation(BaseModel):
    id: str = Field(
        description="The id of the asset.",
        example="1f586e65-e81d-4801-8a5b-10470a6a076e"
    )
    type: str = Field(
        description="The type of the asset, such as 'show_notes_summary', 'titles', 'keywords', etc.",
        example="titles"
    )
    variation_type: Optional[str] = Field(
        description="The type of variation, such as 'alternative', 'short_key_points', etc.",
        example="short_key_points"
    )
    format: str = Field(
        description="The format of the asset, such as 'text', 'text_timestamped', etc.",
        example="text"
    )
    has_vector: bool = Field(
        description="Whether the asset has an embedding vector representation available via Get Media Asset Vector.",
        example=False
    )
    accepted_variant: bool = Field(
        description="Whether the asset is currently the user accepted / selected variant. Useful for determining which asset to use when variants are available.",
        example=True
    )
    title: Optional[str] = Field(
        description="The title of the asset, if applicable.",
        example=""
    )
    content: Optional[str] = Field(
        description="The content of the asset, if applicable.",
        example="The Future of AI and Podcasts"
    )
    start_seconds: Optional[float] = Field(
        description="The start time of the asset in seconds, if applicable.",
        example=0.0
    )
    end_seconds: Optional[float] = Field(
        description="The end time of the asset in seconds, if applicable.",
        example=0.0
    )
    parent_asset_id: Optional[str] = Field(
        description="The id of the parent asset, if applicable.",
        example="2c586e65-e81d-9801-8a5b-10470a6a0e76"
    )
    speakers: Optional[List[Speaker]] = Field(
        description="The list of speakers associated with the asset, if applicable.",
    )
    url: Optional[str] = Field(
        description="The url of the asset, if applicable. For example, the url of a generated video asset (future functionality).",
        example="https://cdn.podium.page/Z6Bw/2FcD.mp4"
    )
    metadata: Optional[dict] = Field(
        description="The metadata of the asset, if applicable. May contain asset-type specific data.",
        example={'highlight_type': 'fathom:interesting','media_similarity_score': 0.6427240434094924}
    )
    editor_content_text : Optional[str] = Field(
        description="The editor's content text for the asset, if applicable.",
        example="In this chapter we discuss the future of AI..."
    )
    editor_content_json : Optional[List] = Field(
        description="The editor's content JSON for the asset, if applicable.",
        example='{"title": "The Future of AI", "content": "In this chapter we discuss the future of AI..."}'
    )
    updated_content : Optional[List] = Field(
        description="The editor's updated content JSON for the asset, if applicable.",
        example='{"title": "The Future of AI updated", "content": "In this chapter we discuss the future of AI updated..."}'
    )
    content_text : Optional[str] = Field(
        description="The editor's content text for the asset, if applicable.",
        example="In this chapter we discuss the future of AI..."
    )
    
    @staticmethod
    def convert(db_asset, parent_asset_id=None):
        has_vector = False
        metadata = None
        
        if isinstance(db_asset.editor_content_json, str):
            editor_content_json = json.loads(db_asset.editor_content_json)
        else:
            editor_content_json = db_asset.editor_content_json

        return MediaAssetVariation(
            id=db_asset.guid,
            type=db_asset.type,
            variation_type=db_asset.variation_type,
            format=db_asset.format,
            has_vector=has_vector,
            accepted_variant=db_asset.accepted_variant,
            title=db_asset.title,
            content=db_asset.content,
            start_seconds=db_asset.start_seconds,
            end_seconds=db_asset.end_seconds,
            parent_asset_id=parent_asset_id,
            metadata=metadata,
            editor_content_text = db_asset.editor_content_text,
            editor_content_json = editor_content_json,
            updated_content = db_asset.updated_content,
            content_text = db_asset.content_text,
        )

class MediaAsset(BaseModel):
    id: str = Field(
        description="The id of the asset.",
        example="1f586e65-e81d-4801-8a5b-10470a6a076e"
    )
    type: str = Field(
        description="The type of the asset, such as 'show_notes_summary', 'titles', 'keywords', etc.",
        example="chapter"
    )
    format: str = Field(
        description="The format of the asset, such as 'text', 'text_timestamped', etc.",
        example="text"
    )
    has_vector: bool = Field(
        description="Whether the asset has an embedding vector representation available via Get Media Asset Vector.",
        example=True
    )
    accepted_variant: bool = Field(
        description="Whether the asset is currently the user accepted / selected variant. Useful for determining which asset to use when variants are available.",
        example=True
    )
    title: Optional[str] = Field(
        description="The title of the asset, if applicable.",
        example="The Future of AI"
    )
    content: Optional[str] = Field(
        description="The content of the asset, if applicable.",
        example="In this chapter we discuss the future of AI..."
    )
    start_seconds: Optional[float] = Field(
        description="The start time of the asset in seconds, if applicable.",
        example=0.0
    )
    end_seconds: Optional[float] = Field(
        description="The end time of the asset in seconds, if applicable.",
        example=314.159
    )
    parent_asset_id: Optional[str] = Field(
        description="The id of the parent asset, if applicable.",
        example="2c586e65-e81d-9801-8a5b-10470a6a0e76"
    )
    speakers: Optional[List[Speaker]] = Field(
        description="The list of speakers associated with the asset, if applicable.",
    )
    url: Optional[str] = Field(
        description="The url of the asset, if applicable. For example, the url of a generated video asset (future functionality).",
        example="https://cdn.podium.page/Z6Bw/2FcD.mp4"
    )
    metadata: Optional[dict] = Field(
        description="The metadata of the asset, if applicable. May contain asset-type specific data.",
        example={'highlight_type': 'fathom:interesting','media_similarity_score': 0.6427240434094924}
    )
    variations: List[MediaAssetVariation] = Field(
        default=[],
        description="The list of variations of the asset, if applicable. For example, several alternative AI generated media titles."
    )
    editor_content_text : Optional[str] = Field(
        description="The editor's content text for the asset, if applicable.",
        example="In this chapter we discuss the future of AI..."
    )
    editor_content_json : Optional[List] = Field(
        description="The editor's content JSON for the asset, if applicable.",
        example='{"title": "The Future of AI", "content": "In this chapter we discuss the future of AI..."}'
    )
    updated_content : Optional[List] = Field(
        description="The editor's updated content JSON for the asset, if applicable.",
        example='{"title": "The Future of AI updated", "content": "In this chapter we discuss the future of AI updated..."}'
    )
    is_updated : Optional[bool] = Field(
        description="Whether the asset is updated or not.",
        example=False
    )
    content_text : Optional[str] = Field(
        description="The editor's content text for the asset, if applicable.",
        example="In this chapter we discuss the future of AI..."
    )

    @staticmethod
    def convert_list(db_assets):
        parent_asset_variations = {}
        for db_asset in db_assets:
            if db_asset.parent_id is None:
                parent_asset_variations[db_asset.id] = []

        for db_asset in db_assets:
            if db_asset.parent_id is not None:
                parent_asset_variations[db_asset.parent_id].append(db_asset)

        # maintains original select order
        media_assets = []
        for db_asset in db_assets:
            if db_asset.parent_id is None:
                db_variations = parent_asset_variations[db_asset.id]
                variations = []
                for db_variation in db_variations:
                    variations.append(MediaAssetVariation.convert(db_variation, parent_asset_id=db_asset.guid))

                media_assets.append(MediaAsset.convert(db_asset, variants=variations))

        return media_assets

    @staticmethod
    def convert(db_asset, variants=[]):
        # print(variants)
        has_vector = False
        if db_asset.type in ['chapter', 'highlight']:
            has_vector = True

        metadata = None
        if db_asset.type in ['highlight']:
            try:
                metadata = {
                    'highlight_type': db_asset.podium_package_preview.type,
                    'media_similarity_score': db_asset.podium_package_preview.score
                }
            except:
                metadata = {}

        if isinstance(db_asset.editor_content_json, str):
            editor_content_json = json.loads(db_asset.editor_content_json)
        else:
            editor_content_json = db_asset.editor_content_json

        if isinstance(db_asset.updated_content, str):
            updated_content = json.loads(db_asset.updated_content)
        else:
            updated_content = db_asset.updated_content
        status = False
        if db_asset.type == 'highlight':
            clip = app.core.data_models.PodiumClipProps \
                .where('highlight_id', db_asset.guid) \
                .first()
            if clip:
                status = clip.is_updated

        return MediaAsset(
            id=db_asset.guid,
            type=db_asset.type,
            format=db_asset.format,
            has_vector=has_vector,
            accepted_variant=db_asset.accepted_variant,
            title=db_asset.title,
            content=db_asset.content,
            start_seconds=db_asset.start_seconds,
            end_seconds=db_asset.end_seconds,
            metadata=metadata,
            variations=variants,
            editor_content_text = db_asset.editor_content_text,
            editor_content_json = editor_content_json,
            updated_content = updated_content,
            content_text = db_asset.content_text,
            is_updated = status
        )

MediaAsset.update_forward_refs()

class MediaAssetUpdate(BaseModel):
    accepted_variant: Optional[bool] = Field(
        description="Whether the asset is currently the user accepted / selected variant. Useful for determining which asset to use when variants are available.",
        example=True
    )
    title: Optional[str] = Field(
        description="The title of the asset, if applicable.",
        example="The Future of AI"
    )
    content: Optional[str] = Field(
        description="The content of the asset, if applicable.",
        example="In this chapter we discuss the future of AI..."
    )
    start_seconds: Optional[float] = Field(
        description="The start time of the asset in seconds, if applicable.",
        example=0.0
    )
    end_seconds: Optional[float] = Field(
        description="The end time of the asset in seconds, if applicable.",
        example=314.159
    )
    editor_content_text : Optional[str] = Field(
        description="The editor's content text for the asset, if applicable.",
        example="In this chapter we discuss the future of AI..."
    )
    editor_content_json : Optional[List] = Field(
        description="The editor's content JSON for the asset, if applicable.",
        example='{"title": "The Future of AI", "content": "In this chapter we discuss the future of AI..."}'
    )
    updated_content : Optional[List] = Field(
        description="The editor's updated content JSON for the asset, if applicable.",
        example='{"title": "The Future of AI updated", "content": "In this chapter we discuss the future of AI updated..."}'
    )
    content_text : Optional[str] = Field(
        description="The editor's content text for the asset, if applicable.",
        example="In this chapter we discuss the future of AI..."
    )
    
class Prompt(BaseModel):
    prompt: str = Field(
        description="The prompt text.",
        example="Write a twitter thread for this episode."
    )

class BaseProjectInfo(BaseModel):
    name: str = Field(
        description="The name of the project.",
        example="Huberman Lab Podcast"
    )
    description: Optional[str] = Field(
        description="The description of the project.",
        example="All of the Huberman Lab Podcast episodes."
    )
    image_url: Optional[str] = Field(
        default=None,
        description="The url of the project image. When an RSS feed is provided, the image_url will be automatically set to the image of the podcast unless an image URL is specifically set.",
        example="https://megaphone.imgix.net/podcasts/042e6144-725e-11ec-a75d-c38f702aecad/image/Huberman-Lab-Podcast-Thumbnail-3000x3000.png?ixlib=rails-4.3.1&max-w=3000&max-h=3000&fit=crop&auto=format,compress"
    )
    podcast_rss_url: Optional[str] = Field(
        default=None,
        description="The RSS feed url of the podcast associated with this project. Improves AI performance by providing additional training data.",
        example="https://feeds.megaphone.fm/hubermanlab"
    )
    youtube_channel_url: Optional[str] = Field(
        default=None,
        description="The url of the YouTube channel associated with this project. Improves AI performance by providing additional training data.",
        example="https://www.youtube.com/@hubermanlab"
    )

class ProjectInfo(BaseProjectInfo):
    id: str = Field(
        description="The id of the project.",
        example="3a587e25-f81d-2801-7a5b-10470a6a0a81"
    )
    podcast_id: Optional[str] = Field(
        default=None,
        description="The Podium podcast id of the podcast this project is associated with, if any.",
        example="9b584e65-c11e-9801-1c5b-50470a6a0a14"
    )
    created_at: datetime.datetime = Field(
        description="The date and time the project was created.",
        example=""
    )
    content_type : Optional[str] = Field(
        description="The content type of the project.",
        example="podcast"
    )
    updated_at: datetime.datetime = Field(
        description="The date and time the project was last updated.",
        example=""
    )
    latest_media_uploaded_at: Optional[datetime.datetime] = Field(
        description="The date and time the latest media was uploaded.",
        example=""
    )
    media_count: int = Field(
        description="The number of media files associated with this project.",
        example="31"
    )

class ProjectInfoList(BaseModel):
    page: int = Field(
        default=1,
        description="The page number of the project results to return.",
        example=1,
    )
    page_size: int = Field(
        default=10,
        description="The number of project results to return per page. Cannot be greater than 50.",
        example=10,
    )
    total_count: int = Field(
        description="The total number of project results available.",
    )
    projects: List[ProjectInfo] = Field(
        default=[],
        description="The list of projects.",
    )

@router.post('/api/podium/clients/v1/media/add', description="""
Adds a media file for AI processing to your account.

Only .MP3 files are currently supported (video support coming soon).

The media file will be downloaded from the provided file_url and AI transcription / content generation will begin according to the provided processing_tasks_configuration.

All added media files that complete processing will consume credit minutes from your acount based on the length of the media file.

To check (poll) the processing status, make a call to the Get Media endpoint (webhook status updates coming soon).
"""
, tags=["Media"], response_model=MediaInfo)
async def add_media(media_to_add: AddMediaInfo, api_key: str = Depends(auth_scheme)) -> MediaInfo:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    if media_to_add.language_code is not None \
        and media_to_add.language_code not in app.core.data_models.PodiumPackageTranscriptFile.whisper_supported_languages:
        raise HTTPException(status_code=400, detail="Invalid language_code")

    podium_package = app.core.data_models.PodiumPackage()
    podium_package.user_id = user.id
    podium_package.original_filename = media_to_add.name

    # DEBUG ONLY
    # podium_package.error = 'Testing'
    # podium_package.error_type = 'Testing'
    # podium_package.system_check_ignore = True

    # find podium project
    if media_to_add.project_id:
        podium_project = app.core.data_models.PodiumProject \
            .where('guid', media_to_add.project_id) \
            .where('is_deleted', False) \
            .where('podium_user_id', user.id) \
            .first()
        if not podium_project:
            raise HTTPException(status_code=400, detail="Invalid project_id")
        podium_package.podium_project_id = podium_project.id

    # find podcast
    if media_to_add.podcast_rss_url:
        podium_package.podcast_rss_url = media_to_add.podcast_rss_url

        podcast = app.core.data_models.Podcast \
            .where('rss_url', media_to_add.podcast_rss_url) \
            .select('id') \
            .first()
        if podcast:
            podium_package.podcast_id = podcast.id

    # find youtube channel
    if media_to_add.youtube_channel_url:
        podium_package.youtube_channel_url = media_to_add.youtube_channel_url

    # save package
    podium_package.save()
    podium_package.initialize_process_attributes()

    # configure processing tasks
    processing_configuration = app.core.data_models.PodiumPackageProcessingConfiguration \
        .where('podium_package_id', podium_package.id) \
        .first()
    if processing_configuration:
        processing_configuration.generate_transcript = media_to_add.processing_tasks_configuration.generate_transcript
        processing_configuration.generate_titles = media_to_add.processing_tasks_configuration.generate_titles
        processing_configuration.generate_show_notes_summary = media_to_add.processing_tasks_configuration.generate_show_notes_summary
        processing_configuration.generate_links_and_mentions = media_to_add.processing_tasks_configuration.generate_links_and_mentions
        processing_configuration.generate_keywords = media_to_add.processing_tasks_configuration.generate_keywords
        processing_configuration.generate_chapters = media_to_add.processing_tasks_configuration.generate_chapters
        processing_configuration.generate_highlights = media_to_add.processing_tasks_configuration.generate_highlights
        processing_configuration.generate_quotes = media_to_add.processing_tasks_configuration.generate_quotes
        processing_configuration.generate_podbook = media_to_add.processing_tasks_configuration.generate_podbook
        processing_configuration.save()

    # set the remote media url (triggers processing)
    podium_package.remote_media_file_url = media_to_add.file_url
    podium_package.language_code = media_to_add.language_code
    podium_package.content_type = media_to_add.content_type
    podium_package.save()
       
    podium_package = podium_package.fresh()

    return MediaInfo.from_podium_package(podium_package)


@router.put('/api/podium/clients/v1/media/{media_id}/update',description="update the podium pacakge",tags=["Media"],include_in_schema=False)
async def update_media(
    media_id: str, 
    original_filename: Optional[str] = Form(...), 
    show_title: Optional[str] = Form(None),  
    s3_path: Optional[str] = Form(None),
    episode_title: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    api_key: str = Depends(auth_scheme)
    ):
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    podium_package = app.core.data_models.PodiumPackage \
    .where('guid', media_id) \
    .where('user_id', user.id) \
    .where('is_deleted', False) \
    .first()

    if not podium_package:
        raise HTTPException(status_code=404, detail="Media not found")
    
    try:
        if image:
            if podium_package.thumbnail_image_s3_key:
                delete_image_from_s3(podium_package.thumbnail_image_s3_key)
            image_url,s3_path = upload_image_to_s3(image,podium_package.guid,folder_name='podium-packages')


        podium_package.thumbnail_image_s3_key = s3_path
        podium_package.simple_title = episode_title
        podium_package.original_filename = original_filename
        podium_package.subtitle = show_title

        podium_package.save()

        return{"status": "Media updated successfully"}
    except HTTPException as e:
        # Handle HTTP exceptions specifically
        raise e
    except Exception as e:
        # Handle all other exceptions
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/api/podium/clients/v1/media/{media_id}/update', description="Updates the name and project for a media file", tags=["Media"], response_model=MediaInfo, include_in_schema=False)
async def update_media_info(media_id: str, media_info: BaseMediaInfo, api_key: str = Depends(auth_scheme)) -> MediaInfo:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_package = app.core.data_models.PodiumPackage \
    .where('guid', media_id) \
    .where('user_id', user.id) \
    .where('is_deleted', False) \
    .first()

    if not podium_package:
        raise HTTPException(status_code=404, detail="Media not found")
    
    if media_info.project_id:
        podium_project = app.core.data_models.PodiumProject \
            .where('guid', media_info.project_id) \
            .where('podium_user_id', user.id) \
            .where('is_deleted', False) \
            .select('id') \
            .first()

        if not podium_project:
            raise HTTPException(status_code=404, detail="Project not found")

        podium_package.podium_project_id = podium_project.id

    if media_info.name:
        podium_package.original_filename = media_info.name

    print("media_info.keywords",media_info.keywords)
    if media_info.keywords:
        podium_package.keywords = media_info.keywords    

    if media_info.summary:
        podium_package.summary = media_info.summary


    if media_info.title:
        podium_package.title = media_info.title

    print("kjsbisdbi")
    podium_package.save()

    return MediaInfo.from_podium_package(podium_package)

@router.get('/api/podium/clients/v1/media/list', description="Returns a paged list of your media files ordered by most recent", tags=["Media"], response_model=MediaInfoList)
async def list_media(page: Optional[int] = 1, page_size: Optional[int] = 10, api_key: str = Depends(auth_scheme)) -> MediaInfoList:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    if page_size > 50:
        raise HTTPException(status_code=400, detail="Page size must be less than or equal to 50")

    total_count = app.core.data_models.PodiumPackage \
        .where('user_id', user.id) \
        .where('is_deleted', False) \
        .count()

    podium_packages = app.core.data_models.PodiumPackage \
        .with_('podium_transactions') \
        .with_('podium_package_processing_configuration') \
        .with_('process_attributes') \
        .with_('podium_package_audio_files') \
        .where('user_id', user.id) \
        .where('is_deleted', False) \
        .order_by('created_at', 'desc') \
        .paginate(page_size, page)

    media_info_list = MediaInfoList(
        page=page,
        page_size=page_size,
        total_count=total_count,
        media=[MediaInfo.from_podium_package(podium_package) for podium_package in podium_packages]
    )

    return media_info_list

@router.post('/api/podium/clients/v1/media/{media_id}/asset/generate/document', description="Uses PodiumGPT to generate a new text document asset for a media file based on a prompt", tags=["Media"], response_model=MediaAsset)
async def generate_media_document_asset(media_id: str, prompt: Prompt, api_key: str = Depends(auth_scheme)) -> MediaAsset:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_package = app.core.data_models.PodiumPackage \
    .where('guid', media_id) \
    .where('user_id', user.id) \
    .where('is_deleted', False) \
    .select('id', 'content_type') \
    .first()

    if not podium_package:
        raise HTTPException(status_code=404, detail="Media not found")

    document = podium_package.generate_document(prompt.prompt)

    asset = app.core.data_models.PodiumPackageAsset \
        .where('podium_package_generated_document_id', document.id) \
        .first()

    return MediaAsset.convert(asset)

@router.post('/api/podium/clients/v1/media/{media_id}/transcript/speakers', description="Updates speaker names and roles for a media transcript. Useful if the predicted name/role for any speakers are incorrect.", tags=["Media"], response_model=List[Speaker])
async def set_transcript_speakers(media_id: str, speakers: List[BaseSpeaker], api_key: str = Depends(auth_scheme)) -> List[Speaker]:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials, allow_media_tokens=True, requested_media_id=media_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_package = app.core.data_models.PodiumPackage \
        .where('guid', media_id) \
        .where('user_id', user.id) \
        .where('is_deleted', False) \
        .first()
    if not podium_package:
        raise HTTPException(status_code=404, detail="Media not found")

    transcript_file = app.core.data_models.PodiumPackageTranscriptFile \
        .where('podium_package_id', podium_package.id) \
        .select('id') \
        .first()
    if not transcript_file:
        raise HTTPException(status_code=404, detail="Transcript not found")

    db_speakers = []
    for speaker in speakers:
        if speaker.id is None or speaker.id == '':
            raise HTTPException(status_code=400, detail="Speaker ID cannot be empty")

        db_speaker = app.core.data_models.PodiumPackageTranscriptFileSpeaker \
            .where('guid', speaker.id) \
            .first()
        if not db_speaker or db_speaker.podium_package_transcript_file_id != transcript_file.id:
            raise HTTPException(status_code=404, detail=f"Speaker {speaker.id} not found")

        db_speaker.set_name = speaker.set_name
        db_speaker.set_role = speaker.set_role
        db_speaker.save()
        db_speakers.append(db_speaker)

    set_speakers = []
    for db_speaker in db_speakers:
        set_speakers.append(Speaker.convert(db_speaker))

    return set_speakers

#get speakers
@router.get('/api/podium/clients/v1/media/{media_id}/transcript/speakers', description="Returns the list of speakers in a media transcript", tags=["Media"], response_model=List[Speaker])
async def get_transcript_speakers(media_id: str, api_key: str = Depends(auth_scheme)) -> List[Speaker]:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials, allow_media_tokens=True, requested_media_id=media_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_package = app.core.data_models.PodiumPackage \
        .where('guid', media_id) \
        .where('user_id', user.id) \
        .where('is_deleted', False) \
        .select('id') \
        .first()
    if not podium_package:
        raise HTTPException(status_code=404, detail="Media not found")

    transcript_file = app.core.data_models.PodiumPackageTranscriptFile \
        .where('podium_package_id', podium_package.id) \
        .select('id') \
        .first()
    if not transcript_file:
        raise HTTPException(status_code=404, detail="Transcript not found")
    
    db_speakers = app.core.data_models.PodiumPackageTranscriptFileSpeaker \
        .where('podium_package_transcript_file_id', transcript_file.id) \
        .get()
    
    speakers = []
    for db_speaker in db_speakers:
        speakers.append(Speaker.convert(db_speaker))

    return speakers

#class for add speaker
class AddSpeaker(BaseModel):
    set_name: str = Field(
        description="The name of the speaker as set by the user.",
        example="Andrew Huberman"
    )
    set_role: str = Field(
        description="The role of the speaker in the media as set by the user. Can be any value. Recommended values are 'host', 'guest', 'co-host', 'caller', 'interviewer', 'interviewee', 'ad', 'other' or 'unknown'.",
        example="host"
    )

#add new speaker
@router.post('/api/podium/clients/v1/media/{media_id}/transcript/speakers/add', description="Adds a new speaker to a media transcript", tags=["Media"], response_model=Speaker)
async def add_transcript_speaker(media_id: str, speaker: AddSpeaker, api_key: str = Depends(auth_scheme)) -> Speaker:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials, allow_media_tokens=True, requested_media_id=media_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_package = app.core.data_models.PodiumPackage \
        .where('guid', media_id) \
        .where('user_id', user.id) \
        .where('is_deleted', False) \
        .select('id') \
        .first()
    if not podium_package:
        raise HTTPException(status_code=404, detail="Media not found")

    transcript_file = app.core.data_models.PodiumPackageTranscriptFile \
        .where('podium_package_id', podium_package.id) \
        .select('id') \
        .first()
    if not transcript_file:
        raise HTTPException(status_code=404, detail="Transcript not found")
    
    db_speaker = app.core.data_models.PodiumPackageTranscriptFileSpeaker()
    db_speaker.guid = str(uuid.uuid4())
    db_speaker.podium_package_transcript_file_id = transcript_file.id
    db_speaker.set_name = speaker.set_name
    db_speaker.set_role = speaker.set_role
    db_speaker.default_name = speaker.set_name
    db_speaker.default_role = speaker.set_role
    db_speaker.predicted_name = None
    db_speaker.predicted_role = None
    db_speaker.save()


    return Speaker.convert(db_speaker)


@router.get('/api/podium/clients/v1/media/{media_id}', description="Returns media file info, including the media's current processing status. If webhooks for media status updates have not been implemented, poll this endpoint on a regular basis to determine processing status.", tags=["Media"], response_model=MediaInfo)
async def get_media(media_id: str, api_key: str = Depends(auth_scheme)) -> MediaInfo:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials, allow_media_tokens=True, requested_media_id=media_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_package = app.core.data_models.PodiumPackage \
        .where('guid', media_id) \
        .where('user_id', user.id) \
        .where('is_deleted', False) \
        .first()

    if not podium_package:
        raise HTTPException(status_code=404, detail="Media not found")

    media_info = MediaInfo.from_podium_package(podium_package)
    
    project = app.core.data_models.PodiumProject \
        .where('id', podium_package.podium_project_id) \
        .first()
    image_url = None
    if podium_package.thumbnail_image_s3_key:
        image_url = f"https://{S3_BUCKET_NAME}.s3.{S3_REGION}.amazonaws.com/{podium_package.thumbnail_image_s3_key}"

    media_info.image_url = image_url
    media_info.episode_title = podium_package.simple_title
    media_info.show_title = podium_package.subtitle 

    summary_asset_variations = app.core.data_models.PodiumPackageAsset \
                .where('podium_package_id', podium_package.id) \
                .where('type', 'show_notes_summary') \
                .where('variation_type', 'alternative') \
                .order_by('id', 'desc') \
                .get()

    episode_summary_alternative = []

    if len(summary_asset_variations) > 0:
        for summary_asset_variation in summary_asset_variations:
            episode_summary_alternative.append({
                'id': summary_asset_variation.guid,
                'summary': summary_asset_variation.content
            })

    episode_chapters = []
    for chapter in podium_package.chapters:
        asset = app.core.data_models.PodiumPackageAsset \
                .where('podium_package_chapter_id', chapter.id) \
                .where('variation_type', 'short_key_points') \
                .first()

        if asset is not None:
            episode_chapters.append({
                'id' : chapter.guid,
                'time': (datetime.timedelta(seconds=round(chapter.start))),
                'duration': round((chapter.end - chapter.start)/60),
                'description': chapter.description,
                'summary':chapter.summary ,
                'content': {'id':asset.guid,'content':asset.content}
            })
        

    episode_chapters_with_short_key_points =  copy.deepcopy(episode_chapters)
    episode_chapters_with_full_summaries = copy.deepcopy(episode_chapters)

    for chapter in episode_chapters:
        del chapter['content']
        del chapter['summary']
        del chapter['duration']

    for episode in episode_chapters_with_short_key_points:
        del episode['summary']
        del episode['duration']

    content_type = 'podcast'
    try:
        content_type = podium_package.content_type
        if content_type:
           content_type = content_type
        else:
            if project:
                    content_type = project.content_type
                    
    except:
        pass
    media_info.content_type = content_type


    media_info.show_notes = {
        "podium_package_id": podium_package.guid,
        "episode_keywords": podium_package.keywords,
        "episode_title_suggestions": podium_package.title,
        "episode_summary": podium_package.summary,
        "episode_summary_alternative": episode_summary_alternative,
        "episode_chapters": episode_chapters,
        "episode_chapters_with_short_key_points": episode_chapters_with_short_key_points,
        "episode_chapters_with_full_summaries" : episode_chapters_with_full_summaries,

    }

    return media_info

@router.get('/api/podium/clients/v1/media/{media_id}/vector', description="Returns the 768 dimension embedding vector for a media file. The returned vector is not L2 normalized.", tags=["Media"], response_model=EmbeddingVector)
async def get_media_vector(media_id: str, api_key: str = Depends(auth_scheme)) -> EmbeddingVector:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_package = app.core.data_models.PodiumPackage \
        .where('guid', media_id) \
        .where('user_id', user.id) \
        .where('is_deleted', False) \
        .select('id') \
        .first()

    if not podium_package:
        raise HTTPException(status_code=404, detail="Media not found")

    vector = app.core.data_models.PodiumPackageVector \
        .where('podium_package_id', podium_package.id) \
        .first()

    if not vector:
        raise HTTPException(status_code=404, detail="Vector not found")

    return EmbeddingVector(embedding_vector=vector.vector)

@router.get('/api/podium/clients/v1/media/{media_id}/transcript', description="Returns the AI generated transcript for a media file", tags=["Media"], response_model=MediaTranscript)
async def get_media_transcript(media_id: str, api_key: str = Depends(auth_scheme)) -> MediaTranscript:
    # print("here")
    # print(api_key.credentials)
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials, allow_media_tokens=True, requested_media_id=media_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_package = app.core.data_models.PodiumPackage \
        .where('guid', media_id) \
        .where('user_id', user.id) \
        .where('is_deleted', False) \
        .select('id') \
        .first()
    if not podium_package:
        raise HTTPException(status_code=404, detail="Media not found")

    transcript_file = app.core.data_models.PodiumPackageTranscriptFile \
        .where('podium_package_id', podium_package.id) \
        .select('id', 'guid', 's3_bucket', 's3_key') \
        .first()

    if not transcript_file:
        raise HTTPException(status_code=404, detail="Transcript not found")

    cached_transcript_data = app.core.cache.get(transcript_file.guid, cache="transcripts")

    if cached_transcript_data is not None:
        transcript = orjson.loads(cached_transcript_data)
        transcript_file.content = transcript
    else:
        transcript_file.load_content()
        transcript_file.cache_transcript()

    media_transcript = transcript_file.get_transcript_with_speakers()
    media_transcript = transcript_file.apply_speaker_edits(media_transcript)
    # media_transcript = transcript_file.apply_edits(media_transcript)
        
    # TODO: Remove these deprecated fields
    # for monologue in media_transcript['monologues']:
    #     for element in monologue['elements']:
    #         element['start_seconds'] = element['start']
    #         element['end_seconds'] = element['end']

    #return media_transcript
    return ORJSONResponse(media_transcript)

@router.post('/api/podium/clients/v1/media/{media_id}/transcript/edits', description="Saves edits for a media transcript", tags=["Media"], include_in_schema=False)
async def save_media_transcript_edits(request: Request, media_id: str, api_key: str = Depends(auth_scheme)):
    edits = await request.json()
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials, allow_media_tokens=True, requested_media_id=media_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_package = app.core.data_models.PodiumPackage \
        .where('guid', media_id) \
        .where('user_id', user.id) \
        .where('is_deleted', False) \
        .select('id') \
        .first()
    if not podium_package:
        raise HTTPException(status_code=404, detail="Media not found")

    transcript_file = app.core.data_models.PodiumPackageTranscriptFile \
        .where('podium_package_id', podium_package.id) \
        .select('id', 'guid', 's3_bucket', 's3_key') \
        .first()

    if not transcript_file:
        raise HTTPException(status_code=404, detail="Transcript not found")

    if len(edits) == 0:
        return

    last_edit = app.core.data_models.PodiumPackageTranscriptFileEdit \
        .where('podium_package_transcript_file_id', transcript_file.id) \
        .order_by('id', 'desc') \
        .first()

    if last_edit and last_edit.monologue_index == edits[0]['monologueIndex'] and last_edit.element_index == edits[0]['elementIndex'] and last_edit.type == 'update':
        last_edit.delete()

    for edit in edits:
        transcriptFileEdit = app.core.data_models.PodiumPackageTranscriptFileEdit()
        transcriptFileEdit.podium_package_transcript_file_id = transcript_file.id
        transcriptFileEdit.type = edit['type']
        transcriptFileEdit.monologue_index = edit['monologueIndex']
        transcriptFileEdit.element_index = edit['elementIndex']
        transcriptFileEdit.value = edit['value']
        if 'elementType' in edit:
            transcriptFileEdit.element_type = edit['elementType']
        if 'start' in edit:
            transcriptFileEdit.start = edit['start']
        if 'end' in edit:
            transcriptFileEdit.end = edit['end']
        transcriptFileEdit.save()
        edit['id'] = transcriptFileEdit.id

    return edits


class ChangeSpeaker(BaseModel):
    speaker_id: str = Field(
        description="The id of the speaker to change.",
        example="1f586e65-e81d-4801-8a5b-10470a6a076e"
    )
    new_speaker_id: str = Field(
        description="The id of the new speaker.",
        example="2c586e65-e81d-9801-8a5b-10470a6a0e76"
    )
    monologue_index: Optional[int] = Field(
        description="The index of the monologue to change the speaker for.",
        example=0
    )

#change speaker for transcript
@router.post('/api/podium/clients/v1/media/{media_id}/transcript/speakers/change', description="Changes the speaker for a media transcript element", tags=["Media"], response_model=Speaker)
async def change_transcript_speaker(request: Request, media_id: str, api_key: str = Depends(auth_scheme)):
    speakers = await request.json()
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials, allow_media_tokens=True, requested_media_id=media_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_package = app.core.data_models.PodiumPackage \
        .where('guid', media_id) \
        .where('user_id', user.id) \
        .where('is_deleted', False) \
        .select('id') \
        .first()
    if not podium_package:
        raise HTTPException(status_code=404, detail="Media not found")

    transcript_file = app.core.data_models.PodiumPackageTranscriptFile \
        .where('podium_package_id', podium_package.id) \
        .select('id', 'guid', 's3_bucket', 's3_key') \
        .first()

    if not transcript_file:
        raise HTTPException(status_code=404, detail="Transcript not found")
    
    print(speakers)
    
    if len(speakers) == 0:
        return
    
    for speaker in speakers:
        speaker_monologue_index = speaker.get('monologue_index',None)
        speaker_new_speaker_id = speaker.get('new_speaker_id',None)
        speaker_old_speaker_id = speaker.get('speaker_id',None)
        transcriptFileSpeakerEdit = app.core.data_models.PodiumPackageTranscriptMonologueSpeakerEdit()
        transcriptFileSpeakerEdit.podium_package_transcript_file_id = transcript_file.id
        if speaker_monologue_index is not None:
            transcriptFileSpeakerEdit.type = 'speaker'
            transcriptFileSpeakerEdit.monologue_index = speaker_monologue_index
            transcriptFileSpeakerEdit.new_speaker_id = speaker_new_speaker_id
            transcriptFileSpeakerEdit.start_eindex = None
            transcriptFileSpeakerEdit.end_eindex = None
            transcriptFileSpeakerEdit.old_speaker_id = None


            # transcript_file.change_speaker_for_monologue(speaker.speaker_id, speaker_new_speaker_id, speaker.monologue_index)
        else:
            transcriptFileSpeakerEdit.type = 'speaker'
            transcriptFileSpeakerEdit.new_speaker_id = speaker_new_speaker_id
            transcriptFileSpeakerEdit.old_speaker_id = speaker_old_speaker_id
            transcriptFileSpeakerEdit.monologue_index = None
            transcriptFileSpeakerEdit.start_eindex = None
            transcriptFileSpeakerEdit.end_eindex = None


    #     # transcript_file.change_speaker_for_monologue(speaker.speaker_id, speaker.new_speaker_id)
        transcriptFileSpeakerEdit.save()
    
    
    cached_transcript_data = app.core.cache.get(transcript_file.guid, cache="transcripts")

    if cached_transcript_data is not None:
        transcript = orjson.loads(cached_transcript_data)
        transcript_file.content = transcript
    else:
        transcript_file.load_content()
        transcript_file.cache_transcript()

    media_transcript = transcript_file.get_transcript_with_speakers()

    # media_transcript = transcript_file.apply_edits(media_transcript)
    media_transcript = transcript_file.apply_speaker_edits(media_transcript)

  
    return ORJSONResponse(media_transcript)

class SplitTranscriptSpeaker(BaseModel):
    speaker_id: str = Field(
        description="The id of the speaker to split.",
        example="1f586e65-e81d-4801-8a5b-10470a6a076e"
    )
    monologue_index : int = Field(
        description="The index of the monologue to split.",
        example=0
    )
    start : int = Field(
        description="The start index of the element to split.",
        example=0
    )
    end : int = Field(
        description="The end index of the element to split.",
        example=1
    )


        

#split transcript and change speaker
@router.post('/api/podium/clients/v1/media/{media_id}/transcript/speakers/split', description="Splits a media transcript element and changes the speaker for the new element", tags=["Media"], response_model=Speaker)
async def split_transcript_and_change_speaker(media_id: str, speaker: SplitTranscriptSpeaker, api_key: str = Depends(auth_scheme)) -> Speaker:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials, allow_media_tokens=True, requested_media_id=media_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_package = app.core.data_models.PodiumPackage \
        .where('guid', media_id) \
        .where('user_id', user.id) \
        .where('is_deleted', False) \
        .select('id') \
        .first()
    if not podium_package:
        raise HTTPException(status_code=404, detail="Media not found")

    transcript_file = app.core.data_models.PodiumPackageTranscriptFile \
        .where('podium_package_id', podium_package.id) \
        .select('id', 'guid', 's3_bucket', 's3_key') \
        .first()

    if not transcript_file:
        raise HTTPException(status_code=404, detail="Transcript not found")
    
    db_speaker = app.core.data_models.PodiumPackageTranscriptFileSpeaker \
        .where('guid', speaker.speaker_id) \
        .first()
    
    if not db_speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")
    
    cached_transcript_data = app.core.cache.get(transcript_file.guid, cache="transcripts")

    if cached_transcript_data is not None:
        transcript = orjson.loads(cached_transcript_data)
        transcript_file.content = transcript
    else:
        transcript_file.load_content()
        transcript_file.cache_transcript()
    transcriptFileEdit_id = None
    try:
        media_trans = transcript_file.apply_speaker_edits(transcript_file.get_transcript_with_speakers())
        if speaker.monologue_index is not None:
            try:
                if(media_trans['monologues'][speaker.monologue_index]['elements'][speaker.end+1]['value'] == ' '):
                    transcriptFileEdit = app.core.data_models.PodiumPackageTranscriptFileEdit()
                    transcriptFileEdit.podium_package_transcript_file_id = transcript_file.id
                    transcriptFileEdit.type = 'delete'
                    transcriptFileEdit.monologue_index = speaker.monologue_index
                    transcriptFileEdit.element_index = speaker.end+1
                    transcriptFileEdit.value = ' '
                    transcriptFileEdit.start = media_trans['monologues'][speaker.monologue_index]['elements'][speaker.end+1]['start']
                    transcriptFileEdit.end = media_trans['monologues'][speaker.monologue_index]['elements'][speaker.end+1]['end']
                    transcriptFileEdit.element_type = 'punct'
                    transcriptFileEdit.save()
                    transcriptFileEdit_id = transcriptFileEdit.id
            except Exception as e:
                transcriptFileEdit_id = None

        
            transcriptFileSpeakerEdit = app.core.data_models.PodiumPackageTranscriptMonologueSpeakerEdit()
            transcriptFileSpeakerEdit.podium_package_transcript_file_id = transcript_file.id
            transcriptFileSpeakerEdit.type = 'monologue_split'
            transcriptFileSpeakerEdit.monologue_index = speaker.monologue_index 
            transcriptFileSpeakerEdit.start_eindex = speaker.start
            transcriptFileSpeakerEdit.end_eindex = speaker.end
            transcriptFileSpeakerEdit.new_speaker_id = speaker.speaker_id
            transcriptFileSpeakerEdit.old_speaker_id = None
            transcriptFileSpeakerEdit.save()
        else:
            raise HTTPException(status_code=400, detail="Monologue index not found")
            
    except Exception as e:
        # print('error '+str(e))
        if transcriptFileEdit_id is not None:
            app.core.data_models.PodiumPackageTranscriptFile \
            .where('id', transcriptFileEdit_id) \
            .delete()
        
        raise HTTPException(status_code=500, detail="Error "+str(e))
    

    cached_transcript_data = app.core.cache.get(transcript_file.guid, cache="transcripts")

    if cached_transcript_data is not None:
        transcript = orjson.loads(cached_transcript_data)
        transcript_file.content = transcript
    else:
        transcript_file.load_content()
        transcript_file.cache_transcript()



    media_transcript = transcript_file.get_transcript_with_speakers()
    media_transcript = transcript_file.apply_speaker_edits(media_transcript)
    return ORJSONResponse(media_transcript)

  
    # return ORJSONResponse({"message":"success"})

## merge transcript
class MergeTranscriptSpeaker(BaseModel):
    monologue_index : int = Field(
        description="The index of the monologue to merge.",
        example=0
    )

@router.post('/api/podium/clients/v1/media/{media_id}/transcript/speakers/merge', description="Merges a media transcript element with the previous element and changes the speaker for the new element", tags=["Media"], response_model=Speaker)
async def merge_transcript_and_change_speaker(media_id: str, speaker: MergeTranscriptSpeaker, api_key: str = Depends(auth_scheme)) -> Speaker:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials, allow_media_tokens=True, requested_media_id=media_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_package = app.core.data_models.PodiumPackage \
        .where('guid', media_id) \
        .where('user_id', user.id) \
        .where('is_deleted', False) \
        .select('id') \
        .first()
    if not podium_package:
        raise HTTPException(status_code=404, detail="Media not found")

    transcript_file = app.core.data_models.PodiumPackageTranscriptFile \
        .where('podium_package_id', podium_package.id) \
        .select('id', 'guid', 's3_bucket', 's3_key') \
        .first()

    if not transcript_file:
        raise HTTPException(status_code=404, detail="Transcript not found")
    
    if speaker.monologue_index == 0:
        raise HTTPException(status_code=400, detail="Cannot merge the first monologue")
    try:
        if speaker.monologue_index is not None:        
            transcriptFileSpeakerEdit = app.core.data_models.PodiumPackageTranscriptMonologueSpeakerEdit()
            transcriptFileSpeakerEdit.podium_package_transcript_file_id = transcript_file.id
            transcriptFileSpeakerEdit.type = 'monologue_merge'
            transcriptFileSpeakerEdit.monologue_index = speaker.monologue_index 
            transcriptFileSpeakerEdit.start_eindex = None
            transcriptFileSpeakerEdit.end_eindex = None
            transcriptFileSpeakerEdit.new_speaker_id = None
            transcriptFileSpeakerEdit.old_speaker_id = None
            transcriptFileSpeakerEdit.save()
        else:
            raise HTTPException(status_code=400, detail="Monologue index not found")
            
    except Exception as e:
        
        raise HTTPException(status_code=500, detail="Error "+str(e))
    
    return ORJSONResponse({"message":"success"})



@router.delete('/api/podium/clients/v1/media/{media_id}/delete', description="Deletes a media file.", tags=["Media"], response_model=None)
async def delete_media(media_id: str, api_key: str = Depends(auth_scheme)) -> None:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials, allow_media_tokens=True, requested_media_id=media_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_package = app.core.data_models.PodiumPackage \
        .where('guid', media_id) \
        .where('user_id', user.id) \
        .where('is_deleted', False) \
        .first()

    if not podium_package:
        raise HTTPException(status_code=404, detail="Media not found")

    podium_package.is_deleted = True
    podium_package.save()

    return None


@router.get('/api/podium/clients/v1/user/client-media-editor/configs', description="Returns the client media editor configuration for a user", tags=["User"], include_in_schema=False)
async def get_user_client_media_editor_configs(api_key: str = Depends(auth_scheme)):
    # print("here yo")
    # print(api_key.credentials)
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials, allow_media_tokens=True)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    db_user_client_media_editor_configs = app.core.data_models.PodiumUserClientMediaEditorConfig \
        .where('podium_user_id', user.id) \
        .get()

    user_client_media_editor_configs = {}
    for db_user_client_media_editor_config in db_user_client_media_editor_configs:
        user_client_media_editor_configs[db_user_client_media_editor_config.key] = db_user_client_media_editor_config.value

    return user_client_media_editor_configs


class MediaAssetCreate(BaseModel):
    type: str = Field(
        description="The type of the asset. Can be 'document'.",
        example="document"
    )
    format:str=Field(
        description="The format of the asset. can be text",
        example="pdf"
    )
    title: Optional[str] = Field(
        description="The title of the asset.",
        example="Document Title"
    )
    content: Optional[str] = Field(
        description="The content of the asset.",
        example="Document Content"
    )
    start_seconds: Optional[float] = Field(
        description="The start time in seconds of the asset in the media file.",
        example=0.0
    )
    end_seconds: Optional[float] = Field(
        description="The end time in seconds of the asset in the media file.",
        example=10.0
    )

#create new asset
@router.post('/api/podium/clients/v1/media/{media_id}/asset/create', description="Creates a new asset for a media file", tags=["Media"], response_model=MediaAsset)
async def create_media_asset(media_id: str, media_asset_create: MediaAssetCreate, api_key: str = Depends(auth_scheme)) -> MediaAsset:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_package = app.core.data_models.PodiumPackage \
        .where('guid', media_id) \
        .where('user_id', user.id) \
        .where('is_deleted', False) \
        .select('id') \
        .first()
    if not podium_package:
        raise HTTPException(status_code=404, detail="Media not found")

    asset = app.core.data_models.PodiumPackageAsset()
    asset.guid = str(uuid.uuid4())
    asset.podium_package_id = podium_package.id
    asset.type = media_asset_create.type
    asset.format = media_asset_create.format
    asset.title = media_asset_create.title
    asset.content = media_asset_create.content
    asset.start_seconds = media_asset_create.start_seconds
    asset.end_seconds = media_asset_create.end_seconds
    asset.accepted_variant = False
    asset.save()

    return MediaAsset.convert(asset)

@router.get('/api/podium/clients/v1/media/{media_id}/assets', description="Returns the AI generated assets for a media file", tags=["Media"], response_model=List[MediaAsset])
async def get_media_assets(media_id: str, api_key: str = Depends(auth_scheme)) -> List[MediaAsset]:
    print("asjhbdi")
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_package = app.core.data_models.PodiumPackage \
        .where('guid', media_id) \
        .where('user_id', user.id) \
        .where('is_deleted', False) \
        .select('id') \
        .first()
    if not podium_package:
        raise HTTPException(status_code=404, detail="Media not found")

    package_assets = app.core.data_models.PodiumPackageAsset \
        .with_({'podium_package_preview': app.core.data_models.PodiumPackagePreview.query().select('id', 'type', 'score')}) \
        .where('podium_package_id', podium_package.id) \
        .order_by('type') \
        .order_by('start_seconds') \
        .order_by('id', 'desc') \
        .get()
    
    #remove from package_assets if type is document and content = ''
    package_assets = [asset for asset in package_assets if not (asset.type == 'document' and asset.content == '')]
    media_assest = MediaAsset.convert_list(package_assets)

    return media_assest

@router.get('/api/podium/clients/v1/media/asset/{asset_id}', description="Returns an AI generated asset for a media file", tags=["Media"], response_model=MediaAsset)
async def get_media_asset(asset_id: str, api_key: str = Depends(auth_scheme)) -> MediaAsset:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    asset = app.core.data_models.PodiumPackageAsset \
        .where('guid', asset_id) \
        .first()
    print("asset",asset.editor_content_json)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    podium_package = app.core.data_models.PodiumPackage \
        .where('id', asset.podium_package_id) \
        .where('user_id', user.id) \
        .where('is_deleted', False) \
        .select('id') \
        .first()
    if not podium_package:
        raise HTTPException(status_code=404, detail="Invalid media")

    asset_variations = app.core.data_models.PodiumPackageAsset \
        .where('parent_id', asset.id) \
        .get()

    converted_asset_variations = []
    for asset_variation in asset_variations:
        converted_asset_variations.append(MediaAssetVariation.convert(asset_variation, parent_asset_id=asset.guid))


    return MediaAsset.convert(asset, converted_asset_variations)

@router.post('/api/podium/clients/v1/media/asset/{asset_id}/update', description="Updates an asset for a media file", tags=["Media"], response_model=MediaAsset)
async def update_media_asset(asset_id: str, media_asset_update: MediaAssetUpdate, api_key: str = Depends(auth_scheme)) -> MediaAsset:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    asset = app.core.data_models.PodiumPackageAsset \
        .where('guid', asset_id) \
        .first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")  
    
    if media_asset_update.accepted_variant is not None:
        asset.accepted_variant = media_asset_update.accepted_variant
    if media_asset_update.title is not None:
        asset.title = media_asset_update.title
    if media_asset_update.content is not None:
        asset.content = media_asset_update.content
    if media_asset_update.start_seconds is not None:
        asset.start_seconds = media_asset_update.start_seconds
    if media_asset_update.end_seconds is not None:
        asset.end_seconds = media_asset_update.end_seconds

    if asset.type == 'show_notes_summary':
        if media_asset_update.editor_content_json is not None:
            asset.editor_content_json = json.dumps(media_asset_update.editor_content_json)
        if media_asset_update.editor_content_text is not None:
            rtf_content = pypandoc.convert_text(media_asset_update.editor_content_text, 'rtf', format='html')
            shownotes_text_file = r"{\rtf1\ansi\ansicpg1252\deff0\nouicompat{\fonttbl{\f0\fnil\fcharset0 Calibri;}}\viewkind4\uc1"   
            # markdown_text = f"{{ {rtf_content} }}"
            markdown_text = f"{shownotes_text_file} {rtf_content}}}" 
            print("markdown_text",markdown_text)
            asset.editor_content_text = markdown_text
        if media_asset_update.updated_content is not None:
            asset.updated_content = json.dumps(media_asset_update.updated_content)
        if media_asset_update.content_text is not None:
            asset.content_text = media_asset_update.content_text

    asset.save()

    asset_variations = app.core.data_models.PodiumPackageAsset \
        .where('parent_id', asset.id) \
        .get()

    converted_asset_variations = []

    for asset_variation in asset_variations:
        converted_asset_variations.append(MediaAssetVariation.convert(asset_variation, parent_asset_id=asset.guid))

    return MediaAsset.convert(asset, converted_asset_variations)

@router.delete('/api/podium/clients/v1/media/asset/{asset_id}/delete', description="Deletes a media asset.", tags=["Media"], response_model=None)
async def delete_media_asset(asset_id: str, api_key: str = Depends(auth_scheme)) -> None:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials, allow_media_tokens=True)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    asset = app.core.data_models.PodiumPackageAsset \
        .where('guid', asset_id) \
        .first()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    podium_package = app.core.data_models.PodiumPackage \
        .where('id', asset.podium_package_id) \
        .where('user_id', user.id) \
        .where('is_deleted', False) \
        .first()

    if not podium_package:
        raise HTTPException(status_code=404, detail="Media not found")

    if asset.type == 'highlight':
        podium_clip = app.core.data_models.PodiumClipProps.where('podium_clip_assest_id',asset.id).first()
        podium_clip.delete()

    asset.delete()

    return None


#custom prompts
class CustomPrompt(BaseModel):
    id:Optional[int] = Field(
        description="The id of the custom prompt.",
        example="1f586e65-e81d-4801-8a5b-10470a6a076e"
    )
    title: str = Field(
        description="The title of the custom prompt.",
        example="Custom Prompt Title"
    )
    content: str = Field(
        description="The content of the custom prompt.",
        example="Custom Prompt Content"
    )
    type : Optional[str] = Field(
        description="The type of the custom prompt.",
        example="podium_gpt"
    )



@router.post('/api/podium/clients/v1/custom-prompt/create', description="Creates a new custom prompt", tags=["Custom Prompts"], response_model=CustomPrompt)
async def create_custom_prompt(custom_prompt: CustomPrompt, api_key: str = Depends(auth_scheme)) -> CustomPrompt:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    if custom_prompt.type is None:
        custom_prompt.type = 'podium_gpt'

    db_custom_prompt = app.core.data_models.PodiumCustomPrompt()
    db_custom_prompt.podium_user_id = user.id
    db_custom_prompt.title = custom_prompt.title
    db_custom_prompt.content = custom_prompt.content
    db_custom_prompt.type = custom_prompt.type
    db_custom_prompt.save()

    return CustomPrompt(
        id= db_custom_prompt.id,
        title=db_custom_prompt.title,
        content=db_custom_prompt.content,
        type = db_custom_prompt.type
    )

@router.get('/api/podium/clients/v1/custom-prompts', description="Returns a list of custom prompts for a user", tags=["Custom Prompts"], response_model=List[CustomPrompt])
async def get_custom_prompts(api_key: str = Depends(auth_scheme)) -> List[CustomPrompt]:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    db_custom_prompts = app.core.data_models.PodiumCustomPrompt \
        .where('podium_user_id', user.id) \
        .get()

    custom_prompts = []
    for db_custom_prompt in db_custom_prompts:
        custom_prompts.append(CustomPrompt(
            id= db_custom_prompt.id,
            title=db_custom_prompt.title,
            content=db_custom_prompt.content,
            type = db_custom_prompt.type
        ))

    return custom_prompts

@router.delete('/api/podium/clients/v1/custom-prompt/{custom_prompt_id}/delete', description="Deletes a custom prompt.", tags=["Custom Prompts"], response_model=None)
async def delete_custom_prompt(custom_prompt_id: str, api_key: str = Depends(auth_scheme)) -> None:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    db_custom_prompt = app.core.data_models.PodiumCustomPrompt \
        .where('id', custom_prompt_id) \
        .where('podium_user_id', user.id) \
        .first()

    if not db_custom_prompt:
        raise HTTPException(status_code=404, detail="Custom prompt not found")

    db_custom_prompt.delete()

    return None

@router.post('/api/podium/clients/v1/custom-prompt/{custom_prompt_id}/update', description="Updates a custom prompt", tags=["Custom Prompts"], response_model=CustomPrompt)
async def update_custom_prompt(custom_prompt_id: str, custom_prompt: CustomPrompt, api_key: str = Depends(auth_scheme)) -> CustomPrompt:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    db_custom_prompt = app.core.data_models.PodiumCustomPrompt \
        .where('id', custom_prompt_id) \
        .where('podium_user_id', user.id) \
        .first()

    if not db_custom_prompt:
        raise HTTPException(status_code=404, detail="Custom prompt not found")
    if custom_prompt.title is None or custom_prompt.content is None:
        raise HTTPException(status_code=400, detail="Title and content are required")
    db_custom_prompt.title = custom_prompt.title
    db_custom_prompt.content = custom_prompt.content
    db_custom_prompt.save()

    return CustomPrompt(
        id = db_custom_prompt.id,
        title=db_custom_prompt.title,
        content=db_custom_prompt.content,
        type = db_custom_prompt.type
    )

#detail view custom prompt
@router.get('/api/podium/clients/v1/custom-prompt/{custom_prompt_id}', description="Returns a custom prompt", tags=["Custom Prompts"], response_model=CustomPrompt)
async def get_custom_prompt(custom_prompt_id: str, api_key: str = Depends(auth_scheme)) -> CustomPrompt:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    db_custom_prompt = app.core.data_models.PodiumCustomPrompt \
        .where('id', custom_prompt_id) \
        .where('podium_user_id', user.id) \
        .first()
    
    if not db_custom_prompt:
        raise HTTPException(status_code=404, detail="Custom prompt not found")
    
    return CustomPrompt(
        id = db_custom_prompt.id,
        title=db_custom_prompt.title,
        content=db_custom_prompt.content,
        type = db_custom_prompt.type
    )

class Tuning(BaseModel):
    prompt: str = Field(
        description="The tuning instructions."
    )
    content: str = Field(
        description="The content to tune."
    )

@router.post('/api/podium/clients/v1/media/asset/{asset_id}/tuning/generate/stream', tags=["AI Models"], description="Generates a new tuning for a supplied prompt and content based on an existing media asset.", include_in_schema=False)
async def generate_tuning_stream(asset_id: str, tuning: Tuning, api_key: str = Depends(auth_scheme)):
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    asset = app.core.data_models.PodiumPackageAsset \
        .where('guid', asset_id) \
        .first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    return EventSourceResponse(asset.generate_tuning_stream(tuning.prompt, tuning.content))

@router.get('/api/podium/clients/v1/media/asset/{asset_id}/vector', description="Returns the 768 dimension embedding vector for an asset, if the asset has one. The returned vector is not L2 normalized.", tags=["Media"], response_model=EmbeddingVector)
async def get_media_asset_vector(asset_id: str, api_key: str = Depends(auth_scheme)) -> EmbeddingVector:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    vector = []

    asset = app.core.data_models.PodiumPackageAsset \
        .where('guid', asset_id) \
        .first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    podium_package = app.core.data_models.PodiumPackage \
        .where('id', asset.podium_package_id) \
        .where('user_id', user.id) \
        .where('is_deleted', False) \
        .select('id') \
        .first()
    if not podium_package:
        raise HTTPException(status_code=404, detail="Invalid media")

    if asset.type == "chapter":
        chapter_vector = app.core.data_models.PodiumPackageChapterVector \
            .where('podium_package_chapter_id', asset.podium_package_chapter_id) \
            .first()
        if not chapter_vector:
            raise HTTPException(status_code=404, detail="Asset vector not found")

        vector = chapter_vector.vector
    elif asset.type == "highlight":
        preview = app.core.data_models.PodiumPackagePreview \
            .where('id', asset.podium_package_preview_id) \
            .first()
        if not preview:
            raise HTTPException(status_code=404, detail="Asset vector not found")

        vector = preview.embedding_vector

    return EmbeddingVector(embedding_vector=vector)


    

@router.post('/api/podium/clients/v1/project/create', description="Creates a new project", tags=["Projects"], response_model=ProjectInfo)
async def create_project(  
    name: str = Form(...),  
    description: Optional[str] = Form(None),
    podcast_rss_url: Optional[str] = Form(None),
    youtube_channel_url: Optional[str] = Form(None), 
    image: Optional[UploadFile] = File(None) ,
    content_type: Optional[str] = Form(None),
    api_key: str = Depends(auth_scheme)
    
    ) -> ProjectInfo:
    
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # ensure project name is unique
    project_exists = app.core.data_models.PodiumProject \
        .where('name', name) \
        .where('podium_user_id', user.id) \
        .where('is_deleted', False) \
        .exists()

    if project_exists:
        raise HTTPException(status_code=409, detail="Project name already exists")

    s3_url = None
    if content_type:
        content_type = content_type.lower().replace(" ", "_")

    # create project
    podium_project = app.core.data_models.PodiumProject()
    podium_project.name = name
    podium_project.description = description
    podium_project.image_url = s3_url
    podium_project.podcast_rss_url = podcast_rss_url
    podium_project.youtube_channel_url = youtube_channel_url
    podium_project.podium_user_id = user.id
    podium_project.content_type = content_type
    podium_project.save()

    podium_project_new = app.core.data_models.PodiumProject \
        .where('id', podium_project.id) \
        .first()
    
    print(podium_project_new.guid)
    if image:
        s3_url,s3_path = upload_image_to_s3(image,podium_project_new.guid)
        podium_project.image_url = s3_url
        podium_project.save()
        
    podium_project = podium_project.fresh()

    podcast_id = None
    if podium_project.podcast_id:
        podcast = app.core.data_models.Podcast \
            .where('id', podium_project.podcast_id) \
            .select('guid') \
            .first()
        if podcast:
            podcast_id = podcast.guid

    return ProjectInfo(
        id=podium_project.guid,
        name=podium_project.name,
        description=podium_project.description,
        image_url=podium_project.image_url,
        podcast_rss_url=podium_project.podcast_rss_url,
        youtube_channel_url=podium_project.youtube_channel_url,
        podcast_id = podcast_id,
        content_type = content_type,
        created_at=podium_project.created_at,
        updated_at=podium_project.updated_at,
        latest_media_uploaded_at=None,
        media_count=0
    )

@router.post('/api/podium/clients/v1/project/{project_id}/update', description="Updates a project project", tags=["Projects"], response_model=ProjectInfo)
async def update_project(
    project_id: str, 
    name: str = Form(...),  
    description: Optional[str] = Form(None),
    podcast_rss_url: Optional[str] = Form(None),
    youtube_channel_url: Optional[str] = Form(None), 
    image_url: Optional[str] = Form(None), 
    content_type: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None) ,

    api_key: str = Depends(auth_scheme)
    
    ) -> ProjectInfo:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # get project
    podium_project = app.core.data_models.PodiumProject \
        .where('guid', project_id) \
        .where('podium_user_id', user.id) \
        .where('is_deleted', False) \
        .first()
    print("################################")
    if not podium_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # ensure project name is unique
    project_with_same_name = app.core.data_models.PodiumProject \
        .where('name', name) \
        .where('podium_user_id', user.id) \
        .where('is_deleted', False) \
        .where('guid', '!=', project_id) \
        .first()

    if project_with_same_name:
        raise HTTPException(status_code=409, detail="Project name already exists")

    if image:
        if podium_project.image_url:
            delete_image_from_s3(podium_project.image_url)
        image_url,s3_path = upload_image_to_s3(image,podium_project.guid)
    # update project
    podium_project.name = name
    podium_project.description = description
    podium_project.image_url = image_url
    podium_project.podcast_rss_url = podcast_rss_url
    podium_project.youtube_channel_url = youtube_channel_url
    podium_project.content_type = content_type
    podium_project.save()

    podium_project = podium_project.fresh()

    podcast_id = None
    if podium_project.podcast_id:
        podcast = app.core.data_models.Podcast \
            .where('id', podium_project.podcast_id) \
            .select('guid') \
            .first()
        if podcast:
            podcast_id = podcast.guid

    latest_media_uploaded_at = app.core.data_models.PodiumPackage \
        .where('podium_project_id', podium_project.id) \
        .where('is_deleted', False) \
        .max('created_at')
    
    media_count = app.core.data_models.PodiumPackage \
        .where('podium_project_id', podium_project.id) \
        .where('is_deleted', False) \
        .count()

    return ProjectInfo(
        id=podium_project.guid,
        name=podium_project.name,
        description=podium_project.description,
        image_url=podium_project.image_url,
        podcast_rss_url=podium_project.podcast_rss_url,
        youtube_channel_url=podium_project.youtube_channel_url,
        podcast_id = podcast_id,
        content_type = content_type,
        created_at=podium_project.created_at,
        updated_at=podium_project.updated_at,
        latest_media_uploaded_at=None,
        media_count=0
    )

@router.get('/api/podium/clients/v1/project/{project_id}', description="Returns a project", tags=["Projects"], response_model=ProjectInfo)
async def get_project(project_id: str, api_key: str = Depends(auth_scheme)) -> ProjectInfo:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    print("Getting project user id: {}".format(user.id))
    # get project
    podium_project = app.core.data_models.PodiumProject \
        .where('guid', project_id) \
        .where('podium_user_id', user.id) \
        .where('is_deleted', False) \
        .first()

    if not podium_project:
        raise HTTPException(status_code=404, detail="Project not found")

    podcast_id = None
    if podium_project.podcast_id:
        podcast = app.core.data_models.Podcast \
            .where('id', podium_project.podcast_id) \
            .select('guid') \
            .first()
        if podcast:
            podcast_id = podcast.guid

    latest_media_uploaded_at = app.core.data_models.PodiumPackage \
        .where('podium_project_id', podium_project.id) \
        .where('is_deleted', False) \
        .max('created_at')
    
    media_count = app.core.data_models.PodiumPackage \
        .where('podium_project_id', podium_project.id) \
        .where('is_deleted', False) \
        .count()
    
    return ProjectInfo(
        id=podium_project.guid,
        name=podium_project.name,
        description=podium_project.description,
        image_url=podium_project.image_url,
        podcast_rss_url=podium_project.podcast_rss_url,
        youtube_channel_url=podium_project.youtube_channel_url,
        podcast_id = podcast_id,
        created_at=podium_project.created_at,
        updated_at=podium_project.updated_at,
        latest_media_uploaded_at=latest_media_uploaded_at,
        media_count=media_count
    )

@router.delete('/api/podium/clients/v1/project/{project_id}/delete', description="Deletes a project", tags=["Projects"], response_model=None)
async def delete_project(project_id: str, api_key: str = Depends(auth_scheme)) -> None:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # get project
    podium_project = app.core.data_models.PodiumProject \
        .where('guid', project_id) \
        .where('podium_user_id', user.id) \
        .where('is_deleted', False) \
        .first()

    if not podium_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    podium_project.is_deleted = True
    podium_project.save()

    podium_packages = app.core.data_models.PodiumPackage \
        .where('podium_project_id', podium_project.id) \
        .where('user_id', user.id) \
        .where('is_deleted', False) \
        .get()
    
    for podium_package in podium_packages:
        podium_package.is_deleted = True
        podium_package.save()

    return None

@router.get('/api/podium/clients/v1/project/{project_id}/media/list', description="Returns a paged list of media files files for a project ordered by most recent", tags=["Media"], response_model=MediaInfoList)
async def list_media(project_id: str, page: Optional[int] = 1, page_size: Optional[int] = 10, api_key: str = Depends(auth_scheme)) -> MediaInfoList:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    if page_size > 50:
        raise HTTPException(status_code=400, detail="Page size must be less than or equal to 50")

    # get project
    podium_project = app.core.data_models.PodiumProject \
        .where('guid', project_id) \
        .where('podium_user_id', user.id) \
        .where('is_deleted', False) \
        .first()

    if not podium_project:
        raise HTTPException(status_code=404, detail="Project not found")

    total_count = app.core.data_models.PodiumPackage \
        .where('user_id', user.id) \
        .where('podium_project_id', podium_project.id) \
        .where('is_deleted', False) \
        .count()

    podium_packages = app.core.data_models.PodiumPackage \
        .with_('podium_transactions') \
        .with_('podium_package_processing_configuration') \
        .with_('process_attributes') \
        .with_('podium_package_audio_files') \
        .where('user_id', user.id) \
        .where('podium_project_id', podium_project.id) \
        .where('is_deleted', False) \
        .order_by('created_at', 'desc') \
        .paginate(page_size, page)

    media_info_list = MediaInfoList(
        page=page,
        page_size=page_size,
        total_count=total_count,
        media=[MediaInfo.from_podium_package(podium_package) for podium_package in podium_packages]
    )

    return media_info_list

@router.get('/api/podium/clients/v1/projects/list', description="Returns a paged list of projects", tags=["Projects"], response_model=ProjectInfoList)
async def list_projects(page: Optional[int] = 1, page_size: Optional[int] = 10, api_key: str = Depends(auth_scheme)) -> ProjectInfoList:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # get projects count
    total_count = app.core.data_models.PodiumProject \
        .where('podium_user_id', user.id) \
        .where('is_deleted', False) \
        .count()

    # get projects
    podium_projects = app.core.data_models.PodiumProject \
        .where('podium_user_id', user.id) \
        .where('is_deleted', False) \
        .paginate(page_size, page)

    projects = []
    for podium_project in podium_projects:
        podcast_id = None
        if podium_project.podcast_id:
            podcast = app.core.data_models.Podcast \
                .where('id', podium_project.podcast_id) \
                .select('guid') \
                .first()
            if podcast:
                podcast_id = podcast.guid

        latest_media_uploaded_at = app.core.data_models.PodiumPackage \
            .where('podium_project_id', podium_project.id) \
            .max('created_at')
    
        media_count = app.core.data_models.PodiumPackage \
            .where('podium_project_id', podium_project.id) \
            .where('is_deleted', False) \
            .count()

        projects.append(ProjectInfo(
            id=podium_project.guid,
            name=podium_project.name,
            content_type=podium_project.content_type,
            image_url=podium_project.image_url,
            podcast_rss_url=podium_project.podcast_rss_url,
            youtube_channel_url=podium_project.youtube_channel_url,
            description=podium_project.description,
            podcast_id = podcast_id,
            created_at=podium_project.created_at,
            updated_at=podium_project.updated_at,
            latest_media_uploaded_at=latest_media_uploaded_at,
            media_count=media_count
        ))

    return ProjectInfoList(
        projects=projects,
        page=page,
        page_size=page_size,
        total_count=total_count
    )

@router.get('/api/podium/clients/v1/project/{project_id}/media/list', tags=["Projects"], description="Returns a paged list of media files within a project", response_model=MediaInfoList)
async def list_project_media(project_id: str, page: Optional[int] = 1, page_size: Optional[int] = 10, api_key: str = Depends(auth_scheme)) -> MediaInfoList:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # get project
    podium_project = app.core.data_models.PodiumProject \
        .where('guid', project_id) \
        .where('podium_user_id', user.id) \
        .where('is_deleted', False) \
        .first()

    if not podium_project:
        raise HTTPException(status_code=404, detail="Project not found")

    # get media count
    total_count = app.core.data_models.PodiumPackage \
        .where('podium_project_id', podium_project.id) \
        .where('is_deleted', False) \
        .count()

    # get media
    podium_packages = app.core.data_models.PodiumPackage \
        .where('podium_project_id', podium_project.id) \
        .where('is_deleted', False) \
        .paginate(page_size, page)

    media = []
    for podium_package in podium_packages:
        media_info = MediaInfo.from_podium_package(podium_package)
        media.append(media_info)

    return MediaInfoList(
        media=media,
        page=page,
        page_size=page_size,
        total_count=total_count
    )

@router.post('/api/podium/clients/v1/models/text/embedding_vector/generate', tags=["AI Models"], description="Returns a 768 dimension embedding vector for the supplied text content that is comparable (cosine, euclidian, etc.) to all Podium media, asset, podcast, and episode vectors. The returned vector is not L2 normalized.", response_model=EmbeddingVector)
async def generate_embedding_vector(content: TextContent, api_key: str = Depends(auth_scheme)) -> EmbeddingVector:
    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    embedding_vector = await app.core.inference.text_embedding_vector(content.content)

    return EmbeddingVector(
        embedding_vector=embedding_vector
    )

@router.post('/api/podium/clients/v1/media/{media_id}/transcript/delete_monologue',include_in_schema=False)
async def transcript_delete_monologue(request: Request, media_id: str, api_key: str = Depends(auth_scheme)):

    user = app.core.data_models.PodiumUser.get_by_api_key(api_key.credentials, allow_media_tokens=True, requested_media_id=media_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    podium_package = app.core.data_models.PodiumPackage \
        .where('guid', media_id) \
        .where('user_id', user.id) \
        .where('is_deleted', False) \
        .select('id') \
        .first()
    if not podium_package:
        raise HTTPException(status_code=404, detail="Media not found")

    transcript_file = app.core.data_models.PodiumPackageTranscriptFile \
        .where('podium_package_id', podium_package.id) \
        .select('id', 'guid', 's3_bucket', 's3_key') \
        .first()


    body = await request.json()

    if (body["type"] != "monologue_delete"):
        raise HTTPException(status_code=400,detail = "Invalid type")
    transcript_monologue_edit = app.core.data_models.PodiumPackageTranscriptMonologueSpeakerEdit()
    transcript_monologue_edit.monologue_index = body["monologue_index"]
    transcript_monologue_edit.type = body["type"]
    transcript_monologue_edit.podium_package_transcript_file_id = transcript_file.id
    transcript_monologue_edit.save()

    return ORJSONResponse("Monologue deleted successfully")


def upload_image_to_s3(image: UploadFile,guid= None, folder_name: str = "projects") -> str:
    s3_client = boto3.client(
        's3',
        region_name=S3_REGION,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY
    )
    
    try:
        # Use a unique file name in the S3 bucket
        file_name = f"{folder_name}/images/{image.filename}"
        if guid:
            file_name = f"{folder_name}/images/{guid}/{image.filename}"

        s3_client.upload_fileobj(image.file, S3_BUCKET_NAME, file_name, ExtraArgs={'ACL': 'public-read'})

        # Construct the S3 URL
        s3_url = f"https://{S3_BUCKET_NAME}.s3.{S3_REGION}.amazonaws.com/{file_name}"
        return s3_url,file_name
    except NoCredentialsError:
        raise HTTPException(status_code=500, detail="AWS credentials not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")
    

def delete_image_from_s3(image_identifier: str) -> None:
    s3_client = boto3.client(
        's3',
        region_name=S3_REGION,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY
    )

    try:
        # Determine if the input is a URL or a file name
        if image_identifier.startswith("http"):
            # Extract file name from the URL
            file_name = image_identifier.split(f"https://{S3_BUCKET_NAME}.s3.{S3_REGION}.amazonaws.com/")[-1]
        else:
            # Assume it's a file name
            file_name = image_identifier

        # Delete the file from S3
        s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=file_name)

    except NoCredentialsError:
        raise HTTPException(status_code=500, detail="AWS credentials not found")
    except ClientError as e:
        if e.response['Error']['Code'] == '404':
            raise HTTPException(status_code=404, detail="File not found")
        else:
            raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")    

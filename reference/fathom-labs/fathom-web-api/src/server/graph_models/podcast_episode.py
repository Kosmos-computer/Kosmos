import app
import graphene
import math
import numpy as np
from scipy.spatial.distance import *
import asyncio


from .podcast_info import PodcastInfo
from .podcast_episode_chapter import PodcastEpisodeChapter
from .transcript import Transcript
from .highlight import Highlight, HighlightType
from .clip import Clip
from decimal import Decimal

class PodcastEpisode(graphene.ObjectType):

    internal_id = graphene.Int()
    internal_podcast_id = graphene.Int()
    guid = graphene.ID()
    title = graphene.String()
    clean_title = graphene.String()
    long_description = graphene.String()
    description = graphene.String()
    description_sentences = graphene.List(graphene.String)
    summary = graphene.String()
    subtitle = graphene.String()
    keywords = graphene.String()
    image_url = graphene.String()
    thumbnail_image_url = graphene.String()
    share_image_url = graphene.String()
    colors = graphene.List(graphene.String)
    background_color = graphene.String()
    alt_one_color = graphene.String()
    alt_two_color = graphene.String()
    alt_three_color = graphene.String()
    text_color = graphene.String()
    audio_url = graphene.String()
    rss_audio_url = graphene.String()
    transcript_audio_url = graphene.String()
    url_slug = graphene.String()
    duration = graphene.Int()
    last_position = graphene.Int()
    episode_number = graphene.Int()
    season_number = graphene.Int()
    publication_date = graphene.Date()

    podcast_info = graphene.Field(PodcastInfo)

    highlights = graphene.List(Highlight)
    chapter_clips = graphene.List(Highlight)
    clips = graphene.List(Clip)
    transcript_full = graphene.Field(Transcript)
    transcript_start = graphene.Field(Transcript)
    chapters = graphene.List(PodcastEpisodeChapter)
    similar_episodes = graphene.List(lambda: PodcastEpisode)

    def resolve_podcast_info(parent, info):
        podcast_info = None

        if not parent.podcast_info:
            podcast_info = PodcastInfo.convert(app.core.data_models.Podcast.find(parent.internal_podcast_id))
        else:
            podcast_info = parent.podcast_info

        return podcast_info

    async def resolve_chapter_clips(parent, info):
        db_podcast_episode = app.core.data_models.PodcastEpisode.find(parent.internal_id)
        db_chapter_clips = await db_podcast_episode.get_chapter_summary_clips()
        
        chapter_clips = []
        for db_chapter_clip in db_chapter_clips:
            clip = Highlight(start=db_chapter_clip['start'], end=db_chapter_clip['end'], score=db_chapter_clip['score'])
            chapter_clips.append(clip)

        #TODO: migrate to tests
        #chapter_clips = []
        #cc1 = Highlight(start=320, end=335, score=0.3)
        #cc2 = Highlight(start=620, end=630, score=0.85)
        #cc3 = Highlight(start=920, end=933, score=0.7)
        #cc4 = Highlight(start=1220, end=1231, score=0.9)
        #cc5 = Highlight(start=1520, end=1534, score=0.1)
        #
        #chapter_clips.append(cc1)
        #chapter_clips.append(cc2)
        #chapter_clips.append(cc3)
        #chapter_clips.append(cc4)
        #chapter_clips.append(cc5)

        return chapter_clips

    def resolve_similar_episodes(parent, info):
        simi_eps = []
        for db_similar_episode in app.core.data_models.SinglestorePodcastEpisodeUnitVector.get_similar_episodes(parent.internal_id):
            simi_eps.append(PodcastEpisode.convert(db_similar_episode))
        return simi_eps

    @staticmethod
    def convert(db_podcast_episode, highlights=None, user_taste_vector=None, clips=None, fast=False, fields=None):
        
        if db_podcast_episode == None :
            return None
        else:
            podcast_episode = PodcastEpisode()
            podcast_episode.internal_id = db_podcast_episode.id
            podcast_episode.internal_podcast_id = db_podcast_episode.podcast_id
            podcast_episode.guid = db_podcast_episode.guid
            podcast_episode.title = db_podcast_episode.title

            if not db_podcast_episode.simple_title:
                podcast_episode.clean_title = db_podcast_episode.title
            else:
                podcast_episode.clean_title = db_podcast_episode.simple_title

            podcast_episode.long_description = db_podcast_episode.description if db_podcast_episode.description else ""
            
            if db_podcast_episode.description and db_podcast_episode.description != "":
                podcast_episode.description = db_podcast_episode.description
            else:
                podcast_episode.description = db_podcast_episode.summary if db_podcast_episode.summary else ""
                
            podcast_episode.description_sentences = db_podcast_episode.description_sentences
            podcast_episode.summary = db_podcast_episode.summary if db_podcast_episode.summary else ""
            podcast_episode.subtitle = db_podcast_episode.subtitle if db_podcast_episode.subtitle else ""

            podcast_episode.keywords = podcast_episode.keywords
            podcast_episode.image_url = db_podcast_episode.image_url_cdn()
            podcast_episode.thumbnail_image_url = db_podcast_episode.thumbnail_image_url_cdn()
            podcast_episode.share_image_url = db_podcast_episode.share_image_url_cdn()


            colors = []
            if db_podcast_episode.colors is not None:
                colors = db_podcast_episode.colors
            elif 'podcast' in db_podcast_episode._relations:
                if db_podcast_episode.podcast.colors is not None:
                    colors = db_podcast_episode.podcast.colors
            podcast_episode.colors = colors

            chapters = []
            if db_podcast_episode.chapters is not None:
                chapters = db_podcast_episode.chapters
            podcast_episode.chapters = chapters

            background_color = db_podcast_episode.get_background_color()
            if background_color is not None:
                background_color = db_podcast_episode.get_background_color()
                podcast_episode.background_color = f"{background_color['rgb_color'][0]},{background_color['rgb_color'][1]},{background_color['rgb_color'][2]}"
                podcast_episode.alt_one_color = f"{background_color['alt_one_rgb_color'][0]},{background_color['alt_one_rgb_color'][1]},{background_color['alt_one_rgb_color'][2]}"
                podcast_episode.alt_two_color = f"{background_color['alt_two_rgb_color'][0]},{background_color['alt_two_rgb_color'][1]},{background_color['alt_two_rgb_color'][2]}"
                podcast_episode.alt_three_color = f"{background_color['alt_three_rgb_color'][0]},{background_color['alt_three_rgb_color'][1]},{background_color['alt_three_rgb_color'][2]}"
                podcast_episode.text_color = f"{background_color['text_rgb_color'][0]},{background_color['text_rgb_color'][1]},{background_color['text_rgb_color'][2]}"

            podcast_episode.audio_url = db_podcast_episode.audio_url_cdn()
            podcast_episode.rss_audio_url = db_podcast_episode.rss_audio_url
            podcast_episode.transcript_audio_url = db_podcast_episode.audio_url_cdn()

            if db_podcast_episode.duration:
                podcast_episode.duration = db_podcast_episode.duration
            else:
                podcast_episode.duration = 5432

            podcast_episode.last_position = 0
            if ('last_position' in db_podcast_episode._attributes):
                podcast_episode.last_position = db_podcast_episode.last_position
            podcast_episode.episode_number = db_podcast_episode.episode_number
            podcast_episode.season_number = db_podcast_episode.season_number
            podcast_episode.publication_date = db_podcast_episode.publication_date

            if clips and len(clips) > 0:
                podcast_episode.clips = clips

            # hydrate transcripts
            if fields is None or app.query_contains(fields, "transcript"):
                db_transcript = db_podcast_episode.transcript_file()
                if db_transcript and db_transcript.compressed_transcript is not None:
                    podcast_episode.transcript_full = Transcript.convert(db_transcript)
                    podcast_episode.transcript_start = podcast_episode.transcript_full.get_transcript_start()

            # hydrate highlights
            default_highlight_types = ['default']
            podcast_episode.highlights = []
            
            if fields is None or app.query_contains(fields, "highlight"):
                if highlights and len(highlights) > 0:
                    podcast_episode.highlights = highlights
                elif fast and 'previews' in db_podcast_episode._relations:
                    highlights = []

                    # Min and Max starts
                    duration = 0
                    if podcast_episode.duration is not None:
                        duration = podcast_episode.duration

                    edge_percent_seconds = duration * 0.05
                    min_start = edge_percent_seconds
                    max_start = duration - edge_percent_seconds

                    for preview in db_podcast_episode.previews:
                        if preview.type not in default_highlight_types and ((preview.start > min_start and preview.start < max_start) or duration == 0):
                            highlight = Highlight()
                            highlight.start = preview.start                        
                            if preview.title is not None:
                                highlight.end = preview.end
                            else:
                                highlight.end = preview.start + 40
                            highlight.title = preview.title if preview.title is not None else 'Highlight'
                            highlight.snippet = preview.highlight
                            highlight.context = ''
                            highlight.type = HighlightType.PREVIEW
                            highlight.origin = preview.type
                            highlight.url_slug = f"_H_{preview.id}_"
                            highlights.append(highlight)

                    podcast_episode.highlights = highlights[:3]
                elif 'previews' in db_podcast_episode._relations and len(db_podcast_episode.previews) > 0:
                    # Min and Max starts
                    duration = 0
                    if podcast_episode.duration is not None:
                        duration = podcast_episode.duration

                    edge_percent_seconds = duration * 0.05
                    min_start = edge_percent_seconds
                    max_start = duration - edge_percent_seconds

                    preview_vectors = {}

                    if user_taste_vector is not None:
                        user_taste_vector = np.array(user_taste_vector).astype(float)

                        if not 'embedding_vector' in db_podcast_episode.previews[0].get_attributes():
                            db_preview_vectors = app.core.data_models.PodcastEpisodePreview \
                                .select('id', 'embedding_vector', 'title') \
                                .where('podcast_episode_id', db_podcast_episode.id) \
                                .where('start', '>', min_start) \
                                .where('start', '<', max_start) \
                                .where('has_optimization_issue', False) \
                                .where_not_in('type', default_highlight_types) \
                                .order_by('score', 'desc') \
                                .limit(10) \
                                .get()
                            
                            has_titles = False
                            for db_preview in db_preview_vectors:
                                if db_preview.title is not None:
                                    has_titles = True
                                    break

                            for db_preview_vector in db_preview_vectors:
                                try:
                                    if has_titles and db_preview_vector.title is not None and len(db_preview_vector.title) > 0:
                                        preview_vectors[db_preview_vector.id] = np.array(db_preview_vector.embedding_vector).astype(float)
                                    elif not has_titles:
                                        preview_vectors[db_preview_vector.id] = np.array(db_preview_vector.embedding_vector).astype(float)
                                except:
                                    pass
                        else:
                            for db_preview in db_podcast_episode.previews:
                                preview_vectors[db_preview.id] = np.array(db_preview.embedding_vector).astype(float)

                    highlights = []
                    for preview in db_podcast_episode.previews:
                        if preview.type not in default_highlight_types and ((preview.start > min_start and preview.start < max_start) or duration == 0):
                            highlight = Highlight()
                            highlight.start = preview.start                        
                            if preview.title is not None:
                                highlight.end = preview.end
                            else:
                                highlight.end = preview.start + 40
                            highlight.title = preview.title if preview.title is not None and preview.title != '' else 'Highlight'
                            highlight.snippet = preview.highlight
                            highlight.context = ''
                            highlight.type = HighlightType.PREVIEW
                            highlight.origin = preview.type
                            highlight.url_slug = f"_H_{preview.id}_"

                            score = preview.score
                            if user_taste_vector is not None and preview.id in preview_vectors:
                                score = 1 - cosine(user_taste_vector, preview_vectors[preview.id])
                                if math.isnan(score):
                                    score = 0
                            elif user_taste_vector is not None:
                                score = 0
                            highlight.score = score

                            highlights.append(highlight)

                    highlights.sort(key=lambda h: h.score, reverse=True)
                    podcast_episode.highlights = highlights[:3]

                    if len(podcast_episode.highlights) == 0:
                        # we want to pull in the default preview with the highest score
                        default_previews = db_podcast_episode.previews.all()
                        default_previews.sort(key=lambda p: p.score, reverse=True)

                        highlight = Highlight()
                        highlight.start = default_previews[0].start
                        if default_previews[0].title is not None:
                            highlight.end = default_previews[0].end
                        else:
                            highlight.end = default_previews[0].start + 40
                        highlight.title = default_previews[0].title
                        highlight.score = default_previews[0].score
                        highlight.snippet = default_previews[0].highlight
                        highlight.context = ''
                        highlight.type = HighlightType.PREVIEW
                        highlight.origin = default_previews[0].type
                        highlight.url_slug = f"_H_{preview.id}_"
                        podcast_episode.highlights.append(highlight)

            # last ditch safety check - returning zero highlights can cause client crashes
            if len(podcast_episode.highlights) == 0:
                highlight = Highlight()
                highlight.start = 0
                highlight.end = 30
                highlight.score = 0
                highlight.title = 'No Highlight Available'
                highlight.snippet = ''
                highlight.context = ''
                highlight.type = HighlightType.PREVIEW
                highlight.origin = 'default'
                podcast_episode.highlights.append(highlight)


            podcast_episode.url_slug = db_podcast_episode.url_slug
            if podcast_episode.highlights[0].url_slug is not None and podcast_episode.highlights[0].url_slug != '':
                podcast_episode.url_slug += podcast_episode.highlights[0].url_slug

            if podcast_episode.highlights[0] is not None and podcast_episode.transcript_full is not None:
                podcast_episode.highlights[0].transcript = podcast_episode.transcript_full.get_transcript_highlight(podcast_episode.highlights[0].start, podcast_episode.highlights[0].end)

            if 'podcast' in db_podcast_episode._relations:
                podcast_episode.podcast_info = PodcastInfo.convert(db_podcast_episode.podcast)

            return podcast_episode

import app
from modules import *
import time
import requests

from pydantic import BaseModel
from typing import Optional, List
from fastapi import APIRouter
router = APIRouter()

@router.get('/podcasts', include_in_schema=False)
async def podcast():
    podcasts = app.core.data_models.Podcast.all()

    response = []
    for podcast in podcasts:
        response.append({
            'hero_image_url': podcast.hero_image_url(),
            'url_slug': podcast.url_slug
        })

    return response


@router.get('/podcast/{id}', include_in_schema=False)
async def podcast(id):
    podcast = app.core.data_models.Podcast \
        .with_('categories') \
        .where('url_slug', id) \
        .first() \

    response = {
        'title': podcast.title,
        'description': podcast.description,
        'hero_image_url': podcast.hero_image_url(),
        'name_id': podcast.name_id,
        'author': podcast.author,
        'owner_email': podcast.owner_email,
        'website_url': podcast.website_url,
        'categories': []
    }

    for category in podcast.categories:
        response['categories'].append(category.title)

    return response

@router.get('/podcast/{id}/episodes', include_in_schema=False)
async def podcast_episodes(id):
    podcast = app.core.data_models.Podcast.where('url_slug', id).first()

    podcast_episode_years = app.db.table('podcast_episodes') \
        .select(app.db.raw("distinct(date_part('year', publication_date))")) \
        .where('podcast_id', podcast.id) \
        .order_by('date_part', 'desc') \
        .get()

    formatted_podcast_episode_years = []
    for year in podcast_episode_years:
        if year['date_part']:
            formatted_podcast_episode_years.append(year['date_part'])

    podcast_episodes_total_count = app.db.table('podcast_episodes').where('podcast_id', podcast.id).count()

    podcast_episodes = app.core.data_models.PodcastEpisode \
        .with_('audio_files') \
        .with_({'previews': app.core.data_models.PodcastEpisodePreview.query().select('id', 'start', 'end', 'highlight', 'title', 'type', 'score', 'podcast_episode_id')}) \
        .with_('process_attributes') \
        .with_('podcast') \
        .where('podcast_id', podcast.id) \
        .where_raw("id in (select distinct podcast_episode_id from podcast_episode_previews where podcast_episode_id = podcast_episodes.id and type like '%%fathom%%')") \
        .order_by('publication_date', 'desc') \
        .get()

    if not podcast:
        abort(404)

    formatted_podcast_episodes = []

    for podcast_episode in podcast_episodes[:50]:

        description = podcast_episode.summary
        description_sentences = podcast_episode.summary_sentences
        if not description or len(description_sentences) == 0 or '<img' in description_sentences[0]:
            description = podcast_episode.description
            description_sentences = podcast_episode.description_sentences
        if not description or len(description_sentences) == 0 or '<img' in description_sentences[0]:
            description = podcast_episode.subtitle
            description_sentences = podcast_episode.subtitle_sentences

        formatted_podcast_episode = {
            'podcast': {
                'title': podcast_episode.podcast.title,
                'hero_image_url': podcast_episode.podcast.hero_image_url(),
                'name_id': podcast_episode.podcast.name_id,
                'url_slug': podcast_episode.podcast.url_slug,
            },
            'title': podcast_episode.title,
            'simple_title': podcast_episode.simple_title,
            'long_description': podcast_episode.description,
            'description': description,
            'description_sentences': description_sentences,
            'keywords': podcast_episode.keywords,
            'image_url': podcast_episode.image_url(),
            'audio_url': podcast_episode.audio_url(),
            'length': podcast_episode.length,
            'duration': podcast_episode.duration,
            'episode_number': podcast_episode.episode_number,
            'season_number': podcast_episode.season_number,
            'publication_date': podcast_episode.publication_date.strftime('%B %d, %Y'),
        }

        if len(podcast_episode.previews) > 0:
            preview = podcast_episode.previews.sort(lambda preview: preview.score)[-1]

            formatted_podcast_episode['preview_start'] = preview.start
            formatted_podcast_episode['preview_end'] = preview.end
            formatted_podcast_episode['preview_highlight'] = preview.highlight
            formatted_podcast_episode['preview_type'] = preview.type
        else:
            formatted_podcast_episode['preview_start'] = 0
            formatted_podcast_episode['preview_end'] = 20
            formatted_podcast_episode['preview_highlight'] = ''
            formatted_podcast_episode['preview_type'] = 'default'

        formatted_podcast_episodes.append(formatted_podcast_episode)

    response = {
        'podcast_episodes': formatted_podcast_episodes,
        'podcast_episode_years': formatted_podcast_episode_years,
        'podcast_episodes_total_count': podcast_episodes_total_count
    }

    return response


class Search(BaseModel):
    query: str
    podcast_ids: Optional[List[str]] = None

@router.post('/podcast/search', include_in_schema=False)
async def podcast_search(search: Search):
    #podcast = app.core.data_models.Podcast.where('url_slug', id).first()

    #if not podcast:
    #    abort(404)

    podcast_search_results = []

    response = requests.post(
        app.env['engine_api_url'] + '/search/query',
        json={
            'query': search.query,
            'podcast_ids': [] #podcast.guid
        }
    )

    print(response.json()['results'])

    if search.query == "How can I create a great pitch deck?":
        demo_results = [{
          'podcast_episode_id': 'd0b3ca90-adba-40dd-9285-83261414a8e5',
          'content': "",
          'highlight': "talking about your why",
          'start': 2528.08,
          'end': 3017.59,
          'score': 3.80859375
        }]
    elif search.query == "What do investors look for in a startup?":
        demo_results = [{
          'podcast_episode_id': '3b05ae13-3df5-416f-b8ac-08deab52067e',
          'content': "",
          'highlight': "you make it, people want it",
          'start': 2992.3,
          'end': 3017.59,
          'score': 3.80859375
        },
        {
          'podcast_episode_id': '423391a1-eaac-425a-8fea-76b41ade1e07',
          'content': "",
          'highlight': "a combination of great founding team and a great market",
          'start': 385.60,
          'end': 3017.59,
          'score': 3.80859375
        }
        ]
    else:
        demo_results = response.json()['results']

    for result in demo_results:
        podcast_episode = app.core.data_models.PodcastEpisode \
            .with_('podcast') \
            .where('guid', result['podcast_episode_id']) \
            .first()

            #.where_in('id', [2922, 2026]) \

        if podcast_episode:
            description = podcast_episode.summary
            description_sentences = podcast_episode.summary_sentences
            if not description or len(description_sentences) == 0 or '<img' in description_sentences[0]:
                description = podcast_episode.description
                description_sentences = podcast_episode.description_sentences
            if not description or len(description_sentences) == 0 or '<img' in description_sentences[0]:
                description = podcast_episode.subtitle
                description_sentences = podcast_episode.subtitle_sentences

            if podcast_episode.id == 2026:
                result['start'] = result['start'] + 17.7

            formatted_podcast_search_result = {
                'podcast': {
                    'title': podcast_episode.podcast.title,
                    'hero_image_url': podcast_episode.podcast.hero_image_url(),
                    'name_id': podcast_episode.podcast.name_id,
                    'url_slug': podcast_episode.podcast.url_slug,
                },
                'episode_number': podcast_episode.episode_number,
                'season_number': podcast_episode.season_number,
                'publication_date': podcast_episode.publication_date.strftime('%B %d, %Y'),
                'title': podcast_episode.title,
                'simple_title': podcast_episode.simple_title,
                'description': podcast_episode.description,
                'description_sentences': description_sentences,
                'keywords': podcast_episode.keywords,
                'image_url': podcast_episode.image_url(),
                'audio_url': podcast_episode.audio_url(),
                'length': podcast_episode.length,
                'duration': podcast_episode.duration,
                'content': result['content'],
                'highlight': result['highlight'],
                'preview_start': result['start'],
                'preview_end': result['end'],
                'preview_type': 'search_result',
                'podcast_url_slug': podcast_episode.podcast.url_slug,
            }

            podcast_search_results.append(formatted_podcast_search_result)

    response = {
        'podcast_episodes': podcast_search_results
    }

    return response

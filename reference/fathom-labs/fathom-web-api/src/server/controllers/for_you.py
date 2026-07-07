import app
from modules import *
import time
import requests

from fastapi import APIRouter
router = APIRouter()

@router.get('/for-you/feed', include_in_schema=False)
async def for_you_feed():
    podcast_episodes = app.core.data_models.PodcastEpisode \
        .with_('podcast') \
        .with_('audio_files') \
        .with_({'previews': app.core.data_models.PodcastEpisodePreview.query().select('id', 'start', 'end', 'highlight', 'title', 'type', 'score', 'podcast_episode_id')}) \
        .with_('process_attributes') \
        .where_raw("id in (select distinct podcast_episode_id from podcast_episode_previews where podcast_episode_id = podcast_episodes.id and type like '%%fathom%%')") \
        .where_in('id', [2915, 2576, 2903, 2905, 2927,  2154, 784, 2595] ) \
        .order_by('publication_date', 'desc') \
        .limit(50) \
        .get()

    # shuffle podcast episodes to prevent duplicates
    shuffled_podcast_episodes = []
    podcast_episodes_to_shuffle = []

    last_podcast_id = None
    second_to_last_podcast_id = None
    appends_till_next_shuffle = 0
    for podcast_episode in podcast_episodes[:50]:
        if last_podcast_id != podcast_episode.podcast.id:
            shuffled_podcast_episodes.append(podcast_episode)
            last_podcast_id = podcast_episode.podcast.id
            if appends_till_next_shuffle > 0:
                appends_till_next_shuffle -= 1

            if len(podcast_episodes_to_shuffle) > 0 and appends_till_next_shuffle == 0:
                if podcast_episodes_to_shuffle[0].podcast.id != last_podcast_id:
                    shuffled_podcast_episodes.append(podcast_episodes_to_shuffle[0])
                    last_podcast_id = podcast_episodes_to_shuffle[0].podcast.id
                    del podcast_episodes_to_shuffle[0]
        else:
            podcast_episodes_to_shuffle.append(podcast_episode)
            appends_till_next_shuffle = 4

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
            'description': description,
            'keywords': podcast_episode.keywords,
            'description_sentences': description_sentences,
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

        search_ingested = podcast_episode.get_process_attribute('search_ingested')
        if search_ingested.value == 'true':
            formatted_podcast_episode['searchable'] = True
        else:
            formatted_podcast_episode['searchable'] = False

        formatted_podcast_episodes.append(formatted_podcast_episode)

    response = {
        'podcast_episodes': formatted_podcast_episodes
    }

    return response

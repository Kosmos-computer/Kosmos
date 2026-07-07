import fathom_core as core

import feedparser
import bs4
import requests
import timestring
from dateutil import parser
import re
import datetime

def parse(url, podcast=None):
    try:
        response = core.utility.request_as_fathom_browser(url, timeout=5, podcast=podcast)
        response.raise_for_status()
    except:
        # If we can't get the feed with the Fathom user agent, try again with the default user agent
        core.log.debug(f"RSS FEED {url} FAILED TO LOAD WITH FATHOM USER AGENT, TRYING AGAIN WITH DEFAULT USER AGENT")
        response = core.utility.request_as_browser(url, timeout=5)
        response.raise_for_status()

    rss = feedparser.parse(response.content)
    soup = bs4.BeautifulSoup(response.content, "lxml")

    podcast_rss = {
        'title': None,
        'description': None,
        'image_url': None,
        'website_url': None,
        'categories': [],
        'owner_name': None,
        'owner_email': None,
        'author': None,
        'explicit': None,
        'episode_type': None,
        'episodes': [],
        'new_rss_url': None
    }

    podcast_rss['new_rss_url'] = get_single('itunes:new-feed-url', soup)

    if 'title' in rss.feed:
        podcast_rss['title'] = rss.feed.title

    if 'description' in rss.feed:
        podcast_rss['description'] = rss.feed.description

    if 'image' in rss.feed and 'url' in rss.feed.image:
        podcast_rss['image_url'] = rss.feed.image.url

    if 'link' in rss.feed:
        podcast_rss['website_url'] = rss.feed.link

    podcast_rss['categories'] = get_multiple('itunes:category', soup, attributes=['text'])

    if 'publisher_detail' in rss.feed and 'name' in rss.feed.publisher_detail:
        podcast_rss['owner_name'] = rss.feed.publisher_detail.name

    if 'publisher_detail' in rss.feed and 'email' in rss.feed.publisher_detail:
        podcast_rss['owner_email'] = rss.feed.publisher_detail.email

    podcast_rss['author'] = get_single('itunes:author', soup)

    podcast_rss['episode_type'] = get_single('itunes:type', soup)
    if not podcast_rss['episode_type'] or podcast_rss['episode_type'].lower() not in ['episodic', 'serial']:
        podcast_rss['episode_type'] = 'episodic'

    if 'itunes_explicit' in rss.feed:
        podcast_rss['explicit'] = rss.feed['itunes_explicit']

    soup_items = soup.find_all('item')
    for index, item in enumerate(rss.entries):
        try:
            podcast_episode = {
                'title': None,
                'subtitle': None,
                'summary': None,
                'description': None,
                'image_url': None,
                'audio_url': None,
                'length': None,
                'duration': None,
                'preview': None,
                'keywords': None,
                'publication_date': None,
                'season_number': None,
                'guid': None,
                'chapters': None,
                'chapters_url': None,
            }

            if index < len(soup_items):
                soup_item = soup_items[index]

            if 'title' in item:
                podcast_episode['title'] = item.title

            if 'subtitle' in item:
                podcast_episode['subtitle'] = item.subtitle

            if 'summary' in item:
                podcast_episode['summary'] = item.summary

            if 'content' in item:
                podcast_episode['description'] = item.content[0].value

            if 'image' in item and item.image.url != podcast_rss['image_url']:
                podcast_episode['image_url'] = item.image.url

            if 'enclosures' in item and len(item.enclosures) > 0:
                podcast_episode['audio_url'] = item.enclosures[0].url
            else:
                # TODO: refector into item validation method
                # no audio, no podcast
                continue

            if 'enclosures' in item and 'length' in item.enclosures[0]:
                podcast_episode['length'] = item.enclosures[0].length

            chapters_entry = get_single('podcast:chapters', soup_item, attributes=['url'])
            if chapters_entry:
                # make a request to retrieve JSON chapters
                podcast_episode['chapters_url'] = chapters_entry['url']

            duration = get_single('itunes:duration', soup_item)
            if duration:
                try:
                    total_duration_in_seconds = None
                    duration_parts = duration.split(':')
                    duration_parts = list(reversed(duration_parts))

                    if len(duration_parts) >= 1:
                        total_duration_in_seconds = int(float(duration_parts[0]))

                    if len(duration_parts) >= 2:
                        total_duration_in_seconds += int(duration_parts[1]) * 60

                    if len(duration_parts) >= 3:
                        total_duration_in_seconds += int(duration_parts[2]) * 3600

                    podcast_episode['duration'] = total_duration_in_seconds
                except:
                    pass

            preview = get_single('podcast:soundbite', soup_item, ['starttime', 'duration'])
            if preview:
                podcast_episode['preview'] = {
                    'start': float(preview['starttime']),
                    'end': float(preview['starttime']) + float(preview['duration'])
                }

            podcast_episode['keywords'] = get_single('itunes:keywords', soup_item)

            if 'published' in item:
                try:
                    podcast_episode['publication_date'] = parser.parse(item.published)
                except:
                    pass
            else:
                # set publication date to now if not provided
                podcast_episode['publication_date'] = datetime.datetime.now()
            
            season_number = get_single('itunes:season', soup_item)
            if season_number:
                try:
                    podcast_episode['season_number'] = int(season_number)
                except:
                    pass

            try:
                podcast_episode['guid'] = item.guid
            except:
                distinct_content = ""
                if podcast_episode['publication_date']:
                    distinct_content += podcast_episode['publication_date'].strftime('%m/%d/%Y')
                if podcast_episode['title']:
                    distinct_content += podcast_episode['title']
                if podcast_episode['description']:
                    distinct_content += podcast_episode['description']

                if distinct_content != '':
                    podcast_episode['guid'] = core.text.get_md5_signature(distinct_content)
                else:
                    next()
                    
            podcast_rss['episodes'].append(podcast_episode)
        except Exception as e:
            core.log.debug(f"ERROR PARSING PODCAST EPISODE RSS {podcast_rss['title']} | {index} | {item} ")
            core.log.critical(e, exc_info=True)

    return podcast_rss

def get_single(tag, soup, attributes=None):
    if soup is None:
        return None

    result = soup.find(tag)

    if result and attributes:
        result_attributes = {}
        for attribute in attributes:
            if attribute in result.attrs:
                result_attributes[attribute] = result.attrs[attribute]
        return result_attributes
    elif result:
        return result.text
    else:
        return None

def get_multiple(tag, soup, attributes=None):
    if attributes:
        results = []
        for tag in soup.find_all(tag):
            result = {}
            for attribute in attributes:
                if attribute in tag.attrs:
                    result[attribute] = tag.attrs[attribute]
            results.append(result)
    else:
        results = categories = [tag.text for tag in soup.find_all(tag)]

    return results

def first_letter_position(s):
    m = re.search(r'[a-z]', s, re.I)
    if m is not None:
        return m.start()
    return -1
